"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface CreateContractResult { id?: string; error?: string; }

export async function createContract(form: FormData): Promise<CreateContractResult> {
  const supabase = createSupabaseServer();
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Login com perfil ativo e obrigatorio." };

  const customerId = String(form.get("customer_id") || "");
  if (!customerId) return { error: "Selecione um cliente." };

  const payload = {
    tenant_id: profile.tenant.id,
    customer_id: customerId,
    code: String(form.get("code") || "").trim(),
    scope: String(form.get("scope") || "").trim(),
    exclusions: String(form.get("exclusions") || "").trim() || null,
    starts_on: String(form.get("starts_on") || ""),
    ends_on: String(form.get("ends_on") || "") || null,
    monthly_value: Number(form.get("monthly_value") || 0),
    index_name: String(form.get("index_name") || "") || null,
    index_date: String(form.get("index_date") || "") || null,
    billing_rule: String(form.get("billing_rule") || "Mensal por OS aprovada"),
    rgm_periodicity: String(form.get("rgm_periodicity") || "mensal")
  };

  if (!payload.code) return { error: "Codigo do contrato e obrigatorio." };
  if (!payload.scope) return { error: "Escopo e obrigatorio." };
  if (!payload.starts_on) return { error: "Data de inicio e obrigatoria." };

  const { data, error } = await supabase
    .from("contracts")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/contracts");
  return { id: data.id };
}
