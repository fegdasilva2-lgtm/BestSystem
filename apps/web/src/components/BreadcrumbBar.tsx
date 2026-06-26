"use client";

import { Breadcrumbs } from "./Breadcrumbs";

/**
 * Wrapper client que renderiza os breadcrumbs dentro de um container
 * com a mesma largura do .page-shell, abaixo do header.
 */
export function BreadcrumbBar() {
  return (
    <div className="breadcrumb-bar">
      <div className="breadcrumb-bar-inner">
        <Breadcrumbs />
      </div>
    </div>
  );
}
