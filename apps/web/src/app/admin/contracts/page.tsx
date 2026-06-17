import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ContractsListPage({
  searchParams
}: {
  searchParams?: { q?: string; status?: string };
}) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  const supabase = await createSupabaseServer();
  const q = searchParams?.q || "";
  const status = searchParams?.status || "";

  let query = supabase
    .from("contracts")
    .select("id, code, scope, starts_on, ends_on, monthly_value, status, customers(name)")
    .eq("tenant_id", profile.tenant.id)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`code.ilike.%${q}%,scope.ilike.%${q}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data: contracts, error } = await query;

  return (
    <main className="page-shell">
      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Contract Ops</p>
        <div className="page-header-row">
          <div>
            <h1>Contratos.</h1>
            <p>Entidade central do PredialOps — clientes, ativos e OS orbitam o contrato.</p>
          </div>
          <a href="/admin/contracts/new" className="button-link primary">
            + Novo contrato
          </a>
        </div>
      </header>

      {/* Filters */}
      <form method="get" className="filter-bar animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <div className="filter-row">
          <input
            name="q"
            type="search"
            placeholder="Buscar por código ou escopo..."
            defaultValue={q}
            className="filter-input"
          />
          <select name="status" defaultValue={status} className="filter-select">
            <option value="">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="active">Ativo</option>
            <option value="suspended">Suspenso</option>
            <option value="terminated">Encerrado</option>
          </select>
          <button type="submit" className="button-link">Filtrar</button>
          {q || status ? (
            <a href="/admin/contracts" className="button-link">Limpar</a>
          ) : null}
        </div>
      </form>

      {/* Table */}
      <div className="table-card animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        {error ? (
          <p className="table-error">Erro ao carregar contratos: {error.message}</p>
        ) : !contracts || contracts.length === 0 ? (
          <div className="table-empty">
            <p className="eyebrow">Nenhum contrato encontrado</p>
            <p>Crie o primeiro contrato ou ajuste os filtros da busca.</p>
            <a href="/admin/contracts/new" className="button-link primary" style={{ marginTop: 12 }}>
              + Novo contrato
            </a>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Escopo</th>
                <th>Início</th>
                <th>Término</th>
                <th>Valor mensal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <a href={`/admin/contracts/${c.id}`} className="table-link">
                      {c.code}
                    </a>
                  </td>
                  <td>{(c as any).customers?.name || "—"}</td>
                  <td className="td-wrap">{c.scope}</td>
                  <td>{c.starts_on ? new Date(c.starts_on).toLocaleDateString("pt-BR") : "—"}</td>
                  <td>{c.ends_on ? new Date(c.ends_on).toLocaleDateString("pt-BR") : "—"}</td>
                  <td>
                    {c.monthly_value
                      ? c.monthly_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
                      : "—"}
                  </td>
                  <td>
                    <span className={`status-badge status-${c.status}`}>{c.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
