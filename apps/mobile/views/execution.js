// View de execucao de OS no mobile (tecnico em campo).
// Mostra checklist, captura fotos, materiais, geolocalizacao e
// assinatura. Tudo offline; sync incremental via outbox + upload-queue.

import { state, saveState } from "../lib/state.js";
import { db } from "../lib/db.js";
import { compressImage } from "../lib/photo.js";
import { enqueuePhoto, pendingUploadCount } from "../lib/upload-queue.js";
import { appendAudit } from "../lib/state.js";
import { toast } from "../lib/ui.js";

let _workOrderId = null;
let _checklist = [];
let _notes = "";
let _materials = [];
let _geo = null;
let _busy = false;
let _draft = null;

export function renderExecution() {
  const wo = _workOrderId
    ? state.workOrders.find((w) => w.id === _workOrderId)
    : pickNextOpen();

  if (!wo) {
    return `
      <section class="panel">
        <p class="eyebrow">Execucao</p>
        <h2>Nenhuma OS disponivel</h2>
        <p class="muted">Nao ha OS aberta ou em execucao no momento. Gere o cronograma ou converta um chamado em triagem.</p>
        <button class="primary-button" data-view-target="schedule" type="button">Ir para Cronograma</button>
      </section>`;
  }

  _workOrderId = wo.id;
  _draft = _draft ?? loadDraft(wo.id);

  const elapsed = _draft.elapsedMinutes ?? 0;
  const photos = _draft.photos ?? [];
  const signature = _draft.signature ?? null;

  return `
    <section class="panel">
      <p class="eyebrow">Execucao em campo</p>
      <h2>${wo.id} - ${wo.asset ?? wo.description ?? "OS"}</h2>
      <p class="muted">${wo.location ?? ""} - Prioridade ${wo.priority ?? "media"} - Vencimento ${wo.due ?? "-"}</p>
      <p class="muted">Tempo decorrido: <strong>${formatDuration(elapsed)}</strong></p>
    </section>

    <section class="panel">
      <p class="eyebrow">Checklist</p>
      <h2>Itens de execucao</h2>
      <div class="checklist">
        ${(wo.checklist ?? []).map((item, idx) => `
          <label class="checkline">
            <input type="checkbox" data-checklist-idx="${idx}" ${_draft.checklistDone?.[idx] ? "checked" : ""}>
            <span>${item}</span>
          </label>
        `).join("")}
        ${(wo.checklist ?? []).length === 0 ? `<p class="muted">Sem checklist definido para esta OS.</p>` : ""}
      </div>
    </section>

    <section class="split">
      <div class="panel">
        <p class="eyebrow">Evidencia fotografica</p>
        <h2>Fotos (${photos.length})</h2>
        <input type="file" id="photoInput" accept="image/*" capture="environment" multiple style="display:none" />
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:8px;">
          ${photos.map((p) => `
            <figure style="margin:0">
              <img src="${p.dataUrl}" alt="evidencia" style="width:100%; height:120px; object-fit:cover; border-radius:6px" />
              <figcaption style="font-size:11px; color:var(--color-muted)">
                ${formatBytes(p.bytes)} - ${new Date(p.capturedAt).toLocaleString("pt-BR")}
                ${p.geo ? ` - ${p.geo.lat.toFixed(4)}, ${p.geo.lng.toFixed(4)}` : ""}
              </figcaption>
            </figure>
          `).join("")}
          ${photos.length === 0 ? `<p class="muted">Nenhuma foto ainda. Use a camera do dispositivo.</p>` : ""}
        </div>
        <div class="dialog-actions">
          <button class="ghost-button" data-exec-action="capture" type="button" ${_busy ? "disabled" : ""}>
            ${_busy ? "Processando..." : "Tirar foto"}
          </button>
        </div>
      </div>

      <div class="panel">
        <p class="eyebrow">Geolocalizacao</p>
        <h2>${_geo ? "Capturada" : "Nao capturada"}</h2>
        <p class="muted">${_geo ? `${_geo.lat.toFixed(6)}, ${_geo.lng.toFixed(6)} (precisao ${_geo.accuracy?.toFixed(0)}m)` : "Captura a posicao no momento da conclusao."}</p>
        <button class="ghost-button" data-exec-action="geo" type="button">${_geo ? "Recapturar" : "Capturar posicao"}</button>
      </div>
    </section>

    <section class="split">
      <div class="panel">
        <p class="eyebrow">Materiais consumidos</p>
        <h2>Saida de estoque</h2>
        <ul style="list-style:none; padding:0; margin:0">
          ${_draft.materials.map((m, idx) => `
            <li style="display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--color-line)">
              <span>${m.sku} - ${m.name} (${m.qty})</span>
              <button class="ghost-button" data-exec-action="remove-material" data-exec-idx="${idx}" type="button">Remover</button>
            </li>
          `).join("")}
          ${_draft.materials.length === 0 ? `<li class="muted">Nenhum material baixado.</li>` : ""}
        </ul>
        <div class="dialog-actions" style="margin-top:12px">
          <input id="materialSku" placeholder="SKU" style="padding:6px" />
          <input id="materialQty" type="number" min="0.01" step="0.01" placeholder="Qtd" style="padding:6px; width:80px" />
          <button class="ghost-button" data-exec-action="add-material" type="button">Adicionar</button>
        </div>
      </div>

      <div class="panel">
        <p class="eyebrow">Observacoes</p>
        <h2>Notas e causa/solucao</h2>
        <textarea id="execNotes" rows="4" placeholder="Achados tecnicos, causa raiz, solucao aplicada, recomendacoes..." style="width:100%">${_draft.notes ?? ""}</textarea>
      </div>
    </section>

    <section class="panel">
      <p class="eyebrow">Assinatura</p>
      <h2>${signature ? "Assinatura capturada" : "Coletar assinatura do cliente"}</h2>
      <p class="muted">${signature ? `Capturada em ${new Date(signature.capturedAt).toLocaleString("pt-BR")}` : "Necessaria para aprovacao do servico."}</p>
      <button class="ghost-button" data-exec-action="signature" type="button">${signature ? "Recolher" : "Colher assinatura"}</button>
    </section>

    <section class="panel">
      <p class="eyebrow">Status da execucao</p>
      <h2>${labelStatus(_draft.intent)}</h2>
      <div class="dialog-actions">
        <button class="ghost-button" data-exec-action="save-draft" type="button" ${_busy ? "disabled" : ""}>Salvar rascunho</button>
        <button class="ghost-button" data-exec-action="pause" type="button" ${_busy ? "disabled" : ""}>Pausar</button>
        <button class="primary-button" data-exec-action="finish" type="button" ${_busy ? "disabled" : ""}>Concluir OS</button>
      </div>
    </section>
  `;
}

