import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  const supabase = await createSupabaseServer();
  const tenantId = profile.tenant.id;

  // Queries paralelas
  const [
    { data: woStats },
    { data: measStats },
    { data: contracts },
  ] = await Promise.all([
    // OS por status (agregado)
    supabase
      .from("work_orders")
      .select("status")
      .eq("tenant_id", tenantId),
    // Medições por status
    supabase
      .from("measurements")
      .select("status, net_amount")
      .eq("tenant_id", tenantId),
    // Contratos ativos
    supabase
      .from("contracts")
      .select("id, code, monthly_value, customers(name)")
      .eq("tenant_id", tenantId)
      .order("code"),
  ]);

  // Agregação: OS por status
  const woByStatus: Record<string, number> = {};
  (woStats ?? []).forEach((wo) => {
    woByStatus[wo.status] = (woByStatus[wo.status] || 0) + 1;
  });

  const woTotal = Object.values(woByStatus).reduce((a, b) => a + b, 0);

  // Medições: total faturado
  const measApproved = (measStats ?? []).filter((m) => m.status === "aprovada" || m.status === "faturada");
  const measTotal = measApproved.reduce((sum, m) => sum + Number(m.net_amount ?? 0), 0);

  // Contagem de medições por status
  const measByStatus: Record<string, number> = {};
  (measStats ?? []).forEach((m) => {
    measByStatus[m.status] = (measByStatus[m.status] || 0) + 1;
  });

  const fmtBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const woStatusLabels: Record<string, string> = {
    rascunho: "Rascunho",
    planejada: "Planejada",
    liberada: "Liberada",
    atribuida: "Atribuída",
    em_execucao: "Em execução",
    concluida_tecnico: "Concluída técnico",
    em_validacao: "Em validação",
    aprovada: "Aprovada",
    encerrada: "Encerrada",
    cancelada: "Cancelada",
  };

  const woStatusColors: Record<string, string> = {
    rascunho: "var(--color-muted)",
    planejada: "var(--color-warn)",
    liberada: "var(--color-warn)",
    atribuida: "var(--color-warn)",
    em_execucao: "var(--color-safety)",
    concluida_tecnico: "var(--color-ok)",
    em_validacao: "var(--color-safety)",
    aprovada: "var(--color-ok)",
    encerrada: "var(--color-ok)",
    cancelada: "var(--color-danger)",
  };

  return (
    <main>
      <div className="telemetry-line" aria-hidden="true" />

      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Relatórios operacionais</p>
        <h1>Visão geral.</h1>
        <p>Indicadores de OS, medições e contratos do tenant.</p>
      </header>

      {/* KPI strip */}
      <div className="stats-strip stagger-children">
        <div className="stat-card animate-fade-in-up" style={{ "--accent-color": "var(--color-blueprint-ink)" } as React.CSSProperties}>
          <div className="stat-icon" aria-hidden="true">◈</div>
          <strong>{contracts?.length ?? 0}</strong>
          <span>Contratos</span>
          <small>Cadastrados</small>
        </div>
        <div className="stat-card animate-fade-in-up" style={{ "--accent-color": "var(--color-warn)" } as React.CSSProperties}>
          <div className="stat-icon" aria-hidden="true">⟐</div>
          <strong>{woTotal}</strong>
          <span>OS total</span>
          <small>Todos os status</small>
        </div>
        <div className="stat-card animate-fade-in-up" style={{ "--accent-color": "var(--color-ok)" } as React.CSSProperties}>
          <div className="stat-icon" aria-hidden="true">◎</div>
          <strong>{measApproved.length}</strong>
          <span>Medições aprovadas</span>
          <small>Total faturado: {fmtBRL(measTotal)}</small>
        </div>
        <div className="stat-card animate-fade-in-up" style={{ "--accent-color": "var(--color-safety-deep)" } as React.CSSProperties}>
          <div className="stat-icon" aria-hidden="true">▣</div>
          <strong>{woByStatus["em_execucao"] || 0}</strong>
          <span>OS em execução</span>
          <small>No momento</small>
        </div>
      </div>

      <section className="section-grid two" style={{ marginTop: 14 }}>
        {/* OS por status — barras horizontais */}
        <article className="glass-card">
          <p className="eyebrow">Ordens de serviço</p>
          <h2>Por status</h2>
          {woTotal === 0 ? (
            <p className="muted">Nenhuma OS registrada.</p>
          ) : (
            <div className="bar-chart">
              {Object.entries(woByStatus)
                .sort(([, a], [, b]) => b - a)
                .map(([status, count]) => (
                  <div key={status} className="bar-row">
                    <span className="bar-label">{woStatusLabels[status] || status}</span>
                    <div className="bar-track">
                      <div
                        className="bar-fill"
                        style={{
                          width: `${Math.max((count / woTotal) * 100, 2)}%`,
                          background: woStatusColors[status] || "var(--color-muted)",
                        }}
                      />
                    </div>
                    <span className="bar-value">{count}</span>
                  </div>
                ))}
            </div>
          )}
        </article>

        {/* Contratos com valores */}
        <article className="glass-card">
          <p className="eyebrow">Contratos</p>
          <h2>Receita mensal</h2>
          {!contracts || contracts.length === 0 ? (
            <p className="muted">Nenhum contrato cadastrado.</p>
          ) : (
            <div className="bar-chart">
              {contracts.map((c) => (
                <div key={c.id} className="bar-row">
                  <span className="bar-label">{(c as any).customers?.name || c.code}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${Math.min(((c.monthly_value ?? 0) / Math.max(...contracts.map((x) => x.monthly_value ?? 1))) * 100, 100)}%`,
                        background: "var(--color-blueprint-ink)",
                      }}
                    />
                  </div>
                  <span className="bar-value">{fmtBRL(c.monthly_value ?? 0)}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
