/**
 * Zapamćena podloga stola — zadnja koju je igrač izabrao pred igru.
 *
 * Zaseban ključ, a ne polje u `quickPlayPrefs`: isti izbor nude i brza igra
 * (list podešavanja na početnoj) i `/create`. Spisak podloga i
 * `parseTableTheme` žive u `shared-types`, jer ih čita i server.
 */
import { useSyncExternalStore } from "react";
import { parseTableTheme, type TableTheme } from "@zandar/shared-types";

const STORAGE_KEY = "zandar:table";

/**
 * Sirov zapis, za `useSyncExternalStore` (stabilan snapshot). localStorage ume
 * da BACI (WebView bez site data) — isti razlog kao `readQuickPlayPrefsRaw`.
 */
export function readTableThemeRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function saveTableTheme(theme: TableTheme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // bez pamćenja — ekran sljedeći put kreće od podrazumijevane
  }
  for (const listener of listeners) listener();
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Zapamćena podloga kao React stanje (server snapshot → podrazumijevana). */
export function useTableTheme(): TableTheme {
  return parseTableTheme(useSyncExternalStore(subscribe, readTableThemeRaw, () => null));
}
