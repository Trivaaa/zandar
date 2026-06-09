"use client";

import type { ReactNode } from "react";
import type { ConnectionStatus } from "@zandar/shared-types";

/**
 * SeatBubble — kružni prikaz igrača za felt layout (DS Faza B, full-felt).
 *
 * Plutajući "puck" na ivici stola (gore/lijevo/desno/dole). Bot-agnostičan —
 * ne zna za isBot. Sadrži: avatar (inicijal), badge broja karata (NE poleđine),
 * turn ring + timer kad je na potezu, team-boja (4P), connection status.
 *
 * Pozicioniranje ide preko `className` (apsolutno unutar felt root-a).
 */

type SeatBubbleProps = {
  displayName: string;
  cardCount: number;
  isCurrentTurn?: boolean;
  connectionStatus: ConnectionStatus;
  teamId?: number;
  isMe?: boolean;
  /** TurnTimer (B5) kad je na potezu. */
  timer?: ReactNode;
  /** Apsolutno pozicioniranje (npr. "top-3 left-1/2 -translate-x-1/2"). */
  className?: string;
};

function teamBorder(teamId?: number): string {
  if (teamId === 0) return "border-team-a";
  if (teamId === 1) return "border-team-b";
  return "border-white/15";
}

export function SeatBubble({
  displayName,
  cardCount,
  isCurrentTurn = false,
  connectionStatus,
  teamId,
  isMe = false,
  timer,
  className = "",
}: SeatBubbleProps) {
  const ring = isCurrentTurn
    ? "ring-2 ring-turn animate-turn-pulse"
    : "ring-1 ring-white/10";
  const dimmed = connectionStatus === "abandoned";

  return (
    <div
      className={`absolute flex flex-col items-center gap-1 ${dimmed ? "opacity-50" : ""} ${className}`}
      data-current-turn={isCurrentTurn}
    >
      <div className="relative">
        <div
          className={`w-14 h-14 rounded-full bg-surface-raised border-2 ${teamBorder(teamId)} ${ring} flex items-center justify-center text-lg font-bold shadow-lg select-none`}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
        <span
          className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-accent text-accent-contrast text-[11px] font-bold leading-5 text-center border-2 border-felt"
          aria-label={`${cardCount} karata u ruci`}
        >
          {cardCount}
        </span>
        {connectionStatus === "reconnecting" && (
          <span
            className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-warn border border-felt animate-status-blink"
            aria-label="veza se vraća"
          />
        )}
      </div>

      {isCurrentTurn && timer ? (
        <div className="leading-none">{timer}</div>
      ) : null}

      <span className="text-xs font-semibold text-white drop-shadow max-w-[88px] truncate">
        {displayName}
        {isMe && <span className="text-muted"> (ti)</span>}
      </span>
    </div>
  );
}
