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

  const DUR = 420;
  const STAGGER = 45;
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
