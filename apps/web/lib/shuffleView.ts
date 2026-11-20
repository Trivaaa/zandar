/**
 * Ekran prije partije — „Miješamo špil" (tabla `UI_MijesanjeSpila`).
 *
 * Čiste odluke ekrana; komponenta (`components/funnel/ShuffleScreen.tsx`) samo
 * crta. Ništa ovdje ne mjeri vrijeme: ekran traje tačno koliko i stvarno
 * čekanje stanja partije, plus izlaz S2.
 */
import type { GameId } from "@zandar/shared-types";

import { pluralForm } from "@/lib/plural";

/** S2 „sto je pun": karte u gomilu + kucanje o sto. Tabla: najviše 0,65 s. */
export const SHUFFLE_COLLECT_MS = 250;
export const SHUFFLE_KNOCK_MS = 400;
export const SHUFFLE_EXIT_MS = SHUFFLE_COLLECT_MS + SHUFFLE_KNOCK_MS;

/** Broj tonova za krug sa inicijalom (`data-tone` u `funnel.css`). */
export const INITIAL_TONES = 5;

/**
 * Ton kruga sa inicijalom: uvijek isti za isto ime (tabla). FNV-1a nad
 * normalizovanim imenom — veličina slova i razmaci ne mijenjaju boju.
 */
export function initialTone(name: string): number {
  const key = name.trim().toLocaleLowerCase("sr-Latn");
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % INITIAL_TONES;
}

export function initialOf(name: string): string {
  const first = Array.from(name.trim())[0] ?? "?";
  return first.toLocaleUpperCase("sr-Latn");
}

export type ShufflePlace = "bottom" | "top" | "left" | "right";

/**
 * Mjesto po relativnom (clockwise) offsetu od mene — ISTO kao za stolom
 * (`lib/seating.ts`), da igrač ne preskoči na drugu stranu kad sto stigne.
 */
const PLACE_BY_REL: Record<number, ShufflePlace[]> = {
  2: ["bottom", "top"],
  3: ["bottom", "right", "left"],
  4: ["bottom", "right", "top", "left"],
};

export type ShuffleSeatPlayer = {
  id: string;
  displayName: string;
  seatIndex: number;
  avatar?: string | null | undefined;
};

export type ShuffleSeat<P extends ShuffleSeatPlayer = ShuffleSeatPlayer> = {
  place: ShufflePlace;
  player: P | null;
  me: boolean;
};

/**
 * Mjesta za stolom, redom crtanja: ja dolje, pa ostali po offsetu sjedišta.
 * Prazna mjesta ostaju „slobodno". Dok mene nema u rosteru (još nije stigao),
 * offset se računa od sjedišta 0.
 */
export function shuffleSeats<P extends ShuffleSeatPlayer>(
  players: readonly P[],
  myId: string | null,
  playerCount: number,
): ShuffleSeat<P>[] {
  const count = Math.min(4, Math.max(2, Math.max(playerCount, players.length)));
  const places = PLACE_BY_REL[count]!;
  const me = players.find((p) => p.id === myId) ?? null;
  const mySeat = me?.seatIndex ?? 0;
  const byRel = new Map<number, P>();
  const stray: P[] = [];
  for (const p of players) {
    if (p === me) continue;
    const rel = (((p.seatIndex - mySeat) % count) + count) % count;
    if (rel === 0 || byRel.has(rel)) stray.push(p);
    else byRel.set(rel, p);
  }
  return places.map((place, rel) => {
    const player = rel === 0 ? me : (byRel.get(rel) ?? stray.shift() ?? null);
    return { place, player, me: rel === 0 && me !== null };
  });
}

const GAME_NAME: Record<GameId, string> = { zandar: "Žandar", poker: "Poker", raub: "Raub" };

/** Red iznad naslova: igra, broj igrača, cilj (samo Žandar ima cilj u bodovima). */
export function shuffleKicker(room: { game?: GameId | undefined; playerCount: number; targetScore: number }): string {
  const game = room.game ?? "zandar";
  const n = room.playerCount;
  const players = `${n} ${pluralForm(n, "igrač", "igrača", "igrača")}`;
  const parts = [GAME_NAME[game], players];
  if (game === "zandar") parts.push(`do ${room.targetScore}`);
  return parts.join(" · ");
}

/**
 * Stanje uvoda u sto. `shuffle` dok stanje partije ne stigne, `exit` je S2,
 * `done` je sto. Bez uvoda (povratak u partiju koja traje, privatni lobi) ide
 * se pravo na `done` — „Počinjemo!" usred partije bi lagao.
 */
export type IntroPhase = "shuffle" | "exit" | "done";

export function introOnState(phase: IntroPhase): IntroPhase {
  return phase === "shuffle" ? "exit" : phase;
}

/**
 * Oznaka „idemo za novi sto" — postavlja je put koji igrača šalje za javni sto
 * (Igraj, Novi sto), čita je ekran sobe. Samo tada ima smisla miješati špil.
 */
const INTRO_KEY = "zandar:intro";

type SessionLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function storage(): SessionLike | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function markIntro(roomId: string, store: SessionLike | null = storage()): void {
  try {
    store?.setItem(INTRO_KEY, roomId);
  } catch {
    /* privatni prozor — bez uvoda, sto se otvori kao i ranije */
  }
}

/** Samo čita (StrictMode zove inicijalizator dvaput); briše `clearIntro` kad sto stigne. */
export function hasIntro(roomId: string, store: SessionLike | null = storage()): boolean {
  try {
    return store?.getItem(INTRO_KEY) === roomId;
  } catch {
    return false;
  }
}

/** Sto je stigao: reload iste sobe više nije ulazak za novi sto. */
export function clearIntro(store: SessionLike | null = storage()): void {
  try {
    store?.removeItem(INTRO_KEY);
  } catch {
    /* ništa */
  }
}

/**
 * Sjedanje jedan po jedan (odluka vlasnika 20.11.2026): ja sam za stolom
 * odmah, ostali sjedaju nasumičnim razmacima — sjedanje traje ~3 s. Server
 * Žandar sto popuni odjednom, pa je ovaj tempo namjeran, ne mjeren.
 */
export const ARRIVAL_GAP_MIN_MS = 800;
export const ARRIVAL_GAP_MAX_MS = 1200;
/** Dvojica nikad ne sjednu istovremeno (poker botovi stižu zajedno). */
export const ARRIVAL_MIN_SPACING_MS = 300;

/** Kumulativni trenuci (od pojave ekrana) za `n` dolazaka. `rng` ∈ [0, 1). */
export function arrivalSlots(n: number, rng: () => number): number[] {
  const slots: number[] = [];
  let at = 0;
  for (let i = 0; i < n; i++) {
    at += ARRIVAL_GAP_MIN_MS + Math.round(rng() * (ARRIVAL_GAP_MAX_MS - ARRIVAL_GAP_MIN_MS));
    slots.push(at);
  }
  return slots;
}

/**
 * Kad igrač sjeda: ne prije svog termina, ne prije nego ga server javi, i ne
 * bliže od `ARRIVAL_MIN_SPACING_MS` prethodnom. Sva vremena od pojave ekrana.
 */
export function revealAt(slot: number, knownAt: number, prevRevealAt: number | null): number {
  const spaced = prevRevealAt === null ? 0 : prevRevealAt + ARRIVAL_MIN_SPACING_MS;
  return Math.max(slot, knownAt, spaced);
}
