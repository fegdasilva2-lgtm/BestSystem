# Roadmap do piloto e migracao para V1

Cronograma de 12 semanas do piloto sandbox e o que vem depois.

## Piloto (semanas 1-12)

| Semana | Entrega |
|---|---|
| 1-2  | Monorepo, design system, Supabase provisionado, schema, RLS, auth, RBAC, refator do PWA para Dexie |
| 3-4  | Cadastros (empresa/cliente/contrato/sites/ativos) + importador Excel de ativos e planos |
| 5-6  | Cronograma (geracao de OS) + OS completa (ciclo, checklist, fotos, auditoria) |
| 7-8  | PWA offline: pacote por rota/dia/contrato, fila de upload, resolucao de conflito |
| 9    | Medicao + glosa imutavel + aceite + RGM em PDF (Edge Function) |
| 10   | Portal do cliente (magic link) + portal do solicitante + LGPD tooling |
| 11   | UAT com 5 usuarios internos, hardening |
| 12   | Go-live do sandbox homolog, retrospectiva |

## Criterios de aceite do sandbox (resumo)

- 0 vazamento entre os 3 tenants (RLS testada)
- 95% das operacoes offline sincronizam em ate 60s apos reconexao
- Bundle shell do PWA <= 500KB gzipped
- p95 LCP web <= 2s em 3G rapido
- LGPD: export de dados do titular em <= 5 min

## Migracao para V1 (pós-piloto, alinhada ao estudo)

| Componente | Piloto | V1 (alinhado ao estudo) |
|---|---|---|
| Web | Next.js + Vercel | Next.js em container no cluster |
| Backend | Supabase | Kotlin + Spring Boot + Spring Modulith |
| Mobile | PWA + IndexedDB | Android Kotlin + Jetpack Compose + WorkManager |
| DB | Postgres + RLS | Postgres + RLS + outbox + read model |
| Auth | Supabase Auth | OIDC + Keycloak + MFA/SSO |
| Files | Supabase Storage | S3 + CDN |
| Fila | Realtime + pg_cron | RabbitMQ -> Kafka |
| Busca | Postgres FTS | OpenSearch |
| Observability | Sentry + Vercel + Supabase logs | OpenTelemetry + Grafana |
| Hosting | Vercel + Supabase sa-east-1 | AWS sa-east-1 ou Oracle sa-saopaulo-1 |

**Justificativa da migracao**: Supabase e excelente para acelerar a validacao, mas o estudo
recomenda Spring Modulith por modularidade, testabilidade entre dominios e suporte a regras
de negocio em constante evolucao. A migracao preserva o **contrato de dados** (Postgres + RLS +
schema), entao e trabalho de backend, nao de reescrita do produto.

**Quando migrar**: apos o piloto validar a tese brasileira com cliente pagante em producao.
Ate la, o Supabase absorve toda a complexidade operacional (backup, PITR, auth, storage) com
custo minimo.
