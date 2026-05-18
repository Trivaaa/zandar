import { describe, it, expect } from "vitest";
import type { Card, GameState, Player, Rank, Suit } from "@zandar/shared-types";
import { calculateHandScore } from "./scoring";
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

function makeState(
  captured: Record<string, Card[]>,
  options?: { teamPlay?: boolean; players?: Player[] },
): GameState {
  const teamPlay = options?.teamPlay ?? false;
  const players = options?.players ?? makePlayers(2);
  return {
    roomId: "r1",
    matchId: "m1",
    phase: "scoring",
    players,
    pendingJoinRequests: [],
    reactions: [],
    dealerPlayerId: "p0",
    currentPlayerId: "p1",
    deck: [],
    table: [],
    hands: Object.fromEntries(players.map((p) => [p.id, []])),
    captured,
    handNumber: 1,
    handScores: [],
    matchScore: {},
    targetScore: 21,
    moveHistory: [],
    rulesConfig: teamPlay ? createRulesConfig(4) : createRulesConfig(2),
    stateVersion: 0,
  };
}

describe("calculateHandScore", () => {
  it("dodjeljuje 2 poena za najvise karata (jasna razlika)", () => {
    const state = makeState({
      p0: [c("hearts", "7"), c("hearts", "8"), c("hearts", "9")],
      p1: [c("spades", "7"), c("spades", "8")],
    });

    const score = calculateHandScore(state);

    expect(score.pointsByPile["p0"]).toBe(2);
    expect(score.pointsByPile["p1"]).toBe(0);
  });

  it("ne dodjeljuje 2 poena za karte ako je tie", () => {
    const state = makeState({
      p0: [c("hearts", "7"), c("hearts", "8"), c("hearts", "9")],
      p1: [c("spades", "7"), c("spades", "8"), c("spades", "9")],
    });

    const score = calculateHandScore(state);

    expect(score.pointsByPile["p0"]).toBe(0);
    expect(score.pointsByPile["p1"]).toBe(0);
    expect(score.breakdown.mostCards?.winnerPileId).toBeUndefined();
  });

  it("dodjeljuje 1 poen za najvise trefova", () => {
    const state = makeState({
      p0: [c("clubs", "7"), c("clubs", "8"), c("clubs", "9"), c("hearts", "K")],
      p1: [c("clubs", "5"), c("spades", "7"), c("spades", "8")],
    });

    const score = calculateHandScore(state);

    // p0: 4 karte, 3 trefa → +2 (karte) + 1 (trefovi) = 3
    expect(score.pointsByPile["p0"]).toBe(3);
    expect(score.pointsByPile["p1"]).toBe(0);
  });

  it("dodjeljuje 1 poen za 2 tref onome ko ga ima", () => {
    const state = makeState({
      p0: [c("clubs", "2")],
      p1: [c("hearts", "5"), c("hearts", "6")],
    });

    const score = calculateHandScore(state);

    // p0: 1 karta, 1 tref, ima 2♣ → 0 (manje karata) + 1 (tref) + 1 (2♣) = 2
    // p1: 2 karte, 0 trefova → 2 (najvise karata) + 0 + 0 = 2
    expect(score.pointsByPile["p0"]).toBe(2);
    expect(score.pointsByPile["p1"]).toBe(2);
  });

  it("dodjeljuje 1 poen za 10 karo onome ko ga ima", () => {
    const state = makeState({
      p0: [c("hearts", "5")],
      p1: [c("diamonds", "10")],
    });

    const score = calculateHandScore(state);

    // Tie za karte (1 vs 1) → 0
    // Tie za trefove (0 vs 0) → 0
    // p1 ima 10♦ → +1
    expect(score.pointsByPile["p0"]).toBe(0);
    expect(score.pointsByPile["p1"]).toBe(1);
  });

  it("ne dodjeljuje poene za 2♣ / 10♦ ako nisu pokupljeni", () => {
    const state = makeState({
      p0: [c("hearts", "7"), c("hearts", "8")],
      p1: [c("spades", "K")],
    });

    const score = calculateHandScore(state);

    expect(score.pointsByPile["p0"]).toBe(2);
    expect(score.pointsByPile["p1"]).toBe(0);
    expect(score.breakdown.twoOfClubs?.winnerPileId).toBeUndefined();
    expect(score.breakdown.tenOfDiamonds?.winnerPileId).toBeUndefined();
  });

  it("max 5 poena po ruci (sveobuhvatna pobjeda)", () => {
    const state = makeState({
      p0: [
        c("clubs", "2"), // 2♣
        c("clubs", "5"),
        c("clubs", "7"),
        c("diamonds", "10"), // 10♦
      ],
      p1: [c("hearts", "K")],
    });

    const score = calculateHandScore(state);

    // p0: najvise karata (+2) + najvise trefova (+1) + 2♣ (+1) + 10♦ (+1) = 5
    expect(score.pointsByPile["p0"]).toBe(5);
    expect(score.pointsByPile["p1"]).toBe(0);
  });

  it("breakdown sadrzi cardCount i clubCount po pile-u", () => {
    const state = makeState({
      p0: [c("clubs", "5"), c("hearts", "7")],
      p1: [c("spades", "K")],
    });

    const score = calculateHandScore(state);

    expect(score.breakdown.mostCards?.cardCountByPile).toEqual({
      p0: 2,
      p1: 1,
    });
    expect(score.breakdown.mostClubs?.clubCountByPile).toEqual({
      p0: 1,
      p1: 0,
    });
  });

  it("u 4P timskom modu, karte oba partnera se zbrajaju za tim", () => {
    const state = makeState(
      {
        "team-0": [c("hearts", "7"), c("hearts", "8"), c("hearts", "9")],
        "team-1": [c("spades", "K"), c("spades", "Q")],
      },
      { teamPlay: true, players: makePlayers(4) },
    );

    const score = calculateHandScore(state);

    expect(score.pointsByPile["team-0"]).toBe(2);
    expect(score.pointsByPile["team-1"]).toBe(0);
  });

  it("nema poena ako niko nije nista pokupio", () => {
    const state = makeState({ p0: [], p1: [] });

    const score = calculateHandScore(state);

    expect(score.pointsByPile["p0"]).toBe(0);
    expect(score.pointsByPile["p1"]).toBe(0);
  });

  it("handNumber se kopira iz state-a u HandScore", () => {
    const state = makeState({ p0: [c("hearts", "7")], p1: [] });
    state.handNumber = 3;

    const score = calculateHandScore(state);

    expect(score.handNumber).toBe(3);
  });
});