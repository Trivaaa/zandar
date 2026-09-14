"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

import { sr } from "@/lib/sr";

export type SettingsSheetProps = {
  playerName: string | null;
  onChangeName: () => void;
  onRules: () => void;
  onClose: () => void;
  /** Preklopke zvuka i vibracije — iste koje igra koristi. */
  feedbackSlot?: ReactNode;
  /** Privatnost / uslovi / o nama — samo na Androidu (home footer ih nosi na
   * webu). Zadnja, suptilna sekcija — isti stil kao footer na home-u. */
  legalSlot?: ReactNode;
  className?: string | undefined;
};

/**
 * Odredište zupčanika na home-u. Skuplja ono što je ranije stajalo po home
 * ekranu (preklopke, „Igraš kao … Promijeni") uz pravila i brisanje podataka.
 *
 * Površina je ISTA kao meni stola (`.gamemenu*` iz overlay.css) — jedan jezik
 * za donji sheet u cijelom proizvodu. Scrim daje ekran, kao i u igri.
 */
export function SettingsSheet({
  playerName,
  onChangeName,
  onRules,
  onClose,
  feedbackSlot,
  legalSlot,
  className = "",
}: SettingsSheetProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Fokus ulazi u sheet čim se otvori; povratak fokusa na zupčanik radi host.
  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <div
      className={`gamemenu settings ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="gamemenu__grip" aria-hidden="true" />
      <h2 id="settings-title" className="settings__title">
        {sr.settings.title}
      </h2>

      <div className="gamemenu__scroll">
        <div className="settings__row">
          <span className="settings__name">
            <span className="settings__label">{sr.settings.name}</span>
            <span className="settings__value">{playerName ?? sr.settings.noName}</span>
          </span>
          <button type="button" className="settings__change" onClick={onChangeName}>
            {sr.name.change}
          </button>
        </div>

        {feedbackSlot ? <div className="settings__feedback">{feedbackSlot}</div> : null}

        <button type="button" className="gamemenu__item font-sans text-base" onClick={onRules}>
          {sr.settings.rules}
        </button>
        <Link href="/delete-account" className="gamemenu__item font-sans text-base">
          {sr.settings.deleteData}
        </Link>

        {legalSlot ? <div className="home__legal settings__legal">{legalSlot}</div> : null}
      </div>

      <button
        ref={closeRef}
        type="button"
        className="gamemenu__close font-sans text-base font-bold"
        onClick={onClose}
      >
        {sr.settings.close}
      </button>
    </div>
  );
}
