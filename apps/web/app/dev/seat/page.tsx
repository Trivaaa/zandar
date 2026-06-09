"use client";

import { useState } from "react";
import { SeatChip } from "@/components/SeatChip";

/**
 * Dev preview za SeatChip (DS B1).
 * Provjeri: sva stanja se razlikuju, čip ~56px, meka zamjena identiteta,
 * nigdje grananje po botu. Nije dio produkcijskog flow-a.
 */
export default function DevSeatPage() {
  // Identitet-swap demo (bot→čovjek, DS §7.5)
  const [swapped, setSwapped] = useState(false);

  return (
    <div className="min-h-[100dvh] bg-surface text-white p-4 pt-safe-top space-y-6">
      <h1 className="text-lg font-bold">SeatChip — dev preview</h1>

      <Section title="full · osnovna stanja">
        <SeatChip displayName="Marko" cardCount={4} capturedCount={6} connectionStatus="connected" />
        <SeatChip displayName="Ti" cardCount={3} capturedCount={2} connectionStatus="connected" isMe />
        <SeatChip displayName="Jovana je na potezu" cardCount={5} capturedCount={0} connectionStatus="connected" isCurrentTurn timer={<span className="text-accent font-mono">0:12</span>} />
      </Section>

      <Section title="full · connection / auto-play">
        <SeatChip displayName="Nikola" cardCount={4} connectionStatus="reconnecting" />
        <SeatChip displayName="Stefan" cardCount={4} connectionStatus="abandoned" />
        <SeatChip displayName="Ana" cardCount={4} connectionStatus="connected" missedTurns={1} />
        <SeatChip displayName="Petar" cardCount={4} connectionStatus="connected" missedTurns={2} isCurrentTurn />
      </Section>

      <Section title="full · 4P team border (teamId 0 = A, 1 = B)">
        <SeatChip displayName="Partner" cardCount={4} capturedCount={3} connectionStatus="connected" teamId={0} />
        <SeatChip displayName="Protivnik" cardCount={4} capturedCount={1} connectionStatus="connected" teamId={1} isCurrentTurn timer={<span className="text-accent font-mono">0:08</span>} />
      </Section>

      <Section title="full · avatar (emoji)">
        <SeatChip displayName="Đoko" avatar="🦊" cardCount={2} capturedCount={9} connectionStatus="connected" />
        <SeatChip displayName="Mila" avatar="🐱" cardCount={4} connectionStatus="connected" missedTurns={3} />
      </Section>

      <Section title="compact · 4P bočni protivnik (bez imena)">
        <div className="w-20">
          <SeatChip variant="compact" displayName="Lijevi" cardCount={4} connectionStatus="connected" teamId={1} />
        </div>
        <div className="w-20">
          <SeatChip variant="compact" displayName="Desni" cardCount={3} connectionStatus="connected" teamId={1} isCurrentTurn timer={<span className="text-accent font-mono">0:05</span>} />
        </div>
        <div className="w-20">
          <SeatChip variant="compact" displayName="Recon" cardCount={4} connectionStatus="reconnecting" teamId={1} />
        </div>
        <div className="w-20">
          <SeatChip variant="compact" displayName="Auto" cardCount={4} connectionStatus="connected" teamId={1} missedTurns={2} />
        </div>
      </Section>

      <Section title="§7.5 · meka zamjena identiteta (bot → čovjek)">
        <SeatChip
          displayName={swapped ? "Igor" : "Vesna"}
          avatar={swapped ? "🙂" : "🦉"}
          cardCount={4}
          capturedCount={5}
          connectionStatus="connected"
          teamId={0}
        />
        <button
          type="button"
          onClick={() => setSwapped((s) => !s)}
          className="px-3 py-2 rounded-token-md bg-accent text-accent-contrast font-bold text-sm active:opacity-80"
        >
          Zamijeni identitet (fade)
        </button>
      </Section>
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
