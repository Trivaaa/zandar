import { BACK_ART, centerOf, faceArtOf, makeGhost, nonNegativeMs, type GhostArt } from "./flyAnimation";

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

/* ------------------------------------------------------------------ *
 * Zamjena — iz špila igraču onoliko karata koliko je tražio
 * ------------------------------------------------------------------ */

/** Let jedne karte iz špila (ms) i razmak između karata istog igrača. */
export const RAUB_EXCHANGE_MS = 600;
export const RAUB_EXCHANGE_STEP_MS = 120;

export type DeckSnapshot = { rect: DOMRect; art: GhostArt };

/**
 * Gdje je špil i kakvu poleđinu nosi. `.rb-talon__deck`, ne `[data-deck]` —
 * taj atribut nose i `.felt-stage` i `CardBack`. Poleđina se čita sa prave
 * karte (mađarica dolazi iz `felt.css`), inače bi duh letio francuskom.
 */
export function snapshotDeck(root: ParentNode = document): DeckSnapshot | null {
  const deck = root.querySelector<HTMLElement>(".rb-talon__deck");
  const back = deck?.querySelector<HTMLElement>(".card-back");
  if (!deck || !back) return null;
  const rect = back.getBoundingClientRect();
  if (rect.width === 0) return null;
  const image = getComputedStyle(back).backgroundImage;
  return { rect, art: image && image !== "none" ? { color: BACK_ART.color, image } : BACK_ART };
}

/**
 * `count` karata poleti iz špila, jedna za drugom. Meta `i` je `targets[i]`
 * (nova karta u mojoj ruci — sakrije se dok duh ne sleti) ili zadnja meta
 * (sjedište protivnika — duh se na njemu smanji i nestane).
 */
export function flyFromDeck(from: DeckSnapshot, targets: readonly Element[], count: number, inHand: boolean): void {
  if (reducedMotion() || count <= 0 || targets.length === 0 || from.rect.width === 0) return;
  const a = centerOf(from.rect);
  const base = "translate(-50%, -50%)";
  for (let i = 0; i < count; i++) {
    const target = targets[Math.min(i, targets.length - 1)]!;
    const to = target.getBoundingClientRect();
    if (to.width === 0) continue;
    const b = centerOf(to);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const delay = i * RAUB_EXCHANGE_STEP_MS;
    const ghost = makeGhost(a, from.rect.width, from.rect.height, from.art);
    ghost.style.zIndex = "66";
    if (inHand) {
      // Prava karta se pojavi tek kad duh sleti (inače se vidi dvaput).
      try {
        target.animate([{ opacity: 0 }, { opacity: 0, offset: 0.98 }, { opacity: 1 }], {
          duration: nonNegativeMs(delay + RAUB_EXCHANGE_MS),
        });
      } catch {
        // ukras — bez skrivanja cilja let i dalje radi
      }
    }
    // U ruku: sleti u veličini karte. Na sjedište: vidljiva cijelim putem,
    // smanji se i nestane tek pri dolasku.
    const end = inHand ? to.width / from.rect.width : 0.7;
    let anim: Animation;
    try {
      anim = ghost.animate(
        [
          { transform: `${base} translate(0, 0) scale(1)`, opacity: 1 },
          { transform: `${base} translate(${dx * 0.85}px, ${dy * 0.85}px) scale(${(1 + end) / 2})`, opacity: 1, offset: 0.8 },
          { transform: `${base} translate(${dx}px, ${dy}px) scale(${end})`, opacity: inHand ? 1 : 0 },
        ],
        {
          duration: nonNegativeMs(RAUB_EXCHANGE_MS),
          delay: nonNegativeMs(delay),
          easing: "cubic-bezier(0.3, 0, 0.2, 1)",
          // `both`: dok čeka svoj red, duh stoji centriran na špilu.
          fill: "both",
        },
      );
    } catch {
      ghost.remove();
      continue;
    }
    const cleanup = () => ghost.remove();
    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
  }
}
