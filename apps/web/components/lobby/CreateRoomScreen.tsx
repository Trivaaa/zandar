"use client";

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
  className?: string | undefined;
};

/**
 * Make a private room. Presentation only: no routing, no storage, no timers.
 * The player count is a 3-option segmented control, never a dropdown.
 */
export function CreateRoomScreen({
  displayName,
  onDisplayName,
  playerCount,
  onPlayerCount,
  targetScore,
  onTargetScore,
  onCreate,
  onBack,
  loading,
  error,
  className = "",
}: CreateRoomScreenProps) {
  const counts: (2 | 3 | 4)[] = [2, 3, 4];
  const targets: number[] = [11, 21];
  const ctaDisabled = loading || displayName.trim() === "";

  return (
    <div className={`screen create ${className}`}>
      <header className="create__head">
        <h1 className="create__title font-display text-2xl">{sr.create.title}</h1>
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

        <div className="create__field">
          <span className="create__label font-sans text-sm">{sr.create.players}</span>
          <div className="create__segmented" role="radiogroup" aria-label={sr.create.players}>
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
          <span className="create__label font-sans text-sm">{sr.create.target}</span>
          <div className="create__segmented" role="radiogroup" aria-label={sr.create.target}>
            {targets.map((n) => (
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

        <button
          type="button"
          className="create__cta font-display text-xl"
          onClick={onCreate}
          disabled={ctaDisabled}
          data-disabled={ctaDisabled}
        >
          {loading ? sr.create.submitting : sr.create.submit}
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
