/**
 * Zapamćena podloga stola — zadnja koju je igrač izabrao pred igru.
 *
 * Zaseban ključ, a ne polje u `quickPlayPrefs`: isti izbor nude i `/igraj` i
 * `/create`. Spisak podloga i `parseTableTheme` žive u `shared-types`, jer ih
 * čita i server.
 */
import type { TableTheme } from "@zandar/shared-types";

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
}
