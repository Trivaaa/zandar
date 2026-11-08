"use client";

import { POKER_PACE, actionBeatMs } from "@zandar/game-core";

import { BACK_ART, centerOf, makeGhost, runGhost } from "./flyAnimation";
import { prefersReducedMotion } from "./motion";
import type { BeatFx } from "./pokerBeat";

/**
 * Letovi poker stola — „duhovi" na `document.body` (isti mehanizam kao Žandar,
 * `flyAnimation.ts`): mjere se prava sidra, pa duh leti iznad svega i sam se
 * počisti. Animira se samo transform i opacity. Pod `prefers-reduced-motion`
 * nema leta — priča (zadržavanja u `pokerBeat`) ostaje.
 *
 * Sidra:
 *  - `[data-seat-id]`      sjedište igrača (avatar)
 *  - `[data-bet-anchor]`   ulog ulice ispred igrača
 *  - `[data-pot-anchor]`   pot u sredini
 *  - `[data-deal-from]`    odakle se dijeli (sredina stola)
 */

const P = POKER_PACE;
const EASE = "cubic-bezier(0.3, 0, 0.3, 1)";
const CHIP_W = 22;
const CHIP_H = 22;
const CARD_W = 26;
const CARD_H = 37;

function el(selector: string): HTMLElement | null {
  return typeof document === "undefined" ? null : document.querySelector<HTMLElement>(selector);
}

const seatEl = (id: string) => el(`[data-seat-id="${CSS.escape(id)}"] .seat__avatar`) ?? el(`[data-seat-id="${CSS.escape(id)}"]`);
const betEl = (id: string) => el(`[data-bet-anchor="${CSS.escape(id)}"]`);
const potEl = () => el("[data-pot-anchor]");

/**
 * Žeton kao duh — isti crtež kao `.pk-chip` (`/chips/chip.webp`). Stil je
 * inline (duh živi na `body`-ju, van `.felt-stage`); sjena je `drop-shadow`
 * jer prati providne ivice slike, a ne kvadrat elementa.
 */
function chipGhost(at: { x: number; y: number }): HTMLElement {
  const g = makeGhost(at, CHIP_W, CHIP_H, { color: "transparent", image: 'url("/chips/chip.webp")' });
  Object.assign(g.style, {
    backgroundSize: "contain",
    backgroundPosition: "center",
    boxShadow: "none",
    filter: "drop-shadow(0 3px 4px rgb(0 0 0 / 0.45))",
  } as Partial<CSSStyleDeclaration>);
  return g;
}

function fly(
  from: Element | null,
  to: Element | null,
  make: (at: { x: number; y: number }) => HTMLElement,
  delay: number,
  duration: number,
  end: { scale: number; opacity: number } = { scale: 1, opacity: 1 },
): void {
  if (!from || !to) return;
  const a = centerOf(from.getBoundingClientRect());
  const b = centerOf(to.getBoundingClientRect());
  runGhost(make(a), b.x - a.x, b.y - a.y, { scale: 1, opacity: 1 }, end, delay, duration, EASE);
}

/** Izvede jedan efekat koraka. `stepMs` je trajanje koraka (let stane u njega). */
export function runPokerFx(fx: BeatFx, stepMs: number): void {
  if (typeof document === "undefined") return;
  if (fx.kind === "check") {
    // „Kuc" na avataru: kratak puls (transform), i pod prigušenim pokretom ništa.
    if (prefersReducedMotion()) return;
    seatEl(fx.playerId)?.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }],
      { duration: Math.min(360, stepMs), easing: "ease-out" },
    );
    return;
  }
  if (prefersReducedMotion()) return;

  switch (fx.kind) {
    case "chipsToBet": {
      // Žetoni od sjedišta do mjesta uloga; ulog postaje vidljiv kad korak završi.
      const d = Math.max(200, Math.min(stepMs, actionBeatMs("bet")) - 120);
      fly(seatEl(fx.playerId), betEl(fx.playerId), chipGhost, 60, d);
      return;
    }
    case "fold": {
      // Dvije poleđine klize ka sredini i nestanu.
      const from = el(`[data-seat-id="${CSS.escape(fx.playerId)}"] .seat__fan`) ?? seatEl(fx.playerId);
      const to = potEl() ?? el("[data-deal-from]");
      for (let i = 0; i < 2; i++) {
        fly(from, to, (at) => makeGhost(at, CARD_W, CARD_H, BACK_ART), i * 70, stepMs - 140, { scale: 0.6, opacity: 0 });
      }
      return;
    }
    case "betsToPot": {
      const to = potEl();
      const stagger = 70;
      const d = Math.max(250, stepMs - stagger * (fx.playerIds.length - 1) - 80);
      fx.playerIds.forEach((id, i) => fly(betEl(id), to, chipGhost, i * stagger, d, { scale: 0.85, opacity: 0.9 }));
      return;
    }
    case "potToWinners": {
      // Podijeljen pot: po jedan tok svakom pobjedniku, istovremeno.
      const from = potEl();
      fx.winners.forEach((id) => fly(from, seatEl(id), chipGhost, 0, stepMs - 150, { scale: 1, opacity: 0.6 }));
      return;
    }
    case "deal": {
      // Dva kruga, karta po karta, iz sredine stola ka svakom sjedištu.
      const from = el("[data-deal-from]") ?? potEl();
      const cards = fx.order.length * 2;
      for (let n = 0; n < cards; n++) {
        const id = fx.order[n % fx.order.length]!;
        fly(
          from,
          el(`[data-seat-id="${CSS.escape(id)}"]`),
          (at) => makeGhost(at, CARD_W, CARD_H, BACK_ART),
          P.blindsMs + n * P.dealStaggerMs,
          P.dealFlightMs,
          { scale: 1, opacity: 0.2 },
        );
      }
      return;
    }
  }
}
