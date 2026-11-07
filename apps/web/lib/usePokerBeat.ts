"use client";

import { useEffect, useRef, useState } from "react";
import type { PokerGamePayload } from "@zandar/shared-types";

import { pokerBeats, totalMs, type BeatHold, type BeatStep } from "./pokerBeat";
import { runPokerFx } from "./pokerFly";

type Beat = { target: PokerGamePayload; steps: BeatStep[]; i: number };

export type PokerBeatState = {
  /** Stanje koje se crta: cilj priče koja traje, ili najnovije stanje. */
  view: PokerGamePayload;
  /** Šta sto još drži drugačije od `view` dok priča traje; `null` = ništa ne traje. */
  hold: BeatHold | null;
};

/** Najkraće što se korak smije sabiti kad priča kasni za serverom. */
const MIN_SCALE = 0.25;

function beatFor(prev: PokerGamePayload, next: PokerGamePayload): Beat | null {
  // Drugi meč (revanš) ili drugi sto: nema priče, odmah novo stanje.
  if (prev.matchId !== next.matchId || prev.roomId !== next.roomId) return null;
  const steps = pokerBeats(prev, next);
  return steps.length ? { target: next, steps, i: 0 } : null;
}

function isFreshFirstHand(v: PokerGamePayload): boolean {
  return v.handNo === 1 && v.phase === "betting" && v.board.length === 0 && v.seats.every((s) => s.lastAction === null);
}

/**
 * Izvodi priču poker stola (`pokerBeats`) korak po korak.
 *
 * Isti obrazac kao Žandarov `useTableBeat`: klijent ZADRŽI sto kakav je bio i
 * pusti ga do novog stanja kroz korake, umjesto da novo stanje nacrta odjednom.
 * Novo stanje koje stigne usred priče čeka svoj red; ako ih stigne više, priča
 * se samo prelaz do najnovijeg (nema reprize starih poteza).
 *
 * Kad priča kasni za satom servera (`turnStartsAt`) ili je tab u pozadini,
 * koraci se sabiju — nikad se ne preskače redoslijed.
 */
export function usePokerBeat(live: PokerGamePayload): PokerBeatState {
  const [seen, setSeen] = useState(live);
  // Zadnje stanje čija je priča ispričana — osnova za sljedeću razliku.
  const [shown, setShown] = useState(live);
  // Prva ruka meča, prije ijednog poteza: i ona se dijeli (server za to već
  // čeka — `pokerPresentationMs` od praznog stola). Ponovno otvaranje usred
  // ruke ne priča ništa.
  const [beat, setBeat] = useState<Beat | null>(() =>
    isFreshFirstHand(live) ? beatFor({ ...live, handNo: 0, phase: "hand_complete" }, live) : null,
  );
  const [pending, setPending] = useState<PokerGamePayload | null>(null);
  const scale = useRef(1);

  // Novo stanje sa servera (izvedeno stanje u renderu, bez efekta).
  if (live !== seen) {
    setSeen(live);
    if (beat) {
      setPending(live);
    } else {
      const b = beatFor(shown, live);
      if (b) setBeat(b);
      else setShown(live);
    }
  }

  // Priča gotova: osnova je njen cilj; ako čeka novije stanje, priča se prelaz do njega.
  if (beat && beat.i >= beat.steps.length) {
    const nextLive = pending;
    setPending(null);
    const b = nextLive ? beatFor(beat.target, nextLive) : null;
    setShown(b || !nextLive ? beat.target : nextLive);
    setBeat(b);
  }

  useEffect(() => {
    if (!beat || beat.i >= beat.steps.length) return;
    const step = beat.steps[beat.i]!;
    if (beat.i === 0) {
      // Koliko vremena ima do sata servera; priča se sabije ako ga nema dovoljno.
      const total = totalMs(beat.steps);
      const budget =
        beat.target.phase === "betting" && beat.target.turnStartsAt !== undefined
          ? beat.target.turnStartsAt - Date.now()
          : Infinity;
      scale.current = document.hidden
        ? 0.01
        : budget < total
          ? Math.max(MIN_SCALE, budget / Math.max(1, total))
          : 1;
      if (step.fx) runPokerFx(step.fx, step.ms * scale.current);
    }
    const t = setTimeout(() => {
      const next = beat.steps[beat.i + 1];
      // Let sljedećeg koraka kreće PRIJE nego se sto promijeni — sidra (ulozi,
      // pot) se mjere dok su još na ekranu.
      if (next?.fx) runPokerFx(next.fx, next.ms * scale.current);
      setBeat({ ...beat, i: beat.i + 1 });
    }, step.ms * scale.current);
    return () => clearTimeout(t);
  }, [beat]);

  if (beat && beat.i < beat.steps.length) return { view: beat.target, hold: beat.steps[beat.i]!.hold };
  return { view: live, hold: null };
}
