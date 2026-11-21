import type {
  BelaActionRequest,
  BelaGameState,
  BelaHandOutcome,
  BelaHandResult,
  BelaPlacement,
  BelaPlayerDeclarations,
  BelaRules,
  BelaSeat,
  BelaTeam,
  BelaTeamHand,
  Card,
  Suit,
} from "@zandar/shared-types";
import { shuffleWith } from "../shuffle";
import {
  BELA_DECK_SIZE,
  BELA_TRICKS_PER_HAND,
  belaBeats,
  belaCardPoints,
  belaTrickWinnerIndex,
  createBelaDeck,
} from "./cards";
import { declarationTotal, findBelaDeclarations, resolveBelaDeclarations } from "./declarations";

/** Generator u [0, 1). Server daje kriptografski, testovi seeded. */
export type BelaRng = () => number;

export const BELA_SUITS: readonly Suit[] = ["hearts", "spades", "diamonds", "clubs"];

export interface CreateBelaMatchParams {
  roomId: string;
  matchId: string;
  /** Tačno 4 igrača, poredana po mjestu za stolom; timovi su mjesta 0+2 i 1+3. */
  playerIds: readonly string[];
  rules: BelaRules;
  rng: BelaRng;
  /** Test: zadat prvi djelilac umjesto nasumičnog. */
  dealerId?: string;
  /** Test: zadat špil za prvu ruku (vrh = indeks 0). */
  deck?: Card[];
}

export interface StartBelaHandOptions {
  /** Test: zadat špil (vrh = indeks 0). */
  deck?: Card[];
}

/** Kopija stanja za akciju; upisani redovi istorije se dijele (ne mijenjaju se). */
function clone(state: BelaGameState): BelaGameState {
  const { history, lastHand, ...rest } = state;
  return { ...structuredClone(rest), history: [...history], lastHand };
}

function seatOf(state: Pick<BelaGameState, "seats">, playerId: string): BelaSeat {
  const seat = state.seats.find((s) => s.playerId === playerId);
  if (!seat) throw new Error("PLAYER_NOT_IN_MATCH");
  return seat;
}

export function belaTeamOf(state: Pick<BelaGameState, "seats">, playerId: string): BelaTeam {
  return seatOf(state, playerId).team;
}

/** Sljedeći igrač u smjeru igre (P-1). */
export function nextBelaPlayerId(state: Pick<BelaGameState, "seats" | "rules">, playerId: string): string {
  const n = state.seats.length;
  const i = state.seats.findIndex((s) => s.playerId === playerId);
  if (i < 0) throw new Error("PLAYER_NOT_IN_MATCH");
  return state.seats[(i + state.rules.direction + n) % n]!.playerId;
}

/** Svi igrači redom, počevši od `firstId`. */
export function belaOrderFrom(state: Pick<BelaGameState, "seats" | "rules">, firstId: string): string[] {
  const order = [firstId];
  let id = nextBelaPlayerId(state, firstId);
  while (id !== firstId) {
    order.push(id);
    id = nextBelaPlayerId(state, id);
  }
  return order;
}

/** Ukupno karata na svim mjestima — mora biti 32 (invarijanta za testove i simulaciju). */
export function belaCardCount(state: BelaGameState): number {
  return (
    state.deck.length +
    state.seats.reduce((sum, s) => sum + s.hand.length + s.talon.length, 0) +
    state.tricks.reduce((sum, t) => sum + t.plays.length, 0)
  );
}

export function isBelaMatchFinished(state: BelaGameState): boolean {
  return state.phase === "match_finished" || state.phase === "abandoned";
}

/** Novi meč: oba tima od 0, prvi djelilac nasumično, odmah se dijeli prva ruka. */
export function createBelaMatch(params: CreateBelaMatchParams): BelaGameState {
  const { playerIds, rules } = params;
  if (playerIds.length !== 4) throw new Error("INVALID_PLAYER_COUNT");
  if (new Set(playerIds).size !== playerIds.length) throw new Error("DUPLICATE_PLAYER");
  const dealerId = params.dealerId ?? playerIds[Math.floor(params.rng() * playerIds.length)]!;
  if (!playerIds.includes(dealerId)) throw new Error("PLAYER_NOT_IN_MATCH");

  const base: BelaGameState = {
    game: "bela",
    roomId: params.roomId,
    matchId: params.matchId,
    phase: "hand_complete",
    stateVersion: 0,
    rules: { ...rules, playerCount: 4 },
    dealNo: 0,
    dealerId,
    seats: playerIds.map((playerId, seatNo) => ({
      playerId,
      seatNo,
      team: (seatNo % 2) as BelaTeam,
      hand: [],
      talon: [],
      call: null,
      declared: null,
    })),
    step: null,
    currentPlayerId: null,
    callRound: 0,
    deck: [],
    trumpSuit: null,
    callerId: null,
    forced: false,
    tricks: [],
    belaHolderId: null,
    belaBy: null,
    scoredDeclarations: null,
    scores: [0, 0],
    hanging: 0,
    lastHand: null,
    history: [],
    placements: [],
  };
  return startHand(base, params.rng, { deck: params.deck, rotate: false });
}

