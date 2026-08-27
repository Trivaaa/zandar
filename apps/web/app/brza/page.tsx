"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { quickPlay, getRoom } from "@/lib/api";
import type { RoomPlayer } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { MatchingTable } from "@/components/funnel/MatchingTable";
import { sr } from "@/lib/sr";

// ---- constants ----

const NAME_KEY = "zandar_name";

/** Minimum total duration of the matching experience (theatre). */
const MIN_MS = 3_000;

/**
 * After this many ms without a server response, switch to a calm holding
 * message ("Pripremamo sto…") instead of an error. Redirect fires as soon
 * as the room arrives.
 */
const MAX_WAIT_MS = 5_000;

/**
 * Seat reveal delays (ms) from when the animation phase starts.
 * Seat 0 is always the local player — fills immediately.
 * Slightly irregular cadence to avoid an obviously mechanical feel.
 */
const STAGGER_DELAYS = [0, 840, 1_620, 2_320] as const;

/** When to flip status text to "Sto je popunjen". */
const DONE_TEXT_AT = STAGGER_DELAYS[3] + 480; // 2 800 ms

/** When to mark animation complete (gives text 200 ms to settle). */
const ANIM_DONE_AT = DONE_TEXT_AT + 200; // 3 000 ms

// ---- types ----

type Stage = "input" | "searching" | "animating" | "done" | "slow";

// ---- component ----

