"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

/**
 * Persiste a preferencia de tema em cookie (SSR-friendly).
 * Valores validos: "light" | "dark" | "system".
 * Default: "system" (segue prefers-color-scheme).
 *
 * O cookie e lido no layout.tsx para setar data-theme no <html>
 * antes da hidratacao, evitando flash.
 */
export async function setTheme(theme: "light" | "dark" | "system") {
  const value = theme === "system" ? "system" : theme === "dark" ? "dark" : "light";
  const cookieStore = await cookies();
  cookieStore.set("theme", value, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 ano
    sameSite: "lax",
    httpOnly: false, // precisa ser legivel pelo script inline no <head>
  });
  revalidatePath("/", "layout");
}

/**
 * Le o tema do cookie no servidor (para SSR sem flash).
 * Retorna "system" se nao houver cookie.
 */
export async function getTheme(): Promise<"light" | "dark" | "system"> {
  const cookieStore = await cookies();
  const value = cookieStore.get("theme")?.value;
  if (value === "light" || value === "dark") return value;
  return "system";
}