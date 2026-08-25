"use client";

import { sr } from "@/lib/sr";

export type TurnPillProps = {
  /** Remaining seconds. The clock lives in the parent; this only renders it. */
  secondsRemaining?: number;
  totalSeconds?: number;
  isYou?: boolean;
  variant?: "countdown" | "thinking";
  className?: string | undefined;
};

const URGENT_AT = 5;

/**
 * The signature element. A horizontal pill, never a ring or arc.
 * Depletion is scaleX() of a pre-rendered bar; the urgency colour is a plain
 * property swap, not an animated one.
 *
 * `isYou` is free-standing — it is never mounted inside PlayerSeat.
 */
export function TurnPill({
  secondsRemaining = 0,
  totalSeconds = 1,
  isYou = false,
  variant = "countdown",
  className = "",
}: TurnPillProps) {
  const safeTotal = totalSeconds > 0 ? totalSeconds : 1;
  const clamped = Math.min(Math.max(secondsRemaining, 0), safeTotal);
  const fill = clamped / safeTotal;
  const urgent = variant === "countdown" && clamped <= URGENT_AT;

  if (variant === "thinking") {
    return (
      <div
        className={`pill pill--thinking ${isYou ? "pill--you" : "pill--other"} ${className}`}
        role="status"
      >
        <span className="pill__label font-sans text-base">{sr.turn.thinking}</span>
        <span className="pill__dots" aria-hidden="true">
          <i className="pill__dot" />
          <i className="pill__dot" />
          <i className="pill__dot" />
        </span>
      </div>
    );
  }

  return (
    <div
      className={`pill pill--countdown ${isYou ? "pill--you" : "pill--other"} ${className}`}
      data-urgent={urgent}
      role="timer"
      aria-label={isYou ? sr.turn.you : undefined}
    >
      <span className="pill__track">
        <span
          className="pill__fill"
          style={{ "--pill-fill": fill } as React.CSSProperties}
        />
      </span>
      <span className="pill__body">
        <span className="pill__clock font-display text-num-sm">{Math.ceil(clamped)}</span>
      </span>

      <span className="pill__notch" aria-hidden="true" />
    </div>
  );
}
