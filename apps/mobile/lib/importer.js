// Importador Excel/CSV para o PWA PredialOps.
// Suporta dois templates: "ativos" e "planos".
// Usa SheetJS (xlsx) carregado de CDN.
//
// Fluxo:
//   1. parseFile(file) -> { rows, errors }
//   2. validateAtivos(rows) / validatePlanos(rows) -> { valid, rejected }
//   3. previewTable(rows) -> HTML para o wizard
//   4. commitAtivos / commitPlanos -> grava no Dexie + enfileira outbox

import { db } from "./db.js";
import { enqueue } from "./state.js";
import { validateAtivos, validatePlanos } from "./importer-validate.js";

export { validateAtivos, validatePlanos };

// =====================================================================
// Parsing
// =====================================================================

let _xlsx = null;
async function getXLSX() {
  if (_xlsx) return _xlsx;
  const mod = await import("https://esm.sh/xlsx@0.18.5");
  _xlsx = mod.default ?? mod;
  return _xlsx;
}

export async function parseFile(file) {
  const xlsx = await getXLSX();
  const buf = await file.arrayBuffer();
  const wb  = xlsx.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  return rows;
}

// =====================================================================
// Commit - grava no Dexie e enfileira para o Supabase
// =====================================================================

export async function commitAtivos(tenantId, validated) {
  const locationCache = new Map();
  const results = { inserted: 0, locationsCreated: 0 };

  for (const item of validated) {
    const locationId = await ensureLocationPath(tenantId, item.location_path, locationCache, results);
    if (!locationId) continue;
    const asset = {
      id: cryptoId("AT"),
      tenant_id: tenantId,
      location_id: locationId,
      code: item.code,
      name: item.name,
      type: "geral",
      manufacturer: item.manufacturer,
      model: item.model,
      serial: item.serial,
      criticality: item.criticality,
      status: "operacional",
      install_date: item.install_date,
      warranty_until: item.warranty_until,
      hourly_meter: 0,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db.assets.put(asset);
    await enqueue({ type: "asset.create", payload: asset });
    results.inserted += 1;
  }
  return results;
}

export async function commitPlanos(tenantId, validated) {
  const results = { inserted: 0, missingAssets: 0 };
  for (const item of validated) {
    const asset = await db.assets.where({ tenant_id: tenantId, code: item.asset_code }).first();
    if (!asset) {
      results.missingAssets += 1;
      continue;
    }
    const plan = {
      id: cryptoId("PL"),
      tenant_id: tenantId,
      code: item.code,
      name: item.name,
      asset_id: asset.id,
      frequency: item.frequency,
      duration_minutes: item.duration_minutes,
      priority: item.priority ?? inferPriority(asset.criticality),
      checklist: item.checklist,
      active: true,
      version: 1,
      created_at: new Date().toISOString()
    };
    await db.checklist_templates.put({
      id: plan.id,
      tenant_id: tenantId,
      code: item.code,
      name: item.name,
      asset_id: asset.id,
      frequency: item.frequency,
      duration_minutes: item.duration_minutes,
      priority: plan.priority,
      hour: 8,
      version: 1,
      items: item.checklist.map((label) => ({ label, required: true })),
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    await enqueue({ type: "checklist_template.create", payload: plan });
    results.inserted += 1;
  }
  return results;
}

function inferPriority(criticality) {
  switch (criticality) {
    case "critica": return "alta";
    case "alta":    return "media";
    case "media":   return "media";
    case "baixa":   return "baixa";
    default:        return "media";
  }
}

// =====================================================================
// Helpers
// =====================================================================

async function ensureLocationPath(tenantId, path, cache, counters) {
  if (cache.has(path)) return cache.get(path);
  const segments = path.split(">").map((s) => s.trim()).filter(Boolean);
  if (segments.length === 0) return null;

  let site = await db.sites.where({ tenant_id: tenantId, name: segments[0] }).first();
  if (!site) {
    const customer = await db.customers.where({ tenant_id: tenantId }).first();
    site = {
      id: cryptoId("ST"),
      tenant_id: tenantId,
      customer_id: customer?.id ?? null,
      name: segments[0],
      timezone: "America/Sao_Paulo",
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db.sites.put(site);
    counters.locationsCreated += 1;
  }

  let parent = null;
  let cursor = null;
  for (let i = 1; i < segments.length; i++) {
    const name = segments[i];
    cursor = await db.locations
      .where({ tenant_id: tenantId, site_id: site.id })
      .filter((loc) => loc.name === name && loc.parent_id === parent)
      .first();
    if (!cursor) {
      cursor = {
        id: cryptoId("LC"),
        tenant_id: tenantId,
        site_id: site.id,
        parent_id: parent,
        name,
        type: i === segments.length - 1 ? "ambiente" : "pavimento",
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      await db.locations.put(cursor);
      counters.locationsCreated += 1;
    }
    parent = cursor.id;
  }
  cache.set(path, cursor?.id ?? null);
  return cursor?.id;
}

function cryptoId(prefix) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

// =====================================================================
// Templates
// =====================================================================

export function downloadModel(kind) {
  const headers = kind === "ativos"
    ? ["code", "name", "location_path", "criticality", "manufacturer", "model", "serial", "install_date", "warranty_until"]
    : ["code", "name", "asset_code", "frequency", "duration_minutes", "checklist"];

  const example = kind === "ativos"
    ? {
        code: "AT-AC-0007",
        name: "Fancoil FC-A3-07",
        location_path: "Shopping Norte > Torre A > Pav. 3 > Sala 304",
        criticality: "alta",
        manufacturer: "Trane",
        model: "FC-3000",
        serial: "SN-1234",
        install_date: "2024-01-15",
        warranty_until: "2027-01-15"
      }
    : {
        code: "PL-MONTHLY-001",
        name: "Limpeza mensal de filtros",
        asset_code: "AT-AC-0007",
        frequency: "M",
        duration_minutes: 45,
        checklist: "Bloqueio eletrico;Inspecao visual;Medicao de temperatura;Registro fotografico"
      };

  const csv = [
    headers.join(","),
    headers.map((h) => escapeCSV(example[h] ?? "")).join(",")
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `predialops-modelo-${kind}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCSV(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
