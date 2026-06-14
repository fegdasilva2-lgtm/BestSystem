// Seed inicial do sandbox. Idempotente: nao duplica se ja houver dados.
// Usado quando o IndexedDB esta vazio (primeira instalacao) ou quando o
// usuario dispara "Resetar dados de demonstracao".

export const SEED = {
  tenants: [
    { id: "tenant-imc",   name: "IMC Facilities",  slug: "imc",   plan: "Business",    sites: 12, assets: 1248, status: "ativo" },
    { id: "tenant-vitta", name: "Rede Vitta",      slug: "vitta", plan: "Professional",sites: 18, assets: 436,  status: "implantacao" },
    { id: "tenant-axis",  name: "Condominio Axis", slug: "axis",  plan: "Starter",     sites: 1,  assets: 92,   status: "piloto" }
  ],
  users: [
    { id: "usr-admin",   name: "Camila Torres",   email: "camila@imcfacilities.com.br",     role: "Admin da organizacao", tenantId: "tenant-imc" },
    { id: "usr-manager", name: "Paulo Mendes",    email: "paulo@imcfacilities.com.br",      role: "Gestor facilities/O&M", tenantId: "tenant-imc" },
    { id: "usr-planner", name: "Renata Lima",     email: "renata@imcfacilities.com.br",      role: "Planejador",            tenantId: "tenant-imc" },
    { id: "usr-tech",    name: "Rafael Nunes",    email: "rafael@imcfacilities.com.br",      role: "Tecnico",               tenantId: "tenant-imc" },
    { id: "usr-client",  name: "Gestor Cliente",  email: "cliente@shoppingnorte.com.br",     role: "Cliente gestor",        tenantId: "tenant-imc" },
    { id: "usr-vitta",   name: "Luciana Prado",   email: "luciana@redevitta.com.br",         role: "Gestor facilities/O&M", tenantId: "tenant-vitta" },
    { id: "usr-axis",    name: "Eduardo Reis",    email: "eduardo@axis.com.br",              role: "Admin da organizacao",  tenantId: "tenant-axis" }
  ],
  contracts: [
    { id: "CT-2026-014", tenantId: "tenant-imc", customer: "Shopping Norte", scope: "Manutencao predial e PMOC", sla: "Critica 4h - Alta 8h - Media 24h", measurement: "Mensal por OS aprovada", value: 118000, compliance: 91 },
    { id: "CT-2026-021", tenantId: "tenant-imc", customer: "Hospital Vida",  scope: "O&M utilidades criticas",   sla: "Critica 2h - Alta 6h - Media 12h", measurement: "Fixo + variavel por evento", value: 244000, compliance: 96 },
    { id: "CT-2026-033", tenantId: "tenant-vitta", customer: "Rede Vitta",  scope: "Facilities multiunidade",    sla: "Alta 12h - Media 36h",        measurement: "Por item de contrato",   value: 86000,  compliance: 88 }
  ],
  workOrders: [
    { id: "OS-10284", tenantId: "tenant-imc", type: "Corretiva", customer: "Shopping Norte", site: "Torre A", location: "Pavimento 3 / Sala 304", asset: "Fancoil FC-A3-07", priority: "critical", status: "progress", technician: "Rafael Nunes", due: "Hoje 15:00", slaHours: 4, elapsedHours: 3.1, cost: 780,  contractItem: "Climatizacao corretiva", checklist: ["Bloqueio eletrico", "Inspecao visual", "Medicao de temperatura", "Registro fotografico"] },
    { id: "OS-10279", tenantId: "tenant-imc", type: "Preventiva", customer: "Condominio Axis", site: "Torre Corporate", location: "Subsolo 2", asset: "Bomba recalque BR-02", priority: "medium", status: "open", technician: "Aline Rocha", due: "Amanha 10:00", slaHours: 24, elapsedHours: 0, cost: 320, contractItem: "PMOC e utilidades", checklist: ["Vazamentos", "Ruido", "Corrente eletrica", "Limpeza tecnica"] },
    { id: "OS-10276", tenantId: "tenant-imc", type: "Inspecao", customer: "Hospital Vida", site: "Bloco B", location: "Central de Agua Gelada", asset: "Chiller CH-01", priority: "high", status: "done", technician: "Diego Mota", due: "Ontem 18:00", slaHours: 8, elapsedHours: 6.2, cost: 1240, contractItem: "Ronda critica CAG", checklist: ["Pressao", "Temperatura", "Vibracao", "Evidencia foto"], approved: true },
    { id: "OS-10263", tenantId: "tenant-vitta", type: "Corretiva", customer: "Rede Vitta", site: "Loja Campinas", location: "Area de vendas", asset: "Quadro eletrico QD-02", priority: "high", status: "measure", technician: "Equipe EletroSul", due: "30/04 14:00", slaHours: 12, elapsedHours: 9.4, cost: 1860, contractItem: "Eletrica corretiva", checklist: ["Desenergizacao", "Torqueamento", "Termografia", "Aceite cliente"], approved: true }
  ],
  requests: [
    { id: "SOL-2401", tenantId: "tenant-imc", requester: "Mariana Costa", location: "Shopping Norte / Torre A / Pavimento 3", category: "Ar-condicionado", description: "Sala de reuniao sem climatizacao adequada.", status: "triagem", createdAt: "2026-05-02 09:18" },
    { id: "SOL-2402", tenantId: "tenant-imc", requester: "Bruno Leal",   location: "Hospital Vida / Central de Agua Gelada",   category: "Hidraulica",      description: "Gotejamento proximo ao conjunto de bombas.", status: "convertido", createdAt: "2026-05-02 11:44" }
  ],
  assets: [
    { id: "AT-AC-0007", tenantId: "tenant-imc",   name: "Fancoil FC-A3-07",  hierarchy: "Shopping Norte > Torre A > Pav. 3 > Sala 304", criticality: "Alta",    availability: 96.8, mtbf: "68 dias",  cost: 18420 },
    { id: "AT-HV-0101", tenantId: "tenant-imc",   name: "Chiller CH-01",     hierarchy: "Hospital Vida > Bloco B > CAG",              criticality: "Critica", availability: 99.1, mtbf: "124 dias", cost: 42800 },
    { id: "AT-CX-0022", tenantId: "tenant-axis",  name: "Bomba recalque BR-02", hierarchy: "Condominio Axis > Torre Corporate > Subsolo 2", criticality: "Media", availability: 97.5, mtbf: "81 dias", cost: 9300 }
  ],
  stock: [
    { id: "MAT-001", tenantId: "tenant-imc", sku: "MAT-001", name: "Filtro G4 595x595", warehouse: "Almox. SP",       balance: 42, min: 20, cost: 38 },
    { id: "MAT-017", tenantId: "tenant-imc", sku: "MAT-017", name: "Contator 32A",      warehouse: "Almox. Campinas", balance: 6,  min: 8,  cost: 164 },
    { id: "MAT-044", tenantId: "tenant-imc", sku: "MAT-044", name: "Correia A-38",     warehouse: "Almox. SP",       balance: 14, min: 10, cost: 52 }
  ],
  audit: [
    { id: "aud-1", tenantId: "tenant-imc", at: "2026-05-03 08:12", user: "Aline Rocha",     action: "Baixou material MAT-001 na OS-10279" },
    { id: "aud-2", tenantId: "tenant-imc", at: "2026-05-03 08:40", user: "Rafael Nunes",    action: "Anexou evidencia fotografica na OS-10284" },
    { id: "aud-3", tenantId: "tenant-vitta", at: "2026-05-03 09:05", user: "Gestor Cliente", action: "Aprovou medicao CT-2026-033 periodo 04/2026" }
  ],
  rbac: {
    "Admin da organizacao":  ["usuarios", "contratos", "cadastros", "integracoes", "auditoria"],
    "Gestor facilities/O&M": ["dashboard", "sla", "planejamento", "medicoes", "fornecedores"],
    "Planejador":            ["preventivas", "os", "agenda", "materiais", "backlog"],
    "Supervisor":            ["os", "aprovacao", "qualidade", "reabertura"],
    "Tecnico":               ["minhas_os", "checklists", "materiais_os", "offline"],
    "Fornecedor":            ["os_atribuidas", "evidencias", "comentarios"],
    "Cliente gestor":        ["portal_cliente", "aceite", "medicoes", "relatorios"],
    "Solicitante":           ["abrir_chamado", "acompanhar_chamado", "avaliar"],
    "Auditor":               ["leitura", "exportacao", "audit_log"]
  },
  onboarding: {
    auth: true, tenant: true, rbac: true, baseData: true, designSystem: true,
    apiReady: false, postgresReady: false
  },
  provisioning: [
    { step: "Tenant criado",    detail: "IMC Facilities provisionado com plano Business",     status: "feito" },
    { step: "RBAC aplicado",     detail: "10 perfis iniciais com escopo por tenant/cliente/site", status: "feito" },
    { step: "Cadastros base",    detail: "Clientes, sites, locais e ativos carregados para piloto", status: "feito" },
    { step: "API real",          detail: "Proxima etapa: trocar localStorage por Postgres/API", status: "pendente" }
  ],
  baseCatalog: {
    customers: ["Shopping Norte", "Hospital Vida", "Condominio Axis", "Rede Vitta"],
    sites:     ["Torre A", "Bloco B", "Torre Corporate", "Loja Campinas"],
    locations: ["Pavimento 3 / Sala 304", "Central de Agua Gelada", "Subsolo 2", "Area de vendas"]
  }
};

export async function seedIfEmpty(db) {
  const count = await db.tenants.count();
  if (count > 0) return false;
  await db.transaction("rw", db.tables, async () => {
    for (const t of SEED.tenants)     await db.tenants.put(t);
    for (const u of SEED.users)       await db.users.put(u);
    for (const c of SEED.contracts)   await db.contracts.put(c);
    for (const w of SEED.workOrders)  await db.workOrders.put(w);
    for (const r of SEED.requests)    await db.requests.put(r);
    for (const a of SEED.assets)      await db.assets.put(a);
    for (const s of SEED.stock)       await db.stock.put(s);
    for (const a of SEED.audit)       await db.audit.put(a);
    for (const role of Object.keys(SEED.rbac)) {
      await db.rbac.put({ role, permissions: SEED.rbac[role] });
    }
    for (const [k, v] of Object.entries(SEED.onboarding)) await db.onboarding.put({ key: k, value: v });
    for (const p of SEED.provisioning) await db.provisioning.put(p);
  });
  await db.meta.put({ key: "seed", value: "v1", at: new Date().toISOString() });
  return true;
}
