import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SLA | PredialOps"
};

/**
 * Stub do modulo SLA.
 *
 * O modulo de SLA (Service Level Agreement) precisa de:
 *  - regras por contrato (prioridade, tempo de reconhecimento,
 *    tempo de solucao, janelas de atendimento)
 *  - calendario de pausas justificadas
 *  - escalonamento automatico quando SLA estoura
 *  - integracao com work_orders e measurements para calculo real
 *
 * Esta pagina e um placeholder enquanto o modulo nao esta pronto.
 * A entrada na sidebar e mantida para que o usuario final saiba que
 * o recurso esta planejado.
 */
export default async function SlaPage() {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  return (
    <main className="page-shell">
      <div className="telemetry-line" aria-hidden="true" />

      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Qualidade operacional</p>
        <h1>SLA.</h1>
        <p>
          Regras de atendimento por contrato, prioridades, pausas justificadas
          e escalonamento automatico.
        </p>
      </header>

      <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <EmptyState
          title="Modulo em construcao"
          description={
            "O motor de SLA esta sendo projetado. Por enquanto, o tempo de atendimento " +
            "e controlado manualmente em cada OS. Em breve: regras por contrato, " +
            "calendario, pausas e escalonamento automatico integrados a work_orders."
          }
          action={
            <a className="button-link" href="/admin/work-orders">
              Ir para Ordens de Servico
            </a>
          }
        />
      </div>
    </main>
  );
}