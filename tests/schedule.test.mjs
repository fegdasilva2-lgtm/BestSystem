// Testes puros do motor de cronograma (sem Dexie/browser).
// Roda com: node tests/schedule.test.mjs

import { generateSchedule, __test } from "../apps/mobile/lib/schedule.js";

const { isBusinessDay, nextBusinessDay, stepDays } = __test;

let failures = 0;
function expect(name, cond, detail = "") {
  if (cond) console.log("ok   - " + name);
  else { console.log("FAIL - " + name + (detail ? ` :: ${detail}` : "")); failures += 1; }
}

// ===== dias uteis =====
expect("01/01/2026 (Confraternizacao) NAO e dia util",  !isBusinessDay(new Date("2026-01-01T00:00:00Z")));
expect("02/01/2026 (sexta) e dia util",                  isBusinessDay(new Date("2026-01-02T00:00:00Z")));
expect("03/01/2026 (sabado) NAO e dia util",             !isBusinessDay(new Date("2026-01-03T00:00:00Z")));
expect("04/01/2026 (domingo) NAO e dia util",            !isBusinessDay(new Date("2026-01-04T00:00:00Z")));
expect("05/01/2026 (segunda) e dia util",                isBusinessDay(new Date("2026-01-05T00:00:00Z")));
expect("01/05/2026 (Dia do Trabalho) NAO e dia util",    !isBusinessDay(new Date("2026-05-01T00:00:00Z")));

// ===== nextBusinessDay =====
{
  const fri = new Date("2026-01-02T00:00:00Z");
  const nbd = nextBusinessDay(fri);
  expect("nextBusinessDay(sex util) = ele mesmo", nbd.getUTCDate() === 2 && nbd.getUTCMonth() === 0);
}
{
  const sat = new Date("2026-01-03T00:00:00Z");
  const nbd = nextBusinessDay(sat);
  expect("nextBusinessDay(sab) = seg", nbd.getUTCDate() === 5);
}
{
  const holi = new Date("2026-05-01T00:00:00Z"); // sexta, feriado
  const nbd = nextBusinessDay(holi);
  expect("nextBusinessDay(feriado sexta) = segunda 04/05", nbd.getUTCDate() === 4);
}

// ===== stepDays =====
expect("stepDays M = 30", stepDays("M") === 30);
expect("stepDays T = 90", stepDays("T") === 90);
expect("stepDays A = 365", stepDays("A") === 365);
expect("stepDays custom = 30 (default)", stepDays("custom") === 30);

// ===== generateSchedule: caso simples - 1 plano mensal, 30 dias =====
{
  const start = new Date("2026-01-01T00:00:00Z");
  const end   = new Date("2026-01-31T00:00:00Z");
  const plans = [{
    id: "PL-1", name: "Limpeza", assetId: "AT-1",
    frequency: "M", durationMinutes: 60, priority: "media",
    firstRunAt: start
  }];
  const { accepted, rejected } = generateSchedule(plans, {
    horizonStart: start, horizonEnd: end,
    dailyCapacityMinutes: 8 * 60, perAssetLimit: 1
  });
  expect("1 plano mensal gera 1 OS em 30 dias", accepted.length === 1, `got ${accepted.length}`);
  expect("sem rejeicoes", rejected.length === 0);
}

// ===== capacidade diaria - 2 planos diarios conflitando =====
{
  const start = new Date("2026-01-05T00:00:00Z"); // segunda
  const end   = new Date("2026-01-08T00:00:00Z");
  const plans = [
    { id: "PL-A", name: "P1", assetId: "AT-A", frequency: "D", durationMinutes: 6 * 60, priority: "media", firstRunAt: start },
    { id: "PL-B", name: "P2", assetId: "AT-B", frequency: "D", durationMinutes: 6 * 60, priority: "media", firstRunAt: start }
  ];
  const { accepted, rejected } = generateSchedule(plans, {
    horizonStart: start, horizonEnd: end,
    dailyCapacityMinutes: 8 * 60, perAssetLimit: 1
  });
  // 05 A: 6h cabe. 05 B: 6+6=12 > 8, push 06, cabe (06 used=0).
  // 06 A: 6+6=12 > 8, push 07, cabe. 06 B: 6+6=12 > 8, push 07, 7+6=12 > 8, REJ.
  // 07 A: 6+6=12 > 8, push 08 >= horizonte, REJ. 07 B: idem REJ.
  // 6 occs: 3 aceitas, 3 rejeitadas.
  expect("capacidade: 3 aceitas, 3 rejeitadas (2 alem do horizonte, 1 conflito)",
    accepted.length === 3 && rejected.length === 3,
    `acc=${accepted.length} rej=${rejected.length}`);
  expect("2a e 3a aceitas foram remarcadas",
    accepted[1].rescheduled === true && accepted[2].rescheduled === true);
  expect("pelo menos uma rejeitada por horizonte",
    rejected.some(r => r.reason === "capacidade_diaria_excedida_apos_horizonte"));
}

