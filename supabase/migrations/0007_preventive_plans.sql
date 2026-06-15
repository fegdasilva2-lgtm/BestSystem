-- Migration 0007 - preventive_plans: campos necessarios para geracao de cronograma
-- Adiciona colunas em checklist_templates para suportar o motor de geracao.
-- Em V1 (alinhado ao estudo), esses campos migram para uma tabela propria
-- preventive_plans, mas para o piloto mantemos a tabela unica por simplicidade.

alter table public.checklist_templates
  add column if not exists code text,
  add column if not exists asset_id uuid references public.assets(id) on delete cascade,
  add column if not exists frequency text check (frequency in ('D','S','Q','M','B','T','S','A','custom')),
  add column if not exists duration_minutes integer default 60 check (duration_minutes > 0),
  add column if not exists priority text default 'media' check (priority in ('baixa','media','alta','critica')),
  add column if not exists first_run_at timestamptz,
  add column if not exists hour smallint default 8 check (hour between 0 and 23);

create unique index if not exists checklist_templates_tenant_code_uniq
  on public.checklist_templates (tenant_id, code)
  where code is not null;

create index if not exists checklist_templates_asset_idx
  on public.checklist_templates (tenant_id, asset_id)
  where asset_id is not null;

-- =====================================================================
-- View: v_preventive_plan (consumida pelo motor no PWA)
-- =====================================================================
create or replace view public.v_preventive_plan
with (security_invoker = true) as
select
  ct.id, ct.tenant_id, ct.code, ct.name, ct.asset_id,
  a.code as asset_code, a.name as asset_name,
  a.location_id, a.criticality as asset_criticality,
  ct.frequency, ct.duration_minutes, ct.priority, ct.hour, ct.first_run_at,
  ct.active, ct.version, ct.created_at, ct.updated_at
from public.checklist_templates ct
left join public.assets a on a.id = ct.asset_id
where ct.frequency is not null;
