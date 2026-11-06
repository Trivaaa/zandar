import type {
  Card,
  PokerActionRequest,
  PokerActionType,
  PokerAward,
  PokerGameState,
  PokerLogType,
  PokerSeat,
  PokerSeatStatus,
  PokerShowdownHand,
} from "@zandar/shared-types";
import { createDeck } from "../deck";
import { shuffleWith } from "../shuffle";
import {
  canActSeat,
  getPokerLegalActions,
  isAlive,
  isBettingRoundComplete,
  isContender,
  needsToAct,
} from "./betting";
import { DEFAULT_POKER_CONFIG, pokerBlindsForLevel, pokerLevelForHand } from "./config";
import type { PokerConfig } from "./config";
import { compareHandScores, evaluateBestHand } from "./evaluate";
import type { EvaluatedHand } from "./evaluate";
import { buildPots, splitPot } from "./pots";

/** Generator u [0, 1). Server daje kriptografski, testovi seeded. */
export type PokerRng = () => number;

export interface CreatePokerMatchParams {
  roomId: string;
  matchId: string;
  /** Igrači za stolom; redoslijed mjesta se miješa. */
  playerIds: readonly string[];
  rng: PokerRng;
  config?: Partial<Pick<PokerConfig, "startStack" | "handsPerLevel" | "blindLevels">>;
  /** Test: zadat redoslijed mjesta i button umjesto nasumičnog. */
  fixedSeating?: boolean;
  initialButtonSeat?: number;
  /** Test: zadat špil za prvu ruku. */
  deck?: Card[];
}

export interface StartPokerHandOptions {
  /** Test: zadat špil (vrh = indeks 0). */
  deck?: Card[];
}

function clone(state: PokerGameState): PokerGameState {
  return structuredClone(state);
}

function seatOf(state: PokerGameState, playerId: string): PokerSeat {
  const seat = state.seats.find((s) => s.playerId === playerId);
  if (!seat) throw new Error("PLAYER_NOT_IN_MATCH");
  return seat;
}

function indexOfSeatNo(state: PokerGameState, seatNo: number): number {
  return state.seats.findIndex((s) => s.seatNo === seatNo);
}

/** Prvo sjedište poslije `fromIndex` (u smjeru igre) koje zadovoljava uslov. */
function nextIndex(
  state: PokerGameState,
  fromIndex: number,
  pred: (s: PokerSeat) => boolean,
): number {
  const n = state.seats.length;
  for (let step = 1; step <= n; step++) {
    const i = (fromIndex + step) % n;
    if (pred(state.seats[i]!)) return i;
  }
  return -1;
}

/** Igrači poredani od prvog lijevo od buttona (za neparne žetone). */
function orderFromButton(state: PokerGameState, ids: readonly string[]): string[] {
  const n = state.seats.length;
  const btn = indexOfSeatNo(state, state.buttonSeat);
  const pos = (id: string) => {
    const i = state.seats.findIndex((s) => s.playerId === id);
    return (i - btn - 1 + n * 2) % n;
  };
  return [...ids].sort((a, b) => pos(a) - pos(b));
}

function log(state: PokerGameState, playerId: string, type: PokerLogType, amount: number): void {
  state.actionLog.push({ handNo: state.handNo, street: state.street, playerId, type, amount });
}

function drawCards(state: PokerGameState, count: number): Card[] {
  if (state.deck.length < count) throw new Error("DECK_EMPTY");
  return state.deck.splice(0, count);
}

/** Ukupno žetona u igri + izašlih — mora biti konstantno (invarijanta). */
export function pokerTotalChips(state: PokerGameState): number {
  return (
    state.seats.reduce((sum, s) => sum + s.stack + s.totalBet, 0) + state.chipsRemoved
  );
}

export function isPokerMatchFinished(state: PokerGameState): boolean {
  return state.phase === "match_finished" || state.phase === "abandoned";
}

/**
 * Novi meč: svi dobijaju startni stack, mjesta i button nasumično, i odmah se
 * dijeli prva ruka.
 */
