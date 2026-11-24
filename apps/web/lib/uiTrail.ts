/**
 * Kratak trag zadnjih dodira i poteza na stolu (spec C1, prijava
 * 20261124-091237): ide uz prijavu greške, da se vidi šta je igrač radio i
 * šta je server odbio. Samo u memoriji, nikad na disk ni u analitiku; nestaje
 * sa stranicom. Nosi ID-jeve SVOJIH karata i kodove grešaka — ništa tuđe.
 */

export type UiTrailEvent = {
  /** Vrijeme (ms od epohe). */
  t: number;
  /** Šta se desilo: `tap`, `tap-blocked`, `drop`, `send`, `ok`, `error`, `declare`, `report`. */
  e: string;
  /** Kratka pojedinost: ID karte, kod greške, razlog. */
  d?: string;
};

export const UI_TRAIL_MAX = 20;
const DETAIL_MAX = 48;

let buffer: UiTrailEvent[] = [];

export function uiTrail(e: string, d?: string, now: number = Date.now()): void {
  buffer.push({ t: now, e, ...(d ? { d: d.slice(0, DETAIL_MAX) } : {}) });
  if (buffer.length > UI_TRAIL_MAX) buffer = buffer.slice(-UI_TRAIL_MAX);
}

/** Kopija traga, najstariji prvi; `ago` = koliko ms prije `now`. */
export function uiTrailSnapshot(now: number = Date.now()): Array<{ ago: number; e: string; d?: string }> {
  return buffer.map((x) => ({ ago: now - x.t, e: x.e, ...(x.d ? { d: x.d } : {}) }));
}

/** Zadnja greška sa servera u tragu (za sažetak u mejlu). */
export function uiTrailLastError(): string | null {
  for (let i = buffer.length - 1; i >= 0; i--) if (buffer[i]!.e === "error") return buffer[i]!.d ?? "?";
  return null;
}

/** Samo za testove. */
export function resetUiTrail(): void {
  buffer = [];
}

/**
 * Prozor i `safe-area` uvlake u CSS pikselima (za greške rasporeda, spec C1).
 * `env()` se ne čita iz JS-a direktno — mjeri se na skrivenom elementu.
 */
export function viewportInfo(): { w: number; h: number; dpr: number; inset: { top: number; right: number; bottom: number; left: number } } | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;visibility:hidden;pointer-events:none;" +
    "padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
  document.body.appendChild(probe);
  const cs = getComputedStyle(probe);
  const px = (v: string) => Math.round(parseFloat(v) || 0);
  const inset = { top: px(cs.paddingTop), right: px(cs.paddingRight), bottom: px(cs.paddingBottom), left: px(cs.paddingLeft) };
  probe.remove();
  return { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio, inset };
}
