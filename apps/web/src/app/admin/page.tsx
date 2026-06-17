// Hub do wizard de onboarding.
// Fluxo: cliente -> contrato -> site -> ativo.
// Cada link ja entrega Server Actions com RLS respeitada.

const stats = [
  {
    label: "Contratos ativos",
    value: "—",
    detail: "Vigentes no tenant",
    accent: "forest",
    icon: "◈"
  },
  {
    label: "Sites cadastrados",
    value: "—",
    detail: "Unidades operacionais",
    accent: "clay",
    icon: "◉"
  },
  {
    label: "Ativos em plano",
    value: "—",
    detail: "Com PMOC vigente",
    accent: "amber",
    icon: "◎"
  },
  {
    label: "RGMs pendentes",
    value: "—",
    detail: "Aguardando aceite",
    accent: "steel",
    icon: "◐"
  }
];

export default function OnboardingHub() {
  const steps = [
    { href: "/admin/customers/new", number: "01", label: "Cliente", desc: "Razão social, CNPJ e contatos de aprovação." },
    { href: "/admin/contracts/new", number: "02", label: "Contrato", desc: "Vigência, escopo, SLA, valor e reajuste." },
    { href: "/admin/sites/new", number: "03", label: "Site", desc: "Unidade atendida, torre, bloco, loja ou campus." },
    { href: "/admin/assets/new", number: "04", label: "Ativo", desc: "Equipamento sob manutenção ou base para importação." }
  ];

  const accentMap: Record<string, string> = {
    forest: "var(--color-forest)",
    clay: "var(--color-clay)",
    amber: "var(--color-amber)",
    steel: "var(--color-steel)"
  };

  return (
    <main className="page-shell">
      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Onboarding operacional</p>
        <h1>Configurar um novo cliente e contrato.</h1>
        <p>
          Siga a ordem abaixo. Cada etapa grava no Supabase com isolamento por tenant via RLS.
        </p>
      </header>

      {/* Stats strip */}
      <div className="stats-strip stagger-children">
        {stats.map((s) => (
          <div
            key={s.label}
            className="stat-card animate-fade-in-up"
            style={{ "--accent-color": accentMap[s.accent] } as React.CSSProperties}
          >
            <div className="stat-icon" aria-hidden="true">{s.icon}</div>
            <strong>{s.value}</strong>
            <span>{s.label}</span>
            <small>{s.detail}</small>
          </div>
        ))}
      </div>

      <section className="section-grid two stagger-children" style={{ marginTop: 0 }}>
        {steps.map((s) => (
          <a
            key={s.href}
            href={s.href}
            className="step-card hover-lift"
          >
            <span className="step-number">{s.number}</span>
            <div>
              <h2>{s.label}</h2>
              <p className="muted">{s.desc}</p>
            </div>
          </a>
        ))}
      </section>

      <section className="callout-band animate-fade-in-up" style={{ animationDelay: "320ms" }}>
        <div>
          <p className="eyebrow">Operação mensal</p>
          <strong>
            Após o contrato entrar em produção, o RGM passa a ser o entregável-chave para o cliente.
            Configure blocos por contrato e arquive a versão imutável após o aceite.
          </strong>
        </div>
        <a href="/admin/rgm" className="button-link">
          Abrir RGM configurável -&gt;
        </a>
      </section>

      <section className="callout-band animate-fade-in-up" style={{ animationDelay: "400ms" }}>
        <div>
          <p className="eyebrow">Importação em massa</p>
          <strong>Ativos e planos via CSV/Excel entram como acelerador do go-live.</strong>
        </div>
        <a href="/admin/import" className="button-link">
          Importar ativos em massa (CSV/Excel) -&gt;
        </a>
      </section>
    </main>
  );
}