export function createPokerMatch(params: CreatePokerMatchParams): PokerGameState {
  if (params.playerIds.length < 2) throw new Error("NOT_ENOUGH_PLAYERS");
  const cfg = { ...DEFAULT_POKER_CONFIG, ...params.config };
  const order = params.fixedSeating
    ? [...params.playerIds]
    : shuffleWith(params.playerIds, params.rng);
  const seats: PokerSeat[] = order.map((playerId, seatNo) => ({
    playerId,
    seatNo,
    stack: cfg.startStack,
    status: "active",
    inHand: false,
    folded: false,
    allIn: false,
    holeCards: [],
    streetBet: 0,
    totalBet: 0,
    hasActed: false,
    actedAtRaiseCount: 0,
    lastAction: null,
    stackAtHandStart: cfg.startStack,
    place: null,
  }));
  const initialButton =
    params.initialButtonSeat ?? Math.floor(params.rng() * seats.length);
  const state: PokerGameState = {
    game: "poker",
    roomId: params.roomId,
    matchId: params.matchId,
    phase: "hand_complete",
    stateVersion: 0,
    startStack: cfg.startStack,
    handsPerLevel: cfg.handsPerLevel,
    blindLevels: cfg.blindLevels.map(([a, b]) => [a, b] as [number, number]),
    handNo: 0,
    blindLevel: 1,
    smallBlind: 0,
    bigBlind: 0,
    // Prva ruka pomjera button za jedno mjesto — počinjemo jedno mjesto prije.
    buttonSeat: (initialButton - 1 + seats.length) % seats.length,
    smallBlindSeat: -1,
    bigBlindSeat: -1,
    seats,
    street: "preflop",
    board: [],
    deck: [],
    currentPlayerId: null,
    currentBet: 0,
    minRaise: 0,
    fullRaiseCount: 0,
    actionLog: [],
    lastHandResult: null,
    placements: [],
    chipsRemoved: 0,
  };
  return startPokerHand(state, params.rng, { deck: params.deck });
}

function postBlind(state: PokerGameState, seat: PokerSeat, amount: number, type: PokerLogType) {
  // Igrač s manje žetona od blinda postavlja all-in za koliko ima.
  const pay = Math.min(amount, seat.stack);
  seat.stack -= pay;
  seat.streetBet += pay;
  seat.totalBet += pay;
  if (seat.stack === 0) seat.allIn = true;
  log(state, seat.playerId, type, pay);
}

/**
 * Nova ruka: button na sljedećeg živog igrača, blindovi, po 2 karte.
 * Nivo blindova se mijenja samo ovdje (na početku ruke).
 */
export function startPokerHand(
  prev: PokerGameState,
  rng: PokerRng,
  options: StartPokerHandOptions = {},
): PokerGameState {
  if (prev.phase !== "hand_complete") throw new Error("INVALID_GAME_PHASE");
  const state = clone(prev);
  const alive = state.seats.filter(isAlive);
  if (alive.length < 2) throw new Error("NOT_ENOUGH_PLAYERS");

  state.handNo += 1;
  state.blindLevel = pokerLevelForHand(state.handNo, state.handsPerLevel);
  const blinds = pokerBlindsForLevel(state.blindLevel, state.blindLevels, state.startStack);
  state.smallBlind = blinds.smallBlind;
  state.bigBlind = blinds.bigBlind;

  for (const s of state.seats) {
    s.inHand = isAlive(s);
    s.folded = false;
    s.allIn = false;
    s.holeCards = [];
    s.streetBet = 0;
    s.totalBet = 0;
    s.hasActed = false;
    s.actedAtRaiseCount = 0;
    s.lastAction = null;
    s.stackAtHandStart = s.stack;
  }

  const prevBtnIdx = Math.max(0, indexOfSeatNo(state, state.buttonSeat));
  const btnIdx = nextIndex(state, prevBtnIdx, (s) => s.inHand);
  let sbIdx: number;
  let bbIdx: number;
  if (alive.length === 2) {
    // Heads-up: button postavlja small blind i igra prvi preflop.
    sbIdx = btnIdx;
    bbIdx = nextIndex(state, btnIdx, (s) => s.inHand);
  } else {
    sbIdx = nextIndex(state, btnIdx, (s) => s.inHand);
    bbIdx = nextIndex(state, sbIdx, (s) => s.inHand);
  }
  state.buttonSeat = state.seats[btnIdx]!.seatNo;
  state.smallBlindSeat = state.seats[sbIdx]!.seatNo;
  state.bigBlindSeat = state.seats[bbIdx]!.seatNo;

  state.deck = options.deck ? [...options.deck] : shuffleWith(createDeck(), rng);
  state.board = [];
  state.street = "preflop";
  state.actionLog = [];
  state.phase = "betting";

  // Dijeli se od prvog lijevo od buttona, po jedna karta u dva kruga.
  const dealOrder: PokerSeat[] = [];
  let i = btnIdx;
  for (let k = 0; k < alive.length; k++) {
    i = nextIndex(state, i, (s) => s.inHand);
    dealOrder.push(state.seats[i]!);
  }
  for (let round = 0; round < 2; round++) {
    for (const s of dealOrder) s.holeCards.push(...drawCards(state, 1));
  }

  postBlind(state, state.seats[sbIdx]!, state.smallBlind, "small_blind");
  postBlind(state, state.seats[bbIdx]!, state.bigBlind, "big_blind");
  state.currentBet = state.bigBlind;
  state.minRaise = state.bigBlind;
  state.fullRaiseCount = 0;
  state.currentPlayerId = null;
  state.stateVersion += 1;

  if (isBettingRoundComplete(state)) {
    endStreet(state);
  } else {
    // Preflop prvi igra igrač lijevo od big blinda.
    const first = nextIndex(state, bbIdx, (s) => needsToAct(state, s));
    state.currentPlayerId = state.seats[first]!.playerId;
  }
  return state;
}

