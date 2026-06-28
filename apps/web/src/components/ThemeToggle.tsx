"use client";

import { useState, useEffect, useCallback } from "react";
import { setTheme } from "@/app/theme/actions";

type Theme = "light" | "dark" | "system";

/**
 * Botao de toggle de tema (light/dark).
 *
 * Estrategia anti-flash:
 * 1. Layout le cookie no SSR e seta data-theme no <html>
 * 2. Script inline no <head> (ThemeScript) aplica antes da hidratacao
 * 3. Este componente le o estado inicial do <html> e sincroniza via action
 *
 * Para "system": segue prefers-color-scheme; nao seta data-theme (deixa
 * o CSS @media aplicar automaticamente).
 */
export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Le o estado atual do <html data-theme>
    const current = (document.documentElement.getAttribute("data-theme") as Theme | null) ?? "system";
    setThemeState(current);
  }, []);

  const cycle = useCallback(async () => {
    // Ciclo: system -> light -> dark -> system
    const next: Theme = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
    setThemeState(next);
    await setTheme(next);
    // Atualiza o DOM imediatamente para feedback instantaneo
    applyTheme(next);
  }, [theme]);

  // Nao renderiza nada ate montar (evita mismatch SSR)
  if (!mounted) {
    return <span className="theme-toggle-placeholder" aria-hidden="true" />;
  }

  const label = theme === "system" ? "Sistema" : theme === "light" ? "Claro" : "Escuro";
  const icon = theme === "dark" ? <MoonIcon /> : theme === "light" ? <SunIcon /> : <SystemIcon />;

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={cycle}
      aria-label={`Tema atual: ${label}. Clicar para alternar.`}
      title={`Tema: ${label}`}
    >
      {icon}
    </button>
  );
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", theme);
  }
}

function SunIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}