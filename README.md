# PredialOps — Gestão de Manutenção Predial

> **Plataforma SaaS brasileira** para gestão de contratos de manutenção predial com execução em campo, medição, aceite e RGM em um único fluxo.

---

## O produto

O PredialOps centraliza tudo que uma empresa de facilities precisa:

- **Contratos** — gestão de clientes, vigência, escopo, SLA e reajuste
- **Execução em campo** — OS, PMOC, preventive plans via PWA offline-first
- **Medições mensais** — envio, contestação e aprovação de medições
- **RGM** — relatório mensal gerencial configurável por contrato
- **Portal do cliente** — transparência, aprovação de entregas e arquivamento

---

## Stack

```
apps/
├── mobile/          # PWA offline-first (IndexedDB + Dexie)
│   └── service-worker + sync incremential
└── web/             # Next.js 15 (App Router) + TypeScript
    └── Server Actions + RLS

packages/
└── ds/              # Design system: tokens + tipos compartilhados

supabase/
├── migrations/      # 0001..0010: schema, RLS, audit, storage, seed
└── functions/       # Edge Functions (auth hook, custom access token)
```

| Camada | Tecnologia |
|---|---|
| Frontend web | Next.js 15, TypeScript, CSS custom |
| Frontend mobile | PWA, IndexedDB (Dexie) |
| Backend | Supabase (PostgreSQL + RLS + Auth + Edge Functions + Storage) |
| Infra | Vercel (web), Supabase Cloud (sa-east-1) |
| Multi-tenant | RLS — isolamento por `tenant_id` no banco |

---

## Modelo de dados (entidades principais)

```
tenant (empresa/cliente)
  │
  ├── user_profile (usuários + role + tenant_id)
  │
  ├── contract (contrato de manutenção)
  │     ├── sla (níveis de atendimento)
  │     ├── service_category
  │     ├── billing_rule
  │     │
  │     ├── site (unidade/endereço)
  │     │     └── asset (equipamento)
  │     │
  │     ├── work_order (ordem de serviço)
  │     │     └── work_order_item
  │     │
  │     ├── preventive_plan (PMOC)
  │     │     └── preventive_item
  │     │
  │     ├── measurement (medição mensal)
  │     │     └── measurement_line
  │     │
  │     └── rgm_version (relatório mensal gerencial)
  │
  └── inventory_item (estoque/almoxarifado)
```

---

## Módulos e funcionalidades

### Implementados (piloto)

| Módulo | Rota | Status |
|---|---|---|
| Login + matriz de perfis | `/login` | ✅ |
| Setup inicial (1º admin) | `/setup` | ✅ |
| Hub de onboarding | `/admin` | ✅ |
| Cadastro de clientes | `/admin/customers/new` | ✅ |
| Cadastro de contratos | `/admin/contracts/new` | ✅ |
| Cadastro de sites | `/admin/sites/new` | ✅ |
| Cadastro de ativos | `/admin/assets/new` | ✅ |
| Gestão PMOC | `/admin/pmoc` | ✅ |
| Portal do cliente | `/portal` | ✅ |
| Importação CSV/Excel | `/admin/import` | ✅ |
| RGM configurável | `/admin/rgm` | ✅ |
| PWA offline (mobile) | `/apps/mobile` | ✅ |

### Gaps identificados (próximos sprints)

| Módulo | Rota | Prioridade |
|---|---|---|
| Lista de contratos | `/admin/contracts` | Alta |
| Lista de ativos | `/admin/assets` | Alta |
| Gestão de OS | `/admin/work-orders` | Alta |
| Lista de medições | `/admin/measurements` | Média |
| Gestão de SLA | `/admin/sla` | Média |
| Reports / dashboards | `/admin/reports` | Média |
| Gestão de usuários | `/admin/users` | Média |
| Almoxarifado | `/admin/inventory` | Baixa |

---

## Perfis de acesso (14 perfis, 4 lanes)

Consulte [docs/PERFIS.md](docs/PERFIS.md) para a documentação completa de cada perfil.

| Lane | Perfis |
|---|---|
| **Gestão** | Super admin SaaS · Admin da empresa · Gestor de facilities |
| **Operação** | Planejador · Supervisor · Técnico · Auxiliar · Almoxarife |
| **Backoffice** | Comercial · Financeiro · Auditor |
| **Cliente** | Gestor do cliente · Solicitante · Fornecedor |

---

## Começando

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar ambiente web

```bash
cp apps/web/.env.example apps/web/.env.local
# Preencher NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 3. Subir localmente

```bash
# Web (Next.js)
npm run dev:web

# PWA mobile
npm run dev:mobile
```

### 4. Primeiro acesso

```
http://localhost:3000/setup   # cria 1º admin + tenant IMC Facilities
http://localhost:3000/login    # após setup
```

### 5. Validação automatizada

```bash
npm run check          # verifica marcadores de Dexie/RLS/outbox
npm run test           # todos os testes
```

---

## Validação do piloto

O piloto valida 3 hipóteses antes da stack enterprise:

1. **Contrato como entidade central** — clientes, sites, ativos, SLA, medição e RGM orbitam o contrato
2. **Offline-first em campo** — PWA com outbox, evidências e sync incremental
3. **Multi-tenant com RLS** — isolamento por `tenant_id` no banco, não só no frontend

---

## Contribuição

1. Clone o repositório
2. `npm install` na raiz (workspaces)
3. Crie uma branch: `git checkout -b feat/mymodule`
4. Commit por vez: alteração → `git commit` → push → PR
5. Execute `npm run check` antes de abrir PR

> Git: Francisco Ederson (`fegdasilva2@gmail.com`)
