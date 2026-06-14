// Server Action: cria cliente (customer) com isolamento de tenant
// garantido pela RLS. Recebe o FormData do wizard e devolve { id }.
"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface CreateCustomerResult {
  id?: string;
  error?: string;
}

export async function createCustomer(form: FormData): Promise<CreateCustomerResult> {
  const supabase = await createSupabaseServer();
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Login com perfil ativo e obrigatorio." };

  const payload = {
    tenant_id: profile.tenant.id,
    name: String(form.get("name") || "").trim(),
    document: String(form.get("document") || "").trim() || null,
    contact_name: String(form.get("contact_name") || "").trim() || null,
    contact_email: String(form.get("contact_email") || "").trim() || null,
    contact_phone: String(form.get("contact_phone") || "").trim() || null
  };

  if (!payload.name) return { error: "Nome do cliente e obrigatorio." };

  const { data, error } = await supabase
    .from("customers")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/admin/customers");
  return { id: data.id };
}
