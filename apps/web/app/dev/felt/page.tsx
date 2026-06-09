"use client";

import { useState } from "react";
import type { Card as CardType } from "@zandar/shared-types";
import { Card } from "@/components/Card";

/**
 * SKICA — full-felt in-game layout (prijedlog, nije produkcija).
 *
 * Obrazac iz referentnih igara: cijeli ekran je felt, igrači plutaju po ivicama
 * (ti dole, partner gore, protivnici lijevo/desno), odigrane karte u centru,
 * ruka kao lepeza (fan) na dnu. NAŠ stil (tokeni, count-badge ne poleđine).
 *
 * Throwaway — kad odobriš, prebacujem u GameScreen/novi layout.
 */

const c = (s: CardType["suit"], r: string): CardType => ({
  id: `${s}-${r}`,
  suit: s,
  rank: r as never,
});

const TABLE: CardType[] = [c("diamonds", "7"), c("spades", "3"), c("hearts", "4"), c("spades", "A"), c("clubs", "K")];
const HAND: CardType[] = [c("diamonds", "A"), c("diamonds", "10"), c("clubs", "K"), c("spades", "J"), c("clubs", "8"), c("spades", "7")];

type Seat = {
  name: string;
  initial: string;
  count: number;
  active?: boolean;
  team?: 0 | 1;
};

function SeatBubble({ seat, className }: { seat: Seat; className: string }) {
  const ring = seat.active ? "ring-2 ring-turn animate-turn-pulse" : "ring-1 ring-white/10";
  const teamBorder =
    seat.team === 0 ? "border-team-a" : seat.team === 1 ? "border-team-b" : "border-white/15";
  return (
    <div className={`absolute flex flex-col items-center gap-1 ${className}`}>
      <div className="relative">
        <div
          className={`w-14 h-14 rounded-full bg-surface-raised border-2 ${teamBorder} ${ring} flex items-center justify-center text-lg font-bold shadow-lg`}
        >
          {seat.initial}
        </div>
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-accent text-accent-contrast text-[11px] font-bold leading-5 text-center border-2 border-felt">
          {seat.count}
        </span>
        {seat.active && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-mono font-bold text-success bg-surface/90 rounded px-1">
            12s
          </span>
        )}
      </div>
      <span className="text-xs font-semibold text-white drop-shadow max-w-[80px] truncate">
        {seat.name}
      </span>
    </div>
  );
}

export default function DevFeltPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div
      className="relative h-[100dvh] w-full overflow-hidden bg-felt"
      style={{
        backgroundImage:
          "radial-gradient(120% 90% at 50% 28%, rgba(255,255,255,0.06), transparent 55%), radial-gradient(140% 130% at 50% 125%, rgba(0,0,0,0.45), transparent 60%)",
      }}
    >
      {/* Partner (gore-centar) */}
      <SeatBubble
        seat={{ name: "Jovana", initial: "J", count: 4, team: 0 }}
        className="top-3 left-1/2 -translate-x-1/2 mt-safe-top"
      />
      {/* Protivnik lijevo */}
      <SeatBubble
        seat={{ name: "Stefan", initial: "S", count: 4, team: 1 }}
        className="top-[40%] left-2 -translate-y-1/2"
      />
      {/* Protivnik desno (na potezu) */}
      <SeatBubble
        seat={{ name: "Marko", initial: "M", count: 3, team: 1, active: true }}
        className="top-[40%] right-2 -translate-y-1/2"
      />

      {/* Centralna play-zona (definiše centar — nema prazne rupe) */}
      <div className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] max-w-[300px] min-h-[150px] rounded-token-lg border border-white/10 bg-white/[0.03] shadow-[inset_0_0_40px_rgba(0,0,0,0.35)] flex items-center justify-center p-3">
        <div className="flex flex-wrap justify-center gap-1.5">
          {TABLE.map((card) => (
            <Card key={card.id} card={card} size="sm" />
          ))}
        </div>
      </div>

      {/* Score pill (gornji desni) — placeholder */}
      <div className="absolute top-2 right-2 mt-safe-top z-30 rounded-token-md bg-surface-raised/90 border border-white/10 px-2.5 py-1.5 text-sm font-bold">
        <span className="text-[10px] uppercase text-muted mr-1">Rez</span>
        <span className="text-accent">14</span>
        <span className="text-muted">·</span>
        <span>9</span>
      </div>
      {/* Rules (gornji lijevi) */}
      <div className="absolute top-2 left-2 mt-safe-top z-30 rounded-token-md bg-surface-raised/90 border border-white/10 px-2.5 py-1.5 text-xs font-bold text-muted">
        ? Pravila
      </div>

      {/* Ti (mali avatar iznad ruke) */}
      <SeatBubble
        seat={{ name: "Ti", initial: "T", count: 6, team: 0, active: false }}
        className="bottom-[128px] left-1/2 -translate-x-1/2"
      />

      {/* Ruka — lepeza (fan) na dnu */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pb-safe-bottom flex items-end">
        {HAND.map((card, i) => {
          const n = HAND.length;
          const mid = (n - 1) / 2;
          const rot = (i - mid) * 6;
          const arc = Math.abs(i - mid) * 7;
          const isSel = selected === card.id;
          return (
            <div
              key={card.id}
              className="transition-transform"
              style={{
                marginLeft: i === 0 ? 0 : -18,
                transform: isSel
                  ? "translateY(-22px) rotate(0deg)"
                  : `translateY(${arc}px) rotate(${rot}deg)`,
                zIndex: isSel ? 50 : i,
              }}
            >
              <Card
                card={card}
                size="lg"
                selected={isSel}
                selectable
                onClick={() => setSelected((s) => (s === card.id ? null : card.id))}
              />
            </div>
          );
        })}
      </div>

      {/* Reaction FAB (donji desni) — placeholder */}
      <div className="absolute bottom-3 right-3 pb-safe-bottom pr-safe-right z-30">
        <div className="w-12 h-12 rounded-full bg-surface-raised border border-white/10 shadow-lg flex items-center justify-center text-xl">
          🙂
        </div>
      </div>
    </div>
  );
}
