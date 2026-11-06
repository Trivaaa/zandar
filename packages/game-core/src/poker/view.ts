import type {
  PokerActionRequest,
  PokerGameState,
  PokerPlayerView,
} from "@zandar/shared-types";
import { getPokerLegalActions, isContender } from "./betting";
import { pokerBlindsForLevel } from "./config";

/**
 * Pogled jednog igrača (i bota — spec: „Bot dobija isti javni pogled").
 * Nikad špil; tuđe karte samo kroz `lastHandResult.showdown` (otkrivene ruke).
 * Gledalac koji ne sjedi za stolom dobija prazne `myCards` i `legal: null`.
 */
export function getPokerView(state: PokerGameState, viewerId: string): PokerPlayerView {
  const me = state.seats.find((s) => s.playerId === viewerId);
  const hpl = Math.max(1, state.handsPerLevel);
  const handNo = Math.max(1, state.handNo);
  const handsUntilNextLevel = hpl - ((handNo - 1) % hpl);
  const next = pokerBlindsForLevel(state.blindLevel + 1, state.blindLevels, state.startStack);

  return {
    game: "poker",
    roomId: state.roomId,
    matchId: state.matchId,
    phase: state.phase,
    stateVersion: state.stateVersion,
    startStack: state.startStack,
    handNo: state.handNo,
    blindLevel: state.blindLevel,
    smallBlind: state.smallBlind,
    bigBlind: state.bigBlind,
    handsUntilNextLevel,
    nextSmallBlind: next.smallBlind,
    nextBigBlind: next.bigBlind,
    buttonSeat: state.buttonSeat,
    smallBlindSeat: state.smallBlindSeat,
    bigBlindSeat: state.bigBlindSeat,
    street: state.street,
    board: state.board.map((c) => ({ ...c })),
    currentPlayerId: state.currentPlayerId,
    currentBet: state.currentBet,
    minRaise: state.minRaise,
    potTotal: state.seats.reduce((sum, s) => sum + s.totalBet, 0),
    seats: state.seats.map((s) => ({
      playerId: s.playerId,
      seatNo: s.seatNo,
      stack: s.stack,
      status: s.status,
      inHand: s.inHand,
      folded: s.folded,
      allIn: s.allIn,
      streetBet: s.streetBet,
      totalBet: s.totalBet,
      lastAction: s.lastAction ? { ...s.lastAction } : null,
      hasCards: state.phase === "betting" && isContender(s) && s.holeCards.length > 0,
      place: s.place,
    })),
    myPlayerId: viewerId,
    myCards: me ? me.holeCards.map((c) => ({ ...c })) : [],
    legal: getPokerLegalActions(state, viewerId),
    lastHandResult: state.lastHandResult ? structuredClone(state.lastHandResult) : null,
    placements: state.placements.map((p) => ({ ...p })),
  };
}

/**
 * Akcija kad igraču istekne rok ili je bez veze: najpasivnija dozvoljena —
 * check ako je moguć, inače fold (spec: „Edge caseovi").
 */
export function getPokerAutoAction(
  state: PokerGameState,
  playerId: string,
): PokerActionRequest | null {
  const legal = getPokerLegalActions(state, playerId);
  if (!legal) return null;
  return { type: legal.canCheck ? "check" : "fold" };
}
