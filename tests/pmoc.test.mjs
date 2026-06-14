// Testes do motor PMOC (Lei 13.589/2018).
// Roda com: node tests/pmoc.test.mjs

import {
  templateAtividadesHVAC,
  gerarPmoc,
  gerarAlertas,
  calcularProximaExecucao
} from "../apps/mobile/lib/pmoc.js";
const { HVAC_TYPES } = (await import("../apps/mobile/lib/pmoc.js")).__test;

let failures = 0;
function expect(name, cond, detail = "") {
  if (cond) console.log("ok   - " + name);
  else { console.log("FAIL - " + name + (detail ? ` :: ${detail}` : "")); failures += 1; }
}

// =====================================================================
// 1) Templates por tipo de ativo
// =====================================================================
{
  const tChiller = templateAtividadesHVAC("chiller");
  expect("chiller: tem 5 base + 2 especificas = 7", tChiller.length === 7);
  expect("chiller: tem atividade especifica INSPEC-COMP", tChiller.some((a) => a.code === "INSPEC-COMP"));
  expect("chiller: INSPEC-COMP e mensal", tChiller.find((a) => a.code === "INSPEC-COMP")?.frequency === "M");
}
{
  const tSplit = templateAtividadesHVAC("split");
  expect("split: tem 5 base + 2 especificas = 7", tSplit.length === 7);
  expect("split: tem LIMPAR-EVAP", tSplit.some((a) => a.code === "LIMPAR-EVAP"));
}
{
  const tRooftop = templateAtividadesHVAC("rooftop");
  expect("rooftop: tem 5 atividades", tRooftop.length === 5);
}
{
  expect("tipo nao-HVAC lanca erro", (() => {
    try { templateAtividadesHVAC("gerador"); return false; } catch { return true; }
  })());
}

// =====================================================================
// 2) Geracao automatica de PMOC
// =====================================================================
{
  const plan = {
    id: "PMOC-1", contractId: "CT-1", siteId: "S-1", code: "PMOC-2026-001",
    startsOn: "2026-01-01", endsOn: "2026-12-31",
    rtName: "Eng. Joao Silva", rtCrea: "SP-12345/D",
    artNumber: "ART-2026-001"
  };
  const assets = [
    { id: "A1", type: "chiller", manufacturer: "Trane" },
    { id: "A2", type: "fancoil" },
    { id: "A3", type: "split" },
    { id: "A4", type: "gerador" }  // nao-HVAC
  ];
  const r = gerarPmoc({ plan, assets });
  expect("Gerar: chiller 7 + fancoil 6 + split 7 = 20 atividades", r.activities.length === 20,
    `got ${r.activities.length}`);
  expect("Gerar: skippedNonHvac = 1 (gerador)", r.summary.skippedNonHvac === 1);
  expect("Gerar: hvacAssetCount = 3", r.summary.hvacAssetCount === 3);
  expect("Gerar: errors tem 1 item", r.summary.errors.length === 1);
  expect("Gerar: error.assetId = A4", r.summary.errors[0].assetId === "A4");
}

// =====================================================================
// 3) Geracao com atividades customizadas
// =====================================================================
{
  const plan = {
    id: "PMOC-2", contractId: "CT-1", siteId: "S-1", code: "PMOC-2026-002",
    startsOn: "2026-01-01", endsOn: "2026-12-31",
    rtName: "Eng. Maria", rtCrea: "RJ-9999/D", artNumber: "ART-2026-002"
  };
  const r = gerarPmoc({
    plan,
    assets: [{ id: "A1", type: "split" }],
    customActivities: [
      { code: "CUSTOM-1", name: "Calibrar sensor X", frequency: "S", assetId: "A1" }
    ]
  });
  expect("Gerar com custom: 7 (split) + 1 (custom) = 8", r.activities.length === 8);
  expect("Custom: 1 atividade com code CUSTOM-1", r.activities.some((a) => a.code === "CUSTOM-1"));
}

