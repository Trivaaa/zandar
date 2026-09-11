"use client";

import type { ReactNode } from "react";
import { sr } from "@/lib/sr";

export type FeltHeaderProps = {
  title: string;
  subtitle: string;
  roundLabel: string;
  onMenu: () => void;
  /** Desni slot — u igri drži `<FeedbackToggles />` (zvuk iz reference). */
  rightSlot?: ReactNode;
  className?: string | undefined;
};

/**
 * Zaglavlje stola: meni · naziv + podnaslov + runda · zvuk.
 *
 * Čista prezentacija — ne zna ni za sobu ni za partiju. Traka je
 * `pointer-events: none`, a dugmad ih vraćaju, pa felt između njih ostaje
 * dodirljiv (isti obrazac koji je riješio preklapanje "? Pravila" i preklopki).
 */
export function FeltHeader({
  title,
  subtitle,
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

      <div className="felt-header__titles">
        <span className="felt-header__title font-display text-lg">{title}</span>
        <span className="felt-header__subtitle font-sans text-sm">{subtitle}</span>
        <span className="felt-header__chip font-sans text-sm font-bold">{roundLabel}</span>
      </div>

      <div className="felt-header__right">{rightSlot}</div>
    </header>
  );
}
