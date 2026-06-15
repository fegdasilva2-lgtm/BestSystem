"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface CreateSiteResult { id?: string; error?: string; }

export async function createSite(form: FormData): Promise<CreateSiteResult> {
  const supabase = await createSupabaseServer();
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Login com perfil ativo é obrigatório." };

  const customerId = String(form.get("customer_id") || "");
  const contractId = String(form.get("contract_id") || "") || null;
  if (!customerId) return { error: "Selecione um cliente." };

  const payload = {
    tenant_id: profile.tenant.id,
    customer_id: customerId,
    contract_id: contractId,
    name: String(form.get("name") || "").trim(),
    address: String(form.get("address") || "").trim() || null,
    timezone: String(form.get("timezone") || "America/Sao_Paulo")
  };

  if (!payload.name) return { error: "Nome do site é obrigatório." };

  const { data, error } = await supabase.from("sites").insert(payload).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/admin/sites");
  return { id: data.id };
}
