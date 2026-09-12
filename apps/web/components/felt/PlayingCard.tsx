"use client";

import type { Card, CardSize, Suit } from "@/components/felt/types";

const sizeClass: Record<CardSize, string> = {
  xs: "card--xs",
  sm: "card--sm",
  md: "card--md",
  lg: "card--lg",
  /** Sirina dolazi iz --table-card-w koji postavlja .table__cards. */
  fluid: "card--fluid",
};

/** Znak u imenu fajla asseta: `hearts` + `Q` -> `QH.webp`. */
const suitChar: Record<Suit, string> = {
  clubs: "C",
  diamonds: "D",
  hearts: "H",
  spades: "S",
};

/**
 * Ime slike lica. Rang ide PRVI i "10" je dva znaka \u2014 pa se iz ovog id-a rang
 * ne smije citati kao `id[0]`, nego `slice(0, -1)`. Ovdje se samo sastavlja.
 */
function assetId(card: Card) {
  return `${card.rank}${suitChar[card.suit]}`;
}

const suitLabel: Record<Suit, string> = {
  clubs: "tref",
  diamonds: "karo",
  hearts: "srce",
  spades: "pik",
};

/* Lice je SLIKA, ne DOM. Ranije su tu bili rang kao tekst i JEDAN veliki znak u
   sredini — sedmica srca je pokazivala jedno veliko srce, ne sedam. Sada je
   `.card-face` prazan element kojem se preko `--card-art` doda isjeceno lice
   (vidi `scripts/build-cards.mjs`); rang, znakovi i figure dolaze iz crteza.

   `aria-label` na KORIJENU karte ostaje jedini pristupacni naziv i gradi se iz
   propova, ne iz teksta u DOM-u, pa ga gubitak tih spanova ne dodiruje. */


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
            {/* Klasa `card-face` MORA ostati: `/dev/game?measure=1` je mjeri
                preko `getBoundingClientRect()`. */}
            <div
              className="card-face"
              style={
                { "--card-art": `url("/cards/${assetId(card)}.webp")` } as React.CSSProperties
              }
            />
          </div>

          <div className="card-side card-side--back">
            <div className="card-back" />
          </div>
        </div>
      </div>
    </div>
  );
}
