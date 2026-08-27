"use client";

import type { AbandonVote, GamePhase, PublicPlayer } from "@zandar/shared-types";
import { sr } from "@/lib/sr";

export type PauseAbandonOverlayProps = {
  phase: GamePhase;
  waitingForName?: string | undefined;
  /** Parent owns the clock. Nothing here measures elapsed time. */
  remainingMs?: number | undefined;
  totalMs?: number | undefined;
  abandonVotes?: Record<string, AbandonVote> | undefined;
  players: PublicPlayer[];
  myPlayerId?: string | undefined;
  onWait?: (() => void) | undefined;
  onVote?: ((v: AbandonVote) => void) | undefined;
  onLeave?: (() => void) | undefined;
  className?: string | undefined;
};

/**
 * PauseAbandonOverlay — tri stanja prekida (pauza / glasanje / prekinuto), i
 * null za ostalih sedam faza. Čista prezentacija: roditelj drži sat i šalje
 * `remainingMs`, ovdje se ništa ne mjeri.
 *
 * Vote-vrste NOSE `data-vote-seat-id`, ne `data-seat-id` — `data-seat-id` je
 * sidro za let karata (`lib/flyAnimation`), i drugi element s tim atributom bi
 * mu bio meta.
 */
export function PauseAbandonOverlay({
  phase,
  waitingForName,
  remainingMs,
  totalMs = 120_000,
  abandonVotes,
  players,
  myPlayerId,
  onWait,
  onVote,
  onLeave,
  className = "",
}: PauseAbandonOverlayProps) {
  if (phase === "paused_for_reconnect") {
    const fill =
      remainingMs === undefined ? 1 : Math.max(0, Math.min(1, remainingMs / Math.max(1, totalMs)));
    const seconds = remainingMs === undefined ? undefined : Math.ceil(remainingMs / 1000);

    return (
      <div className={`pause ${className}`} data-phase={phase} role="status">
        <div className="pause__row">
          <p className="pause__title font-sans text-base">
            {sr.pause.waitingFor(waitingForName ?? sr.pause.unknownPlayer)}
          </p>
          {seconds !== undefined ? (
            <span className="pause__clock font-display text-num-sm">{sr.pause.seconds(seconds)}</span>
          ) : null}
        </div>
        <p className="pause__body font-sans text-base text-muted">{sr.pause.body}</p>
        <div className="pause__track" aria-hidden="true">
          <span className="pause__fill" style={{ ["--pause-fill" as string]: fill }} />
        </div>
        {onWait ? (
          <button type="button" className="pause__btn pause__btn--ghost font-sans text-base" onClick={onWait}>
            {sr.pause.keepWaiting}
          </button>
        ) : null}
      </div>
    );
  }

  if (phase === "abandon_vote") {
    const myVote = myPlayerId ? abandonVotes?.[myPlayerId] : undefined;

    return (
      <div className={`pause pause--modal ${className}`} data-phase={phase} role="dialog" aria-modal="true">
        <p className="pause__title font-display text-xl">{sr.pause.voteTitle}</p>
        <p className="pause__body font-sans text-base text-muted">{sr.pause.voteBody}</p>

        <ul className="pause__list">
          {players.map((p) => {
            const vote = abandonVotes?.[p.id];
            return (
              <li key={p.id} className="pause__voter" data-vote-seat-id={p.id} data-vote={vote ?? "none"}>
                <span className="pause__name font-sans text-base">{p.displayName}</span>
                <span className="pause__vote font-sans text-base">
                  {vote === "wait"
                    ? sr.pause.voteWait
                    : vote === "end"
                      ? sr.pause.voteEnd
                      : sr.pause.voteNone}
                </span>
              </li>
            );
          })}
        </ul>

        {myPlayerId ? (
          <div className="pause__actions">
            <button
              type="button"
              className="pause__btn pause__btn--ghost font-sans text-base"
              data-active={myVote === "wait"}
              onClick={() => onVote?.("wait")}
            >
              {sr.pause.voteWait}
            </button>
            <button
              type="button"
              className="pause__btn pause__btn--danger font-sans text-base"
              data-active={myVote === "end"}
              onClick={() => onVote?.("end")}
            >
              {sr.pause.voteEnd}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (phase === "abandoned") {
    return (
      <div className={`pause pause--full ${className}`} data-phase={phase} role="dialog" aria-modal="true">
        <p className="pause__title font-display text-2xl">{sr.pause.abandonedTitle}</p>
        <p className="pause__body font-sans text-base text-muted">{sr.pause.abandonedBody}</p>
        {onLeave ? (
          <button type="button" className="pause__btn pause__btn--primary font-sans text-base" onClick={onLeave}>
            {sr.pause.leave}
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}
