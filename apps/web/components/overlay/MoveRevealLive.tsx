"use client";

import { useEffect, useRef, useState } from "react";
import type { PrivateGameStateView } from "@zandar/shared-types";
import { MoveReveal } from "@/components/overlay/MoveReveal";
import { collectToPile } from "@/lib/flyAnimation";

/**
 * MoveRevealLive — sat i let karata za `MoveReveal` (PRD §50).
 *
 * Faze: read (~1.2s statično) → collect (karte odlete u pile kupca) → hide.
 * Ovdje živi sve što je nedeterministično (tajmeri, WAAPI, DOM mjerenja), pa
 * `MoveReveal` ostaje čista funkcija state-a i može da se pregleda u /dev/*.
 *
 * Trail (ništa nije pokupljeno) nema let — prikaz se samo ugasi.
 */

const READ_MS = 1210;

export function MoveRevealLive({ state }: { state: PrivateGameStateView }) {
  const move = state.lastMove ?? null;
  const moveId = move?.moveId ?? null;
  const seatId = move?.playerId ?? null;
  const isCapture = (move?.capturedCards.length ?? 0) > 0;

  const boxRef = useRef<HTMLDivElement>(null);
  // Oba stanja su "koji moveId je stigao dotle", ne bulean — tako se faza
  // izvodi poređenjem i nijedan setState ne mora da se zove sinhrono u efektu
  // (novi potez sam vraća prikaz u "read").
  const [hiddenId, setHiddenId] = useState<string | null>(null);
  const [collectingId, setCollectingId] = useState<string | null>(null);

  useEffect(() => {
    if (!moveId) return;
    let collectT: ReturnType<typeof setTimeout> | undefined;
    const readT = setTimeout(() => {
      // Capture: karte odlete u pile; trail: samo nestane.
      const flyMs = isCapture && seatId ? collectToPile(boxRef.current, seatId) : 0;
      if (flyMs > 0) setCollectingId(moveId);
      collectT = setTimeout(() => setHiddenId(moveId), flyMs);
    }, READ_MS);
    return () => {
      clearTimeout(readT);
      if (collectT) clearTimeout(collectT);
    };
  }, [moveId, seatId, isCapture]);

  if (!move) return null;

  const playerName =
    state.players.find((p) => p.id === move.playerId)?.displayName ?? "?";

  return (
    <div
      ref={boxRef}
      /* Centrirano na play-zonu, ne na gornju trecinu: otkad sjedista stoje na
         luku oko vrha, `top-[18%]` je padao preko protivnika — a panel govori
         KO je odigrao, pa je zaklanjao upravo ono sto imenuje. Preko stola je
         u redu: karte koje panel pokazuje ionako odlete u pile. */
      className="absolute top-[54%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none max-w-[92vw]"
    >
      <MoveReveal
        move={move}
        playerName={playerName}
        visible={move.moveId !== hiddenId}
        phase={move.moveId === collectingId ? "collect" : "read"}
      />
    </div>
  );
}