/**
 * Akcija igrača na potezu. Vraća NOVO stanje (ulaz se ne mijenja).
 * Greške su string kodovi, kao u Žandaru: INVALID_GAME_PHASE, NOT_YOUR_TURN,
 * STALE_STATE, ILLEGAL_ACTION, INVALID_AMOUNT.
 */
export function applyPokerAction(
  prev: PokerGameState,
  playerId: string,
  request: PokerActionRequest,
): PokerGameState {
  if (prev.phase !== "betting") throw new Error("INVALID_GAME_PHASE");
  if (prev.currentPlayerId !== playerId) throw new Error("NOT_YOUR_TURN");
  if (
    request.clientKnownStateVersion !== undefined &&
    request.clientKnownStateVersion !== prev.stateVersion
  ) {
    throw new Error("STALE_STATE");
  }
  const legal = getPokerLegalActions(prev, playerId);
  if (!legal) throw new Error("NOT_YOUR_TURN");

  const state = clone(prev);
  const seat = seatOf(state, playerId);
  let shown: PokerActionType = request.type;

  const putTo = (to: number) => {
    const add = to - seat.streetBet;
    seat.stack -= add;
    seat.streetBet = to;
    seat.totalBet += add;
    if (seat.stack === 0) seat.allIn = true;
    return add;
  };

  let added = 0;
  switch (request.type) {
    case "fold":
      seat.folded = true;
      break;
    case "check":
      if (!legal.canCheck) throw new Error("ILLEGAL_ACTION");
      break;
    case "call":
      if (!legal.canCall) throw new Error("ILLEGAL_ACTION");
      added = putTo(seat.streetBet + legal.callAmount);
      if (seat.allIn) shown = "allin";
      break;
    case "bet":
    case "raise":
    case "allin": {
      let to: number;
      if (request.type === "allin") {
        to = legal.maxTo;
        if (to <= state.currentBet) {
          // All-in koji ne prelazi tekući ulog je call.
          if (!legal.canCall) throw new Error("ILLEGAL_ACTION");
          added = putTo(to);
          break;
        }
        if (!legal.canBet && !legal.canRaise) throw new Error("ILLEGAL_ACTION");
      } else {
        if (request.type === "bet" ? !legal.canBet : !legal.canRaise) {
          throw new Error("ILLEGAL_ACTION");
        }
        const amount = request.amount;
        if (typeof amount !== "number" || !Number.isInteger(amount)) {
          throw new Error("INVALID_AMOUNT");
        }
        if (amount < legal.minTo || amount > legal.maxTo) throw new Error("INVALID_AMOUNT");
        to = amount;
      }
      const increment = to - state.currentBet;
      added = putTo(to);
      if (increment >= state.minRaise) {
        // Puno povećanje: novi minimum i ponovo otvara betovanje.
        state.minRaise = increment;
        state.fullRaiseCount += 1;
      }
      state.currentBet = Math.max(state.currentBet, to);
      if (seat.allIn) shown = "allin";
      else shown = prev.currentBet === 0 ? "bet" : "raise";
      break;
    }
    default:
      throw new Error("ILLEGAL_ACTION");
  }

  seat.hasActed = true;
  seat.actedAtRaiseCount = state.fullRaiseCount;
  seat.lastAction = { type: shown, amount: seat.streetBet };
  log(state, playerId, shown, added);
  state.stateVersion += 1;

  advance(state, indexOfSeatNo(state, seat.seatNo));
  return state;
}

