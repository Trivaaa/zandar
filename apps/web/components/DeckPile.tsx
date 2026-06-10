"use client";

/**
 * DeckPile — vizuelni špil na feltu koji se STANJUJE kako runde idu (PRD §50 /
 * feedback). Debljina (broj slojeva) ∝ `count` (deckCount) → ko uživo vidiš
 * koliko je karata ostalo. `[data-deck]` je sidro za deal animaciju (dealFromDeck).
 */

const CARD = "w-7 h-10 rounded-[5px]";
const OFFSET = 1.6; // px po sloju (debljina)

export function DeckPile({
  count,
  className,
}: {
  count: number;
  className?: string;
}) {
  if (count <= 0) return null; // prazan špil — ništa

  const layers = Math.min(8, Math.max(1, Math.round(count / 6)));
  const span = layers * OFFSET;

  return (
    <div
      className={`absolute flex flex-col items-center gap-1 pointer-events-none select-none ${className ?? ""}`}
    >
      <div
        data-deck
        className="relative"
        style={{ width: 28 + span, height: 40 + span }}
      >
        {/* Slojevi (debljina) — više karata = deblji špil */}
        {Array.from({ length: layers }).map((_, i) => (
          <div
            key={i}
            className={`absolute ${CARD} bg-surface-raised border border-white/10`}
            style={{ left: i * OFFSET, top: i * OFFSET }}
          />
        ))}
        {/* Gornja karta (poleđina) */}
        <div
          className={`absolute ${CARD} bg-surface-raised border border-accent/30 shadow-md flex items-center justify-center`}
          style={{ left: span, top: span }}
        >
          <div className="w-2/3 h-2/3 rounded-[3px] border-2 border-accent/25" />
        </div>
      </div>
      <span className="text-[10px] text-muted tabular-nums leading-none">
        {count}
      </span>
    </div>
  );
}
