# Roadmap do Produto — PredialOps

Roadmap profissional do piloto SaaS brasileiro de manutenção predial, baseado no estado atual do monorepo Next.js + Supabase + PWA e nos gaps prioritários identificados.

## Status atual do piloto

### Pronto

- [x] Monorepo com `apps/web`, `apps/mobile`, `packages/ds`, `supabase` e `tests`
- [x] Web em Next.js 15 com App Router, Server Actions e integração Supabase
- [x] Autenticação, setup inicial e matriz RBAC com 14 perfis
- [x] Multi-tenancy por `tenant_id`, RLS, claims e testes de autorização
- [x] Hub administrativo em `/admin`
- [x] Cadastros iniciais por formulário:
  - [x] Cliente em `/admin/customers/new`
  - [x] Contrato em `/admin/contracts/new`
  - [x] Site em `/admin/sites/new`
  - [x] Ativo em `/admin/assets/new`
- [x] PMOC em `/admin/pmoc`
- [x] RGM configurável em `/admin/rgm`
- [x] Portal do cliente em `/portal`
- [x] Importação CSV/Excel em `/admin/import`
- [x] PWA mobile offline-first em `apps/mobile`

### Falta para um piloto operacional

- [ ] Lista e consulta de contratos em `/admin/contracts`
- [ ] Lista e consulta de ativos em `/admin/assets`
- [ ] Gestão completa de ordens de serviço em `/admin/work-orders`
- [ ] Medições com ciclo de envio, glosa, aceite e trilha imutável em `/admin/measurements`
- [ ] Motor de SLA com regras, calendário, pausas e escalonamento em `/admin/sla`
- [ ] Relatórios e dashboards operacionais em `/admin/reports`
- [ ] Consolidação de permissões por rota, ação e tenant
- [ ] Testes de autorização e regressão para módulos críticos

## Priorização

| Prioridade | Gap | Motivo |
|---|---|---|
| P0 | `/admin/contracts` | Contrato é a entidade central do produto; sem lista não há operação recorrente. |
| P0 | `/admin/assets` | Ativos são a base técnica para PMOC, OS, evidências e histórico. |
| P0 | `/admin/work-orders` | OS é o núcleo da execução em campo e do ciclo de manutenção. |
| P1 | `/admin/measurements` | Medição conecta execução, aceite, faturamento e contestação. |
| P1 | `/admin/sla` | SLA precisa deixar de ser apenas indicador e virar regra operacional. |
| P1 | `/admin/reports` | Relatórios sustentam gestão, transparência e valor percebido pelo cliente. |

---

## Fase 1 — Piloto

Objetivo: entregar um fluxo operacional mínimo, auditável e multi-tenant para validar o ciclo contrato -> ativo -> OS -> medição -> aceite -> RGM.

### Módulos

- [x] Autenticação, setup e RBAC
- [x] Onboarding administrativo
- [x] Cadastros base por formulário
- [x] PMOC
- [x] RGM
- [x] Portal do cliente
- [ ] Listas operacionais de contratos e ativos
- [ ] Ordens de serviço
- [ ] Medições
- [ ] SLA operacional

### Funcionalidades

- [ ] Criar `/admin/contracts` com busca, filtros, status, vigência, cliente, unidade e ações rápidas
- [ ] Criar `/admin/assets` com busca, filtros por site/contrato/tipo/status e link para histórico
- [ ] Criar `/admin/work-orders` com lista, status, responsável, SLA, origem e fluxo de execução
- [ ] Criar `/admin/measurements` com competência, contrato, valores, glosas, aprovação e bloqueio de edição pós-aceite
- [ ] Criar `/admin/sla` com regras por contrato, prioridade, calendário, pausas e escalonamento
- [ ] Conectar RGM a contratos, OS, medições, SLA e evidências reais do piloto
- [ ] Garantir acesso por perfil nas rotas críticas e testes de isolamento por tenant

### Critérios de Done

- [ ] Usuário `admin_org` consegue navegar de contrato para sites, ativos, OS, medição e RGM
- [ ] Usuário `gestor_facilities` consegue acompanhar operação sem alterar configurações críticas
- [ ] Usuário `supervisor` consegue validar OS e aprovar/reprovar medições dentro do tenant
- [ ] Usuário `tecnico` visualiza apenas OS atribuídas e registra execução no PWA
- [ ] Usuário `cliente_gestor` aprova ou reprova entregas pelo portal
- [ ] Todas as listas P0 têm empty state, loading state, filtro básico e paginação ou limite explícito
- [ ] Rotas P0/P1 têm teste de autorização ou cobertura equivalente
- [ ] Nenhuma consulta retorna dados de outro tenant

