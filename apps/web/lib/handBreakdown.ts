import type { HandScore } from "@zandar/shared-types";
import { sr } from "@/lib/sr";

export type BreakdownRow = {
  key: "mostCards" | "mostClubs" | "tenOfDiamonds" | "twoOfClubs";
  label: string;
  /** `undefined` = nerijeseno (dvije ili vise jednakih), dakle poen ne ide nikome. */
  winnerPileId?: string | undefined;
  /** Nominala kategorije. Dodjeljuje se SAMO ako `winnerPileId` postoji. */
  points: number;
  /** Broj po pilu — samo dvije "najvise" kategorije ga imaju. */
  countByPile?: Record<string, number> | undefined;
};

/**
 * Redovi razrade jedne ruke — jedini izvor za obje povrsine koje je crtaju
 * (`RoundEndOverlay` na kraju ruke, `ScorePill` u meniju). Isti razlog zbog
 * kojeg `pilesOf` zivi u `lib/piles.ts`: dvije kopije se raziđu pri prvoj
 * sljedecoj izmjeni, a onda se pri svakom bug-u prvo mora utvrditi koja je ziva.
 *
 * Redoslijed je po vrijednosti kategorije (2 poena pa tri po 1), a velika ide
 * prije male jer se tako i govori. Nikakva pravila se ovdje ne odlucuju —
 * `calculateHandScore` je vec sve izracunao, ovo je samo prikaz.
 */
export function breakdownRows(hand: HandScore): BreakdownRow[] {
  const b = hand.breakdown;
  const rows: BreakdownRow[] = [];

  if (b.mostCards) {
    rows.push({
      key: "mostCards",
      label: sr.score.mostCards,
      winnerPileId: b.mostCards.winnerPileId,
      points: b.mostCards.points,
      countByPile: b.mostCards.cardCountByPile,
    });
  }
  if (b.mostClubs) {
    rows.push({
      key: "mostClubs",
      label: sr.score.mostClubs,
      winnerPileId: b.mostClubs.winnerPileId,
      points: b.mostClubs.points,
      countByPile: b.mostClubs.clubCountByPile,
    });
  }
  if (b.tenOfDiamonds) {
    rows.push({
      key: "tenOfDiamonds",
      label: sr.score.tenOfDiamonds,
      winnerPileId: b.tenOfDiamonds.winnerPileId,
      points: b.tenOfDiamonds.points,
    });
  }
  if (b.twoOfClubs) {
    rows.push({
      key: "twoOfClubs",
      label: sr.score.twoOfClubs,
      winnerPileId: b.twoOfClubs.winnerPileId,
      points: b.twoOfClubs.points,
    });
  }

  return rows;
}
