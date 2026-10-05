import type { GameState, Player, RulesConfig } from "@zandar/shared-types";
import { createDeck } from "./deck";
import { shuffle } from "./shuffle";
import { getCapturePileId, getPlayerLeftOfDealer } from "./helpers";

/**
 * Dijeli karte sa vrha spila igracima.
 * Svaki igrac dobija cardsPerDeal karata (iz rulesConfig).
 *
 * Redoslijed: od igraca lijevo od dealera, DEALER ZADNJI. Zato dno spila uvijek
 * zavrsi kod dealera — na to se oslanja award_to_dealer (J sa pocetnog stola
 * ceka na dnu i dealer ga dobije u ruku u zadnjem dijeljenju).
 *
 * Ako spil ostane prazan, prestaje. Sa award_to_dealer se to vise ne desava
 * (spil ostaje djeljiv), ali award_to_cutter i partije hidrirane iz starog
 * snapshot-a (J vec u pile-u, spil 47) i dalje mogu dati neravnomjerno dijeljenje.
 * In-place modifikacija state-a.
 */
export function dealCardsToPlayers(state: GameState): void {
  const n = state.players.length;
  const firstId = getPlayerLeftOfDealer(state);
  const firstIdx = state.players.findIndex((p) => p.id === firstId);

  for (let step = 0; step < n; step++) {
    const player = state.players[(firstIdx + step) % n]!;
    for (let i = 0; i < state.rulesConfig.cardsPerDeal; i++) {
      const card = state.deck.shift();
      if (!card) return; // spil prazan
      state.hands[player.id]!.push(card);
    }
  }
}

/**
 * Interno: dijeli pocetne karte na sto.
 * J koji izadje medju pocetne 4 se obradjuje prema jackOnInitialTableBehavior:
 * award_to_dealer (default) / award_to_cutter / replace_without_award / allow_on_table.
 */
function dealInitialTable(state: GameState, cutterPlayerId: string): void {
  const { initialTableCards, jackOnInitialTableBehavior } = state.rulesConfig;

  while (state.table.length < initialTableCards) {
    const card = state.deck.shift();
    if (!card) return;

    if (card.rank === "J") {
      // award_to_dealer: J ide na DNO spila i izvuce se zamjenska karta za sto.
      //   Dealer se dijeli zadnji (vidi dealCardsToPlayers), pa mu J stigne u
      //   RUKU u zadnjem dijeljenju. Spil ostaje djeljiv — svi uvijek dobiju
      //   isti broj karata. (Ranije je J isao pravo u dealerov pile, pa je spil
      //   padao na 47 i neko je u zadnjem dijeljenju dobijao kartu manje.)
      if (jackOnInitialTableBehavior === "award_to_dealer") {
        state.deck.push(card);
        continue;
      }
      // award_to_cutter: J ide cutteru (desno od dealera) + zamjena.
      if (jackOnInitialTableBehavior === "award_to_cutter") {
        const cutterPile = getCapturePileId(state, cutterPlayerId);
        state.captured[cutterPile]!.push(card);
        continue;
      }
      // replace_without_award: J ide na DNO spila + izvuce se sljedeca. Otkad se
      //   dealer dijeli zadnji, ovo je u praksi isto sto i award_to_dealer (dno
      //   zavrsi kod dealera); ostaje zbog starih snapshot-a i tipa.
      if (jackOnInitialTableBehavior === "replace_without_award") {
        state.deck.push(card);
        continue;
      }
      // allow_on_table: J ostaje na stolu (padne kroz na push ispod).
    }

    state.table.push(card);
  }
}

/**
 * Parametri za kreiranje pocetnog GameState-a.
 */
export type CreateInitialGameStateParams = {
  roomId: string;
  matchId: string;
  players: Player[];
  dealerPlayerId: string;
  rulesConfig: RulesConfig;
  /** Opcionalan seed za deterministicko mijesanje (za testove). */
  shuffleSeed?: number;
};

/**
 * Kreira pocetni GameState za novu partiju.
 *
 * Tok:
 * 1. Validira da broj igraca odgovara rulesConfig.playerCount
 * 2. Mijesa spil
 * 3. Postavlja prvog igraca (lijevo od dealera) i cuttera (desno od dealera)
 * 4. Inicijalizuje prazne hands i captured piles
 * 5. Dijeli pocetne 4 karte na sto (sa J replacement)
 * 6. Dijeli 4 karte svakom igracu
 */
export function createInitialGameState(
  params: CreateInitialGameStateParams,
): GameState {
  const {
    roomId,
    matchId,
    players,
    dealerPlayerId,
    rulesConfig,
    shuffleSeed,
  } = params;

  // Validacija
  if (players.length !== rulesConfig.playerCount) {
    throw new Error(
      `players.length (${players.length}) ne odgovara rulesConfig.playerCount (${rulesConfig.playerCount})`,
    );
  }

  // Nadji dealera, cuttera, prvog igraca
  const dealerIndex = players.findIndex((p) => p.id === dealerPlayerId);
  if (dealerIndex === -1) {
    throw new Error(`Dealer ${dealerPlayerId} nije pronadjen`);
  }
  const cutterIndex = (dealerIndex - 1 + players.length) % players.length;
  const cutterId = players[cutterIndex]!.id;
  const firstPlayerIndex = (dealerIndex + 1) % players.length;
  const firstPlayerId = players[firstPlayerIndex]!.id;

  // Mijesaj spil
  const deck = shuffle(createDeck(), shuffleSeed);

  // Inicijalizuj state
  const state: GameState = {
    roomId,
    matchId,
    phase: "playing",
    players,
    pendingJoinRequests: [],
    reactions: [],
    dealerPlayerId,
    currentPlayerId: firstPlayerId,
    deck,
    table: [],
    hands: {},
    captured: {},
    handNumber: 1,
    handScores: [],
    matchScore: {},
    targetScore: rulesConfig.targetScore,
    moveHistory: [],
    rulesConfig,
    stateVersion: 0,
  };

  // Inicijalizuj prazne hands
  for (const player of players) {
    state.hands[player.id] = [];
  }

  // Inicijalizuj captured piles i match score
  if (rulesConfig.teamPlay) {
    state.captured["team-0"] = [];
    state.captured["team-1"] = [];
    state.matchScore["team-0"] = 0;
    state.matchScore["team-1"] = 0;
  } else {
    for (const player of players) {
      state.captured[player.id] = [];
      state.matchScore[player.id] = 0;
    }
  }

  // Dijeli pocetne karte na sto (sa J replacement)
  dealInitialTable(state, cutterId);

  // Dijeli karte igracima
  dealCardsToPlayers(state);

  return state;
}