"use client";

import type { HandScore, PublicPlayer } from "@zandar/shared-types";
import { pilesOf } from "@/lib/piles";
import { sr } from "@/lib/sr";

export type RoundEndOverlayProps = {
  phase: "hand_finished" | "match_finished";
  players: PublicPlayer[];
  /** The hand just played. */
  handScore: HandScore;
  matchScore: Record<string, number>;
  targetScore: number;
  /** match_finished only; the parent computes it. */
  winnerPileId?: string;
  isHost: boolean;
  /** An action is in flight — the parent's word. Nothing is tracked here. */
  pending: boolean;
  onNextHand?: () => void;
  onRematch?: () => void;
  onFindNewTable?: () => void;
  onLeave?: () => void;
  className?: string | undefined;
};

export function RoundEndOverlay({
  phase,
  players,
  handScore,
  matchScore,
  targetScore,
  winnerPileId,
  isHost,
  pending,
  onNextHand,
  onRematch,
  onFindNewTable,
  onLeave,
  className = "",
}: RoundEndOverlayProps) {
  const piles = pilesOf(players);
  const isMatch = phase === "match_finished";

  const headline = isMatch
    ? sr.end.matchWinner(piles.find((p) => p.id === winnerPileId)?.label ?? "—")
    : sr.end.handTitle(handScore.handNumber);

  return (
    <div
      className={`roundend ${isMatch ? "roundend--match" : "roundend--hand"} ${className}`}
      data-phase={phase}
      role="dialog"
      aria-modal="true"
      aria-label={headline}
    >
      {isMatch && onLeave ? (
        <button
          type="button"
          className="roundend__close"
          onClick={onLeave}
          aria-label={sr.end.closeLabel}
        >
          <span aria-hidden="true">✕</span>
        </button>
      ) : null}

      <p className={`roundend__headline font-display ${isMatch ? "text-2xl" : "text-xl"}`}>
        {headline}
      </p>

      <div className="roundend__scroll">
        <section className="roundend__block">
          <p className="roundend__block-title font-sans text-base">{sr.end.handPoints}</p>
          {piles.map((pile) => (
            <div key={pile.id} className="roundend__row" data-pile-id={pile.id}>
              <span className="roundend__pile">
                <span className="font-sans text-base">{pile.label}</span>
                {pile.sub ? (
                  <span className="roundend__members font-sans text-sm">{pile.sub}</span>
                ) : null}
              </span>
              <span className="roundend__value font-display text-num-sm">
                +{handScore.pointsByPile[pile.id] ?? 0}
              </span>
            </div>
          ))}
        </section>

        <section className="roundend__block">
          <p className="roundend__block-title font-sans text-base">{sr.end.matchTotal}</p>
          {piles.map((pile) => (
            <div key={pile.id} className="roundend__row" data-pile-id={pile.id}>
              <span className="roundend__pile">
                <span className="font-sans text-base">{pile.label}</span>
                {pile.sub ? (
                  <span className="roundend__members font-sans text-sm">{pile.sub}</span>
                ) : null}
              </span>
              <span className="roundend__value font-display text-num-sm">
                {matchScore[pile.id] ?? 0} / {targetScore}
              </span>
            </div>
          ))}
        </section>
      </div>

      <div className="roundend__actions">
        {isHost ? (
          <button
            type="button"
            className="roundend__btn roundend__btn--primary font-sans text-base"
            disabled={pending}
            onClick={isMatch ? onRematch : onNextHand}
          >
            {pending ? sr.end.pending : isMatch ? sr.end.rematch : sr.end.nextHand}
          </button>
        ) : (
          <p className="roundend__waiting font-sans text-base">
            {isMatch ? sr.end.waitingRematch : sr.end.waitingHand}
          </p>
        )}

        {isMatch && onFindNewTable ? (
          <button
            type="button"
            className="roundend__btn roundend__btn--secondary font-sans text-base"
            onClick={onFindNewTable}
          >
            {sr.end.newTable}
          </button>
        ) : null}

        {isMatch && onLeave ? (
          <button
            type="button"
            className="roundend__btn roundend__btn--tertiary font-sans text-base"
            onClick={onLeave}
          >
            {sr.end.leave}
          </button>
        ) : null}
      </div>
    </div>
  );
}
