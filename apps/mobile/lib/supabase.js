// Cliente Supabase carregado de forma lazy via CDN. So e instanciado
// quando ha rede disponivel e SUPABASE_URL/ANON_KEY estao definidos
// em window.__ENV (configurados pelo deploy na Vercel) ou via
// config local em /config.js.

import { db } from "./db.js";
import { enqueue } from "./state.js";

let _client = null;
let _enabled = false;

export function getSupabaseConfig() {
  if (typeof window === "undefined") return null;
  const env = window.__ENV || {};
  return {
    url:  env.SUPABASE_URL  || (typeof localStorage !== "undefined" ? localStorage.getItem("supabase.url")  : null),
    anon: env.SUPABASE_ANON_KEY || (typeof localStorage !== "undefined" ? localStorage.getItem("supabase.anon") : null)
  };
}

export async function getClient() {
  if (_client) return _client;
  const cfg = getSupabaseConfig();
  if (!cfg?.url || !cfg?.anon) return null;
  if (!navigator.onLine) return null;
  try {
    const mod = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    _client = mod.createClient(cfg.url, cfg.anon, {
      auth: { persistSession: true, autoRefreshToken: true }
    });
    _enabled = true;
    return _client;
  } catch (err) {
    console.warn("Supabase client nao inicializado", err);
    return null;
  }
}

export function isSupabaseEnabled() { return _enabled; }

// =====================================================================
// Operacoes de dominio expostas ao app. Cada funcao:
//   1) grava localmente no Dexie
//   2) enfileira um outbox para o backend
// =====================================================================

export async function createServiceRequest(data) {
  const id = data.id || `SOL-${2400 + (await db.requests.count()) + 1}`;
  const record = {
    id,
    tenantId: data.tenantId,
    requester: data.requester,
    location: data.location,
    category: data.category,
    description: data.description,
    status: "triagem",
    createdAt: new Date().toISOString()
  };
  await db.requests.put(record);
  await enqueue({ type: "service_request.create", payload: record });
  return record;
}

export async function createWorkOrder(data) {
  const id = data.id || `OS-${10300 + (await db.workOrders.count()) + 1}`;
  const record = {
    id,
    tenantId: data.tenantId,
    type: data.type || "Corretiva",
    customer: data.customer,
    site: data.site,
    location: data.location,
    asset: data.asset,
    priority: data.priority || "high",
    status: data.status || "open",
    technician: data.technician || "A definir",
    due: data.due || "Hoje 18:00",
    slaHours: data.slaHours || 8,
    elapsedHours: 0,
    cost: data.cost || 0,
    contractItem: data.contractItem,
    checklist: data.checklist || ["Triagem tecnica", "Registro fotografico", "Diagnostico", "Aceite"],
    idempotencyKey: data.idempotencyKey,
    createdAt: new Date().toISOString()
  };
  await db.workOrders.put(record);
  await enqueue({ type: "work_order.create", payload: record });
  return record;
}

export async function updateWorkOrderStatus(id, status, extras = {}) {
  const current = await db.workOrders.get(id);
  if (!current) return null;
  const next = {
    ...current,
    ...extras,
    status,
    version: (current.version || 1) + 1,
    updatedAt: new Date().toISOString()
  };
  await db.workOrders.put(next);
  await enqueue({ type: "work_order.update", payload: next });
  return next;
}

export async function appendAudit({ tenantId, user, action }) {
  const record = {
    id: `aud-${Date.now()}`,
    tenantId,
    user,
    action,
    at: new Date().toISOString()
  };
  await db.audit.put(record);
  await enqueue({ type: "audit.append", payload: record });
  return record;
}

export async function approveMeasurement(contractId, period) {
  const record = {
    id: `med-${contractId}-${period}`,
    tenantId: state?.session?.tenantId,
    contractId,
    period,
    status: "aprovada",
    approvedAt: new Date().toISOString()
  };
  await db.measurements.put(record);
  await enqueue({ type: "measurement.approve", payload: record });
  return record;
}
