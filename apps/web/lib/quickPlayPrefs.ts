/**
 * Izbor za „Igraj Žandar" — veličina stola i cilj partije.
 *
 * Pamti se zadnji izbor, pa ekran `/igraj` sljedeći put traži samo potvrdu.
 * Podrazumijevano je 4 / 21: tako je brza igra radila dok izbora nije bilo.
 * Sto za 3 se ovdje ne nudi — ostaje kod „Igraj s prijateljima".
 */
export type QuickPlayCount = 2 | 4;
export type QuickPlayTarget = 11 | 21;
export type QuickPlayPrefs = { playerCount: QuickPlayCount; targetScore: QuickPlayTarget };

export const QUICK_PLAY_COUNTS: readonly QuickPlayCount[] = [2, 4];
export const QUICK_PLAY_TARGETS: readonly QuickPlayTarget[] = [11, 21];
export const DEFAULT_QUICK_PLAY_PREFS: QuickPlayPrefs = { playerCount: 4, targetScore: 21 };

const STORAGE_KEY = "zandar:quickplay";

/**
 * Sirov zapis → izbor. Čista funkcija: sve što nije prepoznato (nema zapisa,
 * pokvaren JSON, vrijednost koju više ne nudimo) pada na podrazumijevano, polje
 * po polje — pokvaren cilj ne smije odnijeti i zapamćenu veličinu stola.
 */
export function parseQuickPlayPrefs(raw: string | null | undefined): QuickPlayPrefs {
  if (!raw) return DEFAULT_QUICK_PLAY_PREFS;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return DEFAULT_QUICK_PLAY_PREFS;
  }
  if (typeof data !== "object" || data === null) return DEFAULT_QUICK_PLAY_PREFS;
  const { playerCount, targetScore } = data as Record<string, unknown>;
  return {
    playerCount: QUICK_PLAY_COUNTS.find((n) => n === playerCount) ?? DEFAULT_QUICK_PLAY_PREFS.playerCount,
    targetScore: QUICK_PLAY_TARGETS.find((n) => n === targetScore) ?? DEFAULT_QUICK_PLAY_PREFS.targetScore,
  };
}

/**
 * Sirov zapis, za `useSyncExternalStore`: snapshot mora biti STABILAN, a string
 * jeste (parsiran objekat bi bio nov pri svakom čitanju i vrtio render u krug).
 * localStorage ume da BACI (WebView bez site data) — isti razlog kao `peekGuestId`.
 */
export function readQuickPlayPrefsRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function readQuickPlayPrefs(): QuickPlayPrefs {
  return parseQuickPlayPrefs(readQuickPlayPrefsRaw());
}

export function saveQuickPlayPrefs(prefs: QuickPlayPrefs): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // bez pamćenja — ekran sljedeći put kreće od podrazumijevanog
  }
}
