-- Modelo inicial para Postgres. Ajustar tipos/indices conforme stack final.

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan text not null default 'professional',
  created_at timestamptz not null default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  email text not null,
  role text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  document text,
  created_at timestamptz not null default now()
);

create table sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  customer_id uuid not null references customers(id),
  name text not null,
  address text
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  site_id uuid not null references sites(id),
  parent_id uuid references locations(id),
  name text not null,
  type text not null
);

create table assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  location_id uuid not null references locations(id),
  code text not null,
  name text not null,
  criticality text not null,
  status text not null default 'operational',
  qr_code text,
  warranty_until date,
  unique (tenant_id, code)
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  customer_id uuid not null references customers(id),
  code text not null,
  scope text not null,
  starts_on date not null,
  ends_on date,
  billing_rule text not null,
  unique (tenant_id, code)
);

create table sla_policies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  contract_id uuid not null references contracts(id),
  priority text not null,
  response_minutes integer not null,
  resolution_minutes integer not null,
  business_calendar jsonb not null default '{}'::jsonb
);

create table service_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  customer_id uuid references customers(id),
  site_id uuid references sites(id),
  location_id uuid references locations(id),
  requester_name text not null,
  requester_contact text,
  category text not null,
  description text not null,
  status text not null default 'triage',
  created_at timestamptz not null default now()
);

create table work_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  request_id uuid references service_requests(id),
  contract_id uuid references contracts(id),
  location_id uuid references locations(id),
  asset_id uuid references assets(id),
  type text not null,
  priority text not null,
  status text not null,
  description text not null,
  assigned_to uuid references users(id),
  due_at timestamptz,
  completed_at timestamptz,
  approved_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create table checklist_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  name text not null,
  version integer not null default 1,
  items jsonb not null
);

create table checklist_responses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  work_order_id uuid not null references work_orders(id),
  template_id uuid references checklist_templates(id),
  template_version integer not null,
  answers jsonb not null,
  completed_by uuid references users(id),
  completed_at timestamptz
);

create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  sku text not null,
  name text not null,
  unit text not null,
  min_balance numeric not null default 0,
  unique (tenant_id, sku)
);

create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  item_id uuid not null references inventory_items(id),
  work_order_id uuid references work_orders(id),
  quantity numeric not null,
  unit_cost numeric not null default 0,
  movement_type text not null,
  created_at timestamptz not null default now()
);

create table measurements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  contract_id uuid not null references contracts(id),
  period text not null,
  status text not null default 'draft',
  gross_amount numeric not null default 0,
  discount_amount numeric not null default 0,
  net_amount numeric not null default 0,
  approved_at timestamptz
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  actor_id uuid references users(id),
  entity_type text not null,
  entity_id uuid,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  ip_address inet,
  created_at timestamptz not null default now()
);

create index work_orders_tenant_status_idx on work_orders (tenant_id, status);
create index work_orders_tenant_due_idx on work_orders (tenant_id, due_at);
create index assets_tenant_location_idx on assets (tenant_id, location_id);
create index audit_logs_tenant_created_idx on audit_logs (tenant_id, created_at desc);
