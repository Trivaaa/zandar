import type {
  Card,
  RaubActionRequest,
  RaubGameState,
  RaubHandResult,
  RaubHandRow,
  RaubPlacement,
  RaubRules,
  RaubSeat,
} from "@zandar/shared-types";
import { shuffleWith } from "../shuffle";
import { beats, createRaubDeck, isSeven, trickWinnerIndex } from "./cards";

/** Generator u [0, 1). Server daje kriptografski, testovi seeded. */
export type RaubRng = () => number;

export const RAUB_DECK_SIZE = 32;
export const RAUB_TRICKS_PER_HAND = 4;

export interface CreateRaubMatchParams {
  roomId: string;
  matchId: string;
  /** Igrači poredani po mjestu za stolom (`seatIndex`); raspored se ne miješa. */
  playerIds: readonly string[];
  rules: RaubRules;
  rng: RaubRng;
  /** Test: zadat prvi djelilac umjesto nasumičnog. */
  dealerId?: string;
  /** Test: zadat špil za prvu ruku (vrh = indeks 0). */
  deck?: Card[];
}

export interface StartRaubHandOptions {
  /** Test: zadat špil (vrh = indeks 0). */
  deck?: Card[];
}

/**
 * Kopija stanja za akciju. Upisani redovi istorije se nikad ne mijenjaju, pa se
 * dijele (inače bi svaka akcija klonirala cijeli meč — O(n²) u simulaciji).
 */
function clone(state: RaubGameState): RaubGameState {
  const { history, lastHand, ...rest } = state;
  return { ...structuredClone(rest), history: [...history], lastHand };
}

function seatOf(state: RaubGameState, playerId: string): RaubSeat {
  const seat = state.seats.find((s) => s.playerId === playerId);
  if (!seat) throw new Error("PLAYER_NOT_IN_MATCH");
  return seat;
}

/** Sljedeći igrač u smjeru igre. */
export function nextRaubPlayerId(state: Pick<RaubGameState, "seats" | "rules">, playerId: string): string {
  const n = state.seats.length;
  const i = state.seats.findIndex((s) => s.playerId === playerId);
  if (i < 0) throw new Error("PLAYER_NOT_IN_MATCH");
  return state.seats[(i + state.rules.direction + n) % n]!.playerId;
}

/** Igra ruku: nije rekao „Ne idem". */
function isActive(state: RaubGameState, playerId: string): boolean {
  return seatOf(state, playerId).going !== false;
}

/** Sljedeći igrač koji igra ruku, u smjeru igre. */
function nextActiveId(state: RaubGameState, playerId: string): string {
  let id = nextRaubPlayerId(state, playerId);
  while (!isActive(state, id)) id = nextRaubPlayerId(state, id);
  return id;
}

/** Svi igrači redom, počevši od `firstId`. */
export function raubOrderFrom(state: Pick<RaubGameState, "seats" | "rules">, firstId: string): string[] {
  const order = [firstId];
  let id = nextRaubPlayerId(state, firstId);
  while (id !== firstId) {
    order.push(id);
    id = nextRaubPlayerId(state, id);
  }
  return order;
}

function firstBidderId(state: RaubGameState): string {
  return state.rules.firstBidder === "dealer"
    ? state.dealerId
    : nextRaubPlayerId(state, state.dealerId);
}

function draw(state: RaubGameState, count: number): Card[] {
  if (state.deck.length < count) throw new Error("DECK_EMPTY");
  return state.deck.splice(0, count);
}

/** Ukupno karata na svim mjestima — mora biti 32 (invarijanta za testove i simulaciju). */
export function raubCardCount(state: RaubGameState): number {
  return (
    state.deck.length +
    state.talon.length +
    state.discarded.length +
    state.seats.reduce((sum, s) => sum + s.hand.length, 0) +
    state.tricks.reduce((sum, t) => sum + t.plays.length, 0)
  );
}

export function isRaubMatchFinished(state: RaubGameState): boolean {
  return state.phase === "match_finished" || state.phase === "abandoned";
}

