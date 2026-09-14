"use client";

import type { CSSProperties } from "react";

import { CardBack } from "@/components/felt/CardBack";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";
import { isValidPlayerName } from "@/lib/playerName";
import { sr } from "@/lib/sr";

export type JoinRequestPhase =
  | "form"
  | "sending"
  | "pending"
  | "approved"
  | "rejected"
  | "expired"
  | "error";

/** Strukturni tip — uklapa se `RoomPlayer` iz `lib/api.ts` bez mapiranja. */
export type JoinRoomPlayer = {
  id: string;
  displayName: string;
  seatIndex: number;
  isHost: boolean;
};

export type JoinRequestScreenProps = {
  players: JoinRoomPlayer[];
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

function initialOf(name: string): string {
  const first = [...name.trim()][0];
  return first ? first.toLocaleUpperCase("sr") : "";
}

/**
 * Poziv na partiju — gost stoji na vratima sobe. Presentation only: no
 * routing, no storage, no timers. The parent owns the countdown in the
 * pending phase.
 *
 * Jezik je funnel-ov (`/ime`, teaser): lepeza poleđina, `namestep__input`,
 * `home__cta`. Klase se dijele, pravila se ne kopiraju.
 */
export function JoinRequestScreen({
  players,
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
  const host = players.find((p) => p.isHost)?.displayName.trim() || null;
  const seated = [...players].sort((a, b) => a.seatIndex - b.seatIndex);
  const seats = Array.from(
    { length: Math.max(playerCount, seated.length) },
    (_, i) => seated[i] ?? null,
  );

  // Slanje ostavlja formu na mjestu (dugme javlja da radi), pa ekran ne skače.
  const inForm = phase === "form" || phase === "sending";
  const busy = phase === "sending";
  const canSubmit = !busy && isValidPlayerName(displayName);
  const ended = phase === "rejected" || phase === "expired" || phase === "error";

  return (
    <main className={`screen joinreq ${className}`}>
      {/* Red je rezervisan i kad dugmeta nema, da poziv ne poskoči. */}
      <div className="joinreq__top">
        {phase === "form" ? (
          <button type="button" className="namestep__back" onClick={onBack}>
            <ArrowLeftIcon className="namestep__back-icon" />
            <span>{sr.backLabel}</span>
          </button>
        ) : null}
      </div>

      <section className="joinreq__intro" aria-labelledby="joinreq-invite">
        <div className="card-fan joinreq__fan" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card-fan-slot">
              <CardBack size="md" />
            </div>
          ))}
        </div>

        <h1 id="joinreq-invite" className="joinreq__invite">
          {host ? (
            <>
              {sr.join.inviteLead} <span className="joinreq__host">{host}</span>{" "}
              {sr.join.inviteTail}
            </>
          ) : (
            sr.join.inviteNoHost
          )}
        </h1>

        {/* Ko već sjedi: inicijali zauzetih mjesta, isprekidano slobodna. Broj
            nosi meta linija ispod, pa su krugovi samo slika. */}
        <ul className="joinreq__seats" aria-hidden="true">
          {seats.map((p, i) => (
            <li
              key={p?.id ?? `empty-${i}`}
              className="joinreq__seat"
              data-empty={p ? undefined : "true"}
              data-host={p?.isHost ? "true" : undefined}
            >
              {p ? initialOf(p.displayName) : null}
            </li>
          ))}
        </ul>
        <p className="joinreq__meta">
          {sr.lobby.meta(players.length, playerCount, targetScore)}
        </p>
      </section>

      {inForm ? (
        <form
          className="joinreq__form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) onSubmit();
          }}
        >
          <label htmlFor="join-name" className="joinreq__label">
            {sr.join.name}
          </label>
          <input
            id="join-name"
            className="namestep__input"
            type="text"
            inputMode="text"
            autoComplete="nickname"
            autoCapitalize="words"
            enterKeyHint="go"
            placeholder={sr.join.namePlaceholder}
            value={displayName}
            readOnly={busy}
            onChange={(e) => onDisplayName(e.target.value)}
            aria-invalid={message ? true : undefined}
            aria-describedby="join-error"
          />
          <button
            type="submit"
            className="home__cta joinreq__submit"
            disabled={!canSubmit}
            aria-busy={busy}
          >
            <span>{busy ? sr.join.sending : sr.join.submit}</span>
            {busy ? null : <ArrowRightIcon className="home__cta-arrow" />}
          </button>
          {/* Greška pri slanju se rješava ponovnim slanjem, pa ostaje uz
              formu umjesto da vodi u `error` fazu — ta je slijepa ulica sa
              samo "Nazad". Linija je rezervisana da dugme ne skače. */}
          <p
            id="join-error"
            className="namestep__error joinreq__error"
            data-empty={!message}
            role="status"
          >
            {message ?? ""}
          </p>
        </form>
      ) : (
        <div className="joinreq__body" role="status">
          {phase === "pending" ? (
            <>
              <p className="joinreq__status">
                {host ? (
                  <>
                    {sr.join.pendingLead} <span className="joinreq__host">{host}</span>{" "}
                    {sr.join.pendingTail}
                  </>
                ) : (
                  sr.join.pending
                )}
              </p>
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
            <>
              <p className="joinreq__status">{sr.join.approved}</p>
              <div className="joinreq__bar" aria-hidden="true">
                <span className="joinreq__fill" />
              </div>
            </>
          ) : null}

          {phase === "rejected" ? (
            <p className="joinreq__status joinreq__status--end">{sr.join.rejected}</p>
          ) : null}

          {phase === "expired" ? (
            <>
              <p className="joinreq__status joinreq__status--end">{sr.join.expired}</p>
              <p className="joinreq__status joinreq__status--muted">{sr.join.expiredBody}</p>
            </>
          ) : null}

          {phase === "error" ? <p className="joinreq__error">{message ?? ""}</p> : null}

          {ended ? (
            <button type="button" className="home__friends" onClick={onBack}>
              {sr.backLabel}
            </button>
          ) : null}
        </div>
      )}
    </main>
  );
}
