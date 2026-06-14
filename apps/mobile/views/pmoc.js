// View de PMOC (Plano de Manutencao, Operacao e Controle) no PWA.
// Mostra planos vigentes, gera atividades a partir de ativos HVAC,
// registra execucoes e exibe alertas regulatorios.

import { state, saveState, newIdempotencyKey, appendAudit } from "../lib/state.js";
import { db } from "../lib/db.js";
import { gerarPmoc, gerarAlertas, calcularProximaExecucao, templateAtividadesHVAC } from "../lib/pmoc.js";
import { enqueue } from "../lib/state.js";
import { toast } from "../lib/ui.js";

let _planFormOpen = false;
let _execFormAssetId = null;
let _busy = false;

export function renderPmoc() {
  const pmocs = state.pmocs ?? [];
  const alerts = state.pmocAlerts ?? [];
  const executions = state.pmocExecutions ?? [];

  // Recalcula alertas para o PMOC ativo
  const activePlan = pmocs.find((p) => p.active) ?? pmocs[0];
  let liveAlerts = [];
  let liveCompliance = { total: 0, compliancePct: 0 };
  if (activePlan) {
    const acts = state.pmocActivities?.filter((a) => a.pmocPlanId === activePlan.id) ?? [];
    const exes = executions.filter((e) => e.pmocPlanId === activePlan.id);
    const result = gerarAlertas({ plan: activePlan, activities: acts, executions: exes });
    liveAlerts = result.alerts;
    liveCompliance = result.compliance;
  }

  return `
    <section class="panel">
      <p class="eyebrow">PMOC</p>
      <h1>Plano de Manutencao, Operacao e Controle</h1>
      <p class="muted">Lei 13.589/2018 - obrigatorio para sistemas de climatizacao. O PMOC e gerado a partir dos ativos HVAC de cada contrato e atualizado a cada execucao.</p>
    </section>

    <section class="grid cols-3">
      <div class="panel">
        <p class="eyebrow">Plano vigente</p>
        <h2>${activePlan?.code ?? "nenhum"}</h2>
        <p class="muted">${activePlan?.rt_name ?? "-"} - CREA ${activePlan?.rt_crea ?? "-"}</p>
        <p class="muted">ART ${activePlan?.art_number ?? "-"} (vigencia ${activePlan?.starts_on ?? "?"} a ${activePlan?.ends_on ?? "?"})</p>
      </div>
      <div class="panel">
        <p class="eyebrow">Compliance</p>
        <h2>${liveCompliance.compliancePct.toFixed(1)}%</h2>
        <p class="muted">${liveCompliance.conformes ?? 0} conformes / ${liveCompliance.total} atividades</p>
      </div>
      <div class="panel">
        <p class="eyebrow">Alertas regulatorios</p>
        <h2>${liveAlerts.length}</h2>
        <p class="muted">${liveAlerts.filter((a) => a.severity === "critica").length} criticos, ${liveAlerts.filter((a) => a.severity === "alta").length} altos</p>
      </div>
    </section>

    <section class="grid cols-2">
      <div class="panel">
        <div class="toolbar">
          <div>
            <p class="eyebrow">Planos</p>
            <h2>${pmocs.length} cadastrado(s)</h2>
          </div>
          <button class="primary-button" data-pmoc-action="new-plan" type="button">${_planFormOpen ? "Cancelar" : "Novo PMOC"}</button>
        </div>
        ${_planFormOpen ? renderPlanForm() : ""}
        <ul style="list-style:none; padding:0; margin:0">
          ${pmocs.map((p) => `
            <li class="profile-row">
              <span>
                <strong>${p.code}</strong>
                <small class="muted">${p.starts_on} a ${p.ends_on} - ${p.rt_name} (CREA ${p.rt_crea})</small>
              </span>
              <span class="status-pill">${p.active ? "ativo" : "inativo"}</span>
            </li>
          `).join("")}
          ${pmocs.length === 0 ? `<li class="muted">Nenhum PMOC cadastrado.</li>` : ""}
        </ul>
      </div>

      <div class="panel">
        <p class="eyebrow">Alertas abertos</p>
        <h2>${liveAlerts.length} pendente(s)</h2>
        <ul style="list-style:none; padding:0; margin:0; max-height:320px; overflow:auto">
          ${liveAlerts.map((a) => `
            <li class="profile-row">
              <span>
                <strong>${a.kind}</strong>
                <small class="muted">${a.message}</small>
              </span>
              <span class="status-pill ${a.severity === "critica" ? "danger-pill" : a.severity === "alta" ? "warn-pill" : ""}">${a.severity}</span>
            </li>
          `).join("")}
          ${liveAlerts.length === 0 ? `<li class="muted">Nenhum alerta.</li>` : ""}
        </ul>
      </div>
    </section>

    ${renderAssetHvacList()}
    ${renderExecutionsList(executions, activePlan)}
  `;
}

