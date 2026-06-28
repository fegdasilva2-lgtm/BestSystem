import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/auth";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Almoxarifado | PredialOps"
};

/**
 * Stub do modulo Almoxarifado / Estoque.
 *
 * Quando estiver pronto, o modulo deve cobrir:
 *  - cadastro de itens (pecas, ferramentas, materiais)
 *  - entradas via NF ou ajuste manual
 *  - saidas vinculadas a work_orders (baixa automatica por OS)
 *  - alertas de reposicao (estoque minimo)
 *  - inventarios periodicos com contagem e divergencias
 *
 * Esta pagina e um placeholder enquanto o modulo nao esta pronto.
 */
export default async function InventoryPage() {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  return (
    <main className="page-shell">
      <div className="telemetry-line" aria-hidden="true" />

      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Operacao de campo</p>
        <h1>Almoxarifado.</h1>
        <p>
          Itens, entradas, saidas e consumo por ordem de servico.
        </p>
      </header>

      <div className="animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <EmptyState
          title="Modulo em construcao"
          description={
            "O controle de estoque esta planejado para o proximo ciclo. " +
            "Pecas, ferramentas e materiais serao gerenciados aqui, com " +
            "baixa automatica por OS e alertas de reposicao."
          }
          action={
            <a className="button-link" href="/admin/assets">
              Ir para Ativos
            </a>
          }
        />
      </div>
    </main>
  );
}