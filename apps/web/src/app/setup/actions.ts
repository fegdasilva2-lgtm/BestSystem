"use server";

import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

function fail(message: string): never {
  redirect(`/setup?error=${encodeURIComponent(message)}`);
}

export async function bootstrapFirstAdmin(form: FormData) {
  const admin = createSupabaseAdmin();
  const { count, error: countError } = await admin
    .from("users_profile")
    .select("id", { count: "exact", head: true });

  if (countError) fail(countError.message);
  if ((count ?? 0) > 0) fail("Setup bloqueado: já existe usuário provisionado.");

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");

  if (!name) fail("Nome é obrigatório.");
  if (!email) fail("E-mail é obrigatório.");
  if (password.length < 8) fail("Senha deve ter pelo menos 8 caracteres.");

  const { data: existingTenant } = await admin
    .from("tenants")
    .select("id")
    .eq("id", DEFAULT_TENANT_ID)
    .maybeSingle();

  if (!existingTenant) {
    const { error: tenantError } = await admin.from("tenants").insert({
      id: DEFAULT_TENANT_ID,
      name: "IMC Facilities",
      slug: "imc-facilities",
      plan: "business",
      status: "ativo"
    });
    if (tenantError) fail(tenantError.message);
  }

  const appMetadata = {
    tenant_id: DEFAULT_TENANT_ID,
    user_role: "admin_org",
    user_active: true
  };

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: appMetadata,
    user_metadata: { display_name: name }
  });

  if (authError || !created.user) {
    fail(authError?.message ?? "Não foi possível criar o usuário no Supabase Auth.");
  }

  const { error: profileError } = await admin.from("users_profile").insert({
    id: created.user.id,
    tenant_id: DEFAULT_TENANT_ID,
    name,
    email,
    role: "admin_org",
    active: true
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    fail(profileError.message);
  }

  redirect(`/login?created=${encodeURIComponent("Administrador inicial criado. Entre com e-mail e senha.")}`);
}
