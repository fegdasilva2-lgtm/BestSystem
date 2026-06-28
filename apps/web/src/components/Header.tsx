"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

type HeaderUser = {
  name: string;
  roleLabel: string;
  tenantName: string;
};

type HeaderProps = {
  logoutAction: (formData: FormData) => void | Promise<void>;
  user: HeaderUser | null;
  collapsed?: boolean;
  mobileOpen?: boolean;
  onToggle?: () => void;
  onMobileToggle?: () => void;
};

function LogoutIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function SidebarToggleIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function Header({
  logoutAction,
  user,
  collapsed,
  mobileOpen,
  onToggle,
  onMobileToggle,
}: HeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <div className="header-left">
          {/* Botao hamburger — visivel apenas em mobile via CSS */}
          {onMobileToggle && (
            <button
              className="hamburger-btn"
              type="button"
              aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
              aria-expanded={mobileOpen}
              onClick={onMobileToggle}
            >
              <HamburgerIcon />
            </button>
          )}
          {/* Botao de colapsar — visivel apenas em desktop via CSS */}
          {onToggle && (
            <button
              className="sidebar-toggle-btn"
              type="button"
              aria-label={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
              onClick={onToggle}
            >
              <SidebarToggleIcon />
            </button>
          )}
          <Link className="brand-area" href="/">
            <span className="brand-mark" aria-hidden="true">P</span>
            <span className="brand-text">
              <strong>PredialOps</strong>
              <small>Facilities Brasil</small>
            </span>
          </Link>
        </div>

        <div className="header-actions">
          <ThemeToggle />
          {user ? (
            <>
              <Link className="user-pill" href="/admin/users">
                <span className="user-dot" aria-hidden="true" />
                <span className="user-pill-copy">
                  <span>{user.name}</span>
                  <small>{user.roleLabel} - {user.tenantName}</small>
                </span>
              </Link>
              <form action={logoutAction}>
                <button className="btn-logout" type="submit">
                  <LogoutIcon />
                  Sair
                </button>
              </form>
            </>
          ) : (
            <Link className="button-link primary" href="/login">Entrar</Link>
          )}
        </div>
      </div>
    </header>
  );
}
