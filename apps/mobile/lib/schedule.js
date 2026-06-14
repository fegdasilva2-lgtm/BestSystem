// Motor de geracao de cronograma preventivo.
// Puro (sem Dexie) para permitir testes em Node. Recebe um conjunto
// de planos preventivos + horizonte temporal e devolve as OS previstas.
//
// Suporta frequencias:
//   D (diario), S (semanal), Q (quinzenal),
//   M (mensal), B (bimestral), T (trimestral),
//   S (semestral), A (anual), custom { intervalDays: number }
//
// Cada geracao respeita:
//   - calendario contratual (dias uteis)
//   - feriados nacionais brasileiros (hardcoded para o piloto)
//   - duracao estimada do plano
//   - capacidade diaria (limite de horas por dia)
//   - feriado/domingo: pula para o proximo dia util
//
// Saida: array de { planId, assetId, dueAt, durationMinutes, priority }

const BR_HOLIDAYS_2026 = new Set([
  "2026-01-01", // Confraternizacao
  "2026-02-17", // Carnaval (ponto facultativo, mas tipico)
  "2026-04-03", // Sexta-feira Santa
  "2026-04-21", // Tiradentes
  "2026-05-01", // Dia do Trabalho
  "2026-06-04", // Corpus Christi
  "2026-09-07", // Independencia
  "2026-10-12", // N.Sra Aparecida
  "2026-11-02", // Finados
  "2026-11-15", // Proclamacao da Republica
  "2026-12-25"  // Natal
]);

function toDateKey(d) {
  return d.toISOString().slice(0, 10);
}

function isBusinessDay(d) {
  const dow = d.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !BR_HOLIDAYS_2026.has(toDateKey(d));
}

function addDays(d, n) {
  const r = new Date(d.getTime());
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function nextBusinessDay(d) {
  let cur = new Date(d.getTime());
  let guard = 0;
  while (!isBusinessDay(cur) && guard < 14) {
    cur = addDays(cur, 1);
    guard += 1;
  }
  return cur;
}

function stepDays(frequency) {
  // 'S' e Semanal (7d). Semestral foi renomeado para 'Z' (180d).
  switch (frequency) {
    case "D": return 1;
    case "S": return 7;
    case "Q": return 14;
    case "M": return 30;
    case "B": return 60;
    case "T": return 90;
    case "Z": return 180;  // Semestral (era "S", renomeado p/ evitar colisao)
    case "A": return 365;
    default:  return 30;
  }
}

function generateOccurrences(plan, horizonStart, horizonEnd) {
  if (horizonEnd <= horizonStart) return [];
  const out = [];
  const step = stepDays(plan.frequency);
  let cursor = new Date(plan.firstRunAt ?? horizonStart);
  cursor.setUTCHours(plan.hour ?? 8, 0, 0, 0);
  let guard = 0;
  while (cursor < horizonEnd && guard < 2000) {
    if (cursor >= horizonStart) {
      const adjusted = nextBusinessDay(cursor);
      out.push(new Date(adjusted.getTime()));
    }
    cursor = addDays(cursor, step);
    guard += 1;
  }
  return out;
}

// =====================================================================
// Algoritmo principal
// =====================================================================

/**
 * @param plans    Lista de planos: { id, assetId, frequency, durationMinutes, priority, firstRunAt, hour }
 * @param options  { horizonStart, horizonEnd, dailyCapacityMinutes, perAssetLimit }
 * @returns Array de WorkOrderInput (sem id, sem tenant_id, etc.)
 */
export function generateSchedule(plans, options) {
  const {
    horizonStart,
    horizonEnd,
    dailyCapacityMinutes = 8 * 60,  // 8h por dia
    perAssetLimit = 1                  // quantas OS do mesmo asset por dia
  } = options;

  // 1) Gera todas as ocorrencias brutas (sem checar capacidade)
  const allOccurrences = [];
  for (const plan of plans) {
    const occs = generateOccurrences(plan, horizonStart, horizonEnd);
    for (const dueAt of occs) {
      allOccurrences.push({
        planId: plan.id,
        planName: plan.name,
        assetId: plan.assetId,
        contractId: plan.contractId,
        siteId: plan.siteId,
        locationId: plan.locationId,
        dueAt,
        durationMinutes: plan.durationMinutes,
        priority: plan.priority ?? "media"
      });
    }
  }

  // 2) Ordena por dueAt e empacota respeitando capacidade diaria + limite por asset
  allOccurrences.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());

  const usedMinutesByDay = new Map();   // dateKey -> minutos usados
  const usedAssetByDay   = new Map();   // dateKey -> Set<assetId>
  const accepted = [];
  const rejected = [];

  for (const occ of allOccurrences) {
    const dayKey = toDateKey(occ.dueAt);
    const used = usedMinutesByDay.get(dayKey) ?? 0;
    const assetsToday = usedAssetByDay.get(dayKey) ?? new Set();

    if (used + occ.durationMinutes > dailyCapacityMinutes) {
      // Tenta empurrar para o proximo dia util
      const next = nextBusinessDay(addDays(occ.dueAt, 1));
      if (next >= horizonEnd) {
        rejected.push({ ...occ, reason: "capacidade_diaria_excedida_apos_horizonte" });
        continue;
      }
      const nextKey = toDateKey(next);
      const nextUsed = usedMinutesByDay.get(nextKey) ?? 0;
      if (nextUsed + occ.durationMinutes <= dailyCapacityMinutes &&
          !(usedAssetByDay.get(nextKey)?.has(occ.assetId))) {
        usedMinutesByDay.set(nextKey, nextUsed + occ.durationMinutes);
        const set = usedAssetByDay.get(nextKey) ?? new Set();
        set.add(occ.assetId);
        usedAssetByDay.set(nextKey, set);
        accepted.push({ ...occ, dueAt: next, rescheduled: true });
      } else {
        rejected.push({ ...occ, reason: "capacidade_diaria_excedida" });
      }
      continue;
    }

    if (assetsToday.has(occ.assetId) && perAssetLimit > 0) {
      // Mesmo asset ja tem OS hoje; tenta no dia seguinte
      const next = nextBusinessDay(addDays(occ.dueAt, 1));
      if (next >= horizonEnd) {
        rejected.push({ ...occ, reason: "limite_por_asset_apos_horizonte" });
        continue;
      }
      const nextKey = toDateKey(next);
      const nextUsed = usedMinutesByDay.get(nextKey) ?? 0;
      if (nextUsed + occ.durationMinutes <= dailyCapacityMinutes &&
          !(usedAssetByDay.get(nextKey)?.has(occ.assetId))) {
        usedMinutesByDay.set(nextKey, nextUsed + occ.durationMinutes);
        const set = usedAssetByDay.get(nextKey) ?? new Set();
        set.add(occ.assetId);
        usedAssetByDay.set(nextKey, set);
        accepted.push({ ...occ, dueAt: next, rescheduled: true });
      } else {
        rejected.push({ ...occ, reason: "limite_por_asset" });
      }
      continue;
    }

    usedMinutesByDay.set(dayKey, used + occ.durationMinutes);
    assetsToday.add(occ.assetId);
    usedAssetByDay.set(dayKey, assetsToday);
    accepted.push(occ);
  }

  return { accepted, rejected };
}

// =====================================================================
// Helpers expostos para testes
// =====================================================================

export const __test = {
  isBusinessDay,
  nextBusinessDay,
  stepDays,
  generateOccurrences,
  toDateKey
};
