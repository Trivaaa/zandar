import type { Card, Rank, Suit } from "@zandar/shared-types";

/**
 * Mađarice za Raub (odluka 12, 8.11.2026) — čisto preslikavanje francuske
 * karte na sliku i natpis mađarske. Bez Reacta, da se testira u `node:test`.
 */

/** Komplet karata za crtanje: francuski (Žandar, Poker) ili mađarice (Raub). */
export type CardDeck = "french" | "hungarian";

/** Pik → list, herc → srce, karo → tikva (praporac), tref → žir. */
export const HU_SUIT: Record<Suit, "leaves" | "hearts" | "bells" | "acorns"> = {
  spades: "leaves",
  hearts: "hearts",
  diamonds: "bells",
  clubs: "acorns",
};

export const HU_SUIT_NAME: Record<Suit, string> = {
  spades: "list",
  hearts: "srce",
  diamonds: "tikva",
  clubs: "žir",
};

const HU_RANK_ASSET: Partial<Record<Rank, string>> = { J: "unter", Q: "ober", K: "king", A: "ace" };

/** Kako je rang napisan na mađarici: U (unter), O (ober), ostalo isto. */
export const huRankLabel = (rank: Rank): string => (rank === "J" ? "U" : rank === "Q" ? "O" : rank);

/** Ime slike u `public/cards/hu/`: `hearts_unter`, `leaves_7`… */
export function huAsset(card: Pick<Card, "rank" | "suit">): string {
  return `${HU_SUIT[card.suit]}_${HU_RANK_ASSET[card.rank] ?? card.rank}`;
}

export const huSuitIcon = (suit: Suit) => `/cards/hu/suit-${HU_SUIT[suit]}.webp`;
