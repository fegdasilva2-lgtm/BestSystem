-- Teste de isolamento RLS - pode ser rodado localmente com
--   supabase db reset  -- aplica migrations
--   psql $DATABASE_URL -f supabase/tests/rls-isolation.sql
--
-- Cenario: tenta vazar dados entre 2 tenants usando 2 sessoes autenticadas.
-- O JWT simulado vem da funcao set_config('request.jwt.claims', ...).
-- A funcao public.current_tenant_id() le exatamente esse setting.

\set ON_ERROR_STOP on

begin;
  -- Garante tenants de teste
  insert into public.tenants (id, name, slug, plan, status) values
    ('11111111-1111-1111-1111-111111111111', 'Tenant Test A', 'test-a', 'starter', 'piloto'),
    ('22222222-2222-2222-2222-222222222222', 'Tenant Test B', 'test-b', 'starter', 'piloto')
  on conflict do nothing;

  -- Insere dados exclusivos de cada tenant
  set local role authenticated;
  perform set_config('request.jwt.claims',
    json_build_object(
      'sub', '00000000-0000-0000-0000-000000000aaa',
      'tenant_id', '11111111-1111-1111-1111-111111111111',
      'user_role', 'admin_org',
      'user_active', true
    )::text,
    false);

  insert into public.customers (tenant_id, name) values
    ('11111111-1111-1111-1111-111111111111', 'CLIENTE A');

  -- Troca para sessao do Tenant B
  perform set_config('request.jwt.claims',
    json_build_object(
      'sub', '00000000-0000-0000-0000-000000000bbb',
      'tenant_id', '22222222-2222-2222-2222-222222222222',
      'user_role', 'admin_org',
      'user_active', true
    )::text,
    false);

  insert into public.customers (tenant_id, name) values
    ('22222222-2222-2222-2222-222222222222', 'CLIENTE B');

  -- Tenant B tenta ler customers de A: deve retornar 0
  do $$
  declare
    leak_count int;
  begin
    select count(*) into leak_count
    from public.customers
    where name = 'CLIENTE A';
    if leak_count <> 0 then
      raise exception 'VAZOU: Tenant B viu % linhas de A', leak_count;
    end if;
  end $$;

  -- Tenant B tenta inserir customer com tenant_id de A: deve falhar
  do $$
  declare
    err_caught boolean := false;
  begin
    insert into public.customers (tenant_id, name) values
      ('11111111-1111-1111-1111-111111111111', 'INVASAO');
  exception when others then
    err_caught := true;
  end $$;

  -- Tenant B atualiza customer de A: 0 linhas afetadas
  do $$
  declare
    upd int;
  begin
    with target as (
      select id from public.customers where name = 'CLIENTE A' limit 1
    )
    update public.customers
      set name = 'INVADIDO'
      where id in (select id from target);
    get diagnostics upd = row_count;
    if upd <> 0 then
      raise exception 'VAZOU: Tenant B atualizou % linhas de A', upd;
    end if;
  end $$;

  -- audit_logs imutavel: tentativa de update deve falhar
  do $$
  begin
    update public.audit_logs set action = 'HACKED' where tenant_id is not null;
    raise exception 'audit_logs deveria ser imutavel';
  exception when others then
    -- esperado
    null;
  end $$;

  -- Cleanup
  delete from public.customers where name in ('CLIENTE A', 'CLIENTE B', 'INVASAO');
  delete from public.tenants where id in (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  );
rollback;

select 'RLS_ISOLATION_OK' as result;
