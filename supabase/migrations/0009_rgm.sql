-- Migration 0009 - RGM (Relatorio de Gestao Mensal) configuravel
-- Templates por contrato (quais blocos, em que ordem) e versoes
-- imutaveis apos aceite.

create table if not exists public.rgm_templates (
  id          text primary key,
  tenant_id   uuid not null references public.tenants(id) on delete restrict,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  name        text not null,
  blocks      jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  version     integer not null default 1
);

create unique index if not exists rgm_templates_contract_uniq
  on public.rgm_templates (contract_id);

create table if not exists public.rgm_versions (
  id            text primary key,
  tenant_id     uuid not null references public.tenants(id) on delete restrict,
  contract_id   uuid not null references public.contracts(id) on delete cascade,
  period        text not null,                 -- "YYYY-MM"
  template_id   text references public.rgm_templates(id) on delete set null,
  blocks        jsonb not null,
  generated_data jsonb not null,                -- snapshot do preview
  approved_at   timestamptz not null default now(),
  approved_by   text,
  file_url      text,                          -- RGM bucket, apos geracao de PDF
  -- Imutavel: bloquear update/delete
  created_at    timestamptz not null default now()
);

create unique index if not exists rgm_versions_contract_period_uniq
  on public.rgm_versions (contract_id, period);

create index if not exists rgm_versions_tenant_created_idx
  on public.rgm_versions (tenant_id, created_at desc);

-- Bloqueia update/delete em rgm_versions
create or replace function public.deny_rgm_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'rgm_versions e imutavel apos aceite';
end;
$$;

drop trigger if exists rgm_versions_no_update on public.rgm_versions;
create trigger rgm_versions_no_update
  before update on public.rgm_versions
  for each row execute function public.deny_rgm_mutation();

drop trigger if exists rgm_versions_no_delete on public.rgm_versions;
create trigger rgm_versions_no_delete
  before delete on public.rgm_versions
  for each row execute function public.deny_rgm_mutation();

-- RLS
alter table public.rgm_templates enable row level security;
alter table public.rgm_versions  enable row level security;
alter table public.rgm_templates force row level security;
alter table public.rgm_versions  force row level security;

create policy rgm_templates_all on public.rgm_templates
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy rgm_versions_all on public.rgm_versions
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

-- Storage para o PDF do RGM (bucket rgm ja existe na 0004)
-- Policy de upload por tenant ja coberto pela 0004.
