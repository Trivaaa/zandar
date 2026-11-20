"use client";

import { useEffect, useState } from "react";
import type { GameId } from "@zandar/shared-types";

import { ShuffleScreen } from "@/components/funnel/ShuffleScreen";
import type { RoomPlayer } from "@/lib/api";
import { SHUFFLE_EXIT_MS, shuffleKicker } from "@/lib/shuffleView";
import { useQueryParam } from "@/lib/useQuery";

/**
 * Dev pregled „Miješamo špil" (tabla UI_MijesanjeSpila) — prava komponenta,
 * bez servera. /dev/* je 404 u produkciji.
 *
 *   /dev/shuffle?n=4&game=zandar     S1: miješanje, svi igrači već tu
 *   /dev/shuffle?n=4&seated=1        S1: sam za stolom, ostali „slobodno"
 *   /dev/shuffle?n=4&arrive=700      igrači stižu na svakih 700 ms (kao poker prozor)
 *   /dev/shuffle?n=4&ready=4200      stanje „stigne" poslije 4,2 s → S2 usred kruga
 *   /dev/shuffle?ready=0             S2 odmah (statičan snimak „sto je pun")
 *   reduced-motion: emulacija u devtools (S3)
 */
const NAMES: RoomPlayer[] = [
  { id: "me", displayName: "Igor", seatIndex: 0, isHost: true },
  { id: "p1", displayName: "SokoKap", seatIndex: 1, isHost: false },
  { id: "p2", displayName: "Jelena", seatIndex: 2, isHost: false, avatar: "sova" },
  { id: "p3", displayName: "Mirza", seatIndex: 3, isHost: false },
];

export default function DevShufflePage() {
  const n = Math.min(4, Math.max(2, Number(useQueryParam("n") ?? 4) || 4));
  const game = (useQueryParam("game") ?? "zandar") as GameId;
  const seatedParam = useQueryParam("seated");
  const arrive = Number(useQueryParam("arrive") ?? 0);
  const readyParam = useQueryParam("ready");
  const [seated, setSeated] = useState<number | null>(null);
  const [exiting, setExiting] = useState(false);
  const [table, setTable] = useState(false);

  const shown = seated ?? (seatedParam ? Number(seatedParam) : arrive > 0 ? 1 : n);

  useEffect(() => {
    if (arrive <= 0) return;
    const timers = Array.from({ length: n - 1 }, (_, i) => setTimeout(() => setSeated(i + 2), arrive * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, [arrive, n]);

  useEffect(() => {
    if (readyParam === null) return;
    const t = setTimeout(() => setExiting(true), Number(readyParam) || 0);
    return () => clearTimeout(t);
  }, [readyParam]);

  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => setTable(true), SHUFFLE_EXIT_MS);
    return () => clearTimeout(t);
  }, [exiting]);

  if (table && readyParam !== "0") {
    return (
      <main className="screen items-center justify-center">
        <p>Sto (uvod gotov za {SHUFFLE_EXIT_MS} ms poslije stanja)</p>
      </main>
    );
  }

  return (
    <ShuffleScreen
      kicker={shuffleKicker({ game, playerCount: n, targetScore: 11 })}
      players={NAMES.slice(0, Math.min(shown, n))}
      myPlayerId="me"
      playerCount={n}
      exiting={exiting}
    />
  );
}
