// Testes do motor de NFS-e (mock) e conformidade trabalhista.
// Roda com: node tests/nfse-trabalhista.test.mjs

import { emitirNfse, cancelarNfse, consultarNfse, pdfUrlNfse } from "../apps/mobile/lib/nfse.js";
import { verificarConformidade, listarCnaesSuportados, calcularCustoPosto } from "../apps/mobile/lib/trabalhista.js";

let failures = 0;
function expect(name, cond, detail = "") {
  if (cond) console.log("ok   - " + name);
  else { console.log("FAIL - " + name + (detail ? ` :: ${detail}` : "")); failures += 1; }
}

// =====================================================================
// NFS-e (mock)
// =====================================================================

// 1) Emissao basica retorna status autorizada
{
  const r = await emitirNfse({
    measurementId: "med-1",
    contractId: "CT-1",
    tenantId: "tenant-imc",
    valor: 5000,
    descricao: "Manutencao mensal 05/2026",
    tomadorCnpj: "12.345.678/0001-90",
    tomadorRazao: "Shopping Norte Ltda"
  });
  expect("NFS-e: emitida com status autorizada", r.status === "autorizada");
  expect("NFS-e: tem numero", !!r.numero);
  expect("NFS-e: tem PDF URL", !!r.pdfUrl);
  expect("NFS-e: tem XML URL", !!r.xmlUrl);
  expect("NFS-e: marcada como mock", r.mock === true);
}

// 2) Validacao: sem measurementId
{
  let threw = false;
  try { await emitirNfse({ valor: 100, tomadorCnpj: "1" }); }
  catch { threw = true; }
  expect("NFS-e: sem measurementId lanca erro", threw);
}

// 3) Validacao: valor invalido
{
  let threw = false;
  try { await emitirNfse({ measurementId: "x", valor: 0, tomadorCnpj: "1" }); }
  catch { threw = true; }
  expect("NFS-e: valor 0 lanca erro", threw);
}

// 4) Cancelamento retorna status cancelada
{
  const r = await cancelarNfse("nfse-12345", "duplicidade");
  expect("NFS-e: cancelada", r.status === "cancelada");
  expect("NFS-e: motivo preservado", r.motivoCancelamento === "duplicidade");
}

// 5) Consulta retorna status
{
  const r = await consultarNfse("nfse-98765");
  expect("NFS-e: consulta retorna autorizada", r.status === "autorizada");
}

// 6) PDF URL
{
  expect("NFS-e: pdfUrlNfse gera URL", pdfUrlNfse("nfse-12345")?.includes("12345") ?? false);
  expect("NFS-e: pdfUrlNfse null para id vazio", pdfUrlNfse("") === null);
}

// =====================================================================
// Conformidade trabalhista
// =====================================================================

// 7) Posto abaixo do piso
{
  const r = verificarConformidade({
    cnae: "8111-7",  // Porteiro
    posto: {
      id: "P1", cnae: "8111-7",
      salarioPraticado: 1700,    // piso = 1900
      beneficiosConcedidos: ["VT", "VA_R$300"],
      contractId: "CT-1"
    }
  });
  expect("Trab: piso abaixo gera critica", r.divergencias.some((d) => d.kind === "piso_abaixo" && d.severity === "critica"));
  expect("Trab: meta correta", r.meta.categoria === "Porteiro" && r.meta.cct === "CCT-SINDICON-SP");
  expect("Trab: piso referencia = 1900", r.calculo.piso === 1900);
}

// 8) Posto dentro do piso mas faltando beneficios
{
  const r = verificarConformidade({
    cnae: "8121-4",  // Faxineiro
    posto: {
      id: "P2", cnae: "8121-4",
      salarioPraticado: 2000,
      beneficiosConcedidos: ["VT"],  // faltando VA e Insalubridade
      contractId: "CT-1"
    }
  });
  expect("Trab: piso OK (sem alerta)", !r.divergencias.some((d) => d.kind === "piso_abaixo"));
  const faltando = r.divergencias.filter((d) => d.kind === "beneficio_ausente");
  expect("Trab: 2 beneficios faltando", faltando.length === 2);
}

// 9) Posto com adicional noturno (Vigia 8112-5)
{
  const r = verificarConformidade({
    cnae: "8112-5",
    posto: {
      id: "P3", cnae: "8112-5",
      salarioPraticado: 2400,  // piso 1850 + 20% adicional noturno sobre piso = 2220
      beneficiosConcedidos: ["VT", "VA_R$300", "AdicionalNoturno_20pct"]
    }
  });
  expect("Vigia: sem alerta de piso", !r.divergencias.some((d) => d.kind === "piso_abaixo"));
  expect("Vigia: sem beneficio faltando", !r.divergencias.some((d) => d.kind === "beneficio_ausente"));
}

// 10) CNAE desconhecido
{
  const r = verificarConformidade({
    cnae: "9999-9",
    posto: { id: "X", cnae: "9999-9", salarioPraticado: 5000, beneficiosConcedidos: [], contractId: "CT" }
  });
  expect("Trab: CNAE desconhecido gera critica", r.divergencias.some((d) => d.kind === "cct_nao_aplicavel" && d.severity === "critica"));
}

// 11) Listagem de CNAEs
{
  const lista = listarCnaesSuportados();
  expect("Trab: lista CNAEs >= 6", lista.length >= 6);
  expect("Trab: lista tem portaria 8111-7", lista.some((c) => c.cnae === "8111-7"));
}

// 12) Custo total do posto
{
  const c = calcularCustoPosto({
    salarioBase: 1900,
    beneficios: ["VT", "VA_R$300", "CestaBasica_R$200"]
  });
  expect("Custo: VT = 6% do piso", c.descontoVT === 114);
  expect("Custo: VA 300", c.beneficiosMonetarios === 500);
  expect("Custo: FGTS = 8%", c.encargos.fgts === 152);
  expect("Custo: INSS patronal = 20%", c.encargos.inssPatronal === 380);
  expect("Custo: total > salario base", c.total > 1900);
  // 1900 (base) + 0 (adicional) + 500 (VA + Cesta) + 114 (VT, custo da empresa)
  // + 152 (FGTS) + 380 (INSS patronal) + 158.33 (ferias) + 158.33 (13o) + 60.80 (multa FGTS)
  // = 3423.47
  expect("Custo: total ~3423.47", Math.abs(c.total - 3423.47) < 1, `got ${c.total}`);
}

if (failures > 0) {
  console.log(`\n${failures} teste(s) falharam.`);
  process.exit(1);
}
console.log("\nTodos os testes de NFS-e e trabalhista passaram.");
