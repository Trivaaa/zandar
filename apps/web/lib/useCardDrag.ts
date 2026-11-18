"use client";

import { useEffect, useRef, type RefObject } from "react";
import { faceArtOf, makeGhost } from "@/lib/flyAnimation";
import { prefersReducedMotion } from "@/lib/motion";
import { vibrate, HAPTIC } from "@/lib/haptics";
import type { DropTarget } from "@/lib/handTap";

/**
 * Prevlačenje karte iz ruke na sto — DRUGI način igranja, uz tap.
 *
 * Tap ostaje netaknut: `pointerdown` ništa ne pomjera, a prevlačenje počinje
 * tek kad prst pređe `DRAG_SLOP`. Ispod praga pregledač opali običan `click`
 * i sve ide kroz `onSelect` kao ranije.
 *
 * Performanse: dok karta putuje, React se NE renderuje. Pomjera se samo duh
 * (`position: fixed` na `document.body`, isti kao let karata) upisom
 * `transform`-a u `requestAnimationFrame`; mete se mjere na početku (i još
 * dva frejma, dok sto ne nacrta grupe kupljenja za podignutu kartu), a pogodak
 * se računa nad zapamćenim pravougaonicima — nema layouta po pomjeranju.
 *
 * Mete:
 *   `[data-drag-option="<optionId>"]` — konkretna grupa kupljenja (prednost);
 *   `[data-drag-target]`              — sto u cjelini.
 * Pogođena meta dobija `data-drag-hover` (stil u `felt.css`).
 *
 * Delegacija: jedan skup slušalaca na kontejneru ruke, ne na svakoj karti.
 * Karta se može vući samo ako je `data-selectable="true"` i nije onemogućena.
 */

/** Pomak (px) poslije kojeg dodir postaje prevlačenje. */
export const DRAG_SLOP = 8;
const RETURN_MS = 160;
const HOLD_SCALE = 1.08;
/** Koliko frejmova poslije početka se mete ponovo mjere (sto crta grupe). */
const REMEASURE_FRAMES = 3;

export type CardDragHandlers = {
  /** Da li se uopšte smije vući (moj potez itd.). */
  enabled: boolean;
  /** Prevlačenje je krenulo — obično: podigni kartu da sto pokaže opcije. */
  onStart?: ((cardId: string) => void) | undefined;
  /** Karta spuštena na metu. */
  onDrop: (cardId: string, target: DropTarget) => void;
  /** Karta puštena van mete ili prekinuto. */
  onCancel?: ((cardId: string) => void) | undefined;
};

type Measured = { el: HTMLElement; rect: DOMRect; target: DropTarget };

type Session = {
  pointerId: number;
  cardId: string;
  cardEl: HTMLElement;
  x0: number;
  y0: number;
  x: number;
  y: number;
  /** Centar karte na početku, minus tačka dodira. */
  offX: number;
  offY: number;
  dragging: boolean;
  ghost: HTMLElement | null;
  targets: Measured[];
  hover: Measured | null;
  frames: number;
  raf: number;
};

function measureTargets(): Measured[] {
  const out: Measured[] = [];
  document.querySelectorAll<HTMLElement>("[data-drag-option]").forEach((el) => {
    const optionId = el.dataset.dragOption;
    if (optionId) out.push({ el, rect: el.getBoundingClientRect(), target: { kind: "option", optionId } });
  });
  document.querySelectorAll<HTMLElement>("[data-drag-target]").forEach((el) => {
    out.push({ el, rect: el.getBoundingClientRect(), target: { kind: "table" } });
  });
  return out;
}

