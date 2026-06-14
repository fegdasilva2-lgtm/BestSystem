-- Migration 0008 - corrige leitura de tenant/perfil a partir do JWT
-- O Auth Hook grava claims top-level (`tenant_id`, `user_role`).
-- O setup web tambem grava os mesmos dados em `app_metadata`, que o
-- Supabase inclui no JWT sem precisar de signup publico.

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
      current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_id',
      auth.jwt() ->> 'tenant_id',
      auth.jwt() -> 'app_metadata' ->> 'tenant_id'
    ),
    ''
  )::uuid;
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() ->> 'user_role'),
    (auth.jwt() -> 'app_metadata' ->> 'user_role'),
    (select role from public.users_profile where id = auth.uid())
  );
$$;

create or replace function public.current_user_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'user_active', '')::boolean,
    nullif(auth.jwt() -> 'app_metadata' ->> 'user_active', '')::boolean,
    (select active from public.users_profile where id = auth.uid()),
    false
  );
$$;
