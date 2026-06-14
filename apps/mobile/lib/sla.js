// Motor de SLA (Service Level Agreement).
// Puro, sem Dexie/browser. Recebe calendario + OS e devolve indicadores.
//
// Componentes do estudo:
//   - Calendario contratual (horario comercial, plantao, feriados)
//   - Metas por tipo/prioridade/criticidade
//   - Condicoes de pausa (aguardando cliente/material)
//   - Matriz de escalonamento em niveis
//   - Tempos: reconhecimento, mobilizacao, solucao
//   - Indicadores por contrato/periodo/equipe

const BR_HOLIDAYS_2026 = new Set([
  "2026-01-01", "2026-02-17", "2026-04-03", "2026-04-21",
  "2026-05-01", "2026-06-04", "2026-09-07", "2026-10-12",
  "2026-11-02", "2026-11-15", "2026-12-25"
]);

/**
 * @typedef {Object} Calendario
 * @property {number} aberturaMin       0-1439 (minutos do dia)
 * @property {number} fechamentoMin
 * @property {number[]} diasUteis        0-6 (dom=0)
 * @property {Set<string>} feriados
 * @property {boolean} plantao24h
 *
 * @typedef {Object} MetaSla
 * @property {string} priority          baixa|media|alta|critica
 * @property {number} reconhecimentoMin  tempo max ate primeiro contato
 * @property {number} mobilizacaoMin     tempo max ate chegada no local
 * @property {number} solucaoMin        tempo max ate conclusao
 * @property {Object[]} escalonamento   [{nivel, aposMin, papel, notificar}]
 *
 * @typedef {Object} EventoSla
 * @property {string} type               criado|aceito|deslocamento|iniciado|pausado|retomado|concluido
 * @property {string} at                 ISO timestamp
 * @property {string} [reason]           motivo da pausa: aguardando_cliente|aguardando_material|outro
 *
 * @typedef {Object} OcorrenciaSla
 * @property {string} id
 * @property {Calendario} calendario
 * @property {MetaSla} meta
 * @property {EventoSla[]} eventos
 *
 * @typedef {Object} ResultadoSla
 * @property {number} elapsedMinutes         tempo liquido (sem pausas)
 * @property {number} wallClockMinutes       tempo total (incluindo pausas)
 * @property {number} reconhecimentoMinutes  ate o primeiro evento relevante
 * @property {number} mobilizacaoMinutes     ate o evento "iniciado"
 * @property {Object[]} escalonamentos       niveis acionados
 * @property {boolean} cumprido              atende as metas?
 * @property {string[]} violacoes            descricao das violacoes
 */

const PAUSA_REASONS = new Set(["aguardando_cliente", "aguardando_material", "outro"]);

/**
 * Calcula o resultado de SLA para uma ocorrencia a partir dos eventos.
 */
