"use client";

import type { HandScore, PublicPlayer } from "@zandar/shared-types";
import { pilesOf } from "@/lib/piles";
import { sr } from "@/lib/sr";

export type ScorePillProps = {
  players: PublicPlayer[];
  matchScore: Record<string, number>;
  targetScore: number;
  handScores?: HandScore[];
  expanded: boolean;
  onToggle: () => void;
  className?: string | undefined;
};

/**
 * ScorePill — rezultat kao overlay; collapsed pilula → razrada po kategorijama.
 *
 * Roditelj drži `expanded`/`onToggle` I tap-outside backdrop (ovdje ga namjerno
 * nema — overlay ne smije da hvata tapove preko cijelog felta). Roditelj bira i
 * KOLIKO ruku šalje kroz `handScores`: u meču do 21 sve ruke su zid teksta, pa
 * live ekran šalje samo zadnju.
 */

export function ScorePill({
  players,
  matchScore,
  targetScore,
  handScores = [],
  expanded,
  onToggle,
  className = "",
}: ScorePillProps) {
  const piles = pilesOf(players);

  return (
    <div className={`scorepill ${expanded ? "scorepill--open" : ""} ${className}`}>
      <button
        type="button"
        className="scorepill__bar"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-label={expanded ? sr.score.collapse : sr.score.expand}
      >
        <span className="scorepill__rows">
          {piles.map((pile) => (
            <span key={pile.id} className="scorepill__row" data-pile-id={pile.id}>
              <span className="scorepill__name font-sans text-sm">{pile.label}</span>
              <span className="scorepill__value font-display text-num-sm">
                {matchScore[pile.id] ?? 0}
              </span>
            </span>
          ))}
        </span>
        <span className="scorepill__target font-sans text-sm">
          {sr.score.target(targetScore)}
        </span>
        <span className="scorepill__chevron" aria-hidden="true" />
      </button>

      {expanded ? (
        <div className="scorepill__panel">
          {handScores.length === 0 ? (
            <p className="font-sans text-base text-muted">{sr.score.noHands}</p>
          ) : (
            handScores.map((h) => {
              const b = h.breakdown;
              const rows: { key: string; label: string; winner?: string | undefined; pts: number }[] =
                [];
              if (b.mostCards)
                rows.push({
                  key: "mostCards",
                  label: sr.score.mostCards,
                  winner: b.mostCards.winnerPileId,
                  pts: b.mostCards.points,
                });
              if (b.mostClubs)
                rows.push({
                  key: "mostClubs",
                  label: sr.score.mostClubs,
                  winner: b.mostClubs.winnerPileId,
                  pts: b.mostClubs.points,
                });
              if (b.twoOfClubs)
                rows.push({
                  key: "twoOfClubs",
                  label: sr.score.twoOfClubs,
                  winner: b.twoOfClubs.winnerPileId,
                  pts: b.twoOfClubs.points,
                });
              if (b.tenOfDiamonds)
                rows.push({
                  key: "tenOfDiamonds",
                  label: sr.score.tenOfDiamonds,
                  winner: b.tenOfDiamonds.winnerPileId,
                  pts: b.tenOfDiamonds.points,
                });

              const labelOf = (id?: string) =>
                piles.find((p) => p.id === id)?.label ?? "—";

              return (
                <div key={h.handNumber} className="scorepill__hand">
                  <span className="scorepill__hand-title font-sans text-base font-bold">
                    {sr.score.hand(h.handNumber)}
                  </span>

                  <span className="scorepill__totals">
                    {piles.map((p) => (
                      <span key={p.id} className="scorepill__total" data-pile-id={p.id}>
                        <span className="font-sans text-sm text-muted">{p.label}</span>
                        <span className="font-display text-num-sm">
                          {h.pointsByPile[p.id] ?? 0}
                        </span>
                      </span>
                    ))}
                  </span>

                  <ul className="scorepill__cats">
                    {rows.map((r) => (
                      <li key={r.key} className="scorepill__cat">
                        <span className="font-sans text-base">{r.label}</span>
                        <span className="font-sans text-base text-muted">
                          {labelOf(r.winner)}
                        </span>
                        <span className="font-display text-num-sm">{r.pts}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}

          {piles.map((p) => (
            <p key={p.id} className="scorepill__members font-sans text-sm text-muted">
              {p.sub ? `${p.label}: ${p.sub}` : null}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
