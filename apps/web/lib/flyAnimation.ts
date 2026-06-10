"use client";

/**
 * "Collect" mikro-animacija kupljenja (PRD §50.5): karte iz move-reveal-a
 * (odigrana + pokupljene) odlete ka sjedištu kupca (`[data-seat-id]`).
 *
 * Web Animations API na stvarnim card elementima (označeni `[data-reveal-card]`),
 * `fill: forwards` da ostanu na odredištu do unmount-a. Ne dira transform sjedišta
 * (samo čita poziciju). Poštuje `prefers-reduced-motion` (no-op). Anti-leak:
 * identično za sva sjedišta (bot/čovjek).
 */

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

function centerOf(rect: DOMRect): { x: number; y: number } {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * Animira sve `[data-reveal-card]` elemente unutar `container`-a ka sjedištu
 * `seatId` (staggered). Vraća trajanje (ms) najduže animacije za tajming hide-a.
 */
export function collectToPile(
  container: HTMLElement | null,
  seatId: string,
): number {
  if (!container || prefersReducedMotion() || typeof document === "undefined") {
    return 0;
  }
  const seatEl = document.querySelector(`[data-seat-id="${CSS.escape(seatId)}"]`);
  if (!seatEl) return 0;

  const to = centerOf(seatEl.getBoundingClientRect());
  const cards = container.querySelectorAll<HTMLElement>("[data-reveal-card]");
  if (cards.length === 0) return 0;

  const DUR = 462;
  const STAGGER = 50;
  cards.forEach((el, i) => {
    const from = centerOf(el.getBoundingClientRect());
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    el.animate(
      [
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0 },
      ],
      {
        duration: DUR,
        delay: i * STAGGER,
        easing: "cubic-bezier(0.4, 0, 0.6, 1)",
        fill: "forwards",
      },
    );
  });
  return DUR + (cards.length - 1) * STAGGER;
}

/** Jedna poleđina koja leti iz `from` u `to` sa zadatim kašnjenjem (ms). */
function flyGhostCard(
  from: { x: number; y: number },
  to: { x: number; y: number },
  delayMs: number,
  durationMs: number,
): void {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.x}px`,
    top: `${from.y}px`,
    width: "30px",
    height: "42px",
    borderRadius: "6px",
    // Isti vizuelni jezik kao CardBack (token-only): felt + zlatna rešetka.
    background: "var(--surface-raised)",
    backgroundImage:
      "repeating-linear-gradient(45deg, color-mix(in srgb, var(--accent) 30%, transparent) 0 1px, transparent 1px 7px), repeating-linear-gradient(-45deg, color-mix(in srgb, var(--accent) 30%, transparent) 0 1px, transparent 1px 7px)",
    border: "1px solid color-mix(in srgb, var(--accent) 50%, transparent)",
    boxShadow: "0 3px 8px rgba(0,0,0,0.4)",
    pointerEvents: "none",
    zIndex: "65",
    willChange: "transform, opacity",
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(ghost);

  const anim = ghost.animate(
    [
      { transform: "translate(-50%, -50%) translate(0, 0) scale(0.7)", opacity: 0.95 },
      {
        transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(1)`,
        opacity: 0,
      },
    ],
    {
      duration: durationMs,
      delay: delayMs,
      easing: "cubic-bezier(0.3, 0, 0.5, 1)",
      fill: "forwards",
    },
  );
  const cleanup = () => ghost.remove();
  anim.onfinish = cleanup;
  anim.oncancel = cleanup;
}

/**
 * Deal animacija (PRD §50.5): poleđine "lete" iz špila (`[data-deck]`) ka svakom
 * sjedištu (`[data-seat-id]`) i na sto (`[data-table-drop]`), kao da djelitelj
 * dijeli karte u krug — više karata po meti, round-robin, staggered. Ghost
 * elementi na `document.body` (fixed), samočisteći. No-op pri reduced-motion /
 * bez deck-sidra. Anti-leak: poleđine, isto za sve.
 *
 * Vraća ukupno trajanje (ms) da pozivatelj može odgoditi npr. prikaz timera.
 */
const CARDS_PER_SEAT = 3;
const CARDS_TO_TABLE = 4;
const DEAL_FLIGHT_MS = 396;
const DEAL_STEP_MS = 61; // razmak između uzastopnih karata (round-robin)

export function dealFromDeck(): number {
  if (prefersReducedMotion() || typeof document === "undefined") return 0;
  const deckEl = document.querySelector("[data-deck]");
  if (!deckEl) return 0;
  const from = centerOf(deckEl.getBoundingClientRect());

  // Mete dijeljenja: svako sjedište + (ako postoji) sto. Centre čitamo jednom.
  const targets: { center: { x: number; y: number }; cards: number }[] = [];
  document
    .querySelectorAll<HTMLElement>("[data-seat-id]")
    .forEach((el) =>
      targets.push({ center: centerOf(el.getBoundingClientRect()), cards: CARDS_PER_SEAT }),
    );
  const tableEl = document.querySelector<HTMLElement>("[data-table-drop]");
  if (tableEl) {
    targets.push({ center: centerOf(tableEl.getBoundingClientRect()), cards: CARDS_TO_TABLE });
  }
  if (targets.length === 0) return 0;

  // Round-robin: u svakom krugu po jedna karta svakoj meti koja još treba karte.
  const maxCards = Math.max(...targets.map((t) => t.cards));
  let order = 0;
  for (let round = 0; round < maxCards; round++) {
    for (const t of targets) {
      if (round >= t.cards) continue;
      flyGhostCard(from, t.center, order * DEAL_STEP_MS, DEAL_FLIGHT_MS);
      order++;
    }
  }
  return order > 0 ? (order - 1) * DEAL_STEP_MS + DEAL_FLIGHT_MS : 0;
}
