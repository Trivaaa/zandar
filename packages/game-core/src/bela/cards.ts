import type { Card, Rank, Suit } from "@zandar/shared-types";
import { createDeck } from "../deck";

/**
 * Bela — karte. Motor je francuski iznutra (id kao Žandar), mađarice su samo
 * prikaz (spec: herc → srce, pik → list, karo → tikva, tref → žir; J → U, Q → O).
 */

/** Prirodni red (P-5): za nizove u zvanjima. */
export const BELA_RANKS: readonly Rank[] = ["7", "8", "9", "10", "J", "Q", "K", "A"];

/** Jačina u adutu, od najslabije: VII, VIII, O, K, X, A, IX, U. */
const TRUMP_ORDER: readonly Rank[] = ["7", "8", "Q", "K", "10", "A", "9", "J"];
/** Jačina van aduta, od najslabije: VII, VIII, IX, U, O, K, X, A. */
const PLAIN_ORDER: readonly Rank[] = ["7", "8", "9", "J", "Q", "K", "10", "A"];

const TRUMP_POINTS: Partial<Record<Rank, number>> = { J: 20, "9": 14, A: 11, "10": 10, K: 4, Q: 3, "8": 0, "7": 0 };
const PLAIN_POINTS: Partial<Record<Rank, number>> = { A: 11, "10": 10, K: 4, Q: 3, J: 2, "9": 0, "8": 0, "7": 0 };

export const BELA_DECK_SIZE = 32;
export const BELA_TRICKS_PER_HAND = 8;
/** Bodovi karata u ruci bez zadnjeg štiha (152). */
export const BELA_CARD_POINTS = 152;

function assertBela(card: Pick<Card, "rank">): void {
  if (!BELA_RANKS.includes(card.rank)) throw new Error("NOT_A_BELA_CARD");
}

/** 0 (VII) … 7 (A), prirodni red. */
export function belaNaturalValue(card: Pick<Card, "rank">): number {
  assertBela(card);
  return BELA_RANKS.indexOf(card.rank);
}

/** Jačina karte u štihu (veće = jače), zavisno od toga je li adut. */
export function belaStrength(card: Card, trump: Suit | null): number {
  assertBela(card);
  return (card.suit === trump ? TRUMP_ORDER : PLAIN_ORDER).indexOf(card.rank);
}

/** Bodovi karte. */
export function belaCardPoints(card: Card, trump: Suit | null): number {
  assertBela(card);
  return (card.suit === trump ? TRUMP_POINTS : PLAIN_POINTS)[card.rank]!;
}

/** 32 karte (VII do A u četiri boje), u fiksnom redoslijedu. */
export function createBelaDeck(): Card[] {
  return createDeck().filter((c) => BELA_RANKS.includes(c.rank));
}

/** Da li `a` nosi štih ispred `b` (b je trenutno najjača). */
export function belaBeats(a: Card, b: Card, led: Suit, trump: Suit | null): boolean {
  const aTrump = a.suit === trump;
  const bTrump = b.suit === trump;
  if (aTrump !== bTrump) return aTrump;
  if (a.suit !== b.suit) return a.suit === led && b.suit !== led;
  return belaStrength(a, trump) > belaStrength(b, trump);
}

/** Indeks pobjedničke karte štiha (prva određuje traženu boju). */
export function belaTrickWinnerIndex(cards: readonly Card[], trump: Suit | null): number {
  if (cards.length === 0) throw new Error("EMPTY_TRICK");
  const led = cards[0]!.suit;
  let best = 0;
  for (let i = 1; i < cards.length; i++) {
    if (belaBeats(cards[i]!, cards[best]!, led, trump)) best = i;
  }
  return best;
}

/** Najjeftinija karta: najmanje bodova, pa ne-adut, pa najslabija. Stabilno. */
export function belaCheapestCard(cards: readonly Card[], trump: Suit | null): Card {
  if (cards.length === 0) throw new Error("NO_CARDS");
  return [...cards].sort(
    (x, y) =>
      belaCardPoints(x, trump) - belaCardPoints(y, trump) ||
      Number(x.suit === trump) - Number(y.suit === trump) ||
      belaStrength(x, trump) - belaStrength(y, trump) ||
      x.id.localeCompare(y.id),
  )[0]!;
}
