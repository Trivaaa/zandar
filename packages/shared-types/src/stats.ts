// ====================================================
// Statistika igrača po igri — docs/Specs/SPEC_STATISTIKA.md (v0.2)
// ====================================================

import type { GameId } from "./poker";

/**
 * Ishod partije za jednog igrača (§5.1). Pobjeda je u svakoj igri samo
 * 1. mjesto (ili pobjeda tima). Prekinuta partija za onoga ko je ostao nema
 * ishod — ne upisuje se ništa.
 */
export type MatchOutcome = "win" | "loss" | "abandon";

/** Brojači jedne igre na profilu (`profiles.stats.byGame.<igra>`). */
export type GameStats = {
  won: number;
  lost: number;
  abandoned: number;
  /** Tekući niz pobjeda; poraz i napuštanje ga prekidaju. */
  streak: number;
  bestStreak: number;
  /** ms, zadnja partija sa ishodom u toj igri. */
  lastAt: number;
};

/** `stats` na profilu i u `/api/me`. Stari profil bez njega = prazna statistika. */
export type PlayerStats = {
  v: 1;
  /** ms, prvi upis — „Broji se od {datum}". `null` = još nema partija. */
  since: number | null;
  byGame: Partial<Record<GameId, GameStats>>;
};

export const EMPTY_GAME_STATS: GameStats = {
  won: 0,
  lost: 0,
  abandoned: 0,
  streak: 0,
  bestStreak: 0,
  lastAt: 0,
};

/** Stanje poslije jednog ishoda — čista funkcija, ista za memoriju i Firestore. */
export function applyOutcome(prev: GameStats | undefined, outcome: MatchOutcome, at: number): GameStats {
  const s = prev ?? EMPTY_GAME_STATS;
  const streak = outcome === "win" ? s.streak + 1 : 0;
  return {
    won: s.won + (outcome === "win" ? 1 : 0),
    lost: s.lost + (outcome === "loss" ? 1 : 0),
    abandoned: s.abandoned + (outcome === "abandon" ? 1 : 0),
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    lastAt: at,
  };
}
