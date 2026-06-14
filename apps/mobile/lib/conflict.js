// Logica de concorrencia offline-first.
// Sem dependencia de Dexie/browser, para permitir testes em Node.

/**
 * Gera uma idempotency key unica. Formato: {prefix}_{timestamp}_{random}.
 * @param {string} prefix
 * @returns {string}
 */
export function newIdempotencyKey(prefix = "op") {
  const rnd = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(16).slice(2));
  return `${prefix}_${Date.now()}_${rnd}`;
}

/**
 * Resolve conflito entre versao local e servidor.
 * Regras (do estudo):
 *  - Se local foi concluida e servidor foi cancelada -> CONFLITO para supervisor
 *  - Caso contrario, ultima versao em numero vence
 *
 * @param {object} local  { id, status, version, ... }
 * @param {object} server { id, status, version, ... }
 * @returns {{ winner: "local"|"server"|"supervisor"|"tie", value?: object, reason: string }}
 */
export function resolveConflict(local, server) {
  if (!local) return { winner: "server", value: server, reason: "local_ausente" };
  if (!server) return { winner: "local",  value: local,  reason: "server_ausente" };

  if (local.status === "concluida_tecnico" && server.status === "cancelada") {
    return { winner: "supervisor", reason: "concluida_vs_cancelada" };
  }

  const lv = local.version ?? 0;
  const sv = server.version ?? 0;
  if (sv > lv) return { winner: "server", value: server, reason: "server_mais_recente" };
  if (lv > sv) return { winner: "local",  value: local,  reason: "local_mais_recente" };
  return { winner: "tie", value: local, reason: "versoes_iguais" };
}

/**
 * Detecta se o servidor cancelou a OS enquanto o tecnico executava offline.
 * Bloqueia a sincronizacao final.
 *
 * @param {object} localWo { id, status, ... }
 * @param {string} serverStatus
 * @returns {{ blocked: boolean, reason?: string }}
 */
export function detectServerCancellation(localWo, serverStatus) {
  if (localWo.status === "concluida_tecnico" && serverStatus === "cancelada") {
    return { blocked: true, reason: "os_cancelada_durante_execucao" };
  }
  return { blocked: false };
}

/**
 * Verifica se um POST com mesma idempotency_key ja existe no servidor.
 *
 * @param {object|null} existing
 * @param {object} incoming
 * @returns {{ duplicate: boolean, existing?: object }}
 */
export function checkDuplicate(existing, incoming) {
  if (!existing) return { duplicate: false };
  if (existing.idempotency_key && incoming.idempotency_key &&
      existing.idempotency_key === incoming.idempotency_key) {
    return { duplicate: true, existing };
  }
  return { duplicate: false };
}

/**
 * Merge append-only de evidencias (fotos) entre cliente e servidor.
 * Fotos sao imutaveis: nunca se sobrescreve; conflitos resolvem por uniao.
 *
 * @param {Array<{id: string, capturedAt: number|string}>} localRefs
 * @param {Array<{id: string, capturedAt: number|string}>} serverRefs
 * @returns {Array<{id: string, capturedAt: number|string}>}
 */
export function resolvePhotoConflict(localRefs, serverRefs) {
  const byId = new Map();
  for (const r of serverRefs ?? []) byId.set(r.id, r);
  for (const r of localRefs ?? []) if (!byId.has(r.id)) byId.set(r.id, r);
  return Array.from(byId.values()).sort((a, b) => {
    const av = typeof a.capturedAt === "number" ? a.capturedAt : new Date(a.capturedAt).getTime();
    const bv = typeof b.capturedAt === "number" ? b.capturedAt : new Date(b.capturedAt).getTime();
    return av - bv;
  });
}

/**
 * Ordena o outbox por createdAt (FIFO).
 * @param {Array} outbox
 * @returns {Array}
 */
export function sortOutboxByCreated(outbox) {
  return outbox.slice().sort((a, b) => {
    const av = typeof a.createdAt === "number" ? a.createdAt : new Date(a.createdAt).getTime();
    const bv = typeof b.createdAt === "number" ? b.createdAt : new Date(b.createdAt).getTime();
    return av - bv;
  });
}
