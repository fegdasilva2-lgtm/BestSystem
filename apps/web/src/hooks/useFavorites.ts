"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hook para gerenciar "favoritos" da sidebar via localStorage (item C7).
 *
 * Persiste ate 6 hrefs mais acessados pelo usuario. Aparece como
 * secao destacada no topo da Sidebar. Resetavel.
 *
 * Storage key: predialops:favorites:v1
 * Schema: { hrefs: string[], updatedAt: number }
 */

const STORAGE_KEY = "predialops:favorites:v1";
const MAX_FAVORITES = 6;
const MIN_VISITS_TO_AUTO_PROMOTE = 3;

interface FavoritesState {
  hrefs: string[];
  updatedAt: number;
}

function readStorage(): FavoritesState {
  if (typeof window === "undefined") return { hrefs: [], updatedAt: 0 };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { hrefs: [], updatedAt: 0 };
    const parsed = JSON.parse(raw) as FavoritesState;
    if (!Array.isArray(parsed.hrefs)) return { hrefs: [], updatedAt: 0 };
    return {
      hrefs: parsed.hrefs.slice(0, MAX_FAVORITES),
      updatedAt: parsed.updatedAt ?? 0,
    };
  } catch {
    return { hrefs: [], updatedAt: 0 };
  }
}

function writeStorage(state: FavoritesState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage indisponivel (modo privado, cota excedida) - silencioso
  }
}

/**
 * Hook principal. Retorna:
 * - favorites: array atual de hrefs favoritos
 * - toggle: adiciona ou remove um href
 * - isFavorite: checa se um href e favorito
 * - recordVisit: registra visita (para auto-promocao apos N acessos)
 * - clear: limpa favoritos
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  // Hidrata do localStorage no mount
  useEffect(() => {
    setFavorites(readStorage().hrefs);
    setMounted(true);
  }, []);

  // Sincroniza entre abas
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setFavorites(readStorage().hrefs);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((hrefs: string[]) => {
    setFavorites(hrefs);
    writeStorage({ hrefs, updatedAt: Date.now() });
  }, []);

  const toggle = useCallback(
    (href: string) => {
      const curr = readStorage().hrefs;
      let next: string[];
      if (curr.includes(href)) {
        next = curr.filter((h) => h !== href);
      } else {
        next = [href, ...curr].slice(0, MAX_FAVORITES);
      }
      persist(next);
    },
    [persist]
  );

  const isFavorite = useCallback(
    (href: string) => favorites.includes(href),
    [favorites]
  );

  const clear = useCallback(() => {
    persist([]);
  }, [persist]);

  /**
   * Auto-promove: depois de N visitas a um href nao-favorito,
   * adiciona automaticamente (UX discreta).
   */
  const recordVisit = useCallback(
    (href: string) => {
      if (typeof window === "undefined") return;
      if (readStorage().hrefs.includes(href)) return;
      try {
        const visitKey = `predialops:visits:${href}`;
        const curr = Number(window.localStorage.getItem(visitKey) ?? "0") + 1;
        window.localStorage.setItem(visitKey, String(curr));
        if (curr >= MIN_VISITS_TO_AUTO_PROMOTE) {
          const currFavs = readStorage().hrefs;
          if (!currFavs.includes(href)) {
            const next = [href, ...currFavs].slice(0, MAX_FAVORITES);
            persist(next);
          }
        }
      } catch {
        // silencioso
      }
    },
    [persist]
  );

  return { favorites, toggle, isFavorite, clear, recordVisit, mounted };
}

/** Constantes exportadas para uso em Sidebar e testes. */
export const FAVORITES_MAX = MAX_FAVORITES;
export const FAVORITES_MIN_VISITS = MIN_VISITS_TO_AUTO_PROMOTE;