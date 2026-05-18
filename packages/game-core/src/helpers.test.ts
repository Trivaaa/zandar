import { describe, it, expect } from "vitest";
import type { Card, GameState, Player, Rank } from "@zandar/shared-types";
import {
  getCapturePileId,
  getNextPlayerId,
  getNumericValue,
  getPlayerLeftOfDealer,
  sameSet,
} from "./helpers";
import { createRulesConfig } from "./rules";

/** Pomocna funkcija za kreiranje karte u testu. */
function card(rank: Rank): Card {
  return { id: `clubs-${rank}`, suit: "clubs", rank };
}

/** Pomocna funkcija za kreiranje minimalnog GameState-a za testove. */
function makeTestState(playerCount: 2 | 3 | 4): GameState {
  const players: Player[] = [];
  for (let i = 0; i < playerCount; i++) {
    players.push({
      id: `p${i}`,
      displayName: `Player ${i}`,
      seatIndex: i,
      teamId: playerCount === 4 ? i % 2 : undefined,
      connectionStatus: "connected",
      isHost: i === 0,
      consecutiveAutoPlays: 0,
    });
  }
  return {
    roomId: "room1",
    matchId: "match1",
    phase: "playing",
    players,
    pendingJoinRequests: [],
    reactions: [],
    dealerPlayerId: "p0",
    currentPlayerId: "p1",
    deck: [],
    table: [],
    hands: {},
    captured: {},
    handNumber: 1,
    handScores: [],
    matchScore: {},
    targetScore: 21,
    moveHistory: [],
    rulesConfig: createRulesConfig(playerCount),
    stateVersion: 0,
  };
}

describe("getNumericValue", () => {
  it("vraca 1 za asa", () => {
    expect(getNumericValue(card("A"))).toBe(1);
  });

  it("vraca nominalnu vrijednost za 2-10", () => {
    const ranks: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9", "10"];
    for (const rank of ranks) {
      expect(getNumericValue(card(rank))).toBe(Number(rank));
    }
  });

  it("vraca null za J, Q, K", () => {
    expect(getNumericValue(card("J"))).toBeNull();
    expect(getNumericValue(card("Q"))).toBeNull();
    expect(getNumericValue(card("K"))).toBeNull();
  });
});

describe("getCapturePileId", () => {
  it("u 2P modu vraca playerId", () => {
    const state = makeTestState(2);
    expect(getCapturePileId(state, "p0")).toBe("p0");
    expect(getCapturePileId(state, "p1")).toBe("p1");
  });

  it("u 3P modu vraca playerId", () => {
    const state = makeTestState(3);
    expect(getCapturePileId(state, "p2")).toBe("p2");
  });

  it("u 4P modu vraca team ID", () => {
    const state = makeTestState(4);
    // Sjediste 0 i 2 su tim 0; 1 i 3 su tim 1
    expect(getCapturePileId(state, "p0")).toBe("team-0");
    expect(getCapturePileId(state, "p2")).toBe("team-0");
    expect(getCapturePileId(state, "p1")).toBe("team-1");
    expect(getCapturePileId(state, "p3")).toBe("team-1");
  });
});

describe("getNextPlayerId", () => {
  it("vraca sljedeceg igraca clockwise", () => {
    const state = makeTestState(4);
    state.currentPlayerId = "p0";
    expect(getNextPlayerId(state)).toBe("p1");
    state.currentPlayerId = "p2";
    expect(getNextPlayerId(state)).toBe("p3");
  });

  it("vraca se na pocetak kad dodje do kraja", () => {
    const state = makeTestState(4);
    state.currentPlayerId = "p3"; // posljednji
    expect(getNextPlayerId(state)).toBe("p0"); // krug se zatvara
  });

  it("radi u 2P modu", () => {
    const state = makeTestState(2);
    state.currentPlayerId = "p0";
    expect(getNextPlayerId(state)).toBe("p1");
    state.currentPlayerId = "p1";
    expect(getNextPlayerId(state)).toBe("p0");
  });
});

describe("getPlayerLeftOfDealer", () => {
  it("vraca igraca lijevo od dealera (clockwise jedno mjesto)", () => {
    const state = makeTestState(4);
    state.dealerPlayerId = "p0";
    expect(getPlayerLeftOfDealer(state)).toBe("p1");
    state.dealerPlayerId = "p3";
    expect(getPlayerLeftOfDealer(state)).toBe("p0"); // krug
  });

  it("radi u 2P modu", () => {
    const state = makeTestState(2);
    state.dealerPlayerId = "p0";
    expect(getPlayerLeftOfDealer(state)).toBe("p1");
  });
});

describe("sameSet", () => {
  it("vraca true za iste elemente u razlicitom redoslijedu", () => {
    expect(sameSet(["a", "b"], ["b", "a"])).toBe(true);
  });

  it("vraca true za prazne nizove", () => {
    expect(sameSet([], [])).toBe(true);
  });

  it("vraca false kad drugi niz ima vise elemenata", () => {
    expect(sameSet(["a", "b"], ["a", "b", "c"])).toBe(false);
  });

  it("vraca false kad element nedostaje", () => {
    expect(sameSet(["a", "b"], ["a", "c"])).toBe(false);
  });
});