"use client";

import type { Card, CardSize, Suit } from "@/components/felt/types";

const sizeClass: Record<CardSize, string> = {
  xs: "card--xs",
  sm: "card--sm",
  md: "card--md",
  lg: "card--lg",
};

const suitGlyph: Record<Suit, string> = {
  clubs: "\u2663",
  diamonds: "\u2666",
  hearts: "\u2665",
  spades: "\u2660",
};

const suitInk: Record<Suit, string> = {
  clubs: "text-card-ink",
  spades: "text-card-ink",
  diamonds: "text-card-ink-red",
  hearts: "text-card-ink-red",
};

const suitLabel: Record<Suit, string> = {
  clubs: "tref",
  diamonds: "karo",
  hearts: "srce",
  spades: "pik",
};

/* Corner suit size and centre pip size are geometry, driven off --card-w in
   felt.css. Rank never drops below text-num-md. */


export type PlayingCardProps = {
  card: Card;
  faceUp?: boolean;
  selectable?: boolean;
  selected?: boolean;
  dimmed?: boolean;
  disabled?: boolean;
  size?: CardSize;
  /** Motion flags — the parent decides when, the CSS decides how. */
  animateDeal?: boolean;
  animatePlay?: boolean;
  animateCollect?: boolean;
  animateFlip?: boolean;
  dealIndex?: number | undefined;
  onSelect?: ((card: Card) => void) | undefined;
  className?: string | undefined;
};

export function PlayingCard({
  card,
  faceUp = true,
  selectable = false,
  selected = false,
  dimmed = false,
  disabled = false,
  size = "md",
  animateDeal = false,
  animatePlay = false,
  animateCollect = false,
  animateFlip = false,
  dealIndex,
  onSelect,
  className = "",
}: PlayingCardProps) {
  const interactive = selectable && !disabled;
  const motion = [
    animateDeal ? "card-deal" : "",
    animatePlay ? "card-play" : "",
    animateCollect ? "card-collect" : "",
    animateFlip ? "card-flip" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const label = faceUp ? `${card.rank} ${suitLabel[card.suit]}` : "karta okrenuta nadole";

  return (
    <div
      className={`card ${sizeClass[size]} ${motion} ${className}`}
      data-face-up={faceUp}
      data-selected={selected}
      data-selectable={selectable}
      data-dimmed={dimmed}
      data-disabled={disabled}
      data-card-id={card.id}
      style={dealIndex === undefined ? undefined : ({ "--deal-index": dealIndex } as React.CSSProperties)}
      role={interactive ? "button" : "img"}
      aria-label={label}
      aria-pressed={interactive ? selected : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => onSelect?.(card) : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(card);
              }
            }
          : undefined
      }
    >
      <div className="card-lift">
        <span className="card-glow" />
        <div className="card-inner">
          <div className="card-side">
            <div className={`card-face ${suitInk[card.suit]}`}>
              <span className="card-face__index">
                <span className="card-face__rank font-display text-num-md">{card.rank}</span>
                <span className="card-face__suit" aria-hidden="true">
                  {suitGlyph[card.suit]}
                </span>

              </span>
              <span className="card-face__pip" aria-hidden="true">
                {suitGlyph[card.suit]}
              </span>
            </div>
          </div>

          <div className="card-side card-side--back">
            <div className="card-back" />
          </div>
        </div>
      </div>
    </div>
  );
}
