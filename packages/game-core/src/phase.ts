import type { GameState } from "@zandar/shared-types";
import { dealCardsToPlayers } from "./deal";
import {
  getCapturePileId,
  getNextPlayerId,
  getPlayerLeftOfDealer,
} from "./helpers";
import { calculateHandScore } from "./scoring";

/**
 * Provjerava da li je neki pile dostigao target score.
 * Vraca pile ID pobjednika, ili undefined ako nema.
 */
export function getMatchWinner(state: GameState): string | undefined {
  for (const [pileId, score] of Object.entries(state.matchScore)) {
    if (score >= state.targetScore) {
      return pileId;
    }
  }
  return undefined;
}

/**
 * Zavrsava ruku:
 * 1. Preostale karte sa stola idu posljednjem capturer-u
 *    (ili dealeru ako u cijeloj ruci niko nije kupio - fallback).
 * 2. Racuna handScore za ovu rundu.
 * 3. Dodaje poene na matchScore.
 * 4. Postavlja phase na "match_finished" ako je neko dostigao target,
 *    inace "hand_finished" (cekamo "Sljedeca ruka").
 *
 * Mutira state in-place.
 */
export function finishHand(state: GameState): void {
  // 1. Dodjela preostalih karata sa stola
  if (state.table.length > 0) {
    let pileId: string;
    if (state.lastCapturePlayerId) {
      pileId = getCapturePileId(state, state.lastCapturePlayerId);
    } else {
      pileId = getCapturePileId(state, state.dealerPlayerId);
    }
    state.captured[pileId]!.push(...state.table);
    state.table = [];
  }

  // 2. Izracunaj score za ovu ruku
  const handScore = calculateHandScore(state);
  state.handScores.push(handScore);

  // 3. Dodaj poene na match score
  for (const [pileId, points] of Object.entries(handScore.pointsByPile)) {
    state.matchScore[pileId] = (state.matchScore[pileId] ?? 0) + points;
  }

  // 4. Provjeri da li je neko dostigao target
  const winner = getMatchWinner(state);
  if (winner) {
    state.phase = "match_finished";
  } else {
    state.phase = "hand_finished";
  }
}

/**
 * Nakon svakog poteza, odlucuje sta dalje:
 * 1. Neko ima karte u ruci → sljedeci igrac
 * 2. Sve prazno + spil ima karte → deal nova runda
 * 3. Sve prazno + spil prazan → zavrsi ruku (finishHand)
 */
export function advanceTurnOrPhase(state: GameState): void {
  const allHandsEmpty = state.players.every(
    (p) => (state.hands[p.id]?.length ?? 0) === 0,
  );

  if (!allHandsEmpty) {
    state.currentPlayerId = getNextPlayerId(state);
    return;
  }

  if (state.deck.length > 0) {
    dealCardsToPlayers(state);
    state.currentPlayerId = getPlayerLeftOfDealer(state);
    return;
  }

  // Sve prazno → zavrsi ruku sa scoring-om
  finishHand(state);
}