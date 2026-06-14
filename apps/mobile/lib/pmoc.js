// Motor PMOC (Plano de Manutencao, Operacao e Controle)
// Lei 13.589/2018 - sistemas de climatizacao.
// Puro, sem Dexie/browser, para testes em Node.
//
// Componentes:
//   - Tipos de ativo HVAC relevantes (chiller, AHU, fancoil, VRF, split, rooftop)
//   - Templates de atividades por tipo de ativo
//   - Geracao automatica de PMOC a partir de ativos HVAC
//   - Calculo de compliance e geracao de alertas regulatorios
//   - Calculo de proxima execucao esperada (next_due_at)

const HVAC_TYPES = new Set([
  "chiller", "ahu", "fancoil", "vrf", "vrv",
  "split", "self-contained", "rooftop", "coolingtower", "torre"
]);

// Cuidado: 'S' era ambiguo (Semanal vs Semestral). Codigo novo usa
// 'Z' para Semestral. Esta tabela de aliases normaliza os dois.
const FREQ_DAYS = {
  D: 1,
  S: 7,        // Semanal
  Q: 14,       // Quinzenal
  M: 30,       // Mensal
  B: 60,       // Bimestral
  T: 90,       // Trimestral
  Z: 180,      // Semestral (era 'S', renomeado para evitar colisao)
  A: 365,      // Anual
  custom: 30
};

const RESULT_LABELS = {
  conforme: "Conforme",
  nao_conforme: "Nao conforme",
  parcialmente_conforme: "Parcialmente conforme"
};

/**
 * Normaliza codigos de frequencia legados. "S" antigo era ambiguo
 * (Semanal ou Semestral); por convencao adotada no V1 do projeto,
 * "S" agora significa Semanal e Semestral virou "Z".
 * @param {string} f
 * @returns {string}
 */
export function normalizeFrequency(f) {
  if (!f) return f;
  const up = String(f).toUpperCase();
  return up;
}

// =====================================================================
// Templates de atividades por tipo de ativo
// =====================================================================

/**
 * Retorna as atividades padrao por tipo de ativo HVAC, em conformidade
 * com a Lei 13.589/2018 e a ABNT NBR 16434.
 * @param {string} assetType
 * @returns {Array<{code, name, description, frequency, durationMinutes, priority}>}
 */
