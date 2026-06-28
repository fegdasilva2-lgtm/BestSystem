"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { canAccess, type UserRole } from "@/lib/rbac-matrix";

// ── Tipos ──

export interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

export interface SidebarItem {
  href: string;
  label: string;
  icon: ReactNode;
}

// ── Ícones SVG inline ──

function PanelIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ContractsIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 12h6M9 16h6M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function AssetsIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 2 7l10 5 10-5z" />
      <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
    </svg>
  );
}

function WoIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function MeasurementsIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 3v18h18" />
      <rect x="7" y="12" width="3" height="6" />
      <rect x="13" y="8" width="3" height="10" />
    </svg>
  );
}

function PmocIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  );
}

function SlaIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function RgmIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// ── Seções fixas ──

const sections: SidebarSection[] = [
  {
    label: "Operação",
    items: [
      { href: "/admin", label: "Painel", icon: <PanelIcon /> },
      { href: "/admin/contracts", label: "Contratos", icon: <ContractsIcon /> },
      { href: "/admin/assets", label: "Ativos", icon: <AssetsIcon /> },
      { href: "/admin/work-orders", label: "OS", icon: <WoIcon /> },
      { href: "/admin/measurements", label: "Medições", icon: <MeasurementsIcon /> },
    ],
  },
  {
    label: "Qualidade",
    items: [
      { href: "/admin/pmoc", label: "PMOC", icon: <PmocIcon /> },
      { href: "/admin/sla", label: "SLA", icon: <SlaIcon /> },
      { href: "/admin/rgm", label: "RGM", icon: <RgmIcon /> },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/admin/users", label: "Acessos", icon: <UsersIcon /> },
      { href: "/admin/audit", label: "Auditoria", icon: <AuditIcon /> },
      { href: "/admin/import", label: "Importação", icon: <ImportIcon /> },
    ],
  },
];

// ── Componente ──

interface SidebarProps {
  collapsed: boolean;
  mobileOpen?: boolean;
  onNavigate?: () => void;
  role?: UserRole;
}

/**
 * Sidebar filtra todos os itens usando canAccess() da matriz RBAC.
 * Quando `role` nao e fornecido (sessao publica) a sidebar nao renderiza.
 * Secoes que ficarem vazias apos o filtro sao omitidas para nao exibir
 * cabecalhos orfaos.
 *
 * Em mobile (<900px via CSS) a sidebar vira drawer off-canvas controlado
 * por `mobileOpen`. Cada clique em um link dispara `onNavigate` para o
 * ClientShell fechar o drawer.
 */
export function Sidebar({ collapsed, mobileOpen, onNavigate, role }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href + "/") || pathname === href;
  };

  if (!role) return null;

  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccess(role, item.href))
    }))
    .filter((section) => section.items.length > 0);

  const className = [
    "sidebar",
    collapsed ? "collapsed" : "",
    mobileOpen ? "mobile-open" : ""
  ].filter(Boolean).join(" ");

  return (
    <nav
      className={className}
      aria-label="Navegação principal"
      aria-hidden={mobileOpen === false ? undefined : !mobileOpen}
    >
      {visibleSections.map((section) => (
        <div key={section.label}>
          <div className="sidebar-section-label">{section.label}</div>
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-item${isActive(item.href) ? " active" : ""}`}
              aria-current={isActive(item.href) ? "page" : undefined}
              onClick={onNavigate}
            >
              {item.icon}
              <span className="sidebar-item-label">{item.label}</span>
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
