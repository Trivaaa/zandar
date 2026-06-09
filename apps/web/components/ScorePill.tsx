"use client";

import { useState } from "react";
import type { HandScore, PublicPlayer } from "@zandar/shared-types";

/**
 * ScorePill — rezultat kao overlay u gornjem uglu (DS §1.3, §4.5, B6).
 *
 * Ne troši layout prostor (apsolutni overlay). Collapsed = kompaktan pill sa
 * skorovima; tap → breakdown panel (po igraču u 2P/3P, po timu u 4P) +
 * kategorije bodovanja (najviše karata, trefovi, 2♣, 10♦).
 *
 * Ključevi `matchScore`: playerId (2P/3P) ili "team-0"/"team-1" (4P) — radi za
 * sve player-count-ove. Pozicionira se unutar relativnog roditelja (GameTable).
 */

type ScorePillProps = {
  players: PublicPlayer[];
  /** key = playerId (2P/3P) ili "team-0"/"team-1" (4P) */
  matchScore: Record<string, number>;
  targetScore: number;
  /** Za breakdown zadnje ruke (opciono). */
  handScores?: HandScore[];
};

function pileLabel(pileId: string, players: PublicPlayer[]): string {
  if (pileId === "team-0") return "Tim A";
  if (pileId === "team-1") return "Tim B";
  return players.find((p) => p.id === pileId)?.displayName ?? pileId;
}

function dotClass(pileId: string, isLeader: boolean): string {
  if (pileId === "team-0") return "bg-team-a";
  if (pileId === "team-1") return "bg-team-b";
  return isLeader ? "bg-accent" : "bg-muted";
}

export function ScorePill({
  players,
  matchScore,
  targetScore,
  handScores,
}: ScorePillProps) {
  const [open, setOpen] = useState(false);

  const entries = Object.entries(matchScore)
    .map(([pileId, score]) => ({ pileId, score }))
    .sort((a, b) => b.score - a.score);

  const topScore = entries[0]?.score ?? 0;

  const last = handScores?.[handScores.length - 1];
  const b = last?.breakdown;
  const categories = [
    { label: "Najviše karata", points: 2, winner: b?.mostCards?.winnerPileId },
    { label: "Najviše trefova", points: 1, winner: b?.mostClubs?.winnerPileId },
    { label: "2 tref", points: 1, winner: b?.twoOfClubs?.winnerPileId },
    { label: "10 karo", points: 1, winner: b?.tenOfDiamonds?.winnerPileId },
  ];

  return (
    <>
      {/* Backdrop za tap-outside */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div className="absolute top-0 right-0 z-40 p-2 pt-safe-top pr-safe-right">
        {/* Collapsed pill */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1.5 rounded-token-md bg-surface-raised/95 border border-white/10 px-2.5 py-1.5 shadow active:bg-surface transition-colors"
        >
          <span className="text-[10px] uppercase tracking-wide text-muted">
            Rezultat
          </span>
          <span className="flex items-center gap-1 text-sm font-bold tabular-nums">
            {entries.map((e, i) => (
              <span key={e.pileId} className="flex items-center gap-1">
                <span className={e.score === topScore ? "text-accent" : "text-white"}>
                  {e.score}
                </span>
                {i < entries.length - 1 && <span className="text-muted">·</span>}
              </span>
            ))}
          </span>
          <span
            className={`text-muted text-[10px] transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden
          >
            ▾
          </span>
        </button>

        {/* Expanded breakdown */}
        {open && (
          <div className="absolute right-0 top-full mt-1 w-56 max-w-[calc(100vw-1rem)] rounded-token-lg bg-surface-raised border border-white/10 shadow-xl p-3 animate-fade-in">
            <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted mb-2">
              <span>Rezultat</span>
              <span>cilj {targetScore}</span>
            </div>

            {entries.map((e) => {
              const isLeader = e.score === topScore;
              return (
                <div key={e.pileId} className="flex items-center gap-2 mb-1.5">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${dotClass(e.pileId, isLeader)}`}
                  />
                  <span className="flex-1 text-sm truncate">
                    {pileLabel(e.pileId, players)}
                  </span>
                  <span className="text-sm font-bold tabular-nums">
                    <span className={isLeader ? "text-accent" : "text-white"}>
                      {e.score}
                    </span>
                    <span className="text-muted">/{targetScore}</span>
                  </span>
                </div>
              );
            })}

            <div className="border-t border-white/10 my-2" />

            <div className="text-[10px] uppercase tracking-wide text-muted mb-1.5">
              Poeni{last ? ` · ruka #${last.handNumber}` : ""}
            </div>
            {categories.map((c) => (
              <div key={c.label} className="flex justify-between gap-2 text-xs mb-1">
                <span className="text-muted">
                  {c.label} <span className="text-white/40">({c.points})</span>
                </span>
                <span className="truncate max-w-[88px] text-white/90">
                  {c.winner ? pileLabel(c.winner, players) : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
