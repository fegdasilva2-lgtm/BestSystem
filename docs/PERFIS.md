# Perfis de Acesso — PredialOps

O PredialOps possui **14 perfis** organizados em **4 lanes** de acesso. A autorização combina RBAC no frontend/backend com isolamento multi-tenant por RLS no Supabase.

## Visão geral

| Lane | Perfis | Responsabilidade |
|---|---:|---|
| Gestão | 3 | Administração do tenant, contratos, cadastros e governança |
| Operação | 5 | Planejamento, execução de OS, PMOC, campo e estoque |
| Backoffice | 3 | Comercial, financeiro, auditoria e medição |
| Cliente | 3 | Solicitações, aceite, acompanhamento e execução terceirizada |

| Perfil | Lane | Escopo principal | Tipo de acesso |
|---|---|---|---|
| `super_admin_saas` | Gestão | Plataforma inteira | Global, cross-tenant |
| `admin_org` | Gestão | Tenant da empresa | Administração total do tenant |
| `gestor_facilities` | Gestão | Operação do tenant | Gestão operacional |
| `planejador` | Operação | Planejamento | Escrita em PMOC e programação |
| `supervisor` | Operação | Execução supervisionada | Validação e aprovação operacional |
| `tecnico` | Operação | Campo | Execução de OS atribuídas |
| `auxiliar` | Operação | Apoio de campo | Atualização limitada |
| `almoxarife` | Operação | Estoque | Gestão de inventário |
| `comercial` | Backoffice | Contratos e relacionamento | Leitura comercial |
| `financeiro` | Backoffice | Medição e faturamento | Leitura e análise financeira |
| `auditor` | Backoffice | Conformidade | Leitura ampla |
| `cliente_gestor` | Cliente | Cliente contratante | Aprovação e acompanhamento |
| `solicitante` | Cliente | Usuário final do cliente | Abertura de solicitações |
| `fornecedor` | Cliente | Terceiro autorizado | Execução restrita |

---

## Lane 1 — Gestão

| Perfil | Descrição | Permissões | Rotas |
|---|---|---|---|
| `super_admin_saas` | Administrador da plataforma SaaS, sem vínculo obrigatório a um tenant. | Gerencia tenants, admins de tenant, parâmetros globais, auditoria cross-tenant e dados de qualquer organização. | `/admin`, `/admin/tenants`, `/setup`, `/admin/audit` |
| `admin_org` | Administrador interno da empresa, responsável pela configuração do tenant. | CRUD de usuários, clientes, contratos, sites, ativos, SLAs, regras de faturamento, OS, medições e RGM do tenant. | `/admin`, `/admin/customers`, `/admin/contracts`, `/admin/sites`, `/admin/assets`, `/admin/users`, `/admin/pmoc`, `/admin/rgm`, `/portal` |
| `gestor_facilities` | Responsável pela gestão operacional de facilities e reporte ao cliente. | Visualiza contratos, sites, ativos, OS, PMOC, medições e RGM; gera relatórios operacionais. | `/admin`, `/admin/contracts`, `/admin/sites`, `/admin/assets`, `/admin/pmoc`, `/admin/rgm`, `/portal` |

## Lane 2 — Operação

| Perfil | Descrição | Permissões | Rotas |
|---|---|---|---|
| `planejador` | Planeja manutenções preventivas, cronograma de OS e alocação de recursos. | Cria e edita planos preventivos, agenda OS, define periodicidades e visualiza histórico. | `/admin`, `/admin/contracts`, `/admin/pmoc`, `/admin/work-orders`, `/admin/rgm` |
| `supervisor` | Supervisiona execução em campo, valida OS concluídas e aprova medições operacionais. | Acompanha OS, valida conclusão, aprova/reprova medições e consulta PMOC. | `/admin`, `/admin/contracts`, `/admin/work-orders`, `/admin/measurements`, `/admin/pmoc` |
| `tecnico` | Executa manutenções em campo, principalmente via PWA offline. | Visualiza OS atribuídas, registra execução, evidências, medições de campo e sincronização offline. | `/apps/mobile`, `/admin/work-orders` |
| `auxiliar` | Apoia técnicos em atividades de campo, logística e organização. | Visualiza OS atribuídas, registra presença, anotações simples e atualização limitada de status. | `/apps/mobile` |
| `almoxarife` | Gerencia estoque de peças, ferramentas e materiais. | CRUD de itens, entradas, saídas, inventário, consumo por OS e alertas de reposição. | `/admin`, `/admin/inventory` |

## Lane 3 — Backoffice

