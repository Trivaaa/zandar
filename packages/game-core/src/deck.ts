import type { Card, Rank, Suit } from "@zandar/shared-types";

/**
 * Sva 4 znaka u standardnom špilu.
 */
const ALL_SUITS: Suit[] = ["clubs", "diamonds", "hearts", "spades"];

/**
 * Svih 13 rangova u standardnom špilu, sortirani od najnižeg ka najvišem.
 */
const ALL_RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

/**
 * Generiše standardni špil od 52 karte u fiksnom, sortiranom redoslijedu.
 * Mješanje se radi posebnom funkcijom (slijedi u sljedećim koracima).
 *
 * @returns Niz od 52 jedinstvene karte.
 */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
      });
    }
  }
  return deck;
}