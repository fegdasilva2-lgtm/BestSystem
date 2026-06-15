import { createSupabaseServer } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createSupabaseServer();
  const { data: tenants, error } = await supabase
    .from("tenants")
    .select("id, name, plan, status")
    .order("name");

  return (
    <main className="page-shell">
      <header className="dashboard-hero">
        <div className="hero-copy">
          <div>
            <p className="eyebrow">Piloto sandbox em sa-east-1</p>
            <h1>Gestão predial com contrato, campo e aceite no mesmo fluxo.</h1>
            <p>
              Web admin em Next.js conectado ao Supabase para validar contrato,
              cronograma, execução, medição, aceite, RGM e operação offline antes da stack enterprise.
            </p>
          </div>
          <div className="hero-actions">
            <a className="button-link primary" href="/admin">Abrir operação</a>
            <a className="button-link" href="/admin/contracts/new">Novo contrato</a>
            <a className="button-link" href="/admin/rgm">Montar RGM</a>
          </div>
        </div>
        <aside className="hero-card" aria-label="Resumo do piloto">
          <div>
            <p className="eyebrow">Ambiente validado</p>
            <strong>{tenants?.length ?? 0}</strong>
            <span>tenants consultados via RLS</span>
            <div className="hero-meter" aria-hidden="true"><span /></div>
          </div>
          <p>
            O piloto prioriza o fosso do estudo: contrato, PMOC, medição, aceite,
            RGM e operação offline em campo.
          </p>
        </aside>
      </header>

      <section className="kpi-strip" aria-label="Indicadores do produto">
        <article className="kpi-card">
          <p className="eyebrow">Segurança</p>
          <strong>RLS</strong>
          <span>Isolamento por tenant no banco, não só na interface.</span>
        </article>
        <article className="kpi-card">
          <p className="eyebrow">Campo</p>
          <strong>PWA</strong>
          <span>Outbox, evidências e sincronização incremental para execução offline.</span>
        </article>
        <article className="kpi-card">
          <p className="eyebrow">Cliente</p>
          <strong>RGM</strong>
          <span>Relatório mensal configurável por contrato e arquivável após aceite.</span>
        </article>
      </section>

      <section className="section-grid">
        <article className="glass-card">
          <p className="eyebrow">Produto</p>
          <h2>Contrato como entidade central</h2>
          <p className="muted">Clientes, sites, ativos, SLA, medição e RGM orbitam o contrato.</p>
        </article>
        <article className="glass-card">
          <p className="eyebrow">Segurança</p>
          <h2>Multi-tenant com RLS</h2>
          <p className="muted">O isolamento não depende apenas de filtros no frontend.</p>
        </article>
        <article className="glass-card">
          <p className="eyebrow">Campo</p>
          <h2>Offline-first validado</h2>
          <p className="muted">A PWA demonstra outbox, upload de evidências e sync incremental.</p>
        </article>
      </section>

      <section className="glass-card" style={{ marginTop: 18 }}>
        <p className="eyebrow">Supabase</p>
        <h2>Tenants provisionados</h2>
        {error ? (
          <p style={{ color: "var(--color-danger)" }}>
            Não foi possível consultar a tabela <code>tenants</code>. Verifique as variáveis
            <code> NEXT_PUBLIC_SUPABASE_URL</code> e se as migrations foram aplicadas.
          </p>
        ) : !tenants || tenants.length === 0 ? (
          <p className="muted">
            Nenhum tenant retornado. Se as migrations foram aplicadas, confira a RLS: o JWT
            precisa carregar o claim <code>tenant_id</code>.
          </p>
        ) : (
          <ul className="tenant-list">
            {tenants.map((t) => (
              <li className="tenant-row" key={t.id}>
                <span>
                  <strong>{t.name}</strong>
                  <br />
                  <small className="muted">Plano {t.plan}</small>
                </span>
                <span className="status-pill">{t.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
