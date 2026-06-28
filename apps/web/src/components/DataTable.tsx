"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { EmptyState } from "./EmptyState";

// ── Tipos ──

export interface DataTableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  /** Renderização customizada da célula. Se omitido, renderiza o valor bruto. */
  render?: (row: T, value: unknown) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T = Record<string, unknown>> {
  columns: DataTableColumn<T>[];
  rows: T[];
  /** Chave única por linha (ex: "id"). */
  rowKey?: string;
  /** Página atual (1-indexed). */
  page?: number;
  /** Total de páginas. Se > 1, mostra paginação. */
  totalPages?: number;
  /** URL base para links de paginação (ex: "/admin/contracts"). */
  baseUrl?: string;
  /** Parâmetros de busca atuais para preservar nos links de paginação. */
  searchParams?: Record<string, string>;
  /** Renderiza quando rows está vazio. */
  emptyState?: React.ReactNode;
}

type SortDir = "asc" | "desc" | null;

// ── Componente ──

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  rowKey = "id",
  page,
  totalPages,
  baseUrl,
  searchParams = {},
  emptyState,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  // Sort client-side
  const sortedRows = useMemo(() => {
    if (!sortKey || !sortDir) return rows;
    return [...rows].sort((a, b) => {
      const va = a[sortKey] ?? "";
      const vb = b[sortKey] ?? "";
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "pt-BR", { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, sortKey, sortDir]);

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  const sortIndicator = (key: string): string => {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ▲" : sortDir === "desc" ? " ▼" : "";
  };

  // Paginação
  const showPagination = page && totalPages && totalPages > 1;

  const pageLink = (p: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(p));
    return `${baseUrl ?? ""}?${params.toString()}`;
  };

  return (
    <div className="table-card">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={
                    col.sortable ? "data-table-sort" : ""
                  }
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    sortKey === col.key
                      ? sortDir === "asc"
                        ? "ascending"
                        : sortDir === "desc"
                        ? "descending"
                        : undefined
                      : undefined
                  }
                >
                  {col.label}
                  {col.sortable && (
                    <span className="sort-indicator" aria-hidden="true">
                      {sortIndicator(col.key)}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  {emptyState ?? (
                    <EmptyState
                      title="Nenhum registro encontrado"
                      description="Ajuste os filtros da busca ou cadastre um novo registro."
                    />
                  )}
                </td>
              </tr>
            ) : (
              sortedRows.map((row) => (
                <tr key={String(row[rowKey] ?? Math.random())}>
                  {columns.map((col) => (
                    <td key={col.key} className={col.className}>
                      {col.render
                        ? col.render(row, row[col.key])
                        : String(row[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {showPagination && (
        <nav className="data-table-pagination" aria-label="Paginação da tabela">
          {page > 1 ? (
            <Link href={pageLink(page - 1)} className="page-btn">
              Anterior
            </Link>
          ) : (
            <span className="page-btn disabled">Anterior</span>
          )}

          <span className="page-info">
            {page} de {totalPages}
          </span>

          {page < totalPages ? (
            <Link href={pageLink(page + 1)} className="page-btn">
              Próximo
            </Link>
          ) : (
            <span className="page-btn disabled">Próximo</span>
          )}
        </nav>
      )}
    </div>
  );
}
