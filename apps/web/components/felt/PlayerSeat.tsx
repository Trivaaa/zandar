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
  score,
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

      {/* Pilula se crta samo kad stvarno ima šta da odbrojava. Bez ovoga je
          sjedište na potezu prikazivalo "0" kad rok još nije stigao sa servera —
          broj koji laže je gori od praznog mjesta. */}
      <div className="seat__pill">
        {isActive && (isThinking || secondsRemaining > 0) ? (
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
          {score !== undefined || showCoins ? (
            <span className="seat__numbers">
              {score !== undefined ? (
                <span className="seat__score font-display text-num-sm">{score}</span>
              ) : null}
              {showCoins ? (
                <span className="seat__coins font-display text-num-sm">{coins}</span>
              ) : null}
            </span>
          ) : null}
          {/* Status je izuzetak, ne ukras: "Na vezi" ispod svakog imena je sum.
              Boja stanja zivi u felt.css (.seat__status), ne u utility klasi. */}
          {player.connectionStatus !== "connected" ? (
            <span className="seat__status font-sans text-sm">
              {statusLabel[player.connectionStatus]}
            </span>
          ) : null}
        </div>
      </div>

      <div
        className="seat__fan"
        aria-label={sr.seat.cards(cardCount)}
        style={{ "--fan-n": Math.min(cardCount, 8) } as React.CSSProperties}
      >
        {Array.from({ length: Math.min(cardCount, 8) }, (_, i) => (
          <span key={i} className="seat__fan-slot" style={{ "--fan-i": i } as React.CSSProperties}>
            <CardBack size="xs" />
          </span>
        ))}
      </div>
    </div>
  );
}
