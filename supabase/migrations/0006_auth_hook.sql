-- Migration 0006 - Auth Hook wrapper para custom-access-token
-- Cria a funcao SQL `custom_access_token_hook` que o Supabase Auth
-- invoca automaticamente em cada emissao/refresh de JWT. Essa funcao
-- chama a Edge Function `custom-access-token`, que retorna os claims
-- extras (tenant_id, user_role) a serem injetados no token.
--
-- Ativacao apos o deploy:
--   supabase functions deploy custom-access-token --no-verify-jwt
--   supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=...
--   Dashboard > Authentication > Hooks > Custom Access Token: ON
--
-- Referencia: https://supabase.com/docs/guides/auth/auth-hooks

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  result jsonb;
  fn_url text;
begin
  -- Chama a Edge Function via net.http_post quando o ambiente tem
  -- a extensao `pg_net`. Em outros casos, faz fallback para uma
  -- implementacao in-line que consulta users_profile diretamente.
  -- Mantemos a chamada HTTP para preservar a logica em um so lugar.

  begin
    select net.http_post(
      url := current_setting('app.settings.edge_function_url', true) || '/custom-access-token',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('user_id', event ->> 'user_id', 'claims', event -> 'claims')
    ) into result;
    claims := (result ->> 'body')::jsonb -> 'claims';
  exception when others then
    -- Fallback: lookup inline
    select jsonb_build_object(
      'tenant_id', up.tenant_id::text,
      'user_role', up.role,
      'user_active', up.active
    )
    into claims
    from public.users_profile up
    where up.id = (event ->> 'user_id')::uuid;
  end;

  if claims is null then
    claims := jsonb_build_object('user_active', false);
  end if;

  return jsonb_set(
    event,
    '{claims}',
    event -> 'claims' || claims
  );
end;
$$;

-- Garante que a role `supabase_auth_admin` pode executar o hook
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant usage on schema public to supabase_auth_admin;
grant select on public.users_profile to supabase_auth_admin;
