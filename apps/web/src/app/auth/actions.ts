"use server";

import { createSupabaseServer } from "@/lib/supabase-server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function safeNext(value: FormDataEntryValue | null) {
  const next = String(value || "/admin");
  return next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
}

export async function login(form: FormData) {
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const next = safeNext(form.get("next"));

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Informe e-mail e senha.")}&next=${encodeURIComponent(next)}`);
  }

  const supabase = createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent("Login invalido ou usuario sem perfil ativo.")}&next=${encodeURIComponent(next)}`);
  }

  const { data: profile } = await supabase
    .from("users_profile")
    .select("id, active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.active) {
    await supabase.auth.signOut();
    redirect(`/login?error=${encodeURIComponent("Usuario autenticado, mas sem perfil ativo ou sem claims de tenant. Verifique users_profile e Auth Hook.")}&next=${encodeURIComponent(next)}`);
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function logout() {
  const supabase = createSupabaseServer();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
