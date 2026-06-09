"use client";

import { useState } from "react";
import type { AbandonVote, GamePhase } from "@zandar/shared-types";
import { SeatChip } from "@/components/SeatChip";
import { PauseAbandonOverlay } from "@/components/PauseAbandonOverlay";

/**
 * Dev preview za PauseAbandonOverlay (DS B8). Prebacuj fazu i gledaj tri
 * stanja prekida + grace na čipu (reconnecting). Nije produkcijski flow.
 */

const PHASES: { phase: GamePhase; label: string }[] = [
  { phase: "playing", label: "Igra" },
  { phase: "paused_for_reconnect", label: "Pauza" },
  { phase: "abandon_vote", label: "Glasanje" },
  { phase: "abandoned", label: "Prekinut" },
];

const VOTES: Record<string, AbandonVote> = { me: "wait", p2: "end" };

export default function DevPausePage() {
  const [phase, setPhase] = useState<GamePhase>("paused_for_reconnect");
  const [log, setLog] = useState("—");

  return (
    <div className="min-h-[100dvh] bg-surface text-white p-4 pt-safe-top">
      <h1 className="text-lg font-bold mb-3">PauseAbandonOverlay — dev preview</h1>

      <div className="flex flex-wrap gap-1 mb-2">
        {PHASES.map((p) => (
          <button
            key={p.phase}
            type="button"
            onClick={() => setPhase(p.phase)}
            className={`px-3 py-1.5 rounded-token-md text-sm font-bold transition-colors ${
              phase === p.phase
                ? "bg-accent text-accent-contrast"
                : "bg-surface-raised text-muted active:bg-surface"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted mb-3">akcija: {log}</p>

      {/* Simulirani sto — relativni kontejner za overlay */}
      <div className="relative w-full max-w-[360px] mx-auto rounded-token-lg bg-felt border border-white/5 h-[460px] overflow-hidden">
        {/* Grace na čipu: protivnik reconnecting (B1) */}
        <div className="p-3 flex justify-center">
          <SeatChip
            displayName="Nikola"
            cardCount={4}
            connectionStatus={
              phase === "playing" ? "connected" : "reconnecting"
            }
          />
        </div>

        <PauseAbandonOverlay
          phase={phase}
          waitingForName="Nikola"
          abandonVotes={VOTES}
          myPlayerId="me"
          onWait={() => setLog("Sačekaj još (pauza)")}
          onVote={(v) => setLog(`glas: ${v}`)}
          onLeave={() => setLog("Nazad na početnu")}
        />
      </div>
    </div>
  );
}
