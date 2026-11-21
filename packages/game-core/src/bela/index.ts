// Bela — čist motor. Spec: docs/bela-spec.md

export {
  BELA_RANKS,
  BELA_DECK_SIZE,
  BELA_TRICKS_PER_HAND,
  BELA_CARD_POINTS,
  belaNaturalValue,
  belaStrength,
  belaCardPoints,
  createBelaDeck,
  belaBeats,
  belaTrickWinnerIndex,
  belaCheapestCard,
} from "./cards";
export {
  DEFAULT_BELA_RULES,
  BELA_QUICKPLAY_TARGET,
  BELA_RECONNECT_GRACE_SECONDS,
  createBelaRules,
} from "./config";
export {
  findBelaDeclarations,
  compareDeclarations as compareBelaDeclarations,
  resolveBelaDeclarations,
  declarationTotal as belaDeclarationTotal,
  sequencePoints as belaSequencePoints,
} from "./declarations";
export {
  BELA_SUITS,
  createBelaMatch,
  startBelaHand,
  applyBelaAction,
  finishBelaMatchEarly,
  isBelaMatchFinished,
  belaCardCount,
  belaLegalCards,
  belaLivePoints,
  belaMustCall,
  belaCallableSuits,
  belaPlacements,
  belaHandAward,
  belaMatchWinner,
  belaTeamOf,
  nextBelaPlayerId,
  belaOrderFrom,
} from "./match";
export type { CreateBelaMatchParams, BelaRng, StartBelaHandOptions } from "./match";
export { getBelaView, getBelaAutoAction, belaStrongestSuit } from "./view";
export { selectBelaBotAction, belaBotThinkMs, belaSuitStrength, DEFAULT_BELA_BOT_CONFIG } from "./bot";
export type { BelaBotConfig } from "./bot";
export { simulateBelaMatches } from "./simulate";
export type { BelaSimOptions, BelaSimResult, BelaSimMatch } from "./simulate";
