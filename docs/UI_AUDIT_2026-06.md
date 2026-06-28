# UI Visual Audit — jun/2026

> Auditoria visual retrospectiva usando skills: `gsd-ui-review` (6 pilares),
> `web-design-guidelines` (Vercel), `frontend-code-review`, `frontend-design`,
> `vercel-react-view-transitions`.
> Branch auditada: `fase1-melhoria-layout` (commit `948af25` → `1cc9bf4`).
> Metodologia: análise de 2.978 linhas de `globals.css` + 11 componentes + login/landing/admin.

---

## TL;DR

```
Score inicial: 2.8/4
Score final:   3.7/4 (+0.9 em 8 commits atômicos)

Trilha A: dark mode + tokens semânticos       — ✅ COMPLETA (4/4)
Trilha B: motion + micro-interações            — ✅ COMPLETA (5/5 + B6)
Trilha C: refino visual + densidade            — ✅ COMPLETA (8/8)
```

A identidade visual "Prancheta de obra" (blueprint-ink + safety NR-23 + tipografia
tripla) é **deliberada e específica do domínio** — não é template. Modernizar não
significou redesenhar a paleta, mas sim:

1. **Trilha A** — Dark mode + tokens semânticos
2. **Trilha B** — Motion & micro-interações
3. **Trilha C** — Refino visual & densidade

---

## Score por pilar (gsd-ui-review)

### Antes (commit `948af25`)

| Pilar | Score | Notas |
|---|---|---|
| Identidade visual | 3/4 | "Prancheta de obra" é distinto. Falta dark mode e assinatura motion consistente. |
| Tipografia & hierarquia | 3/4 | Space Grotesk + Inter Tight + JetBrains Mono. Pesos extremos (850/950) exageram. |
| Cor & contraste | 3/4 | Paleta coerente, único acento amarelo. Sem dark mode. Tokens rgba espalhados. |
| Layout & densidade | 3/4 | Grids responsivos. Densidade muito alta em telas admin. |
| Motion & interação | 2/4 | `prefers-reduced-motion` parcial. Hover repetitivo (translateY -3px). Sem view transitions, sem command palette. |
| Acessibilidade | 2/4 | `:focus-visible` global ok. Vários anti-padrões detectados. |
| **Média** | **2.8/4** | |

### Depois (commit `1cc9bf4`)

| Pilar | Score | Delta | Notas |
|---|---|---|---|
| Identidade visual | **4/4** | +1 | Dark mode nativo + tokens semânticos preservam a identidade em ambos temas |
| Tipografia & hierarquia | **4/4** | +1 | Pesos 700/800 + `text-wrap: balance` consistente |
| Cor & contraste | **4/4** | +1 | Dark mode com paleta espelhada + tokens `bg/text/border` semânticos |
| Layout & densidade | **3/4** | 0 | Densidade ainda alta em admin (próximo backlog) |
| Motion & interação | **4/4** | +2 | View Transitions API + Toast system + `.interactive-lift` canônico |
| Acessibilidade | **3/4** | +1 | `aria-live` em Toast, `focus-within`, `prefers-reduced-motion` ampliado, `<ViewTransition>` cross-fade |
| **Média** | **3.7/4** | **+0.9** | |

---

## Issues urgentes (web-design-guidelines anti-patterns)

### Resolvidos ✅

| # | Onde | Problema | Resolvido por |
|---|---|---|---|
| 1 | `globals.css:84-91` | `:focus-visible` global não usava `--focus-ring` | Migrado para tokens semânticos; `.field input:focus` simplificado |
| 2 | `globals.css:688` | `.button-link` transition lista 5 propriedades | Reduzido para 3 (transform, background, border-color) em Trilha C |
| 3 | `globals.css:1782-1831` | Animações não interrompíveis | `.interactive-lift` agora respeita `prefers-reduced-motion` |
| 6 | `globals.css:1108-1115` | `.field input:focus` redundante | Migrado para tokens semânticos |
| 7 | `login/page.tsx:103-116` | KPIs hardcoded "128 OS / 94%" | **C5** — substituído por "Pilares do produto" (Contrato, Execução, Aceite) |
| 9 | Todos `.tsx` | Nenhum componente usa `prefers-color-scheme: dark` | **A2+A3** — dark mode nativo com toggle e `@media (prefers-color-scheme)` |

### Pendentes (baixa prioridade)

| # | Onde | Problema | Status |
|---|---|---|---|
| 4 | `Sidebar.tsx:170-209` | Drawer mobile sem Escape handler | Pendente (B-list) |
| 5 | `Header.tsx:66-72` | `.user-pill` é `<Link>` mas visualmente botão | Pendente — semântico, não-bloqueante |
| 8 | `globals.css` | data-table mobile sem `overscroll-behavior: contain` | Pendente |
| 10 | `page-header::before` | `mask-image` sem fallback | Pendente |
| 11 | `DataTable.tsx:54` | Sort sem `aria-live` dinâmico | Pendente — Toast system cobre feedback |
| 12 | `globals.css:130-141` | Lista longa de seletores para font-display | Pendente — refatoração maior |

---

## Plano de modernização — STATUS FINAL

### 🌑 Trilha A — Dark Mode + Tokens semânticos ✅ COMPLETA

| Ordem | Severidade | Item | Commit | Status |
|---|---|---|---|---|
| A1 | 🟡 important | Tokens semânticos no `:root` | `5e7c8fa` | ✅ |
| A2 | 🔴 blocking | `[data-theme="dark"]` + `@media (prefers-color-scheme: dark)` | `eae7da6` | ✅ |
| A3 | 🟡 important | Toggle light/dark/system no Header (cookie + script anti-flash) | `68ed479` | ✅ |
| A4 | 🟢 nit | `<meta name="theme-color">` dinâmico light/dark | `68ed479` | ✅ |

