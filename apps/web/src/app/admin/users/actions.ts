"use server";

import { getSessionProfile, roleLabels, type UserRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const roles: UserRole[] = [
  "admin_org",
  "gestor_facilities",
  "planejador",
  "supervisor",
  "tecnico",
  "auxiliar",
  "almoxarife",
  "comercial",
  "financeiro",
  "cliente_gestor",
  "solicitante",
  "auditor",
  "fornecedor"
];

function canManageUsers(role: UserRole) {
  return role === "super_admin_saas" || role === "admin_org" || role === "gestor_facilities";
}

function fail(message: string): never {
  redirect(`/admin/users?error=${encodeURIComponent(message)}`);
}

export async function createUserProfile(form: FormData) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) fail("Login com perfil ativo e obrigatorio.");
  if (!canManageUsers(profile.role)) fail("Seu perfil nao pode criar usuarios.");

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const role = String(form.get("role") || "solicitante") as UserRole;

  if (!name) fail("Nome e obrigatorio.");
  if (!email) fail("E-mail e obrigatorio.");
  if (password.length < 8) fail("Senha temporaria deve ter pelo menos 8 caracteres.");
  if (!roles.includes(role)) fail("Perfil invalido.");
  if (role === "admin_org" && profile.role !== "super_admin_saas" && profile.role !== "admin_org") {
    fail("Somente admin da organizacao pode criar outro admin.");
  }

  const admin = createSupabaseAdmin();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: {
      tenant_id: profile.tenant.id,
      user_role: role,
      user_active: true
    },
    user_metadata: { display_name: name }
  });

  if (authError || !created.user) {
    fail(authError?.message ?? "Nao foi possivel criar o usuario no Auth.");
  }

  const { error: profileError } = await admin.from("users_profile").insert({
    id: created.user.id,
    tenant_id: profile.tenant.id,
    name,
    email,
    role,
    active: true
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    fail(profileError.message);
  }

  revalidatePath("/admin/users");
  redirect(`/admin/users?created=${encodeURIComponent(`${name} (${roleLabels[role]})`)}`);
}
