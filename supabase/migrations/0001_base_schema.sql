-- Migration 0001 - PredialOps base schema
-- Piloto sandbox: multi-tenant com RLS, contrato como entidade central, auditoria imutavel.
-- Veja docs/PRD.md, docs/ARCHITECTURE.md e estudo_plataforma.md para contexto.

create extension if not exists "pgcrypto";

-- =====================================================================
-- tenants
-- =====================================================================
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'professional' check (plan in ('starter', 'professional', 'business', 'enterprise')),
  status text not null default 'piloto' check (status in ('piloto', 'ativo', 'implantacao', 'suspenso')),
  brand_primary text,
  brand_secondary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

-- =====================================================================
-- users (perfis da plataforma, com vinculo a tenant)
-- A identidade continua sendo Supabase Auth (auth.users); esta tabela
-- armazena o perfil de dominio.
-- =====================================================================
create table public.users_profile (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  email text not null,
  role text not null check (role in (
    'super_admin_saas', 'admin_org', 'gestor_facilities', 'planejador',
    'supervisor', 'tecnico', 'auxiliar', 'almoxarife', 'comercial',
    'financeiro', 'cliente_gestor', 'solicitante', 'auditor', 'fornecedor'
  )),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  unique (tenant_id, email)
);

-- =====================================================================
-- customers (clientes da prestadora)
-- =====================================================================
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  document text,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

-- =====================================================================
-- contracts (entidade central)
-- =====================================================================
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  code text not null,
  scope text not null,
  exclusions text,
  starts_on date not null,
  ends_on date,
  monthly_value numeric(14, 2) not null default 0,
  index_name text,           -- ex.: IPCA, INPC
  index_date date,            -- proximo reajuste
  billing_rule text not null, -- descricao da regra
  rgm_periodicity text not null default 'mensal',
  brand_logo_url text,
  cost_center text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  unique (tenant_id, code)
);

-- =====================================================================
-- sites (unidades atendidas) e hierarchy ate ativo
-- =====================================================================
create table public.sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  contract_id uuid references public.contracts(id) on delete set null,
  name text not null,
  address text,
  timezone text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  site_id uuid not null references public.sites(id) on delete cascade,
  parent_id uuid references public.locations(id) on delete set null,
  name text not null,
  type text not null check (type in ('predio', 'pavimento', 'ambiente', 'sala', 'area_tecnica')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  location_id uuid not null references public.locations(id) on delete restrict,
  code text not null,
  name text not null,
  type text not null,                -- ex.: fancoil, chiller, bomba
  manufacturer text,
  model text,
  serial text,
  criticality text not null check (criticality in ('baixa', 'media', 'alta', 'critica')),
  status text not null default 'operacional' check (status in ('operacional', 'parado', 'manutencao', 'desativado')),
  qr_code text,
  warranty_until date,
  install_date date,
  hourly_meter numeric(12, 2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  unique (tenant_id, code)
);

create index assets_tenant_location_idx on public.assets (tenant_id, location_id);
create index locations_tenant_site_idx on public.locations (tenant_id, site_id);

-- =====================================================================
-- SLA policies
-- =====================================================================
create table public.sla_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  name text not null,
  priority text not null check (priority in ('baixa', 'media', 'alta', 'critica')),
  response_minutes integer not null check (response_minutes > 0),
  resolution_minutes integer not null check (resolution_minutes > 0),
  business_calendar jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

-- =====================================================================
-- service_requests (chamados do portal do solicitante)
-- =====================================================================
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  customer_id uuid references public.customers(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  requester_name text not null,
  requester_contact text,
  category text not null,
  description text not null,
  status text not null default 'triagem' check (status in ('triagem', 'convertido', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1
);

-- =====================================================================
-- work_orders
-- =====================================================================
create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  request_id uuid references public.service_requests(id) on delete set null,
  contract_id uuid references public.contracts(id) on delete set null,
  site_id uuid references public.sites(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  asset_id uuid references public.assets(id) on delete set null,
  type text not null check (type in ('preventiva', 'corretiva', 'corretiva_programada', 'preditiva', 'inspecao', 'ronda', 'melhoria', 'instalacao', 'emergencia', 'avulsa')),
  priority text not null check (priority in ('baixa', 'media', 'alta', 'critica')),
  status text not null check (status in (
    'rascunho', 'planejada', 'liberada', 'atribuida', 'aceita',
    'em_deslocamento', 'em_execucao', 'pausada', 'aguardando_material',
    'aguardando_cliente', 'concluida_tecnico', 'em_validacao',
    'aprovada', 'encerrada', 'cancelada'
  )),
  description text not null,
  assigned_to uuid references public.users_profile(id) on delete set null,
  due_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  approved_at timestamptz,
  cost numeric(12, 2) not null default 0,
  contract_item text,
  idempotency_key text,    -- gerado no client, garante unicidade do POST
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index work_orders_tenant_status_idx on public.work_orders (tenant_id, status);
create index work_orders_tenant_due_idx on public.work_orders (tenant_id, due_at);
create index work_orders_tenant_idempotency on public.work_orders (tenant_id, idempotency_key);

-- =====================================================================
-- checklist_templates e checklist_responses
-- =====================================================================
create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  name text not null,
  version integer not null default 1,
  items jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.checklist_responses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  template_id uuid references public.checklist_templates(id) on delete set null,
  template_version integer not null,
  answers jsonb not null,
  completed_by uuid references public.users_profile(id) on delete set null,
  completed_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- inventory e stock_movements
-- =====================================================================
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  sku text not null,
  name text not null,
  unit text not null,
  min_balance numeric(12, 2) not null default 0,
  max_balance numeric(12, 2) not null default 0,
  unit_cost numeric(12, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  unique (tenant_id, sku)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  work_order_id uuid references public.work_orders(id) on delete set null,
  quantity numeric(12, 2) not null,
  unit_cost numeric(12, 2) not null default 0,
  movement_type text not null check (movement_type in ('entrada', 'saida', 'transferencia', 'ajuste', 'devolucao')),
  reason text,
  created_by uuid references public.users_profile(id) on delete set null,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- measurements (medicao mensal)
-- =====================================================================
create table public.measurements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  contract_id uuid not null references public.contracts(id) on delete restrict,
  period text not null,           -- formato 'YYYY-MM'
  status text not null default 'rascunho' check (status in ('rascunho', 'pre_enviada', 'em_aceite', 'aprovada', 'contestada', 'faturada', 'paga')),
  gross_amount numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  net_amount numeric(14, 2) not null default 0,
  approved_at timestamptz,
  approved_by uuid references public.users_profile(id) on delete set null,
  notes text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, contract_id, period)
);

create table public.measurement_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  measurement_id uuid not null references public.measurements(id) on delete cascade,
  work_order_id uuid references public.work_orders(id) on delete set null,
  description text not null,
  gross_amount numeric(14, 2) not null default 0,
  discount_amount numeric(14, 2) not null default 0,
  discount_reason text,
  net_amount numeric(14, 2) not null default 0,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- audit_logs (append-only, nao permite update/delete)
-- =====================================================================
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  actor_id uuid references public.users_profile(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,           -- 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'sync'
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_tenant_created_idx on public.audit_logs (tenant_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);

-- Bloqueia update/delete em audit_logs
create or replace function public.deny_audit_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'audit_logs e imutavel';
end;
$$;

create trigger audit_logs_no_update
  before update on public.audit_logs
  for each row execute function public.deny_audit_mutation();

create trigger audit_logs_no_delete
  before delete on public.audit_logs
  for each row execute function public.deny_audit_mutation();