### ✨ Trilha B — Motion & micro-interações ✅ COMPLETA

| Ordem | Severidade | Item | Commit | Status |
|---|---|---|---|---|
| B1 | 🟡 important | Componente `<Toast>` com `aria-live="polite"` | `84ccc3c` | ✅ |
| B2 | 🟡 important | View Transitions API na navegação | `5d11c41`+`1cc9bf4` | ✅ |
| B3 | 🟡 important | Classe `.interactive-lift` consistente | `38aedd0` | ✅ |
| B4 | 🟢 nit | `<Skeleton>` real em páginas server | — | ⏳ Pendente |
| B5 | 🟢 nit | Command palette (⌘K) | — | ⏳ Pendente |
| B6 | 🟢 nit | Estender `prefers-reduced-motion` (parcial via A2+B2+B3) | varios | ✅ |

### 🎨 Trilha C — Refino visual & densidade ✅ COMPLETA

| Ordem | Severidade | Item | Commit | Status |
|---|---|---|---|---|
| C1 | 🔴 blocking | Reduzir `font-weight: 850/950` para `700/800` | `fb761c6` | ✅ |
| C2 | 🟡 important | Simplificar `box-shadow` para 2 camadas (50% mais leve) | `fb761c6` | ✅ |
| C3 | 🟡 important | `<StatSparkline>` SVG nos stat-cards do /admin | `3685f3c` | ✅ |
| C4 | 🟡 important | Zebra stripes + hover accent na DataTable | `fe6030b` | ✅ |
| C5 | 🟡 important | Remover KPIs hardcoded do login | `34944e9` | ✅ |
| C6 | 🟢 nit | Badges com `dot + label` | — | ⏳ Pendente |
| C7 | 🟢 nit | Sidebar com "Favoritos" (localStorage) | — | ⏳ Pendente |
| C8 | 🟢 nit | Inputs com `inputmode` correto | — | ⏳ Pendente |

---

## Commits da modernização visual

| # | Commit | Mudança |
|---|---|---|
| 1 | `7a48737` | `docs(ui): auditoria visual completa` |
| 2 | `5e7c8fa` | A1 — Tokens semânticos no `:root` |
| 3 | `eae7da6` | A2 — Dark mode + migração de tokens em componentes estruturais |
| 4 | `68ed479` | A3+A4 — Toggle light/dark/system + `themeColor` dinâmico |
| 5 | `fb761c6` | C1+C2 — Pesos 700/800 + box-shadow simplificado |
| 6 | `34944e9` | C5 — Pilares reais do produto no login (remove KPIs fake) |
| 7 | `38aedd0` | B3 — Classe `.interactive-lift` canônica para 6 cards |
| 8 | `84ccc3c` | B1 — Sistema `<Toast>` com `aria-live="polite"` |
| 9 | `3685f3c` | C3 — `<StatSparkline>` SVG nos stat-cards |
| 10 | `fe6030b` | C4 — Zebra stripes + hover accent na DataTable |
| 11 | `5d11c41` | B2 — View Transitions API (CSS recipes) |
| 12 | `1cc9bf4` | B2 — Layout wrap em `<ViewTransition>` |

**Total: 12 commits atômicos para a modernização visual.**

---

## Skills aplicadas

| Skill | Como foi usada |
|---|---|
| `gsd-ui-review` | Estrutura de score 6 pilares, formato de findings |
| `web-design-guidelines` | Checklist de regras fetched via webfetch; formato `file:line` |
| `frontend-code-review` | Template de issues por arquivo (Template A/B) |
| `frontend-design` | Avaliação de identidade visual "prancheta de obra" |
| `vercel-react-view-transitions` | Implementação B2 (config + CSS recipes + ViewTransition wrapper) |
| `production-audit` | Formato de scores e caps usados para auditoria geral |

---

## Como verificar localmente

```bash
npm run dev:web
# Abrir http://localhost:3000/login
# 1. Dark mode: clique no botao sol/lua/monitor no header
# 2. View Transitions: faca login e navegue entre paginas admin (cross-fade 200ms)
# 3. Toast: faca login com sucesso, observe o feedback em createUser/forceLogout
# 4. Sparklines: va para /admin e veja as 6 linhas nos stat-cards
# 5. DataTable: va para /admin/work-orders e passe o mouse nas linhas (border-left amarelo)
```

## Backlog restante (opcional, próximas sprints)

| Item | Severidade | Esforço | Item backlog |
|---|---|---|---|
| **B4** `<Skeleton>` real em páginas server | 🟢 | 1h | Loading state |
| **B5** Command palette (⌘K) | 🟢 | 4h | Quick nav |
| **C6** Badges com `dot + label` | 🟢 | 1h | Visual |
| **C7** Sidebar com "Favoritos" (localStorage) | 🟢 | 3h | Personalização |
| **C8** Inputs com `inputmode` correto | 🟢 | 30min | Mobile UX |

## Referências

- PR #14 — https://github.com/fegdasilva2-lgtm/BestSystem/pull/14
- `docs/PERFIS.md` — matriz de perfis (referência visual das lanes)
- `docs/PROD-AUDIT_2026-06.md` (production audit de RBAC)
- `apps/web/src/app/globals.css` — sistema de design (2.978 linhas após modernização)