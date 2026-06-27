import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function SobrePage() {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");
  if (profile.role !== "super_admin_saas") redirect("/admin");

  const features = [
    {
      label: "Contrato",
      detail: "Entidade central — clientes, sites, ativos, SLA, medição e RGM orbitam o contrato.",
    },
    {
      label: "Cronograma",
      detail: "Vigência, vencimentos e SLA com alertas configuráveis por contrato.",
    },
    {
      label: "Execução",
      detail: "Ordens de serviço com workflow completo: rascunho → campo → validação → encerramento.",
    },
    {
      label: "Medição",
      detail: "Ciclo mensal com aprovação, contestação e aceite formal do cliente.",
    },
    {
      label: "Aceite",
      detail: "Fluxo de validação com evidências e assinatura digital do contratante.",
    },
    {
      label: "RGM",
      detail: "Relatório Gerencial Mensal configurável por contrato, arquivável após aceite.",
    },
    {
      label: "PMOC",
      detail: "Plano de Manutenção, Operação e Controle — preventivas e corretivas programadas.",
    },
    {
      label: "Offline",
      detail: "PWA com outbox, upload de evidências e sincronização incremental para operação em campo.",
    },
  ];

  const stack = [
    { label: "Frontend", value: "Next.js 15 (App Router) + TypeScript" },
    { label: "Backend", value: "Supabase — PostgreSQL + RLS + Auth" },
    { label: "Infra", value: "Vercel (deploy automático via push na main)" },
    { label: "Design", value: "CSS custom properties · Space Grotesk + Inter Tight + JetBrains Mono" },
    { label: "Região", value: "sa-east-1 (São Paulo)" },
  ];

  const pillars = [
    {
      title: "Multi-tenant com RLS",
      description:
        "Isolamento por tenant direto no banco via Row-Level Security do Supabase. O JWT carrega o claim tenant_id e as políticas são aplicadas no PostgreSQL — não depende de filtros no frontend.",
    },
    {
      title: "Offline-first",
      description:
        "PWA com outbox, upload de evidências fotográficas e sincronização incremental. O técnico produz em campo mesmo sem conexão e o sistema reconcilia quando online.",
    },
    {
      title: "RGM configurável",
      description:
        "Relatório mensal por contrato com blocos customizáveis. Após aceite do cliente, a versão é arquivada como imutável para auditoria.",
    },
    {
      title: "Piloto atual",
      description:
        "O piloto prioriza o fosso do estudo: contrato, PMOC, medição, aceite, RGM e operação offline em campo, com Supabase. Stack validada antes da migração enterprise.",
    },
  ];

  return (
    <main className="page-shell">
      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Sobre o produto</p>
        <h1>PredialOps — Plataforma de Gestão Predial</h1>
        <p>
          Web admin em Next.js conectado ao Supabase para validar contrato,
          cronograma, execução, medição, aceite, RGM e operação offline —
          antes da stack enterprise.
        </p>
      </header>

      {/* Funcionalidades */}
      <section aria-label="Funcionalidades da plataforma">
        <p className="eyebrow" style={{ marginTop: 24 }}>Funcionalidades</p>
        <div className="section-grid two stagger-children">
          {features.map((f) => (
            <article key={f.label} className="glass-card hover-lift">
              <h2>{f.label}</h2>
              <p className="muted">{f.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Pilares técnicos */}
      <section aria-label="Pilares técnicos" style={{ marginTop: 24 }}>
        <p className="eyebrow">Diferenciais técnicos</p>
        <div className="section-grid two stagger-children">
          {pillars.map((p) => (
            <article key={p.title} className="glass-card hover-lift">
              <h2>{p.title}</h2>
              <p className="muted">{p.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section aria-label="Stack tecnológica" style={{ marginTop: 24 }}>
        <div className="glass-card">
          <p className="eyebrow">Stack</p>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {stack.map((s) => (
              <div key={s.label} style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--color-safety-deep)", fontWeight: 700, minWidth: 80 }}>
                  {s.label}
                </span>
                <span style={{ color: "var(--color-ink)", fontSize: 14 }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
