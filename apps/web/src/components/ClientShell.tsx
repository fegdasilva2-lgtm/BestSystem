"use client";

import { useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { BreadcrumbBar } from "./BreadcrumbBar";
import { Sidebar } from "./Sidebar";
import { ToastProvider } from "./Toast";
import type { UserRole } from "@/lib/auth";

type ClientShellProps = {
  logoutAction: (formData: FormData) => void | Promise<void>;
  user: {
    name: string;
    roleLabel: string;
    role: UserRole;
    tenantName: string;
  } | null;
  children: React.ReactNode;
};

/**
 * Shell cliente que gerencia o estado de colapso da sidebar e o drawer
 * mobile. Renderiza o layout com grid: sidebar + (header full-width +
 * breadcrumb + conteudo). O Header fica sticky no topo, ocupando toda a
 * largura (grid-column: 1 / -1).
 *
 * Responsividade:
 *  - desktop (>=900px): sidebar colapsa/expande normalmente
 *  - mobile (<900px): sidebar vira drawer off-canvas controlado por
 *    `mobileOpen`; ao trocar de rota, drawer fecha automaticamente
 */
export function ClientShell({ logoutAction, user, children }: ClientShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);
  const toggleMobile = useCallback(() => setMobileOpen((o) => !o), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Fecha drawer ao trocar de rota (UX esperada em mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Trava scroll do body quando drawer esta aberto
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileOpen]);

  return (
    <ToastProvider>
      <div className={`app-shell${collapsed ? " collapsed" : ""}`}>
        <Header
          logoutAction={logoutAction}
          user={user}
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggle={toggleCollapsed}
          onMobileToggle={toggleMobile}
        />

        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onNavigate={closeMobile}
          role={user?.role}
        />

        {mobileOpen && (
          <button
            type="button"
            className="sidebar-overlay"
            aria-label="Fechar menu"
            onClick={closeMobile}
          />
        )}

        <div className="main-area">
          <BreadcrumbBar />
          {children}
        </div>
      </div>
    </ToastProvider>
  );
}