// ===== limite por asset: 2 planos no mesmo asset competem =====
{
  const start = new Date("2026-01-05T00:00:00Z");
  const end   = new Date("2026-01-10T00:00:00Z");
  const plans = [
    { id: "PL-A", name: "P1", assetId: "AT-1", frequency: "D", durationMinutes: 60, priority: "media", firstRunAt: start },
    { id: "PL-B", name: "P2", assetId: "AT-1", frequency: "D", durationMinutes: 60, priority: "media", firstRunAt: start }
  ];
  const { accepted, rejected } = generateSchedule(plans, {
    horizonStart: start, horizonEnd: end,
    dailyCapacityMinutes: 8 * 60, perAssetLimit: 1
  });
  // 10 occs (2 plans x 5 dias). Como ambas disputam o mesmo asset,
  // o algoritmo aceita 1 por dia e rejeita as demais (o remarca para
  // o proximo dia falha porque o proximo dia ja tem o mesmo asset).
  expect("perAssetLimit: 5 aceitas (1/dia), 5 rejeitadas",
    accepted.length === 5 && rejected.length === 5,
    `acc=${accepted.length} rej=${rejected.length}`);
}

// ===== semanal gera 4 OS em 28 dias =====
{
  const start = new Date("2026-01-05T00:00:00Z");
  const end   = new Date("2026-02-02T00:00:00Z");
  const plans = [{
    id: "PL-1", name: "Inspecao", assetId: "AT-1",
    frequency: "S", durationMinutes: 30, priority: "baixa",
    firstRunAt: start
  }];
  const { accepted } = generateSchedule(plans, {
    horizonStart: start, horizonEnd: end,
    dailyCapacityMinutes: 8 * 60, perAssetLimit: 1
  });
  expect("semanal em 28 dias gera 4 OS", accepted.length === 4, `got ${accepted.length}`);
}

// ===== anual gera 2 OS em 13 meses (firstRunAt + 365d) =====
{
  const start = new Date("2026-01-05T00:00:00Z");
  const end   = new Date("2027-02-10T00:00:00Z");
  const plans = [{
    id: "PL-1", name: "Anual", assetId: "AT-1",
    frequency: "A", durationMinutes: 240, priority: "alta",
    firstRunAt: start
  }];
  const { accepted } = generateSchedule(plans, {
    horizonStart: start, horizonEnd: end,
    dailyCapacityMinutes: 8 * 60, perAssetLimit: 1
  });
  // 05/01/2026 e 05/01/2027 (ambos antes de 10/02/2027).
  expect("anual em 13 meses gera 2 OS", accepted.length === 2, `got ${accepted.length}`);
}

// ===== pulando feriado: firstRunAt em sexta 01/05 deve ir para 04/05 =====
{
  const start = new Date("2026-05-01T00:00:00Z"); // sexta, feriado
  const end   = new Date("2026-05-31T00:00:00Z");
  const plans = [{
    id: "PL-1", name: "X", assetId: "AT-1",
    frequency: "M", durationMinutes: 30, priority: "media",
    firstRunAt: start
  }];
  const { accepted } = generateSchedule(plans, {
    horizonStart: start, horizonEnd: end,
    dailyCapacityMinutes: 8 * 60, perAssetLimit: 1
  });
  expect("firstRunAt em feriado e empurrado para proximo dia util",
    accepted[0].dueAt.getUTCDate() === 4 && accepted[0].dueAt.getUTCMonth() === 4,
    `got day=${accepted[0].dueAt.getUTCDate()}`);
}

if (failures > 0) {
  console.log(`\n${failures} teste(s) falharam.`);
  process.exit(1);
}
console.log("\nTodos os testes do motor de cronograma passaram.");
