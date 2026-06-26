import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { getStatusBadgeClass, formatStatusLabel } from "@/lib/status-badges";
import Link from "next/link";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "", label: "Todos os status" },
  { value: "rascunho", label: "Rascunho" },
  { value: "planejada", label: "Planejada" },
  { value: "liberada", label: "Liberada" },
  { value: "atribuida", label: "Atribuída" },
  { value: "em_execucao", label: "Em execução" },
  { value: "concluida_tecnico", label: "Concluída (técnico)" },
  { value: "em_validacao", label: "Em validação" },
  { value: "aprovada", label: "Aprovada" },
  { value: "encerrada", label: "Encerrada" },
  { value: "cancelada", label: "Cancelada" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Todas prioridades" },
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "critica", label: "Crítica" },
];

const TYPE_OPTIONS = [
  { value: "", label: "Todos os tipos" },
  { value: "preventiva", label: "Preventiva" },
  { value: "corretiva", label: "Corretiva" },
  { value: "corretiva_programada", label: "Corretiva programada" },
  { value: "inspecao", label: "Inspeção" },
  { value: "emergencia", label: "Emergência" },
];

export default async function WorkOrdersListPage({
  searchParams,
}: {
  searchParams?: Promise<{ q?: string; status?: string; priority?: string; type?: string; page?: string }>;
}) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  const sp = await searchParams;
  const supabase = await createSupabaseServer();
  const q = sp?.q || "";
  const status = sp?.status || "";
  const priority = sp?.priority || "";
  const type = sp?.type || "";
  const page = Math.max(1, parseInt(sp?.page ?? "1", 10) || 1);
  const perPage = 15;

  let query = supabase
    .from("work_orders")
    .select("id, type, priority, status, description, due_at, created_at, contract_id, contracts(code)", { count: "exact" })
    .eq("tenant_id", profile.tenant.id)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`description.ilike.%${q}%`);
  }
  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (type) query = query.eq("type", type);

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: orders, error, count } = await query;
  const totalPages = count ? Math.ceil(count / perPage) : 0;

  const columns: DataTableColumn[] = [
    {
      key: "id",
      label: "OS",
      sortable: true,
      render: (row) => (
        <Link href={`/admin/work-orders/${row.id}`} className="table-link">
          {String(row.id).slice(0, 8)}
        </Link>
      ),
    },
    {
      key: "description",
      label: "Descrição",
      sortable: true,
      className: "td-wrap",
      render: (_, value) => String(value ?? "—").slice(0, 80),
    },
    {
      key: "type",
      label: "Tipo",
      sortable: true,
      render: (_, value) => formatStatusLabel(String(value ?? "")),
    },
    {
      key: "priority",
      label: "Prioridade",
      sortable: true,
      render: (_, value) => (
        <span className={`priority-badge priority-${value}`}>{formatStatusLabel(String(value ?? ""))}</span>
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
      key: "due_at",
      label: "Prazo",
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
  if (priority) pageParams.priority = priority;
  if (type) pageParams.type = type;

  return (
    <main>
      <div className="telemetry-line" aria-hidden="true" />

      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Execução em campo</p>
        <div className="page-header-row">
          <div>
            <h1>Ordens de Serviço.</h1>
            <p>Preventivas, corretivas e emergenciais — do planejamento ao encerramento.</p>
          </div>
          <Link href="/admin/work-orders/new" className="button-link primary">
            + Nova OS
          </Link>
        </div>
      </header>

      {/* Filtros */}
      <form method="get" className="filter-bar animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <div className="filter-row" style={{ flexWrap: "wrap" }}>
          <input
            name="q"
            type="search"
            placeholder="Buscar por descrição..."
            defaultValue={q}
            className="filter-input"
          />
          <select name="status" defaultValue={status} className="filter-select">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select name="priority" defaultValue={priority} className="filter-select">
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select name="type" defaultValue={type} className="filter-select">
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button type="submit" className="button-link">Filtrar</button>
          {(q || status || priority || type) && (
            <a href="/admin/work-orders" className="button-link">Limpar</a>
          )}
        </div>
      </form>

      {/* Tabela */}
      <div className="animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        {error ? (
          <div className="table-card"><p className="table-error">Erro ao carregar OS: {error.message}</p></div>
        ) : (
          <DataTable
            columns={columns}
            rows={(orders ?? []) as unknown as Record<string, unknown>[]}
            page={page}
            totalPages={totalPages}
            baseUrl="/admin/work-orders"
            searchParams={pageParams}
          />
        )}
      </div>
    </main>
  );
}