/** Sljedeća ruka (host je pokreće). Djelilac ide dalje u smjeru igre. */
export function startBelaHand(prev: BelaGameState, rng: BelaRng, options: StartBelaHandOptions = {}): BelaGameState {
  if (prev.phase !== "hand_complete") throw new Error("INVALID_GAME_PHASE");
  return startHand(prev, rng, { deck: options.deck, rotate: true });
}

function startHand(
  prev: BelaGameState,
  rng: BelaRng,
  opts: { deck: Card[] | undefined; rotate: boolean },
): BelaGameState {
  const state = clone(prev);
  if (opts.rotate) state.dealerId = nextBelaPlayerId(state, state.dealerId);
  state.dealNo += 1;
  state.phase = "playing";
  state.deck = opts.deck ? [...opts.deck] : shuffleWith(createBelaDeck(), rng);
  if (state.deck.length !== BELA_DECK_SIZE) throw new Error("INVALID_DECK");
  for (const s of state.seats) {
    s.hand = [];
    s.talon = [];
    s.call = null;
    s.declared = null;
  }
  state.trumpSuit = null;
  state.callerId = null;
  state.forced = false;
  state.tricks = [];
  state.belaHolderId = null;
  state.belaBy = null;
  state.scoredDeclarations = null;

  // Dijeli od igrača desno od djelioca, sebi zadnji: 3, 3, pa talon 2 (P-2).
  const order = belaOrderFrom(state, nextBelaPlayerId(state, state.dealerId));
  for (const id of order) seatOf(state, id).hand.push(...state.deck.splice(0, 3));
  for (const id of order) seatOf(state, id).hand.push(...state.deck.splice(0, 3));
  for (const id of order) {
    const two = state.deck.splice(0, 2);
    if (state.rules.talonCards === 2) seatOf(state, id).talon.push(...two);
    else seatOf(state, id).hand.push(...two);
  }

  state.step = "calling";
  state.callRound = 1;
  state.currentPlayerId = order[0]!;
  state.stateVersion += 1;
  return state;
}

/**
 * Mora li igrač zvati (mus, P-3): djelilac je zadnji u zadnjem krugu zvanja i
 * svi prije njega su rekli „Dalje".
 */
export function belaMustCall(state: BelaGameState, playerId: string): boolean {
  return (
    state.rules.dealerMustCall &&
    state.phase === "playing" &&
    state.step === "calling" &&
    playerId === state.dealerId &&
    state.callRound >= state.rules.callRounds
  );
}

/** Boje koje igrač smije zvati (V1: sve četiri; jedan krug, P-4). */
export function belaCallableSuits(state: BelaGameState, playerId: string): Suit[] {
  if (state.phase !== "playing" || state.step !== "calling" || state.currentPlayerId !== playerId) return [];
  return [...BELA_SUITS];
}

function currentTrick(state: BelaGameState) {
  const trick = state.tricks.at(-1);
  if (!trick || trick.winnerId !== null) throw new Error("NO_OPEN_TRICK");
  return trick;
}

/**
 * Dozvoljene karte u štihu: boja, pa adut, pa bilo šta; uz to se mora ići jače
 * kad se može (u boji i u adutu; ko nema jači adut, i dalje baca adut). Uz
 * `mustOvertakePartner: false` (P-10 alternativa) obaveza nadjačavanja i
 * sječenja ne važi dok štih nosi partner.
 */