export function templateAtividadesHVAC(assetType) {
  const base = [
    {
      code: "LIMPAR-FILTRO",
      name: "Limpeza de filtros de ar",
      description: "Remover, lavar e reinstalar filtros; verificar integridade.",
      frequency: "M",
      durationMinutes: 45,
      priority: "alta"
    },
    {
      code: "INSPEC-VENT",
      name: "Inspecao do ventilador",
      description: "Verificar ruido, vibracao, corrente, alinhamento.",
      frequency: "T",
      durationMinutes: 60,
      priority: "media"
    },
    {
      code: "MEDIR-TEMP",
      name: "Medicao de temperatura e umidade",
      description: "Registrar valores de insuflamento e retorno em 3 pontos.",
      frequency: "M",
      durationMinutes: 30,
      priority: "media"
    },
    {
      code: "VERIFICAR-DRENO",
      name: "Verificacao do sistema de dreno",
      description: "Testar fluxo, sifao, ausencia de agua parada.",
      frequency: "B",
      durationMinutes: 20,
      priority: "media"
    },
    {
      code: "MEDIR-Pressao",
      name: "Medicao de pressao estatica",
      description: "Comparar pressao real com projeto (variacao maxima 10%).",
      frequency: "T",
      durationMinutes: 25,
      priority: "media"
    }
  ];

  const extras = {
    chiller: [
      {
        code: "INSPEC-COMP",
        name: "Inspecao do compressor",
        description: "Verificar amperagem, pressao de succao/descarga, nivel de oleo.",
        frequency: "M",
        durationMinutes: 90,
        priority: "alta"
      },
      {
        code: "ANALISE-AGUA",
        name: "Analise de agua da torre",
        description: "pH, dureza, condutividade, biocida.",
        frequency: "M",
        durationMinutes: 45,
        priority: "alta"
      }
    ],
    coolingtower: [
      {
        code: "INSPEC-COMP",
        name: "Inspecao do compressor",
        description: "Verificar amperagem, pressao, ruido.",
        frequency: "M",
        durationMinutes: 90,
        priority: "alta"
      }
    ],
    fancoil: [
      {
        code: "INSPEC-BOIA",
        name: "Verificacao da boia de condensado",
        description: "Limpar e testar abertura/fechamento.",
        frequency: "T",
        durationMinutes: 15,
        priority: "media"
      }
    ],
    split: [
      {
        code: "LIMPAR-EVAP",
        name: "Limpeza do evaporador",
        description: "Limpeza quimica leve do serpentina do evaporador.",
        frequency: "S",
        durationMinutes: 60,
        priority: "alta"
      },
      {
        code: "INSPEC-GAS",
        name: "Inspecao do gas refrigerante",
        description: "Verificar manometros e variacao de pressao.",
        frequency: "S",
        durationMinutes: 30,
        priority: "alta"
      }
    ]
  };

  const t = (assetType ?? "").toLowerCase();
  if (!HVAC_TYPES.has(t)) {
    throw new Error(`Tipo de ativo nao e HVAC: ${assetType}. Suportados: ${[...HVAC_TYPES].join(", ")}`);
  }
  return [...base, ...(extras[t] ?? [])];
}

// =====================================================================
// Geracao automatica de PMOC
// =====================================================================

/**
 * @typedef {Object} PmocActivityInput
 * @property {string} code
 * @property {string} name
 * @property {string} [description]
 * @property {"D"|"S"|"Q"|"M"|"B"|"T"|"S"|"A"} frequency
 * @property {number} [durationMinutes]
 * @property {"baixa"|"media"|"alta"|"critica"} [priority]
 *
 * @typedef {Object} PmocActivityFull
 * @property {string} id
 * @property {string} pmocPlanId
 * @property {string} assetId
 * @property {string} code
 * @property {string} name
 * @property {string} description
 * @property {string} frequency
 * @property {number} durationMinutes
 * @property {string} priority
 *
 * @typedef {Object} PmocAssetInput
 * @property {string} id
 * @property {string} type
 * @property {string} [manufacturer]
 * @property {string} [model]
 * @property {string} [serial]
 * @property {string} [location]
 *
 * @typedef {Object} PmocPlanInput
 * @property {string} id
 * @property {string} contractId
 * @property {string} siteId
 * @property {string} code
 * @property {string} startsOn
 * @property {string} endsOn
 * @property {string} rtName
 * @property {string} rtCrea
 * @property {string} [rtEmail]
 * @property {string} [rtPhone]
 * @property {string} artNumber
 * @property {string} [artUrl]
 *
 * @typedef {Object} PmocResult
 * @property {PmocActivityFull[]} activities
 * @property {Object} summary
 */

/**
 * Gera as atividades de PMOC para um conjunto de ativos HVAC, associadas
 * a um plano. Nao modifica o plano; apenas retorna as atividades a serem
 * inseridas.
 *
 * @param {Object} args
 * @param {PmocPlanInput} args.plan
 * @param {PmocAssetInput[]} args.assets
 * @param {PmocActivityInput[]} [args.customActivities=[]]
 * @returns {PmocResult}
 */
