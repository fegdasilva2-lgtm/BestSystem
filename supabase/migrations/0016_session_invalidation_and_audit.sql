-- Migration 0016 - Invalidação de sessão e auditoria de role/active
--
-- Problema: quando o admin troca a role de um usuario (ou desativa),
-- o JWT em circulação ainda traz a role antiga (claim user_role) e
-- o flag user_active antigo. O usuario rebaixado continua com
-- permissões até o token expirar (ate 1h) ou até forçar refresh.
--
-- Solução: adicionar coluna `sessions_invalidated_at` em users_profile.
-- Toda request autenticada checa se o JWT foi emitido antes desse
-- timestamp; se sim, é tratada como stale e força re-login.
--
-- Mudancas em role/active sao auditadas em audit_logs via trigger.

-- =====================================================================
-- 1. Coluna para carimbar a invalidação de sessões
-- =====================================================================
alter table public.users_profile
  add column if not exists sessions_invalidated_at timestamptz;

comment on column public.users_profile.sessions_invalidated_at is
  'Quando >= iat do JWT, todas as sessoes do usuario sao consideradas invalidas. '
  'Atualizado automaticamente em UPDATE de role/active para forçar re-login.';

-- =====================================================================
-- 2. Função utilitaria: timestamp de invalidação do usuario atual
-- =====================================================================
create or replace function public.current_sessions_invalidated_at()
returns timestamptz
language sql
stable
security definer
set search_path = public
as $$
  select sessions_invalidated_at
  from public.users_profile
  where id = auth.uid();
$$;

-- =====================================================================
-- 3. Trigger: auditoria + invalidação em mudanca de role/active
-- =====================================================================
create or replace function public.fn_users_profile_invalidate_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Detecta mudanca relevante: role OU active
  if (tg_op = 'UPDATE'
      and (old.role is distinct from new.role
           or old.active is distinct from new.active))
  then
    -- Marca todas as sessoes existentes como invalidas.
    -- Proxima request do usuario cai no check do proxy e é forçado
    -- a re-autenticar (Auth Hook reemite JWT com claims atualizados).
    new.sessions_invalidated_at := now();

    -- Auditoria: registra a mudanca em audit_logs.
    -- Usa os mesmos campos que fn_audit_write para manter consistencia.
    insert into public.audit_logs (
      tenant_id, actor_id, entity_type, entity_id, action, before_data, after_data
    ) values (
      new.tenant_id,
      auth.uid(),
      'users_profile',
      new.id,
      'role_change',
      jsonb_build_object(
        'role', old.role,
        'active', old.active
      ),
      jsonb_build_object(
        'role', new.role,
        'active', new.active
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists users_profile_invalidate_session on public.users_profile;
create trigger users_profile_invalidate_session
  before update on public.users_profile
  for each row execute function public.fn_users_profile_invalidate_session();

-- =====================================================================
-- 4. RLS: leitura de sessions_invalidated_at segue a mesma policy
--    de users_profile (ja coberta por users_select com tenant_match).
--    Nao precisa de policy adicional.
-- =====================================================================