// Wizard de importacao em 3 passos: tipo -> upload -> preview/confirm.
// Renderizado dentro do shell do PWA mobile.

import { state } from "../lib/state.js";
import { parseFile, validateAtivos, validatePlanos, commitAtivos, commitPlanos, downloadModel } from "../lib/importer.js";
import { toast } from "../lib/ui.js";
import { db } from "../lib/db.js";

let _step = 1;
let _kind = "ativos";
let _rows = [];
let _report = { valid: [], rejected: [] };
let _busy = false;
let _lastImport = null;  // { kind, ids: [], createdAt } para undo

export function renderImport() {
  return `
    <section class="panel">
      <p class="eyebrow">Importacao em massa</p>
      <h2>Ativos e planos via Excel/CSV</h2>
      <p class="muted">Fluxo: escolha o tipo, baixe o modelo, faca upload, revise e confirme. Linhas invalidas sao listadas e NAO impedem o envio das validas.</p>
    </section>

    <section class="panel">
      <ol class="stepper">
        <li class="${_step >= 1 ? "active" : ""}">1. Tipo</li>
        <li class="${_step >= 2 ? "active" : ""}">2. Arquivo</li>
        <li class="${_step >= 3 ? "active" : ""}">3. Revisar e confirmar</li>
        <li class="${_step >= 4 ? "active" : ""}">4. Concluido</li>
      </ol>
    </section>

    ${_step === 1 ? stepKind() : ""}
    ${_step === 2 ? stepUpload() : ""}
    ${_step === 3 ? stepReview() : ""}
    ${_step === 4 ? stepDone() : ""}
  `;
}

function stepKind() {
  return `
    <section class="grid cols-2">
      <div class="panel ${_kind === "ativos" ? "active" : ""}">
        <h2>Ativos</h2>
        <p class="muted">Cadastro inicial: code, name, location_path, criticality. Locations e sites sao criados sob demanda.</p>
        <button class="primary-button" data-import-kind="ativos" type="button">Escolher ativos</button>
      </div>
      <div class="panel ${_kind === "planos" ? "active" : ""}">
        <h2>Planos preventivos</h2>
        <p class="muted">Vincula a um asset_code ja cadastrado. Cria checklist template versionado.</p>
        <button class="primary-button" data-import-kind="planos" type="button">Escolher planos</button>
      </div>
    </section>
    <section class="panel">
      <p class="muted">Dica: baixe o modelo antes de preencher para evitar erros de coluna.</p>
      <button class="ghost-button" data-import-action="model" type="button">Baixar modelo de ${_kind}</button>
    </section>
  `;
}

function stepUpload() {
  return `
    <section class="panel">
      <p class="eyebrow">${_kind}</p>
      <h2>Suba o arquivo preenchido</h2>
      <input type="file" id="importFile" accept=".csv,.xlsx,.xls" />
      <p class="muted">Formatos suportados: CSV (UTF-8) e XLSX. Tamanho max: 5 MB.</p>
      <div class="dialog-actions">
        <button class="ghost-button" data-import-action="back" type="button">Voltar</button>
        <button class="primary-button" data-import-action="parse" type="button">Processar</button>
      </div>
    </section>
  `;
}

function stepReview() {
  const total = _rows.length;
  const ok = _report.valid.length;
  const bad = _report.rejected.length;
  return `
    <section class="panel">
      <p class="eyebrow">Revisao</p>
      <h2>${ok} de ${total} linhas validas</h2>
      ${bad > 0 ? `<p class="muted" style="color: var(--color-clay)">${bad} linha(s) rejeitada(s) serao descartadas. Corrija no arquivo de origem e reimporte se necessario.</p>` : `<p class="muted">Todas as linhas passaram na validacao.</p>`}
    </section>
    <section class="split">
      <div class="table-wrap">
        <div class="toolbar"><h2>Preview (validas)</h2></div>
        <table>
          <thead>${previewHead()}</thead>
          <tbody>${_report.valid.slice(0, 20).map(previewRow).join("")}</tbody>
        </table>
        ${_report.valid.length > 20 ? `<p class="muted">Exibindo 20 de ${_report.valid.length} linhas validas.</p>` : ""}
      </div>
      <div class="panel">
        <h2>Rejeitadas</h2>
        ${bad === 0 ? `<p class="muted">Nenhuma.</p>` : `
          <table>
            <thead><tr><th>Linha</th><th>Erro</th><th>Conteudo bruto</th></tr></thead>
            <tbody>
              ${_report.rejected.map((r) => `
                <tr>
                  <td>${r.row}</td>
                  <td style="color: var(--color-clay)">${r.errors.join("; ")}</td>
                  <td><code style="font-size:11px">${escapeHtml(JSON.stringify(r.raw).slice(0, 80))}</code></td>
                </tr>`).join("")}
            </tbody>
          </table>
        `}
        <div class="dialog-actions">
          <button class="ghost-button" data-import-action="back" type="button">Voltar</button>
          <button class="primary-button" data-import-action="commit" type="button" ${_busy ? "disabled" : ""}>
            ${_busy ? "Importando..." : `Confirmar importacao (${ok})`}
          </button>
        </div>
      </div>
    </section>
  `;
}

