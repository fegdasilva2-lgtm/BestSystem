-- Migration 0002 - Row-Level Security (RLS) para multi-tenancy
-- Estrategia: schema compartilhado + tenant_id em toda tabela + RLS como
-- salvaguarda. As policies leem o tenant ativo do JWT (custom claim) com
-- fallback para uma funcao current_tenant_id().

-- =====================================================================
-- Funcao utilitaria: le o tenant_id do JWT
-- =====================================================================
create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select nullif(
    coalesce(
      current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id',
      (auth.jwt() ->> 'tenant_id')
    ),
    ''
  )::uuid;
$$;

-- Funcao utilitaria: papel (role) do usuario atual
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() ->> 'role'),
    (select role from public.users_profile where id = auth.uid())
  );
$$;

-- =====================================================================
-- Habilita RLS em todas as tabelas operacionais
-- =====================================================================
alter table public.tenants              enable row level security;
alter table public.users_profile        enable row level security;
alter table public.customers            enable row level security;
alter table public.contracts            enable row level security;
alter table public.sites                enable row level security;
alter table public.locations            enable row level security;
alter table public.assets               enable row level security;
alter table public.sla_policies         enable row level security;
alter table public.service_requests     enable row level security;
alter table public.work_orders          enable row level security;
alter table public.checklist_templates  enable row level security;
alter table public.checklist_responses  enable row level security;
alter table public.inventory_items      enable row level security;
alter table public.stock_movements      enable row level security;
alter table public.measurements         enable row level security;
alter table public.measurement_items    enable row level security;
alter table public.audit_logs           enable row level security;

-- =====================================================================
-- Policies: super_admin_saas ignora RLS (acesso cross-tenant para suporte)
-- =====================================================================
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'super_admin_saas';
$$;

-- =====================================================================
-- tenants: usuario ve apenas o proprio tenant; super admin ve tudo
-- =====================================================================
create policy tenants_select on public.tenants
  for select using (
    public.is_super_admin() or id = public.current_tenant_id()
  );

create policy tenants_modify on public.tenants
  for all using (public.is_super_admin())
  with check (public.is_super_admin());

-- =====================================================================
-- users_profile: cada usuario ve colegas do proprio tenant
-- =====================================================================
create policy users_select on public.users_profile
  for select using (
    public.is_super_admin() or tenant_id = public.current_tenant_id()
  );

create policy users_modify on public.users_profile
  for all using (
    public.is_super_admin()
    or (tenant_id = public.current_tenant_id() and public.current_role() in ('admin_org', 'gestor_facilities'))
  )
  with check (
    public.is_super_admin() or tenant_id = public.current_tenant_id()
  );

-- =====================================================================
-- Helper: policy generica por tenant_id
-- =====================================================================
create or replace function public.tenant_match(row_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin() or row_tenant = public.current_tenant_id();
$$;

-- Aplica policy de SELECT/INSERT/UPDATE/DELETE por tenant_id em todas as
-- tabelas operacionais. Padrao: o usuario autenticado ve e opera apenas
-- dados do proprio tenant. Escrita ainda exige papel compativel.
create policy customers_all on public.customers
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy contracts_all on public.contracts
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy sites_all on public.sites
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy locations_all on public.locations
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy assets_all on public.assets
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy sla_policies_all on public.sla_policies
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy service_requests_all on public.service_requests
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy work_orders_all on public.work_orders
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy checklist_templates_all on public.checklist_templates
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy checklist_responses_all on public.checklist_responses
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy inventory_items_all on public.inventory_items
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy stock_movements_all on public.stock_movements
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy measurements_all on public.measurements
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

create policy measurement_items_all on public.measurement_items
  for all using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

-- audit_logs: leitura do proprio tenant, INSERT permitido, UPDATE/DELETE
-- ja estao bloqueados por trigger. Super admin ignora tenant.
create policy audit_select on public.audit_logs
  for select using (public.tenant_match(tenant_id));

create policy audit_insert on public.audit_logs
  for insert with check (public.tenant_match(tenant_id) or public.is_super_admin());

-- =====================================================================
-- Forca RLS mesmo para o dono do banco (boa pratica Supabase)
-- =====================================================================
alter table public.tenants              force row level security;
alter table public.users_profile        force row level security;
alter table public.customers            force row level security;
alter table public.contracts            force row level security;
alter table public.sites                force row level security;
alter table public.locations            force row level security;
alter table public.assets               force row level security;
alter table public.sla_policies         force row level security;
alter table public.service_requests     force row level security;
alter table public.work_orders          force row level security;
alter table public.checklist_templates  force row level security;
alter table public.checklist_responses  force row level security;
alter table public.inventory_items      force row level security;
alter table public.stock_movements      force row level security;
alter table public.measurements         force row level security;
alter table public.measurement_items    force row level security;
alter table public.audit_logs           force row level security;
