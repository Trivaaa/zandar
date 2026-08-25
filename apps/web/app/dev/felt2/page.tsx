"use client";

import { useState } from "react";
import { getCaptureOptions } from "@zandar/game-core";
import type {
  Card as CardType,
  CaptureOption,
  PublicPlayer,
} from "@zandar/shared-types";
import { PlayingCard } from "@/components/felt/PlayingCard";
import { CardBack } from "@/components/felt/CardBack";
import { PlayerHand } from "@/components/felt/PlayerHand";
import { DeckPile } from "@/components/felt/DeckPile";
import { TurnPill } from "@/components/felt/TurnPill";
import { PlayerSeat } from "@/components/felt/PlayerSeat";
import { TurnBanner } from "@/components/felt/TurnBanner";
import { TableSurface } from "@/components/felt/TableSurface";

/**
 * /dev/felt2 — preview portovanog felt sloja (Lovable korak 1–2).
 *
 * Provjerava da felt.css stiže, da se sve klase razrješavaju kroz tokene i da
 * capture/trail petlja radi sa STVARNIM `getCaptureOptions` iz game-core-a.
 * Nije produkcijski flow — `GameScreen` je pravi potrošač.
 */

const c = (suit: CardType["suit"], rank: CardType["rank"]): CardType => ({
  id: `${suit}-${rank}`,
  suit,
  rank,
});

const HAND: CardType[] = [
  c("spades", "A"),
  c("hearts", "7"),
  c("diamonds", "10"),
  c("clubs", "K"),
  c("hearts", "J"),
  c("spades", "3"),
  c("spades", "Q"),
  c("clubs", "9"),
];

const TABLE: CardType[] = [
  c("clubs", "7"),
  c("diamonds", "4"),
  c("spades", "3"),
  c("hearts", "Q"),
  c("spades", "2"),
];

const P = (
  id: string,
  displayName: string,
  seatIndex: number,
  teamId?: number,
  connectionStatus: PublicPlayer["connectionStatus"] = "connected",
): PublicPlayer => ({
  id,
  displayName,
  seatIndex,
  isHost: false,
  teamId,
  connectionStatus,
});

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="rounded-token-lg bg-felt p-4">{children}</div>
    </section>
  );
}

export default function FeltTwoPreview() {
  const [selected, setSelected] = useState<CardType | null>(null);
  const [handCount, setHandCount] = useState(8);
  const [seconds, setSeconds] = useState(18);
  const [log, setLog] = useState<string>("—");


  const cards = HAND.slice(0, handCount);
  const options: CaptureOption[] = selected
    ? getCaptureOptions(selected, TABLE)
    : [];
  const canTrail = !!selected && options.length === 0;
  const [blocked, setBlocked] = useState(false);

  return (
    <main className="min-h-screen bg-surface p-4 space-y-8 pb-16">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Felt sloj — port (Lovable 1–2)</h1>
        <p className="text-sm text-muted">
          Prava capture logika iz game-core. Selektuj kartu u ruci, pa tapni
          grupu na stolu ili sto (trail).
        </p>
      </header>

      <Row title="Sto + ruka — puna petlja">
        <div className="space-y-4">
          <TableSurface
            cards={TABLE}
            captureOptions={options}
            onSelectOption={(o) => {
              setLog(`capture: ${o.reason} → ${o.cardIds.join(", ")}`);
              setSelected(null);
            }}
            canTrail={canTrail}
            onTrail={() => {
              setLog(`trail: ${selected?.id}`);
              setSelected(null);
            }}
            forceCaptureBlocked={blocked}
          />
          <TurnBanner isYou />
          <div className="flex justify-center">
            <TurnPill isYou secondsRemaining={seconds} totalSeconds={30} />
          </div>
          <PlayerHand
            cards={cards}
            selectedCardId={selected?.id ?? null}
            onSelect={(card) =>
              setSelected((s) => (s?.id === card.id ? null : card))
            }
          />
          <p className="text-sm text-muted text-center">Zadnja akcija: {log}</p>
        </div>
      </Row>

      <Row title="Sjedišta — 4P">
        <div className="flex flex-wrap gap-4">
          <PlayerSeat
            player={P("p1", "Milica", 1, 1)}
            isActive
            secondsRemaining={seconds}
            totalSeconds={30}
            cardCount={5}
            score={31}
            orientation="top"
          />
          <PlayerSeat
            player={P("p2", "Zoran", 2, 0, "reconnecting")}
            cardCount={4}
            score={18}
            orientation="left"
          />
          <PlayerSeat
            player={P("p3", "Vesna", 3, 1)}
            isThinking
            isActive
            cardCount={6}
            score={27}
            orientation="right"
            reaction={<span className="text-xl">🔥</span>}
          />
        </div>
      </Row>

      <Row title="Špil + poleđine na golom feltu">
        <div className="flex items-end gap-6">
          <DeckPile remaining={20} />
          <CardBack size="xs" />
          <CardBack size="sm" />
          <CardBack size="md" />
          <CardBack size="lg" />
        </div>
      </Row>

      <Row title="Karte — veličine">
        <div className="flex items-end gap-3">
          <PlayingCard card={c("hearts", "K")} size="xs" />
          <PlayingCard card={c("hearts", "K")} size="sm" />
          <PlayingCard card={c("hearts", "K")} size="md" />
          <PlayingCard card={c("hearts", "K")} size="lg" />
        </div>
      </Row>

      <div className="flex flex-wrap gap-2">
        {[3, 5, 7, 8].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setHandCount(n)}
            className={`rounded-token-md px-3 py-2 text-sm ${
              handCount === n ? "bg-accent text-accent-contrast" : "bg-surface-raised"
            }`}
          >
            {n} karata
          </button>
        ))}
        <button
          type="button"
          onClick={() => setBlocked((b) => !b)}
          className={`rounded-token-md px-3 py-2 text-sm ${
            blocked ? "bg-accent text-accent-contrast" : "bg-surface-raised"
          }`}
        >
          force-capture blokiran
        </button>
        {[18, 9, 4, 1].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSeconds(s)}
            className={`rounded-token-md px-3 py-2 text-sm ${
              seconds === s ? "bg-accent text-accent-contrast" : "bg-surface-raised"
            }`}
          >
            {s}s
          </button>
        ))}
      </div>
    </main>
  );
}
