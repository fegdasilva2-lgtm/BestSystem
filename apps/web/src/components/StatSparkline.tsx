"use client";

interface StatSparklineProps {
  /** Serie de valores (numericos, >= 0). Minimo 2 pontos. */
  values: number[];
  /** Cor da linha + area (default = accent-color do pai). */
  color?: string;
  /** Largura em px (default 100, responsivo via viewBox). */
  width?: number;
  /** Altura em px (default 32). */
  height?: number;
  /** Mostrar area preenchida abaixo da linha (default true). */
  showArea?: boolean;
  /** aria-label descritivo para acessibilidade. */
  label?: string;
}

/**
 * Sparkline SVG minimalista para stat-cards.
 *
 * - viewBox fixo; escala calculada internamente (max = 100% da altura)
 * - area preenchida via gradient que respeita o accent-color do card
 * - aria-label descreve min/max/tendencia para leitores de tela
 * - sem dependencias externas, ~40 linhas de codigo
 */
export function StatSparkline({
  values,
  color,
  width = 100,
  height = 32,
  showArea = true,
  label,
}: StatSparklineProps) {
  if (!values || values.length < 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1; // evita div por zero
  const stepX = width / (values.length - 1);

  // Constroi pontos da polilinha
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - ((v - min) / range) * height;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  // Constroi path da area (fecha embaixo)
  const areaPath = `M0,${height} L${points.replace(/ /g, " L")} L${width},${height} Z`;

  // Calcula label descritivo
  const first = values[0];
  const last = values[values.length - 1];
  const trend = last > first ? "subindo" : last < first ? "descendo" : "estavel";
  const ariaLabel =
    label ??
    `Tendencia ${trend}: minimo ${min}, maximo ${max}, ultimo valor ${last}`;

  const stroke = color ?? "var(--accent-color, var(--color-blueprint-ink))";
  const gradientId = `spark-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      className="stat-sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={ariaLabel}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {showArea && <path d={areaPath} fill={`url(#${gradientId})`} />}
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}