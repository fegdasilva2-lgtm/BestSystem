import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function WorkOrdersListPage({
  searchParams
}: {
  searchParams?: { q?: string; status?: string; priority?: string };
}) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  const supabase = await createSupabaseServer();
  const q = searchParams?.q || "";
  const status = searchParams?.status || "";
  const priority = searchParams?.priority || "";

  let query = supabase
    .from("work_orders")
    .select("id, code, title, status, priority, scheduled_date, contracts(code, customers(name))")
    .eq("tenant_id", profile.tenant.id)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`code.ilike.%${q}%,title.ilike.%${q}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }
  if (priority) {
    query = query.eq("priority", priority);
  }

  const { data: orders, error } = await query;

  return (
    <main className="page-shell">
      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Operação</p>
        <div className="page-header-row">
          <div>
            <h1>Ordens de Serviço.</h1>
            <p>Planejadas, em execução e concluídas — comPMOC, corretiva e emergenciais.</p>
          </div>
          <a href="/admin/work-orders/new" className="button-link primary">
            + Nova OS
          </a>
        </div>
      </header>

      {/* Filters */}
      <form method="get" className="filter-bar animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <div className="filter-row">
          <input
            name="q"
            type="search"
            placeholder="Buscar por código ou título..."
            defaultValue={q}
            className="filter-input"
          />
          <select name="status" defaultValue={status} className="filter-select">
            <option value="">Todos status</option>
            <option value="planejada">Planejada</option>
            <option value="agendada">Agendada</option>
            <option value="em_execução">Em execução</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <select name="priority" defaultValue={priority} className="filter-select">
            <option value="">Todas prioridades</option>
            <option value="baixa">Baixa</option>
            <option value="media">Média</option>
            <option value="alta">Alta</option>
            <option value="emergencial">Emergencial</option>
          </select>
          <button type="submit" className="button-link">Filtrar</button>
          {q || status || priority ? (
            <a href="/admin/work-orders" className="button-link">Limpar</a>
          ) : null}
        </div>
      </form>

      {/* Table */}
      <div className="table-card animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        {error ? (
          <p className="table-error">Erro ao carregar OS: {error.message}</p>
        ) : !orders || orders.length === 0 ? (
          <div className="table-empty">
            <p className="eyebrow">Nenhuma OS encontrada</p>
            <p>Crie a primeira ordem de serviço ou ajuste os filtros.</p>
            <a href="/admin/work-orders/new" className="button-link primary" style={{ marginTop: 12 }}>
              + Nova OS
            </a>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Título</th>
                <th>Contrato</th>
                <th>Prioridade</th>
                <th>Agendada para</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const contract = (o as any).contracts;
                return (
                  <tr key={o.id}>
                    <td>
                      <a href={`/admin/work-orders/${o.id}`} className="table-link">{o.code}</a>
                    </td>
                    <td className="td-wrap">{o.title}</td>
                    <td>
                      {contract ? (
                        <span>{contract.code} — {(contract as any).customers?.name || ""}</span>
                      ) : "—"}
                    </td>
                    <td>
                      <span className={`priority-badge priority-${o.priority}`}>{o.priority}</span>
                    </td>
                    <td>
                      {o.scheduled_date
                        ? new Date(o.scheduled_date).toLocaleDateString("pt-BR")
                        : "—"}
                    </td>
                    <td>
                      <span className={`status-badge status-${o.status}`}>{o.status}</span>
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
