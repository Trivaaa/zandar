"use client";

import { useRef } from "react";
import type { Card, CardSize } from "@/components/felt/types";
import { LockIcon } from "@/components/icons";
import { sr } from "@/lib/sr";
import type { DropTarget } from "@/lib/handTap";
import { useCardDrag } from "@/lib/useCardDrag";
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
  /**
   * Ruka je samo za gledanje (Raub: licitacija, tuđi potez). Karte ostaju
   * neklikabilne, ali se NE prigušuju — inače se ne vidi šta imaš.
   */
  idle?: boolean;
  faceUp?: boolean;
  /** Defaults to `sm`: eight `sm` cards with the 18px overlap fit a 360px viewport. */
  size?: CardSize;
  animateDeal?: boolean;
  /**
   * Ključ mjesta u ruci (podrazumijevano `card.id`). Raub ga koristi da mjesto
   * preživi otkrivanje karata djelioca, pa se karta okrene umjesto da se zamijeni.
   */
  slotKey?: ((card: Card, i: number) => string) | undefined;
  onSelect?: ((card: Card) => void) | undefined;
  /**
   * Prevlačenje na sto — druga opcija uz tap (vidi `useCardDrag`). Bez
   * `onDragDrop` ruka se ne može vući; tap radi isto u oba slučaja.
   */
  onDragStart?: ((card: Card) => void) | undefined;
  onDragDrop?: ((card: Card, target: DropTarget) => void) | undefined;
  onDragCancel?: ((card: Card) => void) | undefined;
  className?: string | undefined;
};

export function PlayerHand({
  cards,
  selectedCardId = null,
  selectedCardIds = [],
  lockedCardIds = [],
  disabledCardIds = [],
  dimmedCardIds = [],
  idle = false,
  faceUp = true,
  size = "sm",
  animateDeal = false,
  slotKey,
  onSelect,
  onDragStart,
  onDragDrop,
  onDragCancel,
  className = "",
}: PlayerHandProps) {
  const ref = useRef<HTMLDivElement>(null);
  const byId = (id: string) => cards.find((c) => c.id === id);
  const draggable = !!onDragDrop && !idle;
  useCardDrag(ref, {
    // Prazna ruka crta drugi element — slušaoci se kače kad karte stignu.
    enabled: draggable && cards.length > 0,
    onStart: (id) => {
      const c = byId(id);
      if (c) onDragStart?.(c);
    },
    onDrop: (id, target) => {
      const c = byId(id);
      if (c) onDragDrop?.(c, target);
    },
    onCancel: (id) => {
      const c = byId(id);
      if (c) onDragCancel?.(c);
    },
  });

  if (cards.length === 0) {
    return (
      <div className={`hand__empty ${className}`}>
        <p className="text-base text-muted font-sans">{sr.table.handEmpty}</p>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`hand ${className}`}
      data-many={cards.length > 6}
      {...(draggable ? { "data-draggable": true } : {})}
      {...(idle ? { "data-idle": true } : {})}
      role="group"
      aria-label="Tvoja ruka"
    >
      {cards.map((c, i) => {
        const selected = c.id === selectedCardId || selectedCardIds.includes(c.id);
        const locked = lockedCardIds.includes(c.id);
        const disabled = locked || disabledCardIds.includes(c.id);
        return (
          <div
            key={slotKey ? slotKey(c, i) : c.id}
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