/** Poslije akcije: sljedeći na potezu, ili kraj ulice/ruke. */
function advance(state: PokerGameState, fromIndex: number): void {
  const contenders = state.seats.filter(isContender);
  if (contenders.length === 1) {
    finishUncontested(state, contenders[0]!);
    return;
  }
  if (isBettingRoundComplete(state)) {
    endStreet(state);
    return;
  }
  const next = nextIndex(state, fromIndex, (s) => needsToAct(state, s));
  state.currentPlayerId = next === -1 ? null : state.seats[next]!.playerId;
  if (next === -1) endStreet(state);
}

const NEXT_STREET = { preflop: "flop", flop: "turn", turn: "river" } as const;

/** Zatvara ulicu; dijeli sljedeću ili ide na showdown. */
function endStreet(state: PokerGameState): void {
  const allInRunout = state.seats.filter(canActSeat).length < 2 && state.street !== "river";
  for (const s of state.seats) {
    s.streetBet = 0;
    s.hasActed = false;
    s.actedAtRaiseCount = 0;
    s.lastAction = null;
  }
  state.currentBet = 0;
  state.minRaise = state.bigBlind;
  state.fullRaiseCount = 0;
  state.currentPlayerId = null;

  for (;;) {
    if (state.street === "river") {
      showdown(state, allInRunout);
      return;
    }
    state.street = NEXT_STREET[state.street];
    state.board.push(...drawCards(state, state.street === "flop" ? 3 : 1));
    if (state.seats.filter(canActSeat).length >= 2) {
      // Postflop prvi igra prvi aktivni lijevo od buttona.
      const first = nextIndex(state, indexOfSeatNo(state, state.buttonSeat), (s) =>
        needsToAct(state, s),
      );
      state.currentPlayerId = state.seats[first]!.playerId;
      return;
    }
    // Svi (osim najviše jednog) all-in: dijeli dalje bez licitacije.
  }
}

function finishUncontested(state: PokerGameState, winner: PokerSeat): void {
  const total = state.seats.reduce((sum, s) => sum + s.totalBet, 0);
  winner.stack += total;
  state.lastHandResult = {
    handNo: state.handNo,
    uncontested: true,
    allInRunout: false,
    pots: [{ amount: total, eligiblePlayerIds: [winner.playerId] }],
    awards: [{ potIndex: 0, playerId: winner.playerId, amount: total }],
    showdown: [],
  };
  finishHand(state);
}

function showdown(state: PokerGameState, allInRunout: boolean): void {
  const contenders = state.seats.filter(isContender);
  const evaluated = new Map<string, EvaluatedHand>();
  for (const s of contenders) {
    evaluated.set(s.playerId, evaluateBestHand([...s.holeCards, ...state.board]));
  }
  const pots = buildPots(
    state.seats
      .filter((s) => s.totalBet > 0)
      .map((s) => ({ playerId: s.playerId, amount: s.totalBet, folded: !isContender(s) })),
  );
  const awards: PokerAward[] = [];
  pots.forEach((pot, potIndex) => {
    const eligible =
      pot.eligiblePlayerIds.length > 0 ? pot.eligiblePlayerIds : contenders.map((s) => s.playerId);
    let best: number[] | null = null;
    let winners: string[] = [];
    for (const id of eligible) {
      const score = evaluated.get(id)!.score;
      const cmp = best === null ? 1 : compareHandScores(score, best);
      if (cmp > 0) {
        best = score;
        winners = [id];
      } else if (cmp === 0) {
        winners.push(id);
      }
    }
    for (const [playerId, amount] of splitPot(pot.amount, orderFromButton(state, winners))) {
      seatOf(state, playerId).stack += amount;
      awards.push({ potIndex, playerId, amount });
    }
  });
  const shown: PokerShowdownHand[] = orderFromButton(
    state,
    contenders.map((s) => s.playerId),
  ).map((id) => {
    const ev = evaluated.get(id)!;
    return {
      playerId: id,
      holeCards: [...seatOf(state, id).holeCards],
      category: ev.category,
      bestCards: ev.bestCards,
    };
  });
  state.lastHandResult = {
    handNo: state.handNo,
    uncontested: false,
    allInRunout,
    pots,
    awards,
    showdown: shown,
  };
  finishHand(state);
}

