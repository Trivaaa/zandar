"use client";

import type { HandScore, PublicPlayer } from "@zandar/shared-types";
import { breakdownRows } from "@/lib/handBreakdown";
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
  const labelOf = (id?: string) => piles.find((p) => p.id === id)?.label ?? sr.score.nobody;

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
        {/* Poeni ruke i ukupan rezultat su SPOJENI u jedan blok, po jedan red
            po pilu. Ranije su bila dva odvojena spiska, pa je igrac morao sam
            da spoji "+3" iz jednog sa "17 / 21" iz drugog. Spajanje je usput
            oslobodilo ~110px, koje razrada ispod zauzima — bez toga panel
            skroluje na svakoj velicini ekrana (izmjereno). */}
        <section className="roundend__block">
          <p className="roundend__block-title font-sans text-base">{sr.end.result}</p>
          <div className="roundend__head font-sans text-sm">
            <span className="roundend__head-hand">{sr.end.colHand}</span>
            <span className="roundend__head-total">{sr.end.colTotal}</span>
          </div>
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
              <span className="roundend__total font-display text-num-sm">
                {matchScore[pile.id] ?? 0} / {targetScore}
              </span>
            </div>
          ))}
        </section>

        {/* Razrada: ODAKLE su poeni iz bloka iznad. Podatak postoji u
            `HandScore.breakdown` otkad postoji bodovanje i stize do klijenta
            netaknut — ovaj ekran ga je do sad bacao.

            Dva reda po kategoriji, a ne jedan: na 360px je sadrzaj overlay-a
            ~281px, a natpis + ime pobjednika + poeni u jednom redu ne staju
            (izmjereno sa `BataPenzioner`). Zato natpis i poeni gore, a ime i
            brojevi dolje.

            Brojevi nose IME pila (`Tim A 32 · Tim B 20`), ne golo `32 : 20` —
            u 3P ima tri pila i golo nabrajanje ne kaze ciji je koji broj. */}
        <section className="roundend__block">
          <p className="roundend__block-title font-sans text-base">{sr.end.handBreakdown}</p>
          <ul className="roundend__cats">
            {breakdownRows(handScore).map((row) => {
              const won = row.winnerPileId !== undefined;
              const counts = row.countByPile;
              const chips = counts
                ? piles.map((p) => ({ id: p.id, text: `${p.label} ${counts[p.id] ?? 0}` }))
                : won
                  ? [{ id: row.winnerPileId, text: labelOf(row.winnerPileId) }]
                  : [];
              return (
                <li
                  key={row.key}
                  /* Bez brojeva po pilu (velika/mala) ime pobjednika staje uz
                     natpis, pa red ne trosi drugu liniju. */
                  className={`roundend__cat ${counts ? "" : "roundend__cat--inline"}`}
                  data-pile-id={row.winnerPileId}
                >
                  <span className="roundend__cat-label font-sans text-base">{row.label}</span>
                  {/* Nerijeseno ne dodjeljuje nista, pa ovdje NE smije stajati
                      `+2` — to bi izgledalo kao da su poeni nekome otisli. */}
                  <span className="roundend__value font-display text-num-sm">
                    {won ? `+${row.points}` : "—"}
                  </span>
                  <span className="roundend__cat-chips font-sans text-sm">
                    {won ? null : (
                      <span className="roundend__cat-chip">{sr.score.nobody}</span>
                    )}
                    {chips.map((chip) => (
                      <span
                        key={chip.id}
                        className="roundend__cat-chip"
                        {...(chip.id === row.winnerPileId ? { "data-win": "" } : {})}
                      >
                        {chip.text}
                      </span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>
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
