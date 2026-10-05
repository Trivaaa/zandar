"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  attachJoinRequestPush,
  submitJoinRequest,
  getJoinRequestStatus,
  type RoomInfo,
} from "@/lib/api";
import { getPushId, PUSH_REGISTERED_EVENT } from "@/lib/push";
import { PushPrompt } from "@/components/push/PushPrompt";
import {
  saveSession,
  type RoomSession,
  saveJoinPending,
  getJoinPending,
  clearJoinPending,
} from "@/lib/session";
import { savePlayerName, usePlayerName } from "@/lib/playerName";
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
  onApproved,
}: {
  roomId: string;
  room: RoomInfo;
  /** Sesija je sačuvana — roditelj je preuzima i crta sobu, BEZ reload-a stranice. */
  onApproved: (session: RoomSession) => void;
}) {
  const router = useRouter();
  const [state, setState] = useState<State | null>(null);
  // `null` = gost još nije kucao → polje nosi sačuvano ime (obrazac iz `/ime`).
  const savedName = usePlayerName();
  const [draft, setDraft] = useState<string | null>(null);
  const displayName = draft ?? savedName ?? "";
  const [remaining, setRemaining] = useState<number>(0);
  const onApprovedRef = useRef(onApproved);
  useEffect(() => {
    onApprovedRef.current = onApproved;
  }, [onApproved]);
  const approvedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (approvedTimer.current) clearTimeout(approvedTimer.current);
  }, []);

  // Load pending state from localStorage on mount.
  //
  // Lokalno istekao rok NIJE razlog da se zahtjev odbaci: gost se najčešće
  // vraća baš zato što je odobren dok je bio van aplikacije (push "ulazak je
  // odobren" / "partija počinje"). Ishod zna samo server, pa zapamćen zahtjev
  // uvijek ide u `pending` i poll ispod ga razriješi.
  useEffect(() => {
    const pending = getJoinPending(roomId);
    if (pending) {
      setState({
        kind: "pending",
        requestId: pending.requestId,
        expiresAt: pending.expiresAt,
      });
      setDraft(pending.displayName);
    } else {
      setState({ kind: "form" });
    }
  }, [roomId]);

  // Countdown timer for pending state. Samo PRIKAZ — sat ne proglašava istek.
  // U pozadini tajmeri stoje, pa bi na povratku lokalni sat "istekao" prije
  // nego što poll stigne da pita server, i odobren gost bi ostao pred vratima.
  useEffect(() => {
    if (!state || state.kind !== "pending") return;
    const tick = () => setRemaining(Math.max(0, state.expiresAt - Date.now()));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [state]);

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
          // Ne `location.reload()`: u APK-u WebView za svaku putanju bez
          // ekstenzije servira korijenski index.html, pa reload sobe završi
          // na početnom ekranu.
          const session = { roomId, playerId: status.playerId, sessionToken: status.sessionToken };
          approvedTimer.current = setTimeout(() => onApprovedRef.current(session), 800);
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
    // Povratak u prvi plan pita odmah, ne čeka sljedeći otkucaj intervala.
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [state, roomId]);

  // Dozvola za obavještenja stigla DOK zahtjev čeka — veži uređaj za zahtjev,
  // da "ulazak je odobren" ima kome da ode (PRD §51). Događaj stiže i na svaki
  // start aplikacije; ponovljeno vezivanje je bezopasno.
  useEffect(() => {
    if (!state || state.kind !== "pending") return;
    const requestId = state.requestId;
    function attach() {
      const pushId = getPushId();
      if (pushId) {
        void attachJoinRequestPush(roomId, requestId, pushId).catch(() => {});
      }
    }
    window.addEventListener(PUSH_REGISTERED_EVENT, attach);
    return () => window.removeEventListener(PUSH_REGISTERED_EVENT, attach);
  }, [state, roomId]);

  async function handleSubmit() {
    if (!displayName.trim()) return;
    setState({ kind: "submitting" });
    try {
      const res = await submitJoinRequest(roomId, displayName.trim(), getPushId());
      savePlayerName(displayName);
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

  // Isti prazan felt kao ekran, da učitavanje ne bljesne bijelo.
  if (!state) return <main className="screen joinreq" />;

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
      players={room.players}
      playerCount={room.playerCount}
      targetScore={room.targetScore}
      phase={phase}
      displayName={displayName}
      onDisplayName={setDraft}
      onSubmit={() => void handleSubmit()}
      {...(state.kind === "pending" ? { remainingMs: remaining } : {})}
      {...(state.kind === "error" ? { message: state.message } : {})}
      noticeSlot={state.kind === "pending" ? <PushPrompt context="guest" /> : undefined}
      onBack={state.kind === "rejected" || state.kind === "expired" ? retry : () => router.push("/")}
    />
  );
}
