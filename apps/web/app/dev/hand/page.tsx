"use client";

import { useState } from "react";
import { getCaptureOptions } from "@zandar/game-core";
import type { Card as CardType } from "@zandar/shared-types";
import { Card } from "@/components/Card";
import { HandArea } from "@/components/HandArea";

/**
 * Dev preview za HandArea + Card fluid tap (DS B3).
 * Tap karte = selekcija/lift; potez se NE izvršava. Selekcija pali highlight
 * validnih karata na stolu (getCaptureOptions). Pravu capture/trail interakciju
 * gradi B4. Nije produkcijski flow.
 */

const c = (suit: CardType["suit"], rank: CardType["rank"]): CardType => ({
  id: `${suit}-${rank}`,
  suit,
  rank,
});

const HAND: CardType[] = [
  c("clubs", "7"),
  c("spades", "J"),
  c("hearts", "A"),
  c("diamonds", "10"),
];

const TABLE: CardType[] = [
  c("diamonds", "7"), // rank match za 7♣
  c("spades", "3"), // 3 + 4 = 7 (sum match za 7♣)
  c("hearts", "4"),
  c("spades", "A"), // rank match za A♥
  c("clubs", "K"),
];

export default function DevHandPage() {
  const [myTurn, setMyTurn] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState("—");

  const selectedCard = HAND.find((x) => x.id === selectedCardId) ?? null;

  // Highlight = unija svih cardId-eva iz capture opcija za selektovanu kartu.
  const highlightIds = new Set<string>();
  if (selectedCard) {
    for (const opt of getCaptureOptions(selectedCard, TABLE)) {
      opt.cardIds.forEach((id) => highlightIds.add(id));
    }
  }

  function handleSelect(card: CardType) {
    const next = selectedCardId === card.id ? null : card.id;
    setSelectedCardId(next);
    // Dokaz da selekcija NE izvršava potez — samo lift + highlight.
    setLastAction(
      next ? `selektovano: ${card.rank}${suit(card.suit)} (potez NIJE odigran)` : "deselektovano",
    );
  }

  return (
    <div className="min-h-[100dvh] bg-surface text-white flex flex-col p-4 pt-safe-top gap-4">
      <h1 className="text-lg font-bold">HandArea + Card — dev preview</h1>

      {/* Kontrole */}
      <div className="flex flex-wrap gap-2">
        <Toggle on={myTurn} onClick={() => setMyTurn((v) => !v)}>
          {myTurn ? "Tvoj red" : "Nije tvoj red"}
        </Toggle>
        <Toggle on={!disabled} onClick={() => setDisabled((v) => !v)}>
          {disabled ? "Disabled (pauza)" : "Aktivno"}
        </Toggle>
        <span className="text-xs text-muted self-center">
          akcija: <span className="text-white">{lastAction}</span>
        </span>
      </div>

      {/* Sto (placeholder — pravi TableArea je B4) */}
      <div className="rounded-token-lg bg-felt border border-white/5 p-3">
        <span className="text-[10px] uppercase tracking-wide text-muted">
          Sto {selectedCard ? "· validne karte zasvijetle" : ""}
        </span>
        <div className="flex flex-wrap justify-center gap-2 mt-2 min-h-[5rem]">
          {TABLE.map((card) => (
            <Card
              key={card.id}
              card={card}
              selected={highlightIds.has(card.id)}
            />
          ))}
        </div>
      </div>

      <div className="flex-1" />

      {/* Ruka */}
      <HandArea
        cards={HAND}
        isMyTurn={myTurn}
        selectedCardId={selectedCardId}
        onSelectCard={handleSelect}
        disabled={disabled}
      />
    </div>
  );
}

function suit(s: CardType["suit"]): string {
  return { clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" }[s];
}

function Toggle({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-token-md text-sm font-bold transition-colors ${
        on
          ? "bg-accent text-accent-contrast"
          : "bg-surface-raised text-muted active:bg-surface"
      }`}
    >
      {children}
    </button>
  );
}
