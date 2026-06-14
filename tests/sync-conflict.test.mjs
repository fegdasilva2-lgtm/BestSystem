// Testes puros para a logica de concorrencia offline:
//   - idempotency key generation (unicidade temporal)
//   - LWW (last-write-wins) entre versoes
//   - ordenacao FIFO do outbox
//   - deteccao de conflito de WO cancelada durante execucao offline

import {
  newIdempotencyKey,
  resolveConflict,
  detectServerCancellation,
  checkDuplicate,
  resolvePhotoConflict,
  sortOutboxByCreated
} from "../apps/mobile/lib/conflict.js";

let failures = 0;
function expect(name, cond, detail = "") {
  if (cond) console.log("ok   - " + name);
  else { console.log("FAIL - " + name + (detail ? ` :: ${detail}` : "")); failures += 1; }
}

// =====================================================================
// 1) Idempotency key
// =====================================================================

{
  const a = newIdempotencyKey("wo");
  const b = newIdempotencyKey("wo");
  expect("idempotencyKey: prefix presente", a.startsWith("wo_"));
  expect("idempotencyKey: 2 chamadas produzem chaves diferentes", a !== b);
}
{
  const keys = new Set();
  for (let i = 0; i < 100; i++) keys.add(newIdempotencyKey("test"));
  expect("idempotencyKey: 100 chaves geradas sao unicas", keys.size === 100);
}

// =====================================================================
// 2) LWW: servidor prevalece em caso de versao diferente
// =====================================================================

{
  const r = resolveConflict(
    { id: "OS-1", status: "em_execucao", version: 3 },
    { id: "OS-1", status: "atribuida",   version: 4 }
  );
  expect("LWW: server mais novo vence", r.winner === "server");
}
{
  const r = resolveConflict(
    { id: "OS-1", status: "concluida_tecnico", version: 5 },
    { id: "OS-1", status: "cancelada",          version: 4 }
  );
  expect("Conflito: concluida vs cancelada -> supervisor",
    r.winner === "supervisor" && r.reason === "concluida_vs_cancelada");
}
{
  const r = resolveConflict(
    { id: "OS-1", status: "em_execucao", version: 4 },
    { id: "OS-1", status: "em_execucao", version: 3 }
  );
  expect("LWW: local mais novo vence", r.winner === "local");
}

// =====================================================================
// 3) Outbox FIFO
// =====================================================================

{
  const outbox = [
    { id: 1, createdAt: 100, payload: "A" },
    { id: 2, createdAt: 200, payload: "B" },
    { id: 3, createdAt: 150, payload: "C" }
  ];
  const result = sortOutboxByCreated(outbox);
  expect("FIFO: ordem por createdAt (A=100, C=150, B=200)",
    result[0].id === 1 && result[1].id === 3 && result[2].id === 2);
}

// =====================================================================
// 4) Deteccao de OS cancelada durante execucao offline
// =====================================================================

{
  const r = detectServerCancellation({ id: "OS-1", status: "concluida_tecnico" }, "cancelada");
  expect("Deteccao: conclusao offline vs cancelada no servidor -> bloqueado",
    r.blocked && r.reason === "os_cancelada_durante_execucao");
}
{
  const r = detectServerCancellation({ id: "OS-1", status: "em_execucao" }, "cancelada");
  expect("Deteccao: em_execucao vs cancelada -> passa (supervisor decide)",
    !r.blocked);
}

// =====================================================================
// 5) Idempotencia no POST: o backend deve rejeitar duplicatas
// =====================================================================

{
  const existing = { id: "WO-1", idempotency_key: "wo_123_abc" };
  const incoming = { idempotency_key: "wo_123_abc", data: "X" };
  const r = checkDuplicate(existing, incoming);
  expect("Idempotencia: mesma chave -> duplicata", r.duplicate);
}
{
  const existing = { id: "WO-1", idempotency_key: "wo_123_abc" };
  const incoming = { idempotency_key: "wo_456_def", data: "Y" };
  const r = checkDuplicate(existing, incoming);
  expect("Idempotencia: chaves diferentes -> nao duplicata", !r.duplicate);
}

// =====================================================================
// 6) Conflito em fotos: edicoes concorrentes no mesmo WO
// =====================================================================

{
  const local  = [{ id: "p1", capturedAt: 100 }, { id: "p2", capturedAt: 200 }];
  const server = [{ id: "p1", capturedAt: 100 }, { id: "p3", capturedAt: 150 }];
  const merged = resolvePhotoConflict(local, server);
  expect("Fotos: merge preserva todas (3 unicas)",
    merged.length === 3 && merged.map(p => p.id).join(",") === "p1,p3,p2");
}

if (failures > 0) {
  console.log(`\n${failures} teste(s) falharam.`);
  process.exit(1);
}
console.log("\nTodos os testes de conflito offline passaram.");
