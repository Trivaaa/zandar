import type {
  Card,
  GameState,
  MoveHistoryItem,
  PlayCardRequest,
} from "@zandar/shared-types";
import { getCaptureOptions } from "./capture";
import { getCapturePileId, getNextPlayerId, sameSet } from "./helpers";

/**
 * Glavna funkcija za odigravanje poteza.
 *
 * Tok:
 * 1. Validira state i player (faza, turn order, state version)
 * 2. Validira potez (karta postoji u ruci, capture izbor je legalan)
 * 3. Mijenja state: sklanja kartu iz ruke, izvrsava capture ili trail
 * 4. Belezi potez u moveHistory
 * 5. Povecava stateVersion, resetuje consecutiveAutoPlays
 * 6. Postavlja sljedeceg igraca (jednostavna rotacija za sada)
 *
 * Baca specificnu gresku za svaki tip nelegalnog poteza.
 * Mutira state in-place. Vraca isti state objekat (radi ulancavanja).
 */
export function applyMove(
  state: GameState,
  request: PlayCardRequest,
): GameState {
  // 1. Validacija state-a
  if (state.phase !== "playing") {
    throw new Error("INVALID_GAME_PHASE");
  }
  if (state.currentPlayerId !== request.playerId) {
    throw new Error("NOT_YOUR_TURN");
  }
  if (state.stateVersion !== request.clientKnownStateVersion) {
    throw new Error("STALE_STATE");
  }

  // 2. Pronadji kartu u ruci
  const hand = state.hands[request.playerId];
  if (!hand) {
    throw new Error("PLAYER_NOT_FOUND");
  }
  const playedCard = hand.find((c) => c.id === request.cardId);
  if (!playedCard) {
    throw new Error("CARD_NOT_IN_HAND");
  }

  // 3. Izracunaj sve validne capture opcije
  const captureOptions = getCaptureOptions(playedCard, state.table);
  const selectedCaptureIds = request.selectedCaptureCardIds;

  // 4. Force capture provjera: ako ima opcija a igrac salje trail, baci gresku
  if (
    captureOptions.length > 0 &&
    selectedCaptureIds.length === 0 &&
    state.rulesConfig.forceCapture
  ) {
    throw new Error("CAPTURE_REQUIRED");
  }

  // 5. Ako igrac salje izbor, provjeri da li je legalan
  const selectedOption =
    selectedCaptureIds.length > 0
      ? captureOptions.find((opt) => sameSet(opt.cardIds, selectedCaptureIds))
      : undefined;

  if (selectedCaptureIds.length > 0 && !selectedOption) {
    throw new Error("INVALID_CAPTURE_SELECTION");
  }

  // 6. Sklanjamo kartu iz ruke
  state.hands[request.playerId] = hand.filter((c) => c.id !== playedCard.id);

  // 7. Izvrsavanje: capture ili trail
  let capturedCards: Card[] = [];
  if (selectedOption) {
    capturedCards = state.table.filter((c) =>
      selectedOption.cardIds.includes(c.id),
    );
    state.table = state.table.filter(
      (c) => !selectedOption.cardIds.includes(c.id),
    );
    const capturePileId = getCapturePileId(state, request.playerId);
    state.captured[capturePileId]!.push(playedCard, ...capturedCards);
    state.lastCapturePlayerId = request.playerId;
  } else {
    state.table.push(playedCard);
  }

  // 8. Belezimo potez u istoriju
  const historyItem: MoveHistoryItem = {
    moveId: request.clientMoveId,
    handNumber: state.handNumber,
    playerId: request.playerId,
    playedCard,
    capturedCards,
    isAutoPlay: false,
    timestamp: Date.now(),
  };
  state.moveHistory.push(historyItem);

  // 9. Reset consecutiveAutoPlays za igraca (uradio je pravu akciju)
  const player = state.players.find((p) => p.id === request.playerId);
  if (player) {
    player.consecutiveAutoPlays = 0;
  }

  // 10. Povecaj state version (za concurrency)
  state.stateVersion += 1;

  // 11. Sljedeci igrac (puna phase logika dolazi u 4.15)
  state.currentPlayerId = getNextPlayerId(state);

  return state;
}