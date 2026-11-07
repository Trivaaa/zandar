import type { RaubRules } from "@zandar/shared-types";

/**
 * Pravila Rauba za V1 (docs/raub-spec.md, „Gdje se izvori razilaze", odluka 5).
 * HARD RULE 7: parametri su konfiguracija, ne hardkod.
 */
export const DEFAULT_RAUB_RULES: Omit<RaubRules, "playerCount"> = {
  startScore: 21,
  maxTalonFlips: 3,
  firstBidder: "dealer",
  direction: 1,
  mustOvertrump: false,
  allowDrop: true,
  // Odluka 10: 15 s je bilo prekratko za razmišljanje (igra na uređaju).
  turnTimeoutSeconds: 25,
};

/** Rok za povratak poslije prekida veze prije pauze (server; isto kao Žandar). */
export const RAUB_RECONNECT_GRACE_SECONDS = 60;

export function createRaubRules(
  playerCount: 2 | 3 | 4,
  overrides: Partial<Omit<RaubRules, "playerCount">> = {},
): RaubRules {
  return { playerCount, ...DEFAULT_RAUB_RULES, ...overrides };
}
