// Roteamento e renderizacao das 9 views do PWA.
// Lendo do `state` importado de lib/state.js, que por sua vez reflete o Dexie.

import { state } from "../lib/state.js";
import { money, pct, statusLabel, priorityLabel, calcKpis } from "../lib/ui.js";
import { runAction } from "../lib/actions.js";
import { renderImport, wireImport } from "./import.js";
import { renderSchedule, wireSchedule } from "./schedule.js";
import { renderExecution, wireExecution } from "./execution.js";

export const views = [
  ["dashboard",    "Central",                ""],
  ["foundation",   "Fundacao SaaS",          "F1"],
  ["orders",       "Ordens de servico",      () => state.workOrders.length],
  ["execution",    "Execucao OS",            "F5"],
  ["assets",       "Ativos",                 () => state.assets.length],
  ["schedule",     "Cronograma",             ""],
  ["import",       "Importar",               ""],
  ["contracts",    "Contratos e SLA",        () => state.contracts.length],
  ["measurements", "Medicoes",               ""],
  ["mobile",       "Mobile offline",         ""],
  ["portals",      "Portais",                ""],
  ["security",     "LGPD e auditoria",       ""]
];

export const titleByView = {
  dashboard:    "Central de Operacao",
  foundation:   "Fundacao SaaS",
  orders:       "Ordens de Servico",
  execution:    "Execucao de OS em Campo",
  assets:       "Ativos e Locais",
  schedule:     "Cronograma Preventivo",
  import:       "Importar Ativos e Planos",
  contracts:    "Contratos, SLA e Escopo",
  measurements: "Medicao Contratual",
  mobile:       "Execucao Mobile Offline",
  portals:      "Portais do Cliente e Solicitante",
  security:     "Seguranca, LGPD e Auditoria"
};

function currentTenant() { return state.tenants.find(t => t.id === state.session.tenantId) || state.tenants[0]; }
function currentUser()   { return state.users.find(u => u.id === state.session.userId)   || state.users[0]; }
function rolePermissions(role) { return state.rbac[role] || []; }

export function render() {
  document.querySelector("#viewTitle").textContent = titleByView[state.activeView] || "";
  renderSessionControls();
  renderNav();
  const view = document.querySelector("#view");
  view.innerHTML = {
    dashboard:    renderDashboard,
    foundation:   renderFoundation,
    orders:       renderOrders,
    execution:    renderExecution,
    assets:       renderAssets,
    schedule:     renderSchedule,
    import:       renderImport,
    contracts:    renderContracts,
    measurements: renderMeasurements,
    mobile:       renderMobile,
    portals:      renderPortals,
    security:     renderSecurity
  }[state.activeView]();
  wireViewActions();
  if (state.activeView === "import")    wireImport();
  if (state.activeView === "schedule")  wireSchedule();
  if (state.activeView === "execution") wireExecution();
}

function renderSessionControls() {
  const tenant = currentTenant();
  const user = currentUser();
  const tCard = document.querySelector("#tenantCard");
  if (tCard) {
    tCard.innerHTML = `
      <span>Tenant ativo</span>
      <strong>${tenant?.name ?? "-"}</strong>
      <small>${tenant?.sites ?? 0} sites, ${(tenant?.assets ?? 0).toLocaleString("pt-BR")} ativos - ${tenant?.plan ?? ""}</small>`;
  }
  const uSel = document.querySelector("#userSelect");
  if (uSel) {
    uSel.innerHTML = state.users
      .map(u => `<option value="${u.id}" ${u.id === user.id ? "selected" : ""}>${u.name} - ${u.role}</option>`)
      .join("");
  }
  const tSel = document.querySelector("#tenantSelect");
  if (tSel) {
    tSel.innerHTML = state.tenants
      .map(t => `<option value="${t.id}" ${t.id === tenant.id ? "selected" : ""}>${t.name}</option>`)
      .join("");
  }
}

function renderNav() {
  const nav = document.querySelector("#nav");
  if (!nav) return;
  nav.innerHTML = views
    .map(([id, label, count]) => {
      const value = typeof count === "function" ? count() : count;
      return `
        <button type="button" data-view="${id}" aria-current="${state.activeView === id ? "page" : "false"}">
          <span>${label}</span>
          ${value !== "" ? `<span class="count">${value}</span>` : ""}
        </button>`;
    })
    .join("");
}

