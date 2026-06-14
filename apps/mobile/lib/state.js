// Estado global derivado do Dexie. Em vez de manter um objeto
// monolito em localStorage, mantemos um Proxy que le/escreve direto
// no IndexedDB. A UI continua consumindo `state.workOrders`, etc., sem
// precisar conhecer a fonte.

import { db } from "./db.js";
import { seedIfEmpty } from "./seed.js";

const sessionKey = "session";

export const state = {
  // Cada chave sera materializada como array ou objeto na hidratacao
  tenants: [], users: [], contracts: [], workOrders: [], requests: [],
  assets: [], stock: [], audit: [], rbac: {}, onboarding: {},
  provisioning: [], baseCatalog: { customers: [], sites: [], locations: [] },
  session: { userId: "usr-admin", tenantId: "tenant-imc" },
  activeView: "dashboard",
  activeFilter: "all"
};

let pendingSaves = new Map();
let saveTimer = null;
let _dirty = false;

export async function hydrateState() {
  await seedIfEmpty(db);

  state.tenants      = await db.tenants.toArray();
  state.users        = await db.users.toArray();
  state.contracts    = await db.contracts.toArray();
  state.workOrders   = await db.workOrders.toArray();
  state.requests     = await db.requests.toArray();
  state.assets       = await db.assets.toArray();
  state.stock        = await db.stock.toArray();
  state.audit        = await db.audit.toArray();
  state.pmocs          = await db.pmocs.toArray();
  state.pmocActivities = await db.pmocActivities.toArray();
  state.pmocExecutions = await db.pmocExecutions.toArray();
  state.pmocAlerts     = await db.pmocAlerts.toArray();

  const rbacRows     = await db.rbac.toArray();
  state.rbac = rbacRows.reduce((acc, row) => { acc[row.role] = row.permissions; return acc; }, {});

  const onboardRows  = await db.onboarding.toArray();
  state.onboarding = onboardRows.reduce((acc, row) => { acc[row.key] = row.value; return acc; }, {});

  state.provisioning = await db.provisioning.toArray();

  const meta = await db.meta.get("baseCatalog");
  if (meta?.value) state.baseCatalog = meta.value;

  const sess = await db.meta.get(sessionKey);
  if (sess?.value) state.session = sess.value;
}

export function getState() { return state; }

export function markDirty(key) {
  _dirty = true;
  if (key) pendingSaves.set(key, Date.now());
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 250);
}

async function flush() {
  if (!_dirty) return;
  _dirty = false;

  await db.transaction("rw", [db.meta, db.onboarding, db.rbac], async () => {
    await db.meta.put({ key: sessionKey, value: state.session });
    for (const [k, v] of Object.entries(state.onboarding)) {
      await db.onboarding.put({ key: k, value: v });
    }
  });

  // Outras colecoes sao sincronizadas via enqueue() -> outbox.
}

export function attachAutoSave() {
  // Auto-save reativo: se algo no state mudar, agenda flush.
  // Para simplicidade inicial, as mutations chamam saveState() e markDirty() manualmente.
}

export async function saveState() {
  await flush();
}

// Helpers de mutacao que ja persistem na store correta do Dexie
export async function insertEntity(store, value) {
  await db[store].put(value);
  return value;
}

export async function updateEntity(store, id, patch) {
  const current = await db[store].get(id);
  if (!current) return null;
  const next = { ...current, ...patch, version: (current.version || 1) + 1, updatedAt: nowIso() };
  await db[store].put(next);
  return next;
}

export async function deleteEntity(store, id) {
  await db[store].delete(id);
}

// Gera chave de idempotencia no client para o POST subsequente
export function newIdempotencyKey(prefix = "op") {
  const rnd = (crypto?.randomUUID?.() || Math.random().toString(16).slice(2));
  return `${prefix}_${Date.now()}_${rnd}`;
}

export function nowIso() { return new Date().toISOString(); }

// Enfileira uma operacao para sincronizar com o Supabase
export async function enqueue({ type, payload }) {
  await db.outbox.add({
    type,
    payload,
    status: "pending",
    attempts: 0,
    idempotencyKey: newIdempotencyKey(type),
    createdAt: nowIso()
  });
}
