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
  // Odluka 21 (vlasnik, 15.11.2026): mora nadjačati štih kad može (pagat.com).
  mustOvertrump: true,
  allowDrop: true,
  // Odluka 10: 15 s je bilo prekratko za razmišljanje (igra na uređaju).
  turnTimeoutSeconds: 25,
  // Odluka 13 (feedback igrača, 14.11.2026): Raub samo na A, K, Q, J; sedmica
  // na talonu nije obavezna („Štih" / „Dalje"); „Moja" (sedmica te boje) mora 2.
  raubRanks: ["A", "K", "Q", "J"],
  stihOptional: true,
  mojaRequiredTricks: 2,
  // Odluka 15 (vlasnik, 14.11.2026): „Raub" smije samo djelilac; „Moja" svako,
  // i bez sedmice (tada karta ostaje na talonu). Raub samo na prvoj okrenutoj karti.
  raubDealerOnly: true,
  raubFirstFlipOnly: true,
  // Odluka 16 (vlasnik, 14.11.2026): na kartu za Raub djelilac bira samo Raub ili Dalje.
  dealerRaubOrPass: true,
  mojaNeedsSeven: false,
  // Odluka 23 (vlasnik, 16.11.2026): djelilac smije odmah reći „Refa" na prvoj
  // okrenutoj karti, ali ne na drugoj ni trećoj.
  dealerRefaFirstFlip: true,
};

/** Rok za povratak poslije prekida veze prije pauze (server; isto kao Žandar). */
export const RAUB_RECONNECT_GRACE_SECONDS = 60;

export function createRaubRules(
  playerCount: 2 | 3 | 4,
  overrides: Partial<Omit<RaubRules, "playerCount">> = {},
): RaubRules {
  return { playerCount, ...DEFAULT_RAUB_RULES, ...overrides };
}
