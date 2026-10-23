import { useMemo, useSyncExternalStore } from "react";

/**
 * Izbor za „Igraj Žandar" — veličina stola i cilj partije.
 *
 * Pamti se zadnji izbor: „Igraj Žandar" na početnoj kreće pravo s njim, a
 * mijenja se u listu podešavanja ispod dugmeta.
 * Podrazumijevano je 4 / 21: tako je brza igra radila dok izbora nije bilo.
 * Sto za 3 se ovdje ne nudi — ostaje kod „Igraj s prijateljima".
 */
export type QuickPlayCount = 2 | 4;
export type QuickPlayTarget = 11 | 21;
export type QuickPlayPrefs = { playerCount: QuickPlayCount; targetScore: QuickPlayTarget };

export const QUICK_PLAY_COUNTS: readonly QuickPlayCount[] = [2, 4];
export const QUICK_PLAY_TARGETS: readonly QuickPlayTarget[] = [11, 21];
export const DEFAULT_QUICK_PLAY_PREFS: QuickPlayPrefs = { playerCount: 4, targetScore: 21 };

/**
 * Izbor važi po igri (SPEC_POCETNA §4). Žandar zadržava zatečeni ključ
 * `zandar:quickplay` — već je upisan na uređajima i niko ne gubi izbor.
 */
export function quickPlayPrefsKey(game: string = "zandar"): string {
  return game === "zandar" ? "zandar:quickplay" : `kartaonica:quickplay:${game}`;
}

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
export function readQuickPlayPrefsRaw(game: string = "zandar"): string | null {
  try {
    return window.localStorage.getItem(quickPlayPrefsKey(game));
  } catch {
    return null;
  }
}

export function readQuickPlayPrefs(game: string = "zandar"): QuickPlayPrefs {
  return parseQuickPlayPrefs(readQuickPlayPrefsRaw(game));
}

export function saveQuickPlayPrefs(prefs: QuickPlayPrefs, game: string = "zandar"): void {
  try {
    window.localStorage.setItem(quickPlayPrefsKey(game), JSON.stringify(prefs));
  } catch {
    // bez pamćenja — sljedeći put se kreće od podrazumijevanog
  }
  for (const listener of listeners) listener();
}

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Druga kartica promijenila izbor.
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.endsWith("quickplay") || e.key.startsWith("kartaonica:quickplay:")) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Zapamćen izbor kao React stanje. Snapshot je SIROV string (stabilan), a
 * parsira se u renderu; server snapshot je `null` → podrazumijevano, pa nema
 * hydration mismatch-a.
 */
export function useQuickPlayPrefs(game: string = "zandar"): QuickPlayPrefs {
  const raw = useSyncExternalStore(subscribe, () => readQuickPlayPrefsRaw(game), () => null);
  return useMemo(() => parseQuickPlayPrefs(raw), [raw]);
}