/** Novi meč: svi kreću od `startScore`, prvi djelilac nasumično, odmah se dijeli prva ruka. */
export function createRaubMatch(params: CreateRaubMatchParams): RaubGameState {
  const { playerIds, rules } = params;
  if (playerIds.length < 2 || playerIds.length > 4) throw new Error("INVALID_PLAYER_COUNT");
  if (new Set(playerIds).size !== playerIds.length) throw new Error("DUPLICATE_PLAYER");
  const dealerId =
    params.dealerId ?? playerIds[Math.floor(params.rng() * playerIds.length)]!;
  if (!playerIds.includes(dealerId)) throw new Error("PLAYER_NOT_IN_MATCH");

  const base: RaubGameState = {
    game: "raub",
    roomId: params.roomId,
    matchId: params.matchId,
    phase: "hand_complete",
    stateVersion: 0,
    rules: { ...rules, playerCount: playerIds.length as 2 | 3 | 4 },
    dealNo: 0,
    // Prva ruka ne rotira (`rotate: false`): dijeli upravo izabrani.
    dealerId,
    seats: playerIds.map((playerId, seatNo) => ({
      playerId,
      seatNo,
      score: rules.startScore,
      hand: [],
      tricks: 0,
      bid: null,
      exchanged: null,
      going: null,
      place: null,
    })),
    step: null,
    currentPlayerId: null,
    deck: [],
    talon: [],
    talonFlips: 0,
    talonTakenBy: null,
    lockedCardId: null,
    dealerOpened: false,
    trumpSuit: null,
    scenario: null,
    declarerId: null,
    requiredTricks: 0,
    multiplier: 1,
    pendingRefas: 0,
    exchangeOrder: null,
    exchangeIndex: 0,
    fullExchangeUsed: false,
    openCard: null,
    discarded: [],
    tricks: [],
    lastHand: null,
    history: [],
    placements: [],
  };
  return startHand(base, params.rng, { deck: params.deck, rotate: false });
}

/** Sljedeća ruka (host je pokreće). Djelilac ide dalje u smjeru igre. */
export function startRaubHand(
  prev: RaubGameState,
  rng: RaubRng,
  options: StartRaubHandOptions = {},
): RaubGameState {
  if (prev.phase !== "hand_complete") throw new Error("INVALID_GAME_PHASE");
  return startHand(prev, rng, { deck: options.deck, rotate: true });
}

function startHand(
  prev: RaubGameState,
  rng: RaubRng,
  opts: { deck: Card[] | undefined; rotate: boolean },
): RaubGameState {
  const state = clone(prev);
  if (opts.rotate) state.dealerId = nextRaubPlayerId(state, state.dealerId);
  state.dealNo += 1;
  state.phase = "playing";
  state.deck = opts.deck ? [...opts.deck] : shuffleWith(createRaubDeck(), rng);
  if (state.deck.length !== RAUB_DECK_SIZE) throw new Error("INVALID_DECK");
  for (const s of state.seats) {
    s.hand = [];
    s.tricks = 0;
    s.bid = null;
    s.exchanged = null;
    s.going = null;
  }
  state.talon = [];
  state.talonFlips = 0;
  state.talonTakenBy = null;
  state.lockedCardId = null;
  state.dealerOpened = false;
  state.trumpSuit = null;
  state.scenario = null;
  state.declarerId = null;
  state.requiredTricks = 0;
  state.multiplier = state.pendingRefas > 0 ? 2 : 1;
  state.exchangeOrder = null;
  state.exchangeIndex = 0;
  state.fullExchangeUsed = false;
  state.openCard = null;
  state.discarded = [];
  state.tricks = [];

  // Djelilac dijeli od sljedećeg igrača, sebi zadnji: 2, talon, 2.
  const order = raubOrderFrom(state, nextRaubPlayerId(state, state.dealerId));
  for (const id of order) seatOf(state, id).hand.push(...draw(state, 2));
  state.talon.push(...draw(state, 1));
  state.talonFlips = 1;
  for (const id of order) seatOf(state, id).hand.push(...draw(state, 2));

  const offered = state.talon[0]!;
  if (isSeven(offered)) {
    // Scenarij 1: sedmica — djelilac automatski nosi adut i mora 1 štih.
    state.scenario = "seven";
    state.dealerOpened = true;
    declare(state, state.dealerId, 1);
    takeTalon(state, state.dealerId);
    toDiscardExtra(state, state.dealerId);
  } else {
    state.step = "await_open";
    state.currentPlayerId = state.dealerId;
  }
  state.stateVersion += 1;
  return state;
}

