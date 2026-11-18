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

export function centerOf(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * Crtež poleđine koji nosi `.card-back`. Duh se crta inline u JS-u, pa NIJE
 * pokriven `felt.css`-om — kad se poleđina mijenja, mijenja se i ovo, inače
 * karta leti jednom poleđinom a sleti na drugu. Boja ispod ostaje kao pod dok
 * se slika ne učita (u praksi je već u kešu, jer špil stoji na ekranu prije
 * nego što ijedna karta poleti).
 */
export const BACK_ART = {
  color: "var(--card-back)",
  image: 'url("/cards/back.webp")',
} as const;

export type GhostArt = { color: string; image: string };

/**
 * Lice karte se NE sastavlja iz `data-card-id`: taj id je id karte u partiji,
 * ne ime asseta (asset je `rang + znak`, npr. `10C`). Umjesto treće kopije tog
 * pravila (postoji u `PlayingCard`, i u `felt.css` za poleđinu) duh pročita
 * crtež koji karta VEĆ nosi na `.card-face`. Jedan izvor, nula parsiranja.
 */
export function faceArtOf(cardEl: Element): GhostArt {
  const face = cardEl.querySelector(".card-face");
  if (!face) return BACK_ART;
  const image = getComputedStyle(face).backgroundImage;
  return {
    color: "var(--card-face)",
    image: image && image !== "none" ? image : "none",
  };
}

export function makeGhost(
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

/**
 * `Element.animate` baca TypeError na negativno ili ne-konačno trajanje, a
 * izuzetak iz efekta ruši cijelu aplikaciju (Sentry 2026-11-13, poker fold:
 * `stepMs - 140` kad `usePokerBeat` sabije korak ispod 140 ms).
 */
export function nonNegativeMs(ms: number): number {
  return Number.isFinite(ms) && ms > 0 ? ms : 0;
}

export function runGhost(
  ghost: HTMLElement,
  dx: number,
  dy: number,
  from: { scale: number; opacity: number },
  to: { scale: number; opacity: number },
  delayMs: number,
  durationMs: number,
  easing: string,
): void {
  let anim: Animation;
  try {
    anim = ghost.animate(
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
      { duration: nonNegativeMs(durationMs), delay: nonNegativeMs(delayMs), easing, fill: "forwards" },
    );
  } catch {
    // Let je ukras: ako ga pregledač odbije, duh nestane, a partija ide dalje.
    ghost.remove();
    return;
  }
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
  all = false,
): number {
  if (!container || prefersReducedMotion() || typeof document === "undefined") {
    return 0;
  }
  const seatEl = document.querySelector(`[data-seat-id="${CSS.escape(seatId)}"]`);
  if (!seatEl) return 0;

  const to = centerOf(seatEl.getBoundingClientRect());
  // `all`: kraj ruke — preostali sto ide zadnjem kupcu, pa lete i karte koje
  // potez nije pokupio (one nemaju `data-collect-card`).
  const cards = container.querySelectorAll<HTMLElement>(
    all ? "[data-collect-card], .table__slot" : "[data-collect-card]",
  );

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

/* ------------------------------------------------------------------ *
 * Moj potez — karta odmah krene iz ruke, prije odgovora servera
 * ------------------------------------------------------------------ */

const PLAY_OUT_MS = 200;
const PLAY_BACK_MS = 220;
const PLAY_FADE_MS = 140;
/**
 * Duh nikad ne ostaje zauvijek. Pozivatelj ga vraća u ruku ranije (5 s bez
 * odgovora, `GameScreen`); ovo je samo zadnja straža da ne ostane na `body`-ju.
 */
const PLAY_MAX_LIFE_MS = 8000;

export type OutgoingCard = {
  /** Pravi potez je stigao: duh se ugasi (prava karta slijeće na isto mjesto). */
  release: () => void;
  /** Server je odbio: duh se vrati u ruku. Vraća trajanje povratka (ms). */
  returnHome: () => number;
};

/**
 * Karta iz ruke poleti ka stolu ODMAH na dodir. Ranije se ništa nije micalo
 * dok se odgovor servera ne vrati (~130 ms tamo-nazad do `iad`, plus render),
 * a jedini znak dodira je bilo sivljenje cijele ruke — djelovalo je kao da
 * se aplikacija zamrzla.
 *
 * Duh, a ne prava karta: ruka kartu odmah sakrije i ponovo se raširi, a duh
 * leti preko svega (`document.body`). `toCenter`: na sredinu stola, tamo gdje
 * će sletjeti; inače (sto još animira tuđi potez) samo do donje ivice stola,
 * da ne pokrije kupljenje koje igrač upravo gleda.
 *
 * Server je i dalje jedini sudija — duh je samo prikaz, i vraća se ako potez
 * bude odbijen. `null` kad leta nema (reduced-motion, karta van DOM-a).
 */
export function flyCardFromHand(cardId: string, toCenter: boolean): OutgoingCard | null {
  if (prefersReducedMotion() || typeof document === "undefined") return null;
  const cardEl = document.querySelector<HTMLElement>(
    `.hand [data-card-id="${CSS.escape(cardId)}"]`,
  );
  const dropEl = document.querySelector<HTMLElement>("[data-table-drop]");
  if (!cardEl || !dropEl) return null;
  const rect = cardEl.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  // Karta spuštena prevlačenjem (`useCardDrag`) kreće odande gdje ju je prst
  // pustio, ne iz ruke — inače bi skočila nazad u ruku pa poletjela na sto.
  const dragGhost = document.querySelector<HTMLElement>(".card-drag-ghost");
  const from = centerOf(dragGhost ? dragGhost.getBoundingClientRect() : rect);
  const drop = dropEl.getBoundingClientRect();
  const to = toCenter
    ? centerOf(drop)
    : { x: drop.left + drop.width / 2, y: drop.bottom - rect.height * 0.35 };
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const ghost = makeGhost(from, rect.width, rect.height, faceArtOf(cardEl));
  const base = "translate(-50%, -50%)";
  let anim: Animation | null = null;
  try {
    anim = ghost.animate(
      [
        { transform: `${base} translate(0, 0) scale(1.04)` },
        { transform: `${base} translate(${dx}px, ${dy}px) scale(1) rotate(-4deg)` },
      ],
      { duration: PLAY_OUT_MS, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "forwards" },
    );
  } catch {
    ghost.remove();
    return null;
  }

  let done = false;
  const life = setTimeout(() => finish(), PLAY_MAX_LIFE_MS);
  function finish() {
    if (done) return;
    done = true;
    clearTimeout(life);
    ghost.remove();
  }
  function then(keyframes: Keyframe[], ms: number) {
    if (done) return;
    // Let koji još traje (odgovor brži od 200 ms) se ne prekida skokom:
    // gašenje počne tamo gdje je duh sada, a ne na odredištu.
    if (anim && anim.playState === "running") {
      try {
        anim.commitStyles();
        keyframes = keyframes.slice(1);
      } catch {
        // commitStyles baca na elementu bez rendera — onda od odredišta.
      }
    }
    anim?.cancel();
    anim = null;
    try {
      const a = ghost.animate(keyframes, { duration: ms, easing: "ease-out", fill: "forwards" });
      a.onfinish = finish;
      a.oncancel = finish;
    } catch {
      finish();
    }
  }

  return {
    release() {
      then(
        [
          { transform: `${base} translate(${dx}px, ${dy}px) scale(1) rotate(-4deg)`, opacity: 1 },
          { transform: `${base} translate(${dx}px, ${dy}px) scale(1) rotate(-4deg)`, opacity: 0 },
        ],
        PLAY_FADE_MS,
      );
    },
    returnHome() {
      then(
        [
          { transform: `${base} translate(${dx}px, ${dy}px) scale(1) rotate(-4deg)` },
          { transform: `${base} translate(0, 0) scale(1)` },
        ],
        PLAY_BACK_MS,
      );
      return done ? 0 : PLAY_BACK_MS;
    },
  };
}