export function belaLegalCards(state: BelaGameState, playerId: string): Card[] {
  const hand = seatOf(state, playerId).hand;
  const trick = state.tricks.at(-1);
  if (!trick || trick.winnerId !== null || trick.plays.length === 0) return [...hand];
  const trump = state.trumpSuit;
  const led = trick.plays[0]!.card.suit;
  const cards = trick.plays.map((p) => p.card);
  const bestIdx = belaTrickWinnerIndex(cards, trump);
  const best = cards[bestIdx]!;
  const sameSuit = hand.filter((c) => c.suit === led);
  const partnerWins =
    !state.rules.mustOvertakePartner &&
    seatOf(state, trick.plays[bestIdx]!.playerId).team === seatOf(state, playerId).team;
  if (partnerWins) return sameSuit.length > 0 ? sameSuit : [...hand];
  const trumps = hand.filter((c) => c.suit === trump);
  const pool = sameSuit.length > 0 ? sameSuit : trumps.length > 0 ? trumps : [...hand];
  const winners = pool.filter((c) => belaBeats(c, best, led, trump));
  return winners.length > 0 ? winners : pool;
}

/** Bodovi karata iz završenih štihova po timu (+ zadnji štih kad je odigran). */
export function belaLivePoints(state: BelaGameState): [number, number] {
  const pts: [number, number] = [0, 0];
  state.tricks.forEach((t, i) => {
    if (t.winnerId === null) return;
    const team = seatOf(state, t.winnerId).team;
    for (const p of t.plays) pts[team] += belaCardPoints(p.card, state.trumpSuit);
    if (i === BELA_TRICKS_PER_HAND - 1) pts[team] += state.rules.lastTrickBonus;
  });
  return pts;
}

function isTrumpKQ(card: Card, trump: Suit | null): boolean {
  return card.suit === trump && (card.rank === "K" || card.rank === "Q");
}

/** Prijave redom prvog štiha (od onoga ko ga je otvorio). */
function declarationsInOrder(state: BelaGameState): BelaPlayerDeclarations[] {
  const first = state.tricks[0];
  if (!first) return [];
  return first.plays.map((p) => ({
    playerId: p.playerId,
    declarations: seatOf(state, p.playerId).declared ?? [],
  }));
}

function scoreHand(state: BelaGameState): void {
  const r = state.rules;
  const callerTeam = seatOf(state, state.callerId!).team;

  const tricks: [number, number] = [0, 0];
  for (const t of state.tricks) tricks[seatOf(state, t.winnerId!).team] += 1;
  const card = belaLivePoints(state);
  const stiglja: BelaTeam | null = tricks[0] === BELA_TRICKS_PER_HAND ? 0 : tricks[1] === BELA_TRICKS_PER_HAND ? 1 : null;
  if (stiglja !== null) card[stiglja] += r.stigljaBonus;

  const scored = state.scoredDeclarations ?? [];
  const decl: [number, number] = [0, 0];
  for (const p of scored) decl[seatOf(state, p.playerId).team] += declarationTotal(p.declarations);

  const bela: [number, number] = [0, 0];
  if (state.belaBy) {
    const team = seatOf(state, state.belaBy).team;
    const otherScores = scored.some((p) => seatOf(state, p.playerId).team !== team);
    if (r.belaAlwaysScores || !otherScores) bela[team] = r.belaPoints;
  }

  const { outcome, awarded, hanging } = belaHandAward({ card, decl, bela, callerTeam, hanging: state.hanging, rules: r });
  const before: [number, number] = [state.scores[0], state.scores[1]];
  state.scores = [before[0] + awarded[0], before[1] + awarded[1]];
  state.hanging = hanging;

  const teams: BelaTeamHand[] = ([0, 1] as const).map((t) => ({
    team: t,
    tricks: tricks[t],
    cardPoints: card[t],
    declarationPoints: decl[t],
    belaPoints: bela[t],
    awarded: awarded[t],
    scoreBefore: before[t],
    scoreAfter: state.scores[t],
  }));
  finishHand(state, { outcome, stiglja, teams, declarations: scored });

  // Kraj meča (P-15, P-16, P-17).
  const belot =
    r.belotWinsMatch &&
    scored.find((p) => p.declarations.some((d) => d.kind === "sequence" && d.cards.length === BELA_TRICKS_PER_HAND));
  const winner = belot ? seatOf(state, belot.playerId).team : belaMatchWinner(state.scores, callerTeam, r);
  if (winner !== null) {
    state.phase = "match_finished";
    state.placements = belaPlacements(state, winner);
  }
}

