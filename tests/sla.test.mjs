// Testes do motor de SLA.
// Roda com: node tests/sla.test.mjs

import {
  calcularSla,
  calendarioComercial,
  calendarioPlantao,
  metasDefault,
  resumoSla
} from "../apps/mobile/lib/sla.js";

let failures = 0;
function expect(name, cond, detail = "") {
  if (cond) console.log("ok   - " + name);
  else { console.log("FAIL - " + name + (detail ? ` :: ${detail}` : "")); failures += 1; }
}

// =====================================================================
// 1) Calendario comercial basico
// =====================================================================
{
  const cal = calendarioComercial();
  expect("calendarioComercial: abre as 8h", cal.aberturaMin === 480);
  expect("calendarioComercial: fecha as 18h", cal.fechamentoMin === 1080);
  expect("calendarioComercial: 5 dias uteis", cal.diasUteis.length === 5);
  expect("calendarioComercial: 11 feriados em 2026", cal.feriados.size === 11);
}

// =====================================================================
// 2) Calendario plantao
// =====================================================================
{
  const cal = calendarioPlantao();
  expect("calendarioPlantao: 24h", cal.plantao24h === true);
  expect("calendarioPlantao: 7 dias", cal.diasUteis.length === 7);
}

// =====================================================================
// 3) Metas default por prioridade
// =====================================================================
{
  const m = metasDefault();
  expect("metas: prioridade critica tem 3 escalonamentos", m.critica.escalonamento.length === 3);
  expect("metas: prioridade baixa tem 1 escalonamento", m.baixa.escalonamento.length === 1);
  expect("metas: prioridade alta mobilizacao 4h", m.alta.mobilizacaoMin === 240);
}

// =====================================================================
// 4) SLA cumprido (criado -> concluido dentro da meta)
// =====================================================================
{
  const cal = calendarioComercial();
  const meta = metasDefault().baixa;
  // Segunda 10:00 -> Segunda 14:00 = 4h uteis (cumpre 72h)
  const oc = {
    id: "OS-1", calendario: cal, meta,
    eventos: [
      { type: "criado",   at: "2026-01-05T10:00:00Z" },
      { type: "iniciado", at: "2026-01-05T11:00:00Z" },
      { type: "concluido", at: "2026-01-05T14:00:00Z" }
    ]
  };
  const r = calcularSla(oc);
  expect("SLA baixa: cumprido em 4h", r.cumprido, `violacoes=${r.violacoes.join("|")}`);
  expect("SLA baixa: elapsed ~4h = 240min", Math.abs(r.elapsedMinutes - 240) <= 5,
    `got ${r.elapsedMinutes}`);
}

// =====================================================================
// 5) SLA violado por solucao
// =====================================================================
{
  const cal = calendarioComercial();
  const meta = metasDefault().critica;  // 2h solucao
  // Segunda 10:00 -> Terca 11:00 (descartando fora de horario) = ~8h
  const oc = {
    id: "OS-2", calendario: cal, meta,
    eventos: [
      { type: "criado",   at: "2026-01-05T10:00:00Z" },
      { type: "iniciado", at: "2026-01-05T10:15:00Z" },
      { type: "concluido", at: "2026-01-06T11:00:00Z" }  // 8h uteis (excluindo 2o turno do dia 1 e noite)
    ]
  };
  const r = calcularSla(oc);
  expect("SLA critica: violado (8h > 2h)", !r.cumprido);
  expect("SLA critica: tem violacao de solucao", r.violacoes.some((v) => v.startsWith("solucao")));
}

// =====================================================================
// 6) Pausa desconta do tempo liquido
// =====================================================================
{
  const cal = calendarioComercial();
  const meta = metasDefault().critica;  // 2h
  const oc = {
    id: "OS-3", calendario: cal, meta,
    eventos: [
      { type: "criado",   at: "2026-01-05T10:00:00Z" },
      { type: "iniciado", at: "2026-01-05T10:15:00Z" },
      { type: "pausado",  at: "2026-01-05T10:30:00Z", reason: "aguardando_material" },
      { type: "retomado", at: "2026-01-05T13:30:00Z" },  // 3h de pausa
      { type: "concluido", at: "2026-01-05T13:45:00Z" }   // 15min apos retomar
    ]
  };
  const r = calcularSla(oc);
  // Tempo liquido: 15min (criado->iniciado) + 15min (iniciado->pausado) + 15min (retomado->concluido) = 45min
  expect("SLA com pausa: elapsed desconta a pausa", r.elapsedMinutes === 45,
    `got ${r.elapsedMinutes}`);
  expect("SLA com pausa: wallClock = 3h45min = 225min", r.wallClockMinutes === 225,
    `got ${r.wallClockMinutes}`);
  expect("SLA com pausa: cumprido (30min < 2h)", r.cumprido);
}

