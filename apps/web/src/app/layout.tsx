import type { Metadata, Viewport } from "next";
import { ViewTransition } from "react";
import { Space_Grotesk, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { logout } from "@/app/auth/actions";
import { ClientShell } from "@/components/ClientShell";
import { ThemeScript } from "@/components/ThemeScript";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: colors.blueprintInk },
    { media: "(prefers-color-scheme: dark)", color: "#0d1117" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();

  return (
    <html
      lang="pt-BR"
      className={`${spaceGrotesk.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body>
        <ViewTransition default="auto">
          <ClientShell
            logoutAction={logout}
            user={
              profile?.active && profile.tenant
                ? {
                    name: profile.name,
                    roleLabel: roleLabels[profile.role],
                    role: profile.role,
                    tenantName: profile.tenant.name
                  }
                : null
            }
          >
            {children}
          </ClientShell>
        </ViewTransition>
      </body>
    </html>
  );
}
