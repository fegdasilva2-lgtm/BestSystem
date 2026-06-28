// Fixtures Playwright: cada role tem seu proprio `test` autenticado
// via storageState gerado pelo global-setup.
//
// Uso no spec:
//   import { test, expect } from "./fixtures";
//   test("admin pode acessar /admin/users", async ({ adminPage }) => {
//     await adminPage.goto("/admin/users");
//     await expect(adminPage).toHaveURL(/\/admin\/users/);
//   });
//
// Se global-setup nao foi executado (env ausente), o teste faz skip
// gracioso sem falhar o CI.

import { test as base, expect, Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const AUTH_DIR = join(process.cwd(), "tests/e2e/.auth");

type Role =
  | "super_admin_saas"
  | "admin_org"
  | "gestor_facilities"
  | "planejador"
  | "supervisor"
  | "tecnico"
  | "auxiliar"
  | "almoxarife"
  | "comercial"
  | "financeiro"
  | "cliente_gestor"
  | "solicitante"
  | "auditor"
  | "fornecedor";

const ROLES: readonly Role[] = [
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
];

// Mapa role -> nome da fixture
type RoleFixtures = {
  [K in Role as `${K}Page`]: Page;
};

function authFile(role: Role): string {
  return join(AUTH_DIR, `${role}.json`);
}

function isSetupDone(): boolean {
  // Verifica se pelo menos um storageState existe
  return existsSync(authFile("admin_org"));
}

/**
 * Fixture que cria um Page ja autenticado para cada role.
 * Se setup nao foi feito (env ausente), marca o teste como skipped.
 */
export const test = base.extend<RoleFixtures>(
  Object.fromEntries(
    ROLES.map((role) => [
      `${role}Page`,
      async ({ browser }: { browser: import("@playwright/test").Browser }, use: (page: Page) => Promise<void>, testInfo: import("@playwright/test").TestInfo) => {
        if (!isSetupDone()) {
          testInfo.skip(
            true,
            "E2E setup nao executado. Defina SUPABASE_URL/SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY/E2E_TEST_TENANT_ID e rode com npm run test:e2e."
          );
          return;
        }
        const context = await browser.newContext({
          storageState: authFile(role),
        });
        const page = await context.newPage();
        await use(page);
        await context.close();
      },
    ])
  ) as Record<string, (...args: unknown[]) => Promise<void>>
);

export { expect };
export type { Role, RoleFixtures };

/**
 * Helper para ler o mapa user_id -> role gerado pelo global-setup.
 * Usado em testes que precisam verificar audit_logs ou audit_logs.actor_id.
 */
export function getTestUserIds(): Record<Role, string> | null {
  const path = join(AUTH_DIR, "user-ids.json");
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}