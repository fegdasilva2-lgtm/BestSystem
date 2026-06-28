// Proxy Next.js: protege rotas privadas usando a sessao Supabase + RBAC.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccess, type UserRole } from "@/lib/rbac-matrix";

/**
 * Valida e sanitiza o parametro `next` para prevenir open redirect.
 * Retorna apenas o pathname interno se valido, ou "/admin" como fallback.
 */
function sanitizeNextParam(rawNext: string | null): string {
  const value = rawNext ?? "/admin";
  try {
    const url = new URL(value, "http://localhost");
    if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
      return "/admin";
    }
    return url.pathname + url.search;
  } catch {
    return "/admin";
  }
}

/**
 * Hub padrao para redirecionar um usuario apos auth/authorization check.
 * Perfis externos (cliente/solicitante/fornecedor) vao para /portal.
 * Demais perfis vao para /admin.
 */
function hubFor(role: UserRole): "/admin" | "/portal" {
  const externalRoles: UserRole[] = ["cliente_gestor", "solicitante", "fornecedor"];
  return externalRoles.includes(role) ? "/portal" : "/admin";
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
  const pathname = request.nextUrl.pathname;
  const protectedRoute = pathname.startsWith("/portal") || pathname.startsWith("/admin");

  if (!protectedRoute) return response;

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  const nextParam = request.nextUrl.searchParams.get("next") ?? pathname + request.nextUrl.search;
  loginUrl.searchParams.set("next", sanitizeNextParam(nextParam));

  // 1. Gate de autenticacao
  if (!user) {
    return NextResponse.redirect(loginUrl);
  }

  // 2. Revogacao defensiva: usuario desativado em users_profile e bloqueado
  //    mesmo com JWT ainda valido. Tambem checa sessions_invalidated_at para
  //    detectar mudanca de role/active apos emissao do JWT (claim stale).
  const { data: profile } = await supabase
    .from("users_profile")
    .select("active, role, sessions_invalidated_at")
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

  // JWT staleness: se sessions_invalidated_at > iat, o token atual
  // carrega claims antigos (role/active desatualizados). Forca re-login.
  const jwtIat = (user as { iat?: number }).iat;
  if (
    profile.sessions_invalidated_at &&
    typeof jwtIat === "number" &&
    new Date(profile.sessions_invalidated_at).getTime() > jwtIat * 1000
  ) {
    loginUrl.searchParams.set("error", "Sua sessão foi invalidada. Faça login novamente.");
    const redirectResponse = NextResponse.redirect(loginUrl);
    for (const cookie of request.cookies.getAll()) {
      if (cookie.name.startsWith("sb-")) {
        redirectResponse.cookies.set(cookie.name, "", { maxAge: 0, path: "/" });
      }
    }
    return redirectResponse;
  }

  // 3. Gate de autorizacao (RBAC) — usa a matriz central.
  //    Se o perfil nao pode acessar o pathname, redireciona para o hub proprio
  //    com mensagem de erro, em vez de revelar que a rota existe.
  const role = profile.role as UserRole;
  if (!canAccess(role, pathname)) {
    const hub = request.nextUrl.clone();
    hub.pathname = hubFor(role);
    hub.searchParams.set("error", "Você não tem permissão para acessar essa área.");
    return NextResponse.redirect(hub);
  }

  return response;
}

export const config = {
  matcher: ["/portal/:path*", "/admin/:path*"]
};