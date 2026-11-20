/**
 * Zvuk i vibracija poker stola (QA 2026-11-07 PK-B8) — ČISTO: šta se čuje i
 * osjeti za korak priče stola. Pušta ih `usePokerBeat` (uz let žetona i karata)
 * i `PokerScreen` (moj potez, zadnjih 5 s, kraj meča). Postavke zvuka i
 * vibracije poštuju `playSfx` / `vibrate`, pa prekidači važe i ovdje.
 */

import { HAPTIC } from "./haptics";
import type { BeatFx } from "./pokerBeat";
import type { SfxName } from "./sound";

export type Feedback = { sfx?: SfxName; haptic?: number | readonly number[] };

/** Koliko sekundi prije isteka mog poteza stiže upozorenje. */
export const TURN_WARN_SECONDS = 5;

export function pokerFxFeedback(fx: BeatFx, myPlayerId: string): Feedback | null {
  switch (fx.kind) {
    case "deal":
      return { sfx: "deal" };
    case "chipsToBet":
      return fx.playerId === myPlayerId ? { sfx: "chips", haptic: HAPTIC.play } : { sfx: "chips" };
    case "betsToPot":
      return { sfx: "chips" };
    case "check":
      return { sfx: "lift" };
    case "fold":
      return null;
    case "potToWinners":
      return fx.winners.includes(myPlayerId) ? { sfx: "win", haptic: HAPTIC.capture } : { sfx: "chips" };
  }
}

/** Sat MOG poteza je upravo prešao na ≤ 5 s (jednom po potezu: samo na prelaz). */
export function turnWarning(prevSeconds: number | null, seconds: number): boolean {
  return seconds > 0 && seconds <= TURN_WARN_SECONDS && (prevSeconds === null || prevSeconds > TURN_WARN_SECONDS);
}
