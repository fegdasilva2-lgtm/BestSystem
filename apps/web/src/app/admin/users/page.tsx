import { createUserProfile } from "@/app/admin/users/actions";
import { getSessionProfile, roleLabels, type UserRole } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase-server";
import { canManageUsers } from "@/lib/rbac-matrix";
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

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default async function UsersPage({
  searchParams
}: {
  searchParams?: { error?: string; created?: string };
}) {
  const profile = await getSessionProfile();
  if (!profile?.active || !profile.tenant) {
    redirect("/login?error=Usuário sem perfil ativo&next=/admin/users");
  }

  const supabase = await createSupabaseServer();
  const { data: users, error } = await supabase
    .from("users_profile")
    .select("id, name, email, role, active, created_at")
    .order("name");

  const list = users ?? [];
  const activeCount = list.filter((u) => u.active).length;

  return (
    <main className="page-shell">
      <header className="page-header">
        <p className="eyebrow">Identidade e acesso</p>
        <h1>Perfis de usuários.</h1>
        <p>
          Usuários autenticam no Supabase Auth e recebem o perfil de domínio via <code>users_profile</code>.
          O Auth Hook injeta <code>tenant_id</code>, <code>user_role</code> e <code>user_active</code> no JWT.
        </p>
      </header>

      <section className="profile-grid">
        <aside className="glass-card profile-self">
          <p className="eyebrow">Sessão atual</p>
          <div className="profile-self-head">
            <span className="avatar avatar-lg" aria-hidden="true">{initials(profile.name)}</span>
            <div>
              <h2>{profile.name}</h2>
              <p className="muted">{profile.email}</p>
              <span className="role-tag">{roleLabels[profile.role]}</span>
            </div>
          </div>
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
          <div className="card-head-row">
            <div>
              <p className="eyebrow">Tenant</p>
              <h2>Usuários provisionados</h2>
            </div>
            <span className="status-pill">{activeCount}/{list.length} ativos</span>
          </div>
          {error ? <p className="form-error">{error.message}</p> : null}
          <div className="profile-list">
            {list.map((user) => (
              <div className="profile-row user-row" key={user.id}>
                <span className="avatar" aria-hidden="true">{initials(user.name)}</span>
                <span className="user-id">
                  <strong>{user.name}</strong>
                  <small className="muted">{user.email}</small>
                  <span className="role-tag">{roleLabels[user.role as UserRole] ?? user.role}</span>
                </span>
                <span className={`status-pill ${user.active ? "" : "danger-pill"}`}>
                  {user.active ? "ativo" : "inativo"}
                </span>
              </div>
            ))}
            {!error && list.length === 0 ? <p className="muted">Nenhum usuário visível para este tenant.</p> : null}
          </div>
        </section>
      </section>

      {canManageUsers(profile.role) ? (
        <section className="form-card" style={{ marginTop: 18 }}>
          <div>
            <p className="eyebrow">Novo login</p>
            <h2>Criar usuário no Auth e vincular perfil</h2>
            <p className="muted">
              A senha informada é temporária. Em produção, prefira convite por e-mail ou troca obrigatória no primeiro acesso.
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
              <span>Senha temporária</span>
              <input name="password" type="password" required minLength={8} placeholder="Mínimo 8 caracteres" />
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
              <button className="primary-button" type="submit">Criar usuário</button>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  );
}
