"use client";

import type { ReactNode } from "react";
import type { ConnectionStatus } from "@zandar/shared-types";

/**
 * SeatBubble — kružni prikaz igrača za felt layout (DS v3.2, full-felt).
 *
 * Plutajući "puck" na ivici stola (gore/lijevo/desno/dole). Bot-agnostičan —
 * ne zna za isBot. Sadrži: avatar (inicijal), broj karata kao lepeza poleđina
 * (generičke, bez info-leak-a), turn arc-timer iznad logoa, team-boja (4P),
 * connection status.
 *
 * Pozicioniranje ide preko `className` (apsolutno unutar felt root-a).
 */

type BacksOrientation = "top" | "left" | "right";

type SeatBubbleProps = {
  displayName: string;
  cardCount: number;
  isCurrentTurn?: boolean;
  connectionStatus: ConnectionStatus;
  teamId?: number;
  isMe?: boolean;
  /** Prikaži lepezu poleđina (broj karata protivnika). */
  showBacks?: boolean;
  /** Orijentacija lepeze: top (partner) ili left/right (bočni — horizontalno). */
  backsOrientation?: BacksOrientation;
  /** TurnTimer (B5, size="arc") iznad logoa kad je na potezu. */
  timer?: ReactNode;
  /** Apsolutno pozicioniranje (npr. "top-3 left-1/2 -translate-x-1/2"). */
  className?: string;
  /** ID igrača — sidro za fly-to-pile animaciju (PRD §50.5). */
  seatId?: string;
};

/** Lepeza poleđina — vizuelni broj karata (generičke, bez info-leak-a). */
function BackFan({
  count,
  orientation,
}: {
  count: number;
  orientation: BacksOrientation;
}) {
  // Bočni igrači: veće, horizontalne karte (landscape), naslagane vertikalno.
  if (orientation !== "top") {
    const shown = Math.min(count, 6);
    const mid = (shown - 1) / 2;
    return (
      <div className="flex flex-col items-center">
        {Array.from({ length: shown }).map((_, i) => (
          <div
            key={i}
            className="w-10 h-7 rounded-[4px] bg-surface-raised border border-accent/40 shadow-md"
            style={{
              marginTop: i === 0 ? 0 : -18,
              transform: `rotate(${(i - mid) * 4}deg)`,
            }}
          >
            <div className="m-1 h-[calc(100%-8px)] rounded-[2px] border border-accent/20" />
          </div>
        ))}
      </div>
    );
  }
  // Partner (gore): vertikalne karte u redu.
  const shown = Math.min(count, 7);
  const mid = (shown - 1) / 2;
  return (
    <div className="flex justify-center">
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          className="w-5 h-7 rounded-[3px] bg-surface-raised border border-accent/30 shadow-sm"
          style={{
            marginLeft: i === 0 ? 0 : -10,
            transform: `rotate(${(i - mid) * 5}deg)`,
            transformOrigin: "bottom center",
          }}
        />
      ))}
    </div>
  );
}

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
  showBacks = false,
  backsOrientation = "top",
  timer,
  className = "",
  seatId,
}: SeatBubbleProps) {
  const ring = isCurrentTurn
    ? "ring-2 ring-turn animate-turn-pulse"
    : "ring-1 ring-white/10";
  const dimmed = connectionStatus === "abandoned";

  return (
    <div
      className={`absolute flex flex-col items-center gap-1 ${dimmed ? "opacity-50" : ""} ${className}`}
      data-current-turn={isCurrentTurn}
      data-seat-id={seatId}
    >
      {/* Turn timer — pilula IZNAD ikonice; samo kad je na potezu (DS B5 v2) */}
      {isCurrentTurn && timer ? <div className="mb-0.5">{timer}</div> : null}

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

      {showBacks && cardCount > 0 && (
        <BackFan count={cardCount} orientation={backsOrientation} />
      )}

      <span className="text-xs font-semibold text-white drop-shadow max-w-[88px] truncate">
        {displayName}
        {isMe && <span className="text-muted"> (ti)</span>}
      </span>
    </div>
  );
}
