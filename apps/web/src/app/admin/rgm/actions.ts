// Server Actions do RGM (Relatorio de Gestao Mensal).
// Gera previa, persiste configuracao por contrato e arquiva versao imutavel
// apos aceite do cliente. A geracao de PDF final sera feita por uma
// Edge Function (RGM-PDF) no proximo passo; este modulo cobre o lado
// de dados/UI.

"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSessionProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface RgmBlock {
  id: string;
  label: string;
  enabled: boolean;
  // configuracao especifica por bloco, livre
  config?: Record<string, unknown>;
}

export interface RgmTemplate {
  id: string;
  tenantId: string;
  contractId: string;
  name: string;
  blocks: RgmBlock[];
  updatedAt: string;
  updatedBy: string;
}

export interface RgmPreview {
  contractId: string;
  contractCode: string;
  period: string;
  blocks: RgmBlock[];
  // Dados agregados para a previa
  data: {
    scheduledWorkOrders: number;
    completedWorkOrders: number;
    approvedWorkOrders: number;
    onTimePct: number;
    openRequests: number;
    measurement: { gross: number; discount: number; net: number } | null;
    executiveSummary: string;
  };
}

/**
 * Salva o template de RGM para um contrato. Apenas o dono do tenant pode.
 */
export async function saveRgmTemplate(form: FormData): Promise<{ error?: string; id?: string }> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) {
    return { error: "Sessao invalida." };
  }
  if (!["admin_org", "gestor_facilities"].includes(profile.role)) {
    return { error: "Apenas admin_org ou gestor_facilities podem salvar o template." };
  }

  const contractId = String(form.get("contractId") || "");
  if (!contractId) return { error: "Contrato obrigatorio." };

  const blocks: RgmBlock[] = [];
  const all = form.getAll("blockId");
  for (const idRaw of all) {
    const id = String(idRaw);
    const enabled = form.get(`block-${id}-enabled`) === "on";
    blocks.push({ id, label: id, enabled });
  }
  if (blocks.filter((b) => b.enabled).length === 0) {
    return { error: "Habilite pelo menos um bloco." };
  }

  const supabase = await createSupabaseServer();
  const id = `rgm-tpl-${contractId}`;
  const record = {
    id,
    tenant_id: profile.tenant.id,
    contract_id: contractId,
    name: `RGM - ${contractId}`,
    blocks,
    updated_at: new Date().toISOString(),
    updated_by: profile.email
  };
  const { error } = await supabase.from("rgm_templates").upsert(record);
  if (error) return { error: error.message };
  revalidatePath("/admin/rgm");
  return { id };
}

/**
 * Gera a previa do RGM para um contrato+periodo. Le template, OS,
 * medicao e produz o resumo executivo.
 */
export async function previewRgm(form: FormData): Promise<{ error?: string; data?: RgmPreview }> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) {
    return { error: "Sessao invalida." };
  }

  const contractId = String(form.get("contractId") || "");
  const period = String(form.get("period") || "");
  if (!contractId) return { error: "Contrato obrigatorio." };
  if (!/^\d{4}-\d{2}$/.test(period)) return { error: "Periodo invalido." };

  const supabase = await createSupabaseServer();
  const [tplRes, contractRes, woRes, medRes, reqRes] = await Promise.all([
    supabase.from("rgm_templates").select("blocks").eq("contract_id", contractId).maybeSingle(),
    supabase.from("contracts").select("id, code, customer_id, monthly_value").eq("id", contractId).maybeSingle(),
    supabase.from("work_orders").select("id, status, due_at, completed_at, type")
      .eq("contract_id", contractId)
      .gte("due_at", `${period}-01`)
      .lt("due_at", nextMonth(period)),
    supabase.from("measurements").select("id, gross_amount, discount_amount, net_amount, status")
      .eq("contract_id", contractId).eq("period", period).maybeSingle(),
    supabase.from("service_requests").select("id, status").eq("status", "triagem")
  ]);

  const blocks: RgmBlock[] = tplRes.data?.blocks ?? defaultBlocks();
  const wo = woRes.data ?? [];
  const completed = wo.filter((w) => w.status === "concluida_tecnico" || w.status === "aprovada" || w.status === "encerrada");
  const onTime = completed.filter((w) => w.completed_at && w.due_at && w.completed_at <= w.due_at);
  const onTimePct = completed.length ? Math.round((onTime.length / completed.length) * 100) : 0;
  const approved = wo.filter((w) => w.status === "aprovada" || w.status === "encerrada");
  const med = medRes.data;

  const data: RgmPreview["data"] = {
    scheduledWorkOrders: wo.length,
    completedWorkOrders: completed.length,
    approvedWorkOrders: approved.length,
    onTimePct,
    openRequests: reqRes.data?.length ?? 0,
    measurement: med ? {
      gross: Number(med.gross_amount ?? 0),
      discount: Number(med.discount_amount ?? 0),
      net: Number(med.net_amount ?? 0)
    } : null,
    executiveSummary: buildSummary({
      contractCode: contractRes.data?.code ?? contractId,
      period,
      completed: completed.length,
      scheduled: wo.length,
      onTimePct,
      openRequests: reqRes.data?.length ?? 0,
      med
    })
  };

  return { data: {
    contractId,
    contractCode: contractRes.data?.code ?? contractId,
    period,
    blocks,
    data
  }};
}

