"use client";

import type { Card as CardType } from "@zandar/shared-types";

const SUIT_SYMBOLS: Record<string, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
};

type Props = {
  card: CardType;
  onClick?: () => void;
};

export function Card({ card, onClick }: Props) {
  const isRed = card.suit === "hearts" || card.suit === "diamonds";
  const symbol = SUIT_SYMBOLS[card.suit] ?? "?";

  const baseClasses = [
    "bg-white rounded shadow flex flex-col justify-between p-1",
    "w-14 h-20 sm:w-16 sm:h-24 md:w-20 md:h-28",
    isRed ? "text-red-600" : "text-zinc-900",
    onClick
      ? "cursor-pointer hover:-translate-y-2 active:-translate-y-1 transition-transform"
      : "",
  ].join(" ");

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

  if (onClick) {
    return (
      <button onClick={onClick} className={baseClasses} type="button">
        {content}
      </button>
    );
  }

  return <div className={baseClasses}>{content}</div>;
}