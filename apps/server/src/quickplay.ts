/**
 * Čista provjera konfiguracije brze igre (`POST /api/quickplay`). Bez soba, bez
 * mreže — tijelo zahtjeva unutra, konfiguracija ili poruka o grešci napolje.
 *
 * Otkad igrač bira veličinu stola i cilj (ekran `/igraj`), oba polja su
 * korisnički unos. `targetScore` se ranije nije provjeravao uopšte, pa je soba
 * mogla nastati sa ciljem 1 ili 9999.
 *
 * Back-compat: klijenti iz vremena fiksne brze igre šalju 4 / 21, a još stariji
 * izostavljaju `targetScore` — oba oblika moraju prolaziti.
 */

export const QUICK_PLAY_PLAYER_COUNTS = [2, 3, 4] as const;
export const QUICK_PLAY_TARGET_SCORES = [11, 21] as const;
export const DEFAULT_QUICK_PLAY_TARGET = 21;

export type QuickPlayConfig = {
  playerCount: (typeof QUICK_PLAY_PLAYER_COUNTS)[number];
  targetScore: (typeof QUICK_PLAY_TARGET_SCORES)[number];
};

export type QuickPlayConfigResult =
  | { ok: true; config: QuickPlayConfig }
  | { ok: false; error: string };

export function parseQuickPlayConfig(body: {
  playerCount?: unknown;
  targetScore?: unknown;
}): QuickPlayConfigResult {
  const playerCount = QUICK_PLAY_PLAYER_COUNTS.find((n) => n === body.playerCount);
  if (playerCount === undefined) {
    return { ok: false, error: "playerCount mora biti 2, 3 ili 4" };
  }
  const requested = body.targetScore ?? DEFAULT_QUICK_PLAY_TARGET;
  const targetScore = QUICK_PLAY_TARGET_SCORES.find((n) => n === requested);
  if (targetScore === undefined) {
    return { ok: false, error: "targetScore mora biti 11 ili 21" };
  }
  return { ok: true, config: { playerCount, targetScore } };
}
