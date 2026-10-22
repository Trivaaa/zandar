"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { useBackHandler } from "@/lib/backHandlers";

export type SheetProps = {
  title: ReactNode;
  children: ReactNode;
  /** Donje dugme (Odustani / Zatvori) — uvijek postoji, kao u Postavkama. */
  closeLabel: string;
  onClose: () => void;
};

/**
 * List odozdo (SPEC_IDENTITET G8): ručka, naslov, sadržaj, Odustani/Zatvori na
 * dnu. Površina je ista kao Postavke i Meni stola (`.gamemenu*`), scrim kao na
 * home-u. Zatvara se na scrim, Escape i Android „nazad" (`useBackHandler`).
 *
 * Omotač `.home-layer` diže list iznad PWA trake i donje navigacije.
 */
export function Sheet({ title, children, closeLabel, onClose }: SheetProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  // Fokus se vraća tamo gdje je bio — host ne mora da pamti dugme.
  const returnFocus = useRef<Element | null>(null);

  useEffect(() => {
    returnFocus.current = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (returnFocus.current instanceof HTMLElement) returnFocus.current.focus();
    };
  }, []);

  useBackHandler(true, onClose);

  return (
    <div className="home-layer">
      <div className="sheet-scrim" onClick={onClose}>
        <div className="sheet-scrim__inner" onClick={(e) => e.stopPropagation()}>
          <div
            className="gamemenu sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          >
            <div className="gamemenu__grip" aria-hidden="true" />
            <h2 id={titleId} className="settings__title">
              {title}
            </h2>
            <div className="gamemenu__scroll">{children}</div>
            <button
              ref={closeRef}
              type="button"
              className="gamemenu__close font-sans text-base font-bold"
              onClick={onClose}
            >
              {closeLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
