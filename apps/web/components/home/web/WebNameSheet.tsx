"use client";

import { useEffect, useId, useRef, useState } from "react";

import { GameFan } from "@/components/home/web/WebGameCard";
import { ArrowRightIcon, CloseIcon, WarningIcon } from "@/components/icons";
import { useBackHandler } from "@/lib/backHandlers";
import type { GameConfig } from "@/lib/games";
import { isValidPlayerName } from "@/lib/playerName";
import { sr } from "@/lib/sr";

const t = sr.homeWeb.name;

/**
 * Ime za stolom na webu (tabla „UI · Ime za stolom — web", I1–I5). Igrač iz
 * oglasa tapne „Igraj" i prvo dobije ovaj list; aplikacija zadržava
 * `QuickPlayNameSheet`.
 *
 * Razlike od starog lista: gore piše kuda igrač ide (igra, broj igrača, cilj),
 * „Odustani" je X u zaglavlju, glavno dugme stoji odmah ispod polja i NIKAD
 * nije sivo — prazan pokušaj kaže šta fali (I3) i vraća fokus u polje. Ispod
 * je „Preskoči i igraj kao Gost NN" (I5, odluka vlasnika 16.11.2026).
 *
 * Isti obrazac kao `Sheet` (scrim, Escape, Android nazad, povratak fokusa), ali
 * bez donjeg dugmeta. Samo prikaz: traženje stola radi `app/page.tsx`.
 */
export function WebNameSheet({
  game,
  loading,
  error,
  guestName,
  onSubmit,
  onGuest,
  onClose,
}: {
  game: GameConfig;
  /** Traži se sto (I4): polje i dugmad zaključani. */
  loading: boolean;
  /** Greška servera — stoji u redu pomoći, kao i „Upiši ime" (I3). */
  error?: string | undefined;
  guestName: string;
  onSubmit: (name: string) => void;
  onGuest: () => void;
  onClose: () => void;
}) {
  const titleId = useId();
  const inputId = useId();
  const helpId = useId();
  const [name, setName] = useState("");
  const [empty, setEmpty] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const scrim = useRef<HTMLDivElement>(null);

  // Fokus u polje (tastatura odmah gore, I1); na zatvaranju nazad gdje je bio.
  useEffect(() => {
    const previous = document.activeElement;
    input.current?.focus();
    return () => {
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  useKeyboardInset(scrim);
  useBackHandler(true, onClose);

  const message = empty ? t.empty : error;

  return (
    <div className="home-layer">
      <div ref={scrim} className="sheet-scrim web-name-scrim" onClick={onClose}>
        <div className="sheet-scrim__inner" onClick={(e) => e.stopPropagation()}>
          <form
            className="gamemenu sheet web-name"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            noValidate
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
            onSubmit={(e) => {
              e.preventDefault();
              if (loading) return;
              if (!isValidPlayerName(name)) {
                setEmpty(true);
                input.current?.focus();
                return;
              }
              onSubmit(name);
            }}
          >
            <div className="gamemenu__grip" aria-hidden="true" />
            <div className="web-name__game" data-tint={game.tint}>
              <span className="web-friends__art web-name__art">
                <GameFan game={game} className="web-friends__fan" />
              </span>
              <span className="web-name__game-text">
                {sr.games[game.slug].name}
                <small>{t.meta[game.slug]}</small>
              </span>
              <button
                type="button"
                className="web-name__close"
                aria-label={t.close}
                onClick={onClose}
                disabled={loading}
              >
                <CloseIcon className="web-name__close-icon" />
              </button>
            </div>
            <h2 id={titleId} className="web-name__title">
              {t.title}
            </h2>
            <label className="web-name__label" htmlFor={inputId}>
              {t.label}
            </label>
            <input
              ref={input}
              id={inputId}
              className="web-name__input"
              type="text"
              inputMode="text"
              autoComplete="nickname"
              autoCapitalize="words"
              enterKeyHint="go"
              placeholder={t.placeholder}
              value={name}
              disabled={loading}
              aria-invalid={empty}
              aria-describedby={helpId}
              onChange={(e) => {
                setName(e.target.value);
                if (empty) setEmpty(false);
              }}
            />
            {/* Rezervisan red: pomoć i greška dijele mjesto, dugme se ne pomjera. */}
            <p id={helpId} className="web-name__help" data-error={message ? "true" : undefined} aria-live="polite">
              {message ? <WarningIcon className="web-name__help-icon" /> : null}
              {message ?? t.help}
            </p>
            <button
              type="submit"
              className="home__cta sheet__btn web-name__submit"
              aria-busy={loading}
              aria-disabled={loading}
            >
              {loading ? (
                <>
                  <span className="web-name__spin" aria-hidden="true" />
                  {t.submitting}
                </>
              ) : (
                <>
                  {t.submit}
                  <ArrowRightIcon className="home__cta-arrow" />
                </>
              )}
            </button>
            <button type="button" className="web-name__guest" onClick={onGuest} disabled={loading}>
              {t.guestPrefix} <b>{guestName}</b>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Chrome na Androidu podrazumijevano NE smanjuje layout viewport kad se otvori
 * tastatura, pa bi list prikovan za dno ostao ispod nje. Visina koju tastatura
 * pokriva ide u `--kb-inset` na scrimu (lokalno, bez globalnog `viewport`-a).
 */
function useKeyboardInset(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      ref.current?.style.setProperty("--kb-inset", `${inset}px`);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [ref]);
}