export function calcularSla(ocorrencia) {
  if (!ocorrencia?.eventos?.length) {
    return { elapsedMinutes: 0, wallClockMinutes: 0, escalonamentos: [], cumprido: true, violacoes: ["sem_eventos"] };
  }
  const eventos = ocorrencia.eventos.slice().sort((a, b) => new Date(a.at) - new Date(b.at));
  const meta = ocorrencia.meta;
  const cal = ocorrencia.calendario;

  // 1) Janela de negocio entre dois eventos
  const businessMinutes = (start, end) => {
    if (end <= start) return 0;
    let cur = new Date(start);
    let total = 0;
    while (cur < end) {
      const dayKey = cur.toISOString().slice(0, 10);
      const dow = cur.getUTCDay();
      const isHoliday = cal.feriados?.has?.(dayKey) ?? false;
      const isBusiness = cal.plantao24h || (cal.diasUteis.includes(dow) && !isHoliday);
      if (isBusiness) {
        const minutesOfDay = cur.getUTCHours() * 60 + cur.getUTCMinutes();
        const open = cal.aberturaMin;
        const close = cal.fechamentoMin;
        if (cal.plantao24h || (minutesOfDay >= open && minutesOfDay < close)) {
          total += 1;
        }
      }
      cur = new Date(cur.getTime() + 60_000); // +1 min
    }
    return total;
  };

  // 2) Tempo liquido (subtraindo pausas) e tempo total (wall clock)
  let elapsed = 0;
  let wallClock = 0;
  let active = true;           // assume-se "rodando" desde o comeco
  let prevTime = null;
  for (const ev of eventos) {
    const t = new Date(ev.at);
    if (prevTime) {
      const dt = (t - prevTime) / 60_000;
      wallClock += dt;
      if (active) elapsed += businessMinutes(prevTime, t);
    }
    if (ev.type === "pausado") active = false;
    else if (ev.type === "retomado") active = true;
    prevTime = t;
  }
  // Janela final: se a OS ainda nao foi concluida, conta ate "agora"
  const last = eventos[eventos.length - 1];
  const terminalStates = new Set(["concluido", "cancelada", "encerrada", "aprovada"]);
  if (active && prevTime && last && !terminalStates.has(last.type)) {
    elapsed += businessMinutes(prevTime, new Date());
  }

  // 3) Reconhecimento: criacao -> primeiro evento de "resposta" (aceito/iniciado)
  const ACKNOWLEDGE_EVENTS = new Set(["aceito", "iniciado"]);
  let reconhecimento = 0;
  for (let i = 0; i < eventos.length - 1; i++) {
    if (eventos[i].type === "criado" && ACKNOWLEDGE_EVENTS.has(eventos[i + 1].type)) {
      reconhecimento = businessMinutes(new Date(eventos[i].at), new Date(eventos[i + 1].at));
      break;
    }
  }

  // 4) Mobilizacao: criacao -> "iniciado" (ou "em_deslocamento" + 5 min)
  let mobilizacao = 0;
  const startEv = eventos.find((e) => e.type === "iniciado" || e.type === "em_deslocamento");
  if (startEv) {
    const criado = eventos.find((e) => e.type === "criado");
    if (criado) mobilizacao = businessMinutes(new Date(criado.at), new Date(startEv.at));
  }

  // 5) Escalonamentos: para cada nivel, verifica se elapsed > meta.aposMin
  const escalonamentos = [];
  if (Array.isArray(meta.escalonamento)) {
    for (const nivel of meta.escalonamento) {
      if (elapsed > nivel.aposMin) {
        escalonamentos.push(nivel);
      }
    }
  }

  // 6) Cumprimento
  const violacoes = [];
  if (reconhecimento > meta.reconhecimentoMin) {
    violacoes.push(`reconhecimento: ${reconhecimento}min > meta ${meta.reconhecimentoMin}min`);
  }
  if (mobilizacao > meta.mobilizacaoMin) {
    violacoes.push(`mobilizacao: ${mobilizacao}min > meta ${meta.mobilizacaoMin}min`);
  }
  if (elapsed > meta.solucaoMin) {
    violacoes.push(`solucao: ${elapsed}min > meta ${meta.solucaoMin}min`);
  }
  const cumprido = violacoes.length === 0;

  return {
    elapsedMinutes: Math.round(elapsed),
    wallClockMinutes: Math.round(wallClock),
    reconhecimentoMinutes: Math.round(reconhecimento),
    mobilizacaoMinutes: Math.round(mobilizacao),
    escalonamentos,
    cumprido,
    violacoes
  };
}

/**
 * Calendario comercial padrao: seg-sex 08:00-18:00, sem plantao.
 */
export function calendarioComercial() {
  return {
    aberturaMin: 8 * 60,
    fechamentoMin: 18 * 60,
    diasUteis: [1, 2, 3, 4, 5],
    feriados: new Set(BR_HOLIDAYS_2026),
    plantao24h: false
  };
}

/**
 * Calendario 24x7 com suporte a emergencias.
 */
export function calendarioPlantao() {
  return {
    aberturaMin: 0,
    fechamentoMin: 24 * 60,
    diasUteis: [0, 1, 2, 3, 4, 5, 6],
    feriados: new Set(BR_HOLIDAYS_2026),
    plantao24h: true
  };
}

/**
 * Tabela de metas default por prioridade.
 */