function renderPlanForm() {
  return `
    <form id="pmocPlanForm" data-pmoc-action="save-plan" class="form-grid" style="margin: 12px 0">
      <label class="field">
        <span>Codigo</span>
        <input name="code" required placeholder="PMOC-2026-001" />
      </label>
      <label class="field">
        <span>Contrato (id)</span>
        <input name="contractId" required value="${state.session.tenantId ? "" : ""}" placeholder="uuid do contrato" />
      </label>
      <label class="field">
        <span>Site (id)</span>
        <input name="siteId" required placeholder="uuid do site" />
      </label>
      <label class="field">
        <span>Inicio</span>
        <input name="startsOn" type="date" required />
      </label>
      <label class="field">
        <span>Termo</span>
        <input name="endsOn" type="date" required />
      </label>
      <label class="field">
        <span>RT (nome)</span>
        <input name="rtName" required placeholder="Eng. Joao Silva" />
      </label>
      <label class="field">
        <span>RT CREA</span>
        <input name="rtCrea" required placeholder="SP-12345/D" />
      </label>
      <label class="field full">
        <span>Numero da ART</span>
        <input name="artNumber" required placeholder="ART-2026-001" />
      </label>
      <div class="form-actions field full">
        <button class="primary-button" type="submit" ${_busy ? "disabled" : ""}>Salvar PMOC e gerar atividades dos HVAC</button>
      </div>
    </form>`;
}

function renderAssetHvacList() {
  const hvacAssets = state.assets.filter((a) => ["chiller", "ahu", "fancoil", "vrf", "vrv", "split", "rooftop", "coolingtower"].includes(a.type));
  return `
    <section class="panel">
      <p class="eyebrow">Ativos HVAC</p>
      <h2>${hvacAssets.length} ativo(s) cobertos</h2>
      <table>
        <thead><tr><th>Tag</th><th>Tipo</th><th>Local</th><th>Acoes</th></tr></thead>
        <tbody>
          ${hvacAssets.map((a) => `
            <tr>
              <td><strong>${a.code ?? a.id}</strong><br /><small>${a.name}</small></td>
              <td>${a.type}</td>
              <td>${a.hierarchy ?? "-"}</td>
              <td><button class="ghost-button" data-pmoc-action="new-exec" data-pmoc-asset="${a.id}" type="button">Registrar execucao</button></td>
            </tr>
          `).join("")}
          ${hvacAssets.length === 0 ? `<tr><td colspan="4" class="muted">Nenhum ativo HVAC cadastrado.</td></tr>` : ""}
        </tbody>
      </table>
    </section>`;
}

function renderExecutionsList(executions, plan) {
  return `
    <section class="panel">
      <p class="eyebrow">Execucoes</p>
      <h2>${executions.length} registro(s)</h2>
      ${_execFormAssetId ? renderExecForm(plan) : ""}
      <table>
        <thead><tr><th>Data</th><th>Ativo</th><th>Resultado</th><th>Proxima</th></tr></thead>
        <tbody>
          ${executions.slice(0, 20).map((e) => `
            <tr>
              <td>${e.executed_at?.slice(0, 10) ?? "-"}</td>
              <td>${e.assetId ?? "-"}</td>
              <td><span class="status-pill">${e.result}</span></td>
              <td>${e.next_due_at?.slice(0, 10) ?? "-"}</td>
            </tr>
          `).join("")}
          ${executions.length === 0 ? `<tr><td colspan="4" class="muted">Nenhuma execucao registrada.</td></tr>` : ""}
        </tbody>
      </table>
    </section>`;
}

function renderExecForm(plan) {
  return `
    <form id="pmocExecForm" data-pmoc-action="save-exec" class="form-grid" style="margin: 12px 0">
      <input type="hidden" name="assetId" value="${_execFormAssetId}" />
      <label class="field">
        <span>Data da execucao</span>
        <input name="executedAt" type="datetime-local" required value="${new Date().toISOString().slice(0, 16)}" />
      </label>
      <label class="field">
        <span>Resultado</span>
        <select name="result" required>
          <option value="conforme">Conforme</option>
          <option value="parcialmente_conforme">Parcialmente conforme</option>
          <option value="nao_conforme">Nao conforme</option>
        </select>
      </label>
      <label class="field full">
        <span>Observacoes</span>
        <textarea name="observations" rows="2" placeholder="Achados, anomalias, recomendacoes..."></textarea>
      </label>
      <label class="field">
        <span>Fotos vinculadas</span>
        <input name="photoCount" type="number" min="0" value="0" />
      </label>
      <label class="field full">
        <span>Leituras (JSON opcional)</span>
        <input name="readings" placeholder='{"temperatura": 22.5, "pressao": 1.2}' />
      </label>
      <div class="form-actions field full">
        <button type="button" class="ghost-button" data-pmoc-action="cancel-exec">Cancelar</button>
        <button type="submit" class="primary-button" ${_busy ? "disabled" : ""}>Registrar</button>
      </div>
    </form>`;
}

// =====================================================================
// Wiring
// =====================================================================

