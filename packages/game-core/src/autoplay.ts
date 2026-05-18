import type {
  Card,
  CaptureOption,
  GameState,
  PlayCardRequest,
} from "@zandar/shared-types";
import { getCaptureOptions } from "./capture";
import { getNumericValue } from "./helpers";
import { applyMove } from "./move";

/**
 * Vraca prioritet karte za auto-play (niza vrijednost = igraj prvo).
 *
 * Heuristika: cuvamo "skupe" karte (J, 2♣, 10♦) za kasnije, a igramo
 * niske numericke prve.
 */
function getCardPriority(card: Card): number {
  if (card.id === "clubs-2") return 100; // 2♣ daje bonus poen, cuvaj
  if (card.id === "diamonds-10") return 100; // 10♦ daje bonus poen, cuvaj
  if (card.rank === "J") return 80; // J kupi sve, cuvaj
  const value = getNumericValue(card);
  if (value !== null) return value; // 1-10
  return 50; // Q, K (face karte bez specijalne vrijednosti)
}

/**
 * Daje "vrijednost" jedne capture opcije:
 * - vise pokupljenih karata = bolje
 * - pokupljen 2♣ ili 10♦ = jos bolje
 */
function getCaptureValue(option: CaptureOption): number {
  let value = option.cardIds.length * 2;
  if (option.cardIds.includes("clubs-2")) value += 10;
  if (option.cardIds.includes("diamonds-10")) value += 10;
  return value;
}

/**
 * Bira "najsigurniji" potez za AFK igraca.
 *
 * Strategija:
 * 1. Ako postoji bilo koja capture opcija → izvrsi je (preferiraj cheap karte i high-value capture)
 * 2. Inace → trail sa najjeftinijom kartom (cuvamo specijalne za kasnije)
 */
export function findAutoPlayMove(
  state: GameState,
  playerId: string,
): { cardId: string; selectedCaptureCardIds: string[] } {
  const hand = state.hands[playerId];
  if (!hand || hand.length === 0) {
    throw new Error("PLAYER_HAS_NO_CARDS");
  }

  // Skupi sve (karta + option) parove
  type Candidate = {
    cardId: string;
    option: CaptureOption;
    cardPriority: number;
    captureValue: number;
  };

  const candidates: Candidate[] = [];

  for (const card of hand) {
    const options = getCaptureOptions(card, state.table);
    for (const option of options) {
      candidates.push({
        cardId: card.id,
        option,
        cardPriority: getCardPriority(card),
        captureValue: getCaptureValue(option),
      });
    }
  }

  if (candidates.length > 0) {
    // Sortiraj: prvo niza priority (cheap karta), pa veci captureValue (vise/bolje karte)
    candidates.sort((a, b) => {
      if (a.cardPriority !== b.cardPriority) {
        return a.cardPriority - b.cardPriority;
      }
      return b.captureValue - a.captureValue;
    });

    const best = candidates[0]!;
    return {
      cardId: best.cardId,
      selectedCaptureCardIds: best.option.cardIds,
    };
  }

  // Nema capture - trail sa najjeftinijom kartom
  const sortedHand = [...hand].sort(
    (a, b) => getCardPriority(a) - getCardPriority(b),
  );
  return {
    cardId: sortedHand[0]!.id,
    selectedCaptureCardIds: [],
  };
}

/**
 * Izvrsava auto-play za trenutnog igraca:
 * 1. Pronadji najsigurniji potez
 * 2. Primjeni ga (sa isAutoPlay: true)
 * 3. Inkrementiraj consecutiveAutoPlays counter za tog igraca
 *
 * Mutira state in-place.
 */
export function autoPlay(state: GameState): GameState {
  const playerId = state.currentPlayerId;
  const { cardId, selectedCaptureCardIds } = findAutoPlayMove(state, playerId);

  const request: PlayCardRequest = {
    roomId: state.roomId,
    playerId,
    cardId,
    selectedCaptureCardIds,
    clientMoveId: `auto-${state.stateVersion}-${playerId}`,
    clientKnownStateVersion: state.stateVersion,
  };

  applyMove(state, request, { isAutoPlay: true });

  // Inkrementiraj counter (applyMove ga ne resetuje kad je isAutoPlay)
  const player = state.players.find((p) => p.id === playerId);
  if (player) {
    player.consecutiveAutoPlays += 1;
  }

  return state;
}