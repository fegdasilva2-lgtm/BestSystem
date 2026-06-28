// Testes unitarios da matriz RBAC (apps/web/src/lib/rbac-matrix.ts).
//
// Roda com Node 24+ via --experimental-strip-types. Sem dependencia
// de Supabase ou Next.js. Valida programaticamente que cada um dos
// 14 perfis consegue acessar exatamente as rotas que docs/PERFIS.md
// declara (e nenhuma outra).
//
// Complementa tests/authorization.test.mjs (que valida capabilities
// de negocio: measurements.approve, etc.). Aqui validamos o portao
// de URL/path: canAccess(role, pathname).
//
// Cada linha da matriz EXPECTED espelha a tabela "Rotas vs Perfis"
// de docs/PERFIS.md (linhas 118-141).

import {
  canAccess,
  canManageUsers,
  canManageTenantConfig,
  PUBLIC_ROUTES,
  ROUTE_ACCESS,
} from "../apps/web/src/lib/rbac-matrix.ts";

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

// Matriz esperada: rota -> roles permitidas. DEVE espelhar
// docs/PERFIS.md (Rotas vs Perfis, linhas 118-141).
const EXPECTED: Record<string, readonly Role[]> = {
  // Setup / cross-tenant
  "/setup": ["super_admin_saas"],
  "/admin/tenants": ["super_admin_saas"],
  "/admin/audit": ["super_admin_saas", "auditor"],

  // Hub admin
  "/admin": [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "almoxarife",
    "auditor",
  ],

  // Gestao de usuarios
  "/admin/users": ["super_admin_saas", "admin_org", "auditor"],

  // Clientes
  "/admin/customers": ["super_admin_saas", "admin_org", "gestor_facilities", "auditor"],
  "/admin/customers/new": ["super_admin_saas", "admin_org"],

  // Contratos
  "/admin/contracts": [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "comercial",
    "financeiro",
    "auditor",
  ],
  "/admin/contracts/new": ["super_admin_saas", "admin_org"],

  // Sites
  "/admin/sites": [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "auditor",
  ],
  "/admin/sites/new": ["super_admin_saas", "admin_org"],

  // Ativos
  "/admin/assets": [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "auditor",
  ],
  "/admin/assets/new": ["super_admin_saas", "admin_org"],

  // PMOC
  "/admin/pmoc": [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "tecnico",
    "auditor",
  ],

  // OS
  "/admin/work-orders": [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "tecnico",
    "auxiliar",
    "auditor",
  ],
  "/admin/work-orders/new": [
    "super_admin_saas",
    "admin_org",
    "planejador",
    "supervisor",
  ],

  // Medicoes
  "/admin/measurements": [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "tecnico",
    "financeiro",
    "auditor",
  ],
  "/admin/measurements/new": ["super_admin_saas", "admin_org", "supervisor"],

  // SLA
  "/admin/sla": [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "auditor",
  ],

  // RGM
  "/admin/rgm": [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "financeiro",
    "auditor",
  ],

  // Reports
  "/admin/reports": [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "comercial",
    "financeiro",
    "auditor",
  ],

  // Almoxarifado
  "/admin/inventory": [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "almoxarife",
    "auditor",
  ],

  // Importacao
  "/admin/import": ["super_admin_saas", "admin_org"],

  // Sobre (documentacao) — todos autenticados
  "/admin/sobre": ROLES,

  // PWA mobile
  "/apps/mobile": [
    "super_admin_saas",
    "supervisor",
    "tecnico",
    "auxiliar",
    "fornecedor",
  ],

  // Portal hub
  "/portal": [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "comercial",
    "cliente_gestor",
    "solicitante",
    "fornecedor",
  ],
  "/portal/solicitations": ["cliente_gestor", "solicitante"],
  "/portal/work-orders": ["cliente_gestor", "solicitante", "fornecedor"],
};

// =====================================================================
// Runner
// =====================================================================

let failures = 0;
function expect(name: string, cond: boolean, detail = "") {
  if (cond) console.log("ok   - " + name);
  else {
    console.log("FAIL - " + name + (detail ? ` :: ${detail}` : ""));
    failures += 1;
  }
}

// 1) Valida a matriz completa (14 perfis x N rotas)
console.log("\n# 1) Matriz canAccess(role, route) x " + ROLES.length + " perfis\n");
for (const [route, expectedRoles] of Object.entries(EXPECTED)) {
  for (const role of ROLES) {
    const should = expectedRoles.includes(role);
    const actual = canAccess(role, route);
    const verdict = should ? "PODE" : "NAO PODE";
    expect(`${role.padEnd(18)} ${verdict} ${route}`, actual === should);
  }
}

