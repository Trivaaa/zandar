"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoomPlayer } from "@/lib/api";
import { MatchingTable } from "@/components/MatchingTable";

/**
 * Dev preview za MatchingTable (DS §7.3). Pušta staggered "sto se postavlja"
 * sekvencu sa mock igračima. Nije produkcijski flow.
 */

const PLAYERS: RoomPlayer[] = [
  { id: "me", displayName: "Ti", seatIndex: 0, isHost: true },
  { id: "p1", displayName: "Marko Petrović", seatIndex: 1, isHost: false },
  { id: "p2", displayName: "KomšijaPero", seatIndex: 2, isHost: false },
  { id: "p3", displayName: "guest1244", seatIndex: 3, isHost: false },
];

export default function DevMatchingPage() {
  const [revealed, setRevealed] = useState(0);
  const [statusText, setStatusText] = useState("Pripremamo sto...");
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const run = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setRevealed(0);
    setDone(false);
    setStatusText("Pripremamo sto...");

    const delays = [400, 1240, 2060, 2760];
    delays.forEach((d, i) => {
      timers.current.push(
        setTimeout(() => {
          setRevealed(i + 1);
          if (i === 0) setStatusText("Igrači sjedaju...");
        }, d),
      );
    });
    timers.current.push(
      setTimeout(() => {
        setStatusText("Sto je popunjen");
        setDone(true);
      }, 3300),
    );
  }, []);

  useEffect(() => {
    run();
    return () => timers.current.forEach(clearTimeout);
  }, [run]);

  return (
    <div className="relative">
      <MatchingTable
        players={PLAYERS}
        myPlayerId="me"
        revealed={revealed}
        statusText={statusText}
        done={done}
      />
      <button
        type="button"
        onClick={run}
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-token-md bg-accent text-accent-contrast font-bold text-sm active:scale-95 transition-transform mb-safe-bottom"
      >
        ▷ Pusti ponovo
      </button>
    </div>
  );
}
