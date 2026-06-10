import type { Card, GameState } from "@zandar/shared-types";

/**
 * Vraca numericku vrijednost karte za sum capture.
 * - A = 1 (fiksno u MVP-u)
 * - 2-10 = nominalna vrijednost
 * - J, Q, K nemaju numericku vrijednost (vraca null)
 */
export function getNumericValue(card: Card): number | null {
  if (card.rank === "A") return 1;
  const numeric = Number(card.rank);
  if (Number.isInteger(numeric) && numeric >= 2 && numeric <= 10) {
    return numeric;
  }
  return null;
}

/**
 * Vraca ID "pile-a" gdje idu pokupljene karte za odredjenog igraca.
 * - U 2P/3P modu: vraca playerId
 * - U 4P timskom modu: vraca "team-0" ili "team-1"
 */
export function getCapturePileId(state: GameState, playerId: string): string {
  if (state.rulesConfig.teamPlay) {
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.teamId === undefined) {
      throw new Error(
        `Player ${playerId} nije pronadjen ili nema teamId u team play modu`,
      );
    }
    return `team-${player.teamId}`;
  }
  return playerId;
}

/**
 * Vraca ID igraca koji je sljedeci na potezu (clockwise od trenutnog).
 * Pretpostavlja da su igraci u state.players sortirani po seatIndex.
 */
export function getNextPlayerId(state: GameState): string {
  const currentIndex = state.players.findIndex(
    (p) => p.id === state.currentPlayerId,
  );
  if (currentIndex === -1) {
    throw new Error("currentPlayerId nije u listi igraca");
  }
  const nextIndex = (currentIndex + 1) % state.players.length;
  return state.players[nextIndex]!.id;
}

/**
 * Vraca ID sljedeceg igraca (clockwise) koji JOS IMA karte u ruci.
 *
 * Bitno kad spil ne dijeli ravnomjerno (npr. award_to_dealer izvuce kartu pa
 * zadnja runda bude neravnomjerna) — neki igraci ostanu bez karata prije drugih.
 * Preskacemo prazne ruke da niko ne zaglavi na potezu bez ijedne karte.
 *
 * @param fromPlayerId pocetni igrac
 * @param includeFrom  ukljuci i pocetnog (za izbor prvog igraca poslije dijeljenja)
 * @returns id igraca sa kartama, ili null ako niko nema karte
 */
export function getNextPlayerWithCards(
  state: GameState,
  fromPlayerId: string,
  includeFrom = false,
): string | null {
  const n = state.players.length;
  const fromIdx = state.players.findIndex((p) => p.id === fromPlayerId);
  if (fromIdx === -1) {
    throw new Error("fromPlayerId nije u listi igraca");
  }
  for (let step = includeFrom ? 0 : 1; step <= n; step++) {
    const id = state.players[(fromIdx + step) % n]!.id;
    if ((state.hands[id]?.length ?? 0) > 0) return id;
  }
  return null;
}

/**
 * Vraca ID igraca koji je lijevo od dealera (clockwise jedno mjesto).
 * To je prvi igrac koji igra u svakoj ruci.
 */
export function getPlayerLeftOfDealer(state: GameState): string {
  const dealerIndex = state.players.findIndex(
    (p) => p.id === state.dealerPlayerId,
  );
  if (dealerIndex === -1) {
    throw new Error("dealerPlayerId nije u listi igraca");
  }
  const leftIndex = (dealerIndex + 1) % state.players.length;
  return state.players[leftIndex]!.id;
}
/**
 * Provjerava da li dva niza stringova sadrze tacno iste elemente.
 * Redoslijed nije bitan, ali dupliciranje jeste (sto je dobro za karta-ID provjere).
 *
 * Primjer:
 * - sameSet(["a", "b"], ["b", "a"]) === true
 * - sameSet(["a", "b"], ["a", "b", "c"]) === false
 */
export function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  for (const item of b) {
    if (!setA.has(item)) return false;
  }
  return true;
}