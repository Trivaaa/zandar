"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  submitJoinRequest,
  getJoinRequestStatus,
  type RoomInfo,
} from "@/lib/api";
import {
  saveSession,
  saveJoinPending,
  getJoinPending,
  clearJoinPending,
} from "@/lib/session";
import {
  JoinRequestScreen,
  type JoinRequestPhase,
} from "@/components/lobby/JoinRequestScreen";

type State =
  | { kind: "form" }
  | { kind: "submitting" }
  | { kind: "pending"; requestId: string; expiresAt: number }
  | { kind: "rejected" }
  | { kind: "expired" }
  | { kind: "approved" }
  | { kind: "error"; message: string };

export function JoinFlow({
  roomId,
  room,
}: {
  roomId: string;
  room: RoomInfo;
}) {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [remaining, setRemaining] = useState<number>(0);

  // Load pending state from localStorage on mount
  useEffect(() => {
    const pending = getJoinPending(roomId);
    if (pending && pending.expiresAt > Date.now()) {
      setState({
        kind: "pending",
        requestId: pending.requestId,
        expiresAt: pending.expiresAt,
      });
      setDisplayName(pending.displayName);
    } else {
      if (pending) clearJoinPending(roomId);
      setState({ kind: "form" });
    }
  }, [roomId]);

  // Countdown timer for pending state
  useEffect(() => {
    if (!state || state.kind !== "pending") return;
    const tick = () => {
      const left = Math.max(0, state.expiresAt - Date.now());
      setRemaining(left);
      if (left === 0) {
        setState({ kind: "expired" });
        clearJoinPending(roomId);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state, roomId]);

  // Poll join request status when pending
  useEffect(() => {
    if (!state || state.kind !== "pending") return;
    const requestId = state.requestId;
    let cancelled = false;

    async function poll() {
      try {
        const status = await getJoinRequestStatus(roomId, requestId);
        if (cancelled) return;
        if (status.status === "approved") {
          saveSession({
            roomId,
            playerId: status.playerId,
            sessionToken: status.sessionToken,
          });
          clearJoinPending(roomId);
          setState({ kind: "approved" });
          setTimeout(() => window.location.reload(), 800);
        } else if (status.status === "rejected") {
          clearJoinPending(roomId);
          setState({ kind: "rejected" });
        } else if (status.status === "expired") {
          clearJoinPending(roomId);
          setState({ kind: "expired" });
        }
      } catch {
        // ignore, retry
      }
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [state, roomId]);

  async function handleSubmit() {
    if (!displayName.trim()) return;
    setState({ kind: "submitting" });
    try {
      const res = await submitJoinRequest(roomId, displayName.trim());
      saveJoinPending({
        roomId,
        requestId: res.requestId,
        displayName: displayName.trim(),
        expiresAt: res.expiresAt,
      });
      setState({
        kind: "pending",
        requestId: res.requestId,
        expiresAt: res.expiresAt,
      });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Greška",
      });
    }
  }

  function retry() {
    clearJoinPending(roomId);
    setState({ kind: "form" });
  }

  if (!state) return null;

  // Naša stanja se poklapaju sa fazama ekrana jedan-na-jedan, osim greške:
  // ona ostaje UZ formu (retryable), pa ide kao `form` + `message`.
  const phase: JoinRequestPhase =
    state.kind === "submitting"
      ? "sending"
      : state.kind === "error"
        ? "form"
        : state.kind;

  return (
    <JoinRequestScreen
      roomId={roomId}
      playersJoined={room.players.length}
      playerCount={room.playerCount}
      targetScore={room.targetScore}
      phase={phase}
      displayName={displayName}
      onDisplayName={setDisplayName}
      onSubmit={() => void handleSubmit()}
      {...(state.kind === "pending" ? { remainingMs: remaining } : {})}
      {...(state.kind === "error" ? { message: state.message } : {})}
      onBack={state.kind === "rejected" || state.kind === "expired" ? retry : () => router.push("/")}
    />
  );
}
