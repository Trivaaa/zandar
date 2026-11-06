import type { Card, PokerHandCategory, Rank } from "@zandar/shared-types";

/**
 * Vrijednost ranga u pokeru: 2..14, As je visok (14).
 * As kao najniža karta postoji samo u kenti A-2-3-4-5 (vidi `evaluateFive`).
 * Žandarov `getNumericValue` (A=1, slike null) se ovdje NE koristi.
 */
const RANK_VALUE: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function pokerRankValue(rank: Rank): number {
  return RANK_VALUE[rank];
}

/** Indeks kategorije = jačina (veći je jači). */
export const POKER_CATEGORIES: readonly PokerHandCategory[] = [
  "high_card",
  "pair",
  "two_pair",
  "three_of_a_kind",
  "straight",
  "flush",
  "full_house",
  "four_of_a_kind",
  "straight_flush",
  "royal_flush",
];

/**
 * Ocjena ruke: [indeks kategorije, ...odlučujuće vrijednosti].
 * Dvije ocjene se porede leksikografski (`compareHandScores`).
 */
export type HandScore = number[];

export interface EvaluatedHand {
  category: PokerHandCategory;
  score: HandScore;
  /** 5 karata koje daju kombinaciju, od najjače ka najslabijoj vrijednosti. */
  bestCards: Card[];
}

export function compareHandScores(a: HandScore, b: HandScore): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Ocjena tačno 5 karata. */
export function evaluateFive(cards: readonly Card[]): HandScore {
  if (cards.length !== 5) throw new Error("EVALUATE_NEEDS_5_CARDS");
  const vals = cards.map((c) => pokerRankValue(c.rank)).sort((a, b) => b - a);
  const firstSuit = cards[0]!.suit;
  const flush = cards.every((c) => c.suit === firstSuit);

  const uniq = [...new Set(vals)];
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0]! - uniq[4]! === 4) straightHigh = uniq[0]!;
    // Točak A-2-3-4-5: As je najniža karta, kenta do petice.
    else if (uniq[0] === 14 && uniq[1] === 5 && uniq[4] === 2) straightHigh = 5;
  }

  const counts = new Map<number, number>();
  for (const v of vals) counts.set(v, (counts.get(v) ?? 0) + 1);
  // Grupe: prvo po broju (četiri > tri > dva), pa po vrijednosti.
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const groupVals = groups.map((g) => g[0]);
  const top = groups[0]![1];
  const second = groups[1]?.[1] ?? 0;

  const idx = (c: PokerHandCategory) => POKER_CATEGORIES.indexOf(c);

  if (straightHigh && flush) {
    return straightHigh === 14 ? [idx("royal_flush"), 14] : [idx("straight_flush"), straightHigh];
  }
  if (top === 4) return [idx("four_of_a_kind"), ...groupVals];
  if (top === 3 && second === 2) return [idx("full_house"), ...groupVals];
  if (flush) return [idx("flush"), ...vals];
  if (straightHigh) return [idx("straight"), straightHigh];
  if (top === 3) return [idx("three_of_a_kind"), ...groupVals];
  if (top === 2 && second === 2) return [idx("two_pair"), ...groupVals];
  if (top === 2) return [idx("pair"), ...groupVals];
  return [idx("high_card"), ...vals];
}

function combinations<T>(items: readonly T[], k: number): T[][] {
  const out: T[][] = [];
  const pick: T[] = [];
  const rec = (start: number) => {
    if (pick.length === k) {
      out.push([...pick]);
      return;
    }
    for (let i = start; i <= items.length - (k - pick.length); i++) {
      pick.push(items[i]!);
      rec(i + 1);
      pick.pop();
    }
  };
  rec(0);
  return out;
}

/** Najbolja kombinacija od 5 iz 5–7 karata (2 u ruci + zajedničke). */
export function evaluateBestHand(cards: readonly Card[]): EvaluatedHand {
  if (cards.length < 5 || cards.length > 7) throw new Error("EVALUATE_NEEDS_5_TO_7_CARDS");
  let best: HandScore | null = null;
  let bestCards: Card[] = [];
  for (const combo of combinations(cards, 5)) {
    const score = evaluateFive(combo);
    if (best === null || compareHandScores(score, best) > 0) {
      best = score;
      bestCards = combo;
    }
  }
  const sorted = [...bestCards].sort((a, b) => pokerRankValue(b.rank) - pokerRankValue(a.rank));
  return {
    category: POKER_CATEGORIES[best![0]!]!,
    score: best!,
    bestCards: sorted,
  };
}
