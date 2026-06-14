import { createUserProfile } from "@/app/admin/users/actions";
import { getSessionProfile, roleLabels, type UserRole } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

const editableRoles: UserRole[] = [
  "admin_org",
  "gestor_facilities",
  "planejador",
  "supervisor",
  "tecnico",
  "auxiliar",
  "almoxarife",
  "comercial",
  "financeiro",
  "cliente_gestor",
  "solicitante",
  "auditor",
  "fornecedor"
];

function canManageUsers(role: UserRole) {
  return role === "super_admin_saas" || role === "admin_org" || role === "gestor_facilities";
}

export default async function UsersPage({
  searchParams
}: {
  searchParams?: { error?: string; created?: string };
}) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) {
    redirect("/login?error=Usuario sem perfil ativo&next=/admin/users");
  }

  const supabase = createSupabaseServer();
  const { data: users, error } = await supabase
    .from("users_profile")
    .select("id, name, email, role, active, created_at")
    .order("name");

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Identidade e acesso</p>
        <h1>Perfis de usuarios.</h1>
        <p>
          Usuarios autenticam no Supabase Auth e recebem o perfil de dominio via `users_profile`.
          O Auth Hook injeta `tenant_id`, `user_role` e `user_active` no JWT.
        </p>
      </header>

      <section className="profile-grid">
        <aside className="glass-card">
          <p className="eyebrow">Sessao atual</p>
          <h2>{profile.name}</h2>
          <p className="muted">{profile.email}</p>
          <span className="status-pill">{roleLabels[profile.role]}</span>
          <div className="profile-list">
            <div className="profile-row">
              <span>
                <strong>{profile.tenant.name}</strong>
                <small className="muted">Tenant ativo</small>
              </span>
              <span className="status-pill">{profile.tenant.status}</span>
            </div>
            <div className="profile-row">
              <span>
                <strong>{profile.tenant.plan}</strong>
                <small className="muted">Plano contratado</small>
              </span>
              <span className="status-pill">RLS</span>
            </div>
          </div>
        </aside>

        <section className="glass-card">
          <p className="eyebrow">Tenant</p>
          <h2>Usuarios provisionados</h2>
          {error ? <p className="form-error">{error.message}</p> : null}
          <div className="profile-list">
            {(users ?? []).map((user) => (
              <div className="profile-row" key={user.id}>
                <span>
                  <strong>{user.name}</strong>
                  <small className="muted">{user.email} - {roleLabels[user.role as UserRole] ?? user.role}</small>
                </span>
                <span className={`status-pill ${user.active ? "" : "danger-pill"}`}>
                  {user.active ? "ativo" : "inativo"}
                </span>
              </div>
            ))}
            {!error && (users ?? []).length === 0 ? <p className="muted">Nenhum usuario visivel para este tenant.</p> : null}
          </div>
        </section>
      </section>

      {canManageUsers(profile.role) ? (
        <section className="form-card" style={{ marginTop: 18 }}>
          <div>
            <p className="eyebrow">Novo login</p>
            <h2>Criar usuario no Auth e vincular perfil</h2>
            <p className="muted">
              A senha informada e temporaria. Em producao, prefira convite por e-mail ou troca obrigatoria no primeiro acesso.
            </p>
          </div>
          {searchParams?.error ? <p className="form-error">{searchParams.error}</p> : null}
          {searchParams?.created ? <p className="status-pill">Criado: {searchParams.created}</p> : null}
          <form action={createUserProfile} className="form-grid">
            <label className="field">
              <span>Nome</span>
              <input name="name" required placeholder="Camila Torres" />
            </label>
            <label className="field">
              <span>E-mail</span>
              <input name="email" type="email" required placeholder="camila@imcfacilities.com.br" />
            </label>
            <label className="field">
              <span>Senha temporaria</span>
              <input name="password" type="password" required minLength={8} placeholder="PredialOps!2026" />
            </label>
            <label className="field">
              <span>Perfil</span>
              <select name="role" defaultValue="tecnico">
                {editableRoles.map((role) => (
                  <option key={role} value={role}>{roleLabels[role]}</option>
                ))}
              </select>
            </label>
            <div className="form-actions field full">
              <button className="primary-button" type="submit">Criar usuario</button>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  );
}
