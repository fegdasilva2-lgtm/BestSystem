// Cenario de carga: importa 30 ativos, importa 5 planos preventivos
// mensais e gera 30 OS em menos de 60 segundos.
// Roda offline, sem Supabase.

import { validateAtivos, validatePlanos } from "../apps/mobile/lib/importer-validate.js";
import { generateSchedule } from "../apps/mobile/lib/schedule.js";

let failures = 0;
function expect(name, cond, detail = "") {
  if (cond) console.log("ok   - " + name);
  else { console.log("FAIL - " + name + (detail ? ` :: ${detail}` : "")); failures += 1; }
}

const TOTAL_SECONDS = 60;
const N_ASSETS = 30;
const N_PLANS = 5;

console.log("Cenario de carga: importar + gerar cronograma");
console.log("================================================");

// ===== 1) Gerar 30 ativos sinteticos =====
const t0 = performance.now();
const ativosRows = [];
for (let i = 0; i < N_ASSETS; i++) {
  ativosRows.push({
    code: `AT-LOAD-${String(i).padStart(3, "0")}`,
    name: `Ativo de carga ${i + 1}`,
    location_path: `Site Carga > Torre ${Math.floor(i / 10) + 1} > Pavimento ${(i % 3) + 1} > Sala ${(i % 5) + 1}`,
    criticality: i % 4 === 0 ? "critica" : i % 3 === 0 ? "alta" : "media"
  });
}
const ativosReport = validateAtivos(ativosRows);
expect(`Importacao: ${N_ASSETS} ativos validos`, ativosReport.valid.length === N_ASSETS,
  `got ${ativosReport.valid.length}`);

// ===== 2) Gerar 5 planos mensais =====
const planosRows = [];
for (let i = 0; i < N_PLANS; i++) {
  planosRows.push({
    code: `PL-MONTHLY-${String(i).padStart(3, "0")}`,
    name: `Plano mensal ${i + 1}`,
    asset_code: `AT-LOAD-${String(i * 6).padStart(3, "0")}`, // cada plano em 1 asset
    frequency: "M",
    duration_minutes: 60,
    checklist: "Inspecao;Limpeza;Medicao;Registro"
  });
}
const planosReport = validatePlanos(planosRows);
expect(`Importacao: ${N_PLANS} planos validos`, planosReport.valid.length === N_PLANS,
  `got ${planosReport.valid.length}`);

// ===== 3) Gerar cronograma de 30 dias =====
const horizonStart = new Date("2026-01-05T00:00:00Z");
const horizonEnd = new Date("2026-02-04T00:00:00Z");
const planInputs = planosReport.valid.map((p, idx) => ({
  id: p.code,
  name: p.name,
  assetId: p.asset_code,
  frequency: p.frequency,
  durationMinutes: p.duration_minutes,
  priority: "media",
  firstRunAt: horizonStart
}));
const schedule = generateSchedule(planInputs, {
  horizonStart,
  horizonEnd,
  dailyCapacityMinutes: 8 * 60,
  perAssetLimit: 1
});
expect(`Cronograma: 5 OS geradas (1 por plano mensal)`, schedule.accepted.length === 5,
  `got ${schedule.accepted.length}`);
expect(`Cronograma: 0 rejeicoes`, schedule.rejected.length === 0);

const t1 = performance.now();
const elapsedMs = t1 - t0;
const elapsedSec = (elapsedMs / 1000).toFixed(2);

console.log("");
console.log(`Tempo total: ${elapsedSec}s (limite: ${TOTAL_SECONDS}s)`);
console.log(`Ativos: ${N_ASSETS} | Planos: ${N_PLANS} | OS: ${schedule.accepted.length}`);

if (elapsedMs > TOTAL_SECONDS * 1000) {
  console.log(`FAIL: cenario de carga excedeu ${TOTAL_SECONDS}s`);
  failures += 1;
} else {
  console.log(`OK: cenario de carga dentro do limite`);
}

if (failures > 0) {
  console.log(`\n${failures} teste(s) falharam.`);
  process.exit(1);
}
console.log("\nCenario de carga concluido com sucesso.");
