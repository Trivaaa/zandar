import type {
  GameState,
  PrivateGameStateView,
} from "@zandar/shared-types";

/**
 * Pravi private view stanja igre za određenog igrača.
 * Skriva ruke ostalih igrača i špil — vraća samo brojeve.
 */
export function buildPrivateGameStateView(
  state: GameState,
  viewerPlayerId: string,
): PrivateGameStateView {
  const handCounts: Record<string, number> = {};
  for (const player of state.players) {
    handCounts[player.id] = state.hands[player.id]?.length ?? 0;
  }

  const capturedCounts: Record<string, number> = {};
  for (const pileId of Object.keys(state.captured)) {
    capturedCounts[pileId] = state.captured[pileId]?.length ?? 0;
  }

  return {
    roomId: state.roomId,
    matchId: state.matchId,
    phase: state.phase,
    players: state.players,
    table: state.table,
    currentPlayerId: state.currentPlayerId,
    dealerPlayerId: state.dealerPlayerId,
    deckCount: state.deck.length,
    handCounts,
    capturedCounts,
    matchScore: state.matchScore,
    targetScore: state.targetScore,
    stateVersion: state.stateVersion,
    handNumber: state.handNumber,
    myPlayerId: viewerPlayerId,
    myHand: state.hands[viewerPlayerId] ?? [],
  };
}