import { centerOf, faceArtOf, makeGhost, nonNegativeMs, type GhostArt } from "./flyAnimation";

/** Trajanje leta karte s talona do nosioca (ms); CSS `--t-rb-take` mora biti isto. */
export const RAUB_TAKE_MS = 750;

/** Gdje je bila karta na talonu prije nego što je React skine (mjeri se na svakom crtanju). */
export type TalonSnapshot = { cardId: string; rect: DOMRect; art: GhostArt };

export function snapshotTalonTop(root: ParentNode = document): TalonSnapshot | null {
  const top = root.querySelector<HTMLElement>(".rb-talon__top[data-card-id]");
  if (!top) return null;
  const rect = top.getBoundingClientRect();
  if (rect.width === 0) return null;
  return { cardId: top.dataset.cardId!, rect, art: faceArtOf(top) };
}

function reducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Karta odleti od `from` do `to`: na pola puta „iskoči" (scale ~1.35) da je vide
 * svi za stolom, pa se smanji na veličinu cilja. Duh je na `document.body`
 * (`.table__drop` siječe), animira se samo transform + opacity.
 */
export function flyCard(from: DOMRect, target: Element, art: GhostArt, durationMs = RAUB_TAKE_MS): void {
  const to = target.getBoundingClientRect();
  if (reducedMotion() || from.width === 0 || to.width === 0) return;
  // Prava karta na cilju se pojavi tek kad duh sleti (inače se vidi dvaput).
  try {
    target.animate([{ opacity: 0 }, { opacity: 0, offset: 0.98 }, { opacity: 1 }], {
      duration: nonNegativeMs(durationMs),
    });
  } catch {
    // ukras — bez skrivanja cilja let i dalje radi
  }
  const a = centerOf(from);
  const b = centerOf(to);
  const ghost = makeGhost(a, from.width, from.height, art);
  ghost.style.zIndex = "66";
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const end = to.width / from.width;
  const base = "translate(-50%, -50%)";
  let anim: Animation;
  try {
    anim = ghost.animate(
      [
        { transform: `${base} translate(0, 0) scale(1)`, opacity: 1 },
        { transform: `${base} translate(${dx * 0.35}px, ${dy * 0.35}px) scale(1.35)`, opacity: 1, offset: 0.4 },
        { transform: `${base} translate(${dx}px, ${dy}px) scale(${end})`, opacity: 1 },
      ],
      { duration: nonNegativeMs(durationMs), easing: "cubic-bezier(0.3, 0, 0.2, 1)", fill: "forwards" },
    );
  } catch {
    ghost.remove();
    return;
  }
  const cleanup = () => ghost.remove();
  anim.onfinish = cleanup;
  anim.oncancel = cleanup;
}
