import type { Card, CaptureOption } from "@zandar/shared-types";
import { getNumericValue } from "./helpers";

/**
 * Pronalazi sve kombinacije karata cije vrijednosti su = target.
 *
 * Koristi backtracking algoritam:
 * - Probava da li svaka karta moze biti dio kombinacije
 * - Ako zbir predje target, odmah odustaje (optimizacija)
 * - Vraca kombinacije od BAR 2 karte (jednokartne su rank match, ne sum)
 */
function findCombinationsThatSumTo(cards: Card[], target: number): Card[][] {
  const results: Card[][] = [];

  function backtrack(startIndex: number, current: Card[], sum: number): void {
    if (sum === target) {
      results.push([...current]);
      return;
    }
    if (sum > target) return; // odustani, zbir je prevelik

    for (let i = startIndex; i < cards.length; i++) {
      const card = cards[i]!;
      const value = getNumericValue(card);
      if (value === null) continue; // face karte se preskacu

      current.push(card);
      backtrack(i + 1, current, sum + value);
      current.pop(); // backtrack: ukloni i probaj sljedecu opciju
    }
  }

  backtrack(0, [], 0);
  return results.filter((combo) => combo.length >= 2);
}

/**
 * Vraca sve validne capture opcije za odigranu kartu.
 *
 * Pravila:
 * - J: ako stol nije prazan, kupi SVE karte odjednom. Ako je prazan, trail.
 * - Rank match: za svaku kartu na stolu istog ranka, posebna opcija.
 * - Sum match: za svaku kombinaciju numerickih karata cije zbir = vrijednost
 *              odigrane karte (samo za numericke karte: A=1, 2-10).
 */
export function getCaptureOptions(
  playedCard: Card,
  table: Card[],
): CaptureOption[] {
  // J specijalno
  if (playedCard.rank === "J") {
    if (table.length === 0) return [];
    return [
      {
        optionId: "jack-clear",
        cardIds: table.map((c) => c.id),
        reason: "jack_clear",
      },
    ];
  }

  const options: CaptureOption[] = [];

  // Rank match
  const rankMatches = table.filter((c) => c.rank === playedCard.rank);
  for (const match of rankMatches) {
    options.push({
      optionId: `rank-${match.id}`,
      cardIds: [match.id],
      reason: "rank_match",
    });
  }

  // Sum match (samo za numericke karte)
  const playedValue = getNumericValue(playedCard);
  if (playedValue !== null) {
    const numericTableCards = table.filter((c) => getNumericValue(c) !== null);
    const combinations = findCombinationsThatSumTo(
      numericTableCards,
      playedValue,
    );
    for (const combo of combinations) {
      options.push({
        optionId: `sum-${combo.map((c) => c.id).join("-")}`,
        cardIds: combo.map((c) => c.id),
        reason: "sum_match",
      });
    }
  }

  return options;
}