import type { PushPermission } from "./push";

/**
 * Kako tražiti dozvolu na kraju partije (SPEC_PUSH_V2 A1).
 *
 * - `"direct"`: prvi put na uređaju odmah sistemski dijalog, bez našeg teksta
 *   (izuzetak od 24.11.2026). Na većem broju je dalo 30 „Dozvoli" od 210
 *   (14 %, 1.5.1), pa od 1.5.2 ide u A/B protiv `"soft"`.
 * - `"soft"`: prvi put list sa razlogom (`PushSoftAsk`); sistemski dijalog tek
 *   na „Da, javi mi", a „Ne sada" ne troši nijednu od dvije Android prilike.
 * - `"card"`: kasnije partije, postojeća kartica (Uključi / Ne sada).
 * - `null`: ništa (dozvola riješena, kartica odgođena ili potrošena).
 *
 * Zadnja prilika (`rationale`: Android je već jednom čuo „Ne dozvoli") se
 * nikad ne troši bez objašnjenja: umjesto `"direct"` ide `"soft"`.
 *
 * Prva prilika ide i kad je kartica odgođena u drugom kontekstu: tamo je
 * igrač odbio NAŠU ponudu, a na kraju partije je još nije vidio.
 */
export type MatchEndAsk = "direct" | "soft" | "card" | null;

/** Grupa u A/B testu prvog pitanja (od 1.5.2). Bez grupe = uređaj stariji od testa. */
export type PushAskArm = "direct" | "soft";

/** Udio uređaja u grupi `soft` (HARD RULE 7: config). */
export const PUSH_ASK_SOFT_SHARE = 0.5;

/** Kartica na kraju partije: najviše jednom dnevno i ovoliko puta ukupno. */
export const MATCH_END_CARD_MAX_SHOWS = 5;

export function decideMatchEndAsk(input: {
  permission: PushPermission;
  /** Sirovo `prompt-with-rationale`: ostala je jedna sistemska prilika. */
  rationale?: boolean;
  snoozed: boolean;
  directAsked: boolean;
  arm?: PushAskArm | undefined;
  /** Koliko je puta kartica `match_end` već pokazana na uređaju. */
  cardShows?: number;
  /** Da li je kartica danas već pokazana. */
  cardShownToday?: boolean;
}): MatchEndAsk {
  if (input.permission !== "prompt") return null;
  if (!input.directAsked) {
    if (input.rationale || input.arm === "soft") return "soft";
    return "direct";
  }
  if (input.snoozed) return null;
  if (input.cardShownToday) return null;
  if ((input.cardShows ?? 0) >= MATCH_END_CARD_MAX_SHOWS) return null;
  return "card";
}

/**
 * Grupa za uređaj koji je još nema. Dodjela samo uređaju koji prvu priliku
 * nije potrošio i čija dozvola nije riješena — stari uređaji ostaju van testa.
 */
export function assignPushAskArm(input: {
  existing: PushAskArm | null;
  permission: PushPermission;
  directAsked: boolean;
  random: number;
  share?: number;
}): PushAskArm | null {
  if (input.existing) return input.existing;
  if (input.permission !== "prompt" || input.directAsked) return null;
  return input.random < (input.share ?? PUSH_ASK_SOFT_SHARE) ? "soft" : "direct";
}

/** Ključ za `promptShownOnce` / `markPromptShownOnce`: prva prilika na kraju partije. */
export const MATCH_END_DIRECT_KEY = "match_end_direct";

/** Pauza da se kraj meča iscrta prije dijaloga ili lista. */
export const MATCH_END_DIRECT_DELAY_MS = 1200;