/** Bankroti, plasman i kraj meča poslije isplate. */
function finishHand(state: PokerGameState): void {
  state.currentPlayerId = null;
  state.currentBet = 0;
  for (const s of state.seats) {
    s.streetBet = 0;
    s.totalBet = 0;
  }
  state.phase = "hand_complete";

  const busted = state.seats.filter((s) => s.inHand && isAlive(s) && s.stack === 0);
  if (busted.length > 0) {
    const aliveBefore = state.seats.filter(isAlive).length;
    for (const s of busted) {
      // Bolji plasman ima onaj s više žetona na početku ruke; jednaki dijele.
      const better = busted.filter((o) => o.stackAtHandStart > s.stackAtHandStart).length;
      s.place = aliveBefore - busted.length + 1 + better;
    }
    for (const s of busted) {
      s.status = "bankrupt";
      state.placements.push({ playerId: s.playerId, place: s.place! });
    }
  }
  checkMatchEnd(state);
}

function checkMatchEnd(state: PokerGameState): void {
  const alive = state.seats.filter(isAlive);
  if (alive.length <= 1) {
    const winner = alive[0];
    if (winner) {
      winner.place = 1;
      state.placements.push({ playerId: winner.playerId, place: 1 });
    }
    state.phase = "match_finished";
    state.currentPlayerId = null;
  }
}

/**
 * Igrač napušta meč (namjerno, ili server poslije isteka veze).
 * Dobija najlošiji preostali plasman, mjesto ostaje prazno, njegovi žetoni
 * izlaze iz igre. Ono što je već uložio u ruku ostaje u potu (kao fold).
 */
export function leavePokerMatch(prev: PokerGameState, playerId: string): PokerGameState {
  const seatPrev = prev.seats.find((s) => s.playerId === playerId);
  if (!seatPrev || !isAlive(seatPrev) || isPokerMatchFinished(prev)) return prev;
  const state = clone(prev);
  const seat = seatOf(state, playerId);
  const aliveBefore = state.seats.filter(isAlive).length;
  seat.place = aliveBefore;
  state.placements.push({ playerId, place: aliveBefore });
  seat.status = "left";
  state.chipsRemoved += seat.stack;
  seat.stack = 0;
  state.stateVersion += 1;

  if (state.phase === "betting" && seat.inHand && !seat.folded) {
    seat.folded = true;
    seat.lastAction = { type: "fold", amount: seat.streetBet };
    const wasTurn = state.currentPlayerId === playerId;
    const contenders = state.seats.filter(isContender);
    if (contenders.length === 1) {
      finishUncontested(state, contenders[0]!);
    } else if (wasTurn) {
      advance(state, indexOfSeatNo(state, seat.seatNo));
    } else if (isBettingRoundComplete(state)) {
      endStreet(state);
    }
    return state;
  }
  if (state.phase === "hand_complete" || state.phase === "betting") checkMatchEnd(state);
  return state;
}

/** Server: igrač bez veze (`sitting_out`) ili vraćen (`active`). Pravila igre se ne mijenjaju. */
export function setPokerSeatStatus(
  prev: PokerGameState,
  playerId: string,
  status: Extract<PokerSeatStatus, "active" | "sitting_out">,
): PokerGameState {
  const seat = prev.seats.find((s) => s.playerId === playerId);
  if (!seat || !isAlive(seat) || seat.status === status) return prev;
  const state = clone(prev);
  seatOf(state, playerId).status = status;
  state.stateVersion += 1;
  return state;
}