// 2) Longest-prefix-match: rotas profundas usam regra mais especifica
console.log("\n# 2) Longest-prefix-match\n");
expect(
  "/admin/contracts/new respeita regra mais especifica (nao /admin)",
  canAccess("planejador", "/admin/contracts") === true && canAccess("planejador", "/admin/contracts/new") === false
);
expect(
  "/admin/work-orders/new respeita regra especifica",
  canAccess("supervisor", "/admin/work-orders") === true && canAccess("supervisor", "/admin/work-orders/new") === true
);
expect(
  "/admin/measurements/new respeita regra especifica (nao supervisor para /new)",
  canAccess("tecnico", "/admin/measurements") === true && canAccess("tecnico", "/admin/measurements/new") === false
);

// 3) Longest-prefix-match em rotas nao-listadas: caem na regra pai mais
//    especifica (admin-hub roles podem navegar /admin/*, portal roles
//    podem navegar /portal/*). A defesa real contra rotas inexistentes
//    vem do Next.js (404 automatico), nao da matriz.
console.log("\n# 3) Longest-prefix-match para rotas nao-listadas\n");
expect(
  "/admin/foo cai na regra /admin (admin-hub roles acessam)",
  canAccess("admin_org", "/admin/foo") === true && canAccess("tecnico", "/admin/foo") === false
);
expect(
  "/portal/qualquer-coisa cai na regra /portal (portal roles acessam)",
  canAccess("cliente_gestor", "/portal/qualquer-coisa") === true && canAccess("tecnico", "/portal/qualquer-coisa") === false
);
expect(
  "/xyz (fora de /admin e /portal) cai em rota publica? Nao, sem regra -> nega",
  !canAccess("super_admin_saas", "/xyz") && !canAccess("admin_org", "/xyz")
);
expect(
  "/admin/inexistente (sem regra especifica) -> segue regra /admin",
  canAccess("super_admin_saas", "/admin/inexistente") === true && canAccess("tecnico", "/admin/inexistente") === false
);

// 4) Rotas publicas: sempre permitidas, independente de role
console.log("\n# 4) Rotas publicas (PUBLIC_ROUTES)\n");
for (const route of PUBLIC_ROUTES) {
  for (const role of ROLES) {
    expect(`${role.padEnd(18)} PODE ${route} (publica)`, canAccess(role, route));
  }
}

// 5) canManageUsers — apenas super_admin_saas e admin_org
console.log("\n# 5) canManageUsers(role)\n");
for (const role of ROLES) {
  const expected = role === "super_admin_saas" || role === "admin_org";
  const actual = canManageUsers(role);
  expect(`${role.padEnd(18)} canManageUsers=${expected}`, actual === expected, expected ? "deveria poder" : "nao deveria poder");
}

// 6) canManageTenantConfig — mesmo criterio (apenas admin da empresa)
console.log("\n# 6) canManageTenantConfig(role)\n");
for (const role of ROLES) {
  const expected = role === "super_admin_saas" || role === "admin_org";
  const actual = canManageTenantConfig(role);
  expect(`${role.padEnd(18)} canManageTenantConfig=${expected}`, actual === expected);
}

// 7) Cobertura: cada role de ROLES aparece em alguma rota
console.log("\n# 7) Cobertura da matriz\n");
const rolesInMatrix = new Set<Role>();
for (const expected of Object.values(EXPECTED)) {
  for (const r of expected) rolesInMatrix.add(r);
}
for (const role of ROLES) {
  expect(`Role ${role} referenciada em alguma rota da matriz`, rolesInMatrix.has(role));
}

// 8) ROUTE_ACCESS nao tem duplicatas de prefixo
console.log("\n# 8) Integridade de ROUTE_ACCESS\n");
const seen = new Set<string>();
let dupFound = false;
for (const rule of ROUTE_ACCESS) {
  if (seen.has(rule.prefix)) {
    expect(`prefixo duplicado em ROUTE_ACCESS: ${rule.prefix}`, false);
    dupFound = true;
  }
  seen.add(rule.prefix);
}
if (!dupFound) expect("ROUTE_ACCESS sem prefixos duplicados", true);

// 9) Sidebar coverage: rotas usadas na Sidebar estao na matriz
console.log("\n# 9) Rotas usadas pela Sidebar estao na matriz RBAC\n");
const sidebarHrefs = [
  "/admin",
  "/admin/contracts",
  "/admin/assets",
  "/admin/work-orders",
  "/admin/measurements",
  "/admin/pmoc",
  "/admin/sla",
  "/admin/rgm",
  "/admin/users",
  "/admin/audit",
  "/admin/import",
];
for (const href of sidebarHrefs) {
  // Se existe regra na matriz para esse prefixo, ok. Se nao, falha.
  const has = ROUTE_ACCESS.some((r) => href === r.prefix || href.startsWith(r.prefix + "/"));
  expect(`Sidebar href ${href} tem regra em ROUTE_ACCESS`, has);
}

// Resumo
if (failures > 0) {
  console.log(`\n${failures} teste(s) falharam.`);
  process.exit(1);
}
console.log(`\nTodos os ${Object.keys(EXPECTED).length * ROLES.length} testes da matriz passaram.`);