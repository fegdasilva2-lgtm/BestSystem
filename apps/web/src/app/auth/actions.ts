"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { getSessionProfile } from "@/lib/auth";
import { canManageUsers } from "@/lib/rbac-matrix";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Valida o parametro `next` para prevenir open redirect.
 * Apenas caminhos internos (relativos) sao permitidos.
 * Bloqueia:
 *   - //evil.com         (protocol-relative URL)
 *   - https://evil.com   (absolute URL)
 *   - /admin//evil.com   (path com有机会域名碰瓷)
 *   - /admin/../evil.com (path traversal)
 */
function safeNext(value: FormDataEntryValue | null): string {
  const raw = String(value || "/admin");
  try {
    const url = new URL(raw, "http://localhost");
    // Se new URL() resolve para um hostname diferente de localhost,
    // e uma URL absoluta (protocol-relative ou nao) — bloquear.
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return "/admin";
    }
    return url.pathname + url.search;
  } catch {
    // Nao e uma URL valida — verificar se e apenas path simples
    if (/^\/[^\/]*$|^\/$/.test(raw)) return raw;
    return "/admin";
  }
}

export async function login(prev: unknown, form: FormData) {
  // `prev` é o estado anterior (exigido pelo useActionState do React 19); não usado.
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const next = safeNext(form.get("next"));

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Informe e-mail e senha.")}&next=${encodeURIComponent(next)}`);
  }

  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent("Login inválido ou usuário sem perfil ativo.")}&next=${encodeURIComponent(next)}`);
  }

  const { data: profile } = await supabase
    .from("users_profile")
    .select("id, active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.active) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("Usuário autenticado, mas sem perfil ativo ou sem claims de tenant. Verifique users_profile e Auth Hook.")}&next=${encodeURIComponent(next)}`);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function logout() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/**
 * Server action: invalida todas as sessoes ativas de um usuario alvo,
 * sem alterar role nem active. Util para:
 *   - Deslogar um usuario apos troca de role (chamado em sequencia)
 *   - Encerrar sessoes de um usuario que sera desativado em seguida
 *   - Forcar re-autenticacao apos suspeita de comprometimento
 *
 * Regras:
 *   - Apenas admin_org e super_admin_saas podem executar.
 *   - O proprio admin nao pode invalidar a propria sessao por aqui
 *     (deve usar logout() normal) — evita lockout acidental.
 *   - Marca sessions_invalidated_at = NOW() em users_profile; o proxy
 *     checa isso em toda request e desloga JWTs antigos.
 *
 * Nao confundir com auth.admin.signOut(): este deleta UMA sessao pelo JWT.
 * Aqui o efeito e em TODAS as sessoes futuras do usuario ate ele logar
 * de novo e o Auth Hook reemitir JWT com sessions_invalidated_at atual.
 */
export async function forceLogout(targetUserId: string): Promise<void> {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) {
    redirect("/login?error=Sessão inválida");
  }
  if (!canManageUsers(profile.role)) {
    redirect("/admin/users?error=" + encodeURIComponent("Sem permissão para invalidar sessões."));
  }
  if (targetUserId === profile.authUserId) {
    redirect("/admin/users?error=" + encodeURIComponent("Use logout normal para encerrar a própria sessão."));
  }

  const admin = createSupabaseAdmin();
  const { error } = await admin
    .from("users_profile")
    .update({ sessions_invalidated_at: new Date().toISOString() })
    .eq("id", targetUserId);

  if (error) {
    redirect("/admin/users?error=" + encodeURIComponent(`Falha ao invalidar sessões: ${error.message}`));
  }

  revalidatePath("/admin/users");
  redirect(`/admin/users?ok=${encodeURIComponent("Sessões do usuário invalidadas.")}`);
}
