# Perfis de Acesso — PredialOps

O PredialOps possui **14 perfis** organizados em **4 lanes** de acesso. Cada perfil tem permissões específicas, visualizações dedicadas e isolamento garantido por RLS no banco de dados.

---

## Visão geral das lanes

| Lane | Perfis | Descrição |
|---|---|---|
| **Gestão** | 3 | Administra tenant, contratos, cadastros e governança |
| **Operação** | 5 | Planeja, supervisiona e executa OS, PMOC, estoque e campo |
| **Backoffice** | 3 | Comercial, financeiro, auditoria e medição |
| **Cliente** | 3 | Cliente abre chamados, aprova entregas e fornecedores |

---

## Lane 1 — Gestão

### `super_admin_saas` — Super admin SaaS

**Descrição:** Administrador da plataforma SaaS. Acesso irrestrito a todos os tenants, sem vínculo a um tenant específico.

**Permissões:**
- Visualizar e gerenciar todos os tenants
- Criar/remover admins de tenant
- Acessar dados de qualquer organização
- Configurar parâmetros globais da plataforma
- Visualizar auditoria cross-tenant

**Rotas acessíveis:** `/admin`, `/admin/tenants`, `/setup`, `/admin/audit`

**Lane:** Gestão

---

### `admin_org` — Administrador da empresa

**Descrição:** Administrador interno da empresa (ex: IMC Facilities). Gerencia usuários, cadastros e configuração do tenant.

**Permissões:**
- CRUD completo em usuários do tenant
- CRUD em clientes, contratos, sites e ativos do tenant
- Configurar SLAs e regras de faturamento
- Visualizar todas as OS, medições e RGM do tenant
- Acessar portal do cliente

**Rotas acessíveis:** `/admin`, `/admin/customers`, `/admin/contracts`, `/admin/sites`, `/admin/assets`, `/admin/users`, `/admin/pmoc`, `/admin/rgm`, `/portal`

**Lane:** Gestão

---

### `gestor_facilities` — Gestor de facilities

**Descrição:** Profissional responsável pela gestão operacional de facilities. Acompanha execução, analiza métricas e reporta ao cliente.

**Permissões:**
- Visualizar todos os contratos, sites e ativos do tenant
- Acompanhar execução de OS e PMOC
- Analisar medições e RGM
- Gerar relatórios operacionais
- Acessar portal do cliente

**Rotas acessíveis:** `/admin`, `/admin/contracts`, `/admin/sites`, `/admin/assets`, `/admin/pmoc`, `/admin/rgm`, `/portal`

**Lane:** Gestão

---

## Lane 2 — Operação

### `planejador` — Planejador

**Descrição:** Responsável pelo planejamento de manutenções preventivas, cronograma de OS e alocação de recursos.

**Permissões:**
- Criar e editar planos preventivos (PMOC)
- Planejar cronograma de OS
- Definir periodicidade de medições
- Alocar técnicos e recursos
- Visualizar histórico de manutenções

**Rotas acessíveis:** `/admin`, `/admin/contracts`, `/admin/pmoc`, `/admin/work-orders`, `/admin/rgm`

**Lane:** Operação

---

### `supervisor` — Supervisor

**Descrição:** Supervisiona a execução em campo, valida OS concluídas eaprova medições enviadas pelo time técnico.

**Permissões:**
- Acompanhar OS em execução
- Validar conclusão de OS (técnico → validação)
- Aprovar/reprovar medições
- Visualizar PMOC e preventivo
- Gerenciar equipe (leitura)

**Rotas acessíveis:** `/admin`, `/admin/contracts`, `/admin/work-orders`, `/admin/measurements`, `/admin/pmoc`

**Lane:** Operação

---

### `tecnico` — Técnico

**Descrição:** Executa manutenções em campo. Opera principalmente na PWA mobile offline. Registra evidências e concluí OS.

**Permissões:**
- Visualizar OS atribuídas
- Registrar execução e evidências (fotos)
- Marcar OS como concluída
- Registrar medições de campo
- Sincronizar dados offline

**Rotas acessíveis (PWA mobile):** `/apps/mobile`, `/admin/work-orders` (leitura)

**Lane:** Operação

---

### `auxiliar` — Auxiliar

**Descrição:** Apoia o técnico em atividades de campo, transporte de peças e organização de infraestrutura.

**Permissões:**
- Visualizar OS atribuídas (leitura)
- Registrar presença e简单 anotações
- Atualizar status de execução

**Rotas acessíveis (PWA mobile):** `/apps/mobile`

**Lane:** Operação

---

### `almoxarife` — Almoxarife

**Descrição:** Gerencia estoque de peças, ferramentas e materiais. Controla entradas, saídas e inventário.

**Permissões:**
- CRUD em itens de estoque
- Registrar entradas e saídas
- Controlar inventário
- Visualizar consumo por OS
- Alertas de reposição

