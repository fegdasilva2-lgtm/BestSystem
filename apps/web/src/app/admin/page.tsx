// Dashboard operacional — KPI reais + hub de onboarding.
// Queries ao Supabase com isolamento RLS por tenant_id.

import { createSupabaseServer } from "@/lib/supabase-server";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) redirect("/login");

  const supabase = await createSupabaseServer();
  const tenantId = profile.tenant.id;

  // Queries em paralelo para o dashboard
  const [
    { count: contractCount },
    { count: siteCount },
    { count: assetCount },
    { count: openWoCount },
    { count: pendingMeasCount },
    { count: rgmCount },
  ] = await Promise.all([
    supabase
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("sites")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("assets")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("work_orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .not("status", "in", '("encerrada","cancelada","aprovada")'),
    supabase
      .from("measurements")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .in("status", ["pre_enviada", "em_aceite", "contestada"]),
    supabase
      .from("rgm_versions")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
  ]);

  const kpis = [
    { label: "Contratos", value: contractCount ?? 0, detail: "Cadastrados no tenant", accent: "forest", icon: "◈" },
    { label: "Sites", value: siteCount ?? 0, detail: "Unidades operacionais", accent: "clay", icon: "◉" },
    { label: "Ativos", value: assetCount ?? 0, detail: "Equipamentos cadastrados", accent: "amber", icon: "◎" },
    { label: "OS abertas", value: openWoCount ?? 0, detail: "Em execução ou pendentes", accent: "coral", icon: "⟐" },
    { label: "Medições pendentes", value: pendingMeasCount ?? 0, detail: "Aguardando aceite", accent: "steel", icon: "◎" },
    { label: "RGMs", value: rgmCount ?? 0, detail: "Versões geradas", accent: "moss", icon: "▣" },
  ];

  const accentMap: Record<string, string> = {
    forest: "var(--color-blueprint-ink)",
    clay: "var(--color-safety-deep)",
    amber: "var(--color-warn)",
    coral: "var(--color-danger)",
    steel: "var(--color-muted)",
    moss: "var(--color-ok)",
  };

  const steps = [
    { href: "/admin/customers/new", number: "01", label: "Cliente", desc: "Razão social, CNPJ e contatos de aprovação." },
    { href: "/admin/contracts/new", number: "02", label: "Contrato", desc: "Vigência, escopo, SLA, valor e reajuste." },
    { href: "/admin/sites/new", number: "03", label: "Site", desc: "Unidade atendida, torre, bloco, loja ou campus." },
    { href: "/admin/assets/new", number: "04", label: "Ativo", desc: "Equipamento sob manutenção ou base para importação." },
  ];

  return (
    <main className="page-shell">
      {/* Linha de telemetria */}
      <div className="telemetry-line" aria-hidden="true" />

      <header className="page-header animate-fade-in-up">
        <p className="eyebrow">Painel operacional</p>
        <h1>{profile.tenant.name}</h1>
        <p>
          Visão geral dos contratos, ativos, ordens de serviço e medições do tenant.
        </p>
      </header>

      {/* KPI strip — 6 cards com dados reais */}
      <div className="stats-strip stagger-children">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="stat-card animate-fade-in-up"
            style={{ "--accent-color": accentMap[k.accent] } as React.CSSProperties}
          >
            <div className="stat-icon" aria-hidden="true">{k.icon}</div>
            <strong>{k.value}</strong>
            <span>{k.label}</span>
            <small>{k.detail}</small>
          </div>
        ))}
      </div>

      {/* Ações rápidas */}
      <section className="section-grid two stagger-children" style={{ marginTop: 14 }}>
        <a href="/admin/contracts" className="step-card hover-lift">
          <span className="step-number" style={{ background: "var(--color-ink-wash)", color: "var(--color-ink)" }}>📋</span>
          <div>
            <h2>Contratos</h2>
            <p className="muted">Listar, buscar e gerenciar contratos ativos.</p>
          </div>
        </a>
        <a href="/admin/work-orders" className="step-card hover-lift">
          <span className="step-number" style={{ background: "var(--color-warn-wash)", color: "var(--color-warn)" }}>🔧</span>
          <div>
            <h2>Ordens de serviço</h2>
            <p className="muted">Acompanhar execução, status e responsáveis.</p>
          </div>
        </a>
        <a href="/admin/measurements" className="step-card hover-lift">
          <span className="step-number" style={{ background: "var(--color-ok-wash)", color: "var(--color-ok)" }}>📊</span>
          <div>
            <h2>Medições</h2>
            <p className="muted">Enviar, aprovar e contestar medições mensais.</p>
          </div>
        </a>
        <a href="/admin/rgm" className="step-card hover-lift">
          <span className="step-number" style={{ background: "var(--color-ink-wash)", color: "var(--color-safety-deep)" }}>📄</span>
          <div>
            <h2>RGM</h2>
            <p className="muted">Relatório mensal gerencial configurável.</p>
          </div>
        </a>
      </section>

      {/* Onboarding — mostrado se não houver contratos */}
      {(!contractCount || contractCount === 0) && (
        <>
          <section className="callout-band animate-fade-in-up" style={{ marginTop: 14, animationDelay: "240ms" }}>
            <div>
              <p className="eyebrow">Primeiros passos</p>
              <strong>
                Nenhum contrato encontrado. Siga o wizard abaixo para cadastrar o primeiro cliente e contrato.
              </strong>
            </div>
          </section>

          <section className="section-grid two stagger-children" style={{ marginTop: 0 }}>
            {steps.map((s) => (
              <a key={s.href} href={s.href} className="step-card hover-lift">
                <span className="step-number">{s.number}</span>
                <div>
                  <h2>{s.label}</h2>
                  <p className="muted">{s.desc}</p>
                </div>
              </a>
            ))}
          </section>
        </>
      )}

      <section className="callout-band animate-fade-in-up" style={{ marginTop: 14, animationDelay: "320ms" }}>
        <div>
          <p className="eyebrow">Operação mensal</p>
          <strong>
            Após o contrato entrar em produção, o RGM passa a ser o entregável-chave para o cliente.
            Configure blocos por contrato e arquive a versão imutável após o aceite.
          </strong>
        </div>
        <a href="/admin/rgm" className="button-link">
          Abrir RGM configurável →
        </a>
      </section>

      <section className="callout-band animate-fade-in-up" style={{ animationDelay: "400ms" }}>
        <div>
          <p className="eyebrow">Importação em massa</p>
          <strong>Ativos e planos via CSV/Excel entram como acelerador do go-live.</strong>
        </div>
        <a href="/admin/import" className="button-link">
          Importar ativos em massa (CSV/Excel) →
        </a>
      </section>
    </main>
  );
}
