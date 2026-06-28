"use client";

import { useEffect, useState } from "react";

/**
 * Hook do Command Palette (item B5 da Trilha C).
 *
 * Atalho global: Cmd+K (mac) / Ctrl+K (windows/linux).
 * Tambem disponivel via botao de lupa (futuro).
 *
 * Estado compartilhado via modulo: em apps pequenos, evita criar
 * Context para uma feature global. Para apps maiores, migrar para
 * Zustand ou Context API.
 */

let listeners: Array<(open: boolean) => void> = [];
let currentState = false;

function setState(open: boolean) {
  if (currentState === open) return;
  currentState = open;
  for (const fn of listeners) fn(open);
}

function subscribe(fn: (open: boolean) => void) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function useCommandPalette() {
  const [open, setOpen] = useState(currentState);

  useEffect(() => {
    const unsub = subscribe(setOpen);
    return unsub;
  }, []);

  // Listener global de teclado
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setState(!currentState);
      }
      // Esc fecha
      if (e.key === "Escape" && currentState) {
        e.preventDefault();
        setState(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return {
    open,
    setOpen: setState,
    toggle: () => setState(!currentState),
  };
}