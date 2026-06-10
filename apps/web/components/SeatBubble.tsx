"use client";

import type { ReactNode } from "react";
import type { ConnectionStatus } from "@zandar/shared-types";
import { CardBack } from "@/components/CardBack";

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
  /** Aktivna reakcija (emoji) — prikazuje se uz sjedište da se vidi KO je reagovao. */
  reaction?: ReactNode;
  /** Reakciju prikaži ispod (za gornje sjedište, da ne klizne van ekrana). */
  reactionBelow?: boolean;
};

/** Lepeza poleđina — vizuelni broj karata (generičke, bez info-leak-a). */
function BackFan({
  count,
  orientation,
}: {
  count: number;
  orientation: BacksOrientation;
}) {
  // Bočni igrači: veće, horizontalne (landscape) poleđine, naslagane vertikalno.
  if (orientation !== "top") {
    const shown = Math.min(count, 5);
    const mid = (shown - 1) / 2;
    return (
      <div className="flex flex-col items-center">
        {Array.from({ length: shown }).map((_, i) => (
          <div
            key={i}
            style={{
              marginTop: i === 0 ? 0 : -22,
              transform: `rotate(${(i - mid) * 4}deg)`,
            }}
          >
            <CardBack size="sm" />
          </div>
        ))}
      </div>
    );
  }
  // Partner (gore): uspravne poleđine u blagom luku.
  const shown = Math.min(count, 6);
  const mid = (shown - 1) / 2;
  return (
    <div className="flex justify-center">
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          style={{
            marginLeft: i === 0 ? 0 : -16,
            transform: `rotate(${(i - mid) * 5}deg)`,
            transformOrigin: "bottom center",
          }}
        >
          <CardBack size="xs" />
        </div>
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
  reaction,
  reactionBelow = false,
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
      {/* Reakcija (emoji) uz sjedište — da se vidi KO je reagovao (DS §12 / feedback) */}
      {reaction && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-fade-in ${
            reactionBelow ? "-bottom-7" : "-top-7"
          }`}
        >
          <div className="w-9 h-9 rounded-full bg-surface-raised/95 border border-white/10 shadow-lg flex items-center justify-center text-xl">
            {reaction}
          </div>
        </div>
      )}

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
