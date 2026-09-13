"use client";

/**
 * Letovi karata između sidara na feltu (PRD §50.5).
 *
 * Sve ide kroz "duhove" — elemente na `document.body` (`position: fixed`) koji
 * se sami čiste. Duh, a ne prava karta, zato što `.table__drop` ima
 * `overflow-y: auto` (izmjeren ugao 360x640 + 12 karata + traka izbora): karta
 * animirana IZ mreže ka sjedištu bi se odsjekla na ivici kutije stola umjesto
 * da odleti. Duh na `body`-ju nema nad sobom nijedan `overflow`.
 *
 * Poštuje `prefers-reduced-motion` (no-op). Anti-leak: identično za sva
 * sjedišta, bot ili čovjek.
 */

import { prefersReducedMotion } from "./motion";

function centerOf(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * Crtež poleđine koji nosi `.card-back`. Duh se crta inline u JS-u, pa NIJE
 * pokriven `felt.css`-om — kad se poleđina mijenja, mijenja se i ovo, inače
 * karta leti jednom poleđinom a sleti na drugu. Boja ispod ostaje kao pod dok
 * se slika ne učita (u praksi je već u kešu, jer špil stoji na ekranu prije
 * nego što ijedna karta poleti).
 */
const BACK_ART = {
  color: "var(--card-back)",
  image: 'url("/cards/back.webp")',
} as const;

type GhostArt = { color: string; image: string };

/**
 * Lice karte se NE sastavlja iz `data-card-id`: taj id je id karte u partiji,
 * ne ime asseta (asset je `rang + znak`, npr. `10C`). Umjesto treće kopije tog
 * pravila (postoji u `PlayingCard`, i u `felt.css` za poleđinu) duh pročita
 * crtež koji karta VEĆ nosi na `.card-face`. Jedan izvor, nula parsiranja.
 */
function faceArtOf(cardEl: Element): GhostArt {
  const face = cardEl.querySelector(".card-face");
  if (!face) return BACK_ART;
  const image = getComputedStyle(face).backgroundImage;
  return {
    color: "var(--card-face)",
    image: image && image !== "none" ? image : "none",
  };
}

function makeGhost(
  center: { x: number; y: number },
  width: number,
  height: number,
  art: GhostArt,
): HTMLElement {
  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${center.x}px`,
    top: `${center.y}px`,
    width: `${width}px`,
    height: `${height}px`,
    borderRadius: "6px",
    background: art.color,
    backgroundImage: art.image,
    backgroundSize: "100% 100%",
    backgroundRepeat: "no-repeat",
    boxShadow: "0 3px 8px color-mix(in oklab, var(--surface) 70%, transparent)",
    pointerEvents: "none",
    zIndex: "65",
    willChange: "transform, opacity",
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(ghost);
  return ghost;
}

function runGhost(
  ghost: HTMLElement,
  dx: number,
  dy: number,
  from: { scale: number; opacity: number },
  to: { scale: number; opacity: number },
  delayMs: number,
  durationMs: number,
  easing: string,
): void {
  const anim = ghost.animate(
    [
      {
        transform: `translate(-50%, -50%) translate(0, 0) scale(${from.scale})`,
        opacity: from.opacity,
      },
      {
        transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${to.scale})`,
        opacity: to.opacity,
      },
    ],
    { duration: durationMs, delay: delayMs, easing, fill: "forwards" },
  );
  const cleanup = () => ghost.remove();
  anim.onfinish = cleanup;
  anim.oncancel = cleanup;
}

/* ------------------------------------------------------------------ *
 * Collect — karte sa stola odlete u pile kupca
 * ------------------------------------------------------------------ */

const COLLECT_DUR = 462;
const COLLECT_STAGGER = 50;

/**
 * Sve `[data-collect-card]` unutar `container`-a odlete ka sjedištu `seatId`.
 *
 * Mjeri prave karte pa pušta duhove sa njihovih pozicija — pozivatelj odmah
 * zatim smije da sakrije originale (rect ne zavisi od `opacity`). Vraća
 * trajanje (ms) najdužeg leta, ili 0 ako leta nema.
 */