function offeredCard(state: RaubGameState): Card {
  const card = state.talon.at(-1);
  if (!card) throw new Error("NO_TALON");
  return card;
}

function declare(state: RaubGameState, playerId: string, required: number): void {
  state.declarerId = playerId;
  state.trumpSuit = offeredCard(state).suit;
  state.requiredTricks = required;
}

/** Ponuđena karta s talona ide u ruku igrača i zaključava se. */
function takeTalon(state: RaubGameState, playerId: string): void {
  const card = state.talon.pop()!;
  seatOf(state, playerId).hand.push(card);
  state.talonTakenBy = playerId;
  state.lockedCardId = card.id;
}

function toDiscardExtra(state: RaubGameState, playerId: string): void {
  state.step = "discard_extra";
  state.currentPlayerId = playerId;
}

/** Najviše karata koje igrač smije zamijeniti: ne više nego ima u špilu, bez zaključane. */
export function raubMaxExchange(state: RaubGameState, playerId: string): number {
  const seat = seatOf(state, playerId);
  const free = seat.hand.filter((c) => c.id !== state.lockedCardId).length;
  return Math.min(free, state.deck.length);
}

/**
 * Adut je određen (i višak odbačen): „Idem / Ne idem" redom od nosioca,
 * pa zamjena. Bez `allowDrop` svi igraju.
 */
function afterTrump(state: RaubGameState): void {
  const declarer = seatOf(state, state.declarerId!);
  declarer.going = true;
  if (!state.rules.allowDrop) {
    for (const s of state.seats) s.going = true;
    beginExchange(state);
    return;
  }
  continueGoing(state);
}

function continueGoing(state: RaubGameState): void {
  const next = raubOrderFrom(state, state.declarerId!).find((id) => seatOf(state, id).going === null);
  if (next) {
    state.step = "going";
    state.currentPlayerId = next;
    return;
  }
  if (state.seats.every((s) => s.playerId === state.declarerId || s.going === false)) {
    // Niko ne ide: nosilac upisuje sva 4 štiha (pagat).
    seatOf(state, state.declarerId!).tricks = RAUB_TRICKS_PER_HAND;
    scoreHand(state);
    return;
  }
  beginExchange(state);
}

function beginExchange(state: RaubGameState): void {
  state.exchangeOrder = raubOrderFrom(state, state.declarerId!).filter((id) => isActive(state, id));
  state.exchangeIndex = 0;
  continueExchange(state);
}

/** Sljedeći u redu zamjene; kad je špil prazan, ostali preskaču (zamjena 0). */
function continueExchange(state: RaubGameState): void {
  const order = state.exchangeOrder!;
  while (state.exchangeIndex < order.length) {
    const id = order[state.exchangeIndex]!;
    if (state.deck.length > 0) {
      state.step = "exchange";
      state.currentPlayerId = id;
      return;
    }
    seatOf(state, id).exchanged = 0;
    state.exchangeIndex += 1;
  }
  beginTricks(state);
}

function beginTricks(state: RaubGameState): void {
  state.step = "tricks";
  state.tricks = [{ leaderId: state.declarerId!, plays: [], winnerId: null }];
  state.currentPlayerId = state.declarerId;
}

function currentTrick(state: RaubGameState) {
  const trick = state.tricks.at(-1);
  if (!trick || trick.winnerId !== null) throw new Error("NO_OPEN_TRICK");
  return trick;
}

