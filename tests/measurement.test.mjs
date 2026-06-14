// Testes do motor de medicao.
// Roda com: node tests/measurement.test.mjs

import {
  apurar,
  aplicarGlosa,
  totalizar,
  criarContestacao,
  resolverContestacao,
  aceitarMedicao,
  calcularReajuste,
  canTransition
} from "../apps/mobile/lib/measurement.js";

let failures = 0;
function expect(name, cond, detail = "") {
  if (cond) console.log("ok   - " + name);
  else { console.log("FAIL - " + name + (detail ? ` :: ${detail}` : "")); failures += 1; }
}

// =====================================================================
// 1) Apuracao - billing rule "Mensal por OS aprovada"
// =====================================================================
{
  const contract = {
    id: "CT-1", code: "CT-001", startsOn: "2026-01-01",
    monthlyValue: 10000, billingRule: "Mensal por OS aprovada"
  };
  const workOrders = [
    { id: "OS-1", contractId: "CT-1", cost: 500, approvedAt: "2026-05-15T12:00:00Z", contractItem: "Climatizacao" },
    { id: "OS-2", contractId: "CT-1", cost: 800, approvedAt: "2026-05-20T12:00:00Z", contractItem: "Eletrica" },
    { id: "OS-3", contractId: "CT-1", cost: 300, approvedAt: "2026-04-30T12:00:00Z", contractItem: "Outro mes" },
    { id: "OS-4", contractId: "CT-2", cost: 999, approvedAt: "2026-05-10T12:00:00Z" }
  ];
  const postos = [];
  const r = apurar({ contract, workOrders, postos, period: "2026-05" });
  expect("Apuracao: 2 OS aprovadas em 2026-05 (apenas contrato CT-1)",
    r.items.length === 2, `got ${r.items.length}`);
  expect("Apuracao: gross = 1300 (500+800)",
    r.gross === 1300, `got ${r.gross}`);
  expect("Apuracao: net = gross (sem glosa)",
    r.net === r.gross);
  expect("Apuracao: workOrderCount no summary",
    r.summary.workOrderCount === 2);
}

// =====================================================================
// 2) Apuracao - billing rule "Posto + extras aprovados"
// =====================================================================
{
  const contract = { id: "CT-2", code: "CT-002", startsOn: "2026-01-01", monthlyValue: 0, billingRule: "Posto + extras aprovados" };
  const workOrders = [
    { id: "OS-10", contractId: "CT-2", cost: 1500, approvedAt: "2026-05-10T12:00:00Z" }
  ];
  const postos = [
    { id: "P-1", contractId: "CT-2", name: "Porteiro noturno", monthlyValue: 4500 },
    { id: "P-2", contractId: "CT-2", name: "Zelador", monthlyValue: 3500 }
  ];
  const r = apurar({ contract, workOrders, postos, period: "2026-05" });
  expect("Posto+extras: 2 postos + 1 OS = 3 itens", r.items.length === 3);
  expect("Posto+extras: gross = 8000 + 1500 = 9500", r.gross === 9500, `got ${r.gross}`);
}

// =====================================================================
// 3) Apuracao - billing rule "Por item de contrato" (escopo fixo)
// =====================================================================
{
  const contract = { id: "CT-3", code: "CT-003", startsOn: "2026-01-01", monthlyValue: 50000, billingRule: "Por item de contrato" };
  const r = apurar({ contract, workOrders: [], postos: [], period: "2026-05" });
  expect("Escopo fixo: 1 item com valor mensal", r.items.length === 1);
  expect("Escopo fixo: gross = 50000", r.gross === 50000);
}

// =====================================================================
// 4) Apuracao - periodo invalido
// =====================================================================
{
  const contract = { id: "CT-X", code: "X", startsOn: "2026-01-01", monthlyValue: 0, billingRule: "Mensal por OS aprovada" };
  let threw = false;
  try { apurar({ contract, workOrders: [], postos: [], period: "maio-2026" }); }
  catch { threw = true; }
  expect("Apuracao: periodo invalido lanca erro", threw);
}

// =====================================================================
// 5) Glosa
// =====================================================================
{
  const items = [
    { id: "wo-OS-1", grossAmount: 1000, discountAmount: 0, netAmount: 1000 },
    { id: "wo-OS-2", grossAmount: 800,  discountAmount: 0, netAmount: 800 }
  ];
  const next = aplicarGlosa({ items, itemId: "wo-OS-1", amount: 200, reason: "OS fora de escopo", appliedBy: "gestor@x" });
  expect("Glosa: item alvo atualizado", next[0].discountAmount === 200);
  expect("Glosa: netAmount recalculado", next[0].netAmount === 800);
  expect("Glosa: outro item inalterado", next[1].discountAmount === 0);
  expect("Glosa: motivo preservado", next[0].discountReason === "OS fora de escopo");
}

