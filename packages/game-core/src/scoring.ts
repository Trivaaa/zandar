import type { Card, GameState, HandScore } from "@zandar/shared-types";

/**
 * Vraca pile ID sa najvecim brojem, ili undefined ako postoji tie.
 * Tie = vise od jednog pile-a sa istom max vrijednosti.
 */
function getSingleWinner(
  counts: Record<string, number>,
): string | undefined {
  let maxCount = -1;
  let winners: string[] = [];

  for (const [pileId, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      winners = [pileId];
    } else if (count === maxCount) {
      winners.push(pileId);
    }
  }

  return winners.length === 1 ? winners[0] : undefined;
}

/**
 * Trazi pile koji sadrzi datu kartu (po ID-u).
 * Vraca pile ID, ili undefined ako karta nije pokupljena.
 */
function findOwnerOfCard(
  state: GameState,
  cardId: string,
): string | undefined {
  for (const pileId of Object.keys(state.captured)) {
    const pile = state.captured[pileId];
    if (pile?.some((c) => c.id === cardId)) {
      return pileId;
    }
  }
  return undefined;
}

/**
 * Izracunava bodove za ruku.
 *
 * 5 poena ukupno (max):
 * - 2 poena za najvise karata (tie = niko)
 * - 1 poen za najvise trefova (tie = niko)
 * - 1 poen za 2 tref (ko ga je pokupio)
 * - 1 poen za 10 karo (ko ga je pokupio)
 *
 * U 4P timskom modu, pile-ovi su "team-0" i "team-1".
 * Karte oba partnera se vec zbrajaju u team pile (vidi getCapturePileId).
 */
export function calculateHandScore(state: GameState): HandScore {
  const pileIds = Object.keys(state.captured);

  // Inicijalizuj pointsByPile na 0 za svaki pile
  const pointsByPile: Record<string, number> = {};
  for (const pileId of pileIds) {
    pointsByPile[pileId] = 0;
  }

  // Broji karte po pile-u
  const cardCountByPile: Record<string, number> = {};
  for (const pileId of pileIds) {
    cardCountByPile[pileId] = state.captured[pileId]?.length ?? 0;
  }

  // Broji trefove po pile-u
  const clubCountByPile: Record<string, number> = {};
  for (const pileId of pileIds) {
    clubCountByPile[pileId] =
      state.captured[pileId]?.filter((c) => c.suit === "clubs").length ?? 0;
  }

  // 1. Najvise karata: 2 poena (ne ako je tie)
  const mostCardsWinner = getSingleWinner(cardCountByPile);
  if (mostCardsWinner) {
    pointsByPile[mostCardsWinner]! += 2;
  }

  // 2. Najvise trefova: 1 poen (ne ako je tie)
  const mostClubsWinner = getSingleWinner(clubCountByPile);
  if (mostClubsWinner) {
    pointsByPile[mostClubsWinner]! += 1;
  }

  // 3. 2 tref: 1 poen
  const twoClubsOwner = findOwnerOfCard(state, "clubs-2");
  if (twoClubsOwner) {
    pointsByPile[twoClubsOwner]! += 1;
  }

  // 4. 10 karo: 1 poen
  const tenDiamondsOwner = findOwnerOfCard(state, "diamonds-10");
  if (tenDiamondsOwner) {
    pointsByPile[tenDiamondsOwner]! += 1;
  }

  return {
    handNumber: state.handNumber,
    pointsByPile,
    breakdown: {
      mostCards: {
        winnerPileId: mostCardsWinner,
        cardCountByPile,
        points: 2,
      },
      mostClubs: {
        winnerPileId: mostClubsWinner,
        clubCountByPile,
        points: 1,
      },
      twoOfClubs: {
        winnerPileId: twoClubsOwner,
        points: 1,
      },
      tenOfDiamonds: {
        winnerPileId: tenDiamondsOwner,
        points: 1,
      },
    },
  };
}