"use client";

import { useEffect, useState, type FormEvent } from "react";
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
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

  // FORM (with optional error message)
  if (state.kind === "form" || state.kind === "error") {
    return (
      <form
        onSubmit={handleSubmit}
        className="max-w-md w-full bg-zinc-900 rounded-lg p-6 space-y-4"
      >
        <h1 className="text-2xl font-bold">Pridruži se sobi</h1>
        <p className="text-sm text-zinc-400">
          Soba <span className="font-mono">{room.id}</span> ·{" "}
          {room.players.length}/{room.playerCount} igrača · {room.targetScore}{" "}
          poena
        </p>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Tvoje ime</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={30}
            autoFocus
            className="w-full px-3 py-2 bg-zinc-800 rounded border border-zinc-700 focus:border-yellow-500 outline-none"
            placeholder="npr. Marko"
          />
        </div>

        {state.kind === "error" && (
          <div className="px-3 py-2 bg-red-800 rounded text-sm">
            ⚠️ {state.message}
          </div>
        )}

        <button
          type="submit"
          disabled={!displayName.trim()}
          className="w-full px-4 py-3 bg-yellow-500 text-zinc-900 rounded font-bold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Pošalji zahtjev hostu
        </button>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="w-full px-4 py-2 text-sm text-zinc-400 hover:text-white"
        >
          Otkaži
        </button>
      </form>
    );
  }

  // SUBMITTING
  if (state.kind === "submitting") {
    return (
      <div className="max-w-md w-full bg-zinc-900 rounded-lg p-6 text-center">
        <p className="text-zinc-400">Šaljem zahtjev...</p>
      </div>
    );
  }

  // PENDING
  if (state.kind === "pending") {
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return (
      <div className="max-w-md w-full bg-zinc-900 rounded-lg p-6 space-y-4 text-center">
        <div className="text-5xl animate-pulse">⏳</div>
        <h2 className="text-xl font-bold">Čeka se odobrenje hosta...</h2>
        <p className="text-zinc-400 text-sm">
          Tvoj zahtjev kao{" "}
          <strong className="text-white">{displayName}</strong> je poslan.
        </p>
        <div className="bg-zinc-800 rounded p-3 font-mono text-2xl tabular-nums">
          {minutes}:{seconds.toString().padStart(2, "0")}
        </div>
        <p className="text-xs text-zinc-500">
          Ako host ne odgovori, zahtjev će isteći.
        </p>
        <button
          onClick={retry}
          className="text-sm text-zinc-400 hover:text-white"
          type="button"
        >
          Otkaži zahtjev
        </button>
      </div>
    );
  }

  // APPROVED
  if (state.kind === "approved") {
    return (
      <div className="max-w-md w-full bg-green-700 rounded-lg p-6 text-center space-y-3">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold">Odobreno! Ulaziš u sobu...</h2>
      </div>
    );
  }

  // REJECTED
  if (state.kind === "rejected") {
    return (
      <div className="max-w-md w-full bg-zinc-900 rounded-lg p-6 space-y-4 text-center">
        <div className="text-5xl">🚫</div>
        <h2 className="text-xl font-bold">Host te je odbio</h2>
        <p className="text-zinc-400 text-sm">
          Možeš pokušati ponovo ili otići.
        </p>
        <div className="space-y-2">
          <button
            onClick={retry}
            className="w-full px-4 py-2 bg-yellow-500 text-zinc-900 rounded font-bold hover:bg-yellow-400"
            type="button"
          >
            Pokušaj ponovo
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full px-4 py-2 text-sm text-zinc-400 hover:text-white"
            type="button"
          >
            Nazad na home
          </button>
        </div>
      </div>
    );
  }

  // EXPIRED
  if (state.kind === "expired") {
    return (
      <div className="max-w-md w-full bg-zinc-900 rounded-lg p-6 space-y-4 text-center">
        <div className="text-5xl">⏰</div>
        <h2 className="text-xl font-bold">Zahtjev je istekao</h2>
        <p className="text-zinc-400 text-sm">Host nije odgovorio na vrijeme.</p>
        <div className="space-y-2">
          <button
            onClick={retry}
            className="w-full px-4 py-2 bg-yellow-500 text-zinc-900 rounded font-bold hover:bg-yellow-400"
            type="button"
          >
            Pokušaj ponovo
          </button>
          <button
            onClick={() => router.push("/")}
            className="w-full px-4 py-2 text-sm text-zinc-400 hover:text-white"
            type="button"
          >
            Nazad
          </button>
        </div>
      </div>
    );
  }

  return null;
}
