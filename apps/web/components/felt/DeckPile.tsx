"use client";

import { CardBack } from "./CardBack";
import { sr } from "@/lib/sr";
import type { CardSize } from "@/components/felt/types";

export type DeckPileProps = {
  remaining: number;
  size?: CardSize;
  className?: string | undefined;
};

const sizeClass: Record<CardSize, string> = {
  xs: "card--xs",
  sm: "card--sm",
  md: "card--md",
  lg: "card--lg",
};

/** Physical layers for a given count: clamp(round(count / 5), 1, 9). */
function layersFor(remaining: number): number {
  if (remaining <= 0) return 0;
  return Math.min(9, Math.max(1, Math.round(remaining / 5)));
}

export function DeckPile({ remaining, size = "sm", className = "" }: DeckPileProps) {
  const layers = layersFor(remaining);

  return (
    <div className={`deck ${className}`} data-deck data-empty={layers === 0}>
      <div className="deck__stack" style={{ "--deck-layers": layers } as React.CSSProperties}>
        {layers === 0 ? (
          <div className="deck__slot" aria-hidden="true" />
        ) : (
          Array.from({ length: layers }, (_, i) => {
            const isTop = i === layers - 1;
            const style = { "--deck-i": i } as React.CSSProperties;
            /* Only the top card wears the lattice; the layers under it are
               plain cardstock, which is what makes a stack read as a stack. */
            return isTop ? (
              <div key={i} className="deck__layer" style={style}>
                <CardBack size={size} />
              </div>
            ) : (
              <div key={i} className="deck__layer" style={style} aria-hidden="true">
                <div className={`card ${sizeClass[size]}`}>
                  <div className="card-plain" />
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="deck__badge">
        <span className="deck__count font-mono">{remaining}</span>
      </div>
      <span className="deck__caption font-sans text-sm text-muted">{sr.deck.remaining}</span>
    </div>
  );
}
