"use client";

import { useState } from "react";
import type { HandScore, PublicPlayer } from "@zandar/shared-types";
import { ScorePill } from "@/components/ScorePill";

/**
 * Dev preview za ScorePill (DS B6). Prebacuj 2P/3P/4P; tap pill → breakdown.
 * Overlay ne troši layout. Nije produkcijski flow.
 */

type Count = 2 | 3 | 4;

function mock(count: Count): {
  players: PublicPlayer[];
  matchScore: Record<string, number>;
  handScores: HandScore[];
} {
  const names = ["Ti", "Marko", "Jovana", "Stefan"];
  const players: PublicPlayer[] = Array.from({ length: count }).map((_, i) => ({
    id: i === 0 ? "me" : `p${i}`,
    displayName: names[i],
    seatIndex: i,
    isHost: i === 0,
    teamId: count === 4 ? i % 2 : undefined,
    connectionStatus: "connected",
  }));

  let matchScore: Record<string, number>;
  let winners: { mc?: string; cl?: string; tc?: string; td?: string };

  if (count === 4) {
    matchScore = { "team-0": 14, "team-1": 9 };
    winners = { mc: "team-0", cl: "team-1", tc: "team-0", td: "team-0" };
  } else if (count === 3) {
    matchScore = { me: 11, p1: 8, p2: 6 };
    winners = { mc: "me", cl: "p1", tc: "me", td: "p2" };
  } else {
    matchScore = { me: 13, p1: 10 };
    winners = { mc: "me", cl: "me", tc: "p1", td: "me" };
  }

  const handScores: HandScore[] = [
    {
      handNumber: 3,
      pointsByPile: matchScore,
      breakdown: {
        mostCards: { winnerPileId: winners.mc, cardCountByPile: {}, points: 2 },
        mostClubs: { winnerPileId: winners.cl, clubCountByPile: {}, points: 1 },
        twoOfClubs: { winnerPileId: winners.tc, points: 1 },
        tenOfDiamonds: { winnerPileId: winners.td, points: 1 },
      },
    },
  ];

  return { players, matchScore, handScores };
}

export default function DevScorePage() {
  const [count, setCount] = useState<Count>(4);
  const s = mock(count);

  return (
    <div className="min-h-[100dvh] bg-surface text-white p-4 pt-safe-top">
      <h1 className="text-lg font-bold mb-3">ScorePill — dev preview</h1>

      <div className="flex gap-1 mb-4">
        {([2, 3, 4] as const).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCount(n)}
            className={`px-3 py-1 rounded-token-sm text-sm font-bold transition-colors ${
              count === n
                ? "bg-accent text-accent-contrast"
                : "bg-surface-raised text-muted active:bg-surface"
            }`}
          >
            {n}P
          </button>
        ))}
      </div>

      {/* Simulirani sto — relativni kontejner za overlay */}
      <div className="relative w-[330px] max-w-full mx-auto rounded-token-lg bg-felt border border-white/5 h-[420px] flex items-center justify-center overflow-hidden">
        <span className="text-muted text-sm">
          ← ScorePill je u gornjem desnom uglu (tap)
        </span>
        <ScorePill
          players={s.players}
          matchScore={s.matchScore}
          targetScore={21}
          handScores={s.handScores}
        />
      </div>
    </div>
  );
}
