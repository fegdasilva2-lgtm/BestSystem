// Motor de medicao contratual.
// Puro (sem Dexie/browser) para permitir testes em Node.
//
// Conformes o estudo:
//  - Apuracao por posto + OS aprovada + escopo fixo + extras aprovados
//  - Glosa e desconto com justificativa rastreavel (imutavel apos aplicacao)
//  - Contestacao documentada pelo cliente
//  - Reajuste automatico por indice/data definidos no contrato
//  - Valor original preservado; ajustes sao eventos separados
//  - Versao imutavel apos aceite

// =====================================================================
// Tipos (JSDoc para autocomplete em IDEs)
// =====================================================================

/**
 * @typedef {Object} WorkOrderForMeasurement
 * @property {string} id
 * @property {string} contractId
 * @property {number} cost
 * @property {string} [contractItem]
 * @property {string} [approvedAt]    ISO; ausente = ainda nao aprovada
 * @property {string} [completedAt]   ISO
 * @property {string} [description]
 *
 * @typedef {Object} Posto
 * @property {string} id
 * @property {string} contractId
 * @property {string} name
 * @property {number} monthlyValue
 *
 * @typedef {Object} Contract
 * @property {string} id
 * @property {string} code
 * @property {string} startsOn
 * @property {string} [endsOn]
 * @property {number} monthlyValue
 * @property {string} [indexName]      IPCA | INPC | IGPM | CCT
 * @property {string} [indexDate]      ISO; data do proximo reajuste
 * @property {number} [lastIndexValue] Valor do indice no ultimo reajuste
 * @property {string} billingRule      Mensal por OS aprovada | Fixo + variavel por evento | Por item de contrato | Posto + extras aprovados
 *
 * @typedef {Object} Glosa
 * @property {string} id
 * @property {string} workOrderId
 * @property {number} amount
 * @property {string} reason
 * @property {string} appliedBy
 * @property {string} appliedAt        ISO
 *
 * @typedef {Object} Contestacao
 * @property {string} id
 * @property {string} measurementId
 * @property {number} amount
 * @property {string} reason
 * @property {string} raisedBy
 * @property {string} raisedAt
 * @property {string} [resolvedAt]
 * @property {"pendente"|"aceita"|"rejeitada"} status
 * @property {string} [resolution]
 */

// =====================================================================
// Helpers de data
// =====================================================================

function periodOf(iso) {
  return (iso ?? "").slice(0, 7); // "YYYY-MM"
}

function inPeriod(iso, period) {
  if (!iso) return false;
  return periodOf(iso) === period;
}

// =====================================================================
// 1) Apuracao da medicao do periodo
// =====================================================================

/**
 * Apura os itens de medicao de um contrato em um periodo.
 * @param {Object} args
 * @param {Contract} args.contract
 * @param {WorkOrderForMeasurement[]} args.workOrders
 * @param {Posto[]} args.postos
 * @param {string} args.period   "YYYY-MM"
 * @returns {{ items: Array, gross: number, discount: number, net: number, summary: object }}
 */
