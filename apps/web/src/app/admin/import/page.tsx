import Link from "next/link";

const templates = [
  { name: "Ativos", file: "template-ativos.csv", desc: "Equipamentos: TAG, nome, tipo, fabricante, criticidade, local, site." },
  { name: "Contratos", file: "template-contratos.csv", desc: "Contratos: código, escopo, vigência, valor mensal, regra de cobrança." },
  { name: "Ordens de Serviço", file: "template-os.csv", desc: "OS: tipo, prioridade, descrição, prazo, contrato, site, ativo." },
  { name: "Medições", file: "template-medicoes.csv", desc: "Medições mensais: contrato, período, valor bruto, observações." },
  { name: "Locais", file: "template-locais.csv", desc: "Sites e ambientes: nome do site, endereço, local, tipo de ambiente." },
];

export default function ImportPage() {
  return (
    <main>
      <div className="telemetry-line" aria-hidden="true" />

      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Importação em massa</p>
        <h1>Modelos de planilha.</h1>
        <p>Baixe o modelo, preencha com seus dados e importe via CSV/Excel.</p>
      </header>

      <section className="section-grid two stagger-children" style={{ marginTop: 14 }}>
        {templates.map((t) => (
          <article key={t.file} className="glass-card hover-lift animate-fade-in-up">
            <p className="eyebrow">Modelo</p>
            <h2>{t.name}</h2>
            <p className="muted">{t.desc}</p>
            <div style={{ marginTop: 12 }}>
              <a href={`/templates/${t.file}`} className="button-link primary" download>
                Baixar CSV
              </a>
            </div>
          </article>
        ))}
      </section>

      <section className="callout-band animate-fade-in-up" style={{ marginTop: 14, animationDelay: "320ms" }}>
        <div>
          <p className="eyebrow">Como importar</p>
          <strong>
            Após preencher a planilha, use a importação via PWA (offline-first) ou aguarde o importador web que está em desenvolvimento.
          </strong>
        </div>
        <Link href="/admin" className="button-link">Voltar ao painel</Link>
      </section>
    </main>
  );
}
