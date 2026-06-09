"use client";

import type { Card as CardType } from "@zandar/shared-types";
import { Card } from "@/components/Card";

/**
 * HandFan — tvoja ruka kao lepeza na dnu (DS Faza B, full-felt).
 *
 * Karte se preklapaju i blago rotiraju (transform-origin: dno) → "fan" osjećaj.
 * Tap = selekcija/lift (zove `onSelectCard`); potez se NE izvršava (destinacijski
 * tap na stolu je potvrda, B4). Kad nije tvoj red / disabled → prigušeno, ne tapabilno.
 */

type HandFanProps = {
  cards: CardType[];
  isMyTurn: boolean;
  selectedCardId: string | null;
  onSelectCard: (card: CardType) => void;
  disabled?: boolean;
};

export function HandFan({
  cards,
  isMyTurn,
  selectedCardId,
  onSelectCard,
  disabled = false,
}: HandFanProps) {
  const interactive = isMyTurn && !disabled;
  const n = cards.length;
  const mid = (n - 1) / 2;

  if (n === 0) {
    return <span className="text-muted italic text-sm py-8">Ruka prazna</span>;
  }

  // Manji raspon kad je više karata (da ne curi sa ekrana).
  const spread = n > 6 ? 5 : 7;

  return (
    <div
      className={`flex items-end justify-center ${interactive ? "" : "opacity-70"}`}
    >
      {cards.map((card, i) => {
        const rot = (i - mid) * spread;
        const isSel = selectedCardId === card.id;
        return (
          <div
            key={card.id}
            className="transition-transform"
            style={{
              transformOrigin: "bottom center",
              marginLeft: i === 0 ? 0 : -18,
              transform: isSel
                ? "translateY(-20px)"
                : `rotate(${rot}deg)`,
              zIndex: isSel ? 50 : i,
            }}
          >
            <Card
              card={card}
              size="lg"
              selected={isSel}
              selectable={interactive}
              onClick={interactive ? () => onSelectCard(card) : undefined}
            />
          </div>
        );
      })}
    </div>
  );
}
