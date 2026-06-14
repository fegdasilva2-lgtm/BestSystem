"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface CreateAssetResult { id?: string; error?: string; }

export async function createAsset(form: FormData): Promise<CreateAssetResult> {
  const supabase = await createSupabaseServer();
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Login com perfil ativo e obrigatorio." };

  const siteId = String(form.get("site_id") || "");
  if (!siteId) return { error: "Selecione o site do ativo." };

  // Localizacao: ou usa a existente, ou cria um "ambiente" simples
  let locationId = String(form.get("location_id") || "");
  const newLocation = String(form.get("new_location") || "").trim();

  if (!locationId && newLocation) {
    const { data: site } = await supabase.from("sites").select("id").eq("id", siteId).single();
    if (site) {
      const { data: loc, error: locErr } = await supabase.from("locations").insert({
        tenant_id: profile.tenant.id,
        site_id: site.id,
        name: newLocation,
        type: "ambiente"
      }).select("id").single();
      if (locErr) return { error: locErr.message };
      locationId = loc.id;
    }
  }

  if (!locationId) return { error: "Informe a localizacao do ativo." };

  const payload = {
    tenant_id: profile.tenant.id,
    location_id: locationId,
    code: String(form.get("code") || "").trim(),
    name: String(form.get("name") || "").trim(),
    type: String(form.get("type") || "geral"),
    manufacturer: String(form.get("manufacturer") || "") || null,
    model: String(form.get("model") || "") || null,
    serial: String(form.get("serial") || "") || null,
    criticality: String(form.get("criticality") || "media"),
    status: "operacional",
    install_date: String(form.get("install_date") || "") || null,
    warranty_until: String(form.get("warranty_until") || "") || null
  };

  if (!payload.code) return { error: "Codigo do ativo e obrigatorio." };
  if (!payload.name) return { error: "Nome do ativo e obrigatorio." };

  const { data, error } = await supabase.from("assets").insert(payload).select("id").single();
  if (error) return { error: error.message };
  revalidatePath("/admin/assets");
  return { id: data.id };
}
