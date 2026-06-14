import { createSupabaseServer } from "@/lib/supabase-server";

export type UserRole =
  | "super_admin_saas"
  | "admin_org"
  | "gestor_facilities"
  | "planejador"
  | "supervisor"
  | "tecnico"
  | "auxiliar"
  | "almoxarife"
  | "comercial"
  | "financeiro"
  | "cliente_gestor"
  | "solicitante"
  | "auditor"
  | "fornecedor";

export interface SessionProfile {
  authUserId: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  tenant: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    status: string;
  } | null;
}

export const roleLabels: Record<UserRole, string> = {
  super_admin_saas: "Super admin SaaS",
  admin_org: "Administrador da empresa",
  gestor_facilities: "Gestor de facilities",
  planejador: "Planejador",
  supervisor: "Supervisor",
  tecnico: "Tecnico",
  auxiliar: "Auxiliar",
  almoxarife: "Almoxarife",
  comercial: "Comercial",
  financeiro: "Financeiro",
  cliente_gestor: "Gestor do cliente",
  solicitante: "Solicitante",
  auditor: "Auditor",
  fornecedor: "Fornecedor"
};

export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createSupabaseServer();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users_profile")
    .select("id, tenant_id, name, email, role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return {
      authUserId: user.id,
      email: user.email ?? "",
      name: user.email ?? "Usuario sem perfil",
      role: "solicitante",
      active: false,
      tenant: null
    };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, slug, plan, status")
    .eq("id", profile.tenant_id)
    .maybeSingle();

  return {
    authUserId: user.id,
    email: profile.email || user.email || "",
    name: profile.name,
    role: profile.role as UserRole,
    active: Boolean(profile.active),
    tenant: tenant ?? null
  };
}
