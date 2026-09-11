"use client";

import { sr } from "@/lib/sr";

export type TurnBannerProps = {
  isYou: boolean;
  /** Ignored when isYou. */
  displayName?: string;
  /**
   * Recenica koju traka crta umjesto "Ti si na potezu". Traka je JEDINI kanal
   * za uputstvo igracu: sve sto je ranije raslo unutar play-zone (force-capture
   * objasnjenje, trail hint, "izaberi grupu") dolazi ovuda, pa sto vise ne
   * mijenja geometriju kad izaberes kartu.
   */
  text?: string;
  /** "must" = potez je ogranicen pravilom; boja upozorava, ne uzbunjuje. */
  tone?: "turn" | "must";
  /**
   * Preostale sekunde. Sat zivi u roditelju; traka ga samo crta. Bez ovoga
   * (ili sa totalSeconds <= 0) banner je gola recenica, bez brojaca — tako
   * izgleda dok karte jos padaju na pocetku ruke.
   */
  secondsRemaining?: number;
  totalSeconds?: number;
  className?: string | undefined;
};

const URGENT_AT = 5;

/**
 * Recenica I odbrojavanje u jednom elementu. Ranije su to bila dva sloja jedan
 * iznad drugog (banner + samostalna pilula), sto je nad rukom pravilo blok
 * dvostruke visine koji dva puta kaze istu stvar. Sada: tekst, broj uz njega,
 * a vrijeme curi kao tanka linija po donjoj ivici.
 */
export function TurnBanner({
  isYou,
  displayName = "",
  text,
  tone = "turn",
  secondsRemaining,
  totalSeconds = 0,
  className = "",
}: TurnBannerProps) {
  const hasClock = secondsRemaining !== undefined && totalSeconds > 0;
  const clamped = hasClock ? Math.min(Math.max(secondsRemaining, 0), totalSeconds) : 0;
  const fill = hasClock ? clamped / totalSeconds : 1;
  const urgent = hasClock && clamped <= URGENT_AT;

  // Traka je namjerno 2px ispod ostatka UI-ja (14px tekst / 18px sat): stoji
  // tik iznad ruke i bila je najglasniji element na feltu.
  //
  // Sat NEMA `text-*` utility: u Tailwindu v4 `text-lg` nosi i `line-height`
  // (28px), koji bi iz `@layer utilities` nadjacao `line-height: 1` iz
  // `.banner__clock` i traku UVECAO umjesto smanjio (izmjereno: 33.6 -> 37.6px).
  // Zato velicinu sata drzi felt.css, kao i kod `.seat__avatar` i `.seat__name`.
  return (
    <div
      className={`banner ${isYou ? "banner--you" : ""} ${
        tone === "must" ? "banner--must" : ""
      } ${className}`}
      role="status"
      aria-live="polite"
      data-urgent={urgent}
    >
      <span className="banner__text font-sans text-sm font-bold">
        {text ?? (isYou ? sr.turn.you : sr.turn.other(displayName))}
      </span>

      {/* Cifre su aria-hidden: recenica je vec objavljena kroz role="status",
          a brojac koji se cita svake sekunde je za citac ekrana samo buka. */}
      {hasClock ? (
        <>
          <span className="banner__clock font-display" aria-hidden="true">
            {Math.ceil(clamped)}
          </span>
          <span className="banner__track" aria-hidden="true">
            <span
              className="banner__fill"
              style={{ "--banner-fill": fill } as React.CSSProperties}
            />
          </span>
        </>
      ) : null}
    </div>
  );
}
