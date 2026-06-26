"use client";

import { useState, useCallback } from "react";
import { Header } from "./Header";
import { BreadcrumbBar } from "./BreadcrumbBar";
import { Sidebar } from "./Sidebar";

type ClientShellProps = {
  logoutAction: (formData: FormData) => void | Promise<void>;
  user: {
    name: string;
    roleLabel: string;
    tenantName: string;
  } | null;
  children: React.ReactNode;
};

/**
 * Shell cliente que gerencia o estado de colapso da sidebar e
 * renderiza o layout com grid: sidebar + (header full-width + breadcrumb + conteúdo).
 * O Header fica em sticky no topo, ocupando toda a largura (grid-column: 1 / -1).
 */
export function ClientShell({ logoutAction, user, children }: ClientShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  return (
    <div className={`app-shell${collapsed ? " collapsed" : ""}`}>
      <Header
        logoutAction={logoutAction}
        user={user}
        collapsed={collapsed}
        onToggle={toggle}
      />

      <Sidebar collapsed={collapsed} />

      <div className="main-area">
        <BreadcrumbBar />
        {children}
      </div>
    </div>
  );
}
