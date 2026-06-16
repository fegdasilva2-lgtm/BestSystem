"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
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
    if (/^\/[^\/]*|^/$/.test(raw)) return raw;
    return "/admin";
  }
}

export async function login(form: FormData) {
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
