// Raub — čist motor. Spec: docs/raub-spec.md

export {
  RAUB_RANKS,
  raubRankValue,
  createRaubDeck,
  trickWinnerIndex as raubTrickWinnerIndex,
  beats as raubBeats,
  weakestCard as raubWeakestCard,
} from "./cards";
export { DEFAULT_RAUB_RULES, RAUB_RECONNECT_GRACE_SECONDS, createRaubRules } from "./config";
export {
  RAUB_DECK_SIZE,
  RAUB_TRICKS_PER_HAND,
  createRaubMatch,
  startRaubHand,
  applyRaubAction,
  finishRaubMatchEarly,
  isRaubMatchFinished,
  raubCardCount,
  raubLegalCards,
  raubMaxExchange,
  raubPlacements,
  raubScoreDelta,
  nextRaubPlayerId,
  raubOrderFrom,
} from "./match";
export type { CreateRaubMatchParams, RaubRng, StartRaubHandOptions } from "./match";
export { getRaubView, getRaubAutoAction } from "./view";
export { selectRaubBotAction, raubBotThinkMs, DEFAULT_RAUB_BOT_CONFIG } from "./bot";
export type { RaubBotConfig } from "./bot";
export { simulateRaubMatches } from "./simulate";
export type { RaubSimOptions, RaubSimResult, RaubSimMatch } from "./simulate";
