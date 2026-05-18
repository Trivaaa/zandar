import { describe, it, expect } from "vitest";
import type {
  Card,
  GameState,
  PlayCardRequest,
  Player,
  Rank,
  Suit,
} from "@zandar/shared-types";
import { applyMove } from "./move";
import { createRulesConfig } from "./rules";

function card(suit: Suit, rank: Rank): Card {
  return { id: `${suit}-${rank}`, suit, rank };
}

function makePlayers(count: 2 | 3 | 4): Player[] {
  const players: Player[] = [];
  for (let i = 0; i < count; i++) {
    players.push({
      id: `p${i}`,
      displayName: `Player ${i}`,
      seatIndex: i,
      teamId: count === 4 ? i % 2 : undefined,
      connectionStatus: "connected",
      isHost: i === 0,
      consecutiveAutoPlays: 0,
    });
  }
  return players;
}

/**
 * Pravi minimalan GameState za testove.
 * Vazno: dajemo p0 dodatnu kartu da hand-ovi ne budu svi prazni nakon p1-ovog poteza.
 */
function makeState(overrides?: Partial<GameState>): GameState {
  const players = makePlayers(2);
  const base: GameState = {
    roomId: "r1",
    matchId: "m1",
    phase: "playing",
    players,
    pendingJoinRequests: [],
    reactions: [],
    dealerPlayerId: "p0",
    currentPlayerId: "p1",
    deck: [],
    table: [],
    hands: { p0: [card("diamonds", "K")], p1: [] }, // p0 ima 1 kartu po default-u
    captured: { p0: [], p1: [] },
    handNumber: 1,
    handScores: [],
    matchScore: { p0: 0, p1: 0 },
    targetScore: 21,
    moveHistory: [],
    rulesConfig: createRulesConfig(2),
    stateVersion: 0,
  };
  return { ...base, ...overrides };
}

function makeRequest(overrides: Partial<PlayCardRequest>): PlayCardRequest {
  return {
    roomId: "r1",
    playerId: "p1",
    cardId: "clubs-5",
    selectedCaptureCardIds: [],
    clientMoveId: "move-1",
    clientKnownStateVersion: 0,
    ...overrides,
  };
}

describe("applyMove - uspjesni potezi", () => {
  it("trail kad karta ne moze nista da kupi", () => {
    const c5 = card("clubs", "5");
    const c9 = card("hearts", "9");
    const state = makeState({
      table: [c9],
      hands: { p0: [card("diamonds", "K")], p1: [c5] },
    });

    applyMove(state, makeRequest({ cardId: "clubs-5" }));

    expect(state.table.map((c) => c.id)).toEqual(["hearts-9", "clubs-5"]);
    expect(state.hands["p1"]).toEqual([]);
    expect(state.stateVersion).toBe(1);
    expect(state.currentPlayerId).toBe("p0");
  });

  it("rank match capture", () => {
    const c7c = card("clubs", "7");
    const c7h = card("hearts", "7");
    const state = makeState({
      table: [c7h],
      hands: { p0: [card("diamonds", "K")], p1: [c7c] },
    });

    applyMove(
      state,
      makeRequest({
        cardId: "clubs-7",
        selectedCaptureCardIds: ["hearts-7"],
      }),
    );

    expect(state.table).toEqual([]);
    expect(state.captured["p1"]).toEqual([c7c, c7h]);
    expect(state.lastCapturePlayerId).toBe("p1");
  });

  it("sum capture (10 = 9 + A)", () => {
    const c10 = card("clubs", "10");
    const c9 = card("hearts", "9");
    const cA = card("spades", "A");
    const state = makeState({
      table: [c9, cA],
      hands: { p0: [card("diamonds", "K")], p1: [c10] },
    });

    applyMove(
      state,
      makeRequest({
        cardId: "clubs-10",
        selectedCaptureCardIds: ["hearts-9", "spades-A"],
      }),
    );

    expect(state.table).toEqual([]);
    expect(state.captured["p1"]).toEqual([c10, c9, cA]);
  });

  it("J kupi sve sa stola (jack clear)", () => {
    const cJ = card("clubs", "J");
    const c5 = card("hearts", "5");
    const c9 = card("spades", "9");
    const state = makeState({
      table: [c5, c9],
      hands: { p0: [card("diamonds", "K")], p1: [cJ] },
    });

    applyMove(
      state,
      makeRequest({
        cardId: "clubs-J",
        selectedCaptureCardIds: ["hearts-5", "spades-9"],
      }),
    );

    expect(state.table).toEqual([]);
    expect(state.captured["p1"]).toEqual([cJ, c5, c9]);
  });

  it("u 4P timskom modu, capture ide u team pile", () => {
    const players = makePlayers(4);
    const c7c = card("clubs", "7");
    const c7h = card("hearts", "7");
    const state = makeState({
      players,
      currentPlayerId: "p1",
      table: [c7h],
      hands: {
        p0: [card("diamonds", "K")], // p0 ima kartu da hand-ovi ne budu svi prazni
        p1: [c7c],
        p2: [],
        p3: [],
      },
      captured: { "team-0": [], "team-1": [] },
      matchScore: { "team-0": 0, "team-1": 0 },
      rulesConfig: createRulesConfig(4),
    });

    applyMove(
      state,
      makeRequest({
        cardId: "clubs-7",
        selectedCaptureCardIds: ["hearts-7"],
      }),
    );

    expect(state.captured["team-1"]).toEqual([c7c, c7h]);
    expect(state.captured["team-0"]).toEqual([]);
  });

  it("povecava stateVersion za 1", () => {
    const c5 = card("clubs", "5");
    const state = makeState({
      hands: { p0: [card("diamonds", "K")], p1: [c5] },
      stateVersion: 5,
    });

    applyMove(
      state,
      makeRequest({
        cardId: "clubs-5",
        clientKnownStateVersion: 5,
      }),
    );

    expect(state.stateVersion).toBe(6);
  });

  it("dodaje potez u moveHistory", () => {
    const c5 = card("clubs", "5");
    const state = makeState({
      hands: { p0: [card("diamonds", "K")], p1: [c5] },
    });

    applyMove(state, makeRequest({ cardId: "clubs-5" }));

    expect(state.moveHistory).toHaveLength(1);
    expect(state.moveHistory[0]?.playerId).toBe("p1");
    expect(state.moveHistory[0]?.playedCard.id).toBe("clubs-5");
    expect(state.moveHistory[0]?.capturedCards).toEqual([]);
    expect(state.moveHistory[0]?.isAutoPlay).toBe(false);
  });

  it("resetuje consecutiveAutoPlays za igraca koji je odigrao", () => {
    const c5 = card("clubs", "5");
    const players = makePlayers(2);
    players[1]!.consecutiveAutoPlays = 2;

    const state = makeState({
      players,
      hands: { p0: [card("diamonds", "K")], p1: [c5] },
    });

    applyMove(state, makeRequest({ cardId: "clubs-5" }));

    expect(state.players[1]?.consecutiveAutoPlays).toBe(0);
  });
});

