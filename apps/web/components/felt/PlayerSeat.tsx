"use client";

import type { ReactNode } from "react";
import { CardBack } from "./CardBack";
import { TurnPill } from "./TurnPill";
import { sr } from "@/lib/sr";
import type { PublicPlayer } from "@/components/felt/types";

export type PlayerSeatProps = {
  player: PublicPlayer;
  isActive?: boolean;
  /** Kept for API symmetry; a seat is never the local player in this layout. */
  isYou?: boolean;
  secondsRemaining?: number;
  totalSeconds?: number;
  cardCount?: number;
  score?: number;
  coins?: number;
  showCoins?: boolean;
  isThinking?: boolean;
  orientation?: "top" | "left" | "right";
  /** Emoji reakcija uz sjedište — da se vidi KO je reagovao. */
  reaction?: ReactNode;
  className?: string | undefined;
};

const statusLabel = {
  connected: sr.connection.connected,
  reconnecting: sr.connection.reconnecting,
  abandoned: sr.connection.abandoned,
} as const;

function initial(name: string) {
  return name.trim().slice(0, 1).toLocaleUpperCase("sr-Latn");
}

export function PlayerSeat({
  player,
  isActive = false,
  secondsRemaining = 0,
  totalSeconds = 20,
  cardCount = 0,
  score = 0,
  coins = 0,
  showCoins = false,
  isThinking = false,
  orientation = "top",
  reaction,
  className = "",
}: PlayerSeatProps) {
  const team = player.teamId === undefined ? undefined : player.teamId === 0 ? "a" : "b";

  return (
    <div
      className={`seat seat--${orientation} ${team ? `seat--team-${team}` : ""} ${className}`}
      data-seat-id={player.id}
      {...(isActive ? { "data-current-turn": true } : {})}
      data-status={player.connectionStatus}
    >
      {reaction ? (
        <div className="seat__reaction" aria-hidden="true">
          {reaction}
        </div>
      ) : null}

      <div className="seat__pill">
        {isActive ? (
          <TurnPill
            isYou={false}
            variant={isThinking ? "thinking" : "countdown"}
            secondsRemaining={secondsRemaining}
            totalSeconds={totalSeconds}
          />
        ) : null}
      </div>

      <div className="seat__body">
        <div className="seat__avatar font-display text-num-sm" aria-hidden="true">
          {initial(player.displayName)}
        </div>

        <div className="seat__meta">
          <span className="seat__name font-sans text-base">{player.displayName}</span>
          <span className="seat__numbers">
            <span className="seat__score font-display text-num-sm">{score}</span>
            {showCoins ? (
              <span className="seat__coins font-display text-num-sm">{coins}</span>
            ) : null}
          </span>
          <span className="seat__status font-sans text-sm text-muted">
            {statusLabel[player.connectionStatus]}
          </span>
        </div>
      </div>

      <div className="seat__fan" aria-label={sr.seat.cards(cardCount)}>
        {Array.from({ length: Math.min(cardCount, 8) }, (_, i) => (
          <span key={i} className="seat__fan-slot" style={{ "--fan-i": i } as React.CSSProperties}>
            <CardBack size="xs" />
          </span>
        ))}
      </div>
    </div>
  );
}
