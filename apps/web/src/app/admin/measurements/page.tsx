import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MeasurementsListPage({
  searchParams
}: {
  searchParams?: { q?: string; status?: string; month?: string };
}) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  const supabase = await createSupabaseServer();
  const q = searchParams?.q || "";
  const status = searchParams?.status || "";
  const month = searchParams?.month || "";

  let query = supabase
    .from("measurements")
    .select("id, reference_month, total_amount, status, created_at, contracts(code, customers(name))")
    .eq("tenant_id", profile.tenant.id)
    .order("reference_month", { ascending: false });

  if (q) {
    query = query.or(`reference_month.ilike.%${q}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (month) {
    query = query.eq("reference_month", month);
  }

  const { data: measurements, error } = await query;

  return (
    <main className="page-shell">
      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Financeiro</p>
        <div className="page-header-row">
          <div>
            <h1>Medições.</h1>
            <p>Fechamentos mensais por contrato — contestação, aceite e aprovação.</p>
          </div>
          <a href="/admin/measurements/new" className="button-link primary">
            + Nova medição
          </a>
        </div>
      </header>

      {/* Filters */}
      <form method="get" className="filter-bar animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <div className="filter-row">
          <input
            name="q"
            type="search"
            placeholder="Buscar por mês (ex: 2026-06)..."
            defaultValue={q}
            className="filter-input"
          />
          <select name="status" defaultValue={status} className="filter-select">
            <option value="">Todos status</option>
            <option value="rascunho">Rascunho</option>
            <option value="enviada">Enviada</option>
            <option value="contestada">Contestada</option>
            <option value="aprovada">Aprovada</option>
            <option value="faturada">Faturada</option>
          </select>
          <button type="submit" className="button-link">Filtrar</button>
          {q || status || month ? (
            <a href="/admin/measurements" className="button-link">Limpar</a>
          ) : null}
        </div>
      </form>

      {/* Table */}
      <div className="table-card animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        {error ? (
          <p className="table-error">Erro ao carregar medições: {error.message}</p>
        ) : !measurements || measurements.length === 0 ? (
          <div className="table-empty">
            <p className="eyebrow">Nenhuma medição encontrada</p>
            <p>Medições são geradas automaticamente ao fechar o período de um contrato ativo.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Mês referência</th>
                <th>Contrato</th>
                <th>Valor total</th>
                <th>Criada em</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {measurements.map((m) => {
                const contract = (m as any).contracts;
                return (
                  <tr key={m.id}>
                    <td>
                      <a href={`/admin/measurements/${m.id}`} className="table-link">
                        {m.reference_month}
                      </a>
                    </td>
                    <td>
                      {contract
                        ? `${contract.code} — ${(contract as any).customers?.name || ""}`
                        : "—"}
                    </td>
                    <td>
                      {m.total_amount
                        ? m.total_amount.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                          })
                        : "—"}
                    </td>
                    <td>{new Date(m.created_at).toLocaleDateString("pt-BR")}</td>
                    <td>
                      <span className={`status-badge status-${m.status}`}>{m.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
