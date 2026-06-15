-- Migration 0005 - Seed sandbox: 3 tenants ficticios para UAT
-- Os dados abaixo NAO vao para producao. Apos o piloto, este arquivo
-- e substituido por um wizard de onboarding assistido.

-- Senha de todos os usuarios seed: 'PredialOps!2026' (forcar troca no 1o login)

insert into public.tenants (id, name, slug, plan, status) values
  ('00000000-0000-0000-0000-000000000001', 'IMC Facilities',  'imc-facilities',  'business',    'ativo'),
  ('00000000-0000-0000-0000-000000000002', 'Rede Vitta',      'rede-vitta',      'professional','implantacao'),
  ('00000000-0000-0000-0000-000000000003', 'Condominio Axis', 'condominio-axis', 'starter',     'piloto')
on conflict do nothing;

-- Usuarios de teste para gestao do tenant IMC Facilities.
-- E-mails:
--   superadmin.gestao@predialops.test  -> Super admin SaaS
--   admin.gestao@predialops.test       -> Administrador da empresa
--   gestor.gestao@predialops.test      -> Gestor de facilities
-- Senha de todos: 'PredialOps!2026'
--
-- Observacao: este seed escreve em auth.users apenas para sandbox/local/UAT.
-- Para ambientes produtivos, criar usuarios via Supabase Auth Admin API.
do $$
declare
  seed_tenant_id uuid := '00000000-0000-0000-0000-000000000001';
  seed_password text := 'PredialOps!2026';
  seed_user record;
  auth_user_id uuid;
begin
  for seed_user in
    select *
    from (
      values
        (
          '10000000-0000-0000-0000-000000000001'::uuid,
          'Super Admin Gestao',
          'superadmin.gestao@predialops.test',
          'super_admin_saas'
        ),
        (
          '10000000-0000-0000-0000-000000000002'::uuid,
          'Admin Organizacao Gestao',
          'admin.gestao@predialops.test',
          'admin_org'
        ),
        (
          '10000000-0000-0000-0000-000000000003'::uuid,
          'Gestor Facilities Gestao',
          'gestor.gestao@predialops.test',
          'gestor_facilities'
        )
    ) as users(id, name, email, role)
  loop
    select id
      into auth_user_id
      from auth.users
      where email = seed_user.email
      limit 1;

    if auth_user_id is null then
      auth_user_id := seed_user.id;

      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000',
        auth_user_id,
        'authenticated',
        'authenticated',
        seed_user.email,
        crypt(seed_password, gen_salt('bf')),
        now(),
        '',
        '',
        '',
        '',
        jsonb_build_object(
          'provider', 'email',
          'providers', jsonb_build_array('email'),
          'tenant_id', seed_tenant_id::text,
          'user_role', seed_user.role,
          'user_active', true
        ),
        jsonb_build_object('display_name', seed_user.name),
        now(),
        now()
      );
    else
      update auth.users
         set encrypted_password = crypt(seed_password, gen_salt('bf')),
             email_confirmed_at = coalesce(email_confirmed_at, now()),
             raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
               || jsonb_build_object(
                    'provider', 'email',
                    'providers', jsonb_build_array('email'),
                    'tenant_id', seed_tenant_id::text,
                    'user_role', seed_user.role,
                    'user_active', true
                  ),
             raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
               || jsonb_build_object('display_name', seed_user.name),
             updated_at = now()
       where id = auth_user_id;
    end if;

    insert into auth.identities (
      id,
      user_id,
      provider,
      provider_id,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    )
    select
      gen_random_uuid(),
      auth_user_id,
      'email',
      auth_user_id::text,
      jsonb_build_object('sub', auth_user_id::text, 'email', seed_user.email),
      now(),
      now(),
      now()
    where not exists (
      select 1
        from auth.identities
        where provider = 'email'
          and provider_id = auth_user_id::text
    );

    insert into public.users_profile (
      id,
      tenant_id,
      name,
      email,
      role,
      active
    ) values (
      auth_user_id,
      seed_tenant_id,
      seed_user.name,
      seed_user.email,
      seed_user.role,
      true
    )
    on conflict (id) do update
      set tenant_id = excluded.tenant_id,
          name = excluded.name,
          email = excluded.email,
          role = excluded.role,
          active = excluded.active,
          updated_at = now();
  end loop;
end $$;
