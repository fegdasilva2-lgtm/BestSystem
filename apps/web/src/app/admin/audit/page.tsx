import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { DataTable, type DataTableColumn } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";

export const dynamic = "force-dynamic";

const ACTION_LABELS: Record<string, string> = {
  insert: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  approve: "Aprovação",
  reject: "Reprovação",
  sync: "Sincronização",
  role_change: "Mudança de perfil"
};

const fmtDateTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

const truncateJson = (val: unknown, max = 80): string => {
  if (val == null) return "—";
  const str = typeof val === "string" ? val : JSON.stringify(val);
  return str.length > max ? str.slice(0, max) + "…" : str;
};

interface PageProps {
  searchParams?: Promise<{
    entity_type?: string;
    action?: string;
    actor?: string;
    page?: string;
  }>;
}

export default async function AuditPage({ searchParams }: PageProps) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  const supabase = await createSupabaseServer();
  const sp = (await searchParams) ?? {};
  const entityType = sp.entity_type || "";
  const action = sp.action || "";
  const actor = sp.actor || "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const perPage = 25;

  // Query com filtros opcionais. RLS ja isola por tenant_id.
  let query = supabase
    .from("audit_logs")
    .select("id, entity_type, entity_id, action, before_data, after_data, ip_address, created_at, actor_id, users_profile!audit_logs_actor_id_fkey(name, email)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (entityType) query = query.eq("entity_type", entityType);
  if (action) query = query.eq("action", action);
  if (actor) query = query.eq("actor_id", actor);

  const from = (page - 1) * perPage;
  query = query.range(from, from + perPage - 1);

  const { data: logs, error, count } = await query;
  const totalPages = count ? Math.ceil(count / perPage) : 0;

  // Tipos de entidade conhecidos (para o filtro)
  const knownEntityTypes = [
    "users_profile",
    "contracts",
    "work_orders",
    "measurements",
    "measurement_items",
    "sites",
    "assets",
    "audit_logs"
  ];

  const columns: DataTableColumn[] = [
    {
      key: "created_at",
      label: "Quando",
      sortable: true,
      render: (_, v) => <span className="mono">{fmtDateTime(v as string)}</span>
    },
    {
      key: "actor",
      label: "Autor",
      render: (row) => {
        const actor = row.users_profile as { name?: string; email?: string } | { name?: string; email?: string }[] | null;
        if (!actor) return <span className="muted">sistema</span>;
        const a = Array.isArray(actor) ? actor[0] : actor;
        return (
          <span>
            <strong>{a?.name ?? "—"}</strong>
            <br />
            <small className="muted">{a?.email ?? ""}</small>
          </span>
        );
      }
    },
    {
      key: "action",
      label: "Ação",
      sortable: true,
      render: (_, v) => (
        <span className="role-tag">{ACTION_LABELS[String(v ?? "")] ?? String(v ?? "—")}</span>
      )
    },
    {
      key: "entity_type",
      label: "Entidade",
      sortable: true,
      render: (_, v) => <span className="mono">{String(v ?? "—")}</span>
    },
    {
      key: "entity_id",
      label: "ID",
      render: (_, v) =>
        v ? <span className="mono muted">{String(v).slice(0, 8)}</span> : <span className="muted">—</span>
    },
    {
      key: "before_data",
      label: "Antes",
      className: "td-wrap",
      render: (_, v) => <span className="mono muted">{truncateJson(v)}</span>
    },
    {
      key: "after_data",
      label: "Depois",
      className: "td-wrap",
      render: (_, v) => <span className="mono muted">{truncateJson(v)}</span>
    }
  ];

  const pageParams: Record<string, string> = {};
  if (entityType) pageParams.entity_type = entityType;
  if (action) pageParams.action = action;
  if (actor) pageParams.actor = actor;

  return (
    <main className="page-shell">
      <div className="telemetry-line" aria-hidden="true" />

      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Conformidade</p>
        <h1>Trilha de auditoria.</h1>
        <p>
          Eventos imutáveis gravados em <code>audit_logs</code> por triggers do banco
          e pela action de mudança de perfil. Apenas leitura. Append-only garantido
          por trigger no Postgres.
        </p>
      </header>

      {/* Filtros */}
      <form method="get" className="filter-bar animate-fade-in-up" style={{ animationDelay: "80ms" }}>
        <div className="filter-row" style={{ flexWrap: "wrap" }}>
          <select name="entity_type" defaultValue={entityType} className="filter-select">
            <option value="">Todas entidades</option>
            {knownEntityTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select name="action" defaultValue={action} className="filter-select">
            <option value="">Todas ações</option>
            {Object.entries(ACTION_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <button type="submit" className="button-link">Filtrar</button>
          {(entityType || action || actor) && (
            <a href="/admin/audit" className="button-link">Limpar</a>
          )}
        </div>
      </form>

      <div className="animate-fade-in-up" style={{ animationDelay: "160ms" }}>
        {error ? (
          <p className="table-error">Erro ao carregar audit log: {error.message}</p>
        ) : (
          <DataTable
            columns={columns}
            rows={(logs ?? []) as unknown as Record<string, unknown>[]}
            page={page}
            totalPages={totalPages}
            baseUrl="/admin/audit"
            searchParams={pageParams}
            emptyState={
              <EmptyState
                title="Nenhum evento registrado"
                description="Os logs aparecem aqui conforme mutacoes ocorrem no banco. Para fins de teste, altere a role de um usuario qualquer e a entrada sera gravada."
              />
            }
          />
        )}
      </div>
    </main>
  );
}