/**
 * Arquiva o RGM como versao imutavel apos aceite do cliente.
 * Tabela rgm_versions: (id, contract_id, period, template_id, blocks,
 * generated_data, approved_at, approved_by, file_url).
 */
export async function archiveRgm(form: FormData): Promise<{ error?: string; id?: string }> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) {
    return { error: "Sessao invalida." };
  }
  if (!["cliente_gestor", "admin_org"].includes(profile.role)) {
    return { error: "Apenas cliente_gestor ou admin_org podem arquivar." };
  }

  const contractId = String(form.get("contractId") || "");
  const period = String(form.get("period") || "");
  const previewJson = String(form.get("previewJson") || "");

  let preview: RgmPreview;
  try { preview = JSON.parse(previewJson); }
  catch { return { error: "Preview invalido." }; }

  const admin = createSupabaseAdmin();
  const id = `rgm-${contractId}-${period}-${Date.now()}`;
  const { error } = await admin.from("rgm_versions").insert({
    id,
    tenant_id: profile.tenant.id,
    contract_id: contractId,
    period,
    template_id: `rgm-tpl-${contractId}`,
    blocks: preview.blocks,
    generated_data: preview.data,
    approved_at: new Date().toISOString(),
    approved_by: profile.email
  });
  if (error) return { error: error.message };

  // Marca medicao como faturada (se houver)
  if (preview.data.measurement) {
    await admin.from("measurements")
      .update({ status: "faturada" })
      .eq("contract_id", contractId)
      .eq("period", period);
  }

  revalidatePath("/admin/rgm");
  revalidatePath("/portal");
  return { id };
}

// =====================================================================
// Helpers
// =====================================================================

function nextMonth(period: string) {
  const [y, m] = period.split("-").map(Number);
  const nm = m === 12 ? 1 : m + 1;
  const ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

export function defaultBlocks(): RgmBlock[] {
  return [
    { id: "capa",           label: "Capa",            enabled: true },
    { id: "resumo",         label: "Resumo executivo", enabled: true },
    { id: "previsto_realizado", label: "Previsto x Realizado", enabled: true },
    { id: "sla",            label: "SLA",             enabled: true },
    { id: "chamados",       label: "Chamados",        enabled: true },
    { id: "medicao",        label: "Medicao",         enabled: true },
    { id: "fotos",          label: "Evidencia fotografica", enabled: true },
    { id: "recomendacoes",  label: "Recomendacoes",   enabled: true }
  ];
}

function buildSummary({ contractCode, period, completed, scheduled, onTimePct, openRequests, med }: {
  contractCode: string;
  period: string;
  completed: number;
  scheduled: number;
  onTimePct: number;
  openRequests: number;
  med: { net_amount?: number; discount_amount?: number } | null;
}) {
  const mes = formatPeriodBR(period);
  const compliance = onTimePct.toFixed(0);
  const exec = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
  const medTxt = med
    ? `Faturamento previsto: R$ ${Number(med.net_amount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (glosa de R$ ${Number(med.discount_amount ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`
    : "Medicao do periodo ainda nao aprovada.";
  return (
    `Contrato ${contractCode} - competencia ${mes}. ` +
    `Executadas ${completed} de ${scheduled} OS previstas (aderencia de ${exec}%); ` +
    `cumprimento de SLA em ${compliance}% das concluidas. ` +
    `${openRequests} chamado(s) em triagem. ${medTxt} ` +
    `Pontos de atencao e recomendacoes constam no detalhamento.`
  );
}

function formatPeriodBR(period: string) {
  const [y, m] = period.split("-").map(Number);
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[m - 1]}/${y}`;
}
