"use client";

import type { RoomPlayer } from "@/lib/api";

// Per-seat brand colours — index = seatIndex (0–3).
// Exported so the join-log can reuse the same palette.
export const SEAT_COLORS = [
  "bg-yellow-500",   // 0 — always the local player in Quick Play
  "bg-emerald-500",  // 1
  "bg-blue-500",     // 2
  "bg-purple-500",   // 3
] as const;

interface Props {
  /** null while the seat is still empty */
  player: RoomPlayer | null;
  isMe: boolean;
  filled: boolean;
  seatIndex: number;
}

/**
 * One seat placeholder in the Quick Play matching screen.
 *
 * empty  → dashed ring + "?" glyph
 * filled → coloured puck + first initial, animate-seat-pop plays once on mount
 *
 * Intentionally has no hover styles — this is a display component, not interactive.
 */
export function SeatPuck({ player, isMe, filled, seatIndex }: Props) {
  const bg = SEAT_COLORS[seatIndex] ?? "bg-zinc-600";

  return (
    <div className="flex flex-col items-center gap-2 w-16">
      <div
        className={[
          "w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center",
          "text-xl font-bold select-none transition-colors duration-200",
          filled
            ? `${bg} text-white animate-seat-pop`
            : "bg-zinc-800/60 border-2 border-dashed border-zinc-600",
        ].join(" ")}
        aria-label={filled && player ? player.displayName : "Prazno sjedište"}
      >
        {filled && player
          ? player.displayName.charAt(0).toUpperCase()
          : <span className="text-zinc-600 text-base">?</span>}
      </div>

      <div
        className={[
          "text-xs text-center max-w-[64px] leading-tight transition-opacity duration-200",
          filled ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        {player?.displayName && (
          <span className="block truncate text-white">{player.displayName}</span>
        )}
        {isMe && (
          <span className="block text-zinc-500 text-[10px]">(ti)</span>
        )}
      </div>
    </div>
  );
}
