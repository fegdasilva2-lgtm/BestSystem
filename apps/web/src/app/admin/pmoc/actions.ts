// Server Actions do PMOC.
// Cria plano, gera atividades a partir de HVAC, registra execucoes
// e lista alertas regulatorios. Tudo via RLS.

"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSessionProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { gerarPmoc, gerarAlertas, calcularProximaExecucao } from "@/lib/pmoc-bridge";

export interface PmocResult {
  error?: string;
  planId?: string;
  activityCount?: number;
}

export async function criarPmoc(form: FormData): Promise<PmocResult> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Sessão inválida." };
  if (!["admin_org", "gestor_facilities"].includes(profile.role)) {
    return { error: "Apenas admin_org ou gestor_facilities podem criar PMOC." };
  }

  const plan = {
    tenant_id: profile.tenant.id,
    contract_id: String(form.get("contractId") || ""),
    site_id: String(form.get("siteId") || ""),
    code: String(form.get("code") || "").trim(),
    starts_on: String(form.get("startsOn") || ""),
    ends_on: String(form.get("endsOn") || ""),
    rt_name: String(form.get("rtName") || ""),
    rt_crea: String(form.get("rtCrea") || ""),
    rt_email: String(form.get("rtEmail") || "") || null,
    rt_phone: String(form.get("rtPhone") || "") || null,
    art_number: String(form.get("artNumber") || ""),
    art_url: String(form.get("artUrl") || "") || null,
    min_cleaning_frequency: String(form.get("minCleaningFrequency") || "M"),
    min_filter_change_days: Number(form.get("minFilterChangeDays") || 90),
    min_hvac_inspection_days: Number(form.get("minHvacInspectionDays") || 180),
    active: true,
    version_lock: 1
  };

  if (!plan.code) return { error: "Código obrigatório." };
  if (!plan.contract_id || !plan.site_id) return { error: "Contrato e site obrigatórios." };
  if (!plan.rt_name || !plan.rt_crea || !plan.art_number) {
    return { error: "RT (nome, CREA) e ART obrigatórios." };
  }
  if (!plan.starts_on || !plan.ends_on) return { error: "Vigência obrigatória." };
  if (plan.ends_on <= plan.starts_on) return { error: "Termo deve ser maior que início." };

  const supabase = await createSupabaseServer();
  const { data: created, error } = await supabase
    .from("pmoc_plans")
    .insert(plan)
    .select("id, contract_id, site_id, code, starts_on, ends_on, rt_name, rt_crea, art_number")
    .single();
  if (error) return { error: error.message };

  // Busca locations do site para filtrar assets
  const { data: siteLocations } = await supabase
    .from("locations")
    .select("id")
    .eq("site_id", plan.site_id);
  const locationIds = (siteLocations ?? []).map((l) => l.id);

  // Gera atividades a partir dos HVAC do site
  const { data: hvacAssets } = await supabase
    .from("assets")
    .select("id, type, manufacturer, model, serial, location_id")
    .eq("tenant_id", profile.tenant.id)
    .in("location_id", locationIds.length > 0 ? locationIds : ["none"]);

  const result = gerarPmoc({
    plan: {
      id: created.id,
      contractId: created.contract_id,
      siteId: created.site_id,
      code: created.code,
      startsOn: created.starts_on,
      endsOn: created.ends_on,
      rtName: created.rt_name,
      rtCrea: created.rt_crea,
      artNumber: created.art_number
    },
    assets: hvacAssets ?? []
  });
  for (const act of result.activities) {
    const { error: activityError } = await supabase.from("pmoc_activities").insert({
      tenant_id: profile.tenant.id,
      pmoc_plan_id: act.pmocPlanId,
      asset_id: act.assetId,
      code: act.code,
      name: act.name,
      description: act.description,
      frequency: act.frequency,
      duration_minutes: act.durationMinutes,
      priority: act.priority
    });
    if (activityError) return { error: activityError.message };
  }

  revalidatePath("/admin/pmoc");
  return { planId: created.id, activityCount: result.activities.length };
}

