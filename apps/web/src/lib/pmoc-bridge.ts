type Frequency = "D" | "S" | "Q" | "M" | "B" | "T" | "Z" | "A" | "custom";
type Priority = "baixa" | "media" | "alta" | "critica";

interface PmocActivityInput {
  code: string;
  name: string;
  description?: string;
  frequency: Frequency;
  durationMinutes?: number;
  priority?: Priority;
  assetId?: string;
}

interface PmocActivityFull {
  id: string;
  pmocPlanId: string;
  assetId: string;
  code: string;
  name: string;
  description: string;
  frequency: Frequency;
  durationMinutes: number;
  priority: Priority;
}

interface PmocAssetInput {
  id: string;
  type: string;
}

interface PmocPlanInput {
  id: string;
  contractId: string;
  siteId: string;
  code: string;
  startsOn: string;
  endsOn: string;
  rtName: string;
  rtCrea: string;
  artNumber: string;
}

interface PmocExecution {
  id: string;
  pmocActivityId: string;
  assetId: string;
  executedAt: string;
  nextDueAt: string;
  result: "conforme" | "nao_conforme" | "parcialmente_conforme";
}

const HVAC_TYPES = new Set([
  "chiller", "ahu", "fancoil", "vrf", "vrv",
  "split", "self-contained", "rooftop", "coolingtower", "torre"
]);

const FREQ_DAYS: Record<string, number> = {
  D: 1,
  S: 7,
  Q: 14,
  M: 30,
  B: 60,
  T: 90,
  Z: 180,
  A: 365,
  custom: 30
};

