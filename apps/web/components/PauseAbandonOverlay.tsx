"use client";

import { useEffect, useState } from "react";
import type { AbandonVote, GamePhase } from "@zandar/shared-types";

/**
 * PauseAbandonOverlay — stanja prekida partije (DS §5, B8).
 *
 * Tri stanja (po `phase`):
 *  - paused_for_reconnect → banner "⏸ Čeka se [ime] M:SS" + "Sačekaj još"
 *    (grace na čipu 0–30s je SeatChip `reconnecting`, B1).
 *  - abandon_vote → modal: "Sačekaj još" / "Završi meč" + tally.
 *  - abandoned → pun ekran "Meč je prekinut" (OBAVEZNO — nikad prazan ekran).
 *
 * Tokom pauze/vote-a gameplay je blokiran i reactions off — roditelj prosljeđuje
 * `disabled` u HandArea/ReactionFab po fazi. Ovaj overlay samo prikazuje stanje.
 */

type PauseAbandonOverlayProps = {
  phase: GamePhase;
  /** Ime igrača koji se čeka / koji je otišao. */
  waitingForName?: string;
  /** Epoch ms kad je pauza počela (server). */
  pauseStartedAt?: number;
  /** Trajanje pauze do glasanja (default 120000 = 2 min). */
  pauseMaxMs?: number;
  abandonVotes?: Record<string, AbandonVote>;
  myPlayerId?: string;
  onWait?: () => void;
  onVote?: (vote: AbandonVote) => void;
  onLeave?: () => void;
};

function fmt(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function PauseAbandonOverlay({
  phase,
  waitingForName,
  pauseStartedAt,
  pauseMaxMs = 120_000,
  abandonVotes,
  myPlayerId,
  onWait,
  onVote,
  onLeave,
}: PauseAbandonOverlayProps) {
  // Countdown za pauzu. null do mount-a → SSR-safe (prvi render pun timer).
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (phase !== "paused_for_reconnect") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [phase]);

  const name = waitingForName ?? "igrač";

  if (phase === "paused_for_reconnect") {
    const remaining =
      pauseStartedAt != null && now != null
        ? Math.max(0, pauseStartedAt + pauseMaxMs - now)
        : pauseMaxMs;

    return (
      <div className="absolute inset-x-0 top-0 z-50 p-2 pt-safe-top">
        <div className="mx-auto max-w-sm rounded-token-lg bg-surface-raised border border-warn/40 shadow-xl p-3 flex items-center gap-3 animate-fade-in">
          <span className="text-2xl" aria-hidden>
            ⏸
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">Čeka se {name}…</p>
            <p className="text-xs text-muted tabular-nums">
              Pauza · {fmt(remaining)} do glasanja
            </p>
          </div>
          {onWait && (
            <button
              type="button"
              onClick={onWait}
              className="shrink-0 rounded-token-md bg-surface px-3 py-1.5 text-xs font-bold active:bg-surface-raised transition-colors"
            >
              Sačekaj još
            </button>
          )}
        </div>
      </div>
    );
  }

  if (phase === "abandon_vote") {
    const votes = abandonVotes ?? {};
    const waitN = Object.values(votes).filter((v) => v === "wait").length;
    const endN = Object.values(votes).filter((v) => v === "end").length;
    const myVote = myPlayerId ? votes[myPlayerId] : undefined;

    return (
      <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-token-lg bg-surface-raised border border-white/10 shadow-xl p-4 animate-fade-in">
          <h2 className="text-lg font-bold mb-1">Igrač se ne vraća</h2>
          <p className="text-sm text-muted mb-3">
            {name} se nije vratio. Sačekati još ili završiti meč?
          </p>

          <div className="flex items-center gap-3 text-xs text-muted mb-3">
            <span>
              čeka <b className="text-white tabular-nums">{waitN}</b>
            </span>
            <span>
              završi <b className="text-white tabular-nums">{endN}</b>
            </span>
          </div>

          {myVote ? (
            <p className="text-sm text-center text-muted py-2">
              Glasao si:{" "}
              <b className="text-white">
                {myVote === "wait" ? "Sačekaj još" : "Završi meč"}
              </b>{" "}
              · čeka se ostale…
            </p>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onVote?.("wait")}
                className="flex-1 rounded-token-md bg-surface px-3 py-2.5 text-sm font-bold active:bg-surface-raised transition-colors"
              >
                Sačekaj još
              </button>
              <button
                type="button"
                onClick={() => onVote?.("end")}
                className="flex-1 rounded-token-md bg-danger px-3 py-2.5 text-sm font-bold text-white active:opacity-80 transition-opacity"
              >
                Završi meč
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === "abandoned") {
    return (
      <div className="absolute inset-0 z-50 bg-surface flex flex-col items-center justify-center gap-4 p-6 text-center">
        <span className="text-4xl" aria-hidden>
          🚪
        </span>
        <h2 className="text-xl font-bold">Meč je prekinut</h2>
        <p className="text-sm text-muted max-w-xs">
          {name} je otišao i meč nije mogao da se nastavi.
        </p>
        {onLeave && (
          <button
            type="button"
            onClick={onLeave}
            className="mt-2 rounded-token-md bg-accent text-accent-contrast px-5 py-2.5 font-bold active:scale-95 transition-transform"
          >
            Nazad na početnu
          </button>
        )}
      </div>
    );
  }

  return null;
}
