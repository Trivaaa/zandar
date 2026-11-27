import { useSyncExternalStore } from "react";

/**
 * Bela brza igra: do koliko se igra (Profil → Moje igre → Bela, od 1.5.2).
 *
 * Server ga dobija kao `belaTarget` na `/api/quickplay` i spaja samo igrače
 * istog izbora. Podrazumijevano 501 — tako je brza Bela igrala do sada.
 * Privatni sto bira cilj na `/create` (501 / 701 / 1001), ovo ga ne dira.
 */
export type BelaQuickTarget = 501 | 1001;

export const BELA_QUICK_TARGETS: readonly BelaQuickTarget[] = [501, 1001];
export const DEFAULT_BELA_QUICK_TARGET: BelaQuickTarget = 501;

const KEY = "kartaonica:bela:target";

/** Sirov zapis → cilj; sve nepoznato pada na 501. Čista funkcija. */
export function parseBelaTarget(raw: string | null | undefined): BelaQuickTarget {
  const n = Number(raw);
  return BELA_QUICK_TARGETS.find((t) => t === n) ?? DEFAULT_BELA_QUICK_TARGET;
}

/** localStorage ume da BACI (WebView bez site data) — isti razlog kao `peekGuestId`. */
function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function readBelaTarget(): BelaQuickTarget {
  return parseBelaTarget(readRaw());
}

const listeners = new Set<() => void>();

export function saveBelaTarget(target: BelaQuickTarget): void {
  try {
    window.localStorage.setItem(KEY, String(target));
  } catch {
    // bez pamćenja — sljedeći put 501
  }
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Zapamćen cilj kao React stanje; snapshot je sirov string (stabilan). */
export function useBelaTarget(): BelaQuickTarget {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return parseBelaTarget(raw);
}