function inside(r: DOMRect, x: number, y: number) {
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

/** Grupa kupljenja ima prednost nad stolom u kojem leži. */
function hitTest(targets: Measured[], x: number, y: number): Measured | null {
  let table: Measured | null = null;
  for (const t of targets) {
    if (!inside(t.rect, x, y)) continue;
    if (t.target.kind === "option") return t;
    table ??= t;
  }
  return table;
}

function setHover(s: Session, next: Measured | null) {
  if (s.hover?.el === next?.el) return;
  s.hover?.el.removeAttribute("data-drag-hover");
  next?.el.setAttribute("data-drag-hover", "");
  s.hover = next;
}

export function useCardDrag(containerRef: RefObject<HTMLElement | null>, handlers: CardDragHandlers): void {
  // Najsvježiji handleri bez ponovnog kačenja slušalaca.
  const h = useRef(handlers);
  useEffect(() => {
    h.current = handlers;
  });
  const active = handlers.enabled;

  useEffect(() => {
    const root = containerRef.current;
    if (!root || !active) return;

    let s: Session | null = null;
    /** Pregledač poslije `pointerup` opali i `click` — poslije prevlačenja ga gutamo. */
    let swallowClickUntil = 0;

    const ghostTransform = (dx: number, dy: number, scale: number) =>
      `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${scale})`;

    const frame = () => {
      if (!s) return;
      s.raf = 0;
      if (s.frames < REMEASURE_FRAMES) {
        s.frames += 1;
        s.targets = measureTargets();
        s.raf = requestAnimationFrame(frame);
      }
      const cx = s.x + s.offX;
      const cy = s.y + s.offY;
      if (s.ghost) s.ghost.style.transform = ghostTransform(s.x - s.x0, s.y - s.y0, HOLD_SCALE);
      setHover(s, hitTest(s.targets, cx, cy));
    };

    const schedule = () => {
      if (s && !s.raf) s.raf = requestAnimationFrame(frame);
    };

    const begin = (cur: Session) => {
      cur.dragging = true;
      const r = cur.cardEl.getBoundingClientRect();
      const center = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      cur.offX = center.x - cur.x0;
      cur.offY = center.y - cur.y0;
      // Rotirana karta u lepezi: širina iz layouta, ne iz rect-a (zamka u CLAUDE.md).
      const face = cur.cardEl.querySelector<HTMLElement>(".card-face") ?? cur.cardEl;
      const ghost = makeGhost(center, face.offsetWidth, face.offsetHeight, faceArtOf(cur.cardEl));
      ghost.classList.add("card-drag-ghost");
      ghost.style.transform = ghostTransform(0, 0, HOLD_SCALE);
      cur.ghost = ghost;
      cur.cardEl.setAttribute("data-dragging", "");
      cur.targets = measureTargets();
      vibrate(HAPTIC.pick);
      h.current.onStart?.(cur.cardId);
      schedule();
    };

    const finish = (cur: Session, dropped: Measured | null) => {
      if (cur.raf) cancelAnimationFrame(cur.raf);
      setHover(cur, null);
      unlisten();
      s = null;
      if (!cur.dragging) return;
      swallowClickUntil = performance.now() + 400;
      const ghost = cur.ghost;
      const restore = () => {
        ghost?.remove();
        cur.cardEl.removeAttribute("data-dragging");
      };
      if (dropped) {
        vibrate(HAPTIC.drop);
        // Potez prvo (dok je duh još na stolu): let karte iz `play` kreće sa
        // mjesta spuštanja (`flyCardFromHand`), pa tek onda duh nestaje.
        try {
          h.current.onDrop(cur.cardId, dropped.target);
        } finally {
          restore();
        }
        return;
      }
      h.current.onCancel?.(cur.cardId);
      if (!ghost || prefersReducedMotion()) {
        restore();
        return;
      }
      // Karta se vrati u ruku tamo odakle je krenula.
      try {
        const anim = ghost.animate(
          [{ transform: ghost.style.transform }, { transform: ghostTransform(0, 0, 1) }],
          { duration: RETURN_MS, easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" },
        );
        anim.onfinish = restore;
        anim.oncancel = restore;
      } catch {
        restore();
      }
    };

    const onDown = (e: PointerEvent) => {
      if (s || !e.isPrimary || (e.pointerType === "mouse" && e.button !== 0)) return;
      const cardEl = (e.target as Element | null)?.closest<HTMLElement>(".card[data-card-id]");
      if (!cardEl || !root.contains(cardEl)) return;
      if (cardEl.dataset.selectable !== "true" || cardEl.dataset.disabled === "true") return;
      const cardId = cardEl.dataset.cardId;
      if (!cardId) return;
      s = {
        pointerId: e.pointerId,
        cardId,
        cardEl,
        x0: e.clientX,
        y0: e.clientY,
        x: e.clientX,
        y: e.clientY,
        offX: 0,
        offY: 0,
        dragging: false,
        ghost: null,
        targets: [],
        hover: null,
        frames: 0,
        raf: 0,
      };
      listen();
    };

    const onMove = (e: PointerEvent) => {
      if (!s || e.pointerId !== s.pointerId) return;
      s.x = e.clientX;
      s.y = e.clientY;
      if (!s.dragging) {
        if (Math.hypot(s.x - s.x0, s.y - s.y0) < DRAG_SLOP) return;
        begin(s);
      }
      e.preventDefault(); // bez selekcije teksta mišem
      schedule();
    };

    const onUp = (e: PointerEvent) => {
      if (!s || e.pointerId !== s.pointerId) return;
      const cur = s;
      if (!cur.dragging) {
        unlisten();
        s = null; // običan tap — `click` radi ostalo
        return;
      }
      finish(cur, hitTest(cur.targets, e.clientX + cur.offX, e.clientY + cur.offY));
    };

    const onCancelEvt = (e: PointerEvent) => {
      if (s && e.pointerId === s.pointerId) finish(s, null);
    };

    /*
     * Pomjeranje i puštanje se prate na PROZORU, ne na ruci, i bez
     * `setPointerCapture`. Android WebView poslije ~17 ms preusmjeri dodir
     * (`lostpointercapture`) na element ispod prsta, pa ruka više ne dobija
     * `pointermove` — karta se „uhvati, ali ne ide nigdje" (S10e, 18.11.2026).
     * Gubitak capture-a zato NIJE prekid; prekid je samo `pointercancel`.
     */
    let listening = false;
    function listen() {
      if (listening) return;
      listening = true;
      window.addEventListener("pointermove", onMove, { capture: true, passive: false });
      window.addEventListener("pointerup", onUp, true);
      window.addEventListener("pointercancel", onCancelEvt, true);
    }
    function unlisten() {
      if (!listening) return;
      listening = false;
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onCancelEvt, true);
    }

    const onClick = (e: MouseEvent) => {
      if (performance.now() < swallowClickUntil) {
        e.stopPropagation();
        e.preventDefault();
        swallowClickUntil = 0;
      }
    };

    root.addEventListener("pointerdown", onDown);
    root.addEventListener("click", onClick, true);
    return () => {
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("click", onClick, true);
      unlisten();
      // Potez je istekao usred prevlačenja: karta se vraća, bez poteza.
      if (s) finish(s, null);
    };
  }, [containerRef, active]);
}
