import type { Metadata, Viewport } from "next";
import { logout } from "@/app/auth/actions";
import { getSessionProfile, roleLabels } from "@/lib/auth";
import { colors } from "@predialops/ds/tokens";
import "./globals.css";

export const metadata: Metadata = {
  title: "PredialOps | Facilities SaaS",
  description: "Plataforma SaaS brasileira para gestão de contratos de manutenção predial.",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: colors.forest
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();

  return (
    <html lang="pt-BR">
      <body>
        <div className="app-chrome">
          <nav className="top-rail" aria-label="Navegação principal">
            <a className="brand-lockup" href="/">
              <span className="brand-mark" aria-hidden="true">P</span>
              <span className="brand-text">
                <strong>PredialOps</strong>
                <span>Contract Ops Brasil</span>
              </span>
            </a>
            <div className="rail-links">
              <a href="/admin">Operação</a>
              <a href="/admin/users">Acessos</a>
              <a href="/admin/contracts/new">Contrato</a>
              <a href="/admin/assets/new">Ativo</a>
              <a href="/admin/rgm">RGM</a>
            </div>
            <div className="user-rail">
              {profile?.active && profile.tenant ? (
                <>
                  <a className="user-pill" href="/admin/users">
                    <span>{profile.name}</span>
                    <small>{roleLabels[profile.role]} - {profile.tenant.name}</small>
                  </a>
                  <form action={logout}>
                    <button className="ghost-button compact" type="submit">Sair</button>
                  </form>
                </>
              ) : (
                <a className="button-link primary" href="/login">Entrar</a>
              )}
            </div>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
