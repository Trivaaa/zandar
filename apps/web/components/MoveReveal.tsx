"use client";

import { useEffect, useState } from "react";
import type { PrivateGameStateView } from "@zandar/shared-types";
import { Card } from "@/components/Card";

/**
 * MoveReveal — kratko prikaže ŠTA je zadnji potez uradio (PRD §50, feedback):
 * ko je igrao, koju kartu, i šta je pokupio (ili ŽANDAR — počistio sto).
 *
 * Rješava: kad neko kupi/požandara, karte samo nestanu sa stola i ne zna se šta
 * se desilo. Ovdje se odigrana + pokupljene karte vide ~1.8s (javni podaci iz
 * `state.lastMove`). Bot i čovjek isti prikaz (anti-leak).
 */
export function MoveReveal({ state }: { state: PrivateGameStateView }) {
  const move = state.lastMove ?? null;
  const moveId = move?.moveId ?? null;

  // Bez synchronous setState-in-effect: pamtimo koji je moveId već sakriven.
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  useEffect(() => {
    if (!moveId) return;
    const t = setTimeout(() => setHiddenId(moveId), 1800);
    return () => clearTimeout(t);
  }, [moveId]);

  if (!move || move.moveId === hiddenId) return null;

  const name =
    state.players.find((p) => p.id === move.playerId)?.displayName ?? "?";
  const captured = move.capturedCards;
  const isJackSweep = move.playedCard.rank === "J" && captured.length > 0;
  const isCapture = captured.length > 0;

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

        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <Card card={move.playedCard} size="sm" />
          {isCapture && (
            <>
              <span className="text-muted text-lg leading-none">→</span>
              <div className="flex gap-1 flex-wrap justify-center">
                {captured.map((c) => (
                  <Card key={c.id} card={c} size="sm" />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
