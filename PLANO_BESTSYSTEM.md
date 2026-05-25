# BestSystem - Plano de Gestão de Pessoas e Controle de Ordens de Serviço

**Repositório:** BestSystem  
**Integração:** Auvo API v2  
**Data:** 2026-05-25  
**Autor:** Nia (Assistente Virtual)  
**Dono:** Francisco Ederson Silva  

---

## 1. Sumário Executivo

Este documento apresenta um plano completo para desenvolvimento de um sistema de gestão de pessoas e controle de ordens de serviço (OS), denominado **BestSystem**, com integração nativa à plataforma [Auvo](https://www.auvo.com.br/).

O Auvo é um software consolidado no mercado brasileiro de gestão de equipes externas, processando mais de 660.000 ordens de serviço por mês em mais de 8.000 empresas. A integração com o Auvo permitirá sincronização automática de dados de técnicos, clientes, serviços e ordens de trabalho.

### 1.1 Escopo Principal

- **Gestão de Pessoas:** Cadastro de funcionários, controle de turnos, permissões e desempenho
- **Controle de OS:** Abertura, acompanhamento, workflow de status e conclusão de ordens de serviço
- **Integração Auvo:** Sincronização bidirecional de dados via API REST v2
- **Dashboard:** Visão consolidada de métricas e indicadores operacionais
- **Módulo Financeiro:** Faturamento, controle de recebíveis e despesas

### 1.2 Diferencial Competitivo

Ao conectar um sistema interno de gestão de pessoas a um ERP especializado em	field service (Auvo), a empresa obtém:
- Visão unificada de operações de campo e recursos humanos
- Redução de retrabalho com dados sincronizados automaticamente
- Relatórios consolidados de produtividade e financeiro

---

## 2. Análise do Auvo - API v2

### 2.1 Visão Geral da API

| Aspecto | Detalhe |
|---------|---------|
| **Versão** | v2 |
| **Base URL** | `https://api.auvo.com.br/v2` |
| **Formato** | REST / JSON |
| **Autenticação** | Bearer Token (apiKey + apiToken) |
| **Validade do token** | 30 minutos |
| **Rate Limit** | 400 req/min |
| **Limite de página** | 100 itens |
| **Documentação** | [auvoapiv2.docs.apiary.io](https://auvoapiv2.docs.apiary.io/) |

### 2.2 Entidades Principais

| Recurso | Operações | Relevância |
|---------|-----------|------------|
| **Users** | CRUD completo | Técnicos e equipe |
| **Tasks** | CRUD + Anexos | Ordens de serviço |
| **Customers** | CRUD (cpfCnpj) | Clientes конечних |
| **Teams** | List, Participantes | Agrupamento de técnicos |
| **Equipments** | CRUD + Anexos | Equipamentos por cliente |
| **Products** | CRUD + Stock | Peças e materiais |
| **Services** | CRUD | Tipos de serviço |
| **Invoices** | CRUD + List | Faturamento |
| **Quotations** | CRUD + Itens | Orçamentos |
| **Receivables** | CRUD + List | Contas a receber |
| **Expenses** | CRUD + Anexos | Despesas |
| **Tickets** | CRUD | Chamados e requisições |
| **WebHooks** | Add, List, Delete | Eventos em tempo real |

### 2.3 Status de Tarefas (Tasks)

```
1 = Opened        (Aberta)
2 = InDisplacement (Em deslocamento)
3 = CheckedIn     (Check-in realizado)
4 = CheckedOut    (Check-out realizado)
5 = Finished      (Finalizada)
6 = Paused        (Pausada)
```

### 2.4 Integração WebHook Sugerida

Configurar webhooks para as seguintes entidades:

| Entidade | Ação | Trigger |
|----------|------|---------|
| Task (4) | Inclusão (1) | Nova OS criada |
| Task (4) | Alteração (2) | OS atualizada |
| User (1) | Alteração (2) | Dados técnico atualizados |
| Customer (7) | Inclusão (1) | Novo cliente cadastrado |

### 2.5 Autenticação Auvo

```python
# Passo 1: Obter token
POST https://api.auvo.com.br/v2/login
Body: { "apiKey": "...", "apiToken": "..." }

# Passo 2: Usar token em todas as requisições
Authorization: Bearer <authorization_token>
```

**Credenciais:** Menu > Integração em [app.auvo.com.br/integracao](https://app.auvo.com.br/integracao)

---

## 3. Arquitetura do Sistema

### 3.1 Stack Tecnológica

| Camada | Tecnologia Sugerida |
|--------|-------------------|
| **Backend** | Node.js + Fastify (ou Python + FastAPI) |
| **Banco de Dados** | PostgreSQL (Supabase) |
| **Frontend** | React + TypeScript (web) / React Native (mobile) |
| **Autenticação** | JWT + OAuth2 |
| **Integração Auvo** | Cliente REST personalizado |
| **Hospedagem** | Vercel (frontend) + Railway/Supabase (backend) |
| **Versionamento** | GitHub (este repositório) |

### 3.2 Diagrama de Arquitetura

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API    │────▶│  PostgreSQL     │
│   (React/Web)   │     │   (Fastify)      │     │  (Supabase)     │
└────────┬────────┘     └────────┬─────────┘     └─────────────────┘
         │                       │
         │                       ▼
         │              ┌──────────────────┐
         │              │  Auvo API v2     │
         │              │  (api.auvo.com.br)│
         │              └──────────────────┘
         │
         ▼
┌─────────────────┐
│   Mobile App   │
│  (React Native)│
└─────────────────┘
```

### 3.3 Modelo de Dados Principal

```
users (Funcionários)
  ├── id (UUID, PK)
  ├── name, email, phone
  ├── role (admin, manager, technician)
  ├── auvo_user_id (FK opcional)
  ├── team_id (FK)
  └── created_at, updated_at

teams (Equipes)
  ├── id (UUID, PK)
  ├── name, leader_id (FK → users)
  └── created_at

customers (Clientes)
  ├── id (UUID, PK)
  ├── name, cpfCnpj, email, phone
  ├── address, lat, long
  ├── auvo_customer_id (FK opcional)
  └── created_at

service_orders (Ordens de Serviço)
  ├── id (UUID, PK)
  ├── title, description
  ├── status (1-6, similar Auvo)
  ├── customer_id (FK)
  ├── technician_id (FK → users)
  ├── scheduled_date, completed_date
  ├── auvo_task_id (FK opcional)
  ├── priority (low, medium, high)
  └── created_at, updated_at

products (Produtos/Peças)
  ├── id (UUID, PK)
  ├── name, sku, price
  ├── stock_quantity
  └── auvo_product_id (FK opcional)

invoices (Faturas)
  ├── id (UUID, PK)
  ├── service_order_id (FK)
  ├── total_value
  ├── status (pending, paid, overdue)
  ├── due_date
  └── auvo_invoice_id (FK opcional)

integrations_logs (Log de Sincronização)
  ├── id (UUID, PK)
  ├── entity_type, entity_id
  ├── action (sync, webhook_received)
  ├── auvo_id
  ├── status (success, failed)
  ├── error_message
  └── created_at
```

---

## 4. Funcionalidades por Módulo

### 4.1 Módulo de Gestão de Pessoas

| Funcionalidade | Descrição |
|---------------|-----------|
| **Cadastro de Funcionários** | CRUD completo com foto, documentos, contato |
| **Controle de Turnos** | Registro de entrada/saída, horas extras |
| **Permissões (RBAC)** | Roles: Admin, Gestor, Técnico — permissões granulares |
| **Avaliação de Desempenho** | KPIs: OS concluídas, NPS, tempo médio de atendimento |
| **Gestão de Equipes** | Agrupamento por equipe, liderança |
| **Sincronização Auvo** | Importar técnicos do Auvo via API |

### 4.2 Módulo de Ordens de Serviço

| Funcionalidade | Descrição |
|---------------|-----------|
| **Abertura de OS** | Formulário com cliente, técnico, descrição, prioridade |
| **Workflow de Status** | Status 1-6 (conforme Auvo), transições validadas |
| **Acompanhamento em Tempo Real** | Mapa com posição dos técnicos, status OS |
| **Check-in/Check-out** | Registro de horário de chegada/saída |
| **Fotos e Anexos** | Evidências fotográficas, documentos |
| **Histórico de OS** | Timeline completa de cada OS |
| **Importação do Auvo** | Sincronizar OS existentes do Auvo |
| **Exportação para Auvo** | Criar/atualizar OS no Auvo |

### 4.3 Módulo Financeiro

| Funcionalidade | Descrição |
|---------------|-----------|
| **Faturamento** | Gerar faturas a partir de OS concluídas |
| **Contas a Receber** | Status de recebíveis, alertas de vencimento |
| **Despesas** | Registro de despesas por OS ou funcionário |
| **Relatórios Financeiros** | Faturamento por período, ticket médio |
| **Integração Auvo** | Sincronizar invoices e receivables |

### 4.4 Dashboard e Relatórios

| Relatório | Descrição |
|-----------|-----------|
| **Volume de OS** | Por período, técnico, equipe |
| **Taxa de Conclusão** | % OS finalizadas vs abandonadas |
| **Tempo Médio** | Abertura → conclusão |
| **NPS** | Satisfação do cliente (pesquisa Auvo) |
| **Produtividade** | OS/técnico/dia, revenue/técnico |
| **Mapa de Calor** | Geolocalização das OS atendidas |

### 4.5 Módulo de Integração Auvo

| Recurso | Operação API Auvo | Direção |
|---------|-----------------|---------|
| Usuários | GET /users, POST /users | Bidirecional |
| Tarefas/OS | GET /tasks, POST /tasks, PATCH /tasks | Bidirecional |
| Clientes | GET /customers, POST /customers | Bidirecional |
| Equipamentos | GET /equipments, POST /equipments | Bidirecional |
| Faturas | GET /invoices, POST /invoices | Sincronizar para BestSystem |
| WebHooks | POST /webhooks (registrar) | Auvo → BestSystem |

---

## 5. Plano de Implementação

### Fase 1: Foundation (Semanas 1-4)

**Semana 1-2: Setup e Autenticação**
- [ ] Setup projeto: repositório GitHub, ambiente dev
- [ ] Configurar PostgreSQL (Supabase)
- [ ] Implementar autenticação JWT
- [ ] Configurar cliente Auvo API (conexão + retry)
- [ ] Setup CI/CD (GitHub Actions)

**Semana 3-4: Gestão de Pessoas Core**
- [ ] CRUD de usuários (sem sincronização Auvo ainda)
- [ ] Sistema de roles e permissões
- [ ] CRUD de equipes
- [ ] Interface de gestão de pessoas

### Fase 2: Integração Auvo (Semanas 5-8)

**Semana 5-6: Sincronização Inicial**
- [ ] Implementar cliente Auvo completo (todos os endpoints)
- [ ] Importar usuários existentes do Auvo
- [ ] Importar clientes existentes do Auvo
- [ ] Log de sincronização (tabela integrations_logs)

**Semana 7-8: OS e Workflow**
- [ ] CRUD de OS integrado com Auvo
- [ ] Sincronização bidirecional OS
- [ ] Webhook handler (receber eventos Auvo)
- [ ] Status workflow (1-6 Auvo)

### Fase 3: Módulo Financeiro (Semanas 9-12)

**Semana 9-10: Financeiro Core**
- [ ] CRUD de faturas
- [ ] Importar invoices do Auvo
- [ ] Gestão de recebíveis

**Semana 11-12: Despesas e Relatórios**
- [ ] CRUD de despesas
- [ ] Dashboard de métricas
- [ ] Relatórios financeiros

### Fase 4: Mobile e Otimização (Semanas 13-16)

**Semana 13-14: Mobile**
- [ ] App React Native (iOS + Android)
- [ ] Lista de OS do técnico
- [ ] Check-in/Check-out via GPS

**Semana 15-16: Polimento**
- [ ] Notificações push
- [ ] Otimização de performance
- [ ] Testes E2E
- [ ] Documentação final

---

## 6. Diagrama de Fluxo - Sincronização Auvo

```
                    BestSystem                    Auvo API
                   ┌─────────────┐              ┌──────────┐
                   │             │              │          │
  ┌───────────┐    │ Importar    │─────────────▶│  Users   │
  │   Admin   │───▶│ Técnicos   │  GET /users  │          │
  └───────────┘    └─────────────┘              └──────────┘
       │                  ▲
       │                  │ Webhook (alteração)
       ▼                  │
  ┌───────────┐    ┌──────┴──────────┐
  │    OS     │◀──▶│  Sync Engine     │
  │  Workflow │    │  (integrações)  │
  └───────────┘    └─────────────────┘
       │                  │
       ▼                  ▼
  ┌───────────┐    ┌──────────┐
  │ Dashboard │    │  Tasks  │
  └───────────┘    └──────────┘
```

---

## 7. Requisitos Técnicos

### 7.1 Ambiente

- Node.js 20+ ou Python 3.11+
- PostgreSQL 15+ (Supabase oferece free tier)
- Redis (para cache e filas — opcional)
- GitHub Actions para CI/CD

### 7.2 Segurança

- HTTPS obrigatório em todas as conexões
- JWT com expiração de 24h (refresh token separado)
- Armazenamento de credenciais Auvo em variáveis ambiente
- Logs de auditoria para operações críticas
- Validação de inputs (sanitização)

### 7.3 Performance

- Conexões API Auvo: retry com exponential backoff
- Rate limit: respectar 400 req/min (configurar throttle no cliente)
- Cache local: cachear dados de clientes/técnicos por 15 min
- Webhooks: processar de forma assíncrona (fila)

### 7.4 Monitoramento

- Logs centralizados (erros, requisições Auvo)
- Health check endpoint
- Alertas para falhas de sincronização
- Métricas de uso (opcional: Sentry, DataDog)

---

## 8. Configuração de Integração Auvo

### 8.1 Variáveis de Ambiente

```bash
# .env (NÃO commitar)
AUVO_API_KEY=your_api_key_here
AUVO_API_TOKEN=your_api_token_here
AUVO_BASE_URL=https://api.auvo.com.br/v2

# BestSystem
DATABASE_URL=postgresql://user:pass@host:5432/bestsystem
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=24h
```

### 8.2 Rotas de Integração Sugeridas

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auvo/connect` | Testar conexão Auvo |
| POST | `/api/auvo/sync/users` | Sincronizar usuários |
| POST | `/api/auvo/sync/customers` | Sincronizar clientes |
| POST | `/api/auvo/sync/tasks` | Sincronizar OS |
| POST | `/api/auvo/webhook` | Endpoint para webhooks |
| GET | `/api/auvo/status` | Status da integração |

### 8.3 Mapeamento de Status

| BestSystem Status | Auvo Status | Descrição |
|------------------|-------------|-----------|
| `open` | 1 | Aberta |
| `displacement` | 2 | Em deslocamento |
| `checked_in` | 3 | Check-in realizado |
| `checked_out` | 4 | Check-out realizado |
| `finished` | 5 | Finalizada |
| `paused` | 6 | Pausada |

---

## 9. Glossário

| Termo | Definição |
|-------|-----------|
| **Auvo** | Plataforma de gestão de equipes externas (www.auvo.com.br) |
| **OS** | Ordem de Serviço |
| **RBAC** | Role-Based Access Control |
| **Webhook** | Notificação HTTP push (event-driven) |
| **Task** | Tarefa/OS na terminologia Auvo |
| **API Key/Token** | Credenciais de autenticação Auvo |

---

## 10. Próximos Passos

1. **Confirmar credenciais Auvo** — Obtaining apiKey e apiToken no painel Auvo
2. **Criar projeto base** — Setup do repositório com estrutura inicial
3. **Configurar ambiente** — Variáveis de ambiente, banco Supabase
4. **Implementar cliente Auvo** — Classe de comunicação com API
5. **Desenvolvimento incremental** — Seguindo fases do plano

---

## 11. Recursos

- [Documentação Auvo API v2](https://auvoapiv2.docs.apiary.io/)
- [Auvo Website](https://www.auvo.com/)
- [Supabase PostgreSQL](https://supabase.com/)
- [Fastify Framework](https://fastify.dev/)