function stepDone() {
  if (!_lastImport) return stepKind();
  const { kind, summary, ids, at } = _lastImport;
  return `
    <section class="panel">
      <p class="eyebrow">Importacao concluida</p>
      <h2>${summary.inserted} registro(s) de ${kind} gravados</h2>
      <p class="muted">${at}</p>
      ${summary.locationsCreated > 0 ? `<p class="muted">${summary.locationsCreated} localizacao(oes) e/ou site(s) criados automaticamente a partir do location_path.</p>` : ""}
      ${summary.missingAssets > 0 ? `<p class="muted" style="color: var(--color-clay)">${summary.missingAssets} plano(s) ignorado(s) por nao encontrar o asset_code correspondente.</p>` : ""}
    </section>
    <section class="panel">
      <h2>Proximos passos</h2>
      <p class="muted">Importe mais ${kind} ou va para o cronograma para gerar as OS preventivas.</p>
      <div class="dialog-actions">
        <button class="ghost-button" data-import-action="restart" type="button">Importar mais</button>
        <button class="primary-button" data-view-target="schedule" type="button">Ir para Cronograma -&gt;</button>
        <button class="ghost-button" data-import-action="undo" type="button">Desfazer importacao</button>
      </div>
    </section>
  `;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

function previewHead() {
  if (_kind === "ativos") {
    return "<tr><th>code</th><th>name</th><th>location</th><th>crit</th></tr>";
  }
  return "<tr><th>code</th><th>name</th><th>asset</th><th>freq</th><th>min</th></tr>";
}

function previewRow(r) {
  if (_kind === "ativos") {
    return `<tr><td>${r.code}</td><td>${r.name}</td><td>${r.location_path}</td><td>${r.criticality}</td></tr>`;
  }
  return `<tr><td>${r.code}</td><td>${r.name}</td><td>${r.asset_code}</td><td>${r.frequency}</td><td>${r.duration_minutes}</td></tr>`;
}

// =====================================================================
// Wiring
// =====================================================================

export function wireImport() {
  const root = document.querySelector("#view");
  root.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-import-kind], [data-import-action]");
    if (!t) return;

    if (t.dataset.importKind) {
      _kind = t.dataset.importKind;
      _step = 2;
      _rows = [];
      _report = { valid: [], rejected: [] };
      document.dispatchEvent(new CustomEvent("predialops:render"));
    }

    if (t.dataset.importAction === "model") {
      downloadModel(_kind);
    }

    if (t.dataset.importAction === "back") {
      if (_step > 1) { _step -= 1; document.dispatchEvent(new CustomEvent("predialops:render")); }
    }

    if (t.dataset.importAction === "parse") {
      const input = document.querySelector("#importFile");
      if (!input?.files?.[0]) { toast("Selecione um arquivo."); return; }
      _busy = true;
      try {
        _rows = await parseFile(input.files[0]);
        _report = _kind === "ativos" ? validateAtivos(_rows) : validatePlanos(_rows);
        _step = 3;
      } catch (err) {
        toast("Falha ao ler o arquivo.");
        console.error(err);
      } finally {
        _busy = false;
        document.dispatchEvent(new CustomEvent("predialops:render"));
      }
    }

    if (t.dataset.importAction === "commit") {
      _busy = true;
      document.dispatchEvent(new CustomEvent("predialops:render"));
      try {
        const before = await snapshotState(_kind);
        const result = _kind === "ativos"
          ? await commitAtivos(state.session.tenantId, _report.valid)
          : await commitPlanos(state.session.tenantId, _report.valid);
        const after = await snapshotState(_kind);
        _lastImport = {
          kind: _kind,
          summary: result,
          ids: after.filter((x) => !before.includes(x)),
          at: new Date().toLocaleString("pt-BR")
        };
        // Recarrega o array em memoria
        if (_kind === "ativos") state.assets = await db.assets.toArray();
        if (_kind === "planos") state.checklist_templates = await db.checklist_templates.toArray();
        toast(`Importacao concluida: ${result.inserted} registro(s).`);
        _step = 4; _rows = []; _report = { valid: [], rejected: [] };
      } catch (err) {
        toast("Falha ao importar.");
        console.error(err);
      } finally {
        _busy = false;
        document.dispatchEvent(new CustomEvent("predialops:render"));
      }
    }

    if (t.dataset.importAction === "undo") {
      if (!_lastImport) return;
      _busy = true;
      document.dispatchEvent(new CustomEvent("predialops:render"));
      try {
        const store = _lastImport.kind === "ativos" ? "assets" : "checklist_templates";
        let removed = 0;
        for (const id of _lastImport.ids) {
          await db[store].delete(id);
          removed += 1;
        }
        if (_lastImport.kind === "ativos") state.assets = await db.assets.toArray();
        if (_lastImport.kind === "planos") state.checklist_templates = await db.checklist_templates.toArray();
        toast(`Importacao desfeita: ${removed} registro(s) removido(s).`);
        _lastImport = null;
        _step = 1;
      } catch (err) {
        toast("Falha ao desfazer.");
        console.error(err);
      } finally {
        _busy = false;
        document.dispatchEvent(new CustomEvent("predialops:render"));
      }
    }

    if (t.dataset.importAction === "restart") {
      _step = 1; _rows = []; _report = { valid: [], rejected: [] }; _lastImport = null;
      document.dispatchEvent(new CustomEvent("predialops:render"));
    }
  });
}

async function snapshotState(kind) {
  const store = kind === "ativos" ? "assets" : "checklist_templates";
  const rows = await db[store].toArray();
  return rows.map((r) => r.id);
}
