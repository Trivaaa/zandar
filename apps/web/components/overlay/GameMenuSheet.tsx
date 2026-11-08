"use client";

import { useSyncExternalStore } from "react";

import { HAPTIC, hapticsSupported, vibrate } from "@/lib/haptics";
import { useSetting } from "@/lib/settings";
import { playSfx } from "@/lib/sound";
import { sr } from "@/lib/sr";

export type GameMenuSheetProps = {
  onRules: () => void;
  onLeave?: (() => void) | undefined;
  onClose: () => void;
  className?: string | undefined;
};

/** Red menija sa prekidačem (cijeli red je dodirljiv, 48 px). */
function MenuSwitch({
  label,
  on,
  disabled = false,
  note,
  onToggle,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  note?: string | undefined;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      className="gamemenu__item gamemenu__switch font-sans text-base"
      onClick={onToggle}
    >
      <span className="gamemenu__switch-label">
        {label}
        {note ? <span className="gamemenu__switch-note">{note}</span> : null}
      </span>
      <span className="gamemenu__track" data-on={on} aria-hidden="true" />
    </button>
  );
}

/**
 * Zvuk i vibracija (PRD §50.4). Ranije su bile ikonice iznad dugmeta za
 * reakcije na svakom stolu; sad su ovdje, da sto ostane čist (odluka vlasnika
 * 8.11.2026). Podrazumijevano su uključene (`lib/settings.ts`).
 */
function FeedbackRows() {
  const [sound, setSound] = useSetting("sound");
  const [haptics, setHaptics] = useSetting("haptics");
  // `navigator.vibrate` se zna tek na klijentu (isti obrazac kao FeedbackToggles).
  const canVibrate = useSyncExternalStore(
    () => () => {},
    () => hapticsSupported(),
    () => false,
  );
  return (
    <>
      <MenuSwitch
        label={sr.menu.sound}
        on={sound}
        onToggle={() => {
          const next = !sound;
          setSound(next);
          if (next) playSfx("capture"); // potvrda + otključavanje audija
        }}
      />
      <MenuSwitch
        label={sr.menu.haptics}
        on={canVibrate && haptics}
        disabled={!canVibrate}
        note={canVibrate ? undefined : sr.menu.hapticsUnsupported}
        onToggle={() => {
          const next = !haptics;
          setHaptics(next);
          if (next) vibrate(HAPTIC.confirm);
        }}
      />
    </>
  );
}

/**
 * Meni stola — odredište hamburgera iz zaglavlja: zvuk i vibracija, pravila i izlaz. Rezultat je
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
        <FeedbackRows />

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
