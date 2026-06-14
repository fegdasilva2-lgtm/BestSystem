# PRD - PredialOps Facilities SaaS

## Visao

PredialOps e uma plataforma SaaS brasileira para manutencao predial, facilities e O&M. O produto une CMMS, EAM leve, gestao contratual, SLA, portal do cliente, portal do solicitante, execucao mobile offline-first, BI operacional e auditoria.

## ICP inicial

- Prestadores de facilities com contratos multi-cliente.
- Administradoras prediais e condominios corporativos.
- Varejo multiunidade, educacao, hospitais e industria leve.
- Operacoes que ainda dependem de planilhas, WhatsApp e evidencias soltas para medir contrato.

## Proposta de valor

O diferencial do MVP e conectar solicitacao, OS, checklist, evidencias, aceite, SLA e medicao em um fluxo unico. A plataforma deve reduzir perda de informacao em campo e dar ao cliente uma visao confiavel de SLA e faturamento.

## Escopo do MVP

- Multi-tenant conceitual com cliente, site, local e ativo.
- Ordens de servico corretivas, preventivas e inspecoes.
- Portal de solicitante para abertura de chamados.
- Portal do cliente com acompanhamento, aceite e medicao.
- Checklists com evidencias e versao.
- PWA offline-first para tecnico.
- Estoque basico com consumo por OS.
- Medicao basica por OS aprovada.
- Dashboard com SLA, backlog, MTTR, custo e aderencia preventiva.
- Auditoria para eventos criticos.

## Fora do MVP

- Fiscal/NF completo.
- Compra e cotacao completas.
- IoT real-time.
- IA preditiva.
- App nativo completo.
- Conectores profundos com todos os ERPs.

## Criterios de aceite

- Um solicitante abre chamado e ele aparece na triagem.
- Um planejador converte solicitacao em OS.
- Um tecnico salva checklist offline e sincroniza depois.
- Uma OS aprovada entra em medicao.
- O cliente aprova a medicao e a auditoria registra o evento.
- KPIs refletem OS, SLA, custo e backlog.

## Fase 1 iniciada - Fundacao SaaS

Entrega implementada no prototipo:

- Sessao simulada com troca de perfil e tenant.
- Cadastro conceitual de tenants, usuarios, clientes, sites e locais.
- Matriz RBAC inicial por perfil.
- Tela "Fundacao SaaS" com status de provisionamento.
- Refinamento visual para dashboard operacional denso.

Proxima evolucao da fase:

- Criar API real para sessao, tenants e usuarios.
- Persistir cadastros base no Postgres.
- Aplicar RLS/tenant_id no banco.
- Implementar testes de isolamento multi-tenant.
