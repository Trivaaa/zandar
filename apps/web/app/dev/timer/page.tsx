"use client";

import { useEffect, useState } from "react";
import type { Card as CardType } from "@zandar/shared-types";
import { SeatChip } from "@/components/SeatChip";
import { HandArea } from "@/components/HandArea";
import { TurnTimer } from "@/components/TurnTimer";

/**
 * Dev preview za TurnTimer (DS B5). Timer je SAMO na aktivnom sjedištu/ruci;
 * boja se mijenja pred istek (success → warn → danger). Nije produkcijski flow.
 */

const card = (suit: CardType["suit"], rank: CardType["rank"]): CardType => ({
  id: `${suit}-${rank}`,
  suit,
  rank,
});

const HAND: CardType[] = [
  card("clubs", "7"),
  card("spades", "K"),
  card("hearts", "A"),
];

export default function DevTimerPage() {
  // Seedovano poslije mount-a (0 na SSR) → bez hydration mismatch-a u preview-u.
  const [base, setBase] = useState(0);
  const [deadline, setDeadline] = useState(0);

  useEffect(() => {
    setBase(Date.now());
    setDeadline(Date.now() + 30_000);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-surface text-white p-4 pt-safe-top space-y-6">
      <h1 className="text-lg font-bold">TurnTimer — dev preview</h1>

      <Section title="boja po preostalom vremenu (size=md)">
        <Labeled label="~25s (success)">
          <TurnTimer deadline={base + 25_000} size="md" />
        </Labeled>
        <Labeled label="~12s (warn)">
          <TurnTimer deadline={base + 12_000} size="md" />
        </Labeled>
        <Labeled label="~4s (danger)">
          <TurnTimer deadline={base + 4_000} size="md" />
        </Labeled>
      </Section>

      <Section title="SeatChip — timer SAMO na aktivnom (live)">
        <SeatChip
          displayName="Jovana (na potezu)"
          cardCount={4}
          capturedCount={2}
          connectionStatus="connected"
          isCurrentTurn
          timer={<TurnTimer deadline={deadline} size="sm" />}
        />
        <SeatChip
          displayName="Marko (čeka)"
          cardCount={4}
          capturedCount={1}
          connectionStatus="connected"
          timer={<TurnTimer deadline={deadline} size="sm" />}
        />
        <p className="text-[11px] text-muted">
          Marko nije na potezu → SeatChip ne renderuje timer iako je proslijeđen.
        </p>
      </Section>

      <button
        type="button"
        onClick={() => setDeadline(Date.now() + 30_000)}
        className="px-3 py-2 rounded-token-md bg-accent text-accent-contrast font-bold text-sm active:scale-95 transition-transform"
      >
        ↻ Restart na 30s
      </button>

      <div className="pt-2">
        <p className="text-xs uppercase tracking-wide text-muted mb-2">
          HandArea — timer u headeru kad je tvoj red (live)
        </p>
        <HandArea
          cards={HAND}
          isMyTurn
          selectedCardId={null}
          onSelectCard={() => {}}
          timer={<TurnTimer deadline={deadline} size="md" />}
        />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs uppercase tracking-wide text-muted">{title}</h2>
      <div className="flex flex-wrap items-start gap-3">{children}</div>
    </section>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 rounded-token-md bg-surface-raised px-3 py-2">
      {children}
      <span className="text-[10px] text-muted">{label}</span>
    </div>
  );
}
