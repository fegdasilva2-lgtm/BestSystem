// Fila de upload de fotos para o PWA PredialOps.
// 1) Recebe um Blob ja comprimido (lib/photo.js)
// 2) Persiste no store Dexie `uploads` (sobrevive a reload e offline)
// 3) Quando online, faz upload para o Supabase Storage
//    via signed URL (Storage resumable upload com TUS, ou PUT direto)
// 4) Atualiza o work_order com a URL publica
// 5) Retry com backoff progressivo ate 5 tentativas
// 6) Limpa o Blob local apos confirmacao de upload

import { db } from "./db.js";
import { getClient } from "./supabase.js";

const MAX_ATTEMPTS = 5;
const BACKOFF_MS = [1_000, 5_000, 15_000, 60_000, 300_000]; // 1s, 5s, 15s, 1m, 5m

let _draining = false;
let _listeners = new Set();

export function onUploadEvent(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function emit(event, payload) {
  for (const fn of _listeners) {
    try { fn(event, payload); } catch { /* noop */ }
  }
}

/**
 * Adiciona uma foto a fila.
 * @param {object} photo { blob, workOrderId, tenantId, geo, capturedAt, originalName, width, height, originalBytes }
 * @returns {Promise<number>} id do item na fila
 */
export async function enqueuePhoto(photo) {
  const id = await db.uploads.add({
    tenant_id: photo.tenantId,
    work_order_id: photo.workOrderId,
    blob: photo.blob,
    mime: "image/jpeg",
    size: photo.blob.size,
    width: photo.width,
    height: photo.height,
    geo: photo.geo,
    captured_at: photo.capturedAt,
    original_name: photo.originalName,
    original_bytes: photo.originalBytes,
    status: "pending",
    attempts: 0,
    progress: 0,
    storage_path: null,
    public_url: null,
    error: null,
    created_at: new Date().toISOString()
  });
  emit("queued", { id, workOrderId: photo.workOrderId });
  drain().catch(() => {});
  return id;
}

export async function pendingUploadCount() {
  return db.uploads.where("status").anyOf("pending", "failed").count();
}

/**
 * Drena a fila. Retenta uploads com erro (ate MAX_ATTEMPTS).
 */
export async function drain() {
  if (_draining) return { skipped: true };
  if (!navigator.onLine) return { skipped: true, reason: "offline" };
  const client = await getClient();
  if (!client) return { skipped: true, reason: "no-backend" };

  _draining = true;
  const summary = { uploaded: 0, failed: 0 };
  try {
    const items = await db.uploads
      .where("status").anyOf("pending", "failed")
      .sortBy("created_at");

    for (const item of items) {
      try {
        await uploadOne(client, item);
        summary.uploaded += 1;
      } catch (err) {
        const attempts = (item.attempts || 0) + 1;
        const status = attempts >= MAX_ATTEMPTS ? "abandoned" : "pending";
        await db.uploads.update(item.id, {
          status,
          attempts,
          error: String(err?.message ?? err),
          next_attempt_at: status === "pending" ? new Date(Date.now() + BACKOFF_MS[attempts - 1]).toISOString() : null
        });
        summary.failed += 1;
        if (status === "abandoned") break; // para e alerta
      }
    }
  } finally {
    _draining = false;
    emit("drained", summary);
  }
  return summary;
}

async function uploadOne(client, item) {
  const path = buildPath(item);
  // Storage do Supabase aceita upload em 1 chamada para blobs <= 5MB.
  // Para blobs maiores ou retomada apos desconexao, migrar para TUS.
  const { error: upErr } = await client.storage
    .from("evidence")
    .upload(path, item.blob, {
      contentType: item.mime,
      upsert: true,
      cacheControl: "31536000"
    });
  if (upErr) throw upErr;

  const { data: pub } = client.storage.from("evidence").getPublicUrl(path);
  const publicUrl = pub?.publicUrl ?? null;

  // Atualiza o work_order com a URL (jsonb field `photos` no schema futuro)
  // Para o piloto, gravamos em evidence_refs (Dexie only)
  await db.uploads.update(item.id, {
    status: "done",
    storage_path: path,
    public_url: publicUrl,
    uploaded_at: new Date().toISOString(),
    error: null
  });

  // Libera o blob da memoria (libera espaco no dispositivo)
  await db.uploads.update(item.id, { blob: null });

  // Anexa evidencia ao WO em evidenceRefs (Dexie v2)
  await db.evidenceRefs.put({
    id: `ev-${item.id}`,
    workOrderId: item.work_order_id,
    storagePath: path,
    publicUrl,
    capturedAt: item.captured_at,
    geo: item.geo,
    syncedAt: new Date().toISOString()
  });
}

function buildPath(item) {
  // path: {tenant_id}/{work_order_id}/{timestamp}_{short}.jpg
  const ts = (item.captured_at ?? new Date().toISOString()).replace(/[:.]/g, "-");
  const short = (item.id ?? "").toString().padStart(8, "0").slice(-8);
  return `${item.tenant_id}/${item.work_order_id}/${ts}_${short}.jpg`;
}

// =====================================================================
// Limpeza: apaga blobs ja uploadados ha mais de 7 dias
// =====================================================================

export async function cleanupUploaded() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const old = await db.uploads
    .where("status").equals("done")
    .filter((u) => u.uploaded_at && u.uploaded_at < cutoff)
    .toArray();
  for (const u of old) {
    if (u.blob) await db.uploads.update(u.id, { blob: null });
  }
  return old.length;
}
