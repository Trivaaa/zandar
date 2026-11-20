"use client";

import { useEffect, useRef, useState } from "react";

import { arrivalSlots, revealAt } from "@/lib/shuffleView";

type Arriving = { id: string; seatIndex: number };

/**
 * Sjedanje jedan po jedan na ekranu „Miješamo špil" (odluka vlasnika
 * 20.11.2026). Ja sam za stolom odmah; ostali sjedaju po nasumičnom terminu
 * (`arrivalSlots`), nikad prije nego ih server javi (`revealAt`).
 *
 * Vraća id-jeve igrača koji su već sjeli (bez mene). `onAllSeated` se zove
 * jednom, iz tajmera, kad sjedne zadnji, a sto je pun.
 */
export function useSeatArrivals(
  players: readonly Arriving[],
  myId: string | null,
  playerCount: number,
  enabled: boolean,
  onAllSeated: () => void,
): ReadonlySet<string> {
  const [seated, setSeated] = useState<ReadonlySet<string>>(() => new Set());
  const startedAt = useRef<number | null>(null);
  const slots = useRef<number[] | null>(null);
  const scheduled = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const lastReveal = useRef<number | null>(null);
  const done = useRef(new Set<string>());
  const fired = useRef(false);
  const latest = useRef({ playerCount, onAllSeated });

  useEffect(() => {
    latest.current = { playerCount, onAllSeated };
  });

  useEffect(() => {
    if (!enabled) return;
    const now = performance.now();
    if (startedAt.current === null) startedAt.current = now;
    if (slots.current === null) slots.current = arrivalSlots(3, Math.random);
    const elapsed = now - startedAt.current;
    const others = players
      .filter((p) => p.id !== myId && !scheduled.current.has(p.id))
      .sort((a, b) => a.seatIndex - b.seatIndex);
    for (const p of others) {
      const k = scheduled.current.size;
      const slot = slots.current[k] ?? (slots.current.at(-1) ?? 0) + 1000 * (k - slots.current.length + 1);
      const at = revealAt(slot, elapsed, lastReveal.current);
      lastReveal.current = at;
      const timer = setTimeout(() => {
        done.current.add(p.id);
        setSeated(new Set(done.current));
        const { playerCount: count, onAllSeated: cb } = latest.current;
        if (!fired.current && done.current.size >= count - 1) {
          fired.current = true;
          cb();
        }
      }, at - elapsed);
      scheduled.current.set(p.id, timer);
    }
  }, [players, myId, enabled]);

  // Unmount (i StrictMode simulacija): tajmeri se gase, raspored kreće ispočetka.
  useEffect(() => {
    const timers = scheduled.current;
    const seatedNow = done.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
      startedAt.current = null;
      slots.current = null;
      lastReveal.current = null;
      seatedNow.clear();
      fired.current = false;
    };
  }, []);

  return seated;
}
