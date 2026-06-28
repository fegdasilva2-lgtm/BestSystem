// Testes E2E da matriz RBAC: para cada um dos 14 perfis, valida que
// acessar uma rota protegida produz o resultado esperado (acesso permitido
// OU redirect para o hub apropriado, conforme canAccess() em rbac-matrix).
//
// Requer: global-setup executado (ver tests/e2e/global-setup.ts).
// Sem env vars Supabase, o spec inteiro faz test.skip() via fixture.

import { test, expect, type Role } from "./fixtures.js";
import { join } from "node:path";
import { existsSync } from "node:fs";

const AUTH_DIR = join(process.cwd(), "tests/e2e/.auth");

type Expected = { allow: (r: Role) => boolean };

const MATRIX: Record<string, Expected> = {
  "/admin": {
    allow: (r: Role) => !["cliente_gestor", "solicitante", "fornecedor"].includes(r),
  },
  "/admin/users": {
    allow: (r: Role) => ["super_admin_saas", "admin_org", "auditor"].includes(r),
  },
  "/admin/audit": {
    allow: (r: Role) => ["super_admin_saas", "auditor"].includes(r),
  },
  "/admin/contracts": {
    allow: (r: Role) =>
      [
        "super_admin_saas",
        "admin_org",
        "gestor_facilities",
        "planejador",
        "supervisor",
        "comercial",
        "financeiro",
        "auditor",
      ].includes(r),
  },
  "/admin/contracts/new": {
    allow: (r: Role) => ["super_admin_saas", "admin_org"].includes(r),
  },
  "/admin/work-orders": {
    allow: (r: Role) =>
      [
        "super_admin_saas",
        "admin_org",
        "gestor_facilities",
        "planejador",
        "supervisor",
        "tecnico",
        "auxiliar",
        "auditor",
      ].includes(r),
  },
  "/admin/measurements": {
    allow: (r: Role) =>
      [
        "super_admin_saas",
        "admin_org",
        "gestor_facilities",
        "planejador",
        "supervisor",
        "tecnico",
        "financeiro",
        "auditor",
      ].includes(r),
  },
  "/admin/sla": {
    allow: (r: Role) =>
      [
        "super_admin_saas",
        "admin_org",
        "gestor_facilities",
        "planejador",
        "supervisor",
        "auditor",
      ].includes(r),
  },
  "/admin/inventory": {
    allow: (r: Role) =>
      [
        "super_admin_saas",
        "admin_org",
        "gestor_facilities",
        "almoxarife",
        "auditor",
      ].includes(r),
  },
  "/admin/import": {
    allow: (r: Role) => ["super_admin_saas", "admin_org"].includes(r),
  },
  "/admin/tenants": {
    allow: (r: Role) => r === "super_admin_saas",
  },
  "/portal": {
    allow: (r: Role) =>
      [
        "super_admin_saas",
        "admin_org",
        "gestor_facilities",
        "comercial",
        "cliente_gestor",
        "solicitante",
        "fornecedor",
      ].includes(r),
  },
};

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

function hubFor(role: Role): RegExp {
  const externalRoles: Role[] = ["cliente_gestor", "solicitante", "fornecedor"];
  return externalRoles.includes(role) ? /\/portal/ : /\/admin/;
}

function storageStateFor(role: Role): string {
  return join(AUTH_DIR, `${role}.json`);
}

// Verifica se setup foi executado. Sem isso, todos os testes pulam.
function setupDone(): boolean {
  return existsSync(storageStateFor("admin_org"));
}

// Para cada role, cria um describe com test.use({ storageState })
// Isso aplica o storageState correto para todos os testes do bloco.
for (const role of ROLES) {
  test.describe(`RBAC matriz - ${role}`, () => {
    test.use({ storageState: setupDone() ? storageStateFor(role) : { cookies: [], origins: [] } });

    for (const route of Object.keys(MATRIX)) {
      const expected = MATRIX[route];
      const shouldAllow = expected.allow(role);

      test(`${shouldAllow ? "PODE" : "NAO PODE"} acessar ${route}`, async ({ page }) => {
        test.skip(!setupDone(), "Setup E2E nao executado. Defina env vars Supabase.");

        await page.goto(route, { waitUntil: "domcontentloaded" });

        if (shouldAllow) {
          await expect(page).toHaveURL(new RegExp(`^${route.replace(/\//g, "\\/")}(\\/|\\?|$)`));
        } else {
          await expect(page).toHaveURL(hubFor(role));
        }
      });
    }
  });
}