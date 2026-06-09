"use client";

import { useState } from "react";
import type { PublicPlayer } from "@zandar/shared-types";
import { GameTable } from "@/components/GameTable";
import { TableSeats } from "@/components/TableSeats";

/**
 * Dev preview za pozicijski grid (DS A2) + popunjene SeatChip pozicije (DS B2).
 * Prebacuj 2/3/4 igrača i "prazno/popunjeno" pa provjeri raspored na pravom
 * telefonu (B1+B2 zajedno rješavaju 4P responsive bug). Nije produkcijski flow.
 */

const ME = "me";

/** Mock public state za N igrača. Ja sam uvijek seat 0 (dole). */
function mockState(count: 2 | 3 | 4) {
  const names = ["Ti", "Marko", "Jovana", "Stefan"];
  const players: PublicPlayer[] = Array.from({ length: count }).map((_, i) => ({
    id: i === 0 ? ME : `p${i}`,
    displayName: names[i],
    seatIndex: i,
    isHost: i === 0,
    // 4P timovi: sjedišta 0+2 = tim A (0), 1+3 = tim B (1)
    teamId: count === 4 ? i % 2 : undefined,
    connectionStatus:
      i === 1 && count >= 3 ? "reconnecting" : "connected",
  }));

  const handCounts: Record<string, number> = {};
  const capturedCounts: Record<string, number> = {};
  players.forEach((p, i) => {
    handCounts[p.id] = 4 - (i % 3); // 4,3,2,4…
    capturedCounts[p.id] = i * 3;
  });

  // protivnik na potezu (ne ja) — da se vidi turn ring
  const currentPlayerId = count >= 2 ? "p1" : ME;

  return { players, handCounts, capturedCounts, currentPlayerId };
}

export default function DevTablePage() {
  const [count, setCount] = useState<2 | 3 | 4>(4);
  const [filled, setFilled] = useState(true);

  const s = mockState(count);

  return (
    <div className="relative">
      {filled ? (
        <TableSeats
          players={s.players}
          myPlayerId={ME}
          currentPlayerId={s.currentPlayerId}
          handCounts={s.handCounts}
          capturedCounts={s.capturedCounts}
        />
      ) : (
        <GameTable playerCount={count} />
      )}

      {/* Floating kontrole */}
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex gap-2 items-center bg-surface-raised/95 rounded-token-md px-2 py-1.5 border border-white/10 mt-safe-top">
        <div className="flex gap-1">
          {([2, 3, 4] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setCount(n)}
              className={`px-3 py-1 rounded-token-sm text-sm font-bold transition-colors ${
                count === n
                  ? "bg-accent text-accent-contrast"
                  : "bg-surface text-muted active:bg-surface-raised"
              }`}
            >
              {n}P
            </button>
          ))}
        </div>
        <span className="w-px h-5 bg-white/10" />
        <button
          type="button"
          onClick={() => setFilled((f) => !f)}
          className={`px-3 py-1 rounded-token-sm text-sm font-bold transition-colors ${
            filled
              ? "bg-accent text-accent-contrast"
              : "bg-surface text-muted active:bg-surface-raised"
          }`}
        >
          {filled ? "Seats" : "Prazno"}
        </button>
      </div>
    </div>
  );
}
