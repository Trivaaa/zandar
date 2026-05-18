import { describe, it, expect } from "vitest";
import type { Card, GameState, Player, Rank, Suit } from "@zandar/shared-types";
import { advanceTurnOrPhase, finishHand, getMatchWinner } from "./phase";
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
    hands: { p0: [], p1: [] },
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

describe("advanceTurnOrPhase", () => {
  it("rotira na sljedeceg igraca kad neko jos ima karte u ruci", () => {
    const state = makeState({
      currentPlayerId: "p1",
      hands: { p0: [c("hearts", "5")], p1: [] },
    });

    advanceTurnOrPhase(state);

    expect(state.currentPlayerId).toBe("p0");
    expect(state.phase).toBe("playing");
  });

  it("rotira clockwise kroz 4 igraca", () => {
    const state = makeState({
      players: makePlayers(4),
      currentPlayerId: "p2",
      hands: { p0: [], p1: [], p2: [], p3: [c("hearts", "5")] },
      captured: { "team-0": [], "team-1": [] },
      matchScore: { "team-0": 0, "team-1": 0 },
      rulesConfig: createRulesConfig(4),
    });

    advanceTurnOrPhase(state);

    expect(state.currentPlayerId).toBe("p3");
  });

  it("dijeli novu rundu kad su sve ruke prazne ali spil ima karte", () => {
    const deckCards: Card[] = [];
    for (const rank of ["2", "3", "4", "5", "6", "7", "8", "9"] as Rank[]) {
      deckCards.push(c("hearts", rank));
    }
    const state = makeState({
      currentPlayerId: "p1",
      hands: { p0: [], p1: [] },
      deck: deckCards,
    });

    advanceTurnOrPhase(state);

    expect(state.hands["p0"]).toHaveLength(4);
    expect(state.hands["p1"]).toHaveLength(4);
    expect(state.deck).toHaveLength(0);
    expect(state.currentPlayerId).toBe("p1");
    expect(state.phase).toBe("playing");
  });

  it("zavrsava ruku kad su sve ruke prazne i spil prazan", () => {
    const state = makeState({
      currentPlayerId: "p1",
      hands: { p0: [], p1: [] },
      deck: [],
    });

    advanceTurnOrPhase(state);

    expect(state.phase).toBe("hand_finished");
    expect(state.handScores).toHaveLength(1);
  });
});

describe("finishHand", () => {
  it("daje preostale karte sa stola posljednjem capturer-u", () => {
    const state = makeState({
      table: [c("hearts", "5"), c("spades", "8")],
      lastCapturePlayerId: "p0",
      captured: { p0: [c("clubs", "K")], p1: [] },
    });

    finishHand(state);

    expect(state.table).toEqual([]);
    expect(state.captured["p0"]).toEqual([
      c("clubs", "K"),
      c("hearts", "5"),
      c("spades", "8"),
    ]);
  });

  it("daje preostale karte dealeru ako niko nije kupio (fallback)", () => {
    const state = makeState({
      dealerPlayerId: "p0",
      table: [c("hearts", "5"), c("spades", "8")],
      lastCapturePlayerId: undefined, // niko nije kupio
      captured: { p0: [], p1: [] },
    });

    finishHand(state);

    expect(state.table).toEqual([]);
    expect(state.captured["p0"]).toEqual([c("hearts", "5"), c("spades", "8")]);
  });

  it("racuna handScore i dodaje u handScores", () => {
    const state = makeState({
      table: [],
      captured: {
        p0: [c("clubs", "2"), c("hearts", "K")],
        p1: [c("spades", "A")],
      },
    });

    finishHand(state);

    expect(state.handScores).toHaveLength(1);
    expect(state.handScores[0]?.pointsByPile["p0"]).toBeGreaterThan(0);
  });

  it("azurira match score sa novim poenima", () => {
    const state = makeState({
      table: [],
      captured: {
        p0: [c("clubs", "2"), c("clubs", "5"), c("hearts", "K")],
        p1: [c("spades", "A")],
      },
      matchScore: { p0: 5, p1: 3 },
    });

    finishHand(state);

    // p0 dobija najvise karata (+2), najvise trefova (+1), 2♣ (+1) = 4
    // 5 + 4 = 9
    expect(state.matchScore["p0"]).toBeGreaterThan(5);
  });

  it("postavlja phase na hand_finished kad niko nije dostigao target", () => {
    const state = makeState({
      table: [],
      captured: { p0: [c("hearts", "K")], p1: [] },
      matchScore: { p0: 5, p1: 3 },
      targetScore: 21,
    });

    finishHand(state);

    expect(state.phase).toBe("hand_finished");
  });

  it("postavlja phase na match_finished kad neko dostigne target", () => {
    const state = makeState({
      table: [],
      captured: {
        p0: [c("clubs", "2"), c("clubs", "5"), c("diamonds", "10")],
        p1: [c("hearts", "K")],
      },
      matchScore: { p0: 19, p1: 5 }, // p0 vec ima 19
      targetScore: 21,
    });

    finishHand(state);

    // p0 dobija dodatne poene i prelazi 21
    expect(state.matchScore["p0"]).toBeGreaterThanOrEqual(21);
    expect(state.phase).toBe("match_finished");
  });

  it("u 4P timskom modu, table ide u team pile (posljednji capturer pravilo)", () => {
    const state = makeState({
      players: makePlayers(4),
      dealerPlayerId: "p0",
      table: [c("hearts", "5")],
      lastCapturePlayerId: "p1", // p1 je tim 1
      captured: { "team-0": [], "team-1": [c("clubs", "K")] },
      matchScore: { "team-0": 0, "team-1": 0 },
      rulesConfig: createRulesConfig(4),
    });

    finishHand(state);

    // 5 ide u team-1 (gdje je p1)
    expect(state.captured["team-1"]).toContainEqual(c("hearts", "5"));
    expect(state.captured["team-0"]).toEqual([]);
  });

  it("ne radi nista sa stolom ako je vec prazan", () => {
    const state = makeState({
      table: [],
      captured: { p0: [c("hearts", "K")], p1: [] },
    });

    finishHand(state);

    expect(state.table).toEqual([]);
    expect(state.captured["p0"]).toEqual([c("hearts", "K")]);
  });
});

describe("getMatchWinner", () => {
  it("vraca pile ID kad je dostignut target score", () => {
    const state = makeState({
      matchScore: { p0: 21, p1: 15 },
      targetScore: 21,
    });

    expect(getMatchWinner(state)).toBe("p0");
  });

  it("vraca undefined kad jos niko nije dostigao target", () => {
    const state = makeState({
      matchScore: { p0: 15, p1: 18 },
      targetScore: 21,
    });

    expect(getMatchWinner(state)).toBeUndefined();
  });

  it("vraca pile ID i kad je vrijednost iznad targeta", () => {
    const state = makeState({
      matchScore: { p0: 25, p1: 10 },
      targetScore: 21,
    });

    expect(getMatchWinner(state)).toBe("p0");
  });
});