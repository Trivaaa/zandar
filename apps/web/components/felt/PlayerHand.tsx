"use client";

import type { Card, CardSize } from "@/components/felt/types";
import { sr } from "@/lib/sr";
import { PlayingCard } from "./PlayingCard";

export type PlayerHandProps = {
  cards: Card[];
  /** id of the lifted card. Selecting lifts; playing is the parent's business. */
  selectedCardId?: string | null | undefined;
  disabledCardIds?: string[];
  dimmedCardIds?: string[];
  faceUp?: boolean;
  /** Defaults to `sm`: eight `sm` cards with the 18px overlap fit a 360px viewport. */
  size?: CardSize;
  animateDeal?: boolean;
  onSelect?: ((card: Card) => void) | undefined;
  className?: string | undefined;
};

export function PlayerHand({
  cards,
  selectedCardId = null,
  disabledCardIds = [],
  dimmedCardIds = [],
  faceUp = true,
  size = "sm",
  animateDeal = false,
  onSelect,
  className = "",
}: PlayerHandProps) {
  if (cards.length === 0) {
    return (
      <div className={`hand__empty ${className}`}>
        <p className="text-base text-muted font-sans">{sr.table.handEmpty}</p>
      </div>
    );
  }

  return (
    <div
      className={`hand ${className}`}
      data-many={cards.length > 6}
      role="group"
      aria-label="Tvoja ruka"
    >
      {cards.map((c, i) => (
        <div
          key={c.id}
          className="hand__slot"
          data-selected={c.id === selectedCardId}
          style={{ "--hand-i": i, "--hand-n": cards.length } as React.CSSProperties}
        >
          <PlayingCard
            card={c}
            size={size}
            faceUp={faceUp}
            selectable={!disabledCardIds.includes(c.id)}
            selected={c.id === selectedCardId}
            dimmed={dimmedCardIds.includes(c.id)}
            disabled={disabledCardIds.includes(c.id)}
            animateDeal={animateDeal}
            dealIndex={i}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  );
}
