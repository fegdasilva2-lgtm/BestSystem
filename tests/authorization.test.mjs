// Testes de autorizacao por papel.
// Sem dependencia de Supabase - testa as politicas puras de quem pode
// fazer o que no sistema. Complementa o RLS no banco (defesa em
// profundidade: app + banco).

let failures = 0;
function expect(name, cond, detail = "") {
  if (cond) console.log("ok   - " + name);
  else { console.log("FAIL - " + name + (detail ? ` :: ${detail}` : "")); failures += 1; }
}

// =====================================================================
// 1) Matriz de capacidades por papel
// =====================================================================

const CAPABILITIES = {
  super_admin_saas:  new Set(["*"]),
  admin_org:         new Set([
    "users.manage", "contracts.write", "customers.write", "sites.write",
    "assets.write", "measurements.write", "measurements.approve",
    "rgm.template.write", "rgm.archive", "audit.read"
  ]),
  gestor_facilities: new Set([
    "users.read", "contracts.write", "customers.write", "sites.write",
    "assets.write", "measurements.write", "measurements.approve",
    "rgm.template.write", "audit.read"
  ]),
  planejador:        new Set([
    "users.read", "contracts.read", "customers.read", "sites.read",
    "assets.read", "assets.write", "work_orders.write",
    "preventive_plans.write", "schedule.generate", "audit.read"
  ]),
  supervisor:        new Set([
    "users.read", "work_orders.write", "work_orders.approve",
    "measurements.write", "audit.read"
  ]),
  tecnico:           new Set([
    "work_orders.read.assigned", "work_orders.update.execution",
    "evidence.upload", "checklist.update", "audit.read.own"
  ]),
  cliente_gestor:    new Set([
    "work_orders.read.contract", "service_requests.write",
    "measurements.read", "measurements.approve", "measurements.contest",
    "rgm.archive", "comments.write", "audit.read.own"
  ]),
  solicitante:       new Set([
    "service_requests.write", "service_requests.read.own", "comments.write"
  ]),
  auditor:           new Set([
    "audit.read.all", "exports.write"
  ]),
  financeiro:        new Set([
    "measurements.read", "rgm.read", "invoices.write"
  ]),
  comercial:         new Set([
    "proposals.write", "customers.read", "contracts.read"
  ])
};

function can(role, capability) {
  const caps = CAPABILITIES[role];
  if (!caps) return false;
  if (caps.has("*")) return true;
  return caps.has(capability);
}

// =====================================================================
// 2) Casos de uso
// =====================================================================

// Aceite de medicao: cliente_gestor pode
expect("cliente_gestor PODE aceitar medicao", can("cliente_gestor", "measurements.approve"));
// Tecnico NAO pode aceitar
expect("tecnico NAO pode aceitar medicao", !can("tecnico", "measurements.approve"));
// Admin_org pode
expect("admin_org PODE aceitar medicao", can("admin_org", "measurements.approve"));
// Auditor NAO pode aceitar (apenas leitura)
expect("auditor NAO pode aceitar medicao", !can("auditor", "measurements.approve"));
// Financeiro NAO pode aceitar (apenas leitura)
expect("financeiro NAO pode aceitar medicao", !can("financeiro", "measurements.approve"));
// Solicitante NAO pode aceitar
expect("solicitante NAO pode aceitar medicao", !can("solicitante", "measurements.approve"));

// Contestacao: cliente_gestor pode
expect("cliente_gestor PODE contestar", can("cliente_gestor", "measurements.contest"));
// Tecnico NAO pode contestar
expect("tecnico NAO pode contestar", !can("tecnico", "measurements.contest"));

// Edicao de contrato: admin_org/gestor_facilities podem
expect("admin_org PODE editar contrato", can("admin_org", "contracts.write"));
expect("gestor_facilities PODE editar contrato", can("gestor_facilities", "contracts.write"));
expect("planejador NAO pode editar contrato", !can("planejador", "contracts.write"));
expect("cliente_gestor NAO pode editar contrato", !can("cliente_gestor", "contracts.write"));

// Upload de evidencia (fotos): tecnico pode
expect("tecnico PODE upload evidencia", can("tecnico", "evidence.upload"));
expect("cliente_gestor NAO pode upload evidencia", !can("cliente_gestor", "evidence.upload"));

// Gestao de usuarios: apenas super_admin_saas ou admin_org
expect("admin_org PODE gerenciar usuarios", can("admin_org", "users.manage"));
expect("gestor_facilities NAO pode gerenciar usuarios", !can("gestor_facilities", "users.manage"));
expect("super_admin_saas PODE tudo (wildcard)", can("super_admin_saas", "users.manage"));
expect("super_admin_saas PODE contracts.write", can("super_admin_saas", "contracts.write"));

// Auditoria: leitura por papel
expect("auditor PODE ler auditoria completa", can("auditor", "audit.read.all"));
expect("admin_org PODE ler auditoria (escopo restrito)", can("admin_org", "audit.read"));
expect("tecnico pode ler auditoria propria apenas", can("tecnico", "audit.read.own"));
expect("tecnico NAO pode ler auditoria completa", !can("tecnico", "audit.read.all"));

// Exclusao: nenhum papel exceto super_admin_saas pode excluir tenant
// (Validamos isso garantindo que nao ha capability destructive sem wildcard)
const DESTRUCTIVE = ["tenants.delete", "audit.delete", "users.delete", "contracts.delete"];
for (const cap of DESTRUCTIVE) {
  for (const role of Object.keys(CAPABILITIES)) {
    if (role === "super_admin_saas") continue;
    expect(`${role} NAO pode ${cap}`, !can(role, cap));
  }
  expect(`super_admin_saas pode ${cap}`, can("super_admin_saas", cap));
}

// =====================================================================
// 3) Cliente_gestor NAO pode editar nada que afete faturamento
// =====================================================================

expect("cliente_gestor NAO pode alterar contrato", !can("cliente_gestor", "contracts.write"));
expect("cliente_gestor NAO pode gerenciar usuarios", !can("cliente_gestor", "users.manage"));
expect("cliente_gestor NAO pode gerar cronograma", !can("cliente_gestor", "schedule.generate"));
expect("cliente_gestor NAO pode aprovar OS tecnica", !can("cliente_gestor", "work_orders.approve"));

// =====================================================================
// 4) Papel desconhecido = sem capacidades
// =====================================================================

expect("papel desconhecido nao tem capacidades", !can("hacker", "audit.read.all"));
expect("papel vazio nao tem capacidades", !can("", "audit.read.all"));

if (failures > 0) {
  console.log(`\n${failures} teste(s) falharam.`);
  process.exit(1);
}
console.log("\nTodos os testes de autorizacao passaram.");