export function apurar({ contract, workOrders, postos, period }) {
  if (!contract) throw new Error("contrato obrigatorio");
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("periodo invalido (YYYY-MM)");

  const items = [];

  // a) Postos com valor fixo
  if (contract.billingRule === "Fixo + variavel por evento" ||
      contract.billingRule === "Posto + extras aprovados" ||
      contract.billingRule === "Mensal por OS aprovada") {
    const contractPostos = postos.filter((p) => p.contractId === contract.id);
    for (const posto of contractPostos) {
      items.push({
        kind: "posto",
        id: `posto-${posto.id}`,
        description: `Posto: ${posto.name}`,
        referenceId: posto.id,
        grossAmount: posto.monthlyValue,
        discountAmount: 0,
        discountReason: null,
        netAmount: posto.monthlyValue,
        workOrderId: null
      });
    }
  }

  // b) OS aprovadas no periodo
  const approvedWOs = workOrders.filter(
    (w) => w.contractId === contract.id && inPeriod(w.approvedAt, period)
  );
  for (const wo of approvedWOs) {
    items.push({
      kind: "work_order",
      id: `wo-${wo.id}`,
      description: `OS ${wo.id} - ${wo.contractItem ?? wo.description ?? ""}`.trim(),
      referenceId: wo.id,
      grossAmount: wo.cost,
      discountAmount: 0,
      discountReason: null,
      netAmount: wo.cost,
      workOrderId: wo.id
    });
  }

  // c) Escopo fixo do contrato (quando aplicavel)
  if (contract.billingRule === "Por item de contrato" && contract.monthlyValue > 0) {
    items.push({
      kind: "scope_fixed",
      id: "scope-fixed",
      description: `Escopo fixo mensal - contrato ${contract.code}`,
      referenceId: null,
      grossAmount: contract.monthlyValue,
      discountAmount: 0,
      discountReason: null,
      netAmount: contract.monthlyValue,
      workOrderId: null
    });
  }

  const gross = round2(items.reduce((s, i) => s + i.grossAmount, 0));
  const discount = round2(items.reduce((s, i) => s + i.discountAmount, 0));
  const net = round2(gross - discount);

  return {
    items,
    gross,
    discount,
    net,
    summary: {
      period,
      contractId: contract.id,
      workOrderCount: approvedWOs.length,
      postoCount: items.filter((i) => i.kind === "posto").length,
      computedAt: new Date().toISOString()
    }
  };
}

// =====================================================================
// 2) Aplicar glosa/desconto (imutavel apos insercao)
// =====================================================================

/**
 * Aplica uma glosa sobre um item especifico da medicao.
 * Nao modifica o item original; cria um evento separado.
 * @param {Object} args
 * @param {Array} args.items         resultado de apurar()
 * @param {string} args.itemId
 * @param {number} args.amount
 * @param {string} args.reason
 * @param {string} args.appliedBy
 * @returns {Array} novo array de items com glosa aplicada
 */
export function aplicarGlosa({ items, itemId, amount, reason, appliedBy }) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("valor de glosa invalido");
  if (!reason?.trim()) throw new Error("justificativa obrigatoria");

  const idx = items.findIndex((i) => i.id === itemId);
  if (idx < 0) throw new Error(`item ${itemId} nao encontrado`);

  const original = items[idx];
  if (amount > original.grossAmount) {
    throw new Error("glosa nao pode exceder o valor bruto do item");
  }

  const updated = {
    ...original,
    discountAmount: round2(original.discountAmount + amount),
    discountReason: original.discountReason
      ? `${original.discountReason} + ${reason}`
      : reason,
    netAmount: round2(original.grossAmount - (original.discountAmount + amount))
  };

  const next = items.slice();
  next[idx] = updated;
  return next;
}

export function totalizar(items) {
  return {
    gross: round2(items.reduce((s, i) => s + i.grossAmount, 0)),
    discount: round2(items.reduce((s, i) => s + i.discountAmount, 0)),
    net: round2(items.reduce((s, i) => s + i.netAmount, 0))
  };
}

// =====================================================================
// 3) Contestacao pelo cliente
// =====================================================================

/**
 * Cria uma contestacao sobre uma medicao.
 * @param {Object} args
 * @param {string} args.measurementId
 * @param {number} args.amount
 * @param {string} args.reason
 * @param {string} args.raisedBy
 * @returns {Contestacao}
 */
