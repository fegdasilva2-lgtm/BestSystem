-- Migration 0015 - Seed: dados de exemplo para isolamento por contrato
-- Cria cliente_gestor + clientes + contratos + vinculos no tenant IMC Facilities.
-- Demonstra o isolamento: o cliente_gestor ve apenas contratos vinculados.

-- =====================================================================
-- 1. Usuario cliente_gestor para testes
-- =====================================================================
do $$
declare
  seed_tenant_id uuid := '00000000-0000-0000-0000-000000000001'; -- IMC Facilities
  seed_password text := nullif(current_setting('app.settings.seed_password', true), '');
  auth_user_id uuid := '20000000-0000-0000-0000-000000000001'::uuid;
begin
  if seed_password is null then
    raise notice 'app.settings.seed_password nao definido — pulando seed 0015';
    return;
  end if;

  -- Cria ou atualiza auth.users para cliente_gestor
  if not exists (select 1 from auth.users where id = auth_user_id) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, email_change,
      email_change_token_new, recovery_token,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      auth_user_id, 'authenticated', 'authenticated',
      'cliente.gestao@predialops.test',
      crypt(seed_password, gen_salt('bf')),
      now(), '', '', '', '',
      jsonb_build_object(
        'provider', 'email',
        'providers', jsonb_build_array('email'),
        'tenant_id', seed_tenant_id::text,
        'user_role', 'cliente_gestor',
        'user_active', true
      ),
      jsonb_build_object('display_name', 'Cliente Gestor Teste'),
      now(), now()
    );
  end if;

  -- Identity
  insert into auth.identities (id, user_id, provider, provider_id, identity_data, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), auth_user_id, 'email', auth_user_id::text,
         jsonb_build_object('sub', auth_user_id::text, 'email', 'cliente.gestao@predialops.test'),
         now(), now(), now()
  where not exists (select 1 from auth.identities where provider = 'email' and provider_id = auth_user_id::text);

  -- users_profile
  insert into public.users_profile (id, tenant_id, name, email, role, active)
  values (auth_user_id, seed_tenant_id, 'Cliente Gestor Teste', 'cliente.gestao@predialops.test', 'cliente_gestor', true)
  on conflict (id) do update
    set tenant_id = excluded.tenant_id, name = excluded.name, email = excluded.email,
        role = excluded.role, active = excluded.active, updated_at = now();
end $$;

-- =====================================================================
-- 2. Clientes e contratos de exemplo
-- =====================================================================
insert into public.customers (id, tenant_id, name, document, contact_name, contact_email)
values
  ('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Shopping Central Ltda', '12.345.678/0001-90', 'Maria Gestora', 'maria@shoppingcentral.com.br'),
  ('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Hospital Vida S.A.',     '98.765.432/0001-10', 'Joao Diretor',  'joao@hospitalvida.com.br')
on conflict do nothing;

insert into public.contracts (id, tenant_id, customer_id, code, scope, starts_on, ends_on, monthly_value, billing_rule)
values
  ('d0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',
   'CT-2026-001', 'Manutencao predial completa — HVAC, eletrica, hidraulica e civil', '2026-01-01', '2027-12-31', 15000.00,
   'Mensal fixo com glosa por SLA'),
  ('d0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',
   'CT-2026-002', 'Manutencao de equipamentos medico-hospitalares e ar-condicionado', '2026-03-01', '2028-02-29', 28000.00,
   'Mensal por OS aprovada')
on conflict do nothing;

-- =====================================================================
-- 3. Vinculo: cliente_gestor acessa apenas Shopping Central (CT-2026-001)
--    Nao tem acesso ao contrato do Hospital Vida (CT-2026-002)
-- =====================================================================
insert into public.user_contract_access (user_id, contract_id)
values ('20000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001')
on conflict do nothing;
