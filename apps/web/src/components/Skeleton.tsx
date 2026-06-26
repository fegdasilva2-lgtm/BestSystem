/**
 * Componentes de esqueleto (skeleton) para loading states.
 * Animação de shimmer sutil — gradiente animado sobre fundo neutro.
 */

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  /** Bordas arredondadas: "sm" | "md" | "full" */
  radius?: "sm" | "md" | "full";
  className?: string;
}

export function Skeleton({ width = "100%", height = 16, radius = "sm", className }: SkeletonProps) {
  return (
    <div
      className={`skeleton skeleton-radius-${radius} ${className ?? ""}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/** Linha de texto simulada. */
export function SkeletonLine({ width = "100%" }: { width?: string | number }) {
  return <Skeleton width={width} height={13} radius="full" />;
}

/** Bloco de texto com múltiplas linhas. */
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  const widths = ["100%", "92%", "78%", "85%", "60%"];
  return (
    <div className="skeleton-text" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={widths[i % widths.length]} />
      ))}
    </div>
  );
}

/** Card esqueleto (para KPI cards, glass-cards, etc.). */
export function SkeletonCard({ height = 140 }: { height?: number }) {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <Skeleton width="40%" height={12} radius="full" />
      <Skeleton width="30%" height={28} radius="sm" />
      <Skeleton width="70%" height={12} radius="full" />
    </div>
  );
}

/** Tabela esqueleto. */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="table-card" aria-hidden="true">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i}><Skeleton width="60%" height={12} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c}><Skeleton width={`${40 + Math.random() * 40}%`} height={11} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
