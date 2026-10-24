"use client";

import Link from "next/link";
import { useEffect, useRef, type ReactNode } from "react";

import { DownloadIcon } from "@/components/icons";
import { TableSetupFields } from "@/components/lobby/TableSetupFields";
import {
  QUICK_PLAY_COUNTS,
  QUICK_PLAY_TARGETS,
  readQuickPlayPrefs,
  saveQuickPlayPrefs,
  useQuickPlayPrefs,
} from "@/lib/quickPlayPrefs";
import { sr } from "@/lib/sr";
import { saveTableTheme, useTableTheme } from "@/lib/tableTheme";

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
 * Prva sekcija je „Brza igra" (SPEC_POCETNA_V3, K1): broj igrača, cilj i
 * izgled stola za Igraj na početnoj. Svaka promjena se čuva odmah, kao
 * preklopke — Igraj kreće s ovim izborom, bez lista prije partije.
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
        <QuickPlaySection />

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

/** „Brza igra": izbor za Igraj na početnoj (Žandar — jedina živa igra). */
function QuickPlaySection() {
  const prefs = useQuickPlayPrefs("zandar");
  const tableTheme = useTableTheme("zandar");
  return (
    <section className="settings__section" aria-labelledby="settings-quickplay">
      <h3 id="settings-quickplay" className="settings__section-title">
        {sr.settings.quickPlay}
      </h3>
      <p className="settings__section-note">{sr.settings.quickPlayNote}</p>
      <TableSetupFields
        counts={QUICK_PLAY_COUNTS}
        playerCount={prefs.playerCount}
        onPlayerCount={(n) => {
          const playerCount = QUICK_PLAY_COUNTS.find((c) => c === n);
          // Svjež zapis, ne `prefs` iz rendera: dva brza dodira ne smiju
          // jedan drugom pregaziti izbor.
          if (playerCount) saveQuickPlayPrefs({ ...readQuickPlayPrefs("zandar"), playerCount }, "zandar");
        }}
        targetScore={prefs.targetScore}
        onTargetScore={(n) => {
          const targetScore = QUICK_PLAY_TARGETS.find((t) => t === n);
          if (targetScore) saveQuickPlayPrefs({ ...readQuickPlayPrefs("zandar"), targetScore }, "zandar");
        }}
        tableTheme={tableTheme}
        onTableTheme={(theme) => saveTableTheme(theme, "zandar")}
        playersLabel={sr.quickSetup.players}
        targetLabel={sr.quickSetup.target}
      />
    </section>
  );
}
