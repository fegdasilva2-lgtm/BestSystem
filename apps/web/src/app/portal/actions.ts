// Server Actions do Portal do Cliente.
// O cliente_gestor acessa o portal sem precisar de admin.
// Operacoes permitidas: aprovar medicao, aceitar RGM, comentar OS.

"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface PortalActionResult {
  error?: string;
  ok?: boolean;
  id?: string;
}

export async function aceitarMedicaoPortal(form: FormData): Promise<PortalActionResult> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Sessao invalida." };
  if (profile.role !== "cliente_gestor" && profile.role !== "admin_org") {
    return { error: "Apenas cliente_gestor ou admin_org podem aceitar medicao." };
  }

  const measurementId = String(form.get("measurementId") || "");
  const contractId = String(form.get("contractId") || "");
  const period = String(form.get("period") || "");
  if (!measurementId) return { error: "measurementId obrigatorio." };

  const supabase = await createSupabaseServer();
  const { data: current } = await supabase
    .from("measurements")
    .select("status, net_amount, gross_amount, discount_amount")
    .eq("id", measurementId)
    .maybeSingle();

  if (!current) return { error: "Medicao nao encontrada." };
  if (current.status !== "pre_enviada" && current.status !== "em_aceite" && current.status !== "contestada") {
    return { error: `Medicao ja esta no estado "${current.status}" e nao pode ser aceita.` };
  }

  const { error } = await supabase
    .from("measurements")
    .update({
      status: "aprovada",
      approved_at: new Date().toISOString(),
      approved_by: profile.email
    })
    .eq("id", measurementId);
  if (error) return { error: error.message };

  revalidatePath("/portal");
  revalidatePath("/admin/rgm");
  return { ok: true, id: measurementId };
}

export async function contestarMedicaoPortal(form: FormData): Promise<PortalActionResult> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Sessao invalida." };
  if (profile.role !== "cliente_gestor" && profile.role !== "admin_org") {
    return { error: "Apenas cliente_gestor ou admin_org podem contestar." };
  }

  const measurementId = String(form.get("measurementId") || "");
  const amount = Number(form.get("amount") || 0);
  const reason = String(form.get("reason") || "").trim();
  if (!measurementId) return { error: "measurementId obrigatorio." };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Valor invalido." };
  if (!reason) return { error: "Motivo obrigatorio." };

  const supabase = await createSupabaseServer();
  const id = `ct-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from("measurement_contestations").insert({
    id,
    measurement_id: measurementId,
    amount,
    reason,
    raised_by: profile.email,
    status: "pendente"
  });
  if (error) return { error: error.message };

  // Marca medicao como contestada
  await supabase.from("measurements")
    .update({ status: "contestada" })
    .eq("id", measurementId);

  revalidatePath("/portal");
  return { ok: true, id };
}

export async function comentarOSPortal(form: FormData): Promise<PortalActionResult> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Sessao invalida." };

  const workOrderId = String(form.get("workOrderId") || "");
  const comment = String(form.get("comment") || "").trim();
  if (!workOrderId) return { error: "workOrderId obrigatorio." };
  if (!comment) return { error: "Comentario vazio." };

  const supabase = await createSupabaseServer();
  const id = `cm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const { error } = await supabase.from("work_order_comments").insert({
    id,
    work_order_id: workOrderId,
    author_id: profile.authUserId,
    body: comment
  });
  if (error) return { error: error.message };

  revalidatePath("/portal");
  return { ok: true, id };
}
