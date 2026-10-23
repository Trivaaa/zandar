"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

import { DownloadIcon } from "@/components/icons";
import { sr } from "@/lib/sr";

export type SettingsSheetProps = {
  playerName: string | null;
  onChangeName: () => void;
  onRules: () => void;
  onClose: () => void;
  /** Preklopke zvuka i vibracije — iste koje igra koristi. */
  feedbackSlot?: ReactNode;
  /** Privatnost / uslovi / o nama — zadnja, suptilna sekcija (H6), na webu i
   * na Androidu. Isti stil kao red na dnu početne. */
  legalSlot?: ReactNode;
  /** „Preuzmi aplikaciju" (SPEC_POCETNA §6) — samo web, i samo kad prodavnica
   * ima živ URL; host ga ne prosljeđuje u APK-u. */
  storeUrl?: string | null | undefined;
  className?: string | undefined;
};

/**
 * Postavke — otvaraju se iz Profila, za gosta i za nalog (SPEC_POCETNA §6, H6;
 * zupčanik sa početne je uklonjen). Skuplja ono što je ranije stajalo po home
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
  storeUrl,
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

        {storeUrl ? (
          <a
            className="gamemenu__item settings__link font-sans text-base"
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <DownloadIcon className="settings__link-icon" />
            {sr.settings.getApp}
          </a>
        ) : null}

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
