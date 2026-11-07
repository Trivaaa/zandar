import type { Card, Rank, Suit } from "@zandar/shared-types";
import { createDeck } from "../deck";

/** Rangovi Rauba od najslabijeg do najjačeg (isti za adut i ostale boje). */
export const RAUB_RANKS: readonly Rank[] = ["7", "8", "9", "10", "J", "Q", "K", "A"];

const RANK_VALUE: Partial<Record<Rank, number>> = Object.fromEntries(
  RAUB_RANKS.map((r, i) => [r, i]),
);

/** 0 (sedmica) … 7 (as). Karta van špila Rauba baca grešku. */
export function raubRankValue(card: Pick<Card, "rank">): number {
  const v = RANK_VALUE[card.rank];
  if (v === undefined) throw new Error("NOT_A_RAUB_CARD");
  return v;
}

/** 32 karte (7 do A u četiri boje), u fiksnom redoslijedu; id-jevi kao Žandar. */
export function createRaubDeck(): Card[] {
  return createDeck().filter((c) => RANK_VALUE[c.rank] !== undefined);
}

export function isSeven(card: Card): boolean {
  return card.rank === "7";
}

/**
 * Pobjednička karta štiha: najjači adut, inače najjača karta tražene boje.
 * `plays` je redom bacanja; prva određuje traženu boju.
 */
export function trickWinnerIndex(cards: readonly Card[], trump: Suit | null): number {
  if (cards.length === 0) throw new Error("EMPTY_TRICK");
  const led = cards[0]!.suit;
  let best = 0;
  for (let i = 1; i < cards.length; i++) {
    if (beats(cards[i]!, cards[best]!, led, trump)) best = i;
  }
  return best;
}

/** Da li `a` nosi štih ispred `b` (b je trenutno najjača). */
export function beats(a: Card, b: Card, led: Suit, trump: Suit | null): boolean {
  const aTrump = a.suit === trump;
  const bTrump = b.suit === trump;
  if (aTrump !== bTrump) return aTrump;
  if (a.suit !== b.suit) return a.suit === led && b.suit !== led;
  return raubRankValue(a) > raubRankValue(b);
}

/** Najslabija karta: najprije ne-adut, pa najniži rang. Stabilno za isti ulaz. */
export function weakestCard(cards: readonly Card[], trump: Suit | null): Card {
  if (cards.length === 0) throw new Error("NO_CARDS");
  return [...cards].sort((x, y) => {
    const tx = x.suit === trump ? 1 : 0;
    const ty = y.suit === trump ? 1 : 0;
    if (tx !== ty) return tx - ty;
    return raubRankValue(x) - raubRankValue(y) || x.id.localeCompare(y.id);
  })[0]!;
}
