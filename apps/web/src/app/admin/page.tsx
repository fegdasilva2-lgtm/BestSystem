// Hub do wizard de onboarding.
// Fluxo: cliente -> contrato -> site -> ativo.
// Cada link ja entrega Server Actions com RLS respeitada.

export default function OnboardingHub() {
  const steps = [
    { href: "/admin/customers/new", number: "01", label: "Cliente", desc: "Razão social, CNPJ e contatos de aprovação." },
    { href: "/admin/contracts/new", number: "02", label: "Contrato", desc: "Vigência, escopo, SLA, valor e reajuste." },
    { href: "/admin/sites/new", number: "03", label: "Site", desc: "Unidade atendida, torre, bloco, loja ou campus." },
    { href: "/admin/assets/new", number: "04", label: "Ativo", desc: "Equipamento sob manutenção ou base para importação." }
  ];

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Onboarding operacional</p>
        <h1>Configurar um novo cliente e contrato.</h1>
        <p>
          Siga a ordem abaixo. Cada etapa grava no Supabase com isolamento por tenant via RLS.
        </p>
      </header>

      <section className="section-grid two">
        {steps.map((s) => (
          <a
            key={s.href}
            href={s.href}
            className="step-card"
          >
            <span className="step-number">{s.number}</span>
            <div>
              <h2>{s.label}</h2>
              <p className="muted">{s.desc}</p>
            </div>
          </a>
        ))}
      </section>

      <section className="callout-band">
        <div>
          <p className="eyebrow">Operação mensal</p>
          <strong>
            Apos o contrato entrar em producao, o RGM passa a ser o entregavel-chave para o cliente.
            Configure blocos por contrato e arquive a versao imutavel apos o aceite.
          </strong>
        </div>
        <a
          href="/admin/rgm"
          className="button-link"
        >
          Abrir RGM configurável -&gt;
        </a>
      </section>

      <section className="callout-band">
        <div>
          <p className="eyebrow">Importação em massa</p>
          <strong>Ativos e planos via CSV/Excel entram como acelerador do go-live.</strong>
        </div>
        <a
          href="/admin/import"
          className="button-link"
        >
          Importar ativos em massa (CSV/Excel) -&gt;
        </a>
      </section>
    </main>
  );
}
