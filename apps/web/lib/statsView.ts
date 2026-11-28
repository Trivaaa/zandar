import type { GameId, GameStats, PlayerStats, SharedStats, StatsUpdatePayload, TableSize } from "@zandar/shared-types";

/** Svoja i tuđa statistika imaju iste brojače; tuđa nema `lastAt`. */
type Counts = Omit<GameStats, "lastAt">;

/**
 * Prikaz statistike (SPEC_STATISTIKA v0.2 §5.2, §8). Čiste funkcije — kartica
 * na profilu (S1), red u „Moje igre" (S2) i red na kraju partije (S3) čitaju
 * iste brojke, pa se ne mogu razići.
 */

/** Od koliko završenih partija se pokazuje procenat (ispod: „3 od 4"). */
export const PERCENT_FROM = 5;

/** Igre gdje svako igra za sebe sa 3–4 igrača — polazište nije 50 %, pa ide red konteksta. */
const CONTEXT_GAMES: readonly GameId[] = ["poker", "raub"];

export function totalOf(g: Counts): number {
  return g.won + g.lost + g.abandoned;
}

/** Igre sa bar jednom partijom: najviše partija prvo, nerješeno po redu `order` (redoslijed početne). */
export function statsGames(stats: PlayerStats | SharedStats | undefined, order: readonly GameId[]): GameId[] {
  if (!stats) return [];
  const rank = (g: GameId) => {
    const i = order.indexOf(g);
    return i < 0 ? order.length : i;
  };
  return (Object.keys(stats.byGame) as GameId[])
    .filter((g) => totalOf(stats.byGame[g]!) > 0)
    .sort((a, b) => totalOf(stats.byGame[b]!) - totalOf(stats.byGame[a]!) || rank(a) - rank(b));
}

export type GameStatsView = {
  won: number;
  lost: number;
  /** Završene (pobjede + porazi). */
  finished: number;
  /** Pobjede %, ili `null` ispod `PERCENT_FROM` završenih. */
  percent: number | null;
  /** Udio pobjeda za krug, 0–1 (i ispod praga — krug u segmentima ga ne koristi). */
  share: number;
  /** Završava %, `null` bez partija. */
  completes: number | null;
  streak: number;
  bestStreak: number;
  /** „Za stolom od N pobjeđuje 1 od N" — samo poker i Raub, kad je najčešći sto 3 ili 4. */
  tableSize: number | null;
};

function mostCommonTable(g: Counts): number | null {
  const entries = Object.entries(g.tables ?? {}) as [TableSize, number][];
  if (entries.length === 0) return null;
  const [size] = entries.reduce((a, b) => (b[1] > a[1] || (b[1] === a[1] && Number(b[0]) > Number(a[0])) ? b : a));
  return Number(size);
}

export function gameStatsView(game: GameId, g: Counts): GameStatsView {
  const finished = g.won + g.lost;
  const total = totalOf(g);
  const size = CONTEXT_GAMES.includes(game) ? mostCommonTable(g) : null;
  return {
    won: g.won,
    lost: g.lost,
    finished,
    percent: finished >= PERCENT_FROM ? Math.round((g.won / finished) * 100) : null,
    share: finished > 0 ? g.won / finished : 0,
    completes: total > 0 ? Math.round((finished / total) * 100) : null,
    streak: g.streak,
    bestStreak: g.bestStreak,
    tableSize: size !== null && size >= 3 ? size : null,
  };
}

/** Druga linija reda igre u „Moje igre" (S2); `null` = igra bez partija. */
export function myGameLine(game: GameId, g: GameStats | undefined): { matches: number; percent: number | null } | null {
  if (!g || totalOf(g) === 0) return null;
  return { matches: totalOf(g), percent: gameStatsView(game, g).percent };
}

/** Red na kraju partije (S3). `null` = nema reda (napuštanje). */
export type MatchEndLine =
  | { kind: "record"; streak: number }
  | { kind: "streak"; won: number; streak: number }
  | { kind: "win"; won: number }
  | { kind: "loss"; match: number; percent: number | null };

export function matchEndLine(u: Pick<StatsUpdatePayload, "game" | "outcome" | "before" | "after">): MatchEndLine | null {
  const { after } = u;
  if (u.outcome === "abandon") return null;
  if (u.outcome === "loss") {
    return { kind: "loss", match: after.won + after.lost, percent: gameStatsView(u.game, after).percent };
  }
  const prevBest = u.before?.bestStreak ?? 0;
  if (after.streak >= 2 && after.bestStreak > prevBest && prevBest >= 2) return { kind: "record", streak: after.streak };
  if (after.streak >= 2) return { kind: "streak", won: after.won, streak: after.streak };
  return { kind: "win", won: after.won };
}
