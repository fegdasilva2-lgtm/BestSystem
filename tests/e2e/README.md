# Testes E2E (Playwright)

Suite E2E focada em **RBAC + auth**. Valida end-to-end, contra o proxy Next.js
e o Supabase Auth real, que cada um dos 14 perfis do sistema consegue acessar
exatamente as rotas que `docs/PERFIS.md` declara.

## Estrutura

```
tests/e2e/
├── global-setup.ts       Cria 14 usuarios de teste no Supabase (um por role)
│                         e gera storageState por role (.auth/<role>.json)
├── fixtures.ts           Exporta `test` autenticado por role (14 fixtures)
├── rbac-matrix.spec.ts   168 testes (14 roles x 12 rotas criticas)
└── .auth/                Diretorio de storageState (gitignored)
```

## Como rodar localmente

### Pre-requisitos

1. Node 24+ (para o test runner)
2. Supabase rodando (local ou staging)
3. Browsers Playwright instalados (`npx playwright install chromium`)

### Variaveis de ambiente

```bash
export BASE_URL=http://localhost:3000
export SUPABASE_URL=https://xxx.supabase.co
export SUPABASE_ANON_KEY=eyJhbGc...
export SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...   # service role key
export E2E_TEST_TENANT_ID=<uuid-do-tenant-de-teste>
```

`E2E_TEST_TENANT_ID` deve apontar para um tenant onde voce quer criar os 14
usuarios de teste. Recomendacao: criar um tenant dedicado para E2E em staging
(nao usar o tenant de producao).

### Comandos

```bash
# 1. Subir web em modo dev em um terminal
npm run dev:web

# 2. Em outro terminal, rodar os testes
npm run test:e2e                          # modo list (verbose)
npx playwright test --ui                  # modo interativo
npx playwright test tests/e2e/admin       # rodar so um bloco
```

### Sem env vars configuradas

Os testes fazem `test.skip()` gracioso. O CI continua verde (0 falhas, 168
skipped) e o report HTML mostra "skipped" em vez de erro. Isso permite que o
job E2E rode em PRs sem expor credenciais.

## Adicionando novos casos

A matriz em `rbac-matrix.spec.ts` espelha `docs/PERFIS.md`. Para adicionar uma
rota nova:

1. Adicione a rota em `MATRIX` com a funcao `allow(role)` correta
2. Se for uma rota cross-tenant ou restrita, documente em `docs/PERFIS.md`
3. Atualize `tests/rbac-matrix.test.mts` (unit) tambem — fonte unica de verdade

## Quando os testes E2E sao uteis vs. unitarios

| Cenario | Use |
|---|---|
| Mudou regra em `lib/rbac-matrix.ts` | `npm run test:rbac-matrix` (392 assertions, <500ms) |
| Mudou `proxy.ts` ou fluxo de auth | `npm run test:e2e` (precisa Supabase) |
| Criou rota nova | Atualize AMBOS os testes (unit + e2e) |
| Mudou UI/Sidebar | E2E manual ou adicionar caso em `rbac-matrix.spec.ts` |

## Troubleshooting

- "Executable doesn't exist" → rode `npx playwright install chromium`
- "Setup nao executado" → defina SUPABASE_URL/SERVICE_ROLE_KEY/E2E_TEST_TENANT_ID
- "Storage state nao encontrado" → setup nao criou arquivos; verifique `tests/e2e/.auth/<role>.json`
- Browser timeout → BASE_URL nao esta acessivel; suba `npm run dev:web` ou ajuste BASE_URL