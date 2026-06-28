// Setup global do Playwright: cria 14 usuarios de teste (um por role)
// no Supabase e gera storageState por role para uso nos testes.
//
// Requer env vars:
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY
//   E2E_TEST_TENANT_ID  (tenant onde os usuarios serao criados)
//
// Os usuarios sao criados com email prefix `e2e+<role>@predialops.test`
// e senha `E2ETestPass!123`. Reutilizados entre runs (idempotente).

import { createClient } from "@supabase/supabase-js";
import { chromium, FullConfig } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROLES = [
  "super_admin_saas",
  "admin_org",
  "gestor_facilities",
  "planejador",
  "supervisor",
  "tecnico",
  "auxiliar",
  "almoxarife",
  "comercial",
  "financeiro",
  "cliente_gestor",
  "solicitante",
  "auditor",
  "fornecedor",
] as const;

type Role = (typeof ROLES)[number];

const AUTH_DIR = join(process.cwd(), "tests/e2e/.auth");

export default async function globalSetup(config: FullConfig) {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const tenantId = process.env.E2E_TEST_TENANT_ID;
  const baseURL = config.projects[0]?.use.baseURL || "http://localhost:3000";

  if (!url || !anonKey || !serviceKey || !tenantId) {
    console.log(
      "\n[setup] Variaveis SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY/E2E_TEST_TENANT_ID ausentes. Testes E2E serao pulados.\n"
    );
    // Cria arquivo sentinela para que specs possam detectar
    await mkdir(AUTH_DIR, { recursive: true });
    await writeFile(join(AUTH_DIR, ".skip"), "true");
    return;
  }

  console.log(`\n[setup] Criando ${ROLES.length} usuarios de teste no tenant ${tenantId}...\n`);

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Cria (ou recupera) cada usuario de teste
  const userIds: Record<Role, string> = {} as Record<Role, string>;
  for (const role of ROLES) {
    const email = `e2e+${role}@predialops.test`;
    const password = "E2ETestPass!123";

    // Verifica se ja existe
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email === email);

    let userId: string;
    if (found) {
      userId = found.id;
      console.log(`  [=] ${role}: reusando ${userId}`);
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: {
          tenant_id: tenantId,
          user_role: role,
          user_active: true,
        },
        user_metadata: { display_name: `E2E ${role}` },
      });
      if (error || !created.user) {
        throw new Error(`Falha ao criar usuario ${role}: ${error?.message}`);
      }
      userId = created.user.id;
      console.log(`  [+] ${role}: criado ${userId}`);
    }

    // Garante users_profile correspondente
    const { error: profileError } = await admin
      .from("users_profile")
      .upsert(
        {
          id: userId,
          tenant_id: tenantId,
          name: `E2E ${role}`,
          email,
          role,
          active: true,
        },
        { onConflict: "id" }
      );
    if (profileError) {
      throw new Error(`Falha ao upsert profile ${role}: ${profileError.message}`);
    }

    userIds[role] = userId;
  }

  // Salva mapa userId -> role para uso nos specs (audit_logs checks)
  await mkdir(AUTH_DIR, { recursive: true });
  await writeFile(
    join(AUTH_DIR, "user-ids.json"),
    JSON.stringify(userIds, null, 2)
  );

  // Para cada role, faz login via Playwright e salva storageState
  const browser = await chromium.launch();
  try {
    for (const role of ROLES) {
      const context = await browser.newContext({ baseURL });
      const page = await context.newPage();
      await page.goto("/login");
      await page.fill('input[name="email"]', `e2e+${role}@predialops.test`);
      await page.fill('input[name="password"]', "E2ETestPass!123");
      await page.click('button[type="submit"]');
      // Espera redirect (apos login valido, vai para /admin ou /portal)
      await page.waitForURL(/\/(admin|portal)/, { timeout: 10_000 });
      await context.storageState({ path: join(AUTH_DIR, `${role}.json`) });
      await context.close();
      console.log(`  [auth] ${role}: storageState salvo`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n[setup] OK. Auth dir: ${AUTH_DIR}\n`);
}