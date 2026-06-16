-- Migration 0013 - Schema do Portal + RLS
-- Tabelas: measurement_contestations, work_order_comments
-- Problema: estas tabelas eram referenciadas em portal/actions.ts mas nao existiam,
-- quebrando aceitarMedicaoPortal, contestarMedicaoPortal e comentarOSPortal.

-- =====================================================================
-- measurement_contestations (contestacao de medicao pelo cliente)
-- =====================================================================
create table public.measurement_contestations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  measurement_id uuid not null references public.measurements(id) on delete restrict,
  amount numeric(14, 2) not null check (amount > 0),
  reason text not null,
  raised_by uuid not null references public.users_profile(id) on delete restrict,
  status text not null default 'pendente'
    check (status in ('pendente', 'aceita', 'rejeitada')),
  resolution text,
  resolved_by uuid references public.users_profile(id) on delete set null,
  resolved_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (measurement_id, raised_by)
);

create index mc_tenant_status_idx on public.measurement_contestations (tenant_id, status);
create index mc_measurement_idx on public.measurement_contestations (measurement_id);

-- =====================================================================
-- work_order_comments (comentarios em ordens de servico)
-- =====================================================================
create table public.work_order_comments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  work_order_id uuid not null references public.work_orders(id) on delete cascade,
  author_id uuid not null references public.users_profile(id) on delete restrict,
  body text not null check (char_length(body) >= 1 and char_length(body) <= 2000),
  edited_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index woc_tenant_created_idx on public.work_order_comments (tenant_id, created_at desc);
create index woc_work_order_idx on public.work_order_comments (work_order_id);

-- =====================================================================
-- RLS: habilita em ambas as tabelas
-- =====================================================================
alter table public.measurement_contestations enable row level security;
alter table public.work_order_comments        enable row level security;

alter table public.measurement_contestations force row level security;
alter table public.work_order_comments        force row level security;

-- Helper: roles que podem operar no portal (cliente + equipe interna)
create or replace function public.portal_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in (
    'super_admin_saas',
    'admin_org',
    'gestor_facilities',
    'supervisor',
    'tecnico',
    'cliente_gestor'
  );
$$;

-- Helper: roles que podem resolver contestacoes
create or replace function public.portal_admin_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in (
    'super_admin_saas',
    'admin_org',
    'gestor_facilities'
  );
$$;

-- =====================================================================
-- measurement_contestations policies
-- =====================================================================
-- SELECT: tenant + portal role
create policy mc_select on public.measurement_contestations
  for select using (
    public.tenant_match(tenant_id)
    and public.portal_role()
  );

-- INSERT: tenant + portal role (qualquer papel do portal pode contestar)
create policy mc_insert on public.measurement_contestations
  for insert with check (
    public.tenant_match(tenant_id)
    and public.portal_role()
    and raised_by = auth.uid()
  );

-- UPDATE: tenant + portal_admin_role (apenas admin resolve)
create policy mc_update on public.measurement_contestations
  for update using (
    public.tenant_match(tenant_id)
    and public.portal_admin_role()
  )
  with check (public.tenant_match(tenant_id));

-- DELETE: apenas super_admin
create policy mc_delete on public.measurement_contestations
  for delete using (public.is_super_admin());

-- =====================================================================
-- work_order_comments policies
-- =====================================================================
-- SELECT: tenant + portal role
create policy woc_select on public.work_order_comments
  for select using (
    public.tenant_match(tenant_id)
    and public.portal_role()
  );

-- INSERT: tenant + portal role
create policy woc_insert on public.work_order_comments
  for insert with check (
    public.tenant_match(tenant_id)
    and public.portal_role()
    and author_id = auth.uid()
  );

-- UPDATE: tenant + autor do comentario ou admin
create policy woc_update on public.work_order_comments
  for update using (
    public.tenant_match(tenant_id)
    and (
      public.portal_admin_role()
      or author_id = auth.uid()
    )
  )
  with check (
    public.tenant_match(tenant_id)
    and author_id = auth.uid()
  );

-- DELETE: tenant + admin ou autor
create policy woc_delete on public.work_order_comments
  for delete using (
    public.tenant_match(tenant_id)
    and (
      public.portal_admin_role()
      or author_id = auth.uid()
    )
  );
