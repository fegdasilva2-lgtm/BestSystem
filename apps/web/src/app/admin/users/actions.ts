"use server";

import { getSessionProfile, roleLabels, type UserRole } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { canManageUsers } from "@/lib/rbac-matrix";
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

function fail(message: string): never {
  redirect(`/admin/users?error=${encodeURIComponent(message)}`);
}

export async function createUserProfile(form: FormData) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) fail("Login com perfil ativo é obrigatório.");
  if (!canManageUsers(profile.role)) fail("Seu perfil não pode criar usuários.");

  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const role = String(form.get("role") || "solicitante") as UserRole;

  if (!name) fail("Nome é obrigatório.");
  if (!email) fail("E-mail é obrigatório.");
  if (password.length < 8) fail("Senha temporária deve ter pelo menos 8 caracteres.");
  if (!roles.includes(role)) fail("Perfil inválido.");
  if (role === "admin_org" && profile.role !== "super_admin_saas" && profile.role !== "admin_org") {
    fail("Somente admin da organização pode criar outro admin.");
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
    fail(authError?.message ?? "Não foi possível criar o usuário no Auth.");
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
