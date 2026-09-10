"use client";

/**
 * Zajednicke motion straze. Guard je ranije zivio kao privatna kopija u
 * `flyAnimation.ts`; svaki novi WAAPI efekat bi napravio jos jednu, pa stoji
 * ovdje kao jedini izvor.
 */

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Kratko odbijanje: element se trzne u mjestu i vrati. Jedini nosilac poruke
 * "ovaj potez ne prolazi" koji NE zauzima prostor — panel sa objasnjenjem je
 * ranije stajao u play-zoni i rastao je za ~9 redova teksta.
 *
 * Animira samo `transform` (projektno pravilo) i postuje reduced-motion.
 */
export function shake(el: HTMLElement | null): void {
  if (!el || prefersReducedMotion()) return;
  el.animate(
    [
      { transform: "translate3d(0, 0, 0)" },
      { transform: "translate3d(-6px, 0, 0)" },
      { transform: "translate3d(5px, 0, 0)" },
      { transform: "translate3d(-3px, 0, 0)" },
      { transform: "translate3d(0, 0, 0)" },
    ],
    { duration: 260, easing: "ease-in-out" },
  );
}
