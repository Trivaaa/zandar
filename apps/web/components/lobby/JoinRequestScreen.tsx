"use client";

import type { CSSProperties } from "react";
import { sr } from "@/lib/sr";

export type JoinRequestPhase =
  | "form"
  | "sending"
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "error";

export type JoinRequestScreenProps = {
  roomId: string;
  playersJoined: number;
  playerCount: number;
  targetScore: number;
  phase: JoinRequestPhase;
  displayName: string;
  onDisplayName: (value: string) => void;
  onSubmit: () => void;
  remainingMs?: number | undefined;
  totalMs?: number | undefined;
  message?: string | undefined;
  onBack: () => void;
  className?: string | undefined;
};

/**
 * Standing at the door asking to enter. Presentation only: no routing,
 * no storage, no timers. The parent owns the countdown in the pending phase.
 */
export function JoinRequestScreen({
  roomId,
  playersJoined,
  playerCount,
  targetScore,
  phase,
  displayName,
  onDisplayName,
  onSubmit,
  remainingMs,
  totalMs = 120000,
  message,
  onBack,
  className = "",
}: JoinRequestScreenProps) {
  const fill = Math.max(0, Math.min(1, (remainingMs ?? totalMs) / totalMs));
  const showMeta = phase === "form" || phase === "pending";
  const ctaDisabled = phase === "sending" || displayName.trim() === "";

  return (
    <div className={`screen joinreq ${className}`}>
      <header className="joinreq__head">
        <h1 className="joinreq__title font-display text-2xl">{sr.join.title}</h1>
        {/* Živi ekran je gostu pokazivao i broj sobe u istoj liniji —
            "Soba a1b2c3 · 1/4 igrača · 21 poena". Bez njega gost ne zna u koju
            sobu kuca kad ima više otvorenih linkova. */}
        {showMeta ? (
          <p className="joinreq__meta font-sans text-sm">
            {sr.lobby.title(roomId)} ·{" "}
            {sr.lobby.meta(playersJoined, playerCount, targetScore)}
          </p>
        ) : null}
      </header>

      <div className="joinreq__body">
        {phase === "form" ? (
          <>
            <div className="joinreq__field">
              <label className="joinreq__label font-sans text-sm" htmlFor="join-name">
                {sr.join.name}
              </label>
              <input
                id="join-name"
                className="joinreq__input font-sans text-base"
                type="text"
                inputMode="text"
                autoComplete="nickname"
                placeholder={sr.join.namePlaceholder}
                value={displayName}
                onChange={(e) => onDisplayName(e.target.value)}
              />
            </div>

            <button
              type="button"
              className="joinreq__cta font-display text-xl"
              onClick={onSubmit}
              disabled={ctaDisabled}
              data-disabled={ctaDisabled}
            >
              {sr.join.submit}
            </button>

            {/* Greška pri slanju se rješava ponovnim slanjem, pa ostaje uz
                formu umjesto da vodi u `error` fazu — ta je slijepa ulica sa
                samo "Nazad". Linija je rezervisana da dugme ne skače. */}
            <p
              className="joinreq__error font-sans text-sm"
              data-empty={!message}
              role="status"
            >
              {message ?? ""}
            </p>
          </>
        ) : null}

        {phase === "sending" ? (
          <>
            <p className="joinreq__status joinreq__status--muted font-sans text-base">
              {sr.join.sending}
            </p>
            <div className="joinreq__bar" aria-hidden="true">
              <span className="joinreq__fill" />
            </div>
          </>
        ) : null}

        {phase === "pending" ? (
          <>
            <p className="joinreq__status font-sans text-base">{sr.join.pending}</p>
            <div
              className="joinreq__bar"
              aria-hidden="true"
              style={{ "--joinreq-fill": fill } as CSSProperties}
            >
              <span className="joinreq__fill joinreq__fill--countdown" />
            </div>
          </>
        ) : null}

        {phase === "approved" ? (
          <p className="joinreq__status font-sans text-base">{sr.join.approved}</p>
        ) : null}

        {phase === "rejected" ? (
          <>
            <p className="joinreq__status joinreq__status--end font-sans text-xl">{sr.join.rejected}</p>
            <button type="button" className="joinreq__back font-sans text-base" onClick={onBack}>
              {sr.back}
            </button>
          </>
        ) : null}

        {phase === "expired" ? (
          <>
            <p className="joinreq__status joinreq__status--end font-sans text-xl">{sr.join.expired}</p>
            <p className="joinreq__status joinreq__status--muted font-sans text-base">
              {sr.join.expiredBody}
            </p>
            <button type="button" className="joinreq__back font-sans text-base" onClick={onBack}>
              {sr.back}
            </button>
          </>
        ) : null}

        {phase === "error" ? (
          <>
            <p className="joinreq__error font-sans text-base">{message ?? ""}</p>
            <button type="button" className="joinreq__back font-sans text-base" onClick={onBack}>
              {sr.back}
            </button>
          </>
        ) : null}

        {phase === "form" ? (
          <button type="button" className="joinreq__back font-sans text-base" onClick={onBack}>
            {sr.back}
          </button>
        ) : null}
      </div>
    </div>
  );
}
