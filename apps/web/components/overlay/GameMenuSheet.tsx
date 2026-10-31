"use client";

import { sr } from "@/lib/sr";

export type GameMenuSheetProps = {
  onRules: () => void;
  onLeave?: (() => void) | undefined;
  onClose: () => void;
  className?: string | undefined;
};

/**
 * Meni stola — odredište hamburgera iz zaglavlja: pravila i izlaz. Rezultat je
 * na stolu, u traci u zaglavlju (`ScoreBar`), pa ovdje više nema svoj blok.
 *
 * Scrim i pozicioniranje daje ekran; ovdje je samo sadržaj (isti dogovor kao
 * `RoundEndOverlay`).
 */
export function GameMenuSheet({
  onRules,
  onLeave,
  onClose,
  className = "",
}: GameMenuSheetProps) {
  return (
    <div
      className={`gamemenu ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={sr.menu.title}
    >
      <div className="gamemenu__grip" aria-hidden="true" />

      <div className="gamemenu__scroll">
        <button type="button" className="gamemenu__item font-sans text-base" onClick={onRules}>
          {sr.menu.rules}
        </button>

        {onLeave ? (
          <button
            type="button"
            className="gamemenu__item gamemenu__item--danger font-sans text-base"
            onClick={onLeave}
          >
            {sr.menu.leave}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className="gamemenu__close font-sans text-base font-bold"
        onClick={onClose}
      >
        {sr.menu.close}
      </button>
    </div>
  );
}
