"use client";

import { useSyncExternalStore, type ReactNode } from "react";

import { HAPTIC, hapticsSupported, vibrate } from "@/lib/haptics";
import { useSetting } from "@/lib/settings";
import { playSfx } from "@/lib/sound";
import { sr } from "@/lib/sr";

export type GameMenuSheetProps = {
  /** Ime igre: „Žandar", „Poker", „Raub". */
  title: string;
  /** Jedan red stanja ispod naslova (`lib/tableMenu.ts`). */
  subtitle?: string | undefined;
  /** Blok samo za jednu igru, između preklopki i pravila (Raub: izbor karata). */
  extra?: ReactNode;
  onRules: () => void;
  onLeave?: (() => void) | undefined;
  onClose: () => void;
  className?: string | undefined;
};

/* Ikonice: tanka linija, boja teksta (isti crtež kao na tabli). */
const ICON = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export function SoundIcon({ on, size = 24 }: { on: boolean; size?: number }) {
  return (
    <svg {...ICON} width={size} height={size}>
      <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
      {on ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5M21 9.5l-5 5" />}
    </svg>
  );
}

function HapticsIcon() {
  return (
    <svg {...ICON}>
      <rect x="8" y="4" width="8" height="16" rx="2" />
      <path d="M4.5 9v6M19.5 9v6" />
    </svg>
  );
}

/** Pločica preklopke: ikonica, naziv, stanje. Cijela pločica je dugme. */
function MenuTile({
  icon,
  label,
  state,
  on,
  disabled = false,
  onToggle,
}: {
  icon: ReactNode;
  label: string;
  state: string;
  on: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={disabled}
      className="gamemenu__tile"
      data-on={on}
      onClick={onToggle}
    >
      {icon}
      <span className="gamemenu__tile-label">{label}</span>
      <span className="gamemenu__tile-state">{state}</span>
    </button>
  );
}

/**
 * Zvuk i vibracija (PRD §50.4) kao dvije pločice. Zvuk ima i dugme na stolu
 * (`TableSoundButton`) — isti ključ, pa su uvijek u skladu.
 */
function FeedbackTiles() {
  const [sound, setSound] = useSetting("sound");
  const [haptics, setHaptics] = useSetting("haptics");
  // `navigator.vibrate` se zna tek na klijentu (isti obrazac kao FeedbackToggles).
  const canVibrate = useSyncExternalStore(
    () => () => {},
    () => hapticsSupported(),
    () => false,
  );
  const hapticsOn = canVibrate && haptics;
  return (
    <div className="gamemenu__tiles">
      <MenuTile
        icon={<SoundIcon on={sound} />}
        label={sr.menu.sound}
        state={sound ? sr.menu.soundOn : sr.menu.soundOff}
        on={sound}
        onToggle={() => {
          const next = !sound;
          setSound(next);
          if (next) playSfx("capture"); // potvrda + otključavanje audija
        }}
      />
      <MenuTile
        icon={<HapticsIcon />}
        label={sr.menu.haptics}
        state={canVibrate ? (hapticsOn ? sr.menu.hapticsOn : sr.menu.hapticsOff) : sr.menu.hapticsUnsupported}
        on={hapticsOn}
        disabled={!canVibrate}
        onToggle={() => {
          const next = !haptics;
          setHaptics(next);
          if (next) vibrate(HAPTIC.confirm);
        }}
      />
    </div>
  );
}

/**
 * Meni stola — odredište dugmeta gore lijevo i Android/pregledač „nazad"
 * (tabla „UI · Meni za stolom", M; „Gdje je dugme za meni", M1/M6/M7).
 * Naslov kaže igru i stanje, zvuk i vibracija su pločice, pravila su red sa
 * strelicom, izlazak je odvojen i crven. „Zatvori" nema: zatvara X, dodir
 * pored lista ili „nazad".
 *
 * Scrim i pozicioniranje daje ekran; ovdje je samo sadržaj (isti dogovor kao
 * `RoundEndOverlay`).
 */
export function GameMenuSheet({
  title,
  subtitle,
  extra,
  onRules,
  onLeave,
  onClose,
  className = "",
}: GameMenuSheetProps) {
  return (
    <div className={`gamemenu ${className}`} role="dialog" aria-modal="true" aria-label={sr.menu.title}>
      <div className="gamemenu__grip" aria-hidden="true" />

      <div className="gamemenu__head">
        <div className="gamemenu__titles">
          <b className="gamemenu__title">{title}</b>
          {subtitle ? <small className="gamemenu__subtitle">{subtitle}</small> : null}
        </div>
        <button type="button" className="gamemenu__x" aria-label={sr.menu.close} onClick={onClose}>
          <svg {...ICON} width={22} height={22}>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      <div className="gamemenu__scroll">
        <FeedbackTiles />

        {extra}

        <button type="button" className="gamemenu__row" onClick={onRules}>
          <svg {...ICON} width={22} height={22}>
            <path d="M5 4.5h9a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3z" />
            <path d="M5 17a3 3 0 0 1 3-3h9" />
          </svg>
          <span className="gamemenu__row-label">{sr.menu.rules}</span>
          <svg {...ICON} width={20} height={20}>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>

        {onLeave ? (
          <>
            <div className="gamemenu__sep" aria-hidden="true" />
            <button type="button" className="gamemenu__exit" onClick={onLeave}>
              <svg {...ICON} width={22} height={22}>
                <path d="M10 5H6a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 6 19h4" />
                <path d="M14 8l4 4-4 4M18 12H9" />
              </svg>
              <span>{sr.menu.leave}</span>
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
