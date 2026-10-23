import { useMemo, useSyncExternalStore } from "react";

import { GAMES, type GameSlug, type HomeHistory } from "@/lib/games";

/**
 * Šta početna pamti o igraču (SPEC_POCETNA §3, §5): zakačenu igru i kad je
 * koja igra zadnji put pokrenuta. Sve lokalno, kao ime i izbor stola.
 *
 * Jedan ključ, JSON. localStorage ume da BACI (WebView bez site data) —
 * otud try/catch, isti obrazac kao `playerName.ts`.
 */
const KEY = "kartaonica:home";

const EMPTY: HomeHistory = { pinned: null, played: {} };

const isSlug = (v: unknown): v is GameSlug => GAMES.some((g) => g.slug === v);

/** Sirov zapis → istorija. Sve nepoznato (pokvaren JSON, igra koje više nema) se odbacuje. */
export function parseHomeHistory(raw: string | null | undefined): HomeHistory {
  if (!raw) return EMPTY;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (typeof data !== "object" || data === null) return EMPTY;
  const { pinned, played } = data as Record<string, unknown>;
  const out: HomeHistory = { pinned: isSlug(pinned) ? pinned : null, played: {} };
  if (typeof played === "object" && played !== null) {
    for (const [slug, at] of Object.entries(played)) {
      if (isSlug(slug) && typeof at === "number" && Number.isFinite(at)) out.played[slug] = at;
    }
  }
  return out;
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const listeners = new Set<() => void>();

function write(next: HomeHistory): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // bez pamćenja — početna sljedeći put kreće od podrazumijevanog
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Istorija kao React stanje (server snapshot → prazno, bez hydration mismatch-a). */
export function useHomeHistory(): HomeHistory {
  const raw = useSyncExternalStore(subscribe, readRaw, () => null);
  return useMemo(() => parseHomeHistory(raw), [raw]);
}

/** Samo jedna zakačena igra: novo kačenje zamjenjuje staro, `null` otkačinje. */
export function setPinnedGame(slug: GameSlug | null): void {
  write({ ...parseHomeHistory(readRaw()), pinned: slug });
}

/** Igra je pokrenuta — postaje „zadnja igrana" i gubi oznaku NOVO. */
export function markGamePlayed(slug: GameSlug, at: number = Date.now()): void {
  const current = parseHomeHistory(readRaw());
  write({ ...current, played: { ...current.played, [slug]: at } });
}
