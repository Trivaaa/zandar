import { sr } from "@/lib/sr";

/**
 * Znak Kartaonice: dvije karte, prednja mesing sa karo znakom.
 * Crtan u kodu (bez binarnog asseta), boje iz tokena kroz `home.css`.
 */
export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden focusable={false} className={`brandmark ${className}`}>
      <rect className="brandmark__back" x="4" y="9.5" width="19" height="26" rx="3" transform="rotate(-14 13.5 22.5)" />
      <rect className="brandmark__front" x="15" y="5" width="20" height="28" rx="3.2" />
      <path className="brandmark__pip" d="M25 12.5 29.6 19 25 25.5 20.4 19z" />
    </svg>
  );
}

/** Znak + ime + domen. Dijele ga home i teaser stranice. */
export function BrandLockup({ className = "" }: { className?: string }) {
  return (
    <div className={`brand ${className}`}>
      <BrandMark className="brand__mark" />
      <span className="brand__text">
        <span className="brand__name">{sr.home.brand}</span>
        <span className="brand__domain">{sr.home.domain}</span>
      </span>
    </div>
  );
}
