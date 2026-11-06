"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { getRoom, type RoomInfo, type RoomPlayer } from "@/lib/api";
import { getSession } from "@/lib/session";
import { parseQuickPlayPrefs, readQuickPlayPrefsRaw } from "@/lib/quickPlayPrefs";
import { roomPath } from "@/lib/routes";
import { MatchingTable } from "@/components/funnel/MatchingTable";
import { sr } from "@/lib/sr";

const subscribeToNothing = () => () => {};

/**
 * Tempo otkrivanja. Poker ima cilj „prva ruka < 3 s od klika", a server već
 * troši do 2 s na čekanje drugih igrača — pa je njegov obred kratak.
 */
const PACE = {
  zandar: { first: 400, stagger: 650, ready: 600, leave: 900 },
  poker: { first: 0, stagger: 100, ready: 100, leave: 100 },
} as const;
/** Poker Quick Play: koliko često pitati da li je sto popunjen (prozor 2 s). */
const POKER_POLL_MS = 300;
const POKER_POLL_MAX = 12;

/**
 * Matching ekran za privatnu sobu (mid-flow). "Sto se postavlja" — ovalni sto
 * sa sjedištima okolo (DS §7.3), bez "tražim igrače" copy-ja, brojača ni
 * "se pridružio" log-a.
 *
 * Dijele ga path ruta (`/matching/:id`, samo web) i query ruta (`/matching?id=`).
 */
export function MatchingScreen({ roomId }: { roomId: string }) {
  const router = useRouter();

  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [stage, setStage] = useState<"loading" | "filling" | "done">("loading");
  const [statusText, setStatusText] = useState<string>(sr.matching.preparing);
  const [pace, setPace] = useState<(typeof PACE)[keyof typeof PACE]>(PACE.zandar);
  // Veličina stola dok soba ne stigne: zapamćen izbor brze igre, koji je upravo
  // sačuvan (`startQuickPlay`). Čim roster stigne, broj mjesta daje on.
  const prefsRaw = useSyncExternalStore(subscribeToNothing, readQuickPlayPrefsRaw, () => null);
  const expectedPlaces = parseQuickPlayPrefs(prefsRaw).playerCount;

  useEffect(() => {
    const session = getSession(roomId);
    if (!session) {
      router.replace("/");
      return;
    }
    setMyPlayerId(session.playerId);

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Poker Quick Play sto se puni na serveru (prozor za prave igrače), pa se
    // pita dok ne krene ili se ne popuni — tek onda se sjedišta otkrivaju.
    const load = (attempt: number): Promise<RoomInfo> =>
      getRoom(roomId).then((room) => {
        const filling =
          room.game === "poker" &&
          room.status === "waiting" &&
          room.players.length < room.playerCount &&
          attempt < POKER_POLL_MAX;
        if (!filling || cancelled) return room;
        return new Promise<RoomInfo>((resolve, reject) => {
          timer = setTimeout(() => load(attempt + 1).then(resolve, reject), POKER_POLL_MS);
        });
      });

    load(0)
      .then((room) => {
        if (cancelled) return;
        if (room.game === "poker") setPace(PACE.poker);
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
        if (!cancelled) router.replace(roomPath(roomId));
      });
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [roomId, router]);

  // Effect 1: staggered otkrivanje sjedišta
  useEffect(() => {
    if (stage !== "filling" || players.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const STAGGER = pace.stagger;
    const FIRST_DELAY = pace.first;

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
      }, allRevealedAt + pace.ready),
    );

    return () => timers.forEach(clearTimeout);
  }, [stage, players, pace]);

  // Effect 2: redirect kad je stage "done" — odvojen da ga cleanup Effect 1 ne obriše
  useEffect(() => {
    if (stage !== "done") return;
    const t = setTimeout(() => router.replace(roomPath(roomId)), pace.leave);
    return () => clearTimeout(t);
  }, [stage, roomId, router, pace]);

  return (
    <MatchingTable
      players={players}
      expectedPlaces={expectedPlaces}
      myPlayerId={myPlayerId}
      revealed={revealed}
      statusText={statusText}
      done={stage === "done"}
    />
  );
}
