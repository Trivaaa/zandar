"use client";

import { useEffect, useRef } from "react";
import { useBackHandler } from "@/lib/backHandlers";
import type { BarView, DetailRow } from "@/lib/scoreBar";
import { sr } from "@/lib/sr";

export type ScoreDetailsProps = {
  view: BarView;
  rows: DetailRow[];
  targetLine: string;
  roundLine: string;
  onClose: () => void;
};

/**
 * Detalji rezultata ispod trake (SPEC_REZULTAT_UZIVO §5). Igra ne staje.
 *
 * Bez scrima: ruka, `TurnBanner` i dugmad ostaju dostupni. Dodir van panela ga
 * zatvara na `pointerdown`, bez `stopPropagation`, pa isti dodir i bira kartu.
 * Dodir na traku se izuzima: traka sama otvara i zatvara panel.
 */
export function ScoreDetails({ view, rows, targetLine, roundLine, onClose }: ScoreDetailsProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useBackHandler(true, onClose);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target || rootRef.current?.contains(target)) return;
      if (target.closest("[data-score-bar]")) return;
      onClose();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [onClose]);

  const columns = view.sides.length;

  return (
    <div
      ref={rootRef}
      className="scoredetails"
      role="dialog"
      aria-label={sr.score.detailsTitle}
      style={{ "--detail-cols": columns } as React.CSSProperties}
    >
      <div className="scoredetails__head">
        <span className="scoredetails__title">{sr.score.detailsTitle}</span>
        <button
          type="button"
          className="scoredetails__close"
          onClick={onClose}
          aria-label={sr.menu.close}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div className="scoredetails__totals">
        {view.sides.map((side) => (
          <span key={side.pileId} className="scoredetails__total" data-tone={side.tone}>
            {side.tone !== "none" ? <span className="scorebar__dot" /> : null}
            <span className="scoredetails__total-label">{side.label}</span>
            <span className="scoredetails__total-num">{side.score}</span>
          </span>
        ))}
        <span className="scoredetails__meta">
          <span>{targetLine}</span>
          <span>{roundLine}</span>
        </span>
      </div>

      <div className="scoredetails__grid">
        <span className="scoredetails__section">{sr.score.thisHand}</span>
        {view.sides.map((side) => (
          <span key={side.pileId} className="scoredetails__col">
            {side.label}
          </span>
        ))}
        {rows.map((row) => (
          <div key={row.key} className="scoredetails__row">
            <span className="scoredetails__cat">
              <span className="scoredetails__cat-label">{row.label}</span>
              <span className="scoredetails__cat-points">{row.points}</span>
            </span>
            {row.cells.map((cell) => (
              <span key={cell.pileId} className="scoredetails__cell">
                {cell.won ? (
                  <span className="scorebar__pill scorebar__pill--big" data-tone={cell.tone}>
                    {cell.text}
                  </span>
                ) : (
                  cell.text
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
