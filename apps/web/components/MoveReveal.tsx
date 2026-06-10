"use client";

import { useEffect, useRef, useState } from "react";
import type { PrivateGameStateView } from "@zandar/shared-types";
import { Card } from "@/components/Card";
import { collectToPile } from "@/lib/flyAnimation";

/**
 * MoveReveal — kratko prikaže ŠTA je zadnji potez uradio (PRD §50, feedback):
 * ko je igrao, koju kartu, i šta je pokupio (ili ŽANDAR — počistio sto). Na kraju
 * prikaza (za kupljenje) karte "collect"-uju — odlete u pile kupca.
 *
 * Faze: read (~1.1s static) → collect (capture: karte odlete ~0.5s) → hide.
 * Javni podaci iz `state.lastMove`; bot i čovjek isti prikaz (anti-leak).
 */

const READ_MS = 1210;

export function MoveReveal({ state }: { state: PrivateGameStateView }) {
  const move = state.lastMove ?? null;
  const moveId = move?.moveId ?? null;
  const seatId = move?.playerId ?? null;
  const isCapture = (move?.capturedCards.length ?? 0) > 0;

  const cardsRef = useRef<HTMLDivElement>(null);
  // Bez synchronous setState-in-effect: pamtimo koji je moveId već sakriven.
  const [hiddenId, setHiddenId] = useState<string | null>(null);

  useEffect(() => {
    if (!moveId) return;
    let collectT: ReturnType<typeof setTimeout> | undefined;
    const readT = setTimeout(() => {
      // Capture: karte odlete u pile; trail: samo nestane.
      const flyMs = isCapture && seatId ? collectToPile(cardsRef.current, seatId) : 0;
      collectT = setTimeout(() => setHiddenId(moveId), flyMs);
    }, READ_MS);
    return () => {
      clearTimeout(readT);
      if (collectT) clearTimeout(collectT);
    };
  }, [moveId, seatId, isCapture]);

  if (!move || move.moveId === hiddenId) return null;

  const name =
    state.players.find((p) => p.id === move.playerId)?.displayName ?? "?";
  const captured = move.capturedCards;
  const isJackSweep = move.playedCard.rank === "J" && captured.length > 0;

  const label = isJackSweep
    ? "ŽANDAR — počistio sto!"
    : isCapture
      ? "kupi"
      : "spušta";

  return (
    <div
      key={move.moveId}
      className="absolute top-[18%] left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-fade-in max-w-[92vw]"
    >
      <div
        className={`flex flex-col items-center gap-1.5 rounded-token-lg bg-surface-raised/95 px-3 py-2 shadow-xl border ${
          isJackSweep ? "border-accent ring-1 ring-accent/50" : "border-white/10"
        }`}
      >
        <span className="text-xs font-semibold text-center">
          {isJackSweep && <span className="mr-1">🃏</span>}
          <span className="text-accent">{name}</span>{" "}
          <span className={isJackSweep ? "text-accent font-bold" : "text-muted"}>
            {label}
          </span>
          {move.isAutoPlay && <span className="text-muted"> · auto</span>}
        </span>

        <div ref={cardsRef} className="flex items-center gap-1.5 flex-wrap justify-center">
          <span data-reveal-card>
            <Card card={move.playedCard} size="sm" />
          </span>
          {isCapture && (
            <>
              <span className="text-muted text-lg leading-none">→</span>
              <div className="flex gap-1 flex-wrap justify-center">
                {captured.map((c) => (
                  <span data-reveal-card key={c.id}>
                    <Card card={c} size="sm" />
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
