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

/** Oblik id-ja sobe. Sve što stiže izvana (link, push, referrer) prolazi kroz ovo. */
export const ROOM_ID = /^[a-z0-9]{1,32}$/i;

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

/**
 * Id sobe iz linka koji je stigao IZVANA (App Link koji je otvorio aplikaciju,
 * adresna traka na webu). Prima oba oblika: invite `/room/:id` (i stari
 * `/zandar/room/:id`) i in-app `/room?id=`. Host se ne provjerava ovdje — koje
 * domene aplikacija uopšte prima određuje intent-filter u AndroidManifest-u.
 */
export function roomIdFromLink(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const match = /^\/(?:zandar\/)?room\/([^/]+)\/?$/.exec(parsed.pathname);
  const id = match
    ? match[1]
    : /^\/room\/?$/.test(parsed.pathname)
      ? parsed.searchParams.get("id")
      : null;
  return id && ROOM_ID.test(id) ? id : null;
}

/**
 * Korak sa imenom. `next` kaže šta `Nastavi` radi: `quickplay` sjeda za javni
 * sto, `home` samo sačuva ime i vrati se (izmjena iz postavki).
 */
export type NameNext = "quickplay" | "home";
export const namePath = (next: NameNext) => `/ime?next=${next}`;
