// Banco local (IndexedDB via Dexie) do PWA PredialOps.
// Substitui o uso de localStorage. Cada store espelha uma tabela do
// backend Supabase e armazena copias locais para operacao offline.
// `outbox` guarda operacoes pendentes ate a sincronizacao.

import Dexie from "https://esm.sh/dexie@4.0.10?bundle";

export const DB_NAME = "predialops";
export const DB_VERSION = 2;

export const db = new Dexie(DB_NAME);

db.version(1).stores({
  // Tabelas de dominio. Chave primaria explicita e indices por
  // tenant_id e status para consultas frequentes no dashboard.
  meta:        "key",
  tenants:     "id, slug, status",
  users:       "id, tenantId, role, email",
  customers:   "id, tenantId, name",
  contracts:   "id, tenantId, customerId, code",
  sites:       "id, tenantId, customerId, contractId",
  locations:   "id, tenantId, siteId, parentId",
  assets:      "id, tenantId, locationId, code, criticality",
  workOrders:  "id, tenantId, contractId, status, dueAt, assignedTo, idempotencyKey",
  requests:    "id, tenantId, status, createdAt",
  measurements:"id, tenantId, contractId, period, status",
  stock:       "id, tenantId, sku",
  audit:       "id, tenantId, createdAt",
  rbac:        "role",
  onboarding:  "key",
  provisioning:"step",
  // Fila de operacoes pendentes para sincronizacao
  outbox:      "++id, status, createdAt, [status+createdAt]",
  // Cache de anexos (fotos, assinaturas) antes do upload
  uploads:     "++id, status, workOrderId, [status+createdAt]"
});

// v2: stores para execucao offline-first de OS
db.version(2).stores({
  // Stores existentes preservados; novos stores adicionados
  outbox:        "++id, status, createdAt, [status+createdAt]",
  uploads:       "++id, status, workOrderId, [status+createdAt]",
  // Refs de evidencia sincronizadas (sem o blob, que vive em `uploads`)
  evidenceRefs:  "id, workOrderId, [workOrderId+capturedAt]",
  // Assinaturas do cliente/tecnico
  signatures:    "++id, workOrderId, capturedAt",
  // Snapshots de execucao (rascunho local antes de finalizar)
  executionDrafts:"workOrderId, updatedAt",
  // Eventos de auditoria locais (espelho de audit_logs)
  auditLocal:    "++id, tenantId, entityType, entityId, createdAt"
});

// v3: PMOC (Lei 13.589/2018)
db.version(3).stores({
  pmocs:          "id, tenantId, contractId, siteId, active",
  pmocActivities: "id, pmocPlanId, assetId, code, frequency",
  pmocExecutions: "id, tenantId, pmocPlanId, pmocActivityId, assetId, executedAt, nextDueAt",
  pmocAlerts:     "id, tenantId, pmocPlanId, kind, severity, [tenantId+severity+createdAt]",
  contestacoes:  "id, measurementId, status, raisedAt"
});

export async function initDb() {
  if (!db.isOpen()) {
    await db.open();
  }
  const meta = await db.meta.get("schema_version");
  if (!meta) {
    await db.meta.put({ key: "schema_version", value: DB_VERSION, at: new Date().toISOString() });
  } else if (meta.value < DB_VERSION) {
    await db.meta.put({ key: "schema_version", value: DB_VERSION, at: new Date().toISOString() });
  }
  return db;
}

export async function resetDb() {
  await db.delete();
  location.reload();
}

export async function initDb() {
  if (!db.isOpen()) {
    await db.open();
  }
  const meta = await db.meta.get("schema_version");
  if (!meta) {
    await db.meta.put({ key: "schema_version", value: DB_VERSION, at: new Date().toISOString() });
  } else if (meta.value < DB_VERSION) {
    await db.meta.put({ key: "schema_version", value: DB_VERSION, at: new Date().toISOString() });
  }
  return db;
}

export async function resetDb() {
  await db.delete();
  location.reload();
}