| Perfil | Descrição | Permissões | Rotas |
|---|---|---|---|
| `comercial` | Acompanha contratos ativos, propostas e oportunidades sem interferir na operação. | Visualiza contratos, datas de renovação, portfólio e informações comerciais. | `/admin/contracts`, `/portal` |
| `financeiro` | Acompanha medições, valores faturados, glosas e inadimplência. | Visualiza contratos, medições aprovadas/faturadas, valores mensais e relatórios financeiros. | `/admin/contracts`, `/admin/measurements`, `/admin/rgm` |
| `auditor` | Audita conformidade de execução, PMOC, documentação e evidências. | Acesso somente leitura a OS, medições, evidências, PMOC, RGM e relatórios de auditoria. | `/admin`, `/admin/contracts`, `/admin/work-orders`, `/admin/measurements`, `/admin/pmoc`, `/admin/rgm` |

## Lane 4 — Cliente

| Perfil | Descrição | Permissões | Rotas |
|---|---|---|---|
| `cliente_gestor` | Administrador do lado do cliente e ponto focal de aceite. | Acessa portal, aprova/reprova medições, valida encerramento de OS, arquiva RGM e visualiza SLA. | `/portal` |
| `solicitante` | Funcionário do cliente que abre chamados e acompanha solicitações. | Abre solicitações, acompanha status, registra feedback e consulta histórico próprio. | `/portal/solicitations` |
| `fornecedor` | Terceiro autorizado que executa OS atribuídas e submete evidências. | Visualiza OS atribuídas ao fornecedor, registra execução, evidências, prazos e restrições. | `/portal/work-orders` |

---

## Ciclo de vida do perfil

| Etapa | Responsável | Resultado esperado |
|---|---|---|
| Convite ou criação | `super_admin_saas` ou `admin_org` | Usuário é criado no Auth e recebe registro em `users_profile`. |
| Vinculação ao tenant | `super_admin_saas` ou `admin_org` | Usuário recebe `tenant_id`, exceto casos globais de `super_admin_saas`. |
| Atribuição de perfil | `admin_org` dentro do tenant ou `super_admin_saas` globalmente | Campo `role` define lane, rotas e ações permitidas. |
| Ativação | `admin_org` ou automação de onboarding | Campo `active` passa a permitir uso operacional. |
| Mudança de perfil | `admin_org` ou `super_admin_saas` | Perfil é trocado conforme função real do usuário; permissões antigas deixam de valer no próximo login/token refresh. |
| Desativação | `admin_org` ou `super_admin_saas` | Usuário perde acesso sem apagar histórico operacional e auditoria. |

Regras importantes:

- Um usuário deve ter **um perfil ativo por tenant** para manter a autorização previsível.
- Trocas de perfil devem ser auditáveis, principalmente quando envolvem `admin_org`, `financeiro`, `supervisor` ou `cliente_gestor`.
- Rebaixar perfil deve revogar permissões imediatamente no backend, não apenas esconder menus.
- Histórico de OS, medições, glosas e aprovações deve preservar o autor original mesmo após mudança de perfil.

## Ruthlessness

Ruthlessness é a regra de menor privilégio aplicada sem exceções: o perfil só recebe a permissão necessária para cumprir sua função real. Permissão não é herdada por conveniência de interface.

### Hierarquia de permissões

| Nível | Perfis | Poder permitido |
|---:|---|---|
| 0 | `super_admin_saas` | Opera a plataforma inteira e pode atravessar tenants para suporte, auditoria e administração SaaS. |
| 1 | `admin_org` | Administra tudo dentro do próprio tenant, incluindo usuários, contratos e configurações. |
| 2 | `gestor_facilities` | Gerencia a operação do tenant, mas não deve administrar usuários nem parâmetros globais. |
| 3 | `supervisor`, `planejador` | Controlam planejamento, execução e validação operacional dentro do tenant. |
| 4 | `financeiro`, `auditor`, `comercial`, `almoxarife` | Acessam domínios específicos de backoffice, auditoria, contratos ou estoque. |
| 5 | `tecnico`, `auxiliar`, `fornecedor` | Atuam somente sobre trabalho atribuído ou escopo explicitamente autorizado. |
| 6 | `cliente_gestor`, `solicitante` | Acessam somente a visão do cliente, com aprovação limitada ao que pertence ao contrato. |

### Princípios de corte

- `super_admin_saas` é o único perfil cross-tenant.
- `admin_org` não deve acessar tenants de outras empresas.
- `gestor_facilities` pode gerir operação, mas não deve criar administradores.
- `supervisor` aprova execução; `financeiro` acompanha valor; `cliente_gestor` aceita entrega. Esses poderes não são equivalentes.
- `tecnico`, `auxiliar` e `fornecedor` nunca devem listar toda a base de contratos, ativos ou usuários.
- `solicitante` abre e acompanha chamados, mas não aprova medição, RGM ou faturamento.