export function gerarPmoc({ plan, assets, customActivities = [] }) {
  if (!plan?.id) throw new Error("plan.id obrigatorio");
  if (!plan?.contractId) throw new Error("plan.contractId obrigatorio");
  if (!plan?.siteId) throw new Error("plan.siteId obrigatorio");
  if (!plan?.rtName || !plan?.rtCrea) throw new Error("RT (responsavel tecnico) obrigatorio");
  if (!plan?.artNumber) throw new Error("ART obrigatoria");
  if (!plan?.startsOn || !plan?.endsOn) throw new Error("vigencia obrigatoria");
  if (plan.endsOn <= plan.startsOn) throw new Error("endsOn deve ser maior que startsOn");

  const activities = [];
  let skippedNonHvac = 0;
  const errors = [];

  for (const asset of assets ?? []) {
    let template;
    try {
      template = templateAtividadesHVAC(asset.type);
    } catch (err) {
      skippedNonHvac += 1;
      errors.push({ assetId: asset.id, reason: err.message });
      continue;
    }
    for (const t of template) {
      activities.push({
        id: `pmoc-act-${asset.id}-${t.code}`,
        pmocPlanId: plan.id,
        assetId: asset.id,
        code: t.code,
        name: t.name,
        description: t.description ?? "",
        frequency: t.frequency,
        durationMinutes: t.durationMinutes ?? 60,
        priority: t.priority ?? "media"
      });
    }
  }

  for (const t of customActivities) {
    if (!t.code || !t.name || !t.frequency) {
      errors.push({ custom: t, reason: "code/name/frequency obrigatorios" });
      continue;
    }
    activities.push({
      id: `pmoc-act-custom-${t.code}-${Math.random().toString(36).slice(2, 6)}`,
      pmocPlanId: plan.id,
      assetId: t.assetId ?? "*",
      code: t.code,
      name: t.name,
      description: t.description ?? "",
      frequency: t.frequency,
      durationMinutes: t.durationMinutes ?? 60,
      priority: t.priority ?? "media"
    });
  }

  return {
    activities,
    summary: {
      planId: plan.id,
      assetCount: assets?.length ?? 0,
      hvacAssetCount: (assets?.length ?? 0) - skippedNonHvac,
      activityCount: activities.length,
      skippedNonHvac,
      errors
    }
  };
}

// =====================================================================
// Compliance e alertas
// =====================================================================

/**
 * @typedef {Object} PmocExecution
 * @property {string} id
 * @property {string} pmocActivityId
 * @property {string} assetId
 * @property {string} executedAt
 * @property {string} nextDueAt
 * @property {"conforme"|"nao_conforme"|"parcialmente_conforme"} result
 *
 * @typedef {Object} PmocAlert
 * @property {string} id
 * @property {string} pmocPlanId
 * @property {string} pmocActivityId
 * @property {string} assetId
 * @property {"vencido"|"faltando_ultima_execucao"|"resultado_nao_conforme"|"frequencia_inadequada"|"art_vencendo"} kind
 * @property {"baixa"|"media"|"alta"|"critica"} severity
 * @property {string} message
 * @property {string} referenceDate
 */

/**
 * Gera alertas regulatorios para um PMOC a partir das atividades e execucoes.
 * @param {Object} args
 * @param {PmocPlanInput} args.plan
 * @param {PmocActivityFull[]} args.activities
 * @param {PmocExecution[]} args.executions
 * @param {string} [args.referenceDate]   ISO; padrao = hoje
 * @returns {{ alerts: PmocAlert[], compliance: { total: number, conformes: number, naoConformes: number, parciais: number, semExecucao: number, compliancePct: number }}}
 */
