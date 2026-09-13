/**
 * Nadimak za stolom — JEDINI vlasnik `zandar_name` ključa.
 *
 * Ključ je ranije bio prepisan na tri mjesta (home, `/brza`, `RoomScreen`), a
 * novi tok (`/ime` korak) bi dodao četvrto. Ime ključa se NE mijenja: stoji u
 * politici privatnosti (`/privatnost` → „Šta stoji na tvom uređaju") i već je
 * upisano na uređajima igrača.
 *
 * Validacija je namjerno ista kao do sad — prazno poslije `trim()` nije ime.
 * Server (`/api/quickplay`, `/api/rooms`) provjerava isto; stroža pravila ovdje
 * bi odbila ime koje server prima.
 *
 * `localStorage` ume da BACI (WebView sa ugašenim site data, iOS lockdown), ne
 * samo da vrati null — otud try/catch, isti obrazac kao `peekGuestId`.
 */
const KEY = "zandar_name";

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
}

export function clearPlayerName(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // već nedostupno — nema šta da se briše
  }
}