// =====================================================================
// 7) Escalonamento aciona em mais de um nivel
// =====================================================================
{
  const cal = calendarioComercial();
  const meta = metasDefault().critica;
  const oc = {
    id: "OS-4", calendario: cal, meta,
    eventos: [
      { type: "criado",   at: "2026-01-05T10:00:00Z" },
      { type: "concluido", at: "2026-01-05T13:00:00Z" }  // 3h
    ]
  };
  const r = calcularSla(oc);
  expect("SLA critica 3h: escalonamentos >= 2", r.escalonamentos.length >= 2,
    `got ${r.escalonamentos.length}`);
}

// =====================================================================
// 8) Reconhecimento rapido
// =====================================================================
{
  const cal = calendarioComercial();
  const meta = metasDefault().critica;  // 15min reconhecimento
  const oc = {
    id: "OS-5", calendario: cal, meta,
    eventos: [
      { type: "criado",   at: "2026-01-05T10:00:00Z" },
      { type: "iniciado", at: "2026-01-05T10:10:00Z" }
    ]
  };
  const r = calcularSla(oc);
  expect("SLA critica: reconhecimento = 10min <= 15min", r.reconhecimentoMinutes === 10);
  expect("SLA critica: sem violacao de reconhecimento", !r.violacoes.some(v => v.startsWith("reconhecimento")));
}

// =====================================================================
// 9) Feriado e fim de semana nao contam
// =====================================================================
{
  const cal = calendarioComercial();
  const meta = metasDefault().baixa;  // 72h
  // Criado sexta 17:00 -> concluido quarta 11:00 (4 dias uteis = ~30h)
  const oc = {
    id: "OS-6", calendario: cal, meta,
    eventos: [
      { type: "criado",   at: "2026-01-09T17:00:00Z" },  // sexta
      { type: "concluido", at: "2026-01-14T11:00:00Z" }   // quarta
    ]
  };
  const r = calcularSla(oc);
  // Sexta 17:00 encerra contagem (saímos do horário).
  // Sab/dom = 0. Seg 8-18 = 10h. Ter 8-18 = 10h. Qua 8-11 = 3h. Total = 24h = 1440min.
  // Cumprido: 24h < 72h (meta baixa).
  expect("SLA respeita fim de semana: elapsed = 1440min (24h uteis)", r.elapsedMinutes === 1440,
    `got ${r.elapsedMinutes}`);
  expect("SLA respeita fim de semana: cumprido (24h < 72h)", r.cumprido);
}

// =====================================================================
// 10) Calendario 24x7 (plantao) - conta fim de semana
// =====================================================================
{
  const cal = calendarioPlantao();
  const meta = metasDefault().critica;  // 2h
  const oc = {
    id: "OS-7", calendario: cal, meta,
    eventos: [
      { type: "criado",   at: "2026-01-10T22:00:00Z" },  // sabado
      { type: "concluido", at: "2026-01-11T01:00:00Z" }   // domingo 1h
    ]
  };
  const r = calcularSla(oc);
  expect("Plantao 24x7: elapsed = 3h (sab 22h->dom 1h)", r.elapsedMinutes === 180,
    `got ${r.elapsedMinutes}`);
  expect("Plantao 24x7: cumprido (3h > 2h meta) -> violado", !r.cumprido);
}

// =====================================================================
// 11) Resumo
// =====================================================================
{
  const cal = calendarioComercial();
  const meta = metasDefault();
  const ocorrencias = [
    { id: "1", calendario: cal, meta: meta.baixa, eventos: [
      { type: "criado",   at: "2026-01-05T10:00:00Z" },
      { type: "concluido", at: "2026-01-05T14:00:00Z" }
    ]},
    { id: "2", calendario: cal, meta: meta.critica, eventos: [
      { type: "criado",   at: "2026-01-05T10:00:00Z" },
      { type: "concluido", at: "2026-01-05T13:00:00Z" }  // violado
    ]},
    { id: "3", calendario: cal, meta: meta.media, eventos: [
      { type: "criado",   at: "2026-01-05T10:00:00Z" },
      { type: "concluido", at: "2026-01-05T15:00:00Z" }
    ]}
  ];
  const r = resumoSla(ocorrencias);
  expect("Resumo: total 3", r.total === 3);
  expect("Resumo: violadas 1 (critica)", r.violadas === 1);
  expect("Resumo: cumpridas 2", r.cumpridas === 2);
  expect("Resumo: compliancePct = 66.66", Math.round(r.compliancePct) === 67);
  expect("Resumo: porPrioridade.critica.total = 1", r.porPrioridade.critica?.total === 1);
  expect("Resumo: porPrioridade.critica.cumpridas = 0", r.porPrioridade.critica?.cumpridas === 0);
}

// =====================================================================
// 12) Sem eventos
// =====================================================================
{
  const oc = { id: "X", calendario: calendarioComercial(), meta: metasDefault().baixa, eventos: [] };
  const r = calcularSla(oc);
  expect("SLA sem eventos: sem violacoes (early return)", r.violacoes[0] === "sem_eventos");
}

if (failures > 0) {
  console.log(`\n${failures} teste(s) falharam.`);
  process.exit(1);
}
console.log("\nTodos os testes do motor de SLA passaram.");
