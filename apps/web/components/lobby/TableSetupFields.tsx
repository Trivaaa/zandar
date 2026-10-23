"use client";

import { TABLE_THEMES, type TableTheme } from "@zandar/shared-types";

import { sr } from "@/lib/sr";

export type TableSetupFieldsProps = {
  playerCount: 2 | 3 | 4;
  onPlayerCount: (n: 2 | 3 | 4) => void;
  targetScore: number;
  onTargetScore: (n: number) => void;
  /** Podloga stola. Bez `onTableTheme` red se ne crta. */
  tableTheme?: TableTheme | undefined;
  onTableTheme?: ((theme: TableTheme) => void) | undefined;
  /** Ponuđene veličine stola. Brza igra nudi samo 2 i 4. */
  counts: readonly (2 | 3 | 4)[];
  /** Natpisi redova (`sr.create` ili `sr.quickSetup`). */
  playersLabel: string;
  targetLabel: string;
};

const TARGETS: readonly number[] = [11, 21];

/**
 * Biranje stola: broj igrača, cilj, podloga. Dijele ga „Nova soba" (`/create`)
 * i list podešavanja brze igre na početnoj — jedan izgled, jedan kod.
 * Segmentirane kontrole, nikad padajući meni.
 */
export function TableSetupFields({
  playerCount,
  onPlayerCount,
  targetScore,
  onTargetScore,
  tableTheme,
  onTableTheme,
  counts,
  playersLabel,
  targetLabel,
}: TableSetupFieldsProps) {
  return (
    <>
      <div className="create__field">
        <span className="create__label font-sans text-sm">{playersLabel}</span>
        <div className="create__segmented" role="radiogroup" aria-label={playersLabel}>
          {counts.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={playerCount === n}
              className="create__option font-display text-base"
              data-selected={playerCount === n}
              onClick={() => onPlayerCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="create__field">
        <span className="create__label font-sans text-sm">{targetLabel}</span>
        <div className="create__segmented" role="radiogroup" aria-label={targetLabel}>
          {TARGETS.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={targetScore === n}
              className="create__option font-display text-base"
              data-selected={targetScore === n}
              onClick={() => onTargetScore(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {onTableTheme && (
        <div className="create__field">
          <span className="create__label font-sans text-sm">{sr.tableTheme.label}</span>
          <div className="create__themes" role="radiogroup" aria-label={sr.tableTheme.label}>
            {TABLE_THEMES.map((theme) => (
              <button
                key={theme}
                type="button"
                role="radio"
                aria-checked={tableTheme === theme}
                className="create__theme font-sans text-sm"
                data-selected={tableTheme === theme}
                onClick={() => onTableTheme(theme)}
              >
                {/* Ukras: naziv ispod već imenuje izbor. */}
                <span className="create__theme-thumb" data-table={theme} aria-hidden="true" />
                {sr.tableTheme.names[theme]}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