/**
 * Upis ruke (spec: „Bodovanje ruke"). Ulaz su bodovi po timu (karte sa zadnjim
 * štihom i štigljom, bodovana zvanja, bela). Tim koji je zvao mora imati više
 * od protivnika; inače pad (P-11) ili „visi" (P-12). Bodovi koji su visjeli
 * idu pobjedniku ove ruke. P-14: dijeljenje sa 10 na kraju, zaokruženo.
 */
export function belaHandAward(p: {
  card: readonly [number, number];
  decl: readonly [number, number];
  bela: readonly [number, number];
  callerTeam: BelaTeam;
  hanging: number;
  rules: Pick<BelaRules, "tieRule" | "failGivesCallerDeclarations" | "pointsDivisor">;
}): { outcome: Exclude<BelaHandOutcome, "redeal">; awarded: [number, number]; hanging: number } {
  const { callerTeam, rules: r } = p;
  const oppTeam = (1 - callerTeam) as BelaTeam;
  const raw: [number, number] = [p.card[0] + p.decl[0] + p.bela[0], p.card[1] + p.decl[1] + p.bela[1]];
  let outcome: Exclude<BelaHandOutcome, "redeal">;
  if (raw[callerTeam] > raw[oppTeam]) outcome = "pass";
  else if (raw[callerTeam] === raw[oppTeam] && r.tieRule === "hang") outcome = "hang";
  else outcome = "fail";

  const awarded: [number, number] = [0, 0];
  let hanging = p.hanging;
  if (outcome === "pass") {
    awarded[0] = raw[0];
    awarded[1] = raw[1];
  } else if (outcome === "fail") {
    awarded[oppTeam] = r.failGivesCallerDeclarations ? raw[0] + raw[1] : raw[oppTeam] + p.card[callerTeam];
  } else {
    awarded[oppTeam] = raw[oppTeam];
    hanging += raw[callerTeam];
  }
  if (outcome !== "hang" && hanging > 0) {
    awarded[outcome === "fail" ? oppTeam : callerTeam] += hanging;
    hanging = 0;
  }
  if (r.pointsDivisor !== 1) {
    awarded[0] = Math.round(awarded[0] / r.pointsDivisor);
    awarded[1] = Math.round(awarded[1] / r.pointsDivisor);
  }
  return { outcome, awarded, hanging };
}

/** Pobjednik meča poslije ruke (P-16, P-17); `null` dok niko nije prešao cilj. */
export function belaMatchWinner(
  scores: readonly [number, number],
  callerTeam: BelaTeam,
  rules: Pick<BelaRules, "targetScore" | "bothOverTarget">,
): BelaTeam | null {
  const over = ([0, 1] as const).filter((t) => scores[t] >= rules.targetScore);
  if (over.length === 0) return null;
  if (over.length === 1) return over[0]!;
  if (rules.bothOverTarget === "caller" || scores[0] === scores[1]) return callerTeam;
  return scores[0] > scores[1] ? 0 : 1;
}

function finishHand(
  state: BelaGameState,
  r: {
    outcome: BelaHandOutcome;
    stiglja: BelaTeam | null;
    teams: BelaTeamHand[];
    declarations: BelaPlayerDeclarations[];
  },
): void {
  const redeal = r.outcome === "redeal";
  const result: BelaHandResult = {
    dealNo: state.dealNo,
    dealerId: state.dealerId,
    trumpSuit: redeal ? null : state.trumpSuit,
    callerId: redeal ? null : state.callerId,
    callerTeam: redeal || !state.callerId ? null : seatOf(state, state.callerId).team,
    forced: !redeal && state.forced,
    outcome: r.outcome,
    stiglja: r.stiglja,
    teams: r.teams,
    belaBy: redeal ? null : state.belaBy,
    declarations: r.declarations,
    hangingAfter: state.hanging,
  };
  state.lastHand = result;
  state.history.push(result);
  state.phase = "hand_complete";
  state.step = null;
  state.currentPlayerId = null;
}

/** Plasman po timu: pobjednički tim 1, drugi 2. */
export function belaPlacements(state: Pick<BelaGameState, "seats" | "scores">, winner: BelaTeam): BelaPlacement[] {
  return state.seats.map((s) => ({
    playerId: s.playerId,
    team: s.team,
    place: s.team === winner ? 1 : 2,
    score: state.scores[s.team],
  }));
}

