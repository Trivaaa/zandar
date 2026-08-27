"use client";

import type { Card, LastMove } from "@zandar/shared-types";
import { PlayingCard } from "@/components/felt/PlayingCard";
import { sr } from "@/lib/sr";

/**
 * MoveReveal — prikazuje ŠTA je zadnji potez uradio (ko, koju kartu, šta je
 * pokupio, ili ŽANDAR). Čista prezentacija: sat drži roditelj (`MoveRevealLive`),
 * ova komponenta samo crta stanje koje joj je predato.
 *
 * Svaka karta nosi `[data-reveal-card]` — to je sidro po kojem `collectToPile`
 * odnese karte u pile kupca. Zato collect faza NE smije animirati nijedan
 * element koji je predak tim kartama (vidi `.reveal::before` u overlay.css).
 */

export type MoveRevealProps = {
  move: LastMove;
  playerName: string;
  visible: boolean;
  /** Roditelj drži sat; ovo je samo stanje. */
  phase: "read" | "collect";
  className?: string | undefined;
};

export function MoveReveal({
  move,
  playerName,
  visible,
  phase,
  className = "",
}: MoveRevealProps) {
  if (!visible) return null;

  const captured: Card[] = move.capturedCards;
  const isSweep = move.playedCard.rank === "J" && captured.length > 0;

  const headline = isSweep
    ? sr.reveal.sweep
    : captured.length > 0
      ? sr.reveal.captures(playerName)
      : sr.reveal.trails(playerName);

  return (
    <div
      className={`reveal ${isSweep ? "reveal--sweep" : ""} ${
        phase === "collect" ? "reveal--collect" : ""
      } ${className}`}
      data-phase={phase}
      data-sweep={isSweep}
      role="status"
    >
      <p className={`reveal__headline font-display ${isSweep ? "text-2xl" : "text-xl"}`}>
        {headline}
      </p>

      <div className="reveal__body">
        <div className="reveal__group">
          <span className="reveal__label font-sans text-sm text-muted">
            {sr.reveal.playedLabel}
          </span>
          <div className="reveal__cards">
            <span className="reveal__card" data-reveal-card data-card-id={move.playedCard.id}>
              <PlayingCard card={move.playedCard} size={isSweep ? "md" : "sm"} />
            </span>
          </div>
        </div>

        {captured.length > 0 ? (
          <div className="reveal__group">
            <span className="reveal__label font-sans text-sm text-muted">
              {sr.reveal.takenLabel}
            </span>
            <div className="reveal__cards">
              {captured.map((c, i) => (
                <span
                  key={c.id}
                  className="reveal__card"
                  data-reveal-card
                  data-card-id={c.id}
                  style={{ ["--reveal-i" as string]: i }}
                >
                  <PlayingCard card={c} size="xs" />
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {move.isAutoPlay ? (
        <span className="reveal__auto font-sans text-sm text-muted">{sr.reveal.autoPlay}</span>
      ) : null}
    </div>
  );
}