export function templateAtividadesHVAC(assetType: string): PmocActivityInput[] {
  const base: PmocActivityInput[] = [
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

  const extras: Record<string, PmocActivityInput[]> = {
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

  const normalized = (assetType ?? "").toLowerCase();
  if (!HVAC_TYPES.has(normalized)) {
    throw new Error(`Tipo de ativo nao e HVAC: ${assetType}.`);
  }
  return [...base, ...(extras[normalized] ?? [])];
}

export function gerarPmoc({
  plan,
  assets,
  customActivities = []
}: {
  plan: PmocPlanInput;
  assets: PmocAssetInput[];
  customActivities?: PmocActivityInput[];
}) {
  if (!plan?.id) throw new Error("plan.id obrigatorio");
  if (!plan?.contractId) throw new Error("plan.contractId obrigatorio");
  if (!plan?.siteId) throw new Error("plan.siteId obrigatorio");
  if (!plan?.rtName || !plan?.rtCrea) throw new Error("RT (responsavel tecnico) obrigatorio");
  if (!plan?.artNumber) throw new Error("ART obrigatoria");
  if (!plan?.startsOn || !plan?.endsOn) throw new Error("vigencia obrigatoria");
  if (plan.endsOn <= plan.startsOn) throw new Error("endsOn deve ser maior que startsOn");

  const activities: PmocActivityFull[] = [];
  let skippedNonHvac = 0;
  const errors: Array<{ assetId?: string; custom?: PmocActivityInput; reason: string }> = [];

  for (const asset of assets ?? []) {
    let template: PmocActivityInput[];
    try {
      template = templateAtividadesHVAC(asset.type);
    } catch (err) {
      skippedNonHvac += 1;
      errors.push({ assetId: asset.id, reason: err instanceof Error ? err.message : String(err) });
      continue;
    }
    for (const item of template) {
      activities.push({
        id: `pmoc-act-${asset.id}-${item.code}`,
        pmocPlanId: plan.id,
        assetId: asset.id,
        code: item.code,
        name: item.name,
        description: item.description ?? "",
        frequency: item.frequency,
        durationMinutes: item.durationMinutes ?? 60,
        priority: item.priority ?? "media"
      });
    }
  }

  for (const item of customActivities) {
    if (!item.code || !item.name || !item.frequency) {
      errors.push({ custom: item, reason: "code/name/frequency obrigatorios" });
      continue;
    }
    activities.push({
      id: `pmoc-act-custom-${item.code}-${Math.random().toString(36).slice(2, 6)}`,
      pmocPlanId: plan.id,
      assetId: item.assetId ?? "*",
      code: item.code,
      name: item.name,
      description: item.description ?? "",
      frequency: item.frequency,
      durationMinutes: item.durationMinutes ?? 60,
      priority: item.priority ?? "media"
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

export function gerarAlertas({
  plan,
  activities,
  executions,
  referenceDate
}: {
  plan: PmocPlanInput;
  activities: PmocActivityFull[];
  executions: PmocExecution[];
  referenceDate?: string;
}) {
  const now = referenceDate ? new Date(referenceDate) : new Date();
  const refKey = now.toISOString().slice(0, 10);
  const alerts = [];
  const lastByActivity = new Map<string, PmocExecution>();

  for (const execution of executions) {
    const current = lastByActivity.get(execution.pmocActivityId);
    if (!current || new Date(execution.executedAt) > new Date(current.executedAt)) {
      lastByActivity.set(execution.pmocActivityId, execution);
    }
  }

  let total = 0;
  let conformes = 0;
  let naoConformes = 0;
  let parciais = 0;
  let semExecucao = 0;

  for (const activity of activities) {
    total += 1;
    const last = lastByActivity.get(activity.id);
    if (!last) {
      semExecucao += 1;
      alerts.push({
        id: `pmoc-alert-${activity.id}-sem-exec`,
        pmocPlanId: plan.id,
        pmocActivityId: activity.id,
        assetId: activity.assetId,
        kind: "faltando_ultima_execucao",
        severity: "alta",
        message: `Atividade ${activity.code} (${activity.name}) sem registro de execucao.`,
        referenceDate: refKey
      });
      continue;
    }

    if (last.result === "conforme") {
      conformes += 1;
    } else if (last.result === "nao_conforme") {
      naoConformes += 1;
      alerts.push({
        id: `pmoc-alert-${activity.id}-nao-conforme`,
        pmocPlanId: plan.id,
        pmocActivityId: activity.id,
        assetId: activity.assetId,
        kind: "resultado_nao_conforme",
        severity: "critica",
        message: `Atividade ${activity.code} registrada como NAO CONFORME em ${last.executedAt.slice(0, 10)}.`,
        referenceDate: refKey
      });
    } else {
      parciais += 1;
      alerts.push({
        id: `pmoc-alert-${activity.id}-parcial`,
        pmocPlanId: plan.id,
        pmocActivityId: activity.id,
        assetId: activity.assetId,
        kind: "resultado_nao_conforme",
        severity: "media",
        message: `Atividade ${activity.code} registrada como PARCIAL em ${last.executedAt.slice(0, 10)}.`,
        referenceDate: refKey
      });
    }

    if (new Date(last.nextDueAt) < now) {
      const daysLate = Math.floor((now.getTime() - new Date(last.nextDueAt).getTime()) / 86_400_000);
      alerts.push({
        id: `pmoc-alert-${activity.id}-vencido-${refKey}`,
        pmocPlanId: plan.id,
        pmocActivityId: activity.id,
        assetId: activity.assetId,
        kind: "vencido",
        severity: daysLate > 30 ? "critica" : daysLate > 7 ? "alta" : "media",
        message: `Atividade ${activity.code} vencida ha ${daysLate} dia(s) (prevista para ${last.nextDueAt.slice(0, 10)}).`,
        referenceDate: refKey
      });
    }
  }

  const daysToArtExpiry = Math.floor((new Date(plan.endsOn).getTime() - now.getTime()) / 86_400_000);
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

  return {
    alerts,
    compliance: {
      total,
      conformes,
      naoConformes,
      parciais,
      semExecucao,
      compliancePct: total ? (conformes / total) * 100 : 0
    }
  };
}

export function calcularProximaExecucao({
  lastExecutedAt,
  frequency
}: {
  lastExecutedAt: string;
  frequency: string;
}) {
  const base = new Date(lastExecutedAt);
  const days = FREQ_DAYS[String(frequency).toUpperCase()] ?? 30;
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString();
}