export async function registrarExecucaoPmoc(form: FormData): Promise<PmocResult> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Sessão inválida." };
  if (!["tecnico", "supervisor", "admin_org", "gestor_facilities"].includes(profile.role)) {
    return { error: "Apenas tecnico, supervisor, admin_org ou gestor_facilities podem registrar execução." };
  }

  const pmocActivityId = String(form.get("pmocActivityId") || "");
  const assetId = String(form.get("assetId") || "");
  const result = String(form.get("result") || "conforme");
  const observations = String(form.get("observations") || "") || null;
  const photoCount = Number(form.get("photoCount") || 0);
  const readingsRaw = String(form.get("readings") || "").trim();

  let readings = null;
  if (readingsRaw) {
    try { readings = JSON.parse(readingsRaw); }
    catch { return { error: "readings inválido - não parece JSON" }; }
  }
  if (!pmocActivityId || !assetId) return { error: "Atividade e ativo obrigatórios." };

  const supabase = await createSupabaseServer();
  const { data: act } = await supabase
    .from("pmoc_activities")
    .select("pmoc_plan_id, frequency")
    .eq("id", pmocActivityId)
    .maybeSingle();
  if (!act) return { error: "Atividade não encontrada." };

  const executedAt = new Date().toISOString();
  const nextDueAt = calcularProximaExecucao({ lastExecutedAt: executedAt, frequency: act.frequency });

  const { data, error } = await supabase.from("pmoc_executions").insert({
    tenant_id: profile.tenant.id,
    pmoc_plan_id: act.pmoc_plan_id,
    pmoc_activity_id: pmocActivityId,
    asset_id: assetId,
    executed_at: executedAt,
    executed_by: profile.authUserId,
    result,
    photo_count: photoCount,
    readings,
    observations,
    next_due_at: nextDueAt
  }).select("id").single();
  if (error) return { error: error.message };

  revalidatePath("/admin/pmoc");
  return { planId: data.id };
}

export async function listarAlertasPmoc(form: FormData): Promise<{ error?: string; data?: unknown }> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Sessão inválida." };
  const supabase = await createSupabaseServer();
  const [{ data: plans }, { data: activities }, { data: executions }] = await Promise.all([
    supabase.from("pmoc_plans").select("*").eq("active", true),
    supabase.from("pmoc_activities").select("*"),
    supabase.from("pmoc_executions").select("*")
  ]);
  const result = (plans ?? []).map((plan) => {
    const acts = (activities ?? []).filter((a) => a.pmoc_plan_id === plan.id);
    const exes = (executions ?? []).filter((e) => e.pmoc_plan_id === plan.id);
    const r = gerarAlertas({
      plan: {
        id: plan.id,
        contractId: plan.contract_id,
        siteId: plan.site_id,
        code: plan.code,
        startsOn: plan.starts_on,
        endsOn: plan.ends_on,
        rtName: plan.rt_name,
        rtCrea: plan.rt_crea,
        artNumber: plan.art_number
      },
      activities: acts.map((activity) => ({
        id: activity.id,
        pmocPlanId: activity.pmoc_plan_id,
        assetId: activity.asset_id,
        code: activity.code,
        name: activity.name,
        description: activity.description ?? "",
        frequency: activity.frequency,
        durationMinutes: activity.duration_minutes,
        priority: activity.priority
      })),
      executions: exes.map((execution) => ({
        id: execution.id,
        pmocActivityId: execution.pmoc_activity_id,
        assetId: execution.asset_id,
        executedAt: execution.executed_at,
        nextDueAt: execution.next_due_at,
        result: execution.result
      }))
    });
    return { planId: plan.id, code: plan.code, ...r };
  });
  return { data: result };
}