describe("applyMove - validacija greske", () => {
  it("baca NOT_YOUR_TURN kad pogresan igrac proba potez", () => {
    const c5 = card("clubs", "5");
    const state = makeState({
      currentPlayerId: "p0",
      hands: { p0: [card("hearts", "3")], p1: [c5] },
    });

    expect(() =>
      applyMove(state, makeRequest({ playerId: "p1", cardId: "clubs-5" })),
    ).toThrow("NOT_YOUR_TURN");
  });

  it("baca CARD_NOT_IN_HAND kad igrac igra kartu koju nema", () => {
    const state = makeState({
      hands: { p0: [], p1: [card("hearts", "3")] },
    });

    expect(() => applyMove(state, makeRequest({ cardId: "clubs-5" }))).toThrow(
      "CARD_NOT_IN_HAND",
    );
  });

  it("baca CAPTURE_REQUIRED kad ima opciju a igrac probava trail", () => {
    const c7c = card("clubs", "7");
    const c7h = card("hearts", "7");
    const state = makeState({
      table: [c7h],
      hands: { p0: [], p1: [c7c] },
    });

    expect(() =>
      applyMove(
        state,
        makeRequest({
          cardId: "clubs-7",
          selectedCaptureCardIds: [],
        }),
      ),
    ).toThrow("CAPTURE_REQUIRED");
  });

  it("baca INVALID_CAPTURE_SELECTION za nelegalnu kombinaciju", () => {
    const c10 = card("clubs", "10");
    const c5 = card("hearts", "5");
    const c2 = card("spades", "2");
    const state = makeState({
      table: [c5, c2],
      hands: { p0: [], p1: [c10] },
    });

    expect(() =>
      applyMove(
        state,
        makeRequest({
          cardId: "clubs-10",
          selectedCaptureCardIds: ["hearts-5", "spades-2"],
        }),
      ),
    ).toThrow("INVALID_CAPTURE_SELECTION");
  });

  it("baca STALE_STATE kad clientKnownStateVersion nije aktuelan", () => {
    const c5 = card("clubs", "5");
    const state = makeState({
      hands: { p0: [], p1: [c5] },
      stateVersion: 10,
    });

    expect(() =>
      applyMove(
        state,
        makeRequest({
          cardId: "clubs-5",
          clientKnownStateVersion: 5,
        }),
      ),
    ).toThrow("STALE_STATE");
  });

  it("baca INVALID_GAME_PHASE kad partija nije u 'playing' fazi", () => {
    const c5 = card("clubs", "5");
    const state = makeState({
      phase: "waiting",
      hands: { p0: [], p1: [c5] },
    });

    expect(() => applyMove(state, makeRequest({ cardId: "clubs-5" }))).toThrow(
      "INVALID_GAME_PHASE",
    );
  });
});