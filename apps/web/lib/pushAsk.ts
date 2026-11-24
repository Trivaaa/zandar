import type { PushPermission } from "./push";

/**
 * Kako tražiti dozvolu na kraju partije (SPEC_PUSH_V2 A1, izuzetak od 24.11.2026).
 *
 * - `"direct"`: prvi put na uređaju odmah sistemski dijalog, bez naše kartice.
 *   Mjereno: kartica je propuštala 4 % (2/52), a sistemski dijalog je dobio
 *   10 „Dozvoli" od 12 igrača i nijedno odbijanje.
 * - `"card"`: kasnije partije, postojeća kartica (Uključi / Ne sada). Njeno
 *   „Uključi" je drugo, zadnje pitanje prije nego Android 13+ trajno prestane pitati.
 * - `null`: ništa (dozvola riješena ili kartica odgođena).
 *
 * Direktno pitanje ide i kad je kartica odgođena u drugom kontekstu: tamo je
 * igrač odbio NAŠU ponudu, a sistemski dijalog još nije vidio.
 */
export type MatchEndAsk = "direct" | "card" | null;

export function decideMatchEndAsk(input: {
  permission: PushPermission;
  snoozed: boolean;
  directAsked: boolean;
}): MatchEndAsk {
  if (input.permission !== "prompt") return null;
  if (!input.directAsked) return "direct";
  if (input.snoozed) return null;
  return "card";
}

/** Ključ za `promptShownOnce` / `markPromptShownOnce`. */
export const MATCH_END_DIRECT_KEY = "match_end_direct";

/** Pauza da se kraj meča iscrta prije sistemskog dijaloga. */
export const MATCH_END_DIRECT_DELAY_MS = 1200;