// =====================================================================
// 4) Validacoes de plan
// =====================================================================
{
  const noRT = { id: "X", contractId: "C", siteId: "S", code: "X", startsOn: "2026-01-01", endsOn: "2026-12-31", artNumber: "X" };
  let threw = false;
  try { gerarPmoc({ plan: noRT, assets: [] }); } catch { threw = true; }
  expect("Gerar: sem RT lanca erro", threw);
}
{
  const invalidDate = { id: "X", contractId: "C", siteId: "S", code: "X", startsOn: "2026-12-31", endsOn: "2026-01-01", rtName: "A", rtCrea: "B", artNumber: "C" };
  let threw = false;
  try { gerarPmoc({ plan: invalidDate, assets: [] }); } catch { threw = true; }
  expect("Gerar: endsOn <= startsOn lanca erro", threw);
}

// =====================================================================
// 5) Alertas
// =====================================================================
{
  const plan = {
    id: "PMOC-3", contractId: "CT-1", siteId: "S-1", code: "X",
    startsOn: "2026-01-01", endsOn: "2026-12-31",
    rtName: "Eng.", rtCrea: "SP-1/D", artNumber: "ART-1"
  };
  const activities = [
    { id: "ACT-1", pmocPlanId: "PMOC-3", assetId: "A1", code: "C1", name: "C1", description: "", frequency: "M", durationMinutes: 60, priority: "media" },
    { id: "ACT-2", pmocPlanId: "PMOC-3", assetId: "A2", code: "C2", name: "C2", description: "", frequency: "M", durationMinutes: 60, priority: "media" }
  ];
  const executions = [
    { id: "E1", pmocActivityId: "ACT-1", assetId: "A1", executedAt: "2026-05-10T00:00:00Z", nextDueAt: "2026-06-10T00:00:00Z", result: "conforme" },
    { id: "E2", pmocActivityId: "ACT-2", assetId: "A2", executedAt: "2026-05-10T00:00:00Z", nextDueAt: "2026-06-10T00:00:00Z", result: "nao_conforme" }
  ];
  const r = gerarAlertas({ plan, activities, executions, referenceDate: "2026-07-15T00:00:00Z" });
  // ACT-1 (conforme) vencida = 1 alerta (vencido)
  // ACT-2 (nao_conforme) vencida = 2 alertas (vencido + resultado_nao_conforme)
  // Total = 3
  expect("Alertas: 3 alertas (1 vencido+conforme + 1 vencido + 1 nao conforme)",
    r.alerts.length === 3, `got ${r.alerts.length}`);
  expect("Alertas: tem vencido", r.alerts.some((a) => a.kind === "vencido"));
  expect("Alertas: tem resultado_nao_conforme", r.alerts.some((a) => a.kind === "resultado_nao_conforme"));
  expect("Compliance: total 2", r.compliance.total === 2);
  expect("Compliance: conformes 1", r.compliance.conformes === 1);
  expect("Compliance: naoConformes 1", r.compliance.naoConformes === 1);
  expect("Compliance: 50% compliance", r.compliance.compliancePct === 50);
}

// =====================================================================
// 6) Alerta de ART vencendo
// =====================================================================
{
  const plan = {
    id: "PMOC-4", contractId: "C", siteId: "S", code: "X",
    startsOn: "2026-01-01", endsOn: "2026-08-30",
    rtName: "Eng", rtCrea: "SP-1/D", artNumber: "ART-X"
  };
  const r = gerarAlertas({ plan, activities: [], executions: [], referenceDate: "2026-07-15T00:00:00Z" });
  const artAlert = r.alerts.find((a) => a.kind === "art_vencendo");
  expect("ART vencendo: alerta presente", !!artAlert);
  // 2026-07-15 -> 2026-08-30 = 46 dias = alta
  expect("ART vencendo: severity alta (16-60 dias)", artAlert?.severity === "alta");
}
{
  const planCritical = { id: "PMOC-5", contractId: "C", siteId: "S", code: "X",
    startsOn: "2026-01-01", endsOn: "2026-07-25", rtName: "Eng", rtCrea: "SP-1/D", artNumber: "ART-X" };
  const r = gerarAlertas({ plan: planCritical, activities: [], executions: [], referenceDate: "2026-07-15T00:00:00Z" });
  const artAlert = r.alerts.find((a) => a.kind === "art_vencendo");
  // 2026-07-15 -> 2026-07-25 = 10 dias = critica
  expect("ART vencendo: severity critica (<=15 dias)", artAlert?.severity === "critica");
}

