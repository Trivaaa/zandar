import { describe, it, expect } from "vitest";
import type { Card, GameState, Player, Rank, Suit } from "@zandar/shared-types";
import { autoPlay, findAutoPlayMove } from "./autoplay";
import { createRulesConfig } from "./rules";

function c(suit: Suit, rank: Rank): Card {
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

function makeState(overrides?: Partial<GameState>): GameState {
  const base: GameState = {
    roomId: "r1",
    matchId: "m1",
    phase: "playing",
    players: makePlayers(2),
    pendingJoinRequests: [],
    reactions: [],
    dealerPlayerId: "p0",
    currentPlayerId: "p1",
    deck: [],
    table: [],
    hands: { p0: [c("hearts", "K")], p1: [] }, // p0 ima karte da hand-ovi ne budu prazni
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

describe("findAutoPlayMove", () => {
  it("preferira capture nad trail-om", () => {
    const state = makeState({
      table: [c("hearts", "7")],
      hands: { p0: [c("hearts", "K")], p1: [c("clubs", "7"), c("spades", "5")] },
    });

    const move = findAutoPlayMove(state, "p1");

    // 7 moze pokupiti 7 sa stola (rank match)
    expect(move.cardId).toBe("clubs-7");
    expect(move.selectedCaptureCardIds).toEqual(["hearts-7"]);
  });

  it("cuva J kad postoje druge capture opcije", () => {
    const state = makeState({
      table: [c("hearts", "7")],
      hands: {
        p0: [c("hearts", "K")],
        p1: [c("clubs", "7"), c("spades", "J")], // i 7 i J mogu kupiti
      },
    });

    const move = findAutoPlayMove(state, "p1");

    // Preferira 7 (priority 7) nad J (priority 80)
    expect(move.cardId).toBe("clubs-7");
  });

  it("cuva 2♣ od trail-a kad ima druge karte", () => {
    const state = makeState({
      table: [], // prazno - moze samo trail
      hands: {
        p0: [c("hearts", "K")],
        p1: [c("clubs", "2"), c("spades", "5")], // 2♣ i 5
      },
    });

    const move = findAutoPlayMove(state, "p1");

    // Trail sa 5 (priority 5), ne 2♣ (priority 100)
    expect(move.cardId).toBe("spades-5");
    expect(move.selectedCaptureCardIds).toEqual([]);
  });

  it("trail sa najnizom numerickom kartom", () => {
    const state = makeState({
      table: [c("hearts", "K")], // K na stolu, nema sta da se kupi sa 5/7/9
      hands: {
        p0: [c("hearts", "Q")],
        p1: [c("clubs", "9"), c("spades", "7"), c("diamonds", "5")],
      },
    });

    const move = findAutoPlayMove(state, "p1");

    // Najniza je 5
    expect(move.cardId).toBe("diamonds-5");
  });

  it("baca gresku kad igrac nema karata", () => {
    const state = makeState({
      hands: { p0: [c("hearts", "K")], p1: [] },
    });

    expect(() => findAutoPlayMove(state, "p1")).toThrow();
  });

  it("kad mora igrati J (jedina karta), igra J", () => {
    const state = makeState({
      table: [c("hearts", "5"), c("spades", "9")],
      hands: { p0: [c("hearts", "K")], p1: [c("clubs", "J")] },
    });

    const move = findAutoPlayMove(state, "p1");

    expect(move.cardId).toBe("clubs-J");
    expect(move.selectedCaptureCardIds).toEqual(
      expect.arrayContaining(["hearts-5", "spades-9"]),
    );
  });
});

describe("autoPlay", () => {
  it("primjenjuje potez i oznaci ga kao isAutoPlay", () => {
    const state = makeState({
      table: [c("hearts", "7")],
      hands: {
        p0: [c("hearts", "K"), c("diamonds", "K")],
        p1: [c("clubs", "7")],
      },
    });

    autoPlay(state);

    expect(state.moveHistory).toHaveLength(1);
    expect(state.moveHistory[0]?.isAutoPlay).toBe(true);
  });

  it("inkrementira consecutiveAutoPlays counter", () => {
    const state = makeState({
      hands: { p0: [c("hearts", "K"), c("diamonds", "K")], p1: [c("clubs", "5")] },
    });

    autoPlay(state);

    expect(state.players[1]?.consecutiveAutoPlays).toBe(1);
  });

  it("nakon 3 uzastopna auto-play, counter je 3", () => {
    // Postaviti tako da ima dovoljno karata za 3 poteza
    const state = makeState({
      hands: {
        p0: [c("hearts", "K"), c("hearts", "Q"), c("hearts", "J")],
        p1: [c("clubs", "2"), c("clubs", "3"), c("clubs", "4")],
      },
    });

    // 3 uzastopna auto-play (svaki put se mijenja current player ali ok)
    autoPlay(state);
    state.currentPlayerId = "p1"; // forsiramo p1 da uvijek igra
    autoPlay(state);
    state.currentPlayerId = "p1";
    autoPlay(state);

    expect(state.players[1]?.consecutiveAutoPlays).toBe(3);
  });
});