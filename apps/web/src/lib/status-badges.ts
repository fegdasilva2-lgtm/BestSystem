/**
 * Mapeamento semântico de status → classe CSS.
 *
 * Cores:
 *  - ok (verde):   concluído, aprovado, ativo
 *  - warn (amarelo): pendente, em andamento, rascunho
 *  - danger (vermelho): cancelado, rejeitado, encerrado
 *  - muted (cinza):   neutro / fallback
 */

type BadgeVariant = "ok" | "warn" | "danger" | "muted";

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  // Contratos
  active: "ok",
  draft: "warn",
  suspended: "warn",
  terminated: "danger",

  // Work orders
  rascunho: "warn",
  planejada: "warn",
  liberada: "warn",
  atribuida: "warn",
  aceita: "warn",
  em_deslocamento: "warn",
  em_execucao: "warn",
  pausada: "muted",
  aguardando_material: "warn",
  aguardando_cliente: "warn",
  concluida_tecnico: "ok",
  em_validacao: "warn",
  aprovada: "ok",
  encerrada: "ok",
  cancelada: "danger",

  // Medições
  pre_enviada: "warn",
  em_aceite: "warn",
  contestada: "warn",
  faturada: "ok",
  paga: "ok",

  // Ativos
  operacional: "ok",
  parado: "warn",
  manutencao: "warn",
  desativado: "danger",

  // Tenants
  piloto: "warn",
  ativo: "ok",
  implantacao: "warn",
};

const VARIANT_CLASS: Record<BadgeVariant, string> = {
  ok: "badge-ok",
  warn: "badge-warn",
  danger: "badge-danger",
  muted: "badge-muted",
};

/**
 * Retorna a classe CSS para o badge de status.
 * Formato: "status-badge badge-ok" ou "status-badge badge-warn", etc.
 */
export function getStatusBadgeClass(status: string): string {
  const variant = STATUS_VARIANT[status] ?? "muted";
  return `status-badge ${VARIANT_CLASS[variant]}`;
}

/**
 * Retorna a label de exibição para o status (substitui underscores por espaços).
 */
export function formatStatusLabel(status: string): string {
  return status.replace(/_/g, " ");
}
