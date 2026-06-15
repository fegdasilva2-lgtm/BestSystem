import { login } from "@/app/auth/actions";
import { getSessionProfile, roleLabels, type UserRole } from "@/lib/auth";
import { redirect } from "next/navigation";

const accessLanes = [
  {
    label: "Gestão",
    total: "3 perfis",
    detail: "Administra tenant, contratos, cadastros e governança da operação.",
    roles: ["super_admin_saas", "admin_org", "gestor_facilities"] satisfies UserRole[]
  },
  {
    label: "Operação",
    total: "5 perfis",
    detail: "Planeja, supervisiona e executa OS, PMOC, estoque e rotina de campo.",
    roles: ["planejador", "supervisor", "tecnico", "auxiliar", "almoxarife"] satisfies UserRole[]
  },
  {
    label: "Backoffice",
    total: "3 perfis",
    detail: "Acompanha comercial, financeiro, auditoria, medição e evidências.",
    roles: ["comercial", "financeiro", "auditor"] satisfies UserRole[]
  },
  {
    label: "Cliente",
    total: "3 perfis",
    detail: "Abre chamados, aprova entregas e acompanha fornecedores autorizados.",
    roles: ["cliente_gestor", "solicitante", "fornecedor"] satisfies UserRole[]
  }
];

const trustSignals = [
  { title: "Perfil ativo", detail: "Acesso aplicado conforme o cargo." },
  { title: "Tenant validado", detail: "Cada empresa em ambiente isolado." },
  { title: "Isolamento por RLS", detail: "Segurança no banco, não só na tela." }
];

export default async function LoginPage({
  searchParams
}: {
  searchParams?: { error?: string; next?: string; created?: string };
}) {
  const profile = await getSessionProfile();
  const next = searchParams?.next && searchParams.next.startsWith("/") ? searchParams.next : "/admin";

  if (profile?.active && profile.tenant) {
    redirect(next);
  }

  return (
    <main className="login-shell">
      <section className="login-hero" aria-labelledby="login-title">
        <div className="login-copy">
          <p className="eyebrow">Acesso PredialOps</p>
          <h1 id="login-title">Central de manutenção, contratos e campo.</h1>
          <p>
            Entre com seu usuário corporativo. O PredialOps reconhece o tenant e libera a
            experiência correta para cada perfil.
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
        </div>

        <form action={login} className="form-card auth-card login-card">
          <div className="login-card-head">
            <p className="eyebrow">Entrar</p>
            <h2>Acesse sua operação</h2>
            <p className="muted">Seu perfil é aplicado automaticamente após o login.</p>
          </div>
          {searchParams?.error ? <p className="form-error">{searchParams.error}</p> : null}
          {searchParams?.created ? <p className="status-pill">{searchParams.created}</p> : null}
          <input name="next" type="hidden" value={next} />
          <label className="field">
            <span>E-mail</span>
            <input name="email" type="email" autoComplete="email" required placeholder="camila@imcfacilities.com.br" />
          </label>
          <label className="field">
            <span>Senha</span>
            <input name="password" type="password" autoComplete="current-password" required placeholder="Senha temporária" />
          </label>
          <div className="form-actions">
            <a className="button-link" href="/setup">Primeiro acesso</a>
            <button type="submit" className="primary-button">Entrar</button>
          </div>
        </form>
      </section>

      <section className="role-matrix" aria-labelledby="roles-title">
        <div className="role-matrix-head">
          <div>
            <p className="eyebrow">Perfis e usuários</p>
            <h2 id="roles-title">Tipos de acesso disponíveis</h2>
          </div>
          <span className="status-pill">14 perfis</span>
        </div>
        <div className="role-lanes">
          {accessLanes.map((lane) => (
            <article className="role-lane" key={lane.label}>
              <div className="role-lane-head">
                <span>{lane.label}</span>
                <strong>{lane.total}</strong>
              </div>
              <p>{lane.detail}</p>
              <ul>
                {lane.roles.map((role) => (
                  <li key={role}>{roleLabels[role]}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
