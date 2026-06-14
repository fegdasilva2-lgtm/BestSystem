// Teste rapido do validador do importador (pure JS, sem browser).
// Roda offline e nao precisa de Supabase.

import { validateAtivos, validatePlanos } from "../apps/mobile/lib/importer-validate.js";

let failures = 0;

function expect(name, condition, detail = "") {
  if (condition) {
    console.log("ok   - " + name);
  } else {
    console.log("FAIL - " + name + (detail ? ` :: ${detail}` : ""));
    failures += 1;
  }
}

// ===== validateAtivos =====
{
  const rows = [
    { code: "AT-1", name: "Fancoil", location_path: "Site A > Pav 1 > Sala 1", criticality: "alta" },
    { code: "AT-2", name: "Bomba",   location_path: "Site A > Pav 1",             criticality: "media" },
    { code: "",    name: "Sem cod", location_path: "X",                            criticality: "baixa" },
    { code: "AT-3", name: "",       location_path: "X",                            criticality: "baixa" },
    { code: "AT-4", name: "OK",     location_path: "X",                            criticality: "ultra" }
  ];
  const r = validateAtivos(rows);
  expect("validateAtivos: 2 validas", r.valid.length === 2, `got ${r.valid.length}`);
  expect("validateAtivos: 3 rejeitadas", r.rejected.length === 3, `got ${r.rejected.length}`);
  expect("validateAtivos: rejeitada por code vazio",
    r.rejected.some((x) => x.errors.some((e) => e.includes("code"))));
  expect("validateAtivos: rejeitada por criticality invalida",
    r.rejected.some((x) => x.errors.some((e) => e.includes("criticality"))));
}

// ===== validatePlanos =====
{
  const rows = [
    { code: "PL-1", name: "Limpeza",   asset_code: "AT-1", frequency: "M", duration_minutes: 60 },
    { code: "PL-2", name: "Inspecao",  asset_code: "AT-2", frequency: "T", duration_minutes: 30 },
    { code: "PL-3", name: "SemAsset",  asset_code: "",     frequency: "M", duration_minutes: 60 },
    { code: "PL-4", name: "FreqInval", asset_code: "AT-1", frequency: "Z", duration_minutes: 60 }
  ];
  const r = validatePlanos(rows);
  expect("validatePlanos: 2 validos", r.valid.length === 2);
  expect("validatePlanos: 2 rejeitados", r.rejected.length === 2);
  expect("validatePlanos: asset_code obrigatorio",
    r.rejected.some((x) => x.errors.some((e) => e.includes("asset_code"))));
  expect("validatePlanos: frequency invalida",
    r.rejected.some((x) => x.errors.some((e) => e.includes("frequency"))));
}

// ===== Edge: planilha vazia =====
{
  const r = validateAtivos([]);
  expect("validateAtivos: array vazio retorna 0/0", r.valid.length === 0 && r.rejected.length === 0);
}

// ===== Edge: campos em maiusculas (cabecalho PT) =====
{
  const rows = [
    { CODIGO: "AT-100", NOME: "Chiller", LOCAL: "Site X > Pav 2", CRITICIDADE: "critica" }
  ];
  const r = validateAtivos(rows);
  expect("validateAtivos: aceita cabecalho PT em maiusculas",
    r.valid.length === 1 && r.valid[0].code === "AT-100");
}

if (failures > 0) {
  console.log(`\n${failures} teste(s) falharam.`);
  process.exit(1);
}
console.log("\nTodos os testes do importador passaram.");