export default function BrzaPage() {
  const router = useRouter();

  // form state
  const [savedName, setSavedName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // matching state
  const [stage, setStage] = useState<Stage>("input");
  const [statusText, setStatusText] = useState<string>(sr.matching.preparing);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);

  // refs — safe to read from timer callbacks without stale-closure issues
  const hasStarted = useRef(false);
  const roomId = useRef<string | null>(null);
  const roomReady = useRef(false);
  const minElapsed = useRef(false);
  const animDone = useRef(false);

  // ---- redirect gate ----
  // Called from both the min-timer and the anim-done timer.
  // Fires only when ALL three conditions are met.
  function checkRedirect() {
    if (roomReady.current && minElapsed.current && animDone.current) {
      setStage("done");
    }
  }

  // ---- main flow ----
  async function handlePlay(name: string) {
    if (hasStarted.current) return;
    hasStarted.current = true;

    localStorage.setItem(NAME_KEY, name);
    setSavedName(name);
    setStage("searching");
    setStatusText(sr.matching.preparing);
    setFormError(null);

    // Min-duration timer — enforce theatre floor of 3 s
    const minTimer = setTimeout(() => {
      minElapsed.current = true;
      checkRedirect();
    }, MIN_MS);

    // Slow-path timer — calm message if server takes > 5 s
    const maxTimer = setTimeout(() => {
      setStage("slow");
      setStatusText(sr.matching.preparing);
    }, MAX_WAIT_MS);

    try {
      const res = await quickPlay({ displayName: name });

      // Persist session before any redirect so /room/:id can auth
      saveSession({
        roomId: res.roomId,
        playerId: res.playerId,
        sessionToken: res.playerSessionToken,
      });
      roomId.current = res.roomId;
      setMyPlayerId(res.playerId);

      const room = await getRoom(res.roomId);
      clearTimeout(maxTimer);

      // Sort: local player first (seat 0 in display), then seatIndex order
      const sorted = [...room.players].sort((a, b) => {
        if (a.id === res.playerId) return -1;
        if (b.id === res.playerId) return 1;
        return a.seatIndex - b.seatIndex;
      });

      setPlayers(sorted);
      roomReady.current = true;
      setStatusText(sr.matching.seating);
      setStage("animating");
    } catch {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
      hasStarted.current = false;
      roomReady.current = false;
      setFormError("Greška pri traženju stola. Pokušaj ponovo.");
      setStage("input");
    }
  }

  // ---- mount: load saved name; auto-start if found ----
  useEffect(() => {
    const stored = localStorage.getItem(NAME_KEY);
    if (stored) {
      setSavedName(stored);
      setNameInput(stored);
      void handlePlay(stored);
    }
    // Only run on mount — handlePlay is guarded by hasStarted ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Effect 1: staggered seat reveals ----
  useEffect(() => {
    if (stage !== "animating" || players.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    STAGGER_DELAYS.forEach((delay, i) => {
      timers.push(setTimeout(() => setRevealed(i + 1), delay));
    });

    timers.push(
      setTimeout(() => setStatusText(sr.matching.ready), DONE_TEXT_AT),
    );

    timers.push(
      setTimeout(() => {
        animDone.current = true;
        checkRedirect();
      }, ANIM_DONE_AT),
    );

    return () => timers.forEach(clearTimeout);
    // checkRedirect reads only refs — safe to omit from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, players]);

  // ---- Effect 2: redirect — separate so Effect 1's cleanup can't cancel it ----
  useEffect(() => {
    if (stage !== "done" || !roomId.current) return;
    // NOTE: prompt says /zandar/room/:id — using existing /room/:id route
    const t = setTimeout(() => router.replace(`/room/${roomId.current}`), 900);
    return () => clearTimeout(t);
  }, [stage, router]);

  // ---- derived ----
  const isMatchingPhase = stage !== "input";

  // ---- render: input phase ----
  if (!isMatchingPhase) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-green-900 via-green-950 to-zinc-950 text-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-xs space-y-6 text-center">
          <div className="text-5xl">🃏</div>
          <h1 className="text-3xl font-bold tracking-tight">Žandar</h1>
          <p className="text-green-200 text-sm">
            Klasična kartaška — sad i online. Odmah.
          </p>

          {savedName ? (
            /* Returning player — one tap */
            <div className="space-y-3">
              <p className="text-zinc-400 text-sm">
                Igraš kao{" "}
                <strong className="text-white">{savedName}</strong>
                {" · "}
                <button
                  type="button"
                  onClick={() => {
                    setSavedName(null);
                    localStorage.removeItem(NAME_KEY);
                  }}
                  className="underline text-zinc-400 active:text-white"
                >
                  Promijeni
                </button>
              </p>
              <button
                type="button"
                onClick={() => void handlePlay(savedName)}
                className="w-full py-5 bg-yellow-500 active:bg-yellow-600 active:scale-95 text-zinc-900 rounded-xl font-bold text-xl shadow-xl shadow-yellow-500/20 transition-transform"
              >
                Igra – nađi sto
              </button>
            </div>
          ) : (
            /* New player — name input */
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handlePlay(nameInput.trim());
              }}
              className="space-y-3"
            >
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Tvoje ime"
                maxLength={30}
                required
                autoFocus
                className="w-full px-4 py-4 bg-zinc-800/80 border border-zinc-700 focus:border-yellow-500 rounded-xl text-white text-lg outline-none text-center placeholder:text-zinc-500 transition-colors"
              />
              {formError && (
                <p className="text-red-400 text-sm">{formError}</p>
              )}
              <button
                type="submit"
                disabled={!nameInput.trim()}
                className="w-full py-5 bg-yellow-500 active:bg-yellow-600 active:scale-95 disabled:opacity-50 text-zinc-900 rounded-xl font-bold text-xl shadow-xl shadow-yellow-500/20 transition-transform"
              >
                Igra – nađi sto
              </button>
            </form>
          )}

          <div className="pt-1">
            <a
              href="/create"
              className="text-sm text-zinc-500 active:text-zinc-300 underline"
            >
              Kreiraj privatnu sobu →
            </a>
          </div>
        </div>
      </main>
    );
  }

  // ---- render: matching phase (searching / animating / done / slow) ----
  // "Sto se postavlja" — ovalni sto sa sjedištima okolo (DS §7.3).
  return (
    <MatchingTable
      players={players}
      myPlayerId={myPlayerId}
      revealed={revealed}
      statusText={statusText}
      done={stage === "done"}
    />
  );
}
