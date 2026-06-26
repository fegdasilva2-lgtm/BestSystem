import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/DataTable";

export const dynamic = "force-dynamic";

export default async function ContractsListPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  const sp = await searchParams;
  const supabase = await createSupabaseServer();
  const q = sp?.q || "";
  const page = Math.max(1, parseInt(sp?.page ?? "1", 10) || 1);
  const perPage = 15;

  let query = supabase
    .from("contracts")
    .select("id, code, scope, starts_on, ends_on, monthly_value, customers(name)", { count: "exact" })
    .eq("tenant_id", profile.tenant.id)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`code.ilike.%${q}%,scope.ilike.%${q}%`);
  }

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: contracts, error, count } = await query;
  const totalPages = count ? Math.ceil(count / perPage) : 0;

  const columns: DataTableColumn[] = [
    {
      key: "code",
      label: "Código",
      sortable: true,
      render: (row, value) => (
        <a href={`/admin/contracts/${row.id}`} className="table-link">
          {String(value ?? "—")}
        </a>
      ),
    },
    {
      key: "customers",
      label: "Cliente",
      sortable: true,
      render: (row) => {
        const c = row.customers as { name?: string } | null;
        return c?.name ?? "—";
      },
    },
    { key: "scope", label: "Escopo", sortable: true, className: "td-wrap" },
    {
      key: "starts_on",
      label: "Início",
      sortable: true,
      render: (_, value) =>
        value ? new Date(String(value)).toLocaleDateString("pt-BR") : "—",
    },
    {
      key: "ends_on",
      label: "Término",
      sortable: true,
      render: (_, value) =>
        value ? new Date(String(value)).toLocaleDateString("pt-BR") : "—",
    },
    {
      key: "monthly_value",
      label: "Valor mensal",
      sortable: true,
      render: (_, value) =>
        value
          ? Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : "—",
    },
  ];

  const pageParams: Record<string, string> = {};
  if (q) pageParams.q = q;

  return (
    <main>
      <div className="telemetry-line" aria-hidden="true" />

      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Operações contratuais</p>
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

      {/* Filtros */}
      <form method="get" className="filter-bar animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <div className="filter-row">
          <input
            name="q"
            type="search"
            placeholder="Buscar por código ou escopo..."
            defaultValue={q}
            className="filter-input"
          />
          <button type="submit" className="button-link">Filtrar</button>
          {q && <a href="/admin/contracts" className="button-link">Limpar</a>}
        </div>
      </form>

      {/* Tabela */}
      <div className="animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        {error ? (
          <div className="table-card"><p className="table-error">Erro ao carregar contratos: {error.message}</p></div>
        ) : (
          <DataTable
            columns={columns}
            rows={(contracts ?? []) as unknown as Record<string, unknown>[]}
            page={page}
            totalPages={totalPages}
            baseUrl="/admin/contracts"
            searchParams={pageParams}
          />
        )}
      </div>
    </main>
  );
}