function pickNextOpen() {
  return state.workOrders.find((w) => w.status === "open" || w.status === "progress" || w.status === "atribuida");
}

function loadDraft(woId) {
  return {
    workOrderId: woId,
    checklistDone: {},
    notes: "",
    materials: [],
    photos: [],
    signature: null,
    geo: null,
    intent: "em_execucao",
    elapsedMinutes: 0,
    updatedAt: new Date().toISOString()
  };
}

function formatBytes(n) {
  if (!n) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function formatDuration(min) {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

function labelStatus(intent) {
  return {
    rascunho: "Rascunho salvo",
    em_execucao: "Em execucao",
    pausada: "Pausada",
    aguardando_cliente: "Aguardando cliente",
    concluida_tecnico: "Concluida (aguardando aceite)"
  }[intent] ?? intent;
}

// =====================================================================
// Wiring
// =====================================================================

export function wireExecution() {
  const root = document.querySelector("#view");
  root.addEventListener("click", async (e) => {
    const t = e.target.closest("[data-exec-action]");
    if (!t) return;
    const action = t.dataset.execAction;
    if (_busy && action !== "save-draft") return;
    _busy = true;
    document.dispatchEvent(new CustomEvent("predialops:render"));

    try {
      if (action === "capture") {
        await capturePhoto();
      } else if (action === "geo") {
        await captureGeo();
      } else if (action === "add-material") {
        addMaterial();
      } else if (action === "remove-material") {
        _draft.materials.splice(Number(t.dataset.execIdx), 1);
        await persistDraft();
      } else if (action === "signature") {
        await captureSignature();
      } else if (action === "save-draft") {
        await persistDraft();
        toast("Rascunho salvo localmente.");
      } else if (action === "pause") {
        _draft.intent = "pausada";
        await persistDraft();
        await updateWorkOrderStatus("pausada");
        toast("OS pausada.");
      } else if (action === "finish") {
        await finishExecution();
      }
    } catch (err) {
      console.error(err);
      toast("Erro: " + (err?.message ?? err));
    } finally {
      _busy = false;
      document.dispatchEvent(new CustomEvent("predialops:render"));
    }
  });

  // Checklist toggles
  root.querySelectorAll("[data-checklist-idx]").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      const idx = Number(e.target.dataset.checklistIdx);
      _draft.checklistDone[idx] = e.target.checked;
    });
  });

  // Notes
  const notes = document.querySelector("#execNotes");
  if (notes) notes.addEventListener("input", (e) => { _draft.notes = e.target.value; });

  // Upload badge
  refreshUploadBadge();
}

