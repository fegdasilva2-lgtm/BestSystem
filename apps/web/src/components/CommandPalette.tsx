"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCommandPalette } from "@/hooks/useCommandPalette";
import { canAccess, type UserRole } from "@/lib/rbac-matrix";

interface CommandItem {
  id: string;
  label: string;
  href: string;
  description?: string;
  category: "Operação" | "Qualidade" | "Admin" | "Ações";
  icon: string;
}

const CANDIDATES: CommandItem[] = [
  { id: "/admin", label: "Painel operacional", href: "/admin", description: "KPIs e visão geral do tenant", category: "Operação", icon: "◈" },
  { id: "/admin/contracts", label: "Contratos", href: "/admin/contracts", description: "Lista de contratos ativos", category: "Operação", icon: "📋" },
  { id: "/admin/contracts/new", label: "Novo contrato", href: "/admin/contracts/new", description: "Cadastrar novo contrato", category: "Operação", icon: "➕" },
  { id: "/admin/assets", label: "Ativos", href: "/admin/assets", description: "Equipamentos sob manutenção", category: "Operação", icon: "⚙" },
  { id: "/admin/assets/new", label: "Novo ativo", href: "/admin/assets/new", description: "Cadastrar equipamento", category: "Operação", icon: "➕" },
  { id: "/admin/work-orders", label: "Ordens de serviço", href: "/admin/work-orders", description: "Lista de OS", category: "Operação", icon: "🔧" },
  { id: "/admin/work-orders/new", label: "Nova OS", href: "/admin/work-orders/new", description: "Criar ordem de serviço", category: "Operação", icon: "➕" },
  { id: "/admin/measurements", label: "Medições", href: "/admin/measurements", description: "Fechamentos mensais", category: "Operação", icon: "📊" },
  { id: "/admin/measurements/new", label: "Nova medição", href: "/admin/measurements/new", description: "Cadastrar medição", category: "Operação", icon: "➕" },
  { id: "/admin/pmoc", label: "PMOC", href: "/admin/pmoc", description: "Plano de Manutenção", category: "Qualidade", icon: "📋" },
  { id: "/admin/sla", label: "SLA", href: "/admin/sla", description: "Níveis de atendimento", category: "Qualidade", icon: "⏱" },
  { id: "/admin/rgm", label: "RGM", href: "/admin/rgm", description: "Relatório de Gestão Mensal", category: "Qualidade", icon: "📄" },
  { id: "/admin/users", label: "Acessos", href: "/admin/users", description: "Gestão de usuários", category: "Admin", icon: "👥" },
  { id: "/admin/audit", label: "Auditoria", href: "/admin/audit", description: "Trilha de auditoria", category: "Admin", icon: "🔍" },
  { id: "/admin/import", label: "Importação em massa", href: "/admin/import", description: "Templates CSV", category: "Admin", icon: "📥" },
  { id: "/admin/reports", label: "Relatórios", href: "/admin/reports", description: "Visão executiva", category: "Operação", icon: "📈" },
  { id: "/admin/sobre", label: "Sobre o sistema", href: "/admin/sobre", description: "Roadmap e arquitetura", category: "Admin", icon: "ℹ" },
];

interface CommandPaletteProps {
  /** Role do usuario logado. Itens nao acessiveis ao role sao filtrados via rbac-matrix. */
  role?: UserRole;
}

/**
 * <CommandPalette> — busca + navegacao rapida (item B5 da Trilha C).
 *
 * Inspirado em Linear/Notion/Stripe Dashboards. Cmd+K (mac) ou
 * Ctrl+K (windows/linux) abre o modal. Filtragem case-insensitive por
 * label/descricao/categoria. Enter navega para o item selecionado.
 * Esc fecha.
 *
 * Items sao gerados a partir do role via rbac-matrix: so aparece
 * o que o usuario pode acessar.
 */
export function CommandPalette({ role }: CommandPaletteProps) {
  const { open, setOpen } = useCommandPalette();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const allItems = useMemo(() => {
    if (!role) return [];
    return CANDIDATES.filter((c) => canAccess(role, c.href));
  }, [role]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 8);
    const q = query.toLowerCase();
    return allItems
      .filter((it) =>
        it.label.toLowerCase().includes(q) ||
        it.description?.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [query, allItems]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) (el as HTMLElement).scrollIntoView({ block: "nearest" });
  }, [selectedIndex, open]);

  function navigate(href: string) {
    setOpen(false);
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = filtered[selectedIndex];
      if (target) navigate(target.href);
    }
  }

  if (!open) return null;

  return (
    <div
      className="command-palette-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Buscar ação ou página"
      onClick={() => setOpen(false)}
    >
      <div className="command-palette" onClick={(e) => e.stopPropagation()}>
        <div className="command-palette-search">
          <svg
            className="command-palette-search-icon"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            placeholder="Buscar ação ou página..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            className="command-palette-input"
            autoComplete="off"
            spellCheck={false}
            aria-label="Buscar"
            aria-controls="command-palette-list"
            aria-activedescendant={`command-item-${selectedIndex}`}
          />
          <kbd className="command-palette-kbd">esc</kbd>
        </div>

        <div ref={listRef} className="command-palette-list" id="command-palette-list" role="listbox">
          {filtered.length === 0 ? (
            <div className="command-palette-empty">
              <p>Nenhum resultado para &quot;{query}&quot;</p>
              <small>Tente outro termo ou navegue pela sidebar.</small>
            </div>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id}
                type="button"
                data-index={i}
                id={`command-item-${i}`}
                role="option"
                aria-selected={i === selectedIndex}
                className={`command-item${i === selectedIndex ? " selected" : ""}`}
                onClick={() => navigate(item.href)}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className="command-item-icon" aria-hidden="true">{item.icon}</span>
                <div className="command-item-content">
                  <strong>{item.label}</strong>
                  {item.description && <small>{item.description}</small>}
                </div>
                <span className="command-item-category">{item.category}</span>
              </button>
            ))
          )}
        </div>

        <div className="command-palette-footer">
          <span><kbd>↑↓</kbd> navegar</span>
          <span><kbd>↵</kbd> selecionar</span>
          <span><kbd>esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}