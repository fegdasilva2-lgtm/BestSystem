import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export default async function AssetsListPage({
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
    .from("assets")
    .select("id, code, name, type, criticality, status, locations(name, sites(name))")
    .eq("tenant_id", profile.tenant.id)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`code.ilike.%${q}%,name.ilike.%${q}%,type.ilike.%${q}%`);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data: assets, error } = await query;

  return (
    <main className="page-shell">
      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">EAM</p>
        <div className="page-header-row">
          <div>
            <h1>Ativos.</h1>
            <p>Equipamentos sob manutenção preventiva e corretiva.</p>
          </div>
          <a href="/admin/assets/new" className="button-link primary">
            + Novo ativo
          </a>
        </div>
      </header>

      {/* Filters */}
      <form method="get" className="filter-bar animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <div className="filter-row">
          <input
            name="q"
            type="search"
            placeholder="Buscar por TAG, nome ou tipo..."
            defaultValue={q}
            className="filter-input"
          />
          <select name="status" defaultValue={status} className="filter-select">
            <option value="">Todos os status</option>
            <option value="operacional">Operacional</option>
            <option value="em_manutencao">Em manutenção</option>
            <option value="parado">Parado</option>
            <option value="baixa">Baixa</option>
          </select>
          <button type="submit" className="button-link">Filtrar</button>
          {q || status ? (
            <a href="/admin/assets" className="button-link">Limpar</a>
          ) : null}
        </div>
      </form>

      {/* Table */}
      <div className="table-card animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        {error ? (
          <p className="table-error">Erro ao carregar ativos: {error.message}</p>
        ) : !assets || assets.length === 0 ? (
          <EmptyState
            title="Nenhum ativo encontrado"
            description="Cadastre o primeiro ativo ou use a importação em massa via CSV."
            action={
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <a href="/admin/assets/new" className="button-link primary">+ Novo ativo</a>
                <a href="/admin/import" className="button-link">Importar em massa</a>
              </div>
            }
          />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>TAG</th>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Local</th>
                <th>Criticidade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((a) => {
                const loc = (a as any).locations;
                return (
                  <tr key={a.id}>
                    <td>
                      <a href={`/admin/assets/${a.id}`} className="table-link">{a.code}</a>
                    </td>
                    <td className="td-wrap">{a.name}</td>
                    <td>{a.type || "—"}</td>
                    <td>{loc ? `${loc.name} / ${(loc as any).sites?.name || ""}` : "—"}</td>
                    <td>
                      <span className={`criticality-badge criticality-${a.criticality}`}>
                        {a.criticality}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${a.status}`}>{a.status}</span>
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