---

## Rotas vs Perfis

Legenda: `A` Administra · `E` Edita/Executa · `V` Visualiza · `P` Aprova · `-` Sem acesso

| Rota | super_admin_saas | admin_org | gestor_facilities | planejador | supervisor | tecnico | auxiliar | almoxarife | comercial | financeiro | auditor | cliente_gestor | solicitante | fornecedor |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/setup` | A | - | - | - | - | - | - | - | - | - | - | - | - | - |
| `/admin` | A | A | V | V | V | - | - | V | - | - | V | - | - | - |
| `/admin/tenants` | A | - | - | - | - | - | - | - | - | - | - | - | - | - |
| `/admin/users` | A | A | - | - | - | - | - | - | - | - | V | - | - | - |
| `/admin/customers` | A | A | V | - | - | - | - | - | - | - | V | - | - | - |
| `/admin/contracts` | A | A | V | V | V | - | - | - | V | V | V | - | - | - |
| `/admin/contracts/new` | A | A | - | - | - | - | - | - | - | - | - | - | - | - |
| `/admin/sites` | A | A | V | V | V | - | - | - | - | - | V | - | - | - |
| `/admin/assets` | A | A | V | V | V | - | - | - | - | - | V | - | - | - |
| `/admin/assets/new` | A | A | - | - | - | - | - | - | - | - | - | - | - | - |
| `/admin/pmoc` | A | A | V | E | V | V | - | - | - | - | V | - | - | - |
| `/admin/work-orders` | A | A | V | E | P | E | E | - | - | - | V | - | - | - |
| `/admin/measurements` | A | A | V | V | P | E | - | - | - | V | V | - | - | - |
| `/admin/sla` | A | A | V | V | V | - | - | - | - | - | V | - | - | - |
| `/admin/rgm` | A | A | V | V | V | - | - | - | - | V | V | - | - | - |
| `/admin/reports` | A | A | V | V | V | - | - | - | V | V | V | - | - | - |
| `/admin/inventory` | A | A | V | - | - | - | - | E | - | - | V | - | - | - |
| `/admin/import` | A | A | - | - | - | - | - | - | - | - | - | - | - | - |
| `/apps/mobile` | - | - | - | - | V | E | E | - | - | - | - | - | - | E |
| `/portal` | A | V | V | - | - | - | - | - | V | - | - | P | V | V |
| `/portal/solicitations` | - | - | - | - | - | - | - | - | - | - | - | V | E | - |
| `/portal/work-orders` | - | - | - | - | - | - | - | - | - | - | - | V | V | E |

---

## Tabela resumo de permissões

| Perfil | Contratos | OS | Medições | Portal | PMOC | RGM | Estoque | Usuários |
|---|---|---|---|---|---|---|---|---|
| `super_admin_saas` | Total | Total | Total | Total | Total | Total | Total | Total |
| `admin_org` | Tenant | Tenant | Tenant | Tenant | Tenant | Tenant | Tenant | Tenant |
| `gestor_facilities` | Leitura | Leitura | Leitura | Sim | Leitura | Leitura | Leitura | Não |
| `planejador` | Leitura | Planeja | Leitura | Não | Edita | Leitura | Não | Não |
| `supervisor` | Leitura | Valida | Aprova | Não | Leitura | Leitura | Não | Não |
| `tecnico` | Não | Executa atribuídas | Campo | Não | Leitura | Não | Não | Não |
| `auxiliar` | Não | Apoio atribuído | Não | Não | Não | Não | Não | Não |
| `almoxarife` | Não | Não | Não | Não | Não | Não | Edita | Não |
| `comercial` | Leitura | Não | Não | Sim | Não | Não | Não | Não |
| `financeiro` | Leitura | Não | Financeiro | Não | Não | Leitura | Não | Não |
| `auditor` | Leitura | Leitura | Leitura | Não | Leitura | Leitura | Leitura | Não |
| `cliente_gestor` | Portal | Aprova | Aprova | Sim | Não | Leitura | Não | Não |
| `solicitante` | Não | Solicitações próprias | Não | Sim | Não | Não | Não | Não |
| `fornecedor` | Não | Executa atribuídas | Não | Sim | Não | Não | Não | Não |

---

Documento baseado nos perfis definidos em `apps/web/src/lib/auth.ts` e no escopo funcional do piloto. Atualizado em jun/2026.
