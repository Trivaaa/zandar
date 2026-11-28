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
  /**
   * Partije po broju igrača za stolom („2" … „4"), za red konteksta „Za stolom
   * od 4 pobjeđuje 1 od 4" (§5.2). Opciono: zapisi prije F1 ga nemaju.
   */
  tables?: Partial<Record<TableSize, number>>;
};

export const TABLE_SIZES = ["2", "3", "4"] as const;
export type TableSize = (typeof TABLE_SIZES)[number];

/** Upis ishoda: stanje igre prije (`null` = prva partija u toj igri) i poslije. */
export type RecordedStats = { before: GameStats | null; after: GameStats };

/**
 * `stats:update` (server → socket igrača za stolom, F1 S3): poslije upisa
 * ishoda. Oblik i vrijeme su isti za svaki sto — ništa ne govori ko je sjedio.
 */
export type StatsUpdatePayload = {
  matchId: string;
  game: GameId;
  outcome: MatchOutcome;
  before: GameStats | null;
  after: GameStats;
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
export function applyOutcome(
  prev: GameStats | undefined,
  outcome: MatchOutcome,
  at: number,
  players?: number,
): GameStats {
  const s = prev ?? EMPTY_GAME_STATS;
  const streak = outcome === "win" ? s.streak + 1 : 0;
  const size = String(players) as TableSize;
  const tables = (TABLE_SIZES as readonly string[]).includes(size)
    ? { ...s.tables, [size]: (s.tables?.[size] ?? 0) + 1 }
    : s.tables;
  return {
    ...(tables ? { tables } : {}),
    won: s.won + (outcome === "win" ? 1 : 0),
    lost: s.lost + (outcome === "loss" ? 1 : 0),
    abandoned: s.abandoned + (outcome === "abandon" ? 1 : 0),
    streak,
    bestStreak: Math.max(s.bestStreak, streak),
    lastAt: at,
  };
}

/**
 * Tuđa statistika u `GET /api/profiles/:id` (v0.3): samo prijatelji i igrači
 * za istim privatnim stolom. Bez `lastAt`; `abandoned` je 0 dok vlasnik nema
 * 10 započetih partija (`showCompletes: false`), pa se „Završava" ne prikazuje.
 */
export type SharedGameStats = Omit<GameStats, "lastAt">;
export type SharedStats = {
  v: 1;
  since: number | null;
  showCompletes: boolean;
  byGame: Partial<Record<GameId, SharedGameStats>>;
};
