import { login } from "@/app/auth/actions";
import { getSessionProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

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
    <main className="page-shell narrow">
      <header className="page-header auth-header">
        <p className="eyebrow">Acesso seguro</p>
        <h1>Entrar no PredialOps.</h1>
        <p>
          Use um usuario criado no Supabase Auth e vinculado a `users_profile` para receber
          `tenant_id` e perfil no JWT.
        </p>
      </header>

      <section className="auth-layout">
        <form action={login} className="form-card auth-card">
          {searchParams?.error ? <p className="form-error">{searchParams.error}</p> : null}
          {searchParams?.created ? <p className="status-pill">{searchParams.created}</p> : null}
          <input name="next" type="hidden" value={next} />
          <label className="field">
            <span>E-mail</span>
            <input name="email" type="email" autoComplete="email" required placeholder="camila@imcfacilities.com.br" />
          </label>
          <label className="field">
            <span>Senha</span>
            <input name="password" type="password" autoComplete="current-password" required placeholder="Senha temporaria" />
          </label>
          <div className="form-actions">
            <a className="button-link" href="/setup">Primeiro acesso</a>
            <button type="submit" className="primary-button">Entrar</button>
          </div>
        </form>

        <aside className="glass-card auth-note">
          <p className="eyebrow">Perfis</p>
          <h2>RLS depende do perfil ativo</h2>
          <p className="muted">
            O login so libera dados quando o usuario tem registro em `users_profile`, tenant ativo
            e Auth Hook configurado para injetar os claims.
          </p>
        </aside>
      </section>
    </main>
  );
}
