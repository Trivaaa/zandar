"use client";

import { PlayingCard } from "./PlayingCard";
import { sr } from "@/lib/sr";
import type { Card, CaptureOption, CaptureReason } from "@/components/felt/types";

export type LandFrom = "bottom" | "top" | "left" | "right";

export type TableSurfaceProps = {
  cards: Card[];
  /** Which seat the newest card flew in from. */
  landFrom?: LandFrom;
  /** Ids of cards that just landed, animated in from landFrom. */
  landingCardIds?: string[];
  captureOptions?: CaptureOption[];
  selectedOptionId?: string | null;
  onSelectOption?: ((option: CaptureOption) => void) | undefined;
  /** A capture exists, so trailing is refused. Needs a visible explanation. */
  forceCaptureBlocked?: boolean;
  /**
   * Trail — spuštanje karte na sto kad nema kupljenja. Legalan potez, pa je
   * cijela play-zona tap-meta. `canTrail` i `forceCaptureBlocked` su dvije
   * polovine iste odluke i nikad nisu istovremeno tačne.
   */
  canTrail?: boolean;
  onTrail?: (() => void) | undefined;
  showPot?: boolean;
  potLabel?: string;
  className?: string | undefined;
};

const reasonLabel: Record<CaptureReason, string> = {
  rank_match: sr.table.rankMatch,
  sum_match: sr.table.sumMatch,
  jack_clear: sr.table.jackClear,
};

export function TableSurface({
  cards,
  landFrom = "bottom",
  landingCardIds = [],
  captureOptions = [],
  selectedOptionId = null,
  onSelectOption,
  forceCaptureBlocked = false,
  canTrail = false,
  onTrail,
  showPot = false,
  potLabel = "",
  className = "",
}: TableSurfaceProps) {
  const byId = new Map(cards.map((c) => [c.id, c]));

  /** Which option a card belongs to — highlight only, never reordering. */
  const optionOf = new Map<string, CaptureOption>();
  for (const option of captureOptions) {
    for (const id of option.cardIds) if (!optionOf.has(id)) optionOf.set(id, option);
  }

  const single = captureOptions.length === 1 ? captureOptions[0] : undefined;
  const needsChooser = captureOptions.length > 1;

  const activate = (option: CaptureOption) => onSelectOption?.(option);

  return (
    <div className={`table ${className}`} data-land-from={landFrom}>
      {showPot ? (
        <div className="table__pot">
          <span className="table__pot-label font-sans text-sm text-muted">{sr.table.pot}</span>
          {potLabel ? <span className="font-display text-num-sm">{potLabel}</span> : null}
        </div>
      ) : null}

      {/* Stable order, always. Cards never move until someone plays. */}
      <div
        className={`table__drop ${canTrail ? "table__drop--trail" : ""}`}
        data-table-drop
        role={canTrail ? "button" : undefined}
        tabIndex={canTrail ? 0 : undefined}
        aria-label={canTrail ? sr.table.trailHint : undefined}
        onClick={canTrail ? () => onTrail?.() : undefined}
        onKeyDown={
          canTrail
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onTrail?.();
                }
              }
            : undefined
        }
      >
        {cards.length === 0 ? (
          <p className="table__empty font-sans text-base text-muted">{sr.table.empty}</p>
        ) : (
          <div className="table__cards">
            {cards.map((c) => {
              const option = optionOf.get(c.id);
              const tappable = single !== undefined && option?.optionId === single.optionId;
              const inSelected = option ? option.optionId === selectedOptionId : false;
              return (
                <div
                  key={c.id}
                  className={`table__slot ${option ? "table__slot--capturable" : ""} ${
                    tappable ? "table__slot--tappable" : ""
                  } ${landingCardIds.includes(c.id) ? "table__slot--landing" : ""}`}
                  data-option-id={option?.optionId}
                  data-option-selected={inSelected}
                  role={tappable ? "button" : undefined}
                  tabIndex={tappable ? 0 : undefined}
                  aria-label={tappable && single ? reasonLabel[single.reason] : undefined}
                  onClick={tappable && single ? () => activate(single) : undefined}
                  onKeyDown={
                    tappable && single
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            activate(single);
                          }
                        }
                      : undefined
                  }
                >
                  <span className="table__glow" aria-hidden="true" />
                  <PlayingCard card={c} size="sm" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two or more options: grouping is visible here, the table stays put. */}
      {needsChooser ? (
        <>
          <p className="table__hint font-sans text-base">{sr.table.chooseCapture}</p>
          <div className="table__chooser">
            {captureOptions.map((option) => (
              <div
                key={option.optionId}
                className="table__group"
                data-option-id={option.optionId}
                data-option-selected={option.optionId === selectedOptionId}
                role="button"
                tabIndex={0}
                aria-label={reasonLabel[option.reason]}
                onClick={() => activate(option)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    activate(option);
                  }
                }}
              >
                <span className="table__group-cards">
                  {option.cardIds.map((id) => {
                    const c = byId.get(id);
                    return c ? <PlayingCard key={id} card={c} size="xs" /> : null;
                  })}
                </span>
                <span className="table__reason font-sans text-base">
                  {reasonLabel[option.reason]}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {canTrail ? (
        <p className="table__trail font-sans text-base">{sr.table.trailHint}</p>
      ) : null}

      {forceCaptureBlocked ? (
        <div className="table__blocked" role="alert">
          <span className="table__blocked-title font-sans text-base font-bold">
            {sr.table.blockedTitle}
          </span>
          <span className="table__blocked-body font-sans text-base">{sr.table.blockedBody}</span>
        </div>
      ) : null}
    </div>
  );
}