export function collectCardsToSeat(
  container: HTMLElement | null,
  seatId: string,
): number {
  if (!container || prefersReducedMotion() || typeof document === "undefined") {
    return 0;
  }
  const seatEl = document.querySelector(`[data-seat-id="${CSS.escape(seatId)}"]`);
  if (!seatEl) return 0;

  const to = centerOf(seatEl.getBoundingClientRect());
  const cards = container.querySelectorAll<HTMLElement>("[data-collect-card]");

  let flying = 0;
  cards.forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return; // nije na ekranu
    const from = centerOf(rect);
    const ghost = makeGhost(from, rect.width, rect.height, faceArtOf(el));
    runGhost(
      ghost,
      to.x - from.x,
      to.y - from.y,
      { scale: 1, opacity: 1 },
      { scale: 0.3, opacity: 0 },
      flying * COLLECT_STAGGER,
      COLLECT_DUR,
      "cubic-bezier(0.4, 0, 0.6, 1)",
    );
    flying++;
  });

  return flying > 0 ? COLLECT_DUR + (flying - 1) * COLLECT_STAGGER : 0;
}

/* ------------------------------------------------------------------ *
 * Deal — poleđine lete iz špila ka igračima i na sto
 * ------------------------------------------------------------------ */

const DEAL_FLIGHT_MS = 515;
const DEAL_STEP_MS = 79; // razmak između uzastopnih karata (round-robin)
const DEAL_CARD_W = 30;
const DEAL_CARD_H = 42;

/**
 * Deal animacija (PRD §50.5): poleđine "lete" iz špila (`[data-deck]`) ka svakom
 * sjedištu (`[data-seat-id]`) i na sto (`[data-table-drop]`), kao da djelitelj
 * dijeli karte u krug — više karata po meti, round-robin, staggered.
 *
 * Koliko se dijeli NE pogađa se ovdje: `perSeat` i `toTable` stižu iz `deal`
 * događaja (`deriveGameEvents`), koji ih čita iz razlike dva snapshota. Ranije
 * su bile konstante (3 po igraču, uvijek 4 na sto), pa je svaki re-deal usred
 * ruke bacao četiri karte na sto koje server nikad nije podijelio.
 *
 * Vraća ukupno trajanje (ms) da pozivatelj može odgoditi npr. prikaz timera.
 */
export function dealFromDeck(perSeat: number, toTable: number): number {
  if (prefersReducedMotion() || typeof document === "undefined") return 0;
  const deckEl = document.querySelector("[data-deck]");
  if (!deckEl) return 0;
  const from = centerOf(deckEl.getBoundingClientRect());

  // Mete dijeljenja: svako sjedište + sto, ali SAMO kad na njega stvarno ide
  // karta. Centre čitamo jednom.
  const targets: { center: { x: number; y: number }; cards: number }[] = [];
  if (perSeat > 0) {
    document
      .querySelectorAll<HTMLElement>("[data-seat-id]")
      .forEach((el) =>
        targets.push({ center: centerOf(el.getBoundingClientRect()), cards: perSeat }),
      );
  }
  const tableEl =
    toTable > 0 ? document.querySelector<HTMLElement>("[data-table-drop]") : null;
  if (tableEl) {
    targets.push({ center: centerOf(tableEl.getBoundingClientRect()), cards: toTable });
  }
  if (targets.length === 0) return 0;

  // Round-robin: u svakom krugu po jedna karta svakoj meti koja još treba karte.
  const maxCards = Math.max(...targets.map((t) => t.cards));
  let order = 0;
  for (let round = 0; round < maxCards; round++) {
    for (const t of targets) {
      if (round >= t.cards) continue;
      const ghost = makeGhost(from, DEAL_CARD_W, DEAL_CARD_H, BACK_ART);
      runGhost(
        ghost,
        t.center.x - from.x,
        t.center.y - from.y,
        { scale: 0.7, opacity: 0.95 },
        { scale: 1, opacity: 0 },
        order * DEAL_STEP_MS,
        DEAL_FLIGHT_MS,
        "cubic-bezier(0.3, 0, 0.5, 1)",
      );
      order++;
    }
  }
  return order > 0 ? (order - 1) * DEAL_STEP_MS + DEAL_FLIGHT_MS : 0;
}