export function criarContestacao({ measurementId, amount, reason, raisedBy }) {
  if (!measurementId) throw new Error("measurementId obrigatorio");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("valor de contestacao invalido");
  if (!reason?.trim()) throw new Error("motivo obrigatorio");
  return {
    id: `ct-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    measurementId,
    amount,
    reason,
    raisedBy,
    raisedAt: new Date().toISOString(),
    status: "pendente"
  };
}

/**
 * Resolve uma contestacao (aceita ou rejeita).
 */
export function resolverContestacao(contestacao, status, resolution) {
  if (!["aceita", "rejeitada"].includes(status)) {
    throw new Error("status deve ser aceita ou rejeitada");
  }
  if (!resolution?.trim()) throw new Error("resolucao obrigatoria");
  return { ...contestacao, status, resolution, resolvedAt: new Date().toISOString() };
}

// =====================================================================
// 4) Aceite formal (imutavel apos concessao)
// =====================================================================

/**
 * Aplica o aceite formal da medicao. A partir deste ponto, os items
 * viram referencia imutavel para fins de faturamento.
 * @param {Object} args
 * @param {string} args.measurementId
 * @param {string} args.approvedBy
 * @param {Array} [args.contestacoes=[]]  contestacoes em aberto
 * @returns {{ accepted: true, measurementId, approvedAt, approvedBy, pendingContestacoes: Contestacao[] }}
 */
export function aceitarMedicao({ measurementId, approvedBy, contestacoes = [] }) {
  if (!measurementId) throw new Error("measurementId obrigatorio");
  if (!approvedBy) throw new Error("aprovador obrigatorio");
  const pending = contestacoes.filter((c) => c.status === "pendente");
  return {
    accepted: true,
    measurementId,
    approvedAt: new Date().toISOString(),
    approvedBy,
    pendingContestacoes: pending
  };
}

// =====================================================================
// 5) Reajuste automatico por indice
// =====================================================================

const INDEX_FACTORS = {
  IPCA:  { annual: 0.045 },  // exemplo 4.5% a.a.
  INPC:  { annual: 0.038 },
  IGPM:  { annual: 0.060 },
  CCT:   { annual: 0.050 }
};

/**
 * Calcula o valor mensal reajustado de um contrato.
 * @param {Object} args
 * @param {Contract} args.contract
 * @param {Date}   args.referenceDate
 * @param {Object} [args.indexOverrides] { IPCA: number, ... }
 * @returns {{ newMonthlyValue: number, adjustmentPct: number, applied: boolean, reason?: string }}
 */
export function calcularReajuste({ contract, referenceDate, indexOverrides = {} }) {
  if (!contract.indexName) {
    return { newMonthlyValue: contract.monthlyValue, adjustmentPct: 0, applied: false, reason: "sem_indice" };
  }
  if (!contract.indexDate) {
    return { newMonthlyValue: contract.monthlyValue, adjustmentPct: 0, applied: false, reason: "sem_data_reajuste" };
  }
  const due = new Date(contract.indexDate);
  if (referenceDate < due) {
    return { newMonthlyValue: contract.monthlyValue, adjustmentPct: 0, applied: false, reason: "fora_do_periodo" };
  }
  const factor = indexOverrides[contract.indexName] ?? INDEX_FACTORS[contract.indexName]?.annual;
  if (factor == null) {
    return { newMonthlyValue: contract.monthlyValue, adjustmentPct: 0, applied: false, reason: "indice_desconhecido" };
  }
  const months = monthsBetween(due, referenceDate);
  // Composto anual proporcional aos meses
  const ratio = Math.pow(1 + factor, months / 12);
  const newValue = round2(contract.monthlyValue * ratio);
  return {
    newMonthlyValue: newValue,
    adjustmentPct: round2((ratio - 1) * 100),
    applied: true,
    reason: `${contract.indexName} aplicado por ${months} meses`
  };
}

function monthsBetween(a, b) {
  const months = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return Math.max(0, months);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// =====================================================================
// 6) Status transitions (estudo: pre_enviada -> em_aceite -> aprovada)
// =====================================================================

export const MEASUREMENT_STATUS = {
  rascunho:    { next: ["pre_enviada", "cancelada"] },
  pre_enviada: { next: ["em_aceite", "rascunho"] },
  em_aceite:   { next: ["aprovada", "contestada"] },
  contestada:  { next: ["em_aceite", "aprovada"] },
  aprovada:    { next: ["faturada"] },
  faturada:    { next: ["paga"] },
  paga:        { next: [] }
};

export function canTransition(current, next) {
  return MEASUREMENT_STATUS[current]?.next?.includes(next) ?? false;
}
