import type { UserRole } from "./auth";

/**
 * Matriz central de autorizacao por rota.
 *
 * FONTE UNICA DE VERDADE para o que cada perfil pode acessar.
 * Derivada de docs/PERFIS.md (secao "Rotas vs Perfis", linhas 118-141).
 *
 * Consumida por:
 *   - proxy.ts                       (gate de borda no Next.js)
 *   - components/Sidebar.tsx         (esconder itens sem acesso)
 *   - app/admin/**/page.tsx          (guards de pagina, quando necessario)
 *   - app/admin/**/actions.ts        (guards de server action)
 *
 * Regras:
 *   - Prefixo mais especifico vence (longest match).
 *   - `allow` vazio = rota bloqueada para todos.
 *   - Rotas fora desta tabela e fora de PUBLIC_ROUTES sao negadas por padrao (fail-closed).
 *
 * Quando alterar uma permissao: edite APENAS este arquivo e a tabela
 * correspondente em docs/PERFIS.md. Mantenha os dois em sincronia.
 */

export interface RouteAccessRule {
  /** Prefixo da rota. Match exato OU prefixo seguido de "/". */
  prefix: string;
  /** Roles autorizadas. Use readonly para garantir imutabilidade em runtime. */
  allow: readonly UserRole[];
}

/**
 * Matriz em ordem alfabetica por prefixo.
 * O longest-prefix-match em findRouteRule() garante a regra mais especifica.
 */
export const ROUTE_ACCESS: readonly RouteAccessRule[] = [
  // ── Setup / cross-tenant ──
  { prefix: "/setup", allow: ["super_admin_saas"] },
  { prefix: "/admin/tenants", allow: ["super_admin_saas"] },
  { prefix: "/admin/audit", allow: ["super_admin_saas"] },

  // ── Hub admin ──
  { prefix: "/admin", allow: [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "almoxarife",
    "auditor"
  ]},

  // ── Gestao de usuarios ──
  { prefix: "/admin/users", allow: ["super_admin_saas", "admin_org", "auditor"] },

  // ── Clientes ──
  { prefix: "/admin/customers", allow: ["super_admin_saas", "admin_org", "gestor_facilities", "auditor"] },
  { prefix: "/admin/customers/new", allow: ["super_admin_saas", "admin_org"] },

  // ── Contratos ──
  { prefix: "/admin/contracts", allow: [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "comercial",
    "financeiro",
    "auditor"
  ]},
  { prefix: "/admin/contracts/new", allow: ["super_admin_saas", "admin_org"] },

  // ── Sites ──
  { prefix: "/admin/sites", allow: [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "auditor"
  ]},
  { prefix: "/admin/sites/new", allow: ["super_admin_saas", "admin_org"] },

  // ── Ativos ──
  { prefix: "/admin/assets", allow: [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "auditor"
  ]},
  { prefix: "/admin/assets/new", allow: ["super_admin_saas", "admin_org"] },

  // ── PMOC ──
  { prefix: "/admin/pmoc", allow: [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "tecnico",
    "auditor"
  ]},

  // ── Ordens de servico ──
  { prefix: "/admin/work-orders", allow: [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "tecnico",
    "auxiliar",
    "auditor"
  ]},
  { prefix: "/admin/work-orders/new", allow: [
    "super_admin_saas",
    "admin_org",
    "planejador",
    "supervisor"
  ]},

  // ── Medicoes ──
  { prefix: "/admin/measurements", allow: [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "tecnico",
    "financeiro",
    "auditor"
  ]},
  { prefix: "/admin/measurements/new", allow: [
    "super_admin_saas",
    "admin_org",
    "supervisor"
  ]},

  // ── SLA ──
  { prefix: "/admin/sla", allow: [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "auditor"
  ]},

  // ── RGM ──
  { prefix: "/admin/rgm", allow: [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "financeiro",
    "auditor"
  ]},

  // ── Relatorios ──
  { prefix: "/admin/reports", allow: [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "planejador",
    "supervisor",
    "comercial",
    "financeiro",
    "auditor"
  ]},

  // ── Almoxarifado ──
  { prefix: "/admin/inventory", allow: [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "almoxarife",
    "auditor"
  ]},

  // ── Importacao em massa ──
  { prefix: "/admin/import", allow: ["super_admin_saas", "admin_org"] },

  // ── Sobre / info do produto (documentacao interna) ──
  { prefix: "/admin/sobre", allow: [
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
    "auditor",
    "cliente_gestor",
    "solicitante",
    "fornecedor"
  ]},

  // ── PWA mobile (tecnico, auxiliar, fornecedor) ──
  { prefix: "/apps/mobile", allow: [
    "super_admin_saas",
    "supervisor",
    "tecnico",
    "auxiliar",
    "fornecedor"
  ]},

  // ── Portal do cliente (apenas perfis externos + admin/gestor/comercial) ──
  { prefix: "/portal/solicitations", allow: ["cliente_gestor", "solicitante"] },
  { prefix: "/portal/work-orders", allow: ["cliente_gestor", "solicitante", "fornecedor"] },
  { prefix: "/portal", allow: [
    "super_admin_saas",
    "admin_org",
    "gestor_facilities",
    "comercial",
    "cliente_gestor",
    "solicitante",
    "fornecedor"
  ]}
];

/** Rotas acessiveis sem sessao (autenticacao). */
export const PUBLIC_ROUTES: readonly string[] = [
  "/",
  "/login"
];

/**
 * Resolve a regra mais especifica para um pathname (longest-prefix-match).
 * Retorna null se nao houver regra — nesse caso, a rota ou e publica
 * (PUBLIC_ROUTES) ou deve ser negada por padrao (fail-closed).
 */
export function findRouteRule(pathname: string): RouteAccessRule | null {
  let best: RouteAccessRule | null = null;
  for (const rule of ROUTE_ACCESS) {
    const matches = pathname === rule.prefix || pathname.startsWith(rule.prefix + "/");
    if (!matches) continue;
    if (!best || rule.prefix.length > best.prefix.length) {
      best = rule;
    }
  }
  return best;
}

/**
 * Decide se um perfil pode acessar um pathname.
 * - Rotas publicas: sempre permitido.
 * - Rotas com regra: exige role em `allow`.
 * - Rotas sem regra e nao-publicas: negado (fail-closed).
 */
export function canAccess(role: UserRole, pathname: string): boolean {
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  const rule = findRouteRule(pathname);
  if (!rule) return false;
  return rule.allow.includes(role);
}

/**
 * Helper para acoes de gestao de usuarios (criacao, ativacao, troca de role).
 * Conforme docs/PERFIS.md, apenas super_admin_saas e admin_org administram
 * usuarios do proprio tenant. gestor_facilities NAO deve criar usuarios.
 */
export function canManageUsers(role: UserRole): boolean {
  return role === "super_admin_saas" || role === "admin_org";
}

/**
 * Verifica se um perfil pode editar parametros globais do tenant
 * (cadastros base, regras de faturamento, SLA). Apenas super_admin_saas
 * e admin_org — gestor_facilities opera, mas nao configura.
 */
export function canManageTenantConfig(role: UserRole): boolean {
  return role === "super_admin_saas" || role === "admin_org";
}