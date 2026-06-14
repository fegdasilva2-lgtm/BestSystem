-- Migration 0010 - PMOC (Plano de Manutencao, Operacao e Controle)
-- Lei 13.589/2018 - obrigatorio para sistemas de climatizacao.
-- Tabelas:
--   pmoc_plans     - 1 por contrato/site; identifica responsavel tecnico (ART)
--   pmoc_activities - 1 por ativo de climatizacao dentro de um PMOC
--   pmoc_executions - snaopshot da OS que executou a atividade (imutavel)
--   pmoc_alerts     - notificacoes de nao-conformidade

create extension if not exists "pg_trgm";

-- =====================================================================
-- pmoc_plans - 1 por (contract_id, site_id)
-- Identifica o PMOC vigente, a vigencia, o responsavel tecnico e a ART.
-- =====================================================================
create table if not exists public.pmoc_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  code text not null,
  version integer not null default 1,
  starts_on date not null,
  ends_on date not null,
  -- Responsavel tecnico (RT): engenheiro registrado no CREA
  rt_name text not null,
  rt_crea text not null,                    -- ex.: "SP-12345/D"
  rt_email text,
  rt_phone text,
  -- ART vinculada
  art_number text not null,
  art_url text,                              -- link para o PDF da ART
  -- Parametros minimos exigidos pela Lei 13.589/2018
  min_cleaning_frequency text not null check (min_cleaning_frequency in ('M','B','T','S','A')),
  min_filter_change_days integer not null default 90,
  min_hvac_inspection_days integer not null default 180,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version_lock integer not null default 1,
  unique (contract_id, site_id, code)
);

create index pmoc_plans_tenant_site_idx on public.pmoc_plans (tenant_id, site_id);

-- =====================================================================
-- pmoc_activities - atividades que compoem o PMOC de cada ativo HVAC
-- =====================================================================
create table if not exists public.pmoc_activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  pmoc_plan_id uuid not null references public.pmoc_plans(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  code text not null,                       -- ex.: LIMPAR-FILTRO, INSPEC-AHU
  name text not null,
  description text,
  frequency text not null check (frequency in ('D','S','Q','M','B','T','S','A')),
  duration_minutes integer not null default 60,
  priority text not null default 'media' check (priority in ('baixa','media','alta','critica')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  version integer not null default 1,
  unique (pmoc_plan_id, code)
);

create index pmoc_activities_plan_idx on public.pmoc_activities (pmoc_plan_id);
create index pmoc_activities_asset_idx on public.pmoc_activities (tenant_id, asset_id);

-- =====================================================================
-- pmoc_executions - snapshot imutavel de cada execucao
-- Quando uma OS de PMOC e concluida, gera um registro aqui.
-- Nao permite update nem delete (auditoria regulatoria).
-- =====================================================================
create table if not exists public.pmoc_executions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  pmoc_plan_id uuid not null references public.pmoc_plans(id) on delete restrict,
  pmoc_activity_id uuid not null references public.pmoc_activities(id) on delete restrict,
  asset_id uuid not null references public.assets(id) on delete restrict,
  work_order_id uuid references public.work_orders(id) on delete set null,
  executed_at timestamptz not null,
  executed_by uuid references public.users_profile(id) on delete set null,
  -- Evidencia minima: fotos, leituras, observacoes
  photo_count integer not null default 0,
  readings jsonb,                            -- ex.: {"temperatura": 22.5, "pressao": 1.2}
  observations text,
  -- Resultado da inspecao
  result text not null check (result in ('conforme','nao_conforme','parcialmente_conforme')),
  -- Periodo de referencia: proxima execucao esperada
  next_due_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index pmoc_executions_plan_idx on public.pmoc_executions (pmoc_plan_id, executed_at desc);
create index pmoc_executions_activity_idx on public.pmoc_executions (pmoc_activity_id, executed_at desc);
create index pmoc_executions_due_idx on public.pmoc_executions (tenant_id, next_due_at);

-- Imutavel (regulatorio)
create or replace function public.deny_pmoc_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'pmoc_executions e imutavel (regulatorio)';
end;
$$;

create trigger pmoc_executions_no_update
  before update on public.pmoc_executions
  for each row execute function public.deny_pmoc_mutation();

create trigger pmoc_executions_no_delete
  before delete on public.pmoc_executions
  for each row execute function public.deny_pmoc_mutation();

-- =====================================================================
-- pmoc_alerts - nao-conformidades detectadas
-- =====================================================================
create table if not exists public.pmoc_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  pmoc_plan_id uuid not null references public.pmoc_plans(id) on delete cascade,
  pmoc_activity_id uuid not null references public.pmoc_activities(id) on delete cascade,
  asset_id uuid not null references public.assets(id) on delete cascade,
  kind text not null check (kind in (
    'vencido',                        -- execucao passou do prazo
    'faltando_ultima_execucao',      -- sem registro de execucao
    'resultado_nao_conforme',         -- ultima execucao nao conforme
    'frequencia_inadequada',          -- alerta regulatorio especifico
    'art_vencendo'                    -- ART expira em <= 60 dias
  )),
  severity text not null check (severity in ('baixa','media','alta','critica')),
  message text not null,
  reference_date date not null,
  resolved_at timestamptz,
  resolved_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now()
);

create index pmoc_alerts_open_idx
  on public.pmoc_alerts (tenant_id, severity, created_at desc)
  where resolved_at is null;

-- =====================================================================
-- View: v_pmoc_compliance - resumo por PMOC
-- =====================================================================
create or replace view public.v_pmoc_compliance as
select
  pp.id as pmoc_plan_id,
  pp.tenant_id,
  pp.contract_id,
  pp.site_id,
  pp.code,
  pp.version,
  pp.starts_on,
  pp.ends_on,
  pp.rt_name,
  pp.rt_crea,
  pp.art_number,
  pa.name as activity_name,
  pa.code as activity_code,
  pa.frequency,
  pa.priority,
  count(pe.id) filter (where pe.result = 'conforme') as conformes,
  count(pe.id) filter (where pe.result = 'nao_conforme') as nao_conformes,
  count(pe.id) filter (where pe.result = 'parcialmente_conforme') as parciais,
  max(pe.executed_at) as last_executed_at,
  min(pe.next_due_at) filter (where pe.next_due_at > now()) as next_due_at
from public.pmoc_plans pp
left join public.pmoc_activities pa on pa.pmoc_plan_id = pp.id and pa.active
left join public.pmoc_executions pe on pe.pmoc_activity_id = pa.id
where pp.active
group by pp.id, pa.id;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.pmoc_plans     enable row level security;
alter table public.pmoc_activities enable row level security;
alter table public.pmoc_executions enable row level security;
alter table public.pmoc_alerts     enable row level security;

alter table public.pmoc_plans     force row level security;
alter table public.pmoc_activities force row level security;
alter table public.pmoc_executions force row level security;
alter table public.pmoc_alerts     force row level security;

create policy pmoc_plans_all on public.pmoc_plans
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy pmoc_activities_all on public.pmoc_activities
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy pmoc_executions_all on public.pmoc_executions
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy pmoc_alerts_all on public.pmoc_alerts
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));
