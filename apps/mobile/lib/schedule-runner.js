// Glue entre o motor de cronograma (puro) e a persistencia local (Dexie).
// Lê os planos preventivos do IndexedDB, gera as OS, grava e enfileira.

import { db } from "./db.js";
import { enqueue } from "./state.js";
import { generateSchedule } from "./schedule.js";

/**
 * Gera OS preventivas para um horizonte a partir dos planos ativos.
 * @param tenantId
 * @param options { daysAhead, dailyCapacityMinutes, perAssetLimit }
 * @returns { accepted: WorkOrder[], rejected: [] }
 */
export async function generateFromPlans(tenantId, options = {}) {
  const daysAhead = options.daysAhead ?? 30;
  const horizonStart = new Date();
  horizonStart.setUTCHours(0, 0, 0, 0);
  const horizonEnd = new Date(horizonStart);
  horizonEnd.setUTCDate(horizonEnd.getUTCDate() + daysAhead);

  // Carrega planos preventivos e resolve asset/contract/site
  const plans = await db.checklist_templates
    .where({ tenant_id: tenantId, active: true })
    .toArray();

  // Como na migration 0001 nao criamos tabela "preventive_plans" separada
  // (o template de checklist guarda name + items), usamos a tabela
  // checklist_templates como fonte e enriquecemos com o asset via
  // convencao do codigo. Para o piloto, planos sao identificados por
  // prefixo "PL-" no codigo e seu asset vem de um mapa carregado em memoria.
  // Em V1 isso vira uma tabela propria (preventive_plans).
  const planInputs = [];
  for (const tmpl of plans) {
    if (!tmpl.code?.startsWith("PL-")) continue;
    const assetCode = tmpl.code.replace(/^PL-/, "").split("-").slice(0, -1).join("-") || tmpl.code;
    const asset = await db.assets.where({ tenant_id: tenantId }).filter(a => a.code === assetCode).first();
    if (!asset) continue;
    planInputs.push({
      id: tmpl.id,
      name: tmpl.name,
      assetId: asset.id,
      contractId: undefined, // resolvido no commit
      siteId: asset.site_id,
      locationId: asset.location_id,
      frequency: tmpl.frequency ?? "M",
      durationMinutes: tmpl.duration_minutes ?? 60,
      priority: tmpl.priority ?? "media",
      firstRunAt: horizonStart,
      hour: 8
    });
  }

  if (planInputs.length === 0) {
    return { accepted: [], rejected: [], generated: 0 };
  }

  const { accepted, rejected } = generateSchedule(planInputs, {
    horizonStart,
    horizonEnd,
    dailyCapacityMinutes: options.dailyCapacityMinutes ?? 8 * 60,
    perAssetLimit: options.perAssetLimit ?? 1
  });

  // Converte para WorkOrder e grava
  const created = [];
  for (const occ of accepted) {
    const wo = {
      id: `OS-PREV-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenant_id: tenantId,
      type: "preventiva",
      priority: occ.priority,
      status: "planejada",
      description: `${occ.planName}${occ.rescheduled ? " (remarcada)" : ""}`,
      asset_id: occ.assetId,
      site_id: occ.siteId,
      location_id: occ.locationId,
      due_at: occ.dueAt.toISOString(),
      sla_hours: 24,
      cost: 0,
      contract_item: "Plano preventivo",
      checklist: undefined,
      idempotency_key: `gen-${occ.planId}-${occ.dueAt.toISOString()}`,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await db.workOrders.put(wo);
    await enqueue({ type: "work_order.create", payload: wo });
    created.push(wo);
  }

  return { accepted: created, rejected, generated: created.length };
}
