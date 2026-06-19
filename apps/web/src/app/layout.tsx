import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { logout } from "@/app/auth/actions";
import { getSessionProfile, roleLabels } from "@/lib/auth";
import { colors } from "@predialops/ds/tokens";
import "./globals.css";

// Tipografia "Prancheta de obra":
// - Space Grotesk — display geométrico com personality, peso 500-700
// - Inter Tight — corpo neutro e apertado, leitura de tabela
// - JetBrains Mono — códigos (OS-2026-0142), medições, datas NR
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  display: "swap"
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "PredialOps | Facilities SaaS",
  description: "Plataforma SaaS brasileira para gestão de contratos de manutenção predial.",
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  themeColor: colors.blueprintInk
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();

  return (
    <html
      lang="pt-BR"
      className={`${spaceGrotesk.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <body>
        <div className="app-chrome">
          <nav className="top-rail" aria-label="Navegação principal">
            <a className="brand-lockup" href="/">
              <span className="brand-mark" aria-hidden="true">P</span>
              <span className="brand-text">
                <strong>PredialOps</strong>
                <span>Facilities Brasil</span>
              </span>
            </a>
            <div className="rail-links" aria-label="Módulos">
              <a href="/admin"><span>Painel</span></a>
              <a href="/admin/contracts"><span>Contratos</span></a>
              <a href="/admin/assets"><span>Ativos</span></a>
              <a href="/admin/work-orders"><span>OS</span></a>
              <a href="/admin/measurements"><span>Medições</span></a>
              <a href="/admin/users"><span>Acessos</span></a>
              <a href="/admin/rgm"><span>RGM</span></a>
            </div>
            <div className="user-rail">
              {profile?.active && profile.tenant ? (
                <>
                  <a className="user-pill" href="/admin/users">
                    <span className="user-status" aria-hidden="true" />
                    <span className="user-pill-copy">
                      <span>{profile.name}</span>
                      <small>{roleLabels[profile.role]} - {profile.tenant.name}</small>
                    </span>
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
