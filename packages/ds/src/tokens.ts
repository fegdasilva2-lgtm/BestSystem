// Design tokens do PredialOps.
// Extraidos de apps/mobile/styles.css para consumo tanto pelo PWA
// (via CSS custom properties) quanto pela web Next.js (via Tailwind/CSS-in-JS).
//
// Direção estética: "Prancheta de obra" — a tela é uma prancha de desenho
// técnico onde cada artefato (contrato, OS, medição, RGM) é uma folha
// carimbada. Uma cor dominante (concrete/blueprint-ink), um único acento
// (safety — amarelo NR-23) e um vermelho só para erro/reprovado.

export const colors = {
  // Estrutura (dominantes)
  ink:           "#0B1F3A", // blueprint-ink — texto estrutural
  inkSoft:       "rgba(11, 31, 58, 0.68)",
  muted:         "rgba(11, 31, 58, 0.62)",
  concrete:      "#ECEAE4", // fundo dominante (~85% da tela)
  paper:         "#F4F2EC", // painel raised
  panel:         "#FAF9F4", // painel raised mais claro
  line:          "#C9C5BA", // hairline técnica
  lineSoft:      "rgba(11, 31, 58, 0.10)",
  blueprintInk:  "#0B1F3A",
  blueprintDeep: "#0F2545", // variação mais profunda para gradientes

  // ÚNICO acento — amarelo NR-23
  safety:        "#F2C12E",
  safetyDeep:    "#8A6500", // texto sobre claro (contraste AA)

  // Semânticos (sparingly)
  ok:            "#2F6B4F", // sucesso — verde-teal dessaturado
  warn:          "#8A6500", // aviso = safetyDeep (texto)
  warnWash:      "#FBE9A8", // aviso fundo
  danger:        "#C33024", // redline — só erro/reprovado
  dangerWash:    "rgba(195, 48, 36, 0.10)",
  okWash:        "rgba(47, 107, 79, 0.12)",
  inkWash:       "rgba(11, 31, 58, 0.08)", // substitui todos os *-wash antigos

  // Aliases legados (não usar em código novo)
  forest: "#0B1F3A",
  clay:   "#8A6500"
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
  soft:  "0 18px 50px rgba(11, 31, 58, 0.13)",
  sharp: "8px 8px 0 rgba(11, 31, 58, 0.12)"
} as const;

export const typography = {
  family: '"Inter Tight", "Segoe UI", sans-serif',
  display: '"Space Grotesk", "Segoe UI", sans-serif',
  mono:    '"JetBrains Mono", ui-monospace, monospace',
  sizes: {
    xs:  "12px",
    sm:  "13px",
    md:  "14px",
    lg:  "16px",
    xl:  "20px",
    xxl: "28px"
  }
} as const;

// Prioridades operacionais — paleta colapsada para 3 tons semânticos
export const priorityColors = {
  baixa:       colors.muted,       // neutro
  media:       colors.warn,        // amarelo
  alta:        colors.danger,      // vermelho
  emergencial: colors.danger       // vermelho (mais saturado no CSS)
} as const;

// Status de OS — 3 tons semânticos (neutro / amarelo / vermelho / verde-ok)
export const workOrderStatusColors = {
  rascunho:            colors.muted,
  planejada:           colors.warn,
  liberada:            colors.warn,
  atribuida:           colors.warn,
  aceita:              colors.warn,
  em_deslocamento:     colors.warn,
  em_execucao:         colors.warn,
  pausada:             colors.muted,
  aguardando_material: colors.muted,
  aguardando_cliente:  colors.muted,
  concluida_tecnico:   colors.ok,
  em_validacao:        colors.warn,
  aprovada:            colors.ok,
  encerrada:           colors.ok,
  cancelada:           colors.danger
} as const;
