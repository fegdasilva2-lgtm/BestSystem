import { bootstrapFirstAdmin } from "@/app/setup/actions";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";

export default async function SetupPage({
  searchParams
}: {
  searchParams?: { error?: string; secret?: string };
}) {
  let hasUsers = false;
  let setupError: string | null = null;

  try {
    const admin = createSupabaseAdmin();
    const { count, error } = await admin
      .from("users_profile")
      .select("id", { count: "exact", head: true });
    if (error) setupError = error.message;
    hasUsers = (count ?? 0) > 0;
  } catch (err) {
    setupError = err instanceof Error ? err.message : "Configuração de Supabase indisponível.";
  }

  const setupSecret = process.env.SETUP_SECRET;
  if (setupSecret) {
    const provided = searchParams?.secret;
    if (provided !== setupSecret) redirect("/login");
  } else if (hasUsers) {
    redirect("/login");
  }

  return (
    <main className="page-shell narrow">
      <header className="page-header auth-header">
        <p className="eyebrow">Setup inicial</p>
        <h1>Criar primeiro administrador.</h1>
        <p>
          Use esta tela uma única vez no sandbox. Ela cria o tenant IMC Facilities se necessário,
          cria o usuário no Supabase Auth e vincula o perfil <code>admin_org</code>.
        </p>
      </header>

      <section className="auth-layout">
        <form action={bootstrapFirstAdmin} className="form-card auth-card">
          {setupError ? <p className="form-error">{setupError}</p> : null}
          {searchParams?.error ? <p className="form-error">{searchParams.error}</p> : null}
          <input type="hidden" name="setup_secret" value={searchParams?.secret ?? ""} />
          <label className="field">
            <span>Nome</span>
            <input name="name" required placeholder="Administrador PredialOps" />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input name="email" type="email" required placeholder="admin@empresa.com.br" />
          </label>
          <label className="field">
            <span>Senha</span>
            <input name="password" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" />
          </label>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={Boolean(setupError)}>
              Criar administrador
            </button>
          </div>
        </form>

        <aside className="glass-card auth-note">
          <p className="eyebrow">Segurança</p>
          <h2>Proteção por token</h2>
          <p className="muted">
            O acesso a esta tela requer o token <code>SETUP_SECRET</code> configurado
            na variável de ambiente. Sem ele, a rota redireciona para login.
          </p>
          <p className="muted">
            Após o primeiro administrador criado, novos acessos são bloqueados.
          </p>
        </aside>
      </section>
    </main>
  );
}
