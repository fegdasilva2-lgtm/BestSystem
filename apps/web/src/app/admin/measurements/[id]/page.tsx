import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { MeasurementActions } from "./actions-client";
import { getStatusBadgeClass, formatStatusLabel } from "@/lib/status-badges";

export const dynamic = "force-dynamic";

export default async function MeasurementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  const supabase = await createSupabaseServer();
  const { id } = await params;

  const { data: m, error } = await supabase
    .from("measurements")
    .select("*, contracts(code, monthly_value)")
    .eq("id", id)
    .eq("tenant_id", profile.tenant.id)
    .single();

  if (error || !m) notFound();

  const fmtBRL = (n: number) =>
    Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");
  const contract = m.contracts as { code?: string; monthly_value?: number } | null;

  return (
    <main>
      <div className="telemetry-line" aria-hidden="true" />

      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Medição · {contract?.code || "Sem contrato"}</p>
        <div className="page-header-row">
          <div>
            <h1>{m.period}</h1>
            <p>{m.notes || "Sem observações."}</p>
          </div>
          <span className={getStatusBadgeClass(m.status)} style={{ fontSize: 13, padding: "6px 14px" }}>
            {formatStatusLabel(m.status)}
          </span>
        </div>
      </header>

      {/* Cards de valores */}
      <section className="kpi-strip stagger-children" style={{ marginTop: 14 }}>
        <article className="kpi-card animate-fade-in-up">
          <div>
            <p className="eyebrow">Valor bruto</p>
            <strong>{fmtBRL(m.gross_amount)}</strong>
            <span>Total antes de descontos</span>
          </div>
        </article>
        <article className="kpi-card animate-fade-in-up">
          <div>
            <p className="eyebrow">Descontos</p>
            <strong>{fmtBRL(m.discount_amount)}</strong>
            <span>Glosas e ajustes</span>
          </div>
        </article>
        <article className="kpi-card animate-fade-in-up">
          <div>
            <p className="eyebrow">Valor líquido</p>
            <strong>{fmtBRL(m.net_amount)}</strong>
            <span>Valor final aceito</span>
          </div>
        </article>
      </section>

      {/* Ações */}
      {["rascunho", "pre_enviada", "em_aceite", "contestada"].includes(m.status) && (
        <MeasurementActions measId={m.id} status={m.status} />
      )}

      {/* Informações */}
      <section className="section-grid two" style={{ marginTop: 14 }}>
        <article className="glass-card">
          <p className="eyebrow">Contrato</p>
          {contract ? (
            <dl className="detail-list">
              <div><dt>Código</dt><dd>{contract.code}</dd></div>
              <div><dt>Valor mensal</dt><dd>{fmtBRL(contract.monthly_value ?? 0)}</dd></div>
            </dl>
          ) : (
            <p className="muted">Sem contrato vinculado.</p>
          )}
        </article>
        <article className="glass-card">
          <p className="eyebrow">Datas</p>
          <dl className="detail-list">
            <div><dt>Criado em</dt><dd>{fmtDate(m.created_at)}</dd></div>
            <div><dt>Aprovado em</dt><dd>{fmtDate(m.approved_at)}</dd></div>
            <div><dt>Período</dt><dd>{m.period}</dd></div>
          </dl>
        </article>
      </section>
    </main>
  );
}
