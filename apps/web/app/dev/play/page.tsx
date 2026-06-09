"use client";

import { useState } from "react";
import type { Card as CardType, CaptureOption } from "@zandar/shared-types";
import { HandArea } from "@/components/HandArea";
import { TableArea } from "@/components/TableArea";

/**
 * Dev preview za pun select → capture/trail loop (DS B3 + B4).
 * Lokalni state (bez backend-a): capture uklanja karte sa stola, trail spušta
 * kartu na sto. Nema confirm dugmeta, nema undo. Nije produkcijski flow.
 */

const card = (suit: CardType["suit"], rank: CardType["rank"]): CardType => ({
  id: `${suit}-${rank}`,
  suit,
  rank,
});

const INITIAL_HAND: CardType[] = [
  card("clubs", "7"),
  card("spades", "J"),
  card("hearts", "A"),
  card("diamonds", "9"),
];

const INITIAL_TABLE: CardType[] = [
  card("diamonds", "7"), // rank match 7
  card("spades", "3"), // 3+4 = 7 (sum)
  card("hearts", "4"),
  card("spades", "A"), // rank match A
  card("clubs", "5"), // 5+4 = 9 (sum, dijeli 4 sa gornjom kombinacijom)
];

export default function DevPlayPage() {
  const [hand, setHand] = useState(INITIAL_HAND);
  const [table, setTable] = useState(INITIAL_TABLE);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const selectedCard = hand.find((c) => c.id === selectedId) ?? null;

  function note(msg: string) {
    setLog((l) => [msg, ...l].slice(0, 5));
  }

  function reset() {
    setHand(INITIAL_HAND);
    setTable(INITIAL_TABLE);
    setSelectedId(null);
    setLog([]);
  }

  function handleCapture(option: CaptureOption) {
    if (!selectedCard) return;
    const taken = new Set(option.cardIds);
    setTable((t) => t.filter((c) => !taken.has(c.id)));
    setHand((h) => h.filter((c) => c.id !== selectedCard.id));
    note(
      `kupi ${selectedCard.rank}${suit(selectedCard.suit)} → ${option.cardIds.length} kar. (${option.reason})`,
    );
    setSelectedId(null);
  }

  function handleTrail() {
    if (!selectedCard) return;
    setTable((t) => [...t, selectedCard]);
    setHand((h) => h.filter((c) => c.id !== selectedCard.id));
    note(`trail ${selectedCard.rank}${suit(selectedCard.suit)} → spušteno na sto`);
    setSelectedId(null);
  }

  return (
    <div className="min-h-[100dvh] bg-surface text-white flex flex-col p-4 pt-safe-top gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Play loop — dev preview</h1>
        <button
          type="button"
          onClick={reset}
          className="px-3 py-1.5 rounded-token-md bg-surface-raised text-muted text-sm font-bold active:bg-surface"
        >
          Reset
        </button>
      </div>

      <TableArea
        table={table}
        selectedCard={selectedCard}
        onCapture={handleCapture}
        onTrail={handleTrail}
      />

      <div className="text-[11px] text-muted space-y-0.5 min-h-[3rem]">
        {log.length === 0 ? (
          <p>selektuj kartu → grupe na stolu zasvijetle → tap grupu (kupi) ili sto (trail)</p>
        ) : (
          log.map((l, i) => (
            <p key={i} className={i === 0 ? "text-white" : ""}>
              · {l}
            </p>
          ))
        )}
      </div>

      <div className="flex-1" />

      <HandArea
        cards={hand}
        isMyTurn
        selectedCardId={selectedId}
        onSelectCard={(c) => setSelectedId((id) => (id === c.id ? null : c.id))}
      />
    </div>
  );
}

function suit(s: CardType["suit"]): string {
  return { clubs: "♣", diamonds: "♦", hearts: "♥", spades: "♠" }[s];
}
