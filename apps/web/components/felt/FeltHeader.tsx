"use client";

import type { ReactNode } from "react";
import { sr } from "@/lib/sr";

export type FeltHeaderProps = {
  roundLabel: string;
  onMenu: () => void;
  /** Desni slot — u igri drži `<FeedbackToggles />` (zvuk iz reference). */
  rightSlot?: ReactNode;
  className?: string | undefined;
};

/**
 * Zaglavlje stola: meni · runda · zvuk. Jedan red, bez naslova.
 *
 * Naslov ("Kartaonica") i podnaslov ("Javni sto" / "Prijateljska partija") su
 * izbaceni: igrac koji je VEC za stolom zna gdje je, a ta dva reda su trosila
 * 28px visine koju sto na malom telefonu nema. Runda ostaje — jedina od te tri
 * informacije koja se mijenja tokom partije — ali kao srednje dijete istog
 * grida, u liniji sa dugmadima.
 *
 * Čista prezentacija — ne zna ni za sobu ni za partiju. Traka je
 * `pointer-events: none`, a dugmad ih vraćaju, pa felt između njih ostaje
 * dodirljiv (isti obrazac koji je riješio preklapanje "? Pravila" i preklopki).
 */
export function FeltHeader({
  roundLabel,
  onMenu,
  rightSlot,
  className = "",
}: FeltHeaderProps) {
  return (
    <header className={`felt-header ${className}`}>
      <button
        type="button"
        className="felt-header__menu"
        onClick={onMenu}
        aria-label={sr.header.menu}
      >
        <span className="felt-header__bars" aria-hidden="true" />
      </button>

      <span className="felt-header__chip font-sans text-sm font-bold">{roundLabel}</span>

      <div className="felt-header__right">{rightSlot}</div>
    </header>
  );
}
