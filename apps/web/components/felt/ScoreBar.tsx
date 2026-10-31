"use client";

import type { Card } from "@zandar/shared-types";
import type { ScoringCard } from "@zandar/game-core";
import type { CSSProperties } from "react";
import { PlayingCard } from "./PlayingCard";
import type { BarView, ScoreNews } from "@/lib/scoreBar";
import { NEWS_MS } from "@/lib/useScoreNews";

const SCORING_CARD: Record<ScoringCard, Card> = {
  twoOfClubs: { id: "clubs-2", suit: "clubs", rank: "2" } as Card,
  tenOfDiamonds: { id: "diamonds-10", suit: "diamonds", rank: "10" } as Card,
};

export type ScoreBarProps = {
  view: BarView;
  news: ScoreNews | null;
  detailsOpen: boolean;
  onToggleDetails: () => void;
};

/**
 * Traka rezultata u zaglavlju (SPEC_REZULTAT_UZIVO §2, §4).
 *
 * Cijela traka je jedno dugme, a vijest je sloj IZNAD njega koji ne prima dodir,
 * pa se detalji otvaraju i dok vijest stoji. Vijest je sestra dugmeta, a ne dijete:
 * `PlayingCard` je `<div>`, a on ne smije stajati u `<button>`-u.
 */
export function ScoreBar({ view, news, detailsOpen, onToggleDetails }: ScoreBarProps) {
  return (
    <div className="scorebar" data-sides={view.sides.length}>
      <button
        type="button"
        className="scorebar__button"
        data-score-bar
        onClick={onToggleDetails}
        aria-label={view.aria}
        aria-expanded={detailsOpen}
      >
        <span className="scorebar__round">
          <span>{view.round}</span>
          <span className="scorebar__target" data-near={view.near}>
            {view.target}
          </span>
        </span>
        <span className="scorebar__sides">
          {view.sides.map((side, i) => (
            <span key={side.pileId} className="scorebar__sidewrap">
              {i > 0 ? (
                <span className="scorebar__sep" aria-hidden="true">
                  {view.sides.length === 2 ? ":" : "·"}
                </span>
              ) : null}
              <span className="scorebar__side" data-tone={side.tone}>
                {side.tone !== "none" ? <span className="scorebar__dot" /> : null}
                <span className="scorebar__label">{side.label}</span>
                {side.bonus > 0 ? (
                  <span className="scorebar__pill">+{side.bonus}</span>
                ) : null}
                <span className="scorebar__num" data-lead={side.lead}>
                  {side.score}
                </span>
              </span>
            </span>
          ))}
        </span>
      </button>

      {news ? (
        <span
          key={news.id}
          className="scorebar__news"
          data-kind={news.kind}
          data-tone={news.kind === "card" ? news.tone : "none"}
          style={{ "--news-ms": `${NEWS_MS}ms` } as CSSProperties}
          aria-hidden="true"
        >
          <span className="scorebar__news-body">
            {news.kind === "card" ? (
              <span className="scorebar__thumb">
                <PlayingCard card={SCORING_CARD[news.card]} size="xs" />
              </span>
            ) : null}
            <span className="scorebar__news-text">
              <span className="scorebar__news-title">{news.title}</span>
              <span className="scorebar__news-sub">{news.sub}</span>
            </span>
            {news.kind === "card" ? (
              <span className="scorebar__pill scorebar__pill--big">+1</span>
            ) : (
              news.parts.map((p) => (
                <span
                  key={p.pileId}
                  className="scorebar__pill scorebar__pill--big"
                  data-tone={p.tone}
                >
                  {p.label} +{p.points}
                </span>
              ))
            )}
          </span>
        </span>
      ) : null}

      {/* Čitač ekrana: region mora postojati prije teksta, pa je uvijek tu. */}
      <span className="sr-only" aria-live="polite">
        {news
          ? news.kind === "card"
            ? `${news.title} ${news.sub}`
            : `${news.title}: ${news.parts.map((p) => `${p.label} +${p.points}`).join(", ")}`
          : ""}
      </span>
    </div>
  );
}
