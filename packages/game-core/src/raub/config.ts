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
  // Odluka 26 (vlasnik, 16.11.2026, po prijavi igrača): djelilac na prvoj karti
  // za Raub ili Štih odlučuje ne gledajući svoje karte.
  dealerBlindFirstFlip: true,
  // Odluka 25 (vlasnik, 16.11.2026): zamjena sve 4 daje tačno 4, bez pete i
  // otvorene karte (pagat.com) — igrač je 5 karata prijavio kao grešku.
  fullExchangeBonus: false,
  // Odluka 27 (vlasnik, 18.11.2026, po feedbacku igrača): ruka sa Štihom se ne
  // duplira i ne troši refu — refa se prenosi na sljedeću ruku s Raubom/Mojom.
  stihSkipsRefa: true,
  // Odluka 29 (vlasnik, 18.11.2026, po prijavi igrača): poslije „Moja" bez
  // sedmice karta ostaje na talonu, a igrač sa sedmicom aduta je poslije svoje
  // zamjene smije uzeti.
  mojaTalonSeven: true,
  // Odluka 30 (vlasnik, 18.11.2026, po prijavi igrača): kod „Moja" sa sedmicom
  // karta čeka na stolu kao kod Rauba — nosilac prvo mijenja (sedmica je
  // zaključana), pa tek onda daje sedmicu za kartu.
  mojaSevenAfterExchange: true,
  // Odluka 31 (vlasnik, 18.11.2026, po feedbacku igrača): poslije „Dalje” na
  // kartu, niža karta iste boje u toj ruci je mrtva (samo „Dalje”).
  lowerOfPassedSuitDead: true,
  // Odluka 32 (vlasnik, 21.11.2026, po prijavi igrača): kad djelilac kaže
  // „Dalje" na sedmicu, redom je mogu uzeti ostali (isto kao Štih: mora 1).
  sevenOpenToAll: true,
  // Odluka 33 (vlasnik, 22.11.2026, po prijavi igrača): zamjena kreće od
  // prvog poslije djelioca, djelilac mijenja zadnji (i kad je nosilac Rauba).
  exchangeFromDealer: true,
  // Odluka 36 (vlasnik, 23.11.2026, po prijavi igrača): sedmica kao druga ili
  // treća karta — „Moja” ili „Dalje” (Štih ostaje samo na prvoj karti).
  mojaOnLaterSeven: true,
  // Odluka 38 (vlasnik, 25.11.2026, po prijavi igrača; zamjenjuje 32): Štih na
  // prvu sedmicu samo djelilac; poslije njegovog „Dalje" ostali „Moja"/„Dalje".
  sevenPassToBidding: true,
};

/**
 * Odluka 34 (vlasnik, 22.11.2026): igrač bira 11 ili 21 — privatni sto na
 * webu, brza igra u podešavanjima Rauba. Odluka 35 (vlasnik, 22.11.2026, po
 * prijavi igrača): podrazumijevano je opet 21, i za brzu igru bez izbora
 * (stari klijenti, web početna); 11 je samo kad ga igrač izabere.
 */
export const RAUB_START_SCORES = [11, 21] as const;
export type RaubStartScore = (typeof RAUB_START_SCORES)[number];
export const RAUB_QUICK_START_SCORE: RaubStartScore = 21;

/** Početni bodovi iz unosa ili sobe; sve van `RAUB_START_SCORES` → 21. */
export function raubStartScore(value: unknown): RaubStartScore {
  return (RAUB_START_SCORES as readonly unknown[]).includes(value) ? (value as RaubStartScore) : 21;
}

/** Rok za povratak poslije prekida veze prije pauze (server; isto kao Žandar). */
export const RAUB_RECONNECT_GRACE_SECONDS = 60;

export function createRaubRules(
  playerCount: 2 | 3 | 4,
  overrides: Partial<Omit<RaubRules, "playerCount">> = {},
): RaubRules {
  return { playerCount, ...DEFAULT_RAUB_RULES, ...overrides };
}
