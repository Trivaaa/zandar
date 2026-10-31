"use client";

import type { ReactNode } from "react";
import { sr } from "@/lib/sr";

export type FeltHeaderProps = {
  onMenu: () => void;
  /** Traka rezultata (`ScoreBar`) — ostatak reda poslije menija. */
  children?: ReactNode;
  className?: string | undefined;
};

/**
 * Zaglavlje stola: meni · traka rezultata. Jedan red, bez naslova.
 *
 * Naslov ("Kartaonica") i podnaslov ("Javni sto" / "Prijateljska partija") su
 * izbaceni: igrac koji je VEC za stolom zna gdje je, a ta dva reda su trosila
 * 28px visine koju sto na malom telefonu nema.
 *
 * Čista prezentacija — ne zna ni za sobu ni za partiju. Traka je
 * `pointer-events: none`, a djeca ih vraćaju (isti obrazac koji je riješio
 * preklapanje "? Pravila" i preklopki).
 */
export function FeltHeader({ onMenu, children, className = "" }: FeltHeaderProps) {
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

      {children}
    </header>
  );
}
