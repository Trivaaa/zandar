"use client";

import { sr } from "@/lib/sr";

export type TurnBannerProps = {
  isYou: boolean;
  /** Ignored when isYou. */
  displayName?: string;
  className?: string | undefined;
};

/**
 * Redundant with the pill on purpose. A sentence, so font-sans at bold weight —
 * never the display face.
 */
export function TurnBanner({ isYou, displayName = "", className = "" }: TurnBannerProps) {
  return (
    <div className={`banner ${isYou ? "banner--you" : ""} ${className}`} role="status">
      <span className="banner__text font-sans text-xl font-bold">
        {isYou ? sr.turn.you : sr.turn.other(displayName)}
      </span>
    </div>
  );
}