/**
 * Dozvoljene karte u štihu: boja, pa adut, pa bilo šta. Uz `mustOvertrump`
 * igrač mora i nadjačati kad može (u okviru te obaveze).
 */
export function raubLegalCards(state: RaubGameState, playerId: string): Card[] {
  const hand = seatOf(state, playerId).hand;
  const trick = state.tricks.at(-1);
  if (!trick || trick.winnerId !== null || trick.plays.length === 0) return [...hand];
  const trump = state.trumpSuit;
  const led = trick.plays[0]!.card.suit;
  const sameSuit = hand.filter((c) => c.suit === led);
  const trumps = hand.filter((c) => c.suit === trump);
  const pool = sameSuit.length > 0 ? sameSuit : trumps.length > 0 ? trumps : [...hand];
  if (!state.rules.mustOvertrump) return pool;
  const cards = trick.plays.map((p) => p.card);
  const best = cards[trickWinnerIndex(cards, trump)]!;
  const winners = pool.filter((c) => beats(c, best, led, trump));
  return winners.length > 0 ? winners : pool;
}

/**
 * Bodovi jednog igrača za ruku, bez ×2 refe (spec: „Bodovi po ruci"):
 * štih −1; igrač bez štiha +2; sedmica (mora 1) bez štiha +3;
 * nosilac koji mora 2: jedan štih +3, nijedan +4.
 */
export function raubScoreDelta(p: {
  declarer: boolean;
  requiredTricks: number;
  tricks: number;
}): { delta: number; penalty: boolean } {
  if (p.declarer) {
    if (p.tricks >= p.requiredTricks) return { delta: -p.tricks, penalty: false };
    return { delta: p.requiredTricks === 1 ? 3 : p.tricks === 1 ? 3 : 4, penalty: true };
  }
  return p.tricks > 0 ? { delta: -p.tricks, penalty: false } : { delta: 2, penalty: true };
}

function scoreHand(state: RaubGameState): void {
  const m = state.multiplier;
  const rows: RaubHandRow[] = state.seats.map((s) => {
    const t = s.tricks;
    if (s.going === false) {
      return { playerId: s.playerId, tricks: 0, delta: 0, penalty: false, dropped: true, scoreBefore: s.score, scoreAfter: s.score };
    }
    const base = raubScoreDelta({
      declarer: s.playerId === state.declarerId,
      requiredTricks: state.requiredTricks,
      tricks: t,
    });
    const penalty = base.penalty;
    const delta = base.delta * m;
    const scoreBefore = s.score;
    s.score += delta;
    return { playerId: s.playerId, tricks: t, delta, penalty, dropped: false, scoreBefore, scoreAfter: s.score };
  });
  if (m === 2) state.pendingRefas = Math.max(0, state.pendingRefas - 1);
  finishHand(state, { void: false, rows });

  if (state.seats.some((s) => s.score <= 0)) {
    state.phase = "match_finished";
    state.placements = raubPlacements(state);
    for (const p of state.placements) seatOf(state, p.playerId).place = p.place;
  }
}

/** Refa: niko nije uzeo adut; ruka se ne boduje, a sljedeća odigrana ide ×2. */
function voidHand(state: RaubGameState): void {
  state.pendingRefas += 1;
  finishHand(state, { void: true, rows: [] });
}

function finishHand(state: RaubGameState, r: { void: boolean; rows: RaubHandRow[] }): void {
  const result: RaubHandResult = {
    dealNo: state.dealNo,
    dealerId: state.dealerId,
    void: r.void,
    trumpSuit: r.void ? null : state.trumpSuit,
    scenario: r.void ? null : state.scenario,
    declarerId: r.void ? null : state.declarerId,
    requiredTricks: r.void ? 0 : state.requiredTricks,
    multiplier: state.multiplier,
    rows: r.rows,
    pendingRefasAfter: state.pendingRefas,
  };
  state.lastHand = result;
  state.history.push(result);
  state.phase = "hand_complete";
  state.step = null;
  state.currentPlayerId = null;
}

