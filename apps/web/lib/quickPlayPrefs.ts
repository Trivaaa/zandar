import { useMemo, useSyncExternalStore } from "react";

/**
 * Izbor za „Igraj Žandar" — veličina stola i cilj partije.
 *
 * Pamti se zadnji izbor: „Igraj Žandar" na početnoj kreće pravo s njim, a
 * mijenja se u Postavkama → Brza igra (K1, SPEC_POCETNA_V3).
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
 * Raub brza igra kreće od 11 (odluka 34), a 21 se bira u podešavanjima Rauba.
 * Raub se uvijek igra u 4, pa je broj igrača tu samo da oblik ostane isti.
 */
export const DEFAULT_RAUB_QUICK_PLAY_PREFS: QuickPlayPrefs = { playerCount: 4, targetScore: 11 };

export function defaultQuickPlayPrefs(game: string = "zandar"): QuickPlayPrefs {
  return game === "raub" ? DEFAULT_RAUB_QUICK_PLAY_PREFS : DEFAULT_QUICK_PLAY_PREFS;
}

/**
 * Izbor važi po igri (SPEC_POCETNA §4). Žandar zadržava zatečeni ključ
 * `zandar:quickplay` — već je upisan na uređajima i niko ne gubi izbor.
 */
export function quickPlayPrefsKey(game: string = "zandar"): string {
  if (game === "zandar") return "zandar:quickplay";
  // Raub: nov ključ (22.11.2026). Stari je nosio 21 koje list prikazivao kao
  // podrazumijevano, a server ga nije slušao — ko ga nije birao, kreće od 11.
  if (game === "raub") return "kartaonica:quickplay:raub:v2";
  return `kartaonica:quickplay:${game}`;
}

/**
 * Sirov zapis → izbor. Čista funkcija: sve što nije prepoznato (nema zapisa,
 * pokvaren JSON, vrijednost koju više ne nudimo) pada na podrazumijevano, polje
 * po polje — pokvaren cilj ne smije odnijeti i zapamćenu veličinu stola.
 */
export function parseQuickPlayPrefs(raw: string | null | undefined, game: string = "zandar"): QuickPlayPrefs {
  const fallback = defaultQuickPlayPrefs(game);
  if (!raw) return fallback;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return fallback;
  }
  if (typeof data !== "object" || data === null) return fallback;
  const { playerCount, targetScore } = data as Record<string, unknown>;
  return {
    playerCount: QUICK_PLAY_COUNTS.find((n) => n === playerCount) ?? fallback.playerCount,
    targetScore: QUICK_PLAY_TARGETS.find((n) => n === targetScore) ?? fallback.targetScore,
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
  return parseQuickPlayPrefs(readQuickPlayPrefsRaw(game), game);
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
  return useMemo(() => parseQuickPlayPrefs(raw, game), [raw, game]);
}
