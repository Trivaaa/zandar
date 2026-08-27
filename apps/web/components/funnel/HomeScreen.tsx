"use client";

import type { ReactNode } from "react";

import { sr } from "@/lib/sr";

export type HomeScreenProps = {
  /** Remembered from a previous visit. null → the name field is shown. */
  savedName: string | null;
  nameInput: string;
  onNameInput: (value: string) => void;
  onPlay: () => void;
  onForgetName: () => void;
  onCreateRoom: () => void;
  loading: boolean;
  error?: string | undefined;
  /** Sound/haptics toggles, mounted by the host. */
  feedbackSlot?: ReactNode;
  className?: string | undefined;
};

/**
 * The first screen. Presentation only: no routing, no storage, no timers.
 * One loud action; everything else is quiet.
 */
export function HomeScreen({
  savedName,
  nameInput,
  onNameInput,
  onPlay,
  onForgetName,
  onCreateRoom,
  loading,
  error,
  feedbackSlot,
  className = "",
}: HomeScreenProps) {
  const named = savedName !== null;
  const ctaDisabled = loading || (!named && nameInput.trim() === "");

  return (
    <div className={`screen home ${className}`}>
      <header className="home__brand">
        <span className="home__name font-display text-2xl">{sr.home.brand}</span>
        <span className="home__domain font-sans text-sm">{sr.home.domain}</span>
      </header>

      <div className="home__body">
        {named ? (
          <p className="home__as">
            <span className="home__as-text font-sans text-base">
              {sr.home.playingAs(savedName)}
            </span>
            <button type="button" className="home__change font-sans text-sm" onClick={onForgetName}>
              {sr.home.changeName}
            </button>
          </p>
        ) : (
          <div className="home__field">
            <label className="sr-only" htmlFor="home-name">
              {sr.home.namePlaceholder}
            </label>
            <input
              id="home-name"
              className="home__input font-sans text-base"
              type="text"
              inputMode="text"
              autoComplete="nickname"
              placeholder={sr.home.namePlaceholder}
              value={nameInput}
              onChange={(e) => onNameInput(e.target.value)}
            />
          </div>
        )}

        <button
          type="button"
          className="home__cta font-display text-xl"
          onClick={onPlay}
          disabled={ctaDisabled}
          data-disabled={ctaDisabled}
        >
          {loading ? sr.home.playLoading : sr.home.play}
        </button>

        {/* Reserved line — the CTA never moves when an error appears. */}
        <p className="home__error font-sans text-sm" data-empty={!error} role="status">
          {error ?? ""}
        </p>

        <button type="button" className="home__secondary font-sans text-base" onClick={onCreateRoom}>
          {sr.home.createRoom}
        </button>
      </div>

      <div className="home__feedback">{feedbackSlot}</div>
    </div>
  );
}
