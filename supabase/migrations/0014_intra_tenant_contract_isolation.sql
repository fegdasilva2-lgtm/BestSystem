-- Migration 0014 - Isolamento intra-tenant por contrato
-- Roles externos (cliente_gestor, solicitante, fornecedor) veem
-- apenas contratos vinculados via user_contract_access.
-- Roles internos continuam vendo todos os contratos do tenant.
-- Escrita: mantida a verificacao original por tenant_match +
-- guardas no app. RLS e responsavel apenas pelo isolamento de leitura.

-- =====================================================================
-- 1. Tabela de vinculo usuario ↔ contrato
-- =====================================================================
create table public.user_contract_access (
  user_id uuid not null references public.users_profile(id) on delete cascade,
  contract_id uuid not null references public.contracts(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references public.users_profile(id) on delete set null,
  primary key (user_id, contract_id)
);

alter table public.user_contract_access enable row level security;

-- =====================================================================
-- 2. Funcoes auxiliares
-- =====================================================================

-- Contratos acessiveis pelo usuario atual
create or replace function public.user_accessible_contracts()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select uca.contract_id
  from public.user_contract_access uca
  where uca.user_id = auth.uid()
  union
  select c.id
  from public.contracts c
  join public.users_profile up on up.tenant_id = c.tenant_id
  where up.id = auth.uid()
    and up.role not in ('cliente_gestor', 'solicitante', 'fornecedor');
$$;

-- Verifica se o role atual e externo
create or replace function public.is_external_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users_profile
    where id = auth.uid()
    and role in ('cliente_gestor', 'solicitante', 'fornecedor')
  );
$$;

-- =====================================================================
-- 3. RLS: user_contract_access
-- =====================================================================
create policy uca_select on public.user_contract_access
  for select using (
    public.is_super_admin()
    or user_id = auth.uid()
    or public.current_role() in ('admin_org', 'gestor_facilities')
  );

create policy uca_insert on public.user_contract_access
  for insert with check (
    public.current_role() in ('super_admin_saas', 'admin_org', 'gestor_facilities')
  );

create policy uca_delete on public.user_contract_access
  for delete using (
    public.current_role() in ('super_admin_saas', 'admin_org', 'gestor_facilities')
  );

-- =====================================================================
-- 4. Atualiza RLS das tabelas com contract_id
--    SELECT: restringe roles externos aos contratos vinculados
--    INSERT/UPDATE/DELETE: mantem tenant_match original (app faz guarda)
-- =====================================================================

-- contracts: substitui a policy antiga
drop policy if exists contracts_all on public.contracts;
create policy contracts_all on public.contracts
  for all using (
    public.tenant_match(tenant_id)
    and (
      not public.is_external_role()
      or id in (select public.user_accessible_contracts())
    )
  )
  with check (public.tenant_match(tenant_id));

-- work_orders: mantem a verificacao original de escrita
drop policy if exists work_orders_all on public.work_orders;
create policy work_orders_all on public.work_orders
  for all using (
    public.tenant_match(tenant_id)
    and (
      not public.is_external_role()
      or contract_id in (select public.user_accessible_contracts())
    )
  )
  with check (public.tenant_match(tenant_id));

-- measurements
drop policy if exists measurements_all on public.measurements;
create policy measurements_all on public.measurements
  for all using (
    public.tenant_match(tenant_id)
    and (
      not public.is_external_role()
      or contract_id in (select public.user_accessible_contracts())
    )
  )
  with check (public.tenant_match(tenant_id));

-- measurement_items: sem contract_id proprio — mantido como esta

-- sites (contract_id opcional)
drop policy if exists sites_all on public.sites;
create policy sites_all on public.sites
  for all using (
    public.tenant_match(tenant_id)
    and (
      not public.is_external_role()
      or contract_id is null
      or contract_id in (select public.user_accessible_contracts())
    )
  )
  with check (public.tenant_match(tenant_id));

-- sla_policies
drop policy if exists sla_policies_all on public.sla_policies;
create policy sla_policies_all on public.sla_policies
  for all using (
    public.tenant_match(tenant_id)
    and (
      not public.is_external_role()
      or contract_id in (select public.user_accessible_contracts())
    )
  )
  with check (public.tenant_match(tenant_id));

-- =====================================================================
-- 5. Forca RLS na nova tabela
-- =====================================================================
alter table public.user_contract_access force row level security;