/**
 * Akcija igrača na potezu. Vraća NOVO stanje (ulaz se ne mijenja). Greške su
 * string kodovi kao u Raubu: INVALID_GAME_PHASE, NOT_YOUR_TURN, STALE_STATE,
 * INVALID_ACTION, MUST_CALL, ILLEGAL_CARD.
 */
export function applyBelaAction(prev: BelaGameState, playerId: string, request: BelaActionRequest): BelaGameState {
  if (prev.phase !== "playing") throw new Error("INVALID_GAME_PHASE");
  if (prev.currentPlayerId !== playerId) throw new Error("NOT_YOUR_TURN");
  if (request.clientKnownStateVersion !== undefined && request.clientKnownStateVersion !== prev.stateVersion) {
    throw new Error("STALE_STATE");
  }
  const state = clone(prev);
  const seat = seatOf(state, playerId);

  switch (request.type) {
    case "call": {
      if (state.step !== "calling") throw new Error("INVALID_ACTION");
      if (request.suit === null) {
        if (belaMustCall(state, playerId)) throw new Error("MUST_CALL");
        seat.call = "pass";
        if (playerId !== state.dealerId) {
          state.currentPlayerId = nextBelaPlayerId(state, playerId);
          break;
        }
        // Djelilac je zadnji u krugu: novi krug ili novo dijeljenje.
        if (state.callRound < state.rules.callRounds) {
          state.callRound += 1;
          for (const s of state.seats) s.call = null;
          state.currentPlayerId = nextBelaPlayerId(state, state.dealerId);
        } else {
          finishHand(state, { outcome: "redeal", stiglja: null, teams: [], declarations: [] });
        }
        break;
      }
      if (!BELA_SUITS.includes(request.suit)) throw new Error("INVALID_ACTION");
      state.forced = belaMustCall(state, playerId);
      seat.call = request.suit;
      state.trumpSuit = request.suit;
      state.callerId = playerId;
      for (const s of state.seats) {
        s.hand.push(...s.talon);
        s.talon = [];
      }
      const trump = request.suit;
      state.belaHolderId =
        state.seats.find((s) => s.hand.filter((c) => isTrumpKQ(c, trump)).length === 2)?.playerId ?? null;
      state.step = "tricks";
      const leader = state.rules.firstLead === "caller" ? playerId : nextBelaPlayerId(state, state.dealerId);
      state.tricks = [{ leaderId: leader, plays: [], winnerId: null }];
      state.currentPlayerId = leader;
      break;
    }
    case "play": {
      if (state.step !== "tricks") throw new Error("INVALID_ACTION");
      const card = seat.hand.find((c) => c.id === request.cardId);
      if (!card) throw new Error("ILLEGAL_CARD");
      if (!belaLegalCards(state, playerId).some((c) => c.id === card.id)) throw new Error("ILLEGAL_CARD");
      // Zvanja uz prvu kartu (P-6): prijavljuje se iz pune ruke od 8.
      if (state.tricks.length === 1 && seat.declared === null) {
        seat.declared = request.declare === false ? [] : findBelaDeclarations(seat.hand);
      }
      seat.hand = seat.hand.filter((c) => c.id !== card.id);
      // Bela (P-8): druga od K/Q aduta kod igrača koji je imao obje.
      if (playerId === state.belaHolderId && isTrumpKQ(card, state.trumpSuit) && !seat.hand.some((c) => isTrumpKQ(c, state.trumpSuit))) {
        state.belaBy = playerId;
      }
      const trick = currentTrick(state);
      trick.plays.push({ playerId, card });
      if (trick.plays.length < state.seats.length) {
        state.currentPlayerId = nextBelaPlayerId(state, playerId);
        break;
      }
      const winner = trick.plays[belaTrickWinnerIndex(trick.plays.map((p) => p.card), state.trumpSuit)]!;
      trick.winnerId = winner.playerId;
      if (state.tricks.length === 1) {
        state.scoredDeclarations = resolveBelaDeclarations(
          declarationsInOrder(state),
          (id) => seatOf(state, id).team,
          state.trumpSuit,
          state.rules.declarationsWinnerOnly,
        );
      }
      if (state.tricks.length >= BELA_TRICKS_PER_HAND) {
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
export function finishBelaMatchEarly(prev: BelaGameState): BelaGameState {
  if (isBelaMatchFinished(prev)) return prev;
  const state = clone(prev);
  state.phase = "abandoned";
  state.step = null;
  state.currentPlayerId = null;
  state.stateVersion += 1;
  return state;
}
