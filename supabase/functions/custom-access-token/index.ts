// Supabase Auth Hook: custom_access_token_hook
// Chamado toda vez que um JWT e emitido (login, refresh).
// Le o users_profile do usuario autenticado e injeta:
//   - tenant_id  (claim lido pelas policies de RLS)
//   - role       (claim usado em policies + client-side guards)
//   - active     (claim para revogar tokens de usuarios desativados)
//
// Sem esse hook, as policies de RLS nao conseguem filtrar por tenant
// porque o claim `tenant_id` nao existe no JWT padrao do Supabase.
//
// Documentacao oficial:
//   https://supabase.com/docs/guides/auth/auth-hooks
//
// Ativacao:
//   1. supabase functions deploy custom-access-token --no-verify-jwt
//   2. Dashboard > Authentication > Hooks > Custom Access Token: ON
//      (aponta para a funcao acima)
//   3. supabase secrets set SERVICE_ROLE_KEY=...   (se ainda nao tiver)
//   4. Testar com:
//      SELECT public.current_tenant_id();   -- apos login, deve retornar o tenant

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface HookEvent {
  user_id: string;
  claims: Record<string, unknown>;
}

interface ProfileRow {
  tenant_id: string;
  role: string;
  active: boolean;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error("SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false }
});

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let event: HookEvent;
  try {
    event = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!event?.user_id) {
    return new Response("Missing user_id", { status: 400 });
  }

  // Busca o perfil de dominio. Se nao existir, emite token sem
  // tenant_id -> o usuario cai no default "sem tenant" e nenhuma
  // policy libera dados. Fail-closed.
  const { data: profile, error } = await admin
    .from("users_profile")
    .select("tenant_id, role, active")
    .eq("id", event.user_id)
    .maybeSingle();

  if (error) {
    console.error("users_profile lookup failed", error);
    return new Response("Profile lookup failed", { status: 500 });
  }

  if (!profile) {
    return new Response("Profile not provisioned", { status: 403 });
  }

  if (!profile.active) {
    return new Response("User is disabled", { status: 403 });
  }

  // Mescla com os claims existentes. NUNCA sobrescreve campos
  // sensiveis (`sub`, `iat`, `exp`, `aud`, `role` do auth).
  const nextClaims = {
    ...event.claims,
    tenant_id: profile.tenant_id,
    user_role: profile.role,
    user_active: profile.active
  };

  return new Response(JSON.stringify({ claims: nextClaims }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
});
