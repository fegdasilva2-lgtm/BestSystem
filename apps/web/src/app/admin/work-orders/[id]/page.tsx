import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { WorkOrderTimeline } from "./timeline";
import { getStatusBadgeClass, formatStatusLabel } from "@/lib/status-badges";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  planejada: "Planejada",
  liberada: "Liberada",
  atribuida: "Atribuída",
  aceita: "Aceita",
  em_deslocamento: "Em deslocamento",
  em_execucao: "Em execução",
  pausada: "Pausada",
  aguardando_material: "Aguardando material",
  aguardando_cliente: "Aguardando cliente",
  concluida_tecnico: "Concluída (técnico)",
  em_validacao: "Em validação",
  aprovada: "Aprovada",
  encerrada: "Encerrada",
  cancelada: "Cancelada",
};

export default async function WorkOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  const supabase = await createSupabaseServer();
  const { id } = await params;

  const { data: wo, error } = await supabase
    .from("work_orders")
    .select("*, contracts(code)")
    .eq("id", id)
    .eq("tenant_id", profile.tenant.id)
    .single();

  if (error || !wo) notFound();

  const fmtDate = (s: string | null) =>
    s ? new Date(s).toLocaleDateString("pt-BR") : "—";

  const fmtBRL = (n: number) =>
    Number(n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <main>
      <div className="telemetry-line" aria-hidden="true" />

      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">
          OS {String(wo.id).slice(0, 8)} ·{" "}
          {(wo.contracts as { code?: string } | null)?.code || "Sem contrato"}
        </p>
        <div className="page-header-row">
          <div>
            <h1>{formatStatusLabel(wo.type)}</h1>
            <p>{wo.description}</p>
          </div>
          <span className={getStatusBadgeClass(wo.status)} style={{ fontSize: 13, padding: "6px 14px" }}>
            {STATUS_LABELS[wo.status] || formatStatusLabel(wo.status)}
          </span>
        </div>
      </header>

      {/* Timeline de status */}
      <WorkOrderTimeline woId={wo.id} currentStatus={wo.status} />

      {/* Detalhes */}
      <section className="section-grid two" style={{ marginTop: 14 }}>
        <article className="glass-card">
          <p className="eyebrow">Informações</p>
          <dl className="detail-list">
            <div>
              <dt>Prioridade</dt>
              <dd>
                <span className={`priority-badge priority-${wo.priority}`}>
                  {formatStatusLabel(wo.priority)}
                </span>
              </dd>
            </div>
            <div>
              <dt>Criado em</dt>
              <dd>{fmtDate(wo.created_at)}</dd>
            </div>
            <div>
              <dt>Prazo</dt>
              <dd>{fmtDate(wo.due_at)}</dd>
            </div>
            {wo.started_at && (
              <div>
                <dt>Iniciado em</dt>
                <dd>{fmtDate(wo.started_at)}</dd>
              </div>
            )}
            {wo.completed_at && (
              <div>
                <dt>Concluído em</dt>
                <dd>{fmtDate(wo.completed_at)}</dd>
              </div>
            )}
            <div>
              <dt>Custo</dt>
              <dd>{fmtBRL(wo.cost)}</dd>
            </div>
          </dl>
        </article>

        <article className="glass-card">
          <p className="eyebrow">Contrato</p>
          {(wo.contracts as { code?: string } | null) ? (
            <dl className="detail-list">
              <div>
                <dt>Código</dt>
                <dd>
                  <a href={`/admin/contracts`} className="table-link">
                    {(wo.contracts as { code?: string }).code}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Item contratual</dt>
                <dd>{wo.contract_item || "—"}</dd>
              </div>
            </dl>
          ) : (
            <p className="muted">Sem contrato vinculado.</p>
          )}
        </article>
      </section>
    </main>
  );
}
