// Poker (Texas Hold'em No-Limit) — čist motor. Spec: docs/poker-spec.md

export {
  pokerRankValue,
  evaluateFive,
  evaluateBestHand,
  compareHandScores,
  POKER_CATEGORIES,
} from "./evaluate";
export type { EvaluatedHand, HandScore } from "./evaluate";
export {
  DEFAULT_POKER_CONFIG,
  DEFAULT_POKER_BLIND_LEVELS,
  pokerLevelForHand,
  pokerBlindsForLevel,
} from "./config";
export type { PokerConfig } from "./config";
export { buildPots, splitPot } from "./pots";
export type { PotContribution } from "./pots";
export { getPokerLegalActions, isBettingRoundComplete } from "./betting";
export {
  createPokerMatch,
  startPokerHand,
  applyPokerAction,
  leavePokerMatch,
  setPokerSeatStatus,
  isPokerMatchFinished,
  pokerTotalChips,
} from "./match";
export type { CreatePokerMatchParams, PokerRng, StartPokerHandOptions } from "./match";
export { getPokerView, getPokerAutoAction } from "./view";