export function metasDefault() {
  return {
    baixa: {
      priority: "baixa",
      reconhecimentoMin: 8 * 60,
      mobilizacaoMin: 24 * 60,
      solucaoMin: 72 * 60,
      escalonamento: [
        { nivel: 1, aposMin: 24 * 60, papel: "supervisor", notificar: ["email"] }
      ]
    },
    media: {
      priority: "media",
      reconhecimentoMin: 4 * 60,
      mobilizacaoMin: 12 * 60,
      solucaoMin: 24 * 60,
      escalonamento: [
        { nivel: 1, aposMin: 12 * 60, papel: "supervisor", notificar: ["email"] },
        { nivel: 2, aposMin: 24 * 60, papel: "gestor_facilities", notificar: ["email", "push"] }
      ]
    },
    alta: {
      priority: "alta",
      reconhecimentoMin: 1 * 60,
      mobilizacaoMin: 4 * 60,
      solucaoMin: 8 * 60,
      escalonamento: [
        { nivel: 1, aposMin: 4 * 60,  papel: "supervisor",        notificar: ["email", "push"] },
        { nivel: 2, aposMin: 8 * 60,  papel: "gestor_facilities", notificar: ["email", "push", "sms"] }
      ]
    },
    critica: {
      priority: "critica",
      reconhecimentoMin: 15,
      mobilizacaoMin: 1 * 60,
      solucaoMin: 2 * 60,
      escalonamento: [
        { nivel: 1, aposMin: 30,    papel: "supervisor",        notificar: ["email", "push", "sms"] },
        { nivel: 2, aposMin: 1 * 60, papel: "gestor_facilities", notificar: ["email", "push", "sms"] },
        { nivel: 3, aposMin: 2 * 60, papel: "admin_org",         notificar: ["email", "push", "sms", "telefone"] }
      ]
    }
  };
}

/**
 * Resumo de SLA por periodo para um conjunto de ocorrencias.
 * @param {OcorrenciaSla[]} ocorrencias
 * @returns {{
 *   total: number, cumpridas: number, violadas: number, compliancePct: number,
 *   mttrMin: number, mttrMaxMin: number, escalonamentosTotais: number,
 *   porPrioridade: Record<string, {total: number, cumpridas: number, mttrMin: number}>
 * }}
 */
export function resumoSla(ocorrencias) {
  const totais = { total: 0, cumpridas: 0, violadas: 0, somaElapsed: 0, maxElapsed: 0, escalonamentos: 0 };
  const porPrioridade = {};
  for (const oc of ocorrencias) {
    const r = calcularSla(oc);
    totais.total += 1;
    totais.cumpridas += r.cumprido ? 1 : 0;
    totais.violadas += r.cumprido ? 0 : 1;
    totais.somaElapsed += r.elapsedMinutes;
    if (r.elapsedMinutes > totais.maxElapsed) totais.maxElapsed = r.elapsedMinutes;
    totais.escalonamentos += r.escalonamentos.length;
    const p = oc.meta.priority;
    if (!porPrioridade[p]) porPrioridade[p] = { total: 0, cumpridas: 0, somaElapsed: 0 };
    porPrioridade[p].total += 1;
    if (r.cumprido) porPrioridade[p].cumpridas += 1;
    porPrioridade[p].somaElapsed += r.elapsedMinutes;
  }
  const compliancePct = totais.total ? (totais.cumpridas / totais.total) * 100 : 0;
  const mttrMin = totais.total ? totais.somaElapsed / totais.total : 0;
  const porPrioridadeOut = {};
  for (const [k, v] of Object.entries(porPrioridade)) {
    porPrioridadeOut[k] = {
      total: v.total,
      cumpridas: v.cumpridas,
      mttrMin: v.total ? v.somaElapsed / v.total : 0
    };
  }
  return {
    total: totais.total,
    cumpridas: totais.cumpridas,
    violadas: totais.violadas,
    compliancePct,
    mttrMin,
    mttrMaxMin: totais.maxElapsed,
    escalonamentosTotais: totais.escalonamentos,
    porPrioridade: porPrioridadeOut
  };
}

/**
 * Constroi um evento de SLA a partir de uma OS do banco.
 * @param {Object} wo
 * @param {string} [calendarioTipo=comercial]
 */
export function eventosFromWorkOrder(wo, calendarioTipo = "comercial") {
  const evs = [];
  if (wo.created_at) evs.push({ type: "criado", at: wo.created_at });
  if (wo.started_at) evs.push({ type: "iniciado", at: wo.started_at });
  if (wo.completed_at) evs.push({ type: "concluido", at: wo.completed_at });
  return evs;
}
