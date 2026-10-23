"use client";

import type { TableTheme } from "@zandar/shared-types";

import { TableSetupFields } from "@/components/lobby/TableSetupFields";
import { sr } from "@/lib/sr";

export type CreateRoomScreenProps = {
  displayName: string;
  onDisplayName: (value: string) => void;
  playerCount: 2 | 3 | 4;
  onPlayerCount: (n: 2 | 3 | 4) => void;
  targetScore: number;
  onTargetScore: (n: number) => void;
  onCreate: () => void;
  onBack: () => void;
  loading: boolean;
  error?: string | undefined;
  /** Podloga stola. Bez `onTableTheme` red se ne crta. */
  tableTheme?: TableTheme | undefined;
  onTableTheme?: ((theme: TableTheme) => void) | undefined;
  /** Ponuđene veličine stola. Brza igra nudi samo 2 i 4. */
  counts?: readonly (2 | 3 | 4)[] | undefined;
  /** Naslov i natpisi. Isti ekran služi i brzoj igri (`sr.quickSetup`). */
  copy?: CreateRoomCopy | undefined;
  className?: string | undefined;
};

export type CreateRoomCopy = {
  title: string;
  players: string;
  target: string;
  submit: string;
  submitting: string;
};

const DEFAULT_COUNTS: readonly (2 | 3 | 4)[] = [2, 3, 4];

/**
 * Set up a table: a private room, or a public one for quick play (`copy` +
 * `counts`). Presentation only: no routing, no storage, no timers.
 * The player count is a segmented control, never a dropdown.
 */
export function CreateRoomScreen({
  displayName,
  onDisplayName,
  playerCount,
  onPlayerCount,
  targetScore,
  onTargetScore,
  tableTheme,
  onTableTheme,
  onCreate,
  onBack,
  loading,
  error,
  counts = DEFAULT_COUNTS,
  copy = sr.create,
  className = "",
}: CreateRoomScreenProps) {
  const ctaDisabled = loading || displayName.trim() === "";

  return (
    <div className={`screen create ${className}`}>
      <header className="create__head">
        <h1 className="create__title font-display text-2xl">{copy.title}</h1>
      </header>

      <div className="create__form">
        <div className="create__field">
          <label className="create__label font-sans text-sm" htmlFor="create-name">
            {sr.create.name}
          </label>
          <input
            id="create-name"
            className="create__input font-sans text-base"
            type="text"
            inputMode="text"
            autoComplete="nickname"
            placeholder={sr.create.namePlaceholder}
            value={displayName}
            onChange={(e) => onDisplayName(e.target.value)}
          />
        </div>

        <TableSetupFields
          playerCount={playerCount}
          onPlayerCount={onPlayerCount}
          targetScore={targetScore}
          onTargetScore={onTargetScore}
          tableTheme={tableTheme}
          onTableTheme={onTableTheme}
          counts={counts}
          playersLabel={copy.players}
          targetLabel={copy.target}
        />

        <button
          type="button"
          className="create__cta font-display text-xl"
          onClick={onCreate}
          disabled={ctaDisabled}
          data-disabled={ctaDisabled}
        >
          {loading ? copy.submitting : copy.submit}
        </button>

        <p className="create__error font-sans text-base" data-empty={!error} role="status">
          {error ?? ""}
        </p>

        <button type="button" className="create__back font-sans text-base" onClick={onBack}>
          {sr.back}
        </button>
      </div>
    </div>
  );
}