**Rotas acessíveis:** `/admin`, `/admin/inventory`

**Lane:** Operação

---

## Lane 3 — Backoffice

### `comercial` — Comercial

**Descrição:** Time comercial que acompanha propostas, contratos ativos e oportunidades. Não interfere na operação.

**Permissões:**
- Visualizar contratos e renewal dates
- Acompanhar propostas comerciais
- Visualizar портфолио de contratos
- Acessar portal do cliente

**Rotas acessíveis:** `/admin/contracts`, `/portal`

**Lane:** Backoffice

---

### `financeiro` — Financeiro

**Descrição:** Acompanha medições, valores faturados e inadimplência. Foca em контрол финансовый.

**Permissões:**
- Visualizar medições aprovadas e faturadas
- Acompanhar valores a receber
- Visualizar contratos e valores mensais
- Exportar relatórios financeiros

**Rotas acessíveis:** `/admin/contracts`, `/admin/measurements`, `/admin/rgm`

**Lane:** Backoffice

---

### `auditor` — Auditor

**Descrição:** Profissional que auditaconformidade deexecação, PMOC e documentção. Acesso apenas leitura para investigar.

**Permissões:**
- Visualizar todas as OS, medições e evidências
- Auditar PMOC e planos preventivos
- Visualizar RGM arquivados
- Gerar relatórios de auditoria
- Acesso read-only a todos os módulos

**Rotas acessíveis:** `/admin`, `/admin/contracts`, `/admin/work-orders`, `/admin/measurements`, `/admin/pmoc`, `/admin/rgm`

**Lane:** Backoffice

---

## Lane 4 — Cliente

### `cliente_gestor` — Gestor do cliente

**Descrição:** Administrador do lado do cliente. Aprova entregas, medientes e relatórios. Ponto focal da operação.

**Permissões:**
- Acessar portal do cliente
- Aprovar/reprovar medições
- Validar encerramento de OS
- Arquivar RGM
- Visualizar contratos e SLA

**Rotas acessíveis:** `/portal`

**Lane:** Cliente

---

### `solicitante` — Solicitante

**Descrição:** Funcionário do cliente que abre chamados de manutenção, solicita serviços e acompanha andamento.

**Permissões:**
- Abrir chamados/solicitações
- Acompanhar status de OS
- Registrar feedbacks
- Visualizar histórico de solicitações

**Rotas acessíveis:** `/portal/solicitations`

**Lane:** Cliente

---

### `fornecedor` — Fornecedor

**Descrição:** Fornecedor autorizado que acessa OS de subcontracted, registra execução e submete evidências.

**Permissões:**
- Visualizar OS atribuídas ao fornecedor
- Registrar execução e evidências
- Submeter para aprovação
- Comunicar prazos e constraints

**Rotas acessíveis:** `/portal/work-orders`

**Lane:** Cliente

---

## Tabela resumo de permissões

| Perfil | CRUD contratos | CRUD OS | CRUD medições | Portal | PMOC | RGM | Estoque | Admin users |
|---|---|---|---|---|---|---|---|---|
| `super_admin_saas` | ✅ Todos | ✅ Todos | ✅ Todos | ✅ | ✅ | ✅ | ✅ | ✅ |
| `admin_org` | ✅ Tenant | ✅ Tenant | ✅ Tenant | ✅ | ✅ | ✅ | ✅ | ✅ |
| `gestor_facilities` | 👁️ | 👁️ | 👁️ | ✅ | 👁️ | 👁️ | 👁️ | ❌ |
| `planejador` | 👁️ | ✏️ Plan | 👁️ | ❌ | ✏️ | 👁️ | ❌ | ❌ |
| `supervisor` | 👁️ | ✅ Valid | ✅ Approve | ❌ | 👁️ | 👁️ | ❌ | ❌ |
| `tecnico` | ❌ | ✏️ Exec | ✏️ Field | ❌ | 👁️ | ❌ | ❌ | ❌ |
| `auxiliar` | ❌ | 👁️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| `almoxarife` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `comercial` | 👁️ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `financeiro` | 👁️ | ❌ | 👁️ Finance | ❌ | ❌ | 👁️ | ❌ | ❌ |
| `auditor` | 👁️ | 👁️ | 👁️ | ❌ | 👁️ | 👁️ | ❌ | ❌ |
| `cliente_gestor` | 👁️ | ✅ Approve | ✅ Approve | ✅ | ❌ | 👁️ | ❌ | ❌ |
| `solicitante` | ❌ | 👁️ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `fornecedor` | ❌ | 👁️ Own | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

**Legenda:** ✅ Acesso total · 👁️ Leitura · ✏️ Edição limitada · ❌ Sem acesso

---

*Documento gerado a partir de `apps/web/src/lib/auth.ts` — atualizado em jun/2026.*
