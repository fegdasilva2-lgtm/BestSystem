"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

type HeaderUser = {
  name: string;
  roleLabel: string;
  tenantName: string;
};

type HeaderProps = {
  logoutAction: (formData: FormData) => void | Promise<void>;
  user: HeaderUser | null;
};

type MenuItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const menuItems: MenuItem[] = [
  {
    href: "/admin",
    label: "Painel",
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    )
  },
  {
    href: "/admin/contracts",
    label: "Contratos",
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 12h6M9 16h6M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    )
  },
  {
    href: "/admin/assets",
    label: "Ativos",
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2 2 7l10 5 10-5z" />
        <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
      </svg>
    )
  },
  {
    href: "/admin/work-orders",
    label: "OS",
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    )
  },
  {
    href: "/admin/measurements",
    label: "Medições",
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 3v18h18" />
        <rect x="7" y="12" width="3" height="6" />
        <rect x="13" y="8" width="3" height="10" />
      </svg>
    )
  },
  {
    href: "/admin/users",
    label: "Acessos",
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },
  {
    href: "/admin/rgm",
    label: "RGM",
    icon: (
      <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
      </svg>
    )
  }
];

function LogoutIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function Header({ logoutAction, user }: HeaderProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <header className="app-header">
        <div className="app-header-inner">
          <Link className="brand-area" href="/">
            <span className="brand-mark" aria-hidden="true">P</span>
            <span className="brand-text">
              <strong>PredialOps</strong>
              <small>Facilities Brasil</small>
            </span>
          </Link>

          <nav className="nav-desktop" aria-label="Módulos">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item.href) ? "active" : undefined}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
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
                  <button className="btn-logout btn-logout-desktop" type="submit">
                    <LogoutIcon />
                    Sair
                  </button>
                </form>
              </>
            ) : (
              <Link className="button-link primary" href="/login">Entrar</Link>
            )}
            <button
              className="btn-mobile"
              type="button"
              aria-label="Menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-navigation"
              onClick={() => setIsMenuOpen((open) => !open)}
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      <div className={`mobile-dropdown${isMenuOpen ? " open" : ""}`} id="mobile-navigation">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={isActive(item.href) ? "active" : undefined}
            aria-current={isActive(item.href) ? "page" : undefined}
            onClick={() => setIsMenuOpen(false)}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
        {user ? (
          <>
            <div className="mobile-divider" />
            <Link className="user-pill" href="/admin/users" onClick={() => setIsMenuOpen(false)}>
              <span className="user-dot" aria-hidden="true" />
              <span className="user-pill-copy">
                <span>{user.name}</span>
                <small>{user.roleLabel} - {user.tenantName}</small>
              </span>
            </Link>
            <form action={logoutAction}>
              <button className="btn-logout-item" type="submit">
                <LogoutIcon />
                Sair
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="mobile-divider" />
            <Link href="/login" onClick={() => setIsMenuOpen(false)}>Entrar</Link>
          </>
        )}
      </div>
    </>
  );
}
