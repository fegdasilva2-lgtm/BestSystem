# Provisionamento do Supabase (piloto)

Regiao obrigatoria: **sa-east-1 (Sao Paulo)** por causa de LGPD e latencia.

## 1. Criar o projeto

1. Acesse https://app.supabase.com e crie um projeto:
   - Nome: `predialops-homolog`
   - Database password: gerar e guardar em cofre (1Password, Vault, etc.)
   - Region: **South America (Sao Paulo)**
   - Plan: **Pro** (PITR 7 dias + escala suficiente para o piloto)

2. Habilite **MFA** em Authentication > Sign In/Up.

3. Em Authentication > URL Configuration:
   - Site URL: `https://homolog.predialops.app.br`
   - Additional redirect URLs: adicione a URL de preview da Vercel

## 2. Aplicar as migrations

Localmente, com o Supabase CLI autenticado e linkado ao projeto:

```bash
supabase link --project-ref <ref>
supabase db push
# ou, em ambiente de producao:
# supabase db push --include-all
```

As migrations estao em `supabase/migrations/`:

- `0001_base_schema.sql` - tabelas, indices, auditoria imutavel
- `0002_rls_policies.sql` - Row-Level Security por `tenant_id`
- `0003_audit_and_outbox.sql` - triggers de auditoria e outbox pattern
- `0004_storage.sql` - buckets `evidence`, `rgm`, `contracts`
- `0005_seed_sandbox.sql` - 3 tenants ficticios para o sandbox

Apos `db push`, confirme no SQL editor:

```sql
select count(*) from tenants;
-- esperado: 3
```

## 3. Gerar tipos TypeScript

```bash
supabase gen types typescript --linked > packages/ds/src/db-types.ts
```

O arquivo gerado sobrescreve os tipos manuais; a partir dai o web ganha autocomplete e type-safety das queries.

## 4. Variaveis de ambiente

### Vercel (apps/web)
| Variavel | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key do projeto |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (server-side only) |

### PWA (apps/mobile)
Em `apps/mobile/lib/supabase.js`, o cliente busca as chaves de:
- `window.__ENV.SUPABASE_URL` / `window.__ENV.SUPABASE_ANON_KEY` (injetado no deploy), ou
- `localStorage.supabase.url` / `localStorage.supabase.anon` (config manual em ambiente de demo).

## 5. Primeiro usuario

Depois de aplicar as migrations e configurar as variaveis do web, abra:

```text
http://localhost:3000/setup
```

Essa tela cria o primeiro administrador `admin_org`, provisiona o tenant sandbox `IMC Facilities` se ele ainda nao existir, cria o usuario no Supabase Auth e grava `users_profile`.

Depois que o primeiro administrador entrar, novos logins podem ser criados pela tela:

```text
http://localhost:3000/admin/users
```

Essas telas usam `SUPABASE_SERVICE_ROLE_KEY` somente em Server Actions. A chave nunca deve usar prefixo `NEXT_PUBLIC_`.

## 6. Injetar `tenant_id` no JWT (Auth Hook)

A RLS le `tenant_id` e `user_role` do JWT. O sandbox grava esses dados em `app_metadata` durante `/setup` e `/admin/users`, entao o login ja funciona sem signup publico.

O Auth Hook continua recomendado para ambientes avancados onde os claims precisam ser recalculados a cada refresh:

A migration `0006_auth_hook.sql` ja cria a funcao SQL `public.custom_access_token_hook`. Para ativa-la:

```bash
# 1. Deploy da Edge Function
supabase functions deploy custom-access-token --no-verify-jwt

# 2. Secrets necessarios
supabase secrets set SUPABASE_URL=https://<ref>.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# 3. Configurar o hook no Dashboard
#    Authentication > Hooks > "Custom Access Token"
#    Habilitar e apontar para: public.custom_access_token_hook

# 4. Aplicar a migration 0006
supabase db push

# 5. Smoke test: apos login em /login, o JWT decodado deve trazer:
#    { "tenant_id": "00000000-...", "user_role": "admin_org", ... }
```

A funcao tambem inclui `user_active`; usuarios desativados recebem JWT sem acesso.

Rotas web protegidas:
- `/admin/*` exige login.
- `/portal/*` exige login.
- `/login` autentica por e-mail e senha usando Supabase Auth.

## 7. Teste de isolamento RLS

Apos provisionar, valide que a RLS esta realmente bloqueando acesso cross-tenant:

```bash
# Dispara a Edge Function de teste (apenas no sandbox, NAO rodar em prod)
curl -X POST \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  $SUPABASE_URL/functions/v1/rls-isolation-test
```

Resposta esperada:
```json
{
  "passed": true,
  "results": [
    { "name": "Tenant A insere customer", "passed": true, "detail": "id=..." },
    { "name": "Tenant B NAO ve customer de A", "passed": true, "detail": "ok (0 linhas)" },
    { "name": "Tenant A NAO ve customer de B", "passed": true, "detail": "ok (0 linhas)" },
    { "name": "Listagem de A soh retorna TENANT_A", "passed": true, "detail": "ok (N linhas)" },
    { "name": "Tenant B NAO consegue atualizar OS de A", "passed": true, "detail": "ok" }
  ]
}
```

A funcao cria e remove usuarios de teste, portanto pode ser executada com seguranca em qualquer ambiente. Ela falha (passed=false) se qualquer tentativa de vazamento for bem-sucedida.
