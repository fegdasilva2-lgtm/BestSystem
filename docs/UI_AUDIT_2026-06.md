# UI Visual Audit — jun/2026

> Auditoria visual retrospectiva usando skills: `gsd-ui-review` (6 pilares),
> `web-design-guidelines` (Vercel), `frontend-code-review`, `frontend-design`.
> Branch auditada: `fase1-melhoria-layout` (commit `948af25`).
> Metodologia: análise de 2.556 linhas de `globals.css` + 9 componentes + login/landing/admin.

---

## TL;DR

```
Score médio atual: 2.8/4
Target após Trilhas A+B+C: 3.6/4
```

A identidade visual "Prancheta de obra" (blueprint-ink + safety NR-23 + tipografia
tripla) é **deliberada e específica do domínio** — não é template. Modernizar não
significa redesenhar a paleta, mas sim:

1. **Trilha A** — Dark mode + tokens semânticos
2. **Trilha B** — Motion & micro-interações
3. **Trilha C** — Refino visual & densidade

---

## Score por pilar (gsd-ui-review)

| Pilar | Score | Notas |
|---|---|---|
| Identidade visual | 3/4 | "Prancheta de obra" é distinto. Falta dark mode e assinatura motion consistente. |
| Tipografia & hierarquia | 3/4 | Space Grotesk + Inter Tight + JetBrains Mono. Pesos extremos (850/950) exageram. |
| Cor & contraste | 3/4 | Paleta coerente, único acento amarelo. Sem dark mode. Tokens rgba espalhados. |
| Layout & densidade | 3/4 | Grids responsivos. Densidade muito alta em telas admin. |
| Motion & interação | 2/4 | `prefers-reduced-motion` parcial. Hover repetitivo (translateY -3px). Sem view transitions, sem command palette. |
| Acessibilidade | 2/4 | `:focus-visible` global ok. Vários anti-padrões detectados. |

---

## Issues urgentes (web-design-guidelines anti-patterns)

| # | Onde | Problema |
|---|---|---|
| 1 | `globals.css:84-91` | `:focus-visible` global não usa `--focus-ring` (inconsistente com `.field input:focus`) |
| 2 | `globals.css:688` | `.button-link` transition lista 5 propriedades (caro) |
| 3 | `globals.css:1782-1831` | Animações não interrompíveis (sem animation-cancel) |
| 4 | `Sidebar.tsx:170-209` | Drawer mobile sem Escape handler nem `inert` |
| 5 | `Header.tsx:66-72` | `.user-pill` é `<Link>` mas visualmente parece botão |
| 6 | `globals.css:1108-1115` | `.field input:focus` redundante com focus-visible global |
| 7 | `login/page.tsx:103-116` | KPIs hardcoded "128 OS / 94%" (lied visual) |
| 8 | `globals.css:2415-2418` | data-table mobile sem `overscroll-behavior: contain` |
| 9 | Todos `.tsx` | Nenhum componente usa `prefers-color-scheme: dark` |
| 10 | `page-header::before` | `mask-image` sem fallback (vira overlay sólido) |
| 11 | `DataTable.tsx:54-62` | Sort client-side sem `aria-live` dinâmico |
| 12 | `globals.css:130-141` | Lista longa de seletores para font-display (deveria ser classe) |

---

## Plano de modernização

### 🌑 Trilha A — Dark Mode + Tokens semânticos

| Ordem | Severidade | Ação |
|---|---|---|
| A1 | 🟡 important | Refatorar `:root` para tokens semânticos (`--bg-canvas`, `--bg-panel`, `--text-primary`, `--text-muted`, `--border-default`, `--border-subtle`, `--accent`) |
| A2 | 🔴 blocking | `[data-theme="dark"]` com paleta espelhada |
| A3 | 🟡 important | Toggle no Header persistido em `localStorage` + cookie |
| A4 | 🟢 nit | `<meta name="theme-color">` dinâmico |

### ✨ Trilha B — Motion & micro-interações

| Ordem | Severidade | Ação |
|---|---|---|
| B1 | 🟡 important | Componente `<Toast>` com `aria-live="polite"` |
| B2 | 🟡 important | `View Transitions API` na navegação sidebar |
| B3 | 🟡 important | Classe `.interactive-lift` consistente |
| B4 | 🟢 nit | `<Skeleton>` real em páginas server |
| B5 | 🟢 nit | Command palette (⌘K) |
| B6 | 🟢 nit | Estender `prefers-reduced-motion` |

### 🎨 Trilha C — Refino visual & densidade

| Ordem | Severidade | Ação |
|---|---|---|
| C1 | 🔴 blocking | Reduzir `font-weight: 850/950` para `700/800` |
| C2 | 🟡 important | Simplificar `box-shadow` para 2 camadas |
| C3 | 🟡 important | Sparkline mini nos KPI cards |
| C4 | 🟡 important | Zebra stripes + hover accent na DataTable |
| C5 | 🟡 important | Remover KPIs hardcoded do login (issue #7) |
| C6 | 🟢 nit | Badges com `dot + label` |
| C7 | 🟢 nit | Sidebar com "Favoritos" |
| C8 | 🟢 nit | Inputs com `inputmode` correto |

---

## Web Interface Guidelines — findings por arquivo

```
## apps/web/src/app/globals.css

globals.css:84-91   - focus-visible global inconsistente com .field input:focus
globals.css:130-141 - lista longa de seletores p/ font-display → extrair classe
globals.css:1782-1831 - animações não interrompíveis
globals.css:2198    - prefers-reduced-motion só cobre skeleton
globals.css:2415-2418 - data-table mobile sem overscroll-behavior: contain
globals.css:1108    - outline: none sem focus replacement consistente

## apps/web/src/components/Sidebar.tsx

Sidebar.tsx:170-209 - drawer mobile sem keydown handler para Escape
Sidebar.tsx:180     - sem inert nos elementos atrás quando drawer aberto

## apps/web/src/components/Header.tsx

Header.tsx:66-72    - user-pill é <Link> mas visualmente é botão
Header.tsx:81       - hamburger-btn sem aria-expanded (parcial)

## apps/web/src/components/DataTable.tsx

DataTable.tsx:54    - sort client-side sem aria-live

## apps/web/src/app/login/page.tsx

login/page.tsx:103-116 - KPIs hardcoded sem fonte de dados
login/page.tsx:131-134 - "..." → "…" (ellipsis correto)
```

---

## Skills aplicadas

- `gsd-ui-review` — score 6 pilares
- `web-design-guidelines` — checklist de regras (fetch via webfetch)
- `frontend-code-review` — template de issues por arquivo
- `frontend-design` — avaliação de identidade visual

## Referências

- PR #14 — https://github.com/fegdasilva2-lgtm/BestSystem/pull/14
- `docs/PERFIS.md` — matriz de perfis (referência visual das lanes)
- `apps/web/src/app/globals.css` — sistema de design (2.556 linhas)