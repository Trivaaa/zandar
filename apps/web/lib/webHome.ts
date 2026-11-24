import { TABLE_THEMES, type GameId, type TableTheme } from "@zandar/shared-types";

import type { GameSlug } from "@/lib/games";
import type { QuickPlayPrefs } from "@/lib/quickPlayPrefs";

/**
 * Početna za web (tabla „UI · Početna za web — novi igrači", W1–W4). Samo web:
 * aplikacija zadržava svoju početnu, a svaka razlika ide kroz `isNative`.
 * Ovdje su čista pravila, bez skladišta i bez rutiranja.
 */

/** Žandar na webu ide pravo za sto: uvijek 4 igrača, do 11 (W1). */
export const WEB_ZANDAR_PREFS: QuickPlayPrefs = { playerCount: 4, targetScore: 11 };

/** Raub na webu kreće od 21 (odluka 35); 11 se bira na „Napravi sto". */
export const WEB_RAUB_PREFS: QuickPlayPrefs = { playerCount: 4, targetScore: 21 };

/** Izgled stola za brzu igru na webu je nasumičan (W1). */
export function randomTableTheme(rng: () => number = Math.random): TableTheme {
  const i = Math.min(TABLE_THEMES.length - 1, Math.floor(rng() * TABLE_THEMES.length));
  return TABLE_THEMES[Math.max(0, i)] ?? TABLE_THEMES[0];
}

/** Zapamćen izbor igre na ovom uređaju; `null` = igrač ga nikad nije postavio. */
export type SavedChoice = { prefs: QuickPlayPrefs | null; tableTheme: TableTheme | null };

/**
 * Izbor stola za „Igraj" na webu, bez lista. Poker i Bela serveru ionako daju
 * 4 mjesta i bez cilja, pa nose Žandarove brojeve; Raub nosi svoj početak (21).
 *
 * D10 (SPEC_PROFIL_POSTAVKE v0.3): kad je igrač izbor već postavio (Profil →
 * Moje igre; sto i sa `/create`), web početna kreće s njim — inače bi Profil rekao
 * „od 11", a sto krenuo od 21. Bez zapisa ostaje stalni izbor i nasumičan sto.
 * `remember: false`: ovaj izbor ne postaje „zadnji" sam od sebe.
 */
export function webQuickPlayChoice(
  rng: () => number = Math.random,
  game: GameSlug = "zandar",
  saved: SavedChoice = { prefs: null, tableTheme: null },
): { prefs: QuickPlayPrefs; tableTheme: TableTheme; remember: false } {
  const prefs = saved.prefs ?? (game === "raub" ? WEB_RAUB_PREFS : WEB_ZANDAR_PREFS);
  return { prefs, tableTheme: saved.tableTheme ?? randomTableTheme(rng), remember: false };
}

/**
 * Nova soba sa web početne (W4): igra je već izabrana, pa uvijek ide u adresi —
 * i za Žandar, da `/create` na webu zna da ne nudi izbor igre.
 */
export const webCreatePath = (game: GameSlug) => `/create?game=${game}`;

/**
 * Ponuđene veličine stola na `/create` za web. Žandar: samo 2 ili 4 (odluka
 * vlasnika 15.11.2026 — kartica igre kaže „2 ili 4"). Aplikacija ovo ne zove.
 */
export function webCreateCounts(game: GameId): readonly (2 | 3 | 4)[] {
  // Bela je samo 2 na 2 (spec, odluka 1).
  return game === "zandar" ? [2, 4] : game === "bela" ? [4] : [2, 3, 4];
}

/**
 * Ime gosta za „Preskoči i igraj kao Gost NN" (tabla „Ime za stolom — web",
 * I5). Dvocifren broj, da dva gosta za istim stolom rijetko dobiju isto ime;
 * server ionako dozvoljava isto ime za stolom. Ne pamti se kao ime igrača.
 */
export function guestName(rng: () => number = Math.random): string {
  const n = 10 + Math.min(89, Math.max(0, Math.floor(rng() * 90)));
  return `Gost ${n}`;
}
