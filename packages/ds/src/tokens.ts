// Design tokens do PredialOps.
// Extraidos de apps/mobile/styles.css para consumo tanto pelo PWA
// (via CSS custom properties) quanto pela web Next.js (via Tailwind/CSS-in-JS).

export const colors = {
  ink:    "#1e2522",
  muted:  "#67736f",
  paper:  "#f4f2ea",
  panel:  "#fffdf7",
  line:   "#d8d2c2",
  forest: "#18332f",
  moss:   "#6d8b68",
  clay:   "#d65f3c",
  amber:  "#bf8a2f",
  steel:  "#5d7280",
  ok:     "#2e7d5b",
  danger: "#b84231"
} as const;

export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  xxl: "32px"
} as const;

export const radius = {
  sm: "4px",
  md: "8px",
  lg: "12px"
} as const;

export const shadow = {
  soft: "0 18px 50px rgba(24, 51, 47, 0.13)",
  sharp: "8px 8px 0 rgba(24, 51, 47, 0.12)"
} as const;

export const typography = {
  family: '"Aptos", "Segoe UI", sans-serif',
  sizes: {
    xs:  "12px",
    sm:  "13px",
    md:  "14px",
    lg:  "16px",
    xl:  "20px",
    xxl: "28px"
  }
} as const;

// Prioridades operacionais
export const priorityColors = {
  baixa:   colors.ok,
  media:   colors.amber,
  alta:    colors.clay,
  critica: colors.danger
} as const;

// Status de OS
export const workOrderStatusColors = {
  rascunho:             colors.steel,
  planejada:            colors.amber,
  liberada:             colors.amber,
  atribuida:            colors.amber,
  aceita:               colors.amber,
  em_deslocamento:      colors.amber,
  em_execucao:          colors.clay,
  pausada:              colors.steel,
  aguardando_material:  colors.steel,
  aguardando_cliente:   colors.steel,
  concluida_tecnico:    colors.ok,
  em_validacao:         colors.amber,
  aprovada:             colors.ok,
  encerrada:            colors.ok,
  cancelada:            colors.danger
} as const;
