export default function ImportPage() {
  return (
    <main className="page-shell narrow">
      <header className="page-header">
        <p className="eyebrow">Importação em massa</p>
        <h1>Ativos e planos entram pela PWA.</h1>
        <p>
          No piloto atual, o importador funcional fica no app offline-first para validar
          CSV/Excel, preview, rejeições, undo e geração posterior do cronograma.
        </p>
      </header>

      <section className="section-grid two">
        <article className="glass-card">
          <p className="eyebrow">Fluxo validado</p>
          <h2>Modelo, upload, preview e confirmação</h2>
          <p className="muted">
            A PWA valida linhas inválidas sem bloquear as válidas e preserva histórico local.
          </p>
        </article>
        <article className="glass-card">
          <p className="eyebrow">Próximo passo</p>
          <h2>Levar o importador para o admin web</h2>
          <p className="muted">
            A versão web deve reutilizar as mesmas regras e gravar com RLS no Supabase.
          </p>
        </article>
      </section>

      <section className="callout-band">
        <strong>Para testar agora, suba a PWA com `npm run dev:mobile` e abra a aba Importar.</strong>
        <a className="button-link" style={{ background: "#fffdf5" }} href="/admin">
          Voltar ao onboarding
        </a>
      </section>
    </main>
  );
}
