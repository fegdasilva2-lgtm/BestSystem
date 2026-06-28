import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { canAccessContract } from "@/lib/contract-access";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { getStatusBadgeClass, formatStatusLabel } from "@/lib/status-badges";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

const fmtBRL = (n: number | string | null | undefined) =>
  Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("pt-BR") : "—";

const fmtPeriod = (s: string | null | undefined) => s ?? "—";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ContractDetailPage({ params }: PageProps) {
  const { id } = await params;
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  // Gate de acesso intra-tenant por contrato (perfis externos)
  const allowed = await canAccessContract(id);
  if (!allowed) notFound();

  const supabase = await createSupabaseServer();

  // Contrato + cliente
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("id, code, scope, exclusions, starts_on, ends_on, monthly_value, index_name, index_date, billing_rule, rgm_periodicity, customer_id, customers(name, document), created_at, updated_at")
    .eq("id", id)
    .maybeSingle();

  if (contractError || !contract) notFound();

  // Queries paralelas — sites, OS, medicoes, RGM, acessos vinculados
  const [
    { data: sites },
    { count: assetsCount },
    { data: orders },
    { data: measurements },
    { data: rgmVersions },
    { data: contractAccess },
  ] = await Promise.all([
    supabase
      .from("sites")
      .select("id, name, address, timezone")
      .eq("contract_id", id)
      .order("name"),
    supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", profile.tenant.id),
    supabase
      .from("work_orders")
      .select("id, type, priority, status, description, due_at, created_at")
      .eq("contract_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("measurements")
      .select("id, period, status, gross_amount, net_amount, approved_at")
      .eq("contract_id", id)
      .order("period", { ascending: false })
      .limit(12),
    supabase
      .from("rgm_versions")
      .select("id, period, approved_at, approved_by, file_url")
      .eq("contract_id", id)
      .order("period", { ascending: false })
      .limit(6),
    supabase
      .from("user_contract_access")
      .select("user_id, users_profile(id, name, email, role, active)")
      .eq("contract_id", id),
  ]);

  const customers = contract.customers as { name?: string; document?: string } | null;
  const periodLabel = (p: string | null | undefined) => p ?? "—";
  const measurementsTotal = (measurements ?? []).reduce(
    (sum, m) => sum + Number(m.net_amount ?? 0),
    0
  );
  const measurementsApproved = (measurements ?? []).filter(
    (m) => m.status === "aprovada" || m.status === "faturada" || m.status === "paga"
  ).length;

  const ordersColumns: DataTableColumn[] = [
    {
      key: "id",
      label: "OS",
      render: (row) => (
        <Link href={`/admin/work-orders/${row.id}`} className="table-link">
          {String(row.id).slice(0, 8)}
        </Link>
      ),
    },
    { key: "description", label: "Descrição", className: "td-wrap" },
    {
      key: "type",
      label: "Tipo",
      render: (_, v) => formatStatusLabel(String(v ?? "")),
    },
    {
      key: "priority",
      label: "Prioridade",
      render: (_, v) => (
        <span className={`priority-badge priority-${v}`}>{formatStatusLabel(String(v ?? ""))}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (_, v) => (
        <span className={getStatusBadgeClass(String(v ?? ""))}>
          {formatStatusLabel(String(v ?? ""))}
        </span>
      ),
    },
    {
      key: "due_at",
      label: "Prazo",
      render: (_, v) => fmtDate(v as string),
    },
  ];

  const measurementsColumns: DataTableColumn[] = [
    {
      key: "period",
      label: "Período",
      render: (row) => (
        <Link href={`/admin/measurements/${row.id}`} className="table-link">
          {periodLabel(row.period as string)}
        </Link>
      ),
    },
    {
      key: "gross_amount",
      label: "Bruto",
      render: (_, v) => fmtBRL(v as number),
    },
    {
      key: "net_amount",
      label: "Líquido",
      render: (_, v) => fmtBRL(v as number),
    },
    {
      key: "approved_at",
      label: "Aprovado em",
      render: (_, v) => fmtDate(v as string),
    },
    {
      key: "status",
      label: "Status",
      render: (_, v) => (
        <span className={getStatusBadgeClass(String(v ?? ""))}>
          {formatStatusLabel(String(v ?? ""))}
        </span>
      ),
    },
  ];

  const rgmColumns: DataTableColumn[] = [
    {
      key: "period",
      label: "Período",
      render: (row) => (
        <span className="mono">{periodLabel(row.period as string)}</span>
      ),
    },
    {
      key: "approved_at",
      label: "Aprovado em",
      render: (_, v) => fmtDate(v as string),
    },
    {
      key: "approved_by",
      label: "Por",
      render: (_, v) => String(v ?? "—"),
    },
    {
      key: "file_url",
      label: "PDF",
      render: (_, v) =>
        v ? (
          <a href={String(v)} target="_blank" rel="noopener noreferrer" className="table-link">
            Abrir
          </a>
        ) : (
          <span className="muted">—</span>
        ),
    },
  ];

  return (
    <main className="page-shell">
      <div className="telemetry-line" aria-hidden="true" />

      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Operações contratuais</p>
        <div className="page-header-row">
          <div>
            <h1>{contract.code}</h1>
            <p>
              {customers?.name ?? "—"}
              {customers?.document ? ` · ${customers.document}` : ""}
            </p>
          </div>
          <div className="page-header-actions">
            <Link className="button-link" href="/admin/contracts">← Lista de contratos</Link>
            <Link className="button-link primary" href={`/admin/work-orders/new?contract_id=${contract.id}`}>
              + Nova OS
            </Link>
          </div>
        </div>
      </header>

      {/* Cards resumo */}
      <section className="section-grid two stagger-children" style={{ marginTop: 14 }}>
        <article className="glass-card">
          <p className="eyebrow">Vigência</p>
          <h2>{contract.starts_on ? new Date(contract.starts_on).toLocaleDateString("pt-BR") : "—"} → {contract.ends_on ? new Date(contract.ends_on).toLocaleDateString("pt-BR") : "em aberto"}</h2>
          <p className="muted">
            {contract.index_name
              ? `Reajuste ${contract.index_name}${contract.index_date ? ` em ${fmtDate(contract.index_date)}` : ""}`
              : "Sem índice de reajuste"}
          </p>
        </article>
        <article className="glass-card">
          <p className="eyebrow">Valor mensal</p>
          <h2>{fmtBRL(contract.monthly_value)}</h2>
          <p className="muted">{contract.billing_rule}</p>
        </article>
        <article className="glass-card">
          <p className="eyebrow">Escopo</p>
          <p>{contract.scope}</p>
          {contract.exclusions ? (
            <p className="muted" style={{ marginTop: 8 }}>
              <strong>Exclusões:</strong> {contract.exclusions}
            </p>
          ) : null}
        </article>
        <article className="glass-card">
          <p className="eyebrow">RGM e medições</p>
          <p>
            <strong>{contract.rgm_periodicity}</strong> · {measurementsApproved}/{(measurements ?? []).length} medições aprovadas
          </p>
          <p className="muted">Total líquido medido: {fmtBRL(measurementsTotal)}</p>
        </article>
      </section>

      {/* Sites */}
      <section style={{ marginTop: 28 }}>
        <header className="page-header animate-fade-in-up" style={{ marginBottom: 8 }}>
          <p className="eyebrow">Sites atendidos</p>
          <h2>{sites?.length ?? 0} unidade{(sites?.length ?? 0) === 1 ? "" : "s"}</h2>
        </header>
        {!sites || sites.length === 0 ? (
          <EmptyState
            title="Nenhum site vinculado"
            description="Vincule sites a este contrato para que ativos, OS e medições possam ser alocados."
          />
        ) : (
          <div className="section-grid three animate-fade-in-up">
            {sites.map((s) => (
              <article key={s.id} className="glass-card">
                <p className="eyebrow">{s.timezone}</p>
                <h3>{s.name}</h3>
                {s.address ? <p className="muted">{s.address}</p> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {/* Ordens de serviço */}
      <section style={{ marginTop: 28 }}>
        <header className="page-header animate-fade-in-up" style={{ marginBottom: 8 }}>
          <div className="page-header-row">
            <div>
              <p className="eyebrow">Ordens de serviço</p>
              <h2>{orders?.length ?? 0} OS no contrato</h2>
            </div>
            <Link className="button-link" href={`/admin/work-orders?q=&status=&priority=&type=`}>
              Ver todas
            </Link>
          </div>
        </header>
        <div className="animate-fade-in-up">
          <DataTable
            columns={ordersColumns}
            rows={(orders ?? []) as unknown as Record<string, unknown>[]}
            emptyState={
              <EmptyState
                title="Nenhuma OS neste contrato"
                description="Crie a primeira OS usando o botão acima."
              />
            }
          />
        </div>
      </section>

      {/* Medições */}
      <section style={{ marginTop: 28 }}>
        <header className="page-header animate-fade-in-up" style={{ marginBottom: 8 }}>
          <div className="page-header-row">
            <div>
              <p className="eyebrow">Medições</p>
              <h2>{(measurements ?? []).length} medições</h2>
            </div>
            <Link className="button-link primary" href={`/admin/measurements/new?contract_id=${contract.id}`}>
              + Nova medição
            </Link>
          </div>
        </header>
        <div className="animate-fade-in-up">
          <DataTable
            columns={measurementsColumns}
            rows={(measurements ?? []) as unknown as Record<string, unknown>[]}
            emptyState={
              <EmptyState
                title="Nenhuma medição registrada"
                description="Medições são geradas por competência (YYYY-MM) conforme a regra de billing."
              />
            }
          />
        </div>
      </section>

      {/* RGM */}
      <section style={{ marginTop: 28 }}>
        <header className="page-header animate-fade-in-up" style={{ marginBottom: 8 }}>
          <p className="eyebrow">Relatório de gestão mensal</p>
          <h2>{(rgmVersions ?? []).length} versões arquivadas</h2>
        </header>
        <div className="animate-fade-in-up">
          <DataTable
            columns={rgmColumns}
            rows={(rgmVersions ?? []) as unknown as Record<string, unknown>[]}
            emptyState={
              <EmptyState
                title="Nenhum RGM emitido"
                description="Configure o template e gere a primeira versão em /admin/rgm."
                action={
                  <Link className="button-link" href="/admin/rgm">
                    Ir para RGM
                  </Link>
                }
              />
            }
          />
        </div>
      </section>

      {/* Acessos vinculados (perfis externos como cliente_gestor) */}
      {(contractAccess ?? []).length > 0 && (
        <section style={{ marginTop: 28 }}>
          <header className="page-header animate-fade-in-up" style={{ marginBottom: 8 }}>
            <p className="eyebrow">Acessos vinculados</p>
            <h2>{(contractAccess ?? []).length} usuário{(contractAccess ?? []).length === 1 ? "" : "s"}</h2>
            <p className="muted">
              Perfis externos (cliente_gestor, solicitante, fornecedor) com visibilidade restrita a este contrato.
            </p>
          </header>
          <div className="profile-list animate-fade-in-up">
            {(contractAccess ?? []).map((row) => {
              const profile = Array.isArray(row.users_profile) ? row.users_profile[0] : row.users_profile;
              const u = profile as { id: string; name: string; email: string; role: string; active: boolean } | null;
              if (!u) return null;
              return (
                <div key={u.id} className="profile-row">
                  <span>
                    <strong>{u.name}</strong>
                    <small className="muted">{u.email}</small>
                  </span>
                  <span className="role-tag">{u.role}</span>
                  <span className={`status-pill ${u.active ? "" : "danger-pill"}`}>
                    {u.active ? "ativo" : "inativo"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}