"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createMeasurement(formData: FormData) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Sessão inválida." };

  const supabase = await createSupabaseServer();

  const contractId = formData.get("contract_id") as string;
  const period = formData.get("period") as string;
  const grossAmount = parseFloat(formData.get("gross_amount") as string) || 0;
  const notes = (formData.get("notes") as string) || null;

  if (!contractId || !period) {
    return { error: "Contrato e período são obrigatórios." };
  }

  const { data, error } = await supabase
    .from("measurements")
    .insert({
      tenant_id: profile.tenant.id,
      contract_id: contractId,
      period,
      status: "rascunho",
      gross_amount: grossAmount,
      net_amount: grossAmount,
      notes,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/admin/measurements");
  return { id: data.id };
}

export async function submitMeasurement(measId: string) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Sessão inválida." };
  const supabase = await createSupabaseServer();

  const { error } = await supabase
    .from("measurements")
    .update({ status: "pre_enviada" })
    .eq("id", measId)
    .eq("tenant_id", profile.tenant.id)
    .eq("status", "rascunho");

  if (error) return { error: error.message };
  revalidatePath(`/admin/measurements/${measId}`);
  revalidatePath("/admin/measurements");
  return { ok: true };
}

export async function approveMeasurement(measId: string) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Sessão inválida." };
  const supabase = await createSupabaseServer();

  const { error } = await supabase
    .from("measurements")
    .update({ status: "aprovada", approved_at: new Date().toISOString(), approved_by: profile.authUserId })
    .eq("id", measId)
    .eq("tenant_id", profile.tenant.id)
    .in("status", ["em_aceite", "pre_enviada", "contestada"]);

  if (error) return { error: error.message };
  revalidatePath(`/admin/measurements/${measId}`);
  revalidatePath("/admin/measurements");
  return { ok: true };
}

export async function rejectMeasurement(measId: string, reason: string) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Sessão inválida." };
  const supabase = await createSupabaseServer();

  const { error } = await supabase
    .from("measurements")
    .update({ status: "contestada", notes: reason })
    .eq("id", measId)
    .eq("tenant_id", profile.tenant.id)
    .in("status", ["em_aceite", "pre_enviada"]);

  if (error) return { error: error.message };
  revalidatePath(`/admin/measurements/${measId}`);
  revalidatePath("/admin/measurements");
  return { ok: true };
}
