"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getRoom,
  getPendingJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  startGame,
  type RoomInfo,
  type PendingJoinRequest,
} from "@/lib/api";
import { getSession, type RoomSession } from "@/lib/session";
import { getSocket } from "@/lib/socket";
import { JoinFlow } from "@/components/JoinFlow";
import { GameView, type ActiveReaction } from "@/components/GameView";
import type { PrivateGameStateView } from "@zandar/shared-types";

type ReactionEvent = {
  playerId: string;
  type: string;
  timestamp: number;
};

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const router = useRouter();
  const roomId = params.roomId;

  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<RoomSession | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteUrl, setInviteUrl] = useState("");
  const [socketStatus, setSocketStatus] = useState<
    "disconnected" | "connecting" | "connected" | "error"
  >("disconnected");
  const [pendingRequests, setPendingRequests] = useState<PendingJoinRequest[]>(
    [],
  );
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [gameState, setGameState] = useState<PrivateGameStateView | null>(
    null,
  );
  const [starting, setStarting] = useState(false);
  const [activeReactions, setActiveReactions] = useState<ActiveReaction[]>([]);

  useEffect(() => {
    setSession(getSession(roomId));
    setSessionLoaded(true);
    setInviteUrl(`${window.location.origin}/room/${roomId}`);
  }, [roomId]);

  useEffect(() => {
    let cancelled = false;
    getRoom(roomId)
      .then((info) => {
        if (!cancelled) setRoom(info);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [roomId, refreshTrigger]);

  useEffect(() => {
    if (!session || !room) return;
    const me = room.players.find((p) => p.id === session.playerId);
    const iAmHost = me?.isHost ?? false;
    if (!iAmHost) {
      setPendingRequests([]);
      return;
    }

    let cancelled = false;
    getPendingJoinRequests(roomId, session.playerId, session.sessionToken)
      .then((pending) => {
        if (!cancelled) setPendingRequests(pending);
      })
      .catch((err) => console.error("Failed to fetch pending:", err));

    return () => {
      cancelled = true;
    };
  }, [session, room, roomId, refreshTrigger]);

  useEffect(() => {
    if (!session) return;

    const s = getSocket();
    setSocketStatus(s.connected ? "connected" : "connecting");

    function subscribe() {
      if (!session) return;
      s.emit(
        "room:subscribe",
        {
          roomId,
          playerId: session.playerId,
          sessionToken: session.sessionToken,
        },
        (res: { ok: boolean; error?: string }) => {
          if (!res.ok) {
            console.error("Subscribe failed:", res.error);
            setSocketStatus("error");
          }
        },
      );
    }

    function handleConnect() {
      setSocketStatus("connected");
      subscribe();
    }
    function handleDisconnect() {
      setSocketStatus("disconnected");
    }
    function handleRoomUpdate() {
      setRefreshTrigger((n) => n + 1);
    }
    function handleJoinRequested() {
      setRefreshTrigger((n) => n + 1);
    }
    function handleGameState(state: PrivateGameStateView) {
      setGameState(state);
    }
    function handleReaction(event: ReactionEvent) {
      const id = `${event.timestamp}-${Math.random().toString(36).slice(2)}`;
      const reaction: ActiveReaction = {
        id,
        playerId: event.playerId,
        type: event.type,
      };
      setActiveReactions((prev) => [...prev, reaction]);
      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== id));
      }, 3000);
    }

    if (s.connected) {
      handleConnect();
    } else {
      s.on("connect", handleConnect);
    }
    s.on("disconnect", handleDisconnect);
    s.on("room:update", handleRoomUpdate);
    s.on("room:joinRequested", handleJoinRequested);
    s.on("game:state", handleGameState);
    s.on("game:reaction", handleReaction);

    return () => {
      s.off("connect", handleConnect);
      s.off("disconnect", handleDisconnect);
      s.off("room:update", handleRoomUpdate);
      s.off("room:joinRequested", handleJoinRequested);
      s.off("game:state", handleGameState);
      s.off("game:reaction", handleReaction);
    };
  }, [roomId, session]);

  async function handleApprove(requestId: string) {
    if (!session) return;
    setActionLoading(requestId);
    try {
      await approveJoinRequest(
        roomId,
        requestId,
        session.playerId,
        session.sessionToken,
      );
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      alert(
        "Greška: " + (err instanceof Error ? err.message : "Nepoznato"),
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(requestId: string) {
    if (!session) return;
    setActionLoading(requestId);
    try {
      await rejectJoinRequest(
        roomId,
        requestId,
        session.playerId,
        session.sessionToken,
      );
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err) {
      alert(
        "Greška: " + (err instanceof Error ? err.message : "Nepoznato"),
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStartGame() {
    if (!session) return;
    setStarting(true);
    try {
      await startGame(roomId, session.playerId, session.sessionToken);
    } catch (err) {
      alert(
        "Greška: " + (err instanceof Error ? err.message : "Nepoznato"),
      );
    } finally {
      setStarting(false);
    }
  }

  async function handlePlayCard(
    cardId: string,
    selectedCaptureCardIds: string[],
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!gameState) {
        reject(new Error("Igra nije aktivna"));
        return;
      }
      const s = getSocket();
      s.emit(
        "game:playCard",
        {
          cardId,
          selectedCaptureCardIds,
          clientMoveId: `move-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          clientKnownStateVersion: gameState.stateVersion,
        },
        (res: { ok: boolean; error?: string }) => {
          if (res?.ok) resolve();
          else reject(new Error(res?.error || "Greška"));
        },
      );
    });
  }

  async function handleNextHand(): Promise<void> {
    return new Promise((resolve, reject) => {
      const s = getSocket();
      s.emit(
        "game:nextHand",
        {},
        (res: { ok: boolean; error?: string }) => {
          if (res?.ok) resolve();
          else reject(new Error(res?.error || "Greška"));
        },
      );
    });
  }

  async function handleRematch(): Promise<void> {
    return new Promise((resolve, reject) => {
      const s = getSocket();
      s.emit(
        "game:rematch",
        {},
        (res: { ok: boolean; error?: string }) => {
          if (res?.ok) resolve();
          else reject(new Error(res?.error || "Greška"));
        },
      );
    });
  }

  async function handleReact(type: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const s = getSocket();
      s.emit(
        "game:react",
        { type },
        (res: { ok: boolean; error?: string }) => {
          if (res?.ok) resolve();
          else reject(new Error(res?.error || "Greška"));
        },
      );
    });
  }

  function copyInviteLink() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (error) {
    return (
      <main className="min-h-screen bg-green-900 text-white p-8 flex items-center justify-center">
        <div className="bg-red-800 rounded p-6 max-w-md">
          <h1 className="text-xl font-bold mb-2">⚠️ Greška</h1>
          <p>{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded"
            type="button"
          >
            Nazad
          </button>
        </div>
      </main>
    );
  }

  if (!room || !sessionLoaded) {
    return (
      <main className="min-h-screen bg-green-900 text-white flex items-center justify-center">
        <p>Učitavanje...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-green-900 text-white p-8 flex items-center justify-center">
        <JoinFlow roomId={roomId} room={room} />
      </main>
    );
  }

  if (gameState) {
    return (
      <GameView
        state={gameState}
        onPlayCard={handlePlayCard}
        onNextHand={handleNextHand}
        onRematch={handleRematch}
        onReact={handleReact}
        activeReactions={activeReactions}
      />
    );
  }

  const me = room.players.find((p) => p.id === session.playerId);
  const isHost = me?.isHost ?? false;
  const playersNeeded = room.playerCount - room.players.length;
  const canStart = playersNeeded === 0;

  const statusBadge = {
    connected: { text: "🟢 Live", color: "bg-green-700" },
    connecting: { text: "🟡 Povezuje...", color: "bg-yellow-700" },
    disconnected: { text: "🔴 Offline", color: "bg-zinc-700" },
    error: { text: "⚠️ Greška", color: "bg-red-700" },
  }[socketStatus];

  return (
    <main className="min-h-screen bg-green-900 text-white p-8 relative">
      <div
        className={`absolute top-4 right-4 px-3 py-1 rounded text-xs ${statusBadge.color}`}
      >
        {statusBadge.text}
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        <div className="bg-zinc-900 rounded-lg p-6">
          <div className="flex items-baseline justify-between mb-4">
            <h1 className="text-2xl font-bold">Soba {room.id}</h1>
            <span className="text-sm text-zinc-400">
              {room.players.length} / {room.playerCount} igrača ·{" "}
              {room.targetScore} poena
            </span>
          </div>

          <div className="bg-green-800 rounded p-3 mb-4">
            <p className="text-xs text-green-300 mb-2">Pozovi prijatelje:</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 px-3 py-2 bg-green-950 rounded font-mono text-sm"
                onClick={(e) => e.currentTarget.select()}
              />
              <button
                onClick={copyInviteLink}
                className="px-4 py-2 bg-yellow-500 text-zinc-900 rounded font-bold hover:bg-yellow-400 whitespace-nowrap"
                type="button"
              >
                {copied ? "✓ Kopirano" : "Kopiraj"}
              </button>
            </div>
          </div>

          {isHost && pendingRequests.length > 0 && (
            <div className="bg-yellow-900/40 border border-yellow-700 rounded p-3 mb-4">
              <p className="text-sm font-semibold mb-2 text-yellow-200">
                🔔 Zahtjevi za ulazak ({pendingRequests.length}):
              </p>
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-2 bg-yellow-950/60 rounded p-2"
                  >
                    <div className="w-9 h-9 bg-yellow-700 rounded-full flex items-center justify-center text-sm font-bold">
                      {req.displayName.charAt(0).toUpperCase()}
                    </div>
                    <p className="flex-1 font-semibold text-sm">
                      {req.displayName}
                    </p>
                    <button
                      onClick={() => handleApprove(req.id)}
                      disabled={actionLoading !== null}
                      className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-sm font-bold disabled:opacity-50"
                      type="button"
                    >
                      {actionLoading === req.id ? "..." : "✓ Odobri"}
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={actionLoading !== null}
                      className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-sm font-bold disabled:opacity-50"
                      type="button"
                    >
                      ✗ Odbij
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2 mb-4">
            <p className="text-sm font-semibold">Igrači:</p>
            {room.players.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 bg-zinc-800 rounded p-3"
              >
                <div className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center font-bold">
                  {p.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">
                    {p.displayName}
                    {p.id === session.playerId && (
                      <span className="text-xs text-zinc-400 ml-2">(ti)</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Sjedište {p.seatIndex}
                    {p.isHost && " · Host"}
                    {p.teamId !== undefined &&
                      ` · Tim ${p.teamId === 0 ? "A" : "B"}`}
                  </p>
                </div>
              </div>
            ))}

            {Array.from({ length: playersNeeded }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="flex items-center gap-3 bg-zinc-800/50 rounded p-3 border border-dashed border-zinc-700"
              >
                <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center text-zinc-500">
                  ?
                </div>
                <p className="text-zinc-500 italic">Čeka se igrač...</p>
              </div>
            ))}
          </div>

          {isHost ? (
            <button
              disabled={!canStart || starting}
              onClick={handleStartGame}
              className="w-full px-4 py-3 bg-yellow-500 text-zinc-900 rounded font-bold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
              type="button"
            >
              {starting
                ? "Pokretanje..."
                : canStart
                  ? "Pokreni igru"
                  : `Čeka se još ${playersNeeded} igrača`}
            </button>
          ) : (
            <p className="text-center text-zinc-400 text-sm">
              Čeka se da host pokrene igru...
            </p>
          )}
        </div>

        <button
          onClick={() => router.push("/")}
          className="text-sm text-zinc-400 hover:text-white"
          type="button"
        >
          ← Nazad
        </button>
      </div>
    </main>
  );
}
