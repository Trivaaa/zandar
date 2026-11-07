"use client";

import type { Card, CardSize } from "@/components/felt/types";
import { LockIcon } from "@/components/icons";
import { sr } from "@/lib/sr";
import { PlayingCard } from "./PlayingCard";

export type PlayerHandProps = {
  cards: Card[];
  /** id of the lifted card. Selecting lifts; playing is the parent's business. */
  selectedCardId?: string | null | undefined;
  /** Više podignutih karata (Raub zamjena). Uz `selectedCardId` važe oba. */
  selectedCardIds?: readonly string[] | undefined;
  /** Zaključane karte (Raub: karta s talona) — katanac, ne mogu se izabrati. */
  lockedCardIds?: readonly string[] | undefined;
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
  selectedCardIds = [],
  lockedCardIds = [],
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
      {cards.map((c, i) => {
        const selected = c.id === selectedCardId || selectedCardIds.includes(c.id);
        const locked = lockedCardIds.includes(c.id);
        const disabled = locked || disabledCardIds.includes(c.id);
        return (
          <div
            key={c.id}
            className="hand__slot"
            data-selected={selected}
            {...(locked ? { "data-locked": true } : {})}
            style={{ "--hand-i": i, "--hand-n": cards.length } as React.CSSProperties}
          >
            <PlayingCard
              card={c}
              size={size}
              faceUp={faceUp}
              selectable={!disabled}
              selected={selected}
              dimmed={dimmedCardIds.includes(c.id)}
              disabled={disabled}
              animateDeal={animateDeal}
              dealIndex={i}
              onSelect={onSelect}
            />
            {locked ? (
              <span className="hand__lock" aria-label="Karta s talona">
                <LockIcon className="h-3.5 w-3.5" />
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
