import type { Card as CardType } from "@zandar/shared-types";

type CardProps = {
  card: CardType;
  onClick?: () => void;
};

const SUIT_SYMBOLS: Record<string, string> = {
  clubs: "♣",
  diamonds: "♦",
  hearts: "♥",
  spades: "♠",
};

export function Card({ card, onClick }: CardProps) {
  const isRed = card.suit === "hearts" || card.suit === "diamonds";
  const colorClass = isRed ? "text-red-600" : "text-zinc-900";
  const interactiveClass = onClick
    ? "cursor-pointer hover:-translate-y-2 transition-transform"
    : "cursor-default";

  const baseClass = `
    relative
    w-20 h-28
    bg-white rounded-lg
    border-2 border-zinc-300
    shadow-md
    flex items-center justify-center
    p-0
    ${colorClass}
    ${interactiveClass}
  `;

  const content = (
    <>
      <span className="absolute top-1 left-2 text-sm font-bold leading-none">
        {card.rank}
      </span>
      <span className="text-5xl leading-none">{SUIT_SYMBOLS[card.suit]}</span>
      <span className="absolute bottom-1 right-2 text-sm font-bold leading-none rotate-180">
        {card.rank}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className={baseClass} type="button">
        {content}
      </button>
    );
  }
  return <div className={baseClass}>{content}</div>;
}