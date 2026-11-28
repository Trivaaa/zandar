"use client";

import { useEffect, useRef } from "react";

import type { GameId } from "@zandar/shared-types";

import { CardsIcon, FlameIcon, TrophyIcon } from "@/components/icons";
import { sr } from "@/lib/sr";
import { matchEndLine, type MatchEndLine } from "@/lib/statsView";
import { useMatchEndStats } from "@/lib/statsUpdates";
import { track } from "@/lib/track";

/**
 * S3 · red na kraju partije (SPEC_STATISTIKA §8.3): jedna brojka koja se
 * upravo promijenila. Dok se čeka `stats:update` (do 3 s) red se ne crta,
 * a ako ne stigne, nema ga — bez praznog mjesta i spinera. Isti red za svaki
 * sto: ništa ne govori ko je sjedio za stolom.
 */
export function MatchStatsRow({ game }: { game: GameId }) {
  const update = useMatchEndStats(game);
  const line = update ? matchEndLine(update) : null;
  const tracked = useRef(false);

  useEffect(() => {
    if (!update || !line || tracked.current) return;
    tracked.current = true;
    track("match_end_stats_shown", {
      game,
      outcome: update.outcome === "win" ? "win" : "loss",
      streak: update.after.streak,
    });
  }, [update, line, game]);

  if (!line) return null;
  return <MatchStatsLineView line={line} />;
}

/** Sam izgled reda (i za `/dev/stats`). */
export function MatchStatsLineView({ line }: { line: MatchEndLine }) {
  if (line.kind === "record") {
    return (
      <p className="match-stats match-stats--record" role="status">
        <TrophyIcon className="match-stats__icon" />
        <span>{sr.stats.endRecord(line.streak)}</span>
      </p>
    );
  }
  if (line.kind === "loss") {
    return (
      <p className="match-stats" role="status">
        <CardsIcon className="match-stats__icon match-stats__icon--soft" />
        <span>{sr.stats.endLoss(line.match, line.percent)}</span>
      </p>
    );
  }
  return (
    <p className="match-stats" role="status">
      {line.kind === "streak" ? <FlameIcon className="match-stats__icon" /> : null}
      <span>{line.kind === "streak" ? sr.stats.endStreak(line.won, line.streak) : sr.stats.endWin(line.won)}</span>
      <span className="match-stats__up" aria-hidden="true">
        +1
      </span>
    </p>
  );
}
