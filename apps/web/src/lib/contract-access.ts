import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile, type UserRole } from "@/lib/auth";

/**
 * Roles que veem apenas contratos vinculados via user_contract_access.
 * Roles internos (admin_org, gestor_facilities, etc.) veem todos os contratos do tenant.
 */
const EXTERNAL_ROLES: UserRole[] = ["cliente_gestor", "solicitante", "fornecedor"];

export function isExternalRole(role: UserRole): boolean {
  return EXTERNAL_ROLES.includes(role);
}

/**
 * Retorna os IDs dos contratos que o usuario atual pode acessar.
 * - Roles internos: todos os contratos do tenant (array vazio = sem filtro)
 * - Roles externos: apenas os vinculados em user_contract_access
 * - Sem sessao: array vazio
 */
export async function getAccessibleContractIds(): Promise<string[]> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return [];

  // Roles internos veem tudo — retorna vazio para nao aplicar filtro
  if (!isExternalRole(profile.role)) return [];

  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("user_contract_access")
    .select("contract_id")
    .eq("user_id", profile.authUserId);

  return (data ?? []).map((r) => r.contract_id);
}

/**
 * Verifica se o usuario atual pode acessar um contrato especifico.
 * Usado para guards em actions e paginas de detalhe.
 */
export async function canAccessContract(contractId: string): Promise<boolean> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return false;

  // Super admin ve tudo
  if (profile.role === "super_admin_saas") return true;

  // Roles internos veem todos os contratos do tenant
  if (!isExternalRole(profile.role)) {
    const supabase = await createSupabaseServer();
    const { data } = await supabase
      .from("contracts")
      .select("id")
      .eq("id", contractId)
      .eq("tenant_id", profile.tenant.id)
      .maybeSingle();
    return !!data;
  }

  // Roles externos: verifica vinculo
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("user_contract_access")
    .select("contract_id")
    .eq("user_id", profile.authUserId)
    .eq("contract_id", contractId)
    .maybeSingle();

  return !!data;
}

/**
 * Adiciona filtro de contrato a uma query do Supabase para roles externos.
 * Para roles internos, nao adiciona filtro (retorna a query inalterada).
 *
 * Uso:
 *   let query = supabase.from("work_orders").select("*").eq("tenant_id", tenantId);
 *   query = await withContractFilter(query, "contract_id");
 *   const { data } = await query;
 */
export async function withContractFilter<T>(
  query: T,
  contractColumn: string = "contract_id"
): Promise<T> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return query;
  if (!isExternalRole(profile.role)) return query;

  const ids = await getAccessibleContractIds();
  if (ids.length === 0) {
    // External user with no linked contracts — force empty result
    return (query as any).eq(contractColumn, "00000000-0000-0000-0000-000000000000");
  }
  return (query as any).in(contractColumn, ids);
}

/**
 * Vincula um usuario a um contrato.
 * Apenas admin_org, gestor_facilities ou super_admin_saas podem executar.
 */
export async function linkUserToContract(
  userId: string,
  contractId: string
): Promise<{ error?: string }> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Sem sessao ativa." };
  if (!["super_admin_saas", "admin_org", "gestor_facilities"].includes(profile.role)) {
    return { error: "Sem permissao para vincular usuarios a contratos." };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("user_contract_access")
    .upsert({
      user_id: userId,
      contract_id: contractId,
      created_by: profile.authUserId,
    });

  if (error) return { error: error.message };
  return {};
}

/**
 * Remove o vinculo de um usuario com um contrato.
 */
export async function unlinkUserFromContract(
  userId: string,
  contractId: string
): Promise<{ error?: string }> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) return { error: "Sem sessao ativa." };
  if (!["super_admin_saas", "admin_org", "gestor_facilities"].includes(profile.role)) {
    return { error: "Sem permissao para desvincular usuarios de contratos." };
  }

  const supabase = await createSupabaseServer();
  const { error } = await supabase
    .from("user_contract_access")
    .delete()
    .eq("user_id", userId)
    .eq("contract_id", contractId);

  if (error) return { error: error.message };
  return {};
}

/**
 * Retorna os contratos vinculados a um usuario especifico.
 * Usado na tela de gerenciamento de usuarios.
 */
export async function getUserContracts(userId: string): Promise<string[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("user_contract_access")
    .select("contract_id")
    .eq("user_id", userId);

  return (data ?? []).map((r) => r.contract_id);
}
