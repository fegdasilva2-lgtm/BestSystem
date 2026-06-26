import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Título (ex: "Nenhum contrato encontrado"). */
  title?: string;
  /** Descrição complementar. */
  description?: string;
  /** Ação primária (ex: botão "Novo contrato"). */
  action?: ReactNode;
  /** Ícone SVG inline opcional. Se omitido, usa default. */
  icon?: ReactNode;
}

function DefaultIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" aria-hidden="true" className="empty-state-icon">
      <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

/**
 * Estado vazio com ícone, título, descrição e slot para ação.
 * Usar em listas sem dados, buscas sem resultado, etc.
 */
export function EmptyState({
  title = "Nenhum registro encontrado",
  description = "Cadastre um novo registro ou ajuste os filtros da busca.",
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon-wrap">
        {icon ?? <DefaultIcon />}
      </div>
      <p className="eyebrow">{title}</p>
      {description && <p className="muted">{description}</p>}
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}
