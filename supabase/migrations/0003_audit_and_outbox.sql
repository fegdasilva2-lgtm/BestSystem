-- Migration 0003 - Auditoria automatica via trigger e outbox pattern
-- Toda mutacao em work_orders, measurements e contracts grava em
-- audit_logs. Outbox table para eventos de dominio (a ser consumido
-- por Edge Functions e sincronizacao do PWA).

-- =====================================================================
-- Trigger generico: grava audit_log antes de update/delete
-- =====================================================================
create or replace function public.fn_audit_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_tenant uuid;
  v_action text;
  v_before jsonb;
  v_after jsonb;
begin
  v_action := lower(tg_op);

  if tg_op = 'INSERT' then
    v_tenant := (to_jsonb(new) ->> 'tenant_id')::uuid;
    v_after := to_jsonb(new);
  elsif tg_op = 'UPDATE' then
    v_tenant := (to_jsonb(new) ->> 'tenant_id')::uuid;
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
  else
    v_tenant := (to_jsonb(old) ->> 'tenant_id')::uuid;
    v_before := to_jsonb(old);
  end if;

  insert into public.audit_logs (
    tenant_id, actor_id, entity_type, entity_id, action, before_data, after_data
  ) values (
    v_tenant, v_actor, tg_table_name,
    coalesce((to_jsonb(new) ->> 'id')::uuid, (to_jsonb(old) ->> 'id')::uuid),
    v_action, v_before, v_after
  );

  return coalesce(new, old);
end;
$$;

-- Aplica auditoria automatica nas tabelas criticas
create trigger work_orders_audit
  after insert or update or delete on public.work_orders
  for each row execute function public.fn_audit_write();

create trigger measurements_audit
  after insert or update or delete on public.measurements
  for each row execute function public.fn_audit_write();

create trigger measurement_items_audit
  after insert or update or delete on public.measurement_items
  for each row execute function public.fn_audit_write();

create trigger contracts_audit
  after insert or update or delete on public.contracts
  for each row execute function public.fn_audit_write();

-- =====================================================================
-- Outbox pattern: eventos de dominio para sincronizacao assincrona
-- (PWA -> Backend) e propagacao entre modulos.
-- =====================================================================
create table public.outbox_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  aggregate_type text not null,        -- 'work_order' | 'measurement' | 'asset'
  aggregate_id uuid not null,
  event_type text not null,           -- 'work_order.completed' | 'measurement.approved' ...
  payload jsonb not null,
  idempotency_key text not null,
  processed_at timestamptz,
  failed_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index outbox_unprocessed_idx
  on public.outbox_events (created_at)
  where processed_at is null;

create or replace function public.fn_outbox_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.outbox_events (
    tenant_id, aggregate_type, aggregate_id, event_type, payload, idempotency_key
  ) values (
    coalesce((to_jsonb(new) ->> 'tenant_id')::uuid, (to_jsonb(old) ->> 'tenant_id')::uuid),
    tg_table_name,
    coalesce((to_jsonb(new) ->> 'id')::uuid, (to_jsonb(old) ->> 'id')::uuid),
    lower(tg_op) || '.' || tg_table_name,
    jsonb_build_object('new', to_jsonb(new), 'old', to_jsonb(old)),
    gen_random_uuid()::text
  );
  return coalesce(new, old);
end;
$$;

create trigger work_orders_outbox
  after insert or update or delete on public.work_orders
  for each row execute function public.fn_outbox_write();

create trigger measurements_outbox
  after insert or update on public.measurements
  for each row execute function public.fn_outbox_write();

-- =====================================================================
-- Idempotencia: clientes podem reenviar o mesmo POST sem duplicar OS
-- =====================================================================
create unique index if not exists work_orders_idempotency_uniq
  on public.work_orders (tenant_id, idempotency_key)
  where idempotency_key is not null;

-- =====================================================================
-- View: KPIs de SLA por contrato (alimenta o dashboard e o RGM)
-- =====================================================================
create or replace view public.v_sla_kpi as
select
  wo.tenant_id,
  wo.contract_id,
  c.code as contract_code,
  count(*) filter (where wo.completed_at is not null) as total_completed,
  count(*) filter (where wo.completed_at is not null and wo.completed_at <= wo.due_at) as on_time,
  count(*) filter (where wo.completed_at is not null) as late,
  case
    when count(*) filter (where wo.completed_at is not null) = 0 then 0
    else round(
      100.0 * count(*) filter (where wo.completed_at is not null and wo.completed_at <= wo.due_at)::numeric
      / count(*) filter (where wo.completed_at is not null)::numeric, 2)
  end as compliance_pct,
  round(avg(extract(epoch from (wo.completed_at - wo.started_at)) / 3600.0)::numeric, 2) as mttr_hours
from public.work_orders wo
left join public.contracts c on c.id = wo.contract_id
where wo.completed_at is not null
group by wo.tenant_id, wo.contract_id, c.code;
