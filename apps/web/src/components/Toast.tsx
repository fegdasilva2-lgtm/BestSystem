"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Sistema de toast feedback (B1 - Trilha B UI_AUDIT_2026-06.md).
 *
 * Arquitetura:
 * - ToastProvider: cria contexto, renderiza <ToastViewport>
 * - useToast(): hook para chamar toast.success/error/info de qualquer
 *   componente client
 * - ToastViewport: regiao aria-live="polite" no canto inferior direito
 *
 * Por que polite e nao assertive:
 * - Toasts sao feedback secundario, nao devem interromper leitura
 *   de leitores de tela; sao anunciados apos o usuario pausar
 *
 * Limitacao conhecida: server components (form actions) nao podem
 * chamar useToast() diretamente. Para esses casos, mantemos o padrao
 * atual de redirect + searchParams. A infraestrutura aqui cobre
 * acoes client-side e progressive enhancement futuro.
 */

export type ToastVariant = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Duracao em ms (default 5000). 0 = persistente ate dismiss. */
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
  /** Helpers ergonomicos */
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((curr) => [...curr, { id, ...toast }]);
      return id;
    },
    []
  );

  // Atalho: dismiss automatico apos duration (default 5000)
  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts
      .filter((t) => (t.duration ?? 5000) > 0)
      .map((t) => {
        const ms = t.duration ?? 5000;
        return setTimeout(() => dismiss(t.id), ms);
      });
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [toasts, dismiss]);

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      push,
      dismiss,
      success: (title, description) =>
        push({ title, description, variant: "success" }),
      error: (title, description) =>
        push({ title, description, variant: "error", duration: 7000 }),
      info: (title, description) =>
        push({ title, description, variant: "info" }),
      warning: (title, description) =>
        push({ title, description, variant: "warning" }),
    }),
    [toasts, push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  }
  return ctx;
}

/**
 * Viewport: regiao aria-live polite no canto inferior direito.
 * Renderiza a fila de toasts com animacao slide-in.
 */
function ToastViewport() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;

  return (
    <div
      className="toast-viewport"
      role="region"
      aria-label="Notificações"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {ctx.toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => ctx.dismiss(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const variant = toast.variant ?? "info";
  return (
    <div className={`toast toast-${variant}`} role="status">
      <div className="toast-icon" aria-hidden="true">
        <ToastIcon variant={variant} />
      </div>
      <div className="toast-content">
        <strong>{toast.title}</strong>
        {toast.description && <span>{toast.description}</span>}
      </div>
      <button
        type="button"
        className="toast-dismiss"
        onClick={onDismiss}
        aria-label="Fechar notificação"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "success") {
    return (
      <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  if (variant === "warning") {
    return (
      <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  // info
  return (
    <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}