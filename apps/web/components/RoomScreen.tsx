"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getRoom,
  getPendingJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  startGame,
  setBotFill,
  quickPlay,
  type RoomInfo,
  type PendingJoinRequest,
} from "@/lib/api";
import { getSession, saveSession, type RoomSession } from "@/lib/session";
import { getSocket } from "@/lib/socket";
import { assertNoBotLeak } from "@/lib/antiLeak";
import { inviteLink, matchingPath } from "@/lib/routes";
import { JoinFlow } from "@/components/JoinFlow";
import { LobbyScreen } from "@/components/lobby/LobbyScreen";
import { GameScreen } from "@/components/GameScreen";
import type { ActiveReaction } from "@/lib/reactions";
import type {
  AbandonVote,
  PrivateGameStateView,
} from "@zandar/shared-types";

type ReactionEvent = {
  playerId: string;
  type: string;
  timestamp: number;
};

type AutoPlayEvent = {
  playerId: string;
  displayName: string;
};

// State sa turnDeadline poljem koje server šalje
type GameStateWithDeadline = PrivateGameStateView & {
  turnDeadline?: number;
};

/**
 * Soba — lobby, join flow i Sto. Dijele je path ruta (`/room/:id`, samo web,
 * invite linkovi) i query ruta (`/room?id=`, kanonska za in-app + WebView).
 */
