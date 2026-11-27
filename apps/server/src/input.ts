import { RAUB_QUICK_START_SCORE, RAUB_START_SCORES, raubStartScore } from "@zandar/game-core";
import type { GameId } from "@zandar/shared-types";

/**
 * Čiste provjere korisničkog unosa u REST tijelima. Tijelo stiže kao JSON, pa
 * TS tip rute ništa ne garantuje — polje može biti broj, objekat ili izostati.
 */

/** Gornja granica imena za stolom; duže se skraćuje, ne odbija (stari klijenti nemaju ograničenje u polju). */
export const DISPLAY_NAME_MAX_LENGTH = 24;

/**
 * Ime igrača iz tijela zahtjeva: `null` kad nije string ili je prazno poslije
 * `trim`-a (→ 400). Predugo ime se skraćuje po znakovima (code point), da se
 * ne presiječe emoji ili slovo sa dijakritikom zapisano kao par.
 */
export function parseDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;
  const chars = Array.from(trimmed);
  if (chars.length <= DISPLAY_NAME_MAX_LENGTH) return trimmed;
  return chars.slice(0, DISPLAY_NAME_MAX_LENGTH).join("").trimEnd();
}

/**
 * Cilj privatne sobe (`/api/rooms`): isti izbor kao brza igra i pozivi (11 ili
 * 21), izostavljen → 21. Poker nema izbor cilja — upisuje se 21 samo da
 * `rulesConfig` ostane istog oblika, šta god klijent poslao. Raub: početni
 * bodovi 11 ili 21 (odluka 34); sve drugo → 21, nikad 400, jer je Raub do
 * 22.11.2026 primao bilo šta. Bela: 501, 701 ili 1001 (P-16), izostavljen →
 * 1001. `null` → 400.
 */
export function parseRoomTargetScore(value: unknown, game: GameId): number | null {
  if (game === "raub") return raubStartScore(value);
  if (game === "bela") {
    if (value === undefined || value === null) return 1001;
    return value === 501 || value === 701 || value === 1001 ? value : null;
  }
  if (game !== "zandar" || value === undefined || value === null) return 21;
  return value === 11 || value === 21 ? value : null;
}

/**
 * Raub brza igra: od koliko se kreće, po izboru u podešavanjima Rauba (11 ili
 * 21). Polje `startScore` šalju samo klijenti koji imaju taj izbor; bez njega
 * (APK do 1.5.0) i za sve van ponude je `RAUB_QUICK_START_SCORE` = 21
 * (odluka 35). Nikad 400.
 */
export function parseRaubQuickStartScore(value: unknown): number {
  return (RAUB_START_SCORES as readonly unknown[]).includes(value) ? (value as number) : RAUB_QUICK_START_SCORE;
}

/** Ciljevi brze Bele po izboru u Profilu (od 1.5.2). */
export const BELA_QUICK_TARGETS = [501, 1001] as const;

/**
 * Bela brza igra: do koliko se igra (Profil → Moje igre → Bela, od 1.5.2).
 * Polje `belaTarget` šalju samo klijenti koji imaju izbor; bez njega i za sve
 * van ponude → 501, kao do sada (`BELA_QUICKPLAY_TARGET`). Nikad 400.
 */
export function parseBelaQuickTarget(value: unknown): number {
  return (BELA_QUICK_TARGETS as readonly unknown[]).includes(value) ? (value as number) : 501;
}
