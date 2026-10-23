/**
 * Zapamćena podloga stola — zadnja koju je igrač izabrao pred igru.
 *
 * Zaseban ključ, a ne polje u `quickPlayPrefs`: isti izbor nude i brza igra
 * (list podešavanja na početnoj) i `/create`. Spisak podloga i
 * `parseTableTheme` žive u `shared-types`, jer ih čita i server.
 */
import { useSyncExternalStore } from "react";
import { parseTableTheme, type TableTheme } from "@zandar/shared-types";

/** Po igri, kao izbor stola; Žandar zadržava zatečeni `zandar:table` (dijeli ga i `/create`). */
export function tableThemeKey(game: string = "zandar"): string {
  return game === "zandar" ? "zandar:table" : `kartaonica:table:${game}`;
}

/**
 * Sirov zapis, za `useSyncExternalStore` (stabilan snapshot). localStorage ume
 * da BACI (WebView bez site data) — isti razlog kao `readQuickPlayPrefsRaw`.
 */
export function readTableThemeRaw(game: string = "zandar"): string | null {
  try {
    return window.localStorage.getItem(tableThemeKey(game));
  } catch {
    return null;
  }
}

export function saveTableTheme(theme: TableTheme, game: string = "zandar"): void {
  try {
    window.localStorage.setItem(tableThemeKey(game), theme);
  } catch {
    // bez pamćenja — ekran sljedeći put kreće od podrazumijevane
  }
  for (const listener of listeners) listener();
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === "zandar:table" || e.key.startsWith("kartaonica:table:")) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Zapamćena podloga kao React stanje (server snapshot → podrazumijevana). */
export function useTableTheme(game: string = "zandar"): TableTheme {
  return parseTableTheme(useSyncExternalStore(subscribe, () => readTableThemeRaw(game), () => null));
}
