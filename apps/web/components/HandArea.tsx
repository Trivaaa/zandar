"use client";

import type { Card as CardType } from "@zandar/shared-types";
import { Card } from "@/components/Card";

/**
 * HandArea — tvoja ruka, dole (DS §1, §4, B3).
 *
 * Stanja zone:
 *  - your-turn  → glow (accent ring), karte tapabilne
 *  - not-your-turn / disabled → dim (prigušeno), karte nisu tapabilne
 *
 * Fluid tap: tap karte = selekcija/lift (zove `onSelectCard`). Potez se NE
 * izvršava ovdje — destinacijski tap na stolu (B4) je potvrda. `disabled`
 * (npr. pauza) blokira interakciju čak i kad je tvoj red.
 */

type HandAreaProps = {
  cards: CardType[];
  isMyTurn: boolean;
  selectedCardId: string | null;
  /** Tap karte → selekcija/lift. Ne izvršava potez. */
  onSelectCard: (card: CardType) => void;
  disabled?: boolean;
};

export function HandArea({
  cards,
  isMyTurn,
  selectedCardId,
  onSelectCard,
  disabled = false,
}: HandAreaProps) {
  const interactive = isMyTurn && !disabled;

  return (
    <div
      className={[
        "rounded-token-lg border p-3 transition-all",
        interactive
          ? "bg-surface-raised border-accent/40 ring-1 ring-accent/30"
          : "bg-surface-raised/60 border-white/5 opacity-60",
      ].join(" ")}
      data-my-turn={interactive}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wide text-muted">
          Tvoja ruka
        </span>
        {interactive && (
          <span className="text-[10px] font-bold text-accent">Tvoj red</span>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 min-h-[5rem]">
        {cards.length === 0 ? (
          <span className="text-muted italic self-center text-sm">
            Ruka prazna
          </span>
        ) : (
          cards.map((card) => (
            <Card
              key={card.id}
              card={card}
              selectable={interactive}
              selected={selectedCardId === card.id}
              onClick={interactive ? () => onSelectCard(card) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}
