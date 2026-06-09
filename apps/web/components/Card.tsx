"use client";

import type { Card as CardType } from "@zandar/shared-types";

/**
 * Card — žandar karta (DS §3, B3).
 *
 * Stanja (kombinuju se):
 *  - face (default) / faceDown (poleđina)
 *  - selectable  → tvoj red, karta je tapabilna (afordansa + active: feedback)
 *  - selected    → podignuta (lift) + accent ring; izbor NE izvršava potez
 *  - captured    → prigušena (za animaciju kupljenja na stolu, B4)
 *
 * Touch feedback ide preko `active:`, NE `hover:` (hover se lijepi na touchu).
 * Selekcija samo podiže kartu — destinacijski tap (B4) je potvrda poteza.
 *
 * Backward-compatible: stari `<Card card onClick />` i dalje radi.
 */

const SUIT_SYMBOLS: Record<string, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
};

const SIZES = {
  sm: "w-12 h-16",
  md: "w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28",
  lg: "w-16 h-24 sm:w-20 sm:h-28",
} as const;

type Props = {
  card: CardType;
  onClick?: () => void;
  faceDown?: boolean;
  selectable?: boolean;
  selected?: boolean;
  captured?: boolean;
  size?: keyof typeof SIZES;
};

export function Card({
  card,
  onClick,
  faceDown = false,
  selectable = false,
  selected = false,
  captured = false,
  size = "md",
}: Props) {
  const dim = SIZES[size];

  if (faceDown) {
    return (
      <div
        className={`${dim} rounded-token-sm bg-surface-raised border border-white/10 flex items-center justify-center`}
        aria-label="Karta (poleđina)"
      >
        <div className="w-2/3 h-2/3 rounded-token-sm border-2 border-accent/30" />
      </div>
    );
  }

  const isRed = card.suit === "hearts" || card.suit === "diamonds";
  const symbol = SUIT_SYMBOLS[card.suit] ?? "?";
  const interactive = !!onClick;

  const classes = [
    dim,
    "bg-white rounded-token-sm shadow flex flex-col justify-between p-1 select-none transition-transform",
    isRed ? "text-red-600" : "text-zinc-900",
    // selekcija: podignuta + accent ring
    selected ? "-translate-y-3 ring-2 ring-accent shadow-lg" : "",
    // tapabilna karta: blagi press feedback (active:, ne hover:)
    interactive ? "cursor-pointer active:-translate-y-1" : "",
    // selectable bez selekcije: suptilna afordansa na ringu pri pritisku
    selectable && !selected ? "active:ring-2 active:ring-accent/50" : "",
    // kupljena: prigušena
    captured ? "opacity-50" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <div className="text-xs sm:text-sm md:text-base font-bold leading-none">
        {card.rank}
      </div>
      <div className="text-center text-xl sm:text-2xl md:text-3xl leading-none">
        {symbol}
      </div>
      <div className="text-xs sm:text-sm md:text-base font-bold leading-none rotate-180 self-end">
        {card.rank}
      </div>
    </>
  );

  if (interactive) {
    return (
      <button
        onClick={onClick}
        className={classes}
        type="button"
        aria-pressed={selected}
        aria-label={`${card.rank} ${card.suit}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div className={classes} aria-label={`${card.rank} ${card.suit}`}>
      {content}
    </div>
  );
}
