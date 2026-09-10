"use client";

import type { CardSize } from "@/components/felt/types";

const sizeClass: Record<CardSize, string> = {
  xs: "card--xs",
  sm: "card--sm",
  md: "card--md",
  lg: "card--lg",
  /** Sirina dolazi iz --table-card-w koji postavlja .table__cards. */
  fluid: "card--fluid",
};

export type CardBackProps = {
  size?: CardSize;
  /** Deal-in animation index; drives the stagger delay. */
  dealIndex?: number | undefined;
  animateDeal?: boolean;
  className?: string;
};

/**
 * One visual language for the deck, opponent fans and deal ghosts.
 * Pure presentation: no state, no logic.
 */
export function CardBack({
  size = "md",
  dealIndex,
  animateDeal = false,
  className = "",
}: CardBackProps) {
  return (
    <div
      aria-hidden="true"
      className={`card ${sizeClass[size]} ${animateDeal ? "card-deal" : ""} ${className}`}
      style={dealIndex === undefined ? undefined : ({ "--deal-index": dealIndex } as React.CSSProperties)}
    >
      <div className="card-back" />
    </div>
  );
}