export function RoomScreen({ roomId }: { roomId: string }) {
  const router = useRouter();

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
  const [gameState, setGameState] = useState<GameStateWithDeadline | null>(
    null,
  );
  const [starting, setStarting] = useState(false);
  const [botFillLoading, setBotFillLoading] = useState(false);
  const [activeReactions, setActiveReactions] = useState<ActiveReaction[]>([]);
  const [autoPlayToast, setAutoPlayToast] = useState<string | null>(null);

  useEffect(() => {
    setSession(getSession(roomId));
    setSessionLoaded(true);
    setInviteUrl(inviteLink(roomId));
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

  // Subscribe na sobu, promise-based (resolve-uje ok/ne-ok). Re-subscribe je
  // bezbjedan i idempotentan na serveru (samo postavi socket.data + join).
  const subscribeSocket = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!session) {
        resolve(false);
        return;
      }
      const s = getSocket();
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
          } else {
            setSocketStatus("connected");
          }
          resolve(res.ok);
        },
      );
    });
  }, [roomId, session]);

  // Emit game-akciju sa self-heal: ako socket nije subscribe-ovan (reconnect /
  // restart servera nakon deploya), transparentno re-subscribe i pokušaj JEDNOM
  // ponovo. U NOT_SUBSCRIBED slučaju potez nije primijenjen pa je retry siguran
  // (stateVersion nepromijenjen; isti clientMoveId → idempotentno).
  const emitAction = useCallback(
    (event: string, payload: unknown): Promise<void> => {
      return new Promise((resolve, reject) => {
        const s = getSocket();
        const send = (canRetry: boolean) => {
          s.emit(event, payload, (res: { ok: boolean; error?: string }) => {
            if (res?.ok) {
              resolve();
              return;
            }
            if (res?.error === "NOT_SUBSCRIBED" && canRetry) {
              void subscribeSocket().then((ok) => {
                if (ok) send(false);
                else reject(new Error("Veza izgubljena — pokušaj ponovo"));
              });
              return;
            }
            reject(new Error(res?.error || "Greška"));
          });
        };
        send(true);
      });
    },
    [subscribeSocket],
  );

  useEffect(() => {
    if (!session) return;

    const s = getSocket();
    setSocketStatus(s.connected ? "connected" : "connecting");

    function subscribe() {
      void subscribeSocket();
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
    function handleGameState(state: GameStateWithDeadline) {
      assertNoBotLeak(state.players); // dev straža (DS §7.1, C4)
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
    function handleAutoPlay(event: AutoPlayEvent) {
      setAutoPlayToast(`⏱ ${event.displayName} nije odigrao — auto-play`);
      setTimeout(() => setAutoPlayToast(null), 3500);
    }

    // Uvijek slušaj connect → re-subscribe na SVAKI (re)connect socket.io-a
    // (auto-reconnect transporta). Prije je listener falio ako smo već povezani.
    s.on("connect", handleConnect);
    s.on("disconnect", handleDisconnect);
    s.on("room:update", handleRoomUpdate);
    s.on("room:joinRequested", handleJoinRequested);
    s.on("game:state", handleGameState);
    s.on("game:reaction", handleReaction);
    s.on("game:autoPlay", handleAutoPlay);
    if (s.connected) handleConnect(); // već povezan na mount-u

    // Page-lifecycle reconnect (Faza D2): na povratak u foreground / online,
    // debounce ~500ms pa re-subscribe (i reconnect ako je socket mrtav) →
    // server pošalje svjež state. Bitno za mobilni (WhatsApp/Viber background).
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    function resume() {
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => {
        if (!s.connected) s.connect();
        else subscribe();
      }, 500);
    }
    function onVisible() {
      if (document.visibilityState === "visible") resume();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", resume);
    window.addEventListener("pageshow", resume);

    return () => {
      s.off("connect", handleConnect);
      s.off("disconnect", handleDisconnect);
      s.off("room:update", handleRoomUpdate);
      s.off("room:joinRequested", handleJoinRequested);
      s.off("game:state", handleGameState);
      s.off("game:reaction", handleReaction);
      s.off("game:autoPlay", handleAutoPlay);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", resume);
      window.removeEventListener("pageshow", resume);
      if (resumeTimer) clearTimeout(resumeTimer);
    };
  }, [roomId, session, subscribeSocket]);

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

  async function handleToggleBotFill() {
    if (!session || !room) return;
    setBotFillLoading(true);
    try {
      await setBotFill(
        roomId,
        session.playerId,
        session.sessionToken,
        !room.botFill,
      );
      // room:update stiže preko socket-a; osvježi i odmah za svaki slučaj
      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      alert("Greška: " + (err instanceof Error ? err.message : "Nepoznato"));
    } finally {
      setBotFillLoading(false);
    }
  }

  async function handlePlayCard(
    cardId: string,
    selectedCaptureCardIds: string[],
  ): Promise<void> {
    if (!gameState) throw new Error("Igra nije aktivna");
    await emitAction("game:playCard", {
      cardId,
      selectedCaptureCardIds,
      clientMoveId: `move-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      clientKnownStateVersion: gameState.stateVersion,
    });
  }

  async function handleNextHand(): Promise<void> {
    await emitAction("game:nextHand", {});
  }

  async function handleRematch(): Promise<void> {
    await emitAction("game:rematch", {});
  }

  /** "Sačekaj još" — resetuje rok pauze na serveru (§32.3). */
  async function handleWaitMore(): Promise<void> {
    await emitAction("game:waitMore", {});
  }

  /** Glas u glasanju o prekidu (§32.4). */
  async function handleAbandonVote(vote: AbandonVote): Promise<void> {
    await emitAction("game:abandonVote", { vote });
  }

  async function handleFindNewTable(): Promise<void> {
    // Napusti ovaj sto i nađi novi (Quick Play sa novim igračima).
    const myName =
      gameState?.players.find((p) => p.id === session?.playerId)?.displayName ??
      localStorage.getItem("zandar_name") ??
      "Igrač";
    try {
      const res = await quickPlay({ displayName: myName });
      saveSession({
        roomId: res.roomId,
        playerId: res.playerId,
        sessionToken: res.playerSessionToken,
      });
      router.push(matchingPath(res.roomId));
    } catch (err) {
      alert("Greška: " + (err instanceof Error ? err.message : "Nepoznato"));
    }
  }

  async function handleReact(type: string): Promise<void> {
    await emitAction("game:react", { type });
  }

  function copyInviteLink() {
    // `navigator.clipboard` traži siguran kontekst i može biti odbijen. U
    // Capacitoru je origin `https://localhost` (androidScheme), pa radi — ali
    // odbijanje ne smije srušiti handler.
    void navigator.clipboard?.writeText(inviteUrl).catch(() => {});
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
      <>
        <GameScreen
          state={gameState}
          onPlayCard={handlePlayCard}
          onNextHand={handleNextHand}
          onRematch={handleRematch}
          onReact={handleReact}
          onLeave={() => router.push("/")}
          onFindNewTable={handleFindNewTable}
          onWaitMore={handleWaitMore}
          onAbandonVote={handleAbandonVote}
          activeReactions={activeReactions}
        />
        {autoPlayToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-surface-raised border border-warn/40 text-white rounded-token-md px-4 py-2 z-50 max-w-md shadow-lg text-sm">
            {autoPlayToast}
          </div>
        )}
      </>
    );
  }

  // Igra je već pokrenuta na serveru (Quick Play startuje odmah, ili reconnect u
  // partiju u toku) — gameState stiže socket-om za koji trenutak. NE prikazuj
  // lobby (invite link, host kontrole, "Pokreni igru") u tom prozoru: nakon
  // matching ekrana mora doći Sto, ne lobby. Drži tih loading dok state ne stigne.
  if (room.status === "playing" || room.status === "finished") {
    return (
      <main className="min-h-screen bg-felt text-white flex items-center justify-center">
        <p className="text-muted">Učitavanje stola...</p>
      </main>
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
    <div className="relative">
      {/* Stanje veze je stanje SOCKET-a, ne lobija — ekran ga uokviruje,
          komponenta ga ne poznaje. */}
      <div
        className={`absolute top-2 right-2 z-10 rounded-token-md px-2.5 py-1 text-xs ${statusBadge.color}`}
      >
        {statusBadge.text}
      </div>

      <LobbyScreen
        roomId={room.id}
        players={room.players}
        playerCount={room.playerCount}
        targetScore={room.targetScore}
        myPlayerId={session.playerId}
        isHost={isHost}
        inviteUrl={inviteUrl}
        copied={copied}
        onCopyInvite={copyInviteLink}
        joinRequests={
          isHost
            ? pendingRequests.map((r) => ({ id: r.id, displayName: r.displayName }))
            : []
        }
        onApprove={(id) => void handleApprove(id)}
        onReject={(id) => void handleReject(id)}
        {...(actionLoading ? { pendingRequestId: actionLoading } : {})}
        fillEmptySeats={room.botFill ?? false}
        onToggleFill={() => void handleToggleBotFill()}
        fillPending={botFillLoading}
        canStart={canStart}
        starting={starting}
        onStart={() => void handleStartGame()}
        onBack={() => router.push("/")}
      />
    </div>
  );
}
