import { useSyncExternalStore } from "react";

/**
 * Nadimak za stolom — JEDINI vlasnik `zandar_name` ključa.
 *
 * Ključ je ranije bio prepisan na tri mjesta (home, `/brza`, `RoomScreen`), a
 * novi tok (`/ime` korak) bi dodao četvrto. Ime ključa se NE mijenja: stoji u
 * politici privatnosti i već je upisano na uređajima igrača.
 *
 * Validacija je namjerno ista kao do sad — prazno poslije `trim()` nije ime.
 * Server (`/api/quickplay`, `/api/rooms`) provjerava isto; stroža pravila ovdje
 * bi odbila ime koje server prima.
 *
 * `localStorage` ume da BACI (WebView sa ugašenim site data, iOS lockdown), ne
 * samo da vrati null — otud try/catch, isti obrazac kao `peekGuestId`.
 */
const KEY = "zandar_name";

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function normalizePlayerName(value: string): string {
  return value.trim();
}

export function isValidPlayerName(value: string): boolean {
  return normalizePlayerName(value).length > 0;
}

/** Sačuvano ime, ili `null` kad ga nema (ili skladište nije dostupno). */
export function readPlayerName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(KEY);
    return stored && isValidPlayerName(stored) ? normalizePlayerName(stored) : null;
  } catch {
    return null;
  }
}

export function savePlayerName(value: string): void {
  if (typeof window === "undefined" || !isValidPlayerName(value)) return;
  try {
    localStorage.setItem(KEY, normalizePlayerName(value));
  } catch {
    // skladište nedostupno — ime važi samo za ovu partiju
  }
  emit();
}

export function clearPlayerName(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // već nedostupno — nema šta da se briše
  }
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Druga kartica promijenila ime.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/**
 * Sačuvano ime kao React stanje. Server snapshot je `null`, pa prvi render na
 * klijentu ne pravi hydration mismatch (isti obrazac kao `useSetting`).
 */
export function usePlayerName(): string | null {
  return useSyncExternalStore(subscribe, readPlayerName, () => null);
}