---

## Fase 2 — Operacional

Objetivo: transformar o piloto em operação diária para múltiplos contratos, com governança, produtividade e rastreabilidade.

### Módulos

- [ ] Planejamento operacional
- [ ] Execução de OS com checklist e evidências
- [ ] Medição, glosa e aceite
- [ ] SLA com calendário e escalonamento
- [ ] Relatórios gerenciais
- [ ] Gestão de usuários e auditoria
- [ ] Almoxarifado básico

### Funcionalidades

- [ ] Calendário operacional por contrato, site, técnico e janela de atendimento
- [ ] Geração de OS preventiva a partir de PMOC e planos recorrentes
- [ ] Fluxo completo da OS: aberta, atribuída, em execução, concluída, validada, reprovada e encerrada
- [ ] Checklist técnico com fotos, observações, assinatura e anexos
- [ ] Medições versionadas por competência, com linhas de cobrança, descontos, glosas e aceite formal
- [ ] SLA com tempo de reconhecimento, mobilização, solução, pausa justificada e escalonamento
- [ ] `/admin/reports` com visão por contrato, SLA, backlog, produtividade, reincidência e medição
- [ ] Auditoria de ações críticas: alteração contratual, aceite, glosa, aprovação e exclusão lógica
- [ ] Gestão de usuários em `/admin/users` com ativação, desativação e troca de perfil
- [ ] Estoque inicial em `/admin/inventory` com itens, entradas, saídas e consumo por OS

### Critérios de Done

- [ ] Operação mensal de um contrato piloto pode ser executada sem planilhas paralelas
- [ ] Toda OS tem status, responsável, trilha de auditoria e evidências quando aplicável
- [ ] Toda medição aprovada tem versão imutável e vínculo com RGM
- [ ] SLA é calculado por regra persistida, não por valor manual no frontend
- [ ] Dashboard mostra dados consistentes com as tabelas transacionais
- [ ] Permissões bloqueiam alteração indevida por perfil e por tenant
- [ ] Fluxos críticos têm testes automatizados ou roteiro UAT documentado

---

## Fase 3 — Expansão

Objetivo: escalar o produto para múltiplos clientes, contratos e equipes, preparando a transição para arquitetura enterprise quando houver validação comercial.

### Módulos

- [ ] Portal do cliente avançado
- [ ] BI e relatórios configuráveis
- [ ] Integrações externas
- [ ] Automação assistida por IA
- [ ] Observabilidade e governança SaaS
- [ ] Arquitetura V1 enterprise

### Funcionalidades

- [ ] Portal com aceite, contestação, download de RGM, histórico de OS e visão de SLA
- [ ] Report builder com blocos configuráveis por contrato e templates de RGM
- [ ] Exportações CSV/PDF e API para ERPs, BI e financeiro
- [ ] Integração futura com NFS-e/faturamento quando medição estiver estável
- [ ] IA para rascunho de resumo executivo do RGM e triagem assistida de chamados, sempre com revisão humana
- [ ] Observabilidade com métricas de aplicação, auditoria, fila offline e erros por tenant
- [ ] Preparação de migração para backend modular, storage dedicado, filas e busca especializada

### Critérios de Done

- [ ] Cliente consegue acompanhar operação, aprovar entregas e baixar relatórios sem suporte interno
- [ ] RGM é gerado a partir de dados operacionais rastreáveis e pode ser configurado por contrato
- [ ] Integrações não quebram isolamento por tenant nem bypassam autorização
- [ ] IA não toma decisão automática sobre aprovação, glosa, SLA ou faturamento
- [ ] Produto suporta múltiplos contratos ativos com indicadores por tenant
- [ ] Decisão de migração enterprise é baseada em uso real, custo, performance e demanda comercial

---

## Referência de setup e migração

O cronograma original de 12 semanas e a estratégia de migração para V1 continuam documentados em [`docs/setup/ROADMAP.md`](setup/ROADMAP.md).
