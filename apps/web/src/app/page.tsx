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
      <header className="hero-panel">
        <div>
          <p className="eyebrow">Piloto sandbox em sa-east-1</p>
          <h1>Gestao contratual de manutencao com DNA brasileiro.</h1>
          <p>
            Web admin em Next.js conectado ao Supabase para validar o ciclo contrato,
            cronograma, execucao, medicao, aceite e RGM antes da stack enterprise.
          </p>
          <div className="hero-actions">
            <a className="button-link primary" href="/admin">Iniciar onboarding</a>
            <a className="button-link" href="/admin/contracts/new">Cadastrar contrato</a>
          </div>
        </div>
        <aside className="hero-card" aria-label="Resumo do piloto">
          <div>
            <p className="eyebrow">Tese validada</p>
            <strong>{tenants?.length ?? 0}</strong>
            <span>tenants consultados via RLS</span>
          </div>
          <p>
            O piloto prioriza o fosso do estudo: contrato, PMOC, medicao, aceite,
            RGM e operacao offline em campo.
          </p>
        </aside>
      </header>

      <section className="section-grid">
        <article className="glass-card">
          <p className="eyebrow">Produto</p>
          <h2>Contrato como entidade central</h2>
          <p className="muted">Clientes, sites, ativos, SLA, medicao e RGM orbitam o contrato.</p>
        </article>
        <article className="glass-card">
          <p className="eyebrow">Seguranca</p>
          <h2>Multi-tenant com RLS</h2>
          <p className="muted">O isolamento nao depende apenas de filtros no frontend.</p>
        </article>
        <article className="glass-card">
          <p className="eyebrow">Campo</p>
          <h2>Offline-first validado</h2>
          <p className="muted">A PWA demonstra outbox, upload de evidencias e sync incremental.</p>
        </article>
      </section>

      <section className="glass-card" style={{ marginTop: 18 }}>
        <p className="eyebrow">Supabase</p>
        <h2>Tenants provisionados</h2>
        {error ? (
          <p style={{ color: "var(--color-danger)" }}>
            Nao foi possivel consultar a tabela <code>tenants</code>. Verifique as variaveis
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
