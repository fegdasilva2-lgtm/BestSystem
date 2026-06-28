import type { ReactNode } from "react";

type BadgeVariant = "ok" | "warn" | "danger" | "muted" | "neutral";

interface BadgeProps {
  /** Texto exibido. */
  label: string;
  /** Variante visual (cor do fundo + texto + dot). */
  variant?: BadgeVariant;
  /** Mostra bolinha colorida antes do texto. Default true. */
  withDot?: boolean;
  /** Conteudo extra (ex: icone, contador) — aparece apos o label. */
  trailing?: ReactNode;
  /** Classe CSS adicional (ex: size-sm, size-lg). */
  className?: string;
}

/**
 * <Badge> — pílula semantica de status (item C6 da Trilha C).
 *
 * Padrao "dot + label" usado em dashboards modernos (Linear, Notion,
 * Stripe). A bolinha colorida e uma pista visual secundaria que
 * sobrevive a daltonismo (texto ainda carrega a cor semantica).
 *
 * Variantes (alinhadas com os tons de tokens):
 *  - ok: verde (aprovado, ativo, concluido)
 *  - warn: amarelo/amber (pendente, rascunho, media)
 *  - danger: vermelho (cancelado, rejeitado, alta)
 *  - muted: cinza neutro (enviado, agendado)
 *  - neutral: usa accent-color (laranja na identidade do produto)
 */
export function Badge({
  label,
  variant = "muted",
  withDot = true,
  trailing,
  className,
}: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className ?? ""}`}>
      {withDot && <span className="badge-dot" aria-hidden="true" />}
      <span className="badge-label">{label}</span>
      {trailing}
    </span>
  );
}