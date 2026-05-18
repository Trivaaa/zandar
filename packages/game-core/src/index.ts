// Žandar game-core public API

export { createDeck } from "./deck";
export { shuffle } from "./shuffle";
export { getCaptureOptions } from "./capture";
export { defaultRulesConfig, createRulesConfig } from "./rules";
export { createInitialGameState, dealCardsToPlayers } from "./deal";
export type { CreateInitialGameStateParams } from "./deal";
export { applyMove } from "./move";
export type { ApplyMoveOptions } from "./move";
export { advanceTurnOrPhase, finishHand, getMatchWinner } from "./phase";
export { calculateHandScore } from "./scoring";
export { autoPlay, findAutoPlayMove } from "./autoplay";

export const VERSION = "0.0.1";