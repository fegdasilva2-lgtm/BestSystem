"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createWorkOrder(formData: FormData) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Sessão inválida." };

  const supabase = await createSupabaseServer();

  const type = formData.get("type") as string;
  const priority = formData.get("priority") as string;
  const description = formData.get("description") as string;
  const contractId = formData.get("contract_id") as string;
  const siteId = formData.get("site_id") as string;
  const assetId = formData.get("asset_id") as string;
  const dueAt = formData.get("due_at") as string;

  if (!type || !priority || !description) {
    return { error: "Tipo, prioridade e descrição são obrigatórios." };
  }

  const { data, error } = await supabase
    .from("work_orders")
    .insert({
      tenant_id: profile.tenant.id,
      type,
      priority,
      description,
      status: "rascunho",
      contract_id: contractId || null,
      site_id: siteId || null,
      asset_id: assetId || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/work-orders");
  return { id: data.id };
}

export async function updateWorkOrderStatus(woId: string, newStatus: string) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Sessão inválida." };

  const supabase = await createSupabaseServer();

  // Valida transições permitidas
  const validTransitions: Record<string, string[]> = {
    rascunho: ["planejada", "cancelada"],
    planejada: ["liberada", "cancelada"],
    liberada: ["atribuida", "cancelada"],
    atribuida: ["aceita", "cancelada"],
    aceita: ["em_deslocamento", "cancelada"],
    em_deslocamento: ["em_execucao", "pausada"],
    em_execucao: ["concluida_tecnico", "pausada", "aguardando_material", "aguardando_cliente"],
    pausada: ["em_execucao", "cancelada"],
    aguardando_material: ["em_execucao", "cancelada"],
    aguardando_cliente: ["em_execucao", "cancelada"],
    concluida_tecnico: ["em_validacao", "em_execucao"],
    em_validacao: ["aprovada", "concluida_tecnico"],
    aprovada: ["encerrada"],
  };

  // Primeiro busca o status atual
  const { data: wo } = await supabase
    .from("work_orders")
    .select("status, id")
    .eq("id", woId)
    .eq("tenant_id", profile.tenant.id)
    .single();

  if (!wo) return { error: "OS não encontrada." };

  const allowed = validTransitions[wo.status] || [];
  if (!allowed.includes(newStatus)) {
    return { error: `Transição de "${wo.status}" para "${newStatus}" não permitida.` };
  }

  const update: Record<string, unknown> = { status: newStatus };
  if (newStatus === "em_execucao" && !wo.status.includes("execucao")) {
    update.started_at = new Date().toISOString();
  }
  if (newStatus === "concluida_tecnico") {
    update.completed_at = new Date().toISOString();
  }
  if (newStatus === "aprovada") {
    update.approved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("work_orders")
    .update(update)
    .eq("id", woId)
    .eq("tenant_id", profile.tenant.id);

  if (error) return { error: error.message };

  revalidatePath(`/admin/work-orders/${woId}`);
  revalidatePath("/admin/work-orders");
  return { ok: true };
}
