"use client";

/**
 * Fly-to-pile animacija kupljenja (PRD §50.5, Faza 3b).
 *
 * Kad neko pokupi, "ghost" karta poleti iz play-zone ka sjedištu kupca. Koristi
 * Web Animations API + element na `document.body` (fixed) → NE dira transform
 * sjedišta (koja imaju -translate-x/y u className) i ne pravi React re-render.
 * Samočisteće (onfinish/oncancel), interuptibilno, pointer-events-none.
 *
 * Poštuje `prefers-reduced-motion` (no-op). Anti-leak: identično za sva sjedišta
 * (bot i čovjek), čita samo poziciju sjedišta.
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

/** Poleti ghost karticu iz play-zone (`[data-play-zone]`) ka sjedištu kupca. */
export function flyToPile(stage: HTMLElement | null, seatId: string): void {
  if (!stage || prefersReducedMotion() || typeof document === "undefined") return;

  const zoneEl = stage.querySelector("[data-play-zone]");
  const seatEl = stage.querySelector(`[data-seat-id="${CSS.escape(seatId)}"]`);
  if (!zoneEl || !seatEl) return;

  const from = centerOf(zoneEl.getBoundingClientRect());
  const to = centerOf(seatEl.getBoundingClientRect());
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${from.x}px`,
    top: `${from.y}px`,
    width: "34px",
    height: "48px",
    borderRadius: "6px",
    background: "#243029",
    border: "1px solid rgba(224, 169, 46, 0.55)",
    boxShadow: "0 4px 12px rgba(0,0,0,0.45)",
    pointerEvents: "none",
    zIndex: "70",
    willChange: "transform, opacity",
  } as Partial<CSSStyleDeclaration>);
  document.body.appendChild(ghost);

  const anim = ghost.animate(
    [
      { transform: "translate(-50%, -50%) translate(0, 0) scale(1)", opacity: 0.95 },
      {
        transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(0.35)`,
        opacity: 0,
      },
    ],
    { duration: 420, easing: "cubic-bezier(0.4, 0, 0.6, 1)" },
  );
  const cleanup = () => ghost.remove();
  anim.onfinish = cleanup;
  anim.oncancel = cleanup;
}
