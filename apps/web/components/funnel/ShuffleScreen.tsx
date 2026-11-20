"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { prefersReducedMotion } from "@/lib/motion";
import {
  SHUFFLE_COLLECT_MS,
  initialOf,
  initialTone,
  shuffleSeats,
  type ShuffleSeatPlayer,
} from "@/lib/shuffleView";
import { playSfx } from "@/lib/sound";
import { sr } from "@/lib/sr";

/** Broj poleđina u špilu (tabla): dovoljno za riffle, malo za GPU. */
const CARDS = 10;
/** Visina gomile: svaka karta 0,9 px iznad prethodne (tabla). */
const STEP_PX = 0.9;
const rest = (i: number) => `translateY(${(-STEP_PX * i).toFixed(1)}px)`;

export type ShuffleScreenProps = {
  /** Red iznad naslova („Žandar · 4 igrača · do 11"); null dok soba ne stigne. */
  kicker: string | null;
  /** Spisak sobe, a od S2 igrači iz stanja partije (oba oblika imaju ova polja). */
  players: readonly ShuffleSeatPlayer[];
  myPlayerId: string | null;
  playerCount: number;
  /** Stanje partije je stiglo: S2 (karte u gomilu, kucanje). Roditelj drži sat. */
  exiting: boolean;
};

/**
 * Ekran prije partije — „Miješamo špil" (tabla `UI_MijesanjeSpila`, S1–S3).
 *
 * Samo crta. Koliko traje odlučuje roditelj (`RoomScreen`): ekran stoji dok
 * stanje partije stvarno ne stigne, pa `exiting` → 0,65 s → sto. Krug od 3 s
 * se ne čeka do kraja.
 */
export function ShuffleScreen({ kicker, players, myPlayerId, playerCount, exiting }: ShuffleScreenProps) {
  const cards = useRef<(HTMLImageElement | null)[]>([]);
  const deck = useRef<HTMLSpanElement | null>(null);
  // S2 se dijeli na „collect" (karte u gomilu) i „full" (kucanje, zlatni krug).
  const [full, setFull] = useState(false);

  // Ulaz u S2: trenutna tačka svake karte se pročita PRIJE nego CSS petlja
  // stane, pa karte odlete odatle u gomilu — bez skoka na početak kruga.
  // Layout effect: između commit-a i ovoga nema iscrtavanja.
  useLayoutEffect(() => {
    if (!exiting) return;
    const els = cards.current;
    const still = prefersReducedMotion();
    const from = els.map((el) => (el && !still ? getComputedStyle(el).transform : "none"));
    const deckEl = deck.current;
    const deckFrom = deckEl && !still ? getComputedStyle(deckEl).transform : "none";
    if (deckEl) {
      deckEl.style.animation = "none";
      if (deckFrom !== "none") {
        deckEl.animate([{ transform: deckFrom }, { transform: "none" }], { duration: SHUFFLE_COLLECT_MS });
      }
    }
    els.forEach((el, i) => {
      if (!el) return;
      el.style.animation = "none";
      const start = from[i];
      if (start && start !== "none") {
        el.animate([{ transform: start }, { transform: rest(i) }], {
          duration: SHUFFLE_COLLECT_MS,
          easing: "cubic-bezier(0.33, 1, 0.68, 1)",
        });
      }
    });
    const t = setTimeout(() => {
      // Kucanje vodi CSS (`[data-stage="full"] .shuffle__deck`).
      if (deckEl) deckEl.style.animation = "";
      setFull(true);
      playSfx("place");
    }, SHUFFLE_COLLECT_MS);
    return () => clearTimeout(t);
  }, [exiting]);

  const seats = shuffleSeats(players, myPlayerId, playerCount);
  const stage = full ? "full" : exiting ? "collect" : "loop";

  return (
    <main className="screen shuffle" data-stage={stage} aria-busy={!exiting}>
      <header className="shuffle__head">
        <small className="shuffle__kicker">{kicker ?? " "}</small>
        <h1 className="shuffle__title" aria-live="polite">
          {exiting ? sr.shuffle.ready : sr.shuffle.title}
        </h1>
      </header>

      <div className="shuffle__stage">
        <div className="shuffle__table" aria-hidden="true">
          <span className="shuffle__glow" />
          <span className="shuffle__felt" />
          <span className="shuffle__mid">
            <i className="shuffle__ring" />
            <span ref={deck} className="shuffle__deck">
              {Array.from({ length: CARDS }, (_, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  ref={(el) => {
                    cards.current[i] = el;
                  }}
                  className={`shuffle__card shuffle__card--${i}`}
                  src="/cards/back.webp"
                  alt=""
                  draggable={false}
                  style={{ zIndex: i, transform: rest(i) }}
                />
              ))}
              <i className="shuffle__shine" />
            </span>
          </span>
        </div>

        {seats.map((seat) => (
          <div key={seat.place} className={`shuffle__seat shuffle__seat--${seat.place}`}>
            {seat.player ? (
              <div key={seat.player.id} className="shuffle__on" data-me={seat.me}>
                {seat.player.avatar ? (
                  <span className="shuffle__disc">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/avatars/${seat.player.avatar}.svg`} alt="" draggable={false} />
                  </span>
                ) : (
                  <span className="shuffle__disc" data-tone={initialTone(seat.player.displayName)}>
                    <b>{initialOf(seat.player.displayName)}</b>
                  </span>
                )}
                <span className="shuffle__name">{seat.me ? sr.shuffle.you : seat.player.displayName}</span>
              </div>
            ) : (
              <div className="shuffle__empty">
                <i />
                <span>{sr.shuffle.free}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="shuffle__wait" data-full={full || exiting}>
        {exiting ? sr.shuffle.starting : sr.shuffle.waiting}
      </p>
    </main>
  );
}