// =====================================================================
// 6) Glosa cumulativa
// =====================================================================
{
  const items = [{ id: "wo-X", grossAmount: 1000, discountAmount: 0, netAmount: 1000 }];
  const a = aplicarGlosa({ items, itemId: "wo-X", amount: 100, reason: "Atraso", appliedBy: "u" });
  const b = aplicarGlosa({ items: a, itemId: "wo-X", amount: 50,  reason: "Material", appliedBy: "u" });
  expect("Glosa cumulativa: discountAmount = 150", b[0].discountAmount === 150);
  expect("Glosa cumulativa: motivos concatenados",
    b[0].discountReason.includes("Atraso") && b[0].discountReason.includes("Material"));
}

// =====================================================================
// 7) Glosa - valor maior que bruto deve falhar
// =====================================================================
{
  const items = [{ id: "wo-Y", grossAmount: 100, discountAmount: 0, netAmount: 100 }];
  let threw = false;
  try { aplicarGlosa({ items, itemId: "wo-Y", amount: 150, reason: "x", appliedBy: "u" }); }
  catch { threw = true; }
  expect("Glosa: valor > bruto lanca erro", threw);
}

// =====================================================================
// 8) Contestacao
// =====================================================================
{
  const c = criarContestacao({ measurementId: "M-1", amount: 500, reason: "OS em duplicidade", raisedBy: "cliente@x" });
  expect("Contestacao: criada com status pendente", c.status === "pendente");
  const r = resolverContestacao(c, "aceita", "Confirmado em duplicidade, estornado");
  expect("Contestacao: resolvida como aceita", r.status === "aceita" && r.resolvedAt);
}

// =====================================================================
// 9) Aceite formal bloqueia medicao com contestacoes pendentes (sinaliza)
// =====================================================================
{
  const contestacoes = [
    { id: "ct-1", status: "aceita" },
    { id: "ct-2", status: "pendente" }
  ];
  const r = aceitarMedicao({ measurementId: "M-2", approvedBy: "cliente@x", contestacoes });
  expect("Aceite: retorna pendingContestacoes",
    r.pendingContestacoes.length === 1 && r.pendingContestacoes[0].id === "ct-2");
}

// =====================================================================
// 10) Reajuste
// =====================================================================
{
  const contract = {
    id: "CT-4", code: "CT-004", startsOn: "2024-01-01",
    monthlyValue: 10000, billingRule: "Por item de contrato",
    indexName: "IPCA", indexDate: "2025-01-01"
  };
  // 1 ano depois, sem override
  const r = calcularReajuste({ contract, referenceDate: new Date("2026-01-01") });
  expect("Reajuste IPCA: aplicado", r.applied);
  expect("Reajuste IPCA: ajuste > 0", r.adjustmentPct > 0);
  expect("Reajuste IPCA: novo valor > 10000", r.newMonthlyValue > 10000);
  // Antes da data: nao aplica
  const early = calcularReajuste({ contract, referenceDate: new Date("2024-06-01") });
  expect("Reajuste: antes da data NAO aplica", !early.applied);
  // Sem indice
  const noIdx = calcularReajuste({ contract: { ...contract, indexName: null } });
  expect("Reajuste: sem indice NAO aplica", !noIdx.applied);
}

// =====================================================================
// 11) Status transitions
// =====================================================================
{
  expect("Transition: rascunho -> pre_enviada", canTransition("rascunho", "pre_enviada"));
  expect("Transition: em_aceite -> aprovada", canTransition("em_aceite", "aprovada"));
  expect("Transition: rascunho -> aprovada (invalido)", !canTransition("rascunho", "aprovada"));
  expect("Transition: aprovada -> rascunho (invalido)", !canTransition("aprovada", "rascunho"));
  expect("Transition: faturada -> paga", canTransition("faturada", "paga"));
}

// =====================================================================
// 12) totalizar
// =====================================================================
{
  const items = [
    { grossAmount: 1000, discountAmount: 100, netAmount: 900 },
    { grossAmount: 800,  discountAmount: 0,   netAmount: 800 }
  ];
  const t = totalizar(items);
  expect("Totalizar: gross", t.gross === 1800);
  expect("Totalizar: discount", t.discount === 100);
  expect("Totalizar: net", t.net === 1700);
}

if (failures > 0) {
  console.log(`\n${failures} teste(s) falharam.`);
  process.exit(1);
}
console.log("\nTodos os testes do motor de medicao passaram.");