function wireViewActions() {
  const root = document.querySelector("#view");
  root.querySelectorAll("[data-view-target]").forEach((btn) => {
    btn.addEventListener("click", () => { state.activeView = btn.dataset.viewTarget; render(); });
  });
  root.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => { state.activeFilter = btn.dataset.filter; render(); });
  });
  root.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => runAction(btn.dataset.action, btn));
  });
}

function metric(label, value, delta, kind) {
  return `<div class="metric ${kind ?? ""}">
    <span>${label}</span>
    <strong>${value}</strong>
    <span class="delta">${delta}</span>
  </div>`;
}

function ordersTable(orders) {
  return `
    <table>
      <thead><tr>
        <th>OS</th><th>Ativo/local</th><th>Contrato</th>
        <th>SLA</th><th>Status</th><th>Responsavel</th><th>Custo</th>
      </tr></thead>
      <tbody>
        ${orders.map(o => `
          <tr>
            <td><strong>${o.id}</strong><br><small>${o.type}</small></td>
            <td>${o.asset}<br><small>${o.location}</small></td>
            <td>${o.customer}<br><small>${o.contractItem ?? "-"}</small></td>
            <td><span class="priority ${o.priority}">${priorityLabel(o.priority)}</span><br><small>${o.due}</small></td>
            <td><span class="status ${o.status}">${statusLabel(o.status)}</span></td>
            <td>${o.technician}</td>
            <td>${money(o.cost)}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

function renderDashboard() {
  const kpis = calcKpis(state.workOrders);
  const tenant = currentTenant();
  const user = currentUser();
  return `
    <section class="ops-hero">
      <div>
        <p class="eyebrow">Fase 1 em execucao</p>
        <h2>Fundacao SaaS ativa para ${tenant.name}</h2>
        <p>Usuario atual: <strong>${user.name}</strong> - ${user.role}. Dados persistidos em IndexedDB (Dexie); sincronizacao com Supabase quando online.</p>
      </div>
      <button class="primary-button" data-view-target="foundation" type="button">Ver fundacao</button>
    </section>
    <section class="grid cols-4">
      ${metric("SLA cumprido", pct(kpis.compliance), "+4,2 p.p. vs. semana", "")}
      ${metric("Backlog aberto", pct(kpis.backlog), "2 OS criticas", "warn")}
      ${metric("MTTR medio", `${kpis.mttr.toFixed(1).replace(".", ",")}h`, "meta: 6h", "")}
      ${metric("Custo em OS", money(kpis.cost), "periodo atual", "")}
    </section>
    <section class="split">
      <div class="table-wrap">
        <div class="toolbar">
          <div><p class="eyebrow">Fila operacional</p><h2>Ordens que exigem atencao</h2></div>
          <button class="ghost-button" data-view-target="orders" type="button">Ver todas</button>
        </div>
        ${ordersTable(state.workOrders.slice(0, 4))}
      </div>
      <div class="panel">
        <p class="eyebrow">Indicadores contratuais</p>
        <h2>Saude por cliente</h2>
        <div class="kpi-list">
          ${state.contracts.map(c => `
            <div class="kpi">
              <div>
                <strong>${c.customer}</strong>
                <div class="bar"><span style="width:${c.compliance}%"></span></div>
              </div>
              <span>${c.compliance}%</span>
            </div>`).join("")}
        </div>
      </div>
    </section>
    <section class="grid cols-3">
      <div class="panel">
        <p class="eyebrow">Contrato</p><h2>Medicao pronta</h2>
        <p class="muted">2 OS aprovadas ja podem compor medicao do periodo, com evidencias e custos apropriados.</p>
        <button class="primary-button" data-view-target="measurements" type="button">Abrir medicao</button>
      </div>
      <div class="panel">
        <p class="eyebrow">Campo</p><h2>Fila offline</h2>
        <p class="muted">Sincronizacao via outbox + Background Sync; tudo continua funcionando sem rede.</p>
        <button class="ghost-button" data-view-target="mobile" type="button">Ver mobile</button>
      </div>
      <div class="panel">
        <p class="eyebrow">Auditoria</p><h2>Trilha critica</h2>
        <p class="muted">Mutacoes criticas sao gravadas em audit_logs (imutavel) e replicadas no IndexedDB local.</p>
        <button class="ghost-button" data-view-target="security" type="button">Ver auditoria</button>
      </div>
    </section>`;
}

function renderFoundation() {
  const done = Object.values(state.onboarding).filter(Boolean).length;
  const total = Object.values(state.onboarding).length;
  const user = currentUser();
  const permissions = rolePermissions(user.role);
  return `
    <section class="foundation-board">
      <div class="panel foundation-lead">
        <p class="eyebrow">Fase 1 - Auth, Tenant, RBAC, Cadastros, Design System</p>
        <h2>Base SaaS pronta para sair do prototipo estatico</h2>
        <p class="muted">Sessao, isolamento de tenant, matriz de permissao, dados mestre e padrao visual operacional.</p>
        <div class="progress-rail"><span style="width:${(done / total) * 100}%"></span></div>
        <strong>${done}/${total} blocos de fundacao demonstrados</strong>
      </div>
      <div class="panel">
        <p class="eyebrow">Sessao atual</p>
        <h2>${user.name}</h2>
        <p class="muted">${user.email}</p>
        <span class="chip hot">${user.role}</span>
        <div class="permission-cloud">${permissions.map(p => `<span class="chip">${p}</span>`).join("")}</div>
      </div>
    </section>
    <section class="grid cols-3">
      ${state.tenants.map(t => `
        <div class="tenant-tile ${t.id === state.session.tenantId ? "active" : ""}">
          <p class="eyebrow">${t.status}</p>
          <h2>${t.name}</h2>
          <div class="tenant-numbers">
            <span><strong>${t.sites}</strong> sites</span>
            <span><strong>${(t.assets ?? 0).toLocaleString("pt-BR")}</strong> ativos</span>
            <span><strong>${t.plan}</strong> plano</span>
          </div>
          <button class="ghost-button" data-action="switch-tenant" data-tenant-id="${t.id}" type="button">Ativar tenant</button>
        </div>`).join("")}
    </section>
    <section class="split">
      <div class="table-wrap">
        <div class="toolbar">
          <div><p class="eyebrow">RBAC</p><h2>Matriz de permissao por perfil</h2></div>
        </div>
        <table>
          <thead><tr><th>Perfil</th><th>Permissoes</th><th>Escopo</th></tr></thead>
          <tbody>
            ${Object.entries(state.rbac).map(([role, items]) => `
              <tr>
                <td><strong>${role}</strong></td>
                <td>${items.map(i => `<span class="chip">${i}</span>`).join(" ")}</td>
                <td><small>tenant + cliente/site quando aplicavel</small></td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <div class="panel">
        <p class="eyebrow">Cadastros base</p><h2>Dados mestre do piloto</h2>
        ${catalogBlock("Clientes", state.baseCatalog.customers)}
        ${catalogBlock("Sites", state.baseCatalog.sites)}
        ${catalogBlock("Locais", state.baseCatalog.locations)}
        <button class="primary-button" data-action="add-base-record" type="button">Adicionar local piloto</button>
      </div>
    </section>
    <section class="timeline">
      <div class="toolbar">
        <div><p class="eyebrow">Provisionamento</p><h2>Checklist tecnico da fase</h2></div>
      </div>
      ${state.provisioning.map(p => `
        <div class="event">
          <strong>${p.status}</strong>
          <span><b>${p.step}</b><br><small>${p.detail}</small></span>
        </div>`).join("")}
    </section>`;
}

function catalogBlock(title, items) {
  return `<div class="catalog-block"><strong>${title}</strong>
    <div>${items.map(i => `<span class="chip">${i}</span>`).join("")}</div>
  </div>`;
}

function renderOrders() {
  const filters = [
    ["all", "Todas"], ["open", "Abertas"], ["progress", "Em execucao"],
    ["done", "Concluidas"], ["measure", "Em medicao"]
  ];
  const orders = state.activeFilter === "all"
    ? state.workOrders
    : state.workOrders.filter(o => o.status === state.activeFilter);
  return `
    <section class="table-wrap">
      <div class="toolbar">
        <div><p class="eyebrow">CMMS operacional</p><h2>Lista unica de OS com SLA, contrato e responsavel</h2></div>
        <div class="filters">
          ${filters.map(([id, label]) => `<button class="${state.activeFilter === id ? "active" : ""}" data-filter="${id}" type="button">${label}</button>`).join("")}
        </div>
      </div>
      ${ordersTable(orders)}
    </section>
    <section class="grid cols-3">
      <div class="panel"><p class="eyebrow">Regra aplicada</p><h2>SLA por calendario contratual</h2>
        <p class="muted">A prioridade e o contrato definem prazo. Atrasos alimentam dashboard, auditoria e medicao.</p></div>
      <div class="panel"><p class="eyebrow">Qualidade</p><h2>Checklist versionado</h2>
        <p class="muted">Mudancas em templates criam nova versao para preservar evidencias de OS antigas.</p></div>
      <div class="panel"><p class="eyebrow">Acao rapida</p><h2>Converter chamado</h2>
        <p class="muted">${state.requests.filter(r => r.status === "triagem").length} solicitacao em triagem pode virar OS corretiva.</p>
        <button class="primary-button" data-action="triage-request" type="button">Converter primeira</button>
      </div>
    </section>`;
}

function renderAssets() {
  return `
    <section class="split">
      <div class="panel">
        <p class="eyebrow">EAM leve</p>
        <h2>Hierarquia de locais e ativos</h2>
        <div class="toolbar">
          <button class="ghost-button" data-view-target="import" type="button">Importar Excel/CSV</button>
          <button class="primary-button" data-view-target="schedule" type="button">Gerar cronograma</button>
        </div>
        <div class="asset-tree">
          ${state.assets.map(a => `
            <div class="asset-row">
              <div>
                <strong>${a.name}</strong>
                <div class="muted">${a.hierarchy}</div>
                <small>${a.id} - Criticidade ${a.criticality}</small>
              </div>
              <div>
                <strong>${pct(a.availability)}</strong>
                <div class="muted">Disponibilidade</div>
              </div>
              <div class="qr" title="QR code do ativo"></div>
            </div>`).join("")}
        </div>
      </div>
      <div class="panel">
        <p class="eyebrow">Ciclo de vida</p><h2>Custos e confiabilidade</h2>
        <div class="kpi-list">
          ${state.assets.map(a => `
            <div class="kpi">
              <div>
                <strong>${a.name}</strong>
                <p class="muted">MTBF ${a.mtbf} - custo acumulado ${money(a.cost)}</p>
              </div>
              <span>${a.criticality}</span>
            </div>`).join("")}
        </div>
      </div>
    </section>`;
}

function renderContracts() {
  return `
    <section class="table-wrap">
      <div class="toolbar">
        <div><p class="eyebrow">Contract Ops</p><h2>Contratos, escopo e politica de SLA</h2></div>
      </div>
      <table>
        <thead><tr><th>Contrato</th><th>Cliente</th><th>Escopo</th><th>SLA</th><th>Medicao</th><th>Valor mensal</th><th>Saude</th></tr></thead>
        <tbody>
          ${state.contracts.map(c => `
            <tr>
              <td><strong>${c.id}</strong></td>
              <td>${c.customer}</td>
              <td>${c.scope}</td>
              <td>${c.sla}</td>
              <td>${c.measurement}</td>
              <td>${money(c.value)}</td>
              <td>${c.compliance}%</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </section>
    <section class="grid cols-3">
      <div class="panel"><h2>Penalidades</h2><p class="muted">Glosas e multas calculadas a partir de SLA, aceite e regra do item contratual.</p></div>
      <div class="panel"><h2>Calendario</h2><p class="muted">Cada contrato suporta horarios operacionais, feriados, janelas e prioridades.</p></div>
      <div class="panel"><h2>Escopo</h2><p class="muted">OS fora de escopo seguem fluxo de aprovacao antes da execucao ou faturamento.</p></div>
    </section>`;
}

function renderMeasurements() {
  const eligible = state.workOrders.filter(o => o.approved);
  const total = eligible.reduce((s, o) => s + o.cost, 0);
  const discount = Math.round(total * 0.06);
  return `
    <section class="split">
      <div class="table-wrap">
        <div class="toolbar">
          <div><p class="eyebrow">Periodo 04/2026</p><h2>OS elegiveis para medicao</h2></div>
          <button class="primary-button" data-action="approve-measurement" type="button">Aprovar medicao</button>
        </div>
        ${ordersTable(eligible)}
      </div>
      <div class="panel">
        <p class="eyebrow">Resumo financeiro</p><h2>Previa de faturamento</h2>
        <div class="kpi-list">
          <div class="kpi"><span>Valor bruto</span><strong>${money(total)}</strong></div>
          <div class="kpi"><span>Glosa simulada</span><strong>${money(discount)}</strong></div>
          <div class="kpi"><span>Valor liquido</span><strong>${money(total - discount)}</strong></div>
        </div>
        <p class="muted">A medicao preserva valor original, glosa, justificativa, aceite e evidencias por OS.</p>
      </div>
    </section>`;
}

function renderMobile() {
  const job = state.workOrders.find(o => o.status === "open") || state.workOrders[0];
  return `
    <section class="split">
      <div class="mobile-frame" aria-label="Simulacao do app mobile">
        <div class="mobile-screen">
          <p class="eyebrow">Tecnico - Offline pronto</p>
          <h2>Minhas OS</h2>
          <div class="mobile-job">
            <strong>${job.id} - ${job.asset}</strong>
            <p class="muted">${job.location}</p>
            <span class="priority ${job.priority}">${priorityLabel(job.priority)}</span>
          </div>
          <h3>Checklist de execucao</h3>
          <div class="checklist">
            ${job.checklist.map((item, i) => `<label class="checkline"><input type="checkbox" ${i < 2 ? "checked" : ""}> ${item}</label>`).join("")}
          </div>
          <button class="primary-button" data-action="save-offline" type="button" style="width:100%; margin-top:14px;">Salvar offline</button>
        </div>
      </div>
      <div class="panel">
        <p class="eyebrow">Sincronizacao</p><h2>Fila local do tecnico</h2>
        <p class="muted">Operacoes enfileiradas no Dexie ate a reconexao; envio idempotente ao Supabase.</p>
      </div>
    </section>`;
}

function renderPortals() {
  return `
    <section class="grid cols-2">
      <div class="panel">
        <p class="eyebrow">Portal do solicitante</p>
        <h2>Abertura rapida por local, QR ou categoria</h2>
        <p class="muted">Fluxo curto para usuarios prediais: identificar local, anexar foto, acompanhar status e avaliar atendimento.</p>
        <button class="primary-button" data-action="new-request" type="button">Abrir chamado</button>
      </div>
      <div class="panel">
        <p class="eyebrow">Portal do cliente</p>
        <h2>SLA, aceite, medicao e documentos</h2>
        <p class="muted">Cliente gestor acompanha OS, aprova medicao, baixa evidencias e visualiza indicadores contratuais.</p>
        <button class="ghost-button" data-view-target="measurements" type="button">Acessar medicao</button>
      </div>
    </section>
    <section class="table-wrap">
      <div class="toolbar">
        <div><p class="eyebrow">Solicitacoes recentes</p><h2>Chamados antes da triagem</h2></div>
      </div>
      <table>
        <thead><tr><th>ID</th><th>Solicitante</th><th>Local</th><th>Categoria</th><th>Status</th><th>Criado em</th></tr></thead>
        <tbody>
          ${state.requests.map(r => `
            <tr>
              <td><strong>${r.id}</strong></td>
              <td>${r.requester}</td>
              <td>${r.location}<br><small>${r.description}</small></td>
              <td>${r.category}</td>
              <td>${r.status}</td>
              <td>${r.createdAt}</td>
            </tr>`).join("")}
        </tbody>
      </table>
    </section>`;
}

function renderSecurity() {
  return `
    <section class="grid cols-3">
      <div class="panel"><p class="eyebrow">Isolamento</p><h2>Tenant + escopo</h2><p class="muted">Todas as entidades carregam tenant_id e escopos por cliente, site, contrato e equipe. RLS garante defesa em profundidade.</p></div>
      <div class="panel"><p class="eyebrow">LGPD</p><h2>Retencao e finalidade</h2><p class="muted">Dados pessoais associados a finalidade, exportacao e anonimizacao por tenant.</p></div>
      <div class="panel"><p class="eyebrow">Auditoria</p><h2>Antes/depois</h2><p class="muted">audit_logs append-only; mutacoes bloqueadas por trigger no Postgres.</p></div>
    </section>
    <section class="timeline">
      <div class="toolbar">
        <div><p class="eyebrow">Audit log</p><h2>Eventos recentes</h2></div>
      </div>
      ${state.audit.map(a => `
        <div class="event">
          <strong>${a.at}</strong>
          <span>${a.user}: ${a.action}</span>
        </div>`).join("")}
    </section>`;
}

// Re-renderiza quando uma acao emite o evento custom
document.addEventListener("predialops:render", () => render());
