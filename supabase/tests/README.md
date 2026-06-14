# Testes SQL locais

Rodam contra uma instancia local do Supabase (ou contra `supabase start`).

## rls-isolation.sql

Verifica que a RLS bloqueia:

1. Tenant B le dados de A
2. Tenant B insere com `tenant_id` de A
3. Tenant B atualiza registro de A
4. `audit_logs` aceita update (deve falhar; eh imutavel)

## Como rodar

```bash
# Sobe o Postgres local do Supabase
supabase start

# Aplica migrations
supabase db reset

# Roda o teste
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  -f supabase/tests/rls-isolation.sql
```

Saida esperada:
```
 result
-------------------
 RLS_ISOLATION_OK
```

Se qualquer assertion falhar, o script faz `RAISE EXCEPTION` e o `psql`
retorna codigo de saida diferente de zero.
