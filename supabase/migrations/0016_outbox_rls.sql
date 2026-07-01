-- Migration 0016 - Habilita RLS em outbox_events
-- Correção de vulnerabilidade CRITICAL detectada pelo Supabase Advisor:
-- "rls_disabled_in_public" — tabela pública sem Row-Level Security.
--
-- A tabela outbox_events foi criada na migration 0003 (audit_and_outbox.sql)
-- mas a ativação de RLS foi omitida. Sem RLS, qualquer chamada autenticada
-- à API REST pode ler, modificar e deletar eventos do outbox de todos os
-- tenants — vazamento de dados entre organizações.
--
-- Estratégia: mesma usada nas demais tabelas — isolamento por tenant_id.
-- SELECT/UPDATE: apenas dados do próprio tenant.
-- INSERT: feito via trigger (security definer), passa no with check.
-- DELETE: bloqueado (o outbox é processado, não removido manualmente).

alter table public.outbox_events enable row level security;
alter table public.outbox_events force row level security;

-- SELECT: usuário vê apenas eventos do próprio tenant
create policy outbox_events_select on public.outbox_events
  for select using (public.tenant_match(tenant_id));

-- UPDATE: apenas para marcar como processado, dentro do tenant
create policy outbox_events_update on public.outbox_events
  for update using (public.tenant_match(tenant_id))
  with check (public.tenant_match(tenant_id));

-- INSERT: triggers security definer inserem com tenant_id correto;
-- permitir insert passando pelo tenant_match
create policy outbox_events_insert on public.outbox_events
  for insert with check (public.tenant_match(tenant_id));
