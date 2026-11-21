import type { BelaRules } from "@zandar/shared-types";

/**
 * Pravila Bele za V1 — prijedlozi iz speca, prihvaćeni 21.11.2026 (odluka 7).
 * HARD RULE 7: parametri su konfiguracija, ne hardkod. Oznake P-n su iz
 * docs/bela-spec.md, tabela „Pravila za potvrdu".
 */
export const DEFAULT_BELA_RULES: Omit<BelaRules, "playerCount"> = {
  targetScore: 1001, // P-16 (Quick Play: 501, bira server)
  direction: 1, // P-1: na desno, kao Žandar i Raub
  talonCards: 2, // P-2: 6 vidljivih + 2 zatvorene
  dealerMustCall: true, // P-3: mus
  callRounds: 1, // P-4
  revealDeclarationsAfterFirstTrick: true, // P-6
  declarationsWinnerOnly: true, // P-7
  belaPoints: 20, // P-8
  belaAlwaysScores: true, // P-8
  firstLead: "right_of_dealer", // P-9
  mustOvertakePartner: true, // P-10
  failGivesCallerDeclarations: true, // P-11
  tieRule: "hang", // P-12
  stigljaBonus: 90, // P-13
  pointsDivisor: 1, // P-14
  belotWinsMatch: false, // P-15
  bothOverTarget: "caller", // P-17
  lastTrickBonus: 10,
  // Isto kao Raub (odluka 10 u Raub specu).
  turnTimeoutSeconds: 25,
};

/** Kraća partija za Quick Play (P-16). */
export const BELA_QUICKPLAY_TARGET = 501;

/** Rok za povratak poslije prekida veze prije pauze (server; isto kao Raub). */
export const BELA_RECONNECT_GRACE_SECONDS = 60;

export function createBelaRules(overrides: Partial<Omit<BelaRules, "playerCount">> = {}): BelaRules {
  return { playerCount: 4, ...DEFAULT_BELA_RULES, ...overrides };
}
