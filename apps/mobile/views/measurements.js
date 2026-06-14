// View de Medicao no PWA.
// Apura o periodo, aplica glosa, registra contestacao e concede aceite.
// Persiste no Supabase via outbox (criacao de measurement e items).
// Tudo imutavel apos aceite: a versao fica congelada.

import { state, saveState, newIdempotencyKey, appendAudit } from "../lib/state.js";
import { db } from "../lib/db.js";
import { apurar, aplicarGlosa, totalizar, criarContestacao, resolverContestacao, aceitarMedicao, calcularReajuste, canTransition } from "../lib/measurement.js";
import { enqueue } from "../lib/state.js";
import { toast, money, pct } from "../lib/ui.js";

let _period = currentPeriod();
let _contractId = null;
let _items = [];
let _glosaTarget = null;
let _contestOpen = null;
let _busy = false;

function currentPeriod() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function renderMeasurements() {
  // Seleciona o primeiro contrato se nenhum estiver ativo
  if (!_contractId) {
    _contractId = state.contracts[0]?.id ?? null;
  }

  const contracts = state.contracts;
  const contract = contracts.find((c) => c.id === _contractId);
  const approvedWOs = state.workOrders.filter((w) => w.contractId === _contractId && w.approved);

  // Re-apura sempre que o usuario troca de contrato ou periodo
  _items = contract
    ? apurar({ contract, workOrders: approvedWOs, postos: [], period: _period }).items
    : [];
  const totals = totalizar(_items);

  return `
    <section class="panel">
      <p class="eyebrow">Medicao contratual</p>
      <h2>Apuracao, glosa, contestacao e aceite</h2>
      <p class="muted">Itens aprovados no periodo + postos. Glosa preserva valor original. Apos aceite, a versao vira imutavel para fins de faturamento.</p>
    </section>

    <section class="grid cols-3">
      <div class="panel">
        <p class="eyebrow">Contrato</p>
        <select id="contractSel" data-meas-action="contract" style="width:100%; padding:6px">
          ${contracts.map(c => `<option value="${c.id}" ${c.id === _contractId ? "selected" : ""}>${c.id} - ${c.customer ?? c.scope ?? ""}</option>`).join("")}
        </select>
      </div>
      <div class="panel">
        <p class="eyebrow">Periodo</p>
        <input id="periodInput" type="month" value="${_period}" data-meas-action="period" style="width:100%; padding:6px" />
      </div>
      <div class="panel">
        <p class="eyebrow">Itens no periodo</p>
        <h2>${_items.length}</h2>
        <p class="muted">${approvedWOs.length} OS aprovada(s) em ${_period}</p>
      </div>
    </section>

    ${contract ? renderReajuste(contract) : ""}

    <section class="split">
      <div class="table-wrap">
        <div class="toolbar">
          <div>
            <p class="eyebrow">Itens apurados</p>
            <h2>Detalhamento</h2>
          </div>
        </div>
        <table>
          <thead><tr><th>Item</th><th>Bruto</th><th>Glosa</th><th>Liquido</th><th>Motivo</th><th>Acoes</th></tr></thead>
          <tbody>
            ${_items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td>${money(item.grossAmount)}</td>
                <td style="color: var(--color-clay)">${item.discountAmount > 0 ? "-" + money(item.discountAmount) : "-"}</td>
                <td><strong>${money(item.netAmount)}</strong></td>
                <td><small>${item.discountReason ?? "-"}</small></td>
                <td>
                  <button class="ghost-button" data-meas-action="glosa" data-meas-item="${item.id}" type="button">Aplicar glosa</button>
                </td>
              </tr>
            `).join("")}
            ${_items.length === 0 ? `<tr><td colspan="6" class="muted">Nenhum item aprovado no periodo.</td></tr>` : ""}
          </tbody>
          <tfoot>
            <tr><th>Total</th><th>${money(totals.gross)}</th><th>${money(totals.discount)}</th><th>${money(totals.net)}</th><th colspan="2"></th></tr>
          </tfoot>
        </table>
      </div>

      <div class="panel">
        <p class="eyebrow">Acoes do periodo</p>
        <h2>${money(totals.net)}</h2>
        <p class="muted">${pct(totals.gross ? (totals.discount / totals.gross) * 100 : 0)} de glosa sobre o bruto</p>
        <div class="dialog-actions">
          <button class="primary-button" data-meas-action="pre-send" type="button" ${_busy ? "disabled" : ""}>Pre-enviar ao cliente</button>
          <button class="ghost-button" data-meas-action="contestar" type="button">Registrar contestacao</button>
          <button class="ghost-button" data-meas-action="aceitar" type="button">Conceder aceite</button>
        </div>
      </div>
    </section>

    ${_glosaTarget ? renderGlosaDialog(_glosaTarget) : ""}
    ${_contestOpen ? renderContestDialog() : ""}
  `;
}

function renderReajuste(contract) {
  const r = calcularReajuste({ contract, referenceDate: new Date() });
  if (!r.applied) {
    return `
      <section class="panel">
        <p class="eyebrow">Reajuste contratual</p>
        <p class="muted">${escapeText(r.reason ?? "sem_reajuste")} - indice ${contract.indexName ?? "nao_definido"}</p>
      </section>`;
  }
  return `
    <section class="panel">
      <p class="eyebrow">Reajuste contratual</p>
      <h2>+${r.adjustmentPct}% - ${money(r.newMonthlyValue)}/mes</h2>
      <p class="muted">${escapeText(r.reason)}</p>
    </section>`;
}

function renderGlosaDialog(item) {
  return `
    <dialog open class="dialog">
      <form method="dialog" id="glosaForm" data-meas-action="glosa-submit" data-meas-item="${item.id}">
        <div class="dialog-head">
          <div>
            <p class="eyebrow">Glosa</p>
            <h2>Aplicar desconto em "${escapeText(item.description)}"</h2>
          </div>
          <button class="icon-button" data-meas-action="glosa-cancel" value="cancel" type="button">x</button>
        </div>
        <p class="muted">Bruto: ${money(item.grossAmount)} - Glosa atual: ${money(item.discountAmount)}</p>
        <label>Valor (R$)<input name="amount" type="number" min="0.01" step="0.01" required /></label>
        <label>Justificativa<textarea name="reason" required placeholder="Ex: OS fora de escopo, material nao autorizado, etc."></textarea></label>
        <div class="dialog-actions">
          <button class="ghost-button" data-meas-action="glosa-cancel" value="cancel" type="button">Cancelar</button>
          <button class="primary-button" value="default" type="submit">Aplicar</button>
        </div>
      </form>
    </dialog>`;
}

function renderContestDialog() {
  return `
    <dialog open class="dialog">
      <form method="dialog" id="contestForm" data-meas-action="contest-submit">
        <div class="dialog-head">
          <div>
            <p class="eyebrow">Contestacao do cliente</p>
            <h2>Registrar discordancia</h2>
          </div>
          <button class="icon-button" data-meas-action="contest-cancel" value="cancel" type="button">x</button>
        </div>
        <label>Valor contestado (R$)<input name="amount" type="number" min="0.01" step="0.01" required /></label>
        <label>Motivo<textarea name="reason" required placeholder="Ex: OS em duplicidade, item nao previsto..."></textarea></label>
        <div class="dialog-actions">
          <button class="ghost-button" data-meas-action="contest-cancel" value="cancel" type="button">Cancelar</button>
          <button class="primary-button" value="default" type="submit">Registrar</button>
        </div>
      </form>
    </dialog>`;
}

function escapeText(s) {
  return String(s ?? "").replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

// =====================================================================
// Wiring
// =====================================================================

export function wireMeasurements() {
  const root = document.querySelector("#view");
  root.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-meas-action]");
    if (!t) return;
    const action = t.dataset.measAction;

    if (action === "contract") {
      const sel = document.querySelector("#contractSel");
      if (sel) {
        _contractId = sel.value;
        _items = [];
        document.dispatchEvent(new CustomEvent("predialops:render"));
      }
      return;
    }
    if (action === "period") {
      const inp = document.querySelector("#periodInput");
      if (inp) {
        _period = inp.value;
        _items = [];
        document.dispatchEvent(new CustomEvent("predialops:render"));
      }
      return;
    }
    if (action === "glosa") {
      const itemId = t.dataset.measItem;
      _glosaTarget = _items.find((i) => i.id === itemId) ?? null;
      document.dispatchEvent(new CustomEvent("predialops:render"));
      return;
    }
    if (action === "glosa-cancel") {
      _glosaTarget = null;
      document.dispatchEvent(new CustomEvent("predialops:render"));
      return;
    }
    if (action === "contestar") {
      _contestOpen = { period: _period, contractId: _contractId };
      document.dispatchEvent(new CustomEvent("predialops:render"));
      return;
    }
    if (action === "contest-cancel") {
      _contestOpen = null;
      document.dispatchEvent(new CustomEvent("predialops:render"));
      return;
    }
    if (action === "pre-send") {
      await preEnviar();
      return;
    }
    if (action === "aceitar") {
      await aceitar();
      return;
    }
  });

  // Form submits (delegated)
  root.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-meas-action='glosa-submit'], [data-meas-action='contest-submit']");
    if (!form) return;
    e.preventDefault();
    const data = new FormData(form);
    _busy = true;
    document.dispatchEvent(new CustomEvent("predialops:render"));
    try {
      if (form.dataset.measAction === "glosa-submit") {
        const itemId = form.dataset.measItem;
        const amount = Number(data.get("amount"));
        const reason = String(data.get("reason"));
        _items = aplicarGlosa({
          items: _items,
          itemId,
          amount,
          reason,
          appliedBy: "gestor@local"
        });
        _glosaTarget = null;
        toast(`Glosa de ${money(amount)} aplicada.`);
      } else if (form.dataset.measAction === "contest-submit") {
        const c = criarContestacao({
          measurementId: `med-${_contractId}-${_period}`,
          amount: Number(data.get("amount")),
          reason: String(data.get("reason")),
          raisedBy: "cliente@local"
        });
        await persistContestacao(c);
        _contestOpen = null;
        toast(`Contestacao registrada: ${money(c.amount)}`);
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

async function preEnviar() {
  _busy = true;
  document.dispatchEvent(new CustomEvent("predialops:render"));
  try {
    const totals = totalizar(_items);
    const measurementId = `med-${_contractId}-${_period}`;
    const record = {
      id: measurementId,
      tenantId: state.session.tenantId,
      contractId: _contractId,
      period: _period,
      status: "pre_enviada",
      grossAmount: totals.gross,
      discountAmount: totals.discount,
      netAmount: totals.net,
      items: _items,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await db.measurements.put(record);
    await enqueue({ type: "measurement.create", payload: record });
    await appendAudit({ tenantId: state.session.tenantId, user: "Gestor", action: `Medicao ${measurementId} pre-enviada (${money(totals.net)})` });
    state.measurements = await db.measurements.toArray();
    state.audit.unshift({ id: `aud-${Date.now()}`, tenantId: state.session.tenantId, at: "Agora", user: "Gestor", action: `Medicao ${measurementId} pre-enviada` });
    toast("Pre-medicao enviada ao cliente (aguarde aceite).");
  } catch (err) {
    console.error(err);
    toast("Erro ao pre-enviar.");
  } finally {
    _busy = false;
    document.dispatchEvent(new CustomEvent("predialops:render"));
  }
}

async function aceitar() {
  if (!confirm("Conceder aceite formal? A medicao ficara imutavel para fins de faturamento.")) return;
  _busy = true;
  document.dispatchEvent(new CustomEvent("predialops:render"));
  try {
    const measurementId = `med-${_contractId}-${_period}`;
    const contestacoes = await db.table("contestacoes")?.where({ measurementId }).toArray?.() ?? [];
    const result = aceitarMedicao({
      measurementId,
      approvedBy: "cliente@local",
      contestacoes
    });
    if (result.pendingContestacoes.length > 0) {
      if (!confirm(`Existem ${result.pendingContestacoes.length} contestacao(oes) pendente(s). Aceitar mesmo assim?`)) {
        _busy = false;
        document.dispatchEvent(new CustomEvent("predialops:render"));
        return;
      }
    }
    const current = await db.measurements.get(measurementId);
    if (!current) throw new Error("pre-medicao nao encontrada - pre-envie primeiro");
    const accepted = {
      ...current,
      status: "aprovada",
      approvedAt: result.approvedAt,
      approvedBy: result.approvedBy,
      version: (current.version ?? 1) + 1
    };
    await db.measurements.put(accepted);
    await enqueue({ type: "measurement.approve", payload: accepted });
    await appendAudit({ tenantId: state.session.tenantId, user: "Cliente", action: `Medicao ${measurementId} aprovada (${money(current.netAmount)})` });
    state.measurements = await db.measurements.toArray();
    state.audit.unshift({ id: `aud-${Date.now()}`, tenantId: state.session.tenantId, at: "Agora", user: "Cliente", action: `Medicao ${measurementId} aprovada` });
    toast("Aceite registrado. Medicao imutavel.");
  } catch (err) {
    console.error(err);
    toast("Erro: " + (err?.message ?? err));
  } finally {
    _busy = false;
    document.dispatchEvent(new CustomEvent("predialops:render"));
  }
}

async function persistContestacao(c) {
  // Garante o store contestacoes (adicionado no seed mental; aqui usamos tabela dinamica)
  if (!db.contestacoes) {
    // Lazy-add
    db.version(3).stores({ contestacoes: "id, measurementId, status" });
    await db.open();
  }
  await db.contestacoes.put(c);
  await enqueue({ type: "measurement.contest", payload: c });
  await appendAudit({ tenantId: state.session.tenantId, user: "Cliente", action: `Contestacao ${c.id} (${money(c.amount)}) aberta` });
  state.audit.unshift({ id: `aud-${Date.now()}`, tenantId: state.session.tenantId, at: "Agora", user: "Cliente", action: `Contestacao ${c.id} aberta` });
}
