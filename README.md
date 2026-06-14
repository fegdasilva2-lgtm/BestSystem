# PredialOps

Plataforma SaaS brasileira para gestao de contratos de manutencao predial.
Piloto sandbox em monorepo com PWA mobile, Next.js web, Supabase (Postgres + RLS) e design system compartilhado.

> **Stack do piloto** (validacao da tese brasileira):
> PWA mobile com IndexedDB (Dexie) + Next.js/TS na web + Supabase `sa-east-1` + Vercel.
> Migracao para a stack completa do estudo (Kotlin/Spring Modulith, Android nativo, AWS) acontece
> apos o piloto, conforme descrito em `docs/setup/ROADMAP.md`.

## Estrutura

```
.
|-- apps/
|   |-- mobile/          # PWA offline-first (tecnico, solicitante, leitura)
|   `-- web/             # Next.js + Supabase (admin, gestor, portal do cliente)
|
|-- packages/
|   `-- ds/              # Design system: tokens TS + tipos compartilhados
|
|-- supabase/
|   |-- migrations/      # 0001..0005: schema, RLS, audit, outbox, storage, seed
|   `-- config.toml      # regiao sa-east-1, MFA, sem signup publico
|
|-- docs/
|   |-- PRD.md           # PRD do piloto
|   |-- ARCHITECTURE.md  # alvo de producao
|   |-- DATA_MODEL.sql   # DDL inicial (referencia; superseded pelas migrations)
|   `-- setup/
|       |-- SUPABASE.md  # passo-a-passo de provisionamento
|       `-- ROADMAP.md   # plano de migracao para a V1
|
`-- package.json         # workspaces npm
```

## Pre-requisitos

- Node 20+ (testado em 24)
- npm 11+ (workspaces)
- Supabase CLI: `npm i -g supabase`
- Opcional para deploy: conta na Vercel e Supabase

## Subir o PWA localmente

```bash
npm install
npm run dev:mobile
# abre http://localhost:4173
```

O PWA funciona offline. O IndexedDB e inicializado na primeira visita com o seed
em `apps/mobile/lib/seed.js` (3 tenants, 7 usuarios, 4 OS, 2 chamados, 3 ativos, 3 itens de estoque).

## Subir a web localmente

```bash
# 1) Provisionar o Supabase (veja docs/setup/SUPABASE.md)
cp apps/web/.env.example apps/web/.env.local
# preencher NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY

npm install
npm run dev:web
# abre http://localhost:3000
# primeiro acesso: http://localhost:3000/setup
# depois: http://localhost:3000/login
```

## Validacao automatica

```bash
npm run check
# verifica arquivos, modulos e marcadores de Dexie/RLS/outbox
```

## Proximos passos do piloto (12 semanas)

Vide `docs/setup/ROADMAP.md`.
