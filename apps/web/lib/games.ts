import {
  isUpcomingGameSlug,
  type Card,
  type Suit,
  type UpcomingGameSlug,
} from "@zandar/shared-types";

import { sr } from "@/lib/sr";

/**
 * Igre „U planu?" — podaci, ne tekst.
 *
 * Spisak slugova živi u `@zandar/shared-types` jer ga čita i server (validacija
 * prijave), pa web i server ne mogu da se raziđu. Ovdje je samo vizuelni opis;
 * sav tekst je u `sr.games`. Dodavanje igre = slug u shared-types + red ovdje +
 * blok u `sr.games` — bez nove stranice i nove komponente.
 *
 * Samo poker ima stvarnu reprezentaciju u našem špilu (asovi); za ostale se
 * namjerno NE izmišljaju kombinacije — crta se prigušena poleđina sa znakom.
 */
export type CardFace = Pick<Card, "rank" | "suit">;

export type UpcomingGame = {
  slug: UpcomingGameSlug;
  /** Znak na prigušenoj poleđini teaser kartice. */
  suit: Suit;
  /** Lica karata za motiv na teaser stranici; `null` → poleđine. */
  heroCards: readonly CardFace[] | null;
};

export const UPCOMING_GAMES: readonly UpcomingGame[] = [
  {
    slug: "poker",
    suit: "spades",
    heroCards: [
      { rank: "A", suit: "spades" },
      { rank: "A", suit: "hearts" },
      { rank: "A", suit: "diamonds" },
    ],
  },
  { slug: "remi", suit: "clubs", heroCards: null },
  { slug: "bela", suit: "hearts", heroCards: null },
  { slug: "raub", suit: "diamonds", heroCards: null },
];

export function findUpcomingGame(slug: string): UpcomingGame | null {
  if (!isUpcomingGameSlug(slug)) return null;
  return UPCOMING_GAMES.find((g) => g.slug === slug) ?? null;
}

/** Glavni motiv Žandara: žandar pik, dama herc, kralj karo. */
export const HOME_HERO_CARDS: readonly CardFace[] = [
  { rank: "J", suit: "spades" },
  { rank: "Q", suit: "hearts" },
  { rank: "K", suit: "diamonds" },
];

// ====================================================
// Igre na početnoj (SPEC_POCETNA §8) — konfiguracija, ne kod.
// Dodavanje igre = red ovdje + blok u `sr.games`; raspored početne (H1/H2/H3)
// zavisi SAMO od ove liste. „live" se igra, „upcoming" stoji u redu „Uskoro".
// ====================================================

export type GameSlug = "zandar" | UpcomingGameSlug;

export type GameConfig = {
  slug: GameSlug;
  /** Slovo na maloj karti u redu igre (Ž, P, R). */
  letter: string;
  suit: Suit;
  /** Okvirno trajanje partije u minutima („~10 min"). */
  minutes: number;
  status: "live" | "upcoming";
  /** Dan objave (ISO). NOVO stoji 7 dana od njega; `null` dok igra nije objavljena. */
  releasedAt: string | null;
  /** Motiv velike kartice; `null` → velika karta sa slovom. */
  heroCards: readonly CardFace[] | null;
  /** Ima li igra list pravila (`RulesModal`). */
  hasRules: boolean;
};

export const GAMES: readonly GameConfig[] = [
  {
    slug: "zandar",
    letter: "Ž",
    suit: "diamonds",
    minutes: 10,
    status: "live",
    releasedAt: "2026-05-01",
    heroCards: HOME_HERO_CARDS,
    hasRules: true,
  },
  {
    slug: "poker",
    letter: "P",
    suit: "spades",
    minutes: 15,
    status: "upcoming",
    releasedAt: null,
    heroCards: [
      { rank: "10", suit: "spades" },
      { rank: "J", suit: "spades" },
      { rank: "Q", suit: "spades" },
      { rank: "K", suit: "spades" },
      { rank: "A", suit: "spades" },
    ],
    hasRules: false,
  },
  {
    slug: "raub",
    letter: "R",
    suit: "clubs",
    minutes: 12,
    status: "upcoming",
    releasedAt: null,
    heroCards: null,
    hasRules: false,
  },
];

/** Šta početna zna o igraču — sve lokalno (`lib/homePrefs.ts`). */
export type HomeHistory = {
  /** Zakačena igra (samo jedna). */
  pinned: GameSlug | null;
  /** Kad je koja igra zadnji put pokrenuta (ms). */
  played: Partial<Record<GameSlug, number>>;
};

export type HomeLayout = {
  main: GameConfig;
  more: GameConfig[];
  upcoming: GameConfig[];
};

const NEW_FOR_MS = 7 * 24 * 60 * 60 * 1000;

/** NOVO: 7 dana od objave, ili dok je igrač prvi put ne pokrene. */
export function isNewGame(game: GameConfig, history: HomeHistory, now: number): boolean {
  if (game.status !== "live" || !game.releasedAt || history.played[game.slug] !== undefined) return false;
  const released = Date.parse(game.releasedAt);
  return Number.isFinite(released) && now >= released && now - released < NEW_FOR_MS;
}

/**
 * Raspored početne (SPEC_POCETNA §3, §5.1). Čista funkcija.
 * - Glavna: zakačena → zadnja igrana → Žandar → prva živa.
 * - „Još igara": ostale žive — po zadnjoj igri (novije prvo), pa neigrane
 *   redom iz konfiguracije. Zakačena je uvijek glavna, pa ovdje ne stoji.
 * - „Uskoro": sve najavljene, redom iz konfiguracije.
 * Zakačena ili igrana igra koja više nije živa se ignoriše.
 */
export function homeLayout(games: readonly GameConfig[], history: HomeHistory): HomeLayout {
  const live = games.filter((g) => g.status === "live");
  const upcoming = games.filter((g) => g.status === "upcoming");
  if (live.length === 0) throw new Error("Nema nijedne igre koja se igra");

  const playedAt = (g: GameConfig) => history.played[g.slug];
  const lastPlayed = live
    .filter((g) => playedAt(g) !== undefined)
    .sort((a, b) => (playedAt(b) ?? 0) - (playedAt(a) ?? 0))[0];

  const main =
    live.find((g) => g.slug === history.pinned) ??
    lastPlayed ??
    live.find((g) => g.slug === "zandar") ??
    live[0]!;

  const rest = live.filter((g) => g !== main);
  const more = [
    ...rest.filter((g) => playedAt(g) !== undefined).sort((a, b) => (playedAt(b) ?? 0) - (playedAt(a) ?? 0)),
    ...rest.filter((g) => playedAt(g) === undefined),
  ];
  return { main, more, upcoming };
}

export const upcomingGamePath = (slug: UpcomingGameSlug) => `/igre/${slug}`;

/**
 * Straža u vrijeme kompajliranja: igra (ili slug iz shared-types) bez bloka u
 * `sr.games` ne prolazi typecheck, umjesto da ekran tiho crta `undefined`.
 */
const copyCoversEveryGame: Record<GameSlug, { name: string; players: string }> = sr.games;
void copyCoversEveryGame;