// =====================================================================
// 7) Atividade sem execucao gera alerta
// =====================================================================
{
  const plan = {
    id: "PMOC-6", contractId: "C", siteId: "S", code: "X",
    startsOn: "2026-01-01", endsOn: "2026-12-31",
    rtName: "Eng", rtCrea: "SP-1/D", artNumber: "ART"
  };
  const activities = [
    { id: "ACT-X", pmocPlanId: "PMOC-6", assetId: "A", code: "X", name: "X", description: "", frequency: "M", durationMinutes: 60, priority: "media" }
  ];
  const r = gerarAlertas({ plan, activities, executions: [] });
  expect("Sem execucao: gera faltando_ultima_execucao",
    r.alerts.some((a) => a.kind === "faltando_ultima_execucao"));
  expect("Sem execucao: semExecucao = 1", r.compliance.semExecucao === 1);
}

// =====================================================================
// 8) Severidade de vencido escala com dias
// =====================================================================
{
  const plan = {
    id: "P", contractId: "C", siteId: "S", code: "X",
    startsOn: "2026-01-01", endsOn: "2026-12-31",
    rtName: "Eng", rtCrea: "SP-1/D", artNumber: "ART"
  };
  const activities = [
    { id: "ACT", pmocPlanId: "P", assetId: "A", code: "X", name: "X", description: "", frequency: "M", durationMinutes: 60, priority: "media" }
  ];
  // Vencido ha 3 dias
  const r1 = gerarAlertas({
    plan, activities, referenceDate: "2026-06-13T00:00:00Z",
    executions: [{ id: "E", pmocActivityId: "ACT", assetId: "A", executedAt: "2026-05-10T00:00:00Z", nextDueAt: "2026-06-10T00:00:00Z", result: "conforme" }]
  });
  expect("Vencido 3 dias: severity media", r1.alerts.find((a) => a.kind === "vencido")?.severity === "media");
  // Vencido ha 10 dias
  const r2 = gerarAlertas({ plan, activities, referenceDate: "2026-06-20T00:00:00Z", executions: r1.alerts.length ? [] : [] });
  // Recrio execution com nextDueAt mais antigo
  const r3 = gerarAlertas({
    plan, activities, referenceDate: "2026-06-20T00:00:00Z",
    executions: [{ id: "E", pmocActivityId: "ACT", assetId: "A", executedAt: "2026-05-10T00:00:00Z", nextDueAt: "2026-06-10T00:00:00Z", result: "conforme" }]
  });
  expect("Vencido 10 dias: severity alta", r3.alerts.find((a) => a.kind === "vencido")?.severity === "alta");
}

// =====================================================================
// 9) calcularProximaExecucao
// =====================================================================
{
  expect("proxima: M = +30 dias", calcularProximaExecucao({ lastExecutedAt: "2026-05-10T00:00:00Z", frequency: "M" }).slice(0, 10) === "2026-06-09");
  expect("proxima: S = +7 dias", calcularProximaExecucao({ lastExecutedAt: "2026-05-10T00:00:00Z", frequency: "S" }).slice(0, 10) === "2026-05-17");
  expect("proxima: Z (semestral) = +180 dias",
    calcularProximaExecucao({ lastExecutedAt: "2026-05-10T00:00:00Z", frequency: "Z" }).slice(0, 10) === "2026-11-06");
  expect("proxima: T = +90 dias", calcularProximaExecucao({ lastExecutedAt: "2026-05-10T00:00:00Z", frequency: "T" }).slice(0, 10) === "2026-08-08");
}

// =====================================================================
// 10) HVAC_TYPES exporta
// =====================================================================
{
  expect("HVAC_TYPES contem chiller, fancoil, split", HVAC_TYPES.has("chiller") && HVAC_TYPES.has("fancoil") && HVAC_TYPES.has("split"));
}

if (failures > 0) {
  console.log(`\n${failures} teste(s) falharam.`);
  process.exit(1);
}
console.log("\nTodos os testes do motor PMOC passaram.");
