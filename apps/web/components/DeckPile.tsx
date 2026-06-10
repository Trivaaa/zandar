"use client";

import { CardBack } from "@/components/CardBack";

/**
 * DeckPile — vizuelni špil na feltu koji se STANJUJE kako runde idu (PRD §50 /
 * feedback). Debljina (broj slojeva) ∝ `count` (deckCount) → ko uživo vidiš
 * koliko je karata ostalo. Gornja karta je zajednička `CardBack` (zlatna rešetka),
 * broj je chip-badge ispod. `[data-deck]` je sidro za deal animaciju (dealFromDeck).
 */

const CARD_W = 46; // = CardBack "md"
const CARD_H = 64;
const OFFSET = 2.5; // px po sloju (debljina štosa)

export function DeckPile({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null; // prazan špil — ništa

  const layers = Math.min(9, Math.max(1, Math.round(count / 5)));
  const span = layers * OFFSET;

  return (
    <div
      className={`absolute flex flex-col items-center gap-1.5 pointer-events-none select-none ${className ?? ""}`}
    >
      <div
        data-deck
        className="relative"
        style={{ width: CARD_W + span, height: CARD_H + span }}
      >
        {/* Slojevi (debljina) — više karata = deblji štos */}
        {Array.from({ length: layers }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-token-md bg-surface-raised border border-white/10"
            style={{ width: CARD_W, height: CARD_H, left: i * OFFSET, top: i * OFFSET }}
          />
        ))}
        {/* Gornja karta — poleđina sa zlatnom rešetkom */}
        <div className="absolute" style={{ left: span, top: span }}>
          <CardBack size="md" />
        </div>
      </div>
      <span className="rounded-full bg-black/55 border border-accent/25 px-2 py-0.5 text-[11px] font-bold tabular-nums leading-none text-accent">
        {count}
      </span>
    </div>
  );
}
