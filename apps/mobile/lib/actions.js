// Centraliza as acoes invocadas pelos botoes da UI.
// Migradas do antigo app.js para usar Dexie + outbox + sync.

import { state, saveState, newIdempotencyKey, appendAudit } from "./state.js";
import { createServiceRequest, createWorkOrder, updateWorkOrderStatus, approveMeasurement } from "./supabase.js";
import { drain, pendingCount } from "./sync.js";
import { drain as drainUploads, pendingUploadCount } from "./upload-queue.js";
import { toast } from "./ui.js";
import { db } from "./db.js";

export function wireGlobalActions() {
  document.querySelector("[data-action='new-request']")?.addEventListener("click", () => {
    document.querySelector("#requestDialog")?.showModal();
  });

  document.querySelector("#syncButton")?.addEventListener("click", async () => {
    const outbox = await drain();
    const uploads = await drainUploads();
    if (outbox?.skipped && uploads?.skipped) {
      toast(outbox.reason === "offline" ? "Offline - sem sincronizar" : "Sem backend configurado");
    } else {
      const o = outbox?.pushed || 0;
      const u = uploads?.uploaded || 0;
      toast(`Sincronizado: ${o} evento(s), ${u} foto(s).`);
    }
  });

  document.querySelector("#cancelRequest")?.addEventListener("click", () => {
    document.querySelector("#requestDialog")?.close();
  });

  document.querySelector("#requestForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const rec = await createServiceRequest({
      tenantId: state.session.tenantId,
      requester: data.get("requester"),
      location: data.get("location"),
      category: data.get("category"),
      description: data.get("description")
    });
    state.requests.unshift(rec);
    await appendAudit({ tenantId: state.session.tenantId, user: rec.requester, action: `Abriu chamado ${rec.id}` });
    state.audit.unshift({ id: `aud-${Date.now()}`, tenantId: state.session.tenantId, at: "Agora", user: rec.requester, action: `Abriu chamado ${rec.id}` });
    form.closest("dialog")?.close();
    state.activeView = "portals";
    document.dispatchEvent(new CustomEvent("predialops:render"));
    toast("Chamado aberto e enviado para triagem.");
  });
}

export async function runAction(action, source) {
  if (action === "save-offline") {
    const opId = await db.outbox.add({
      type: "work_order.update",
      payload: { id: "OS-10279", tenantId: state.session.tenantId, status: "done" },
      status: "pending",
      attempts: 0,
      idempotencyKey: newIdempotencyKey("save-offline"),
      createdAt: new Date().toISOString()
    });
    state.audit.unshift({ id: `aud-${Date.now()}`, tenantId: state.session.tenantId, at: "Agora", user: "Tecnico mobile", action: "Salvou execucao offline" });
    await db.audit.put(state.audit[0]);
    document.dispatchEvent(new CustomEvent("predialops:render"));
    toast("Execucao salva offline. Sincronizara quando houver rede.");
  }

  if (action === "triage-request") {
    const req = state.requests.find((r) => r.status === "triagem");
    if (!req) { toast("Nao ha solicitacoes em triagem."); return; }
    const next = await db.requests.get(req.id);
    next.status = "convertido";
    await db.requests.put(next);
    req.status = "convertido";

    const newWo = await createWorkOrder({
      tenantId: state.session.tenantId,
      type: "Corretiva",
      customer: req.location.split(" / ")[0],
      site: req.location.split(" / ")[1] || "Site principal",
      location: req.location,
      asset: "Ativo a classificar",
      priority: "high",
      status: "open",
      technician: "A definir",
      due: "Hoje 18:00",
      slaHours: 8,
      cost: 0,
      contractItem: req.category,
      checklist: ["Triagem tecnica", "Registro fotografico", "Diagnostico", "Aceite"],
      idempotencyKey: newIdempotencyKey("wo-convert")
    });
    state.workOrders.unshift(newWo);
    await appendAudit({ tenantId: state.session.tenantId, user: "Planejador", action: `Converteu ${req.id} em ${newWo.id}` });
    state.audit.unshift({ id: `aud-${Date.now()}`, tenantId: state.session.tenantId, at: "Agora", user: "Planejador", action: `Converteu ${req.id} em ${newWo.id}` });
    document.dispatchEvent(new CustomEvent("predialops:render"));
    toast("Solicitacao convertida em ordem de servico.");
  }

  if (action === "approve-measurement") {
    await approveMeasurement("CT-2026-033", "2026-04");
    await appendAudit({ tenantId: state.session.tenantId, user: "Cliente gestor", action: "Aprovou medicao do periodo 04/2026" });
    state.audit.unshift({ id: `aud-${Date.now()}`, tenantId: state.session.tenantId, at: "Agora", user: "Cliente gestor", action: "Aprovou medicao do periodo 04/2026" });
    document.dispatchEvent(new CustomEvent("predialops:render"));
    toast("Medicao aprovada e registrada na auditoria.");
  }

  if (action === "switch-tenant") {
    const tenantId = source?.dataset?.tenantId;
    if (!tenantId) return;
    state.session.tenantId = tenantId;
    const tenantUser = state.users.find((u) => u.tenantId === tenantId);
    if (tenantUser) state.session.userId = tenantUser.id;
    await saveState();
    state.audit.unshift({ id: `aud-${Date.now()}`, tenantId, at: "Agora", user: "Sistema", action: `Alternou tenant para ${state.tenants.find(t => t.id === tenantId)?.name}` });
    await db.audit.put(state.audit[0]);
    document.dispatchEvent(new CustomEvent("predialops:render"));
    toast(`Tenant ativo: ${state.tenants.find(t => t.id === tenantId)?.name}`);
  }

  if (action === "add-base-record") {
    const next = `Ambiente tecnico ${state.baseCatalog.locations.length + 1}`;
    state.baseCatalog.locations.push(next);
    await db.meta.put({ key: "baseCatalog", value: state.baseCatalog, at: new Date().toISOString() });
    state.audit.unshift({ id: `aud-${Date.now()}`, tenantId: state.session.tenantId, at: "Agora", user: state.users.find(u => u.id === state.session.userId)?.name, action: `Adicionou cadastro base: ${next}` });
    await db.audit.put(state.audit[0]);
    document.dispatchEvent(new CustomEvent("predialops:render"));
    toast("Cadastro base adicionado ao piloto.");
  }
}

// Atualiza contadores na UI de tempos em tempos
export async function refreshSyncBadge() {
  const btn = document.querySelector("#syncButton");
  if (!btn) return;
  const n = await pendingCount();
  const u = await pendingUploadCount();
  const total = n + u;
  btn.textContent = total > 0 ? `Sincronizar (${total})` : "Sincronizar";
}

setInterval(refreshSyncBadge, 5000);
// Drena uploads a cada 30s como fallback do Service Worker
setInterval(() => { if (navigator.onLine) drainUploads().catch(() => {}); }, 30_000);
