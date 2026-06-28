import { getSessionProfile, roleLabels, type UserRole } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginForm from "./login-form";

const accessLanes = [
  {
    label: "Gestão",
    total: "3 perfis",
    detail: "Administra tenant, contratos, cadastros e governança da operação.",
    color: "forest",
    roles: ["super_admin_saas", "admin_org", "gestor_facilities"] satisfies UserRole[]
  },
  {
    label: "Operação",
    total: "5 perfis",
    detail: "Planeja, supervisiona e executa OS, PMOC, estoque e rotina de campo.",
    color: "clay",
    roles: ["planejador", "supervisor", "tecnico", "auxiliar", "almoxarife"] satisfies UserRole[]
  },
  {
    label: "Backoffice",
    total: "3 perfis",
    detail: "Acompanha comercial, financeiro, auditoria, medição e evidências.",
    color: "amber",
    roles: ["comercial", "financeiro", "auditor"] satisfies UserRole[]
  },
  {
    label: "Cliente",
    total: "3 perfis",
    detail: "Abre chamados, aprova entregas e acompanha fornecedores autorizados.",
    color: "steel",
    roles: ["cliente_gestor", "solicitante", "fornecedor"] satisfies UserRole[]
  }
];

const trustSignals = [
  {
    title: "Perfil ativo",
    detail: "Permissões por cargo e rotas dedicadas."
  },
  {
    title: "Tenant validado",
    detail: "Empresa, contratos e equipes isolados."
  },
  {
    title: "Isolamento por RLS",
    detail: "Políticas aplicadas direto no banco."
  }
];

// Substitui antigos KPIs hardcoded ("128 OS", "94%") por valor-proposta
// real: a combinacao dos 3 pilares do produto (contrato, execucao, aceite).
// Mantem o espaco visual sem mentir com dados ficticios.
const valueProps = [
  {
    title: "Contrato",
    detail: "Entidade central do produto — clientes, sites, ativos e OS orbitam o contrato."
  },
  {
    title: "Execucao",
    detail: "PMOC, OS e checklist em campo com PWA offline-first e evidencias."
  },
  {
    title: "Aceite",
    detail: "Medicao mensal, RGM arquivado e portal do cliente para fechamento do ciclo."
  }
];

const laneColors: Record<string, string> = {
  forest: "#143630",
  clay: "#dc653d",
  amber: "#c99232",
  steel: "#587482"
};

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { error?: string; next?: string; created?: string };
}) {
  const profile = await getSessionProfile();

  if (profile?.active && profile.tenant) {
    const externalRoles = ["cliente_gestor", "solicitante", "fornecedor"];
    const isExternal = externalRoles.includes(profile.role);
    const target = searchParams?.next && searchParams.next.startsWith("/") ? searchParams.next : (isExternal ? "/portal" : "/admin");
    redirect(target);
  }

  const next = searchParams?.next && searchParams.next.startsWith("/") ? searchParams.next : "/admin";

  return (
    <main className="login-shell">
      <section className="login-hero animate-fade-in-up" aria-labelledby="login-title">
        <div className="login-copy animate-slide-in-right" style={{ animationDelay: "80ms" }}>
          <p className="eyebrow">Acesso PredialOps</p>
          <h1 id="login-title">Gestão predial com contrato, campo e aceite no mesmo fluxo.</h1>
          <p>
            Entre com seu usuário corporativo. O PredialOps reconhece o tenant e libera a
            experiência correta para cada perfil de acesso.
          </p>

          <ul className="trust-strip" aria-label="Controles de acesso">
            {trustSignals.map((signal) => (
              <li key={signal.title}>
                <span className="trust-dot" aria-hidden="true" />
                <span>
                  <strong>{signal.title}</strong>
                  <small>{signal.detail}</small>
                </span>
              </li>
            ))}
          </ul>

          <div className="login-ops-panel" aria-label="Pilares do produto">
            <p className="eyebrow">Pilares do produto</p>
            <ul className="value-props">
              {valueProps.map((prop) => (
                <li key={prop.title}>
                  <strong>{prop.title}</strong>
                  <span>{prop.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="login-card animate-fade-in-up" style={{ animationDelay: "160ms" }}>
          <div className="login-card-head">
            <p className="eyebrow">Entrar</p>
            <h2>Acesse sua operação</h2>
            <p className="muted">Seu perfil é aplicado automaticamente após o login.</p>
          </div>

          {searchParams?.error ? (
            <div className="form-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {searchParams.error}
            </div>
          ) : null}
          {searchParams?.created ? (
            <div className="status-pill" role="status">
              Criado: {searchParams.created}
            </div>
          ) : null}

          <LoginForm next={next} />
        </div>
      </section>

      <section className="role-matrix animate-fade-in-up" style={{ animationDelay: "240ms" }} aria-labelledby="roles-title">
        <div className="role-matrix-head">
          <div>
            <p className="eyebrow">Perfis e acessos</p>
            <h2 id="roles-title">14 perfis organizados em 4 lanes</h2>
            <p className="muted" style={{ marginTop: 8, fontSize: 14 }}>
              Cada perfil tem permissões específicas e rotas dedicadas. O isolamento é garantido por RLS no banco.
            </p>
          </div>
          <span className="status-pill">14 perfis</span>
        </div>

        <div className="role-lanes">
          {accessLanes.map((lane) => (
            <article className="role-lane" key={lane.label}>
              <div
                className="role-lane-accent"
                style={{ background: laneColors[lane.color] }}
                aria-hidden="true"
              />
              <div className="role-lane-head">
                <span>{lane.label}</span>
                <strong>{lane.total}</strong>
              </div>
              <p>{lane.detail}</p>
              <ul>
                {lane.roles.map((role) => (
                  <li key={role}>
                    <span className="role-dot" style={{ background: laneColors[lane.color] }} aria-hidden="true" />
                    {roleLabels[role]}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="feature-strip stagger-children" style={{ animationDelay: "320ms" }} aria-label="Destaques do produto">
        {[
          {
            eyebrow: "Contratos",
            title: "Gestão centralizada",
            detail: "Clientes, sites, ativos, SLA, medição e RGM orbitam o contrato como entidade central."
          },
          {
            eyebrow: "RLS",
            title: "Multi-tenant seguro",
            detail: "O isolamento não depende apenas de filtros no frontend — o banco aplica as políticas."
          },
          {
            eyebrow: "PWA",
            title: "Offline em campo",
            detail: "Outbox, evidências fotográficas e sincronização incremental para execução offline."
          }
        ].map((f) => (
          <article className="feature-card" key={f.title}>
            <p className="eyebrow">{f.eyebrow}</p>
            <h3>{f.title}</h3>
            <p className="muted">{f.detail}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
