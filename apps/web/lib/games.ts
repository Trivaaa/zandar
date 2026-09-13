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

/** Glavni motiv home ekrana: žandar pik, dama herc, kralj karo. */
export const HOME_HERO_CARDS: readonly CardFace[] = [
  { rank: "J", suit: "spades" },
  { rank: "Q", suit: "hearts" },
  { rank: "K", suit: "diamonds" },
];

export const upcomingGamePath = (slug: UpcomingGameSlug) => `/igre/${slug}`;

/**
 * Straža u vrijeme kompajliranja: slug dodat u shared-types bez bloka u
 * `sr.games` ne prolazi typecheck, umjesto da stranica tiho crta `undefined`.
 */
const copyCoversEveryGame: Record<UpcomingGameSlug, { name: string }> = sr.games;
void copyCoversEveryGame;
