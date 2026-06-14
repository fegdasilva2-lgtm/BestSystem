// View de Cronograma: gera OS a partir dos planos preventivos e mostra
// previsao por dia. Tudo offline (Dexie), com outbox enfileirando o POST.

import { state, saveState } from "../lib/state.js";
import { generateFromPlans } from "../lib/schedule-runner.js";
import { db } from "../lib/db.js";
import { toast } from "../lib/ui.js";

let _daysAhead = 30;
let _lastRun = null;
let _busy = false;

export function renderSchedule() {
  const dueCounts = countByDay(state.workOrders);
  return `
    <section class="panel">
      <p class="eyebrow">Cronograma</p>
      <h2>Gerar OS preventiva a partir dos planos</h2>
      <p class="muted">
        O motor le os planos importados (frequencia, duracao, asset) e gera uma OS
        para cada ocorrencia dentro do horizonte, respeitando capacidade diaria
        e dias uteis (feriados nacionais pulados).
      </p>
    </section>

    <section class="grid cols-3">
      <div class="panel">
        <p class="eyebrow">Planos ativos</p>
        <h2 id="schedulePlansCount">-</h2>
      </div>
      <div class="panel">
        <p class="eyebrow">Horizonte</p>
        <h2>${_daysAhead} dias</h2>
        <div class="dialog-actions">
          <button class="ghost-button" data-schedule-action="horizon" data-schedule-value="7" type="button">7d</button>
          <button class="ghost-button" data-schedule-action="horizon" data-schedule-value="15" type="button">15d</button>
          <button class="ghost-button" data-schedule-action="horizon" data-schedule-value="30" type="button">30d</button>
          <button class="ghost-button" data-schedule-action="horizon" data-schedule-value="60" type="button">60d</button>
        </div>
      </div>
      <div class="panel">
        <p class="eyebrow">Ultima geracao</p>
        <h2>${_lastRun?.at ?? "-"}</h2>
        <p class="muted">${_lastRun?.summary ?? "nenhuma ainda"}</p>
        <button class="primary-button" data-schedule-action="generate" type="button" ${_busy ? "disabled" : ""}>
          ${_busy ? "Gerando..." : "Gerar cronograma"}
        </button>
      </div>
    </section>

    <section class="panel">
      <p class="eyebrow">Previsao diaria</p>
      <h2>OS por dia (proximos ${_daysAhead} dias)</h2>
      <div style="overflow-x:auto">
        <table>
          <thead><tr><th>Dia</th><th>OS</th><th>Horas</th><th>Detalhes</th></tr></thead>
          <tbody>
            ${Object.entries(dueCounts).slice(0, _daysAhead).map(([day, items]) => `
              <tr>
                <td><strong>${day}</strong></td>
                <td>${items.length}</td>
                <td>${(items.reduce((s, o) => s + (o.duration_minutes ?? 60), 0) / 60).toFixed(1)}h</td>
                <td><small>${items.map(o => o.asset_id).join(", ")}</small></td>
              </tr>
            `).join("")}
            ${Object.keys(dueCounts).length === 0 ? `<tr><td colspan="4" class="muted">Nenhuma OS prevista. Importe planos preventivos ou gere o cronograma.</td></tr>` : ""}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function countByDay(workOrders) {
  const byDay = {};
  for (const wo of workOrders) {
    if (wo.status === "encerrada" || wo.status === "cancelada") continue;
    const key = (wo.due_at ?? wo.due ?? "").slice(0, 10);
    if (!key) continue;
    (byDay[key] ??= []).push(wo);
  }
  const sorted = Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce((acc, [k, v]) => { acc[k] = v; return acc; }, {});
  return sorted;
}

export async function wireSchedule() {
  // Atualiza contador de planos apos render
  const countEl = document.querySelector("#schedulePlansCount");
  if (countEl) {
    const n = await db.checklist_templates
      .where({ tenant_id: state.session.tenantId, active: true })
      .filter(t => t.frequency != null)
      .count();
    countEl.textContent = String(n);
  }

  const root = document.querySelector("#view");
  root.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-schedule-action]");
    if (!t) return;

    if (t.dataset.scheduleAction === "horizon") {
      _daysAhead = Number(t.dataset.scheduleValue);
      document.dispatchEvent(new CustomEvent("predialops:render"));
    }

    if (t.dataset.scheduleAction === "generate") {
      _busy = true;
      document.dispatchEvent(new CustomEvent("predialops:render"));
      try {
        const result = await generateFromPlans(state.session.tenantId, { daysAhead: _daysAhead });
        // Recarrega workOrders em memoria
        state.workOrders = await db.workOrders.toArray();
        await saveState();
        _lastRun = {
          at: new Date().toLocaleString("pt-BR"),
          summary: `${result.generated} geradas, ${result.rejected.length} rejeitadas`
        };
        toast(`Cronograma: ${result.generated} OS geradas, ${result.rejected.length} rejeitadas.`);
        if (result.rejected.length > 0) {
          console.warn("OS rejeitadas:", result.rejected);
        }
      } catch (err) {
        console.error(err);
        toast("Falha ao gerar cronograma.");
      } finally {
        _busy = false;
        document.dispatchEvent(new CustomEvent("predialops:render"));
      }
    }
  });
}
