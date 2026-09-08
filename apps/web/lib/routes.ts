/**
 * Rute — jedan izvor istine za navigaciju.
 *
 * Query oblik (`/room?id=…`) je KANONSKI za in-app navigaciju: radi i u
 * WebView-u (Capacitor / `output: export` nema path routing na disku), pa web i
 * mobilni dijele jedan kod-put. Path oblik (`/room/:id`) ostaje samo na webu za
 * invite linkove (vidi `page.web.tsx` rute) i za deep link iz native shell-a.
 */

/** Javni web origin (kartaonica.com). Prazan lokalno → fallback na origin. */
const WEB_BASE = process.env.NEXT_PUBLIC_WEB_URL || "";

export function roomPath(roomId: string): string {
  return `/room?id=${encodeURIComponent(roomId)}`;
}

export function matchingPath(roomId: string): string {
  return `/matching?id=${encodeURIComponent(roomId)}`;
}

/**
 * Invite link koji se dijeli van aplikacije. MORA biti web origin — u WebView-u
 * je `window.location.origin` `https://localhost`, što daje mrtav link.
 */
export function inviteLink(roomId: string): string {
  const base =
    WEB_BASE || (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/room/${encodeURIComponent(roomId)}`;
}