async function capturePhoto() {
  const input = document.querySelector("#photoInput");
  if (!input) {
    // Sem input file, cria um dinamico
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/*";
    i.capture = "environment";
    i.multiple = true;
    i.style.display = "none";
    i.id = "photoInput";
    document.body.appendChild(i);
    i.addEventListener("change", handlePhotoChange);
    i.click();
    return;
  }
  input.click();
}

async function handlePhotoChange(e) {
  const files = Array.from(e.target.files ?? []);
  if (!files.length) return;
  _busy = true;
  document.dispatchEvent(new CustomEvent("predialops:render"));
  try {
    for (const file of files) {
      const compressed = await compressImage(file, { maxDim: 1600, quality: 0.8 });
      // Preview local
      const dataUrl = await blobToDataURL(compressed.blob);
      _draft.photos.push({
        dataUrl,
        bytes: compressed.bytes,
        width: compressed.width,
        height: compressed.height,
        capturedAt: compressed.capturedAt,
        geo: compressed.geo
      });
      // Enfileira para upload retomavel
      await enqueuePhoto({
        blob: compressed.blob,
        workOrderId: _workOrderId,
        tenantId: state.session.tenantId,
        geo: compressed.geo,
        capturedAt: compressed.capturedAt,
        originalName: compressed.originalName,
        width: compressed.width,
        height: compressed.height,
        originalBytes: compressed.originalBytes
      });
    }
    toast(`${files.length} foto(s) comprimidas e enfileiradas.`);
    await persistDraft();
  } finally {
    _busy = false;
    e.target.value = "";
    document.dispatchEvent(new CustomEvent("predialops:render"));
  }
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

async function captureGeo() {
  if (!navigator.geolocation) {
    toast("Geolocalizacao nao disponivel neste dispositivo.");
    return;
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        _geo = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          capturedAt: new Date().toISOString()
        };
        _draft.geo = _geo;
        resolve();
      },
      (err) => reject(new Error("Permissao negada ou sinal indisponivel: " + err.message)),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  });
}

function addMaterial() {
  const sku = document.querySelector("#materialSku")?.value?.trim();
  const qty = Number(document.querySelector("#materialQty")?.value);
  if (!sku || !Number.isFinite(qty) || qty <= 0) {
    toast("Informe SKU e quantidade.");
    return;
  }
  const item = state.stock.find((s) => s.sku === sku);
  if (!item) {
    toast(`SKU ${sku} nao encontrado no estoque.`);
    return;
  }
  _draft.materials.push({ sku, name: item.name, qty });
  document.querySelector("#materialSku").value = "";
  document.querySelector("#materialQty").value = "";
}

async function captureSignature() {
  // Captura de assinatura simplificada: prompt para nome do cliente
  // + cria um canvas virtual. Em V1, usar uma lib de signature pad.
  const name = prompt("Nome do cliente que assina:");
  if (!name) return;
  const canvas = document.createElement("canvas");
  canvas.width = 600; canvas.height = 200;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fffdf7";
  ctx.fillRect(0, 0, 600, 200);
  ctx.fillStyle = "#1e2522";
  ctx.font = "20px sans-serif";
  ctx.fillText("Assinado eletronicamente por:", 20, 40);
  ctx.fillText(name, 20, 70);
  ctx.fillStyle = "#67736f";
  ctx.font = "14px sans-serif";
  ctx.fillText(new Date().toLocaleString("pt-BR"), 20, 100);
  ctx.fillStyle = "#18332f";
  ctx.fillRect(20, 150, 560, 2);
  const dataUrl = canvas.toDataURL("image/png");
  _draft.signature = { name, capturedAt: new Date().toISOString(), dataUrl };
  await persistDraft();
}

async function persistDraft() {
  _draft.updatedAt = new Date().toISOString();
  await db.executionDrafts.put(_draft);
}

async function updateWorkOrderStatus(status) {
  const wo = state.workOrders.find((w) => w.id === _workOrderId);
  if (!wo) return;
  wo.status = status;
  wo.version = (wo.version ?? 1) + 1;
  wo.updatedAt = new Date().toISOString();
  await db.workOrders.put(wo);
  await appendAudit({ tenantId: state.session.tenantId, user: "Tecnico", action: `OS ${wo.id} -> ${status}` });
  state.audit.unshift({ id: `aud-${Date.now()}`, tenantId: state.session.tenantId, at: "Agora", user: "Tecnico", action: `OS ${wo.id} -> ${status}` });
}

async function finishExecution() {
  const total = (wo_checklistDoneCount());
  if (total === 0 && (state.workOrders.find(w => w.id === _workOrderId)?.checklist?.length ?? 0) > 0) {
    if (!confirm("Nenhum item do checklist marcado. Concluir mesmo assim?")) return;
  }
  _draft.intent = "concluida_tecnico";
  await persistDraft();
  await updateWorkOrderStatus("concluida_tecnico");

  await appendAudit({
    tenantId: state.session.tenantId,
    user: "Tecnico",
    action: `OS ${_workOrderId} concluida (${_draft.photos.length} fotos, ${_draft.materials.length} materiais)`
  });
  state.audit.unshift({ id: `aud-${Date.now()}`, tenantId: state.session.tenantId, at: "Agora", user: "Tecnico", action: `OS ${_workOrderId} concluida em campo` });

  toast(`OS ${_workOrderId} concluida. Fila de upload processada.`);
  _draft = null;
  _workOrderId = null;
}

function wo_checklistDoneCount() {
  if (!_draft) return 0;
  return Object.values(_draft.checklistDone ?? {}).filter(Boolean).length;
}

async function refreshUploadBadge() {
  const n = await pendingUploadCount();
  const badge = document.querySelector("#uploadBadge");
  if (badge) badge.textContent = n > 0 ? String(n) : "";
}

// Reset entre execucoes de OS
export function resetExecution() {
  _draft = null;
  _workOrderId = null;
  _geo = null;
}
