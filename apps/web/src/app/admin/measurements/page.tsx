import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { getStatusBadgeClass, formatStatusLabel } from "@/lib/status-badges";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MeasurementsListPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  const sp = await searchParams;
  const supabase = await createSupabaseServer();
  const q = sp?.q || "";
  const status = sp?.status || "";
  const page = Math.max(1, parseInt(sp?.page ?? "1", 10) || 1);
  const perPage = 15;

  let query = supabase
    .from("measurements")
    .select("id, period, status, gross_amount, net_amount, created_at, contract_id, contracts(code)", { count: "exact" })
    .eq("tenant_id", profile.tenant.id)
    .order("period", { ascending: false });

  if (q) query = query.or(`period.ilike.%${q}%`);
  if (status) query = query.eq("status", status);

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: measurements, error, count } = await query;
  const totalPages = count ? Math.ceil(count / perPage) : 0;

  const columns: DataTableColumn[] = [
    {
      key: "period",
      label: "Período",
      sortable: true,
      render: (row) => (
        <Link href={`/admin/measurements/${row.id}`} className="table-link">
          {String(row.period)}
        </Link>
      ),
    },
    {
      key: "contracts",
      label: "Contrato",
      render: (row) => {
        const c = row.contracts as { code?: string } | null;
        return c?.code ?? "—";
      },
    },
    {
      key: "gross_amount",
      label: "Bruto",
      sortable: true,
      render: (_, value) =>
        value
          ? Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : "—",
    },
    {
      key: "net_amount",
      label: "Líquido",
      sortable: true,
      render: (_, value) =>
        value
          ? Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : "—",
    },
    {
      key: "created_at",
      label: "Criado",
      sortable: true,
      render: (_, value) => (value ? new Date(String(value)).toLocaleDateString("pt-BR") : "—"),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (_, value) => (
        <span className={getStatusBadgeClass(String(value ?? ""))}>
          {formatStatusLabel(String(value ?? ""))}
        </span>
      ),
    },
  ];

  const pageParams: Record<string, string> = {};
  if (q) pageParams.q = q;
  if (status) pageParams.status = status;

  return (
    <main>
      <div className="telemetry-line" aria-hidden="true" />

      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Financeiro</p>
        <div className="page-header-row">
          <div>
            <h1>Medições.</h1>
            <p>Fechamentos mensais por contrato — envio, aceite e contestação.</p>
          </div>
          <Link href="/admin/measurements/new" className="button-link primary">
            + Nova medição
          </Link>
        </div>
      </header>

      <form method="get" className="filter-bar animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <div className="filter-row">
          <input
            name="q"
            type="search"
            placeholder="Buscar por período (ex: 2026-06)..."
            defaultValue={q}
            className="filter-input"
          />
          <select name="status" defaultValue={status} className="filter-select">
            <option value="">Todos os status</option>
            <option value="rascunho">Rascunho</option>
            <option value="pre_enviada">Pré-enviada</option>
            <option value="em_aceite">Em aceite</option>
            <option value="aprovada">Aprovada</option>
            <option value="contestada">Contestada</option>
            <option value="faturada">Faturada</option>
          </select>
          <button type="submit" className="button-link">Filtrar</button>
          {(q || status) && <a href="/admin/measurements" className="button-link">Limpar</a>}
        </div>
      </form>

      <div className="animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        {error ? (
          <div className="table-card"><p className="table-error">Erro: {error.message}</p></div>
        ) : (
          <DataTable
            columns={columns}
            rows={(measurements ?? []) as unknown as Record<string, unknown>[]}
            page={page}
            totalPages={totalPages}
            baseUrl="/admin/measurements"
            searchParams={pageParams}
          />
        )}
      </div>
    </main>
  );
}
