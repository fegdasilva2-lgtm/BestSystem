// Edge Function: rls-isolation-test
// Acionada manualmente apos o deploy para validar que a RLS
// esta bloqueando acesso cross-tenant. Cria usuarios de teste
// (um por tenant), insere dados de smoke e tenta vazar.
//
// Endpoint: POST /functions/v1/rls-isolation-test
// Header: Authorization: Bearer <service_role_key>
//
// Retorna um JSON com { passed: bool, results: [...] }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false }
});

interface Step {
  name: string;
  passed: boolean;
  detail: string;
}

const TENANT_A = "00000000-0000-0000-0000-000000000001";
const TENANT_B = "00000000-0000-0000-0000-000000000002";
const USER_A = `rls-test-a-${Date.now()}@predialops.test`;
const USER_B = `rls-test-b-${Date.now()}@predialops.test`;
const PASSWORD = "RlsTest!2026";

Deno.serve(async () => {
  const results: Step[] = [];

  // 1. Cria usuarios
  const a = await admin.auth.admin.createUser({
    email: USER_A, password: PASSWORD, email_confirm: true
  });
  const b = await admin.auth.admin.createUser({
    email: USER_B, password: PASSWORD, email_confirm: true
  });
  if (a.error || b.error) {
    return json({ passed: false, results: [{ name: "create users", passed: false, detail: a.error?.message ?? b.error?.message ?? "unknown" }] });
  }

  try {
    // 2. Provisiona profiles
    await admin.from("users_profile").insert([
      { id: a.data.user!.id, tenant_id: TENANT_A, name: "RLS A", email: USER_A, role: "admin_org" },
      { id: b.data.user!.id, tenant_id: TENANT_B, name: "RLS B", email: USER_B, role: "admin_org" }
    ]);

    // 3. Cliente de cada tenant (autenticado como o usuario)
    const clientA = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "anon-not-set", {
      auth: { persistSession: false }
    });
    await clientA.auth.signInWithPassword({ email: USER_A, password: PASSWORD });

    const clientB = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "anon-not-set", {
      auth: { persistSession: false }
    });
    await clientB.auth.signInWithPassword({ email: USER_B, password: PASSWORD });

    // 4. Tenant A insere um customer exclusivo
    const probe = { tenant_id: TENANT_A, name: `PROBE-A-${Date.now()}` };
    const ins = await clientA.from("customers").insert(probe).select("id").single();
    results.push({
      name: "Tenant A insere customer",
      passed: !ins.error,
      detail: ins.error?.message ?? `id=${ins.data?.id}`
    });

    // 5. Tenant B tenta ler o customer de A
    const leak = await clientB.from("customers").select("id, name").eq("name", probe.name);
    const leaked = (leak.data?.length ?? 0) > 0;
    results.push({
      name: "Tenant B NAO ve customer de A",
      passed: !leaked,
      detail: leaked ? `VAZOU: ${JSON.stringify(leak.data)}` : "ok (0 linhas)"
    });

    // 6. Tenant B insere customer e A tenta ler
    const probeB = { tenant_id: TENANT_B, name: `PROBE-B-${Date.now()}` };
    await clientB.from("customers").insert(probeB);
    const leak2 = await clientA.from("customers").select("id, name").eq("name", probeB.name);
    const leaked2 = (leak2.data?.length ?? 0) > 0;
    results.push({
      name: "Tenant A NAO ve customer de B",
      passed: !leaked2,
      detail: leaked2 ? `VAZOU: ${JSON.stringify(leak2.data)}` : "ok (0 linhas)"
    });

    // 7. Listagem de customers: cada um ve apenas os seus
    const listA = await clientA.from("customers").select("tenant_id");
    const onlyA = (listA.data ?? []).every((r) => r.tenant_id === TENANT_A);
    results.push({
      name: "Listagem de A soh retorna TENANT_A",
      passed: onlyA,
      detail: onlyA ? `ok (${listA.data?.length} linhas)` : `misturou: ${JSON.stringify(listA.data?.slice(0, 3))}`
    });

    // 8. work_orders: cria em A, tenta atualizar de B
    const wo = await clientA.from("work_orders").insert({
      tenant_id: TENANT_A,
      type: "preventiva",
      priority: "media",
      status: "planejada",
      description: "RLS probe",
      idempotency_key: `rls-${Date.now()}`
    }).select("id").single();

    if (wo.data?.id) {
      const upd = await clientB.from("work_orders")
        .update({ description: "INVADIDO" })
        .eq("id", wo.data.id)
        .select("id");
      const updated = (upd.data?.length ?? 0) > 0;
      results.push({
        name: "Tenant B NAO consegue atualizar OS de A",
        passed: !updated,
        detail: updated ? "VAZOU: update cross-tenant" : "ok (0 linhas atualizadas)"
      });
    }

  } finally {
    // Cleanup
    await admin.from("users_profile").delete().in("email", [USER_A, USER_B]);
    await admin.auth.admin.deleteUser(a.data.user!.id);
    await admin.auth.admin.deleteUser(b.data.user!.id);
    await admin.from("customers").delete().like("name", "PROBE-%");
    await admin.from("work_orders").delete().like("description", "RLS probe%");
  }

  const passed = results.every((r) => r.passed);
  return json({ passed, results });
});

function json(body: unknown) {
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json" }
  });
}
