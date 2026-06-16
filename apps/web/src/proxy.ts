// Proxy Next.js: protege rotas privadas usando a sessao Supabase.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Valida e sanitiza o parametro `next` para prevenir open redirect.
 * Retorna apenas o pathname interno se valido, ou "/admin" como fallback.
 */
function sanitizeNextParam(rawNext: string | null): string {
  const value = rawNext ?? "/admin";
  try {
    // new URL com base ficticia resolve URLs relativas e absolutas
    const url = new URL(value, "http://localhost");
    // So permite hostname localhost/127 (evita //evil.com e https://evil.com)
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return "/admin";
    }
    return url.pathname + url.search;
  } catch {
    // fallback seguro
    return "/admin";
  }
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          for (const { name, value, options } of toSet) {
            response.cookies.set(name, value, options);
          }
        }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const protectedRoute = request.nextUrl.pathname.startsWith("/portal")
    || request.nextUrl.pathname.startsWith("/admin");

  if (!protectedRoute) return response;

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  // Sanitiza o next antes de passar adiante — evita open redirect
  const nextParam = request.nextUrl.searchParams.get("next") ?? request.nextUrl.pathname + request.nextUrl.search;
  loginUrl.searchParams.set("next", sanitizeNextParam(nextParam));

  if (!user) {
    return NextResponse.redirect(loginUrl);
  }

  // Revogacao defensiva: se o usuario foi desativado em users_profile,
  // bloqueia acesso mesmo que o JWT antigo ainda nao tenha expirado.
  const { data: profile } = await supabase
    .from("users_profile")
    .select("active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.active) {
    loginUrl.searchParams.set("error", "Sessão expirada ou usuário desativado.");
    const redirectResponse = NextResponse.redirect(loginUrl);
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        redirectResponse.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
      }
    }
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*"]
};
