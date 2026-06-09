"use client";

import { useState } from "react";
import { GameTable } from "@/components/GameTable";

/**
 * Dev preview za GameTable pozicijski grid (DS A2).
 * Prebacuj 2/3/4 igrača i provjeri raspored na pravom telefonu.
 * Nije dio produkcijskog flow-a.
 */
export default function DevTablePage() {
  const [count, setCount] = useState<2 | 3 | 4>(4);

  return (
    <div className="relative">
      <GameTable playerCount={count} />

      {/* Floating count switcher */}
      <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex gap-1 bg-surface-raised/95 rounded-token-md px-2 py-1.5 border border-white/10 mt-safe-top">
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
    </div>
  );
}
