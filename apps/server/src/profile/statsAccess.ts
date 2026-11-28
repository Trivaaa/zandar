import type { GameId, GameStats, PlayerStats, SharedGameStats, SharedStats } from "@zandar/shared-types";

import type { Relation } from "./friends";

/**
 * Tuđa statistika (SPEC_STATISTIKA v0.3, odluka vlasnika 28.11.2026): vide je
 * prijatelji i igrači za istim privatnim stolom, osim kad je vlasnik sakrio
 * (prekidač u Postavkama) ili postoji blokada u bilo kom smjeru. Brza igra
 * bez prijateljstva ne daje pravo — tamo se uglavnom igra protiv botova.
 */
export function canSeeStats(a: {
  relation: Relation;
  /** Blokada u bilo kom smjeru (gledalac → vlasnik ili obrnuto). */
  blockedEitherWay: boolean;
  /** Vlasnik je isključio „Statistiku vide prijatelji…". */
  hidden: boolean;
  /** Oba su sada za istim privatnim stolom (server provjerio sobu). */
  sharesPrivateTable: boolean;
}): boolean {
  if (a.relation === "self" || a.blockedEitherWay || a.hidden) return false;
  return a.relation === "friends" || a.sharesPrivateTable;
}

/** Od koliko započetih partija (sve igre) drugi vide „Završava %". */
export const COMPLETES_VISIBLE_FROM = 10;

export function sharedStats(stats: PlayerStats | undefined): SharedStats | undefined {
  if (!stats) return undefined;
  const games = Object.entries(stats.byGame) as [GameId, GameStats][];
  const started = games.reduce((n, [, g]) => n + g.won + g.lost + g.abandoned, 0);
  const showCompletes = started >= COMPLETES_VISIBLE_FROM;
  const byGame: SharedStats["byGame"] = {};
  for (const [game, g] of games) {
    const out: SharedGameStats = {
      won: g.won,
      lost: g.lost,
      abandoned: showCompletes ? g.abandoned : 0,
      streak: g.streak,
      bestStreak: g.bestStreak,
    };
    if (g.tables) out.tables = { ...g.tables };
    byGame[game] = out;
  }
  return { v: 1, since: stats.since, showCompletes, byGame };
}