export function wirePmoc() {
  const root = document.querySelector("#view");
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-pmoc-action]");
    if (!t) return;
    const action = t.dataset.pmocAction;
    if (action === "new-plan") {
      _planFormOpen = !_planFormOpen;
      document.dispatchEvent(new CustomEvent("predialops:render"));
    } else if (action === "new-exec") {
      _execFormAssetId = t.dataset.pmocAsset;
      document.dispatchEvent(new CustomEvent("predialops:render"));
    } else if (action === "cancel-exec") {
      _execFormAssetId = null;
      document.dispatchEvent(new CustomEvent("predialops:render"));
    }
  });

  root.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-pmoc-action='save-plan'], [data-pmoc-action='save-exec']");
    if (!form) return;
    e.preventDefault();
    if (_busy) return;
    _busy = true;
    document.dispatchEvent(new CustomEvent("predialops:render"));
    try {
      const data = new FormData(form);
      if (form.dataset.pmocAction === "save-plan") {
        await savePlan(data);
        _planFormOpen = false;
      } else if (form.dataset.pmocAction === "save-exec") {
        await saveExecution(data);
        _execFormAssetId = null;
      }
    } catch (err) {
      console.error(err);
      toast("Erro: " + (err?.message ?? err));
    } finally {
      _busy = false;
      document.dispatchEvent(new CustomEvent("predialops:render"));
    }
  });
}

async function savePlan(form) {
  const plan = {
    id: `pmoc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: state.session.tenantId,
    contractId: String(form.get("contractId")),
    siteId: String(form.get("siteId")),
    code: String(form.get("code")),
    startsOn: String(form.get("startsOn")),
    endsOn: String(form.get("endsOn")),
    rtName: String(form.get("rtName")),
    rtCrea: String(form.get("rtCrea")),
    artNumber: String(form.get("artNumber")),
    version: 1,
    active: true,
    createdAt: new Date().toISOString()
  };
  await db.pmocs.put(plan);
  await enqueue({ type: "pmoc.create", payload: plan });
  await appendAudit({ tenantId: state.session.tenantId, user: "Gestor", action: `PMOC ${plan.code} criado (ART ${plan.artNumber})` });

  // Gera atividades a partir dos ativos HVAC do tenant
  const hvacAssets = state.assets.filter((a) => ["chiller", "ahu", "fancoil", "vrf", "vrv", "split", "rooftop", "coolingtower"].includes(a.type));
  const result = gerarPmoc({ plan, assets: hvacAssets });
  for (const act of result.activities) {
    await db.pmocActivities.put({ ...act, tenantId: state.session.tenantId });
    await enqueue({ type: "pmoc.activity.create", payload: act });
  }
  state.pmocs = await db.pmocs.toArray();
  state.pmocActivities = await db.pmocActivities.toArray();
  state.audit.unshift({ id: `aud-${Date.now()}`, tenantId: state.session.tenantId, at: "Agora", user: "Gestor", action: `PMOC ${plan.code} com ${result.activities.length} atividades` });
  toast(`PMOC ${plan.code} criado. ${result.activities.length} atividades geradas para ${result.summary.hvacAssetCount} ativos HVAC.`);
}

async function saveExecution(form) {
  const activePlan = state.pmocs?.find((p) => p.active) ?? state.pmocs?.[0];
  if (!activePlan) throw new Error("Cadastre um PMOC antes de registrar execucoes.");
  const assetId = String(form.get("assetId"));
  // Encontra a primeira atividade desse ativo dentro do PMOC
  const acts = state.pmocActivities?.filter((a) => a.pmocPlanId === activePlan.id && a.assetId === assetId) ?? [];
  if (acts.length === 0) {
    throw new Error("Nenhuma atividade PMOC cadastrada para este ativo. Cadastre o PMOC primeiro.");
  }
  const act = acts[0];
  const executedAt = new Date(String(form.get("executedAt"))).toISOString();
  const result = String(form.get("result"));
  const observations = String(form.get("observations") ?? "");
  const photoCount = Number(form.get("photoCount") ?? 0);
  const readingsRaw = String(form.get("readings") ?? "").trim();
  let readings = null;
  if (readingsRaw) {
    try { readings = JSON.parse(readingsRaw); }
    catch { throw new Error("readings invalido - nao parece JSON"); }
  }
  const nextDueAt = calcularProximaExecucao({ lastExecutedAt: executedAt, frequency: act.frequency });

  const record = {
    id: `pmoc-exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tenantId: state.session.tenantId,
    pmocPlanId: activePlan.id,
    pmocActivityId: act.id,
    assetId,
    executedAt,
    result,
    photoCount,
    readings,
    observations,
    nextDueAt,
    createdAt: new Date().toISOString()
  };
  await db.pmocExecutions.put(record);
  await enqueue({ type: "pmoc.execution.create", payload: record });
  await appendAudit({ tenantId: state.session.tenantId, user: "Tecnico", action: `Execucao PMOC ${act.code} (${result}) em ${assetId}` });
  state.pmocExecutions = await db.pmocExecutions.toArray();
  state.audit.unshift({ id: `aud-${Date.now()}`, tenantId: state.session.tenantId, at: "Agora", user: "Tecnico", action: `Execucao PMOC registrada` });
  toast(`Execucao PMOC registrada: ${result} - proxima em ${nextDueAt.slice(0, 10)}.`);
}