/** Plasman po bodovima (manje je bolje); jednaki dijele mjesto. */
export function raubPlacements(state: Pick<RaubGameState, "seats">): RaubPlacement[] {
  const sorted = [...state.seats].sort((a, b) => a.score - b.score || a.seatNo - b.seatNo);
  return sorted.map((s) => ({
    playerId: s.playerId,
    score: s.score,
    place: 1 + state.seats.filter((o) => o.score < s.score).length,
  }));
}

/**
 * Akcija igrača na potezu. Vraća NOVO stanje (ulaz se ne mijenja). Greške su
 * string kodovi kao u Žandaru i Pokeru: INVALID_GAME_PHASE, NOT_YOUR_TURN,
 * STALE_STATE, INVALID_ACTION, ILLEGAL_CARD, CARD_LOCKED, TOO_MANY_CARDS.
 */
export function applyRaubAction(
  prev: RaubGameState,
  playerId: string,
  request: RaubActionRequest,
): RaubGameState {
  if (prev.phase !== "playing") throw new Error("INVALID_GAME_PHASE");
  if (prev.currentPlayerId !== playerId) throw new Error("NOT_YOUR_TURN");
  if (
    request.clientKnownStateVersion !== undefined &&
    request.clientKnownStateVersion !== prev.stateVersion
  ) {
    throw new Error("STALE_STATE");
  }

  const state = clone(prev);
  const seat = seatOf(state, playerId);
  const step = state.step;

  switch (request.type) {
    case "open": {
      if (step !== "await_open") throw new Error("INVALID_ACTION");
      state.dealerOpened = true;
      state.step = "bidding";
      state.currentPlayerId = firstBidderId(state);
      break;
    }
    case "blind": {
      if (step !== "await_open") throw new Error("INVALID_ACTION");
      // Scenarij 2: raub naslijepo — djelilac uzima talon i mora 2 štiha.
      state.scenario = "blind";
      state.dealerOpened = true;
      declare(state, playerId, 2);
      takeTalon(state, playerId);
      toDiscardExtra(state, playerId);
      break;
    }
    case "bid": {
      if (step !== "bidding") throw new Error("INVALID_ACTION");
      if (request.bid !== "raub" && request.bid !== "pass") throw new Error("INVALID_ACTION");
      seat.bid = request.bid;
      if (request.bid === "raub") {
        // Scenarij 3: prvi koji kaže „Raub" nosi boju ponuđene karte, mora 2.
        state.scenario = "bid";
        declare(state, playerId, 2);
        const hasSeven = seat.hand.some((c) => isSeven(c) && c.suit === state.trumpSuit);
        if (hasSeven) {
          state.step = "swap_seven";
          state.currentPlayerId = playerId;
        } else afterTrump(state);
        break;
      }
      if (state.seats.every((s) => s.bid === "pass")) {
        if (state.talonFlips >= state.rules.maxTalonFlips) {
          voidHand(state);
          break;
        }
        // Svi „Dalje": nova karta na talon (prethodna ostaje prigušena ispod).
        state.talon.push(...draw(state, 1));
        state.talonFlips += 1;
        for (const s of state.seats) s.bid = null;
        state.currentPlayerId = firstBidderId(state);
      } else {
        state.currentPlayerId = nextRaubPlayerId(state, playerId);
      }
      break;
    }
    case "swap_seven": {
      if (step !== "swap_seven") throw new Error("INVALID_ACTION");
      if (request.swap) {
        const i = seat.hand.findIndex((c) => isSeven(c) && c.suit === state.trumpSuit);
        if (i < 0) throw new Error("INVALID_ACTION");
        const [seven] = seat.hand.splice(i, 1);
        takeTalon(state, playerId);
        // Sedmica ide na mjesto uzete karte — svi su je ionako vidjeli kao zamjenu.
        state.talon.push(seven!);
      }
      afterTrump(state);
      break;
    }
    case "go": {
      if (step !== "going") throw new Error("INVALID_ACTION");
      if (typeof request.go !== "boolean") throw new Error("INVALID_ACTION");
      seat.going = request.go;
      // Ko ne ide, odlaže karte licem nadolje do kraja ruke.
      if (!request.go) state.discarded.push(...seat.hand.splice(0));
      continueGoing(state);
      break;
    }
    case "discard": {
      if (step !== "discard_extra") throw new Error("INVALID_ACTION");
      const i = seat.hand.findIndex((c) => c.id === request.cardId);
      if (i < 0) throw new Error("ILLEGAL_CARD");
      if (request.cardId === state.lockedCardId) throw new Error("CARD_LOCKED");
      if (state.openCard?.playerId === playerId && state.openCard.card.id === request.cardId) {
        throw new Error("CARD_LOCKED");
      }
      state.discarded.push(...seat.hand.splice(i, 1));
      if (state.exchangeOrder === null) afterTrump(state);
      else {
        state.exchangeIndex += 1;
        continueExchange(state);
      }
      break;
    }
    case "exchange": {
      if (step !== "exchange") throw new Error("INVALID_ACTION");
      const ids = request.cardIds;
      if (!Array.isArray(ids) || new Set(ids).size !== ids.length) throw new Error("INVALID_ACTION");
      if (ids.length > raubMaxExchange(state, playerId)) throw new Error("TOO_MANY_CARDS");
      if (ids.some((id) => id === state.lockedCardId)) throw new Error("CARD_LOCKED");
      if (ids.some((id) => !seat.hand.some((c) => c.id === id))) throw new Error("ILLEGAL_CARD");

      seat.hand = seat.hand.filter((c) => {
        if (!ids.includes(c.id)) return true;
        state.discarded.push(c);
        return false;
      });
      seat.exchanged = ids.length;

      if (ids.length === 4 && !state.fullExchangeUsed) {
        // Prva zamjena sve 4 (odluka 1): 2 skrivene, 1 otvorena, 2 skrivene,
        // pa odbacivanje jedne (ne otvorene). Kratak špil: koliko ima.
        state.fullExchangeUsed = true;
        const drawn = draw(state, Math.min(5, state.deck.length));
        seat.hand.push(...drawn);
        if (drawn.length >= 3) state.openCard = { playerId, card: drawn[2]! };
        if (seat.hand.length > 4) {
          toDiscardExtra(state, playerId);
          break;
        }
      } else {
        seat.hand.push(...draw(state, ids.length));
      }
      state.exchangeIndex += 1;
      continueExchange(state);
      break;
    }
    case "play": {
      if (step !== "tricks") throw new Error("INVALID_ACTION");
      const legal = raubLegalCards(state, playerId);
      const card = legal.find((c) => c.id === request.cardId);
      if (!card) throw new Error("ILLEGAL_CARD");
      seat.hand = seat.hand.filter((c) => c.id !== card.id);
      const trick = currentTrick(state);
      trick.plays.push({ playerId, card });
      const activeCount = state.seats.filter((s) => s.going !== false).length;
      if (trick.plays.length < activeCount) {
        state.currentPlayerId = nextActiveId(state, playerId);
        break;
      }
      const winner = trick.plays[trickWinnerIndex(trick.plays.map((p) => p.card), state.trumpSuit)]!;
      trick.winnerId = winner.playerId;
      seatOf(state, winner.playerId).tricks += 1;
      if (state.tricks.length >= RAUB_TRICKS_PER_HAND) {
        scoreHand(state);
      } else {
        state.tricks.push({ leaderId: winner.playerId, plays: [], winnerId: null });
        state.currentPlayerId = winner.playerId;
      }
      break;
    }
    default:
      throw new Error("INVALID_ACTION");
  }

  state.stateVersion += 1;
  return state;
}

/** Server prekida meč (glasanje „Završi", nema živog čovjeka). */
export function finishRaubMatchEarly(prev: RaubGameState): RaubGameState {
  if (isRaubMatchFinished(prev)) return prev;
  const state = clone(prev);
  state.phase = "abandoned";
  state.step = null;
  state.currentPlayerId = null;
  state.stateVersion += 1;
  return state;
}
