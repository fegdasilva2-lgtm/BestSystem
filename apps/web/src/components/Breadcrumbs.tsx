"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

type Crumb = { label: string; href?: string };

/** Mapeia segmentos de URL para labels em português. */
function segmentLabel(seg: string): string {
  const map: Record<string, string> = {
    admin: "Painel",
    contracts: "Contratos",
    assets: "Ativos",
    sites: "Sites",
    customers: "Clientes",
    "work-orders": "OS",
    measurements: "Medições",
    pmoc: "PMOC",
    rgm: "RGM",
    users: "Acessos",
    import: "Importação",
    reports: "Relatórios",
    sla: "SLA",
    inventory: "Almoxarifado",
    portal: "Portal",
    login: "Entrar",
    setup: "Configuração",
    new: "Novo",
  };
  // Se for um UUID ou número, mostra "Detalhe"
  if (/^[0-9a-f-]{32,}$/.test(seg) || /^\d+$/.test(seg)) return "Detalhe";
  return map[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " ");
}

function buildCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [{ label: "Início" }];

  const crumbs: Crumb[] = [{ label: "Início", href: "/" }];
  let accumulated = "";
  for (const seg of segments) {
    accumulated += "/" + seg;
    crumbs.push({ label: segmentLabel(seg), href: accumulated });
  }
  // Último item não é link
  if (crumbs.length > 1) delete crumbs[crumbs.length - 1].href;
  return crumbs;
}

/**
 * Breadcrumbs globais. Mapeia a URL atual para uma trilha de navegação.
 * Renderizado apenas quando há mais de 1 item (não mostra "Início" sozinho).
 */
export function Breadcrumbs() {
  const pathname = usePathname();
  const crumbs = buildCrumbs(pathname);
  if (crumbs.length <= 1) return null;

  return (
    <nav className="breadcrumbs" aria-label="Trilha de navegação">
      {crumbs.map((c, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="breadcrumb-sep" aria-hidden="true">›</span>}
          {c.href ? (
            <Link href={c.href} className="breadcrumb-item">
              {c.label}
            </Link>
          ) : (
            <span className="breadcrumb-item current">{c.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
