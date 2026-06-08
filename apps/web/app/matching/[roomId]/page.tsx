"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRoom, type RoomPlayer } from "@/lib/api";
import { getSession } from "@/lib/session";

// Boje po sjedištu — konzistentne kroz animaciju
const SEAT_COLORS = [
  "bg-yellow-500",
  "bg-emerald-500",
  "bg-blue-500",
  "bg-purple-500",
];

function AvatarCircle({
  player,
  isMe,
  visible,
}: {
  player: RoomPlayer | null;
  isMe: boolean;
  visible: boolean;
}) {
  const color = player ? (SEAT_COLORS[player.seatIndex] ?? "bg-zinc-600") : "";

  return (
    <div className="flex flex-col items-center gap-2 w-16">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold transition-all duration-500 ${
          visible && player
            ? `${color} text-white scale-100 opacity-100`
            : "bg-zinc-800 border-2 border-dashed border-zinc-600 scale-90 opacity-40"
        }`}
      >
        {visible && player ? (
          player.displayName.charAt(0).toUpperCase()
        ) : (
          <span className="text-zinc-600 text-lg">?</span>
        )}
      </div>
      <div
        className={`text-xs text-center transition-all duration-300 max-w-[64px] truncate ${
          visible && player ? "opacity-100" : "opacity-0"
        }`}
      >
        {player?.displayName}
        {isMe && (
          <span className="block text-zinc-500 text-[10px]">(ti)</span>
        )}
      </div>
    </div>
  );
}

export default function MatchingPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params.roomId;

  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(0);
  const [stage, setStage] = useState<"loading" | "filling" | "done">("loading");
  const [statusText, setStatusText] = useState("Tražimo igrače...");
  const playerCount = 4;

  useEffect(() => {
    const session = getSession(roomId);
    if (!session) { router.replace("/"); return; }
    setMyPlayerId(session.playerId);

    getRoom(roomId)
      .then((room) => {
        // Sortiraj: vlastito sjedište uvijek prvo
        const sorted = [...room.players].sort((a, b) => {
          if (a.id === session.playerId) return -1;
          if (b.id === session.playerId) return 1;
          return a.seatIndex - b.seatIndex;
        });
        setPlayers(sorted);
        setStage("filling");
      })
      .catch(() => {
        // Fallback — idi direktno u igru
        router.replace(`/room/${roomId}`);
      });
  }, [roomId, router]);

  // Staggered otkrivanje sjedišta + redirect
  useEffect(() => {
    if (stage !== "filling" || players.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const STAGGER = 480;
    const FIRST_DELAY = 250;

    // Otkrij sjedišta jedno po jedno
    players.forEach((_, i) => {
      timers.push(
        setTimeout(() => setRevealed(i + 1), FIRST_DELAY + STAGGER * i),
      );
    });

    // Nakon zadnjeg: "Sto popunjen!"
    const allRevealedAt = FIRST_DELAY + STAGGER * (players.length - 1);
    timers.push(
      setTimeout(() => {
        setStatusText("Sto popunjen! Kreće igra...");
        setStage("done");
      }, allRevealedAt + 500),
    );

    // Redirect
    timers.push(
      setTimeout(() => {
        router.replace(`/room/${roomId}`);
      }, allRevealedAt + 1400),
    );

    return () => timers.forEach(clearTimeout);
  }, [stage, players, roomId, router]);

  // Redovi "X se pridružio" koji se pojavljuju uz svako sjedište
  const joinedLines = players.slice(0, revealed);

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-900 via-green-950 to-zinc-950 text-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-10">
        {/* Naslov */}
        <div className="text-center space-y-2">
          <div className="text-5xl">🃏</div>
          <p
            className={`text-lg font-semibold transition-colors duration-500 ${
              stage === "done" ? "text-yellow-400" : "text-white"
            }`}
          >
            {statusText}
          </p>
        </div>

        {/* Sjedišta */}
        <div className="flex justify-center gap-4">
          {Array.from({ length: playerCount }).map((_, i) => {
            const player = players[i] ?? null;
            const isVisible = i < revealed;
            const isMe = player?.id === myPlayerId;
            return (
              <AvatarCircle
                key={i}
                player={player}
                isMe={isMe}
                visible={isVisible}
              />
            );
          })}
        </div>

        {/* "X se pridružio" log */}
        <div className="space-y-1.5 min-h-[80px]">
          {joinedLines.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-2 text-sm text-zinc-300 animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${SEAT_COLORS[p.seatIndex] ?? "bg-zinc-500"}`}
              />
              <span>
                <strong className="text-white">{p.displayName}</strong>
                {p.id === myPlayerId ? " (ti)" : " se pridružio"}
              </span>
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: playerCount }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i < revealed ? "bg-yellow-500 scale-110" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>
    </main>
  );
}
