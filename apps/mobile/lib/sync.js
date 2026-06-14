// Camada de sincronizacao offline-first.
// Quando o app esta online, drena o outbox em batches idempotentes.
// Quando offline, tudo continua funcionando localmente; ao reconectar,
// o trigger "online" chama drain() automaticamente.

import { db } from "./db.js";
import { getClient, isSupabaseEnabled } from "./supabase.js";
import { enqueue } from "./state.js";

let _draining = false;
let _listeners = new Set();

export function onSyncEvent(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function emit(event, payload) {
  for (const fn of _listeners) {
    try { fn(event, payload); } catch (e) { /* noop */ }
  }
}

export async function initSync() {
  // Tenta drenar a cada 60s como fallback do Background Sync.
  setInterval(() => { if (navigator.onLine) drain().catch(() => {}); }, 60_000);
}

export async function requestSync(reason = "manual") {
  emit("requested", { reason });
  return drain();
}

export async function drain() {
  if (_draining) return { skipped: true };
  if (!navigator.onLine) return { skipped: true, reason: "offline" };
  const client = await getClient();
  if (!client || !isSupabaseEnabled()) {
    return { skipped: true, reason: "no-backend" };
  }

  _draining = true;
  const summary = { pushed: 0, failed: 0, conflicts: 0 };
  try {
    let pending = await db.outbox
      .where("status").equals("pending")
      .sortBy("createdAt");

    for (const op of pending) {
      try {
        await pushOne(client, op);
        await db.outbox.update(op.id, { status: "done", processedAt: new Date().toISOString() });
        summary.pushed += 1;
      } catch (err) {
        const attempts = (op.attempts || 0) + 1;
        const status = attempts >= 5 ? "failed" : "pending";
        await db.outbox.update(op.id, { status, attempts, lastError: String(err?.message || err) });
        summary.failed += 1;
        if (status === "failed") break;
      }
    }
  } finally {
    _draining = false;
    emit("drained", summary);
  }
  return summary;
}

async function pushOne(client, op) {
  const { type, payload, idempotencyKey } = op;
  const table = type.split(".")[0];
  const action = type.split(".")[1];

  // Mapeia nomes de tabela/acao para o backend
  const tableMap = {
    service_request: "service_requests",
    work_order:      "work_orders",
    measurement:     "measurements",
    audit:           "audit_logs"
  };
  const target = tableMap[table] || table;

  if (action === "create") {
    const { error } = await client.from(target).insert(payload);
    if (error) throw error;
  } else if (action === "update") {
    const { error } = await client
      .from(target)
      .update(payload)
      .eq("id", payload.id)
      .eq("tenant_id", payload.tenantId);
    if (error) throw error;
  } else if (action === "approve") {
    const { error } = await client
      .from(target)
      .update({ status: "aprovada", approved_at: payload.approvedAt })
      .eq("id", payload.id);
    if (error) throw error;
  } else if (action === "append") {
    // audit_logs e gerado por trigger no backend; nada a enviar.
    return;
  }
}

// Estima quantos eventos estao pendentes (para o badge de UI)
export async function pendingCount() {
  return db.outbox.where("status").equals("pending").count();
}