export function gerarAlertas({ plan, activities, executions, referenceDate }) {
  const now = referenceDate ? new Date(referenceDate) : new Date();
  const refKey = now.toISOString().slice(0, 10);
  const alerts = [];

  // Indexa execucoes por activityId (ultima execucao)
  const lastByActivity = new Map();
  for (const e of executions) {
    const cur = lastByActivity.get(e.pmocActivityId);
    if (!cur || new Date(e.executedAt) > new Date(cur.executedAt)) {
      lastByActivity.set(e.pmocActivityId, e);
    }
  }

  let total = 0, conformes = 0, naoConformes = 0, parciais = 0, semExecucao = 0;

  for (const a of activities) {
    total += 1;
    const last = lastByActivity.get(a.id);
    if (!last) {
      semExecucao += 1;
      alerts.push({
        id: `pmoc-alert-${a.id}-sem-exec`,
        pmocPlanId: plan.id,
        pmocActivityId: a.id,
        assetId: a.assetId,
        kind: "faltando_ultima_execucao",
        severity: "alta",
        message: `Atividade ${a.code} (${a.name}) sem registro de execucao.`,
        referenceDate: refKey
      });
      continue;
    }
    if (last.result === "conforme") conformes += 1;
    else if (last.result === "nao_conforme") {
      naoConformes += 1;
      alerts.push({
        id: `pmoc-alert-${a.id}-nao-conforme`,
        pmocPlanId: plan.id,
        pmocActivityId: a.id,
        assetId: a.assetId,
        kind: "resultado_nao_conforme",
        severity: "critica",
        message: `Atividade ${a.code} registrada como NAO CONFORME em ${last.executedAt.slice(0, 10)}.`,
        referenceDate: refKey
      });
    } else if (last.result === "parcialmente_conforme") {
      parciais += 1;
      alerts.push({
        id: `pmoc-alert-${a.id}-parcial`,
        pmocPlanId: plan.id,
        pmocActivityId: a.id,
        assetId: a.assetId,
        kind: "resultado_nao_conforme",
        severity: "media",
        message: `Atividade ${a.code} registrada como PARCIAL em ${last.executedAt.slice(0, 10)}.`,
        referenceDate: refKey
      });
    }

    if (new Date(last.nextDueAt) < now) {
      const daysLate = Math.floor((now - new Date(last.nextDueAt)) / 86_400_000);
      alerts.push({
        id: `pmoc-alert-${a.id}-vencido-${refKey}`,
        pmocPlanId: plan.id,
        pmocActivityId: a.id,
        assetId: a.assetId,
        kind: "vencido",
        severity: daysLate > 30 ? "critica" : daysLate > 7 ? "alta" : "media",
        message: `Atividade ${a.code} vencida ha ${daysLate} dia(s) (prevista para ${last.nextDueAt.slice(0, 10)}).`,
        referenceDate: refKey
      });
    }
  }

  // Alerta de ART vencendo
  const artDue = new Date(plan.endsOn);
  const daysToArtExpiry = Math.floor((artDue - now) / 86_400_000);
  if (daysToArtExpiry <= 60 && daysToArtExpiry > 0) {
    alerts.push({
      id: `pmoc-alert-art-${plan.id}`,
      pmocPlanId: plan.id,
      pmocActivityId: "*",
      assetId: "*",
      kind: "art_vencendo",
      severity: daysToArtExpiry <= 15 ? "critica" : "alta",
      message: `ART ${plan.artNumber} vence em ${daysToArtExpiry} dia(s) (${plan.endsOn}).`,
      referenceDate: refKey
    });
  }

  const compliancePct = total ? ((conformes) / total) * 100 : 0;

  return {
    alerts,
    compliance: {
      total,
      conformes,
      naoConformes,
      parciais,
      semExecucao,
      compliancePct
    }
  };
}

/**
 * Calcula a data da proxima execucao esperada a partir da ultima execucao
 * e da frequencia.
 * @param {Object} args
 * @param {string} args.lastExecutedAt
 * @param {string} args.frequency
 * @returns {string} ISO
 */
export function calcularProximaExecucao({ lastExecutedAt, frequency }) {
  const base = new Date(lastExecutedAt);
  const f = normalizeFrequency(frequency);
  const days = FREQ_DAYS[f] ?? 30;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}

export const __test = {
  HVAC_TYPES,
  FREQ_DAYS,
  RESULT_LABELS
};
