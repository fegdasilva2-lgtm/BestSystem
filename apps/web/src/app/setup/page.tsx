import { bootstrapFirstAdmin } from "@/app/setup/actions";
import { createSupabaseAdmin } from "@/lib/supabase-admin";
import { redirect } from "next/navigation";

export default async function SetupPage({
  searchParams
}: {
  searchParams?: { error?: string };
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
    setupError = err instanceof Error ? err.message : "Configuracao de Supabase indisponivel.";
  }

  if (hasUsers) redirect("/login");

  return (
    <main className="page-shell narrow">
      <header className="page-header auth-header">
        <p className="eyebrow">Setup inicial</p>
        <h1>Criar primeiro administrador.</h1>
        <p>
          Use esta tela uma unica vez no sandbox. Ela cria o tenant IMC Facilities se necessario,
          cria o usuario no Supabase Auth e vincula o perfil `admin_org`.
        </p>
      </header>

      <section className="auth-layout">
        <form action={bootstrapFirstAdmin} className="form-card auth-card">
          {setupError ? <p className="form-error">{setupError}</p> : null}
          {searchParams?.error ? <p className="form-error">{searchParams.error}</p> : null}
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
            <input name="password" type="password" required minLength={8} placeholder="PredialOps!2026" />
          </label>
          <div className="form-actions">
            <button className="primary-button" type="submit" disabled={Boolean(setupError)}>
              Criar administrador
            </button>
          </div>
        </form>

        <aside className="glass-card auth-note">
          <p className="eyebrow">Seguranca</p>
          <h2>Bloqueio automatico</h2>
          <p className="muted">
            Quando o primeiro `users_profile` existir, esta rota redireciona para `/login` e nao permite novo bootstrap.
          </p>
        </aside>
      </section>
    </main>
  );
}
