import type { RulesConfig } from "@zandar/shared-types";

/**
 * Default konfiguracija pravila za MVP.
 * Vidi PRD Sekciju 30 za obrazlozenja svake odluke.
 */
export const defaultRulesConfig: RulesConfig = {
  targetScore: 21,
  playerCount: 2, // postavlja se pri kreiranju sobe
  initialTableCards: 4,
  cardsPerDeal: 4,
  jackOnInitialTableBehavior: "award_to_cutter",
  aceValue: 1,
  allowMultipleDisjointCaptures: false,
  forceCapture: true,
  teamPlay: false, // automatski true ako playerCount === 4
  turnTimeoutSeconds: 30,
  reconnectGracePeriodSeconds: 30,
  pauseMaxDurationSeconds: 120,
  consecutiveAutoPlaysForAbandon: 3,
};

/**
 * Kreira RulesConfig za odredjen broj igraca.
 * Automatski podesava teamPlay (true za 4P, false inace).
 * Moze se proslijediti overrides za testove ili custom partije.
 */
export function createRulesConfig(
  playerCount: 2 | 3 | 4,
  overrides?: Partial<RulesConfig>,
): RulesConfig {
  return {
    ...defaultRulesConfig,
    playerCount,
    teamPlay: playerCount === 4,
    ...overrides,
  };
}