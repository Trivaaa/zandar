"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRoom, type RoomPlayer } from "@/lib/api";
import { getSession } from "@/lib/session";
import { MatchingTable } from "@/components/funnel/MatchingTable";
import { sr } from "@/lib/sr";

/**
 * Matching ekran za privatnu sobu (mid-flow). "Sto se postavlja" — ovalni sto
 * sa sjedištima okolo (DS §7.3), bez "tražim igrače" copy-ja, brojača ni
 * "se pridružio" log-a.
 */
export default function MatchingPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params.roomId;

  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [stage, setStage] = useState<"loading" | "filling" | "done">("loading");
  const [statusText, setStatusText] = useState<string>(sr.matching.preparing);
  const playerCount = 4;

  useEffect(() => {
    const session = getSession(roomId);
    if (!session) {
      router.replace("/");
      return;
    }
    setMyPlayerId(session.playerId);

    getRoom(roomId)
      .then((room) => {
        // Sortiraj: vlastito sjedište uvijek prvo (ide na dno)
        const sorted = [...room.players].sort((a, b) => {
          if (a.id === session.playerId) return -1;
          if (b.id === session.playerId) return 1;
          return a.seatIndex - b.seatIndex;
        });
        setPlayers(sorted);
        setStatusText(sr.matching.seating);
        setStage("filling");
      })
      .catch(() => {
        // Fallback — idi direktno u igru
        router.replace(`/room/${roomId}`);
      });
  }, [roomId, router]);

  // Effect 1: staggered otkrivanje sjedišta
  useEffect(() => {
    if (stage !== "filling" || players.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const STAGGER = 650;
    const FIRST_DELAY = 400;

    players.forEach((_, i) => {
      timers.push(
        setTimeout(() => setRevealed(i + 1), FIRST_DELAY + STAGGER * i),
      );
    });

    const allRevealedAt = FIRST_DELAY + STAGGER * (players.length - 1);
    timers.push(
      setTimeout(() => {
        setStatusText(sr.matching.ready);
        setStage("done");
      }, allRevealedAt + 600),
    );

    return () => timers.forEach(clearTimeout);
  }, [stage, players]);

  // Effect 2: redirect kad je stage "done" — odvojen da ga cleanup Effect 1 ne obriše
  useEffect(() => {
    if (stage !== "done") return;
    const t = setTimeout(() => router.replace(`/room/${roomId}`), 900);
    return () => clearTimeout(t);
  }, [stage, roomId, router]);

  return (
    <MatchingTable
      players={players.slice(0, playerCount)}
      myPlayerId={myPlayerId}
      revealed={revealed}
      statusText={statusText}
      done={stage === "done"}
    />
  );
}
