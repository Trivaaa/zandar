"use client";

import { sr } from "@/lib/sr";

export type TurnPillProps = {
  /** Remaining seconds. The clock lives in the parent; this only renders it. */
  secondsRemaining?: number;
  totalSeconds?: number;
  variant?: "countdown" | "thinking";
  className?: string | undefined;
};

const URGENT_AT = 5;

/**
 * Odbrojavanje na TUDJEM sjedistu. Horizontalna pilula, nikad prsten ni luk.
 * Praznjenje je scaleX() unaprijed nacrtane trake; boja hitnosti je obicna
 * zamjena svojstva, ne animirana.
 *
 * Tvoj potez NE ide kroz ovu komponentu — on je traka u TurnBanner-u.
 */
export function TurnPill({
  secondsRemaining = 0,
  totalSeconds = 1,
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
        className={`pill pill--thinking ${className}`}
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
      className={`pill pill--countdown ${className}`}
      data-urgent={urgent}
      role="timer"
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
    </div>
  );
}
