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

/** Helper za kreiranje request-a. */
function move(
  state: GameState,
  playerId: string,
  cardId: string,
  selectedCaptureCardIds: string[] = [],
): PlayCardRequest {
  return {
    roomId: state.roomId,
    playerId,
    cardId,
    selectedCaptureCardIds,
    clientMoveId: `move-${state.stateVersion}`,
    clientKnownStateVersion: state.stateVersion,
  };
}

describe("Integration: kompletna ruka 2P", () => {
  it("igra kompletnu ruku sa kontrolisanim kartama i racuna pravi score", () => {
    // SETUP: pretrpan scenario sa svim tipovima poteza (rank, sum, J, trail)
    const state: GameState = {
      roomId: "r1",
      matchId: "m1",
      phase: "playing",
      players: makePlayers(2),
      pendingJoinRequests: [],
      reactions: [],
      dealerPlayerId: "p0",
      currentPlayerId: "p1", // p1 igra prvi (lijevo od dealera p0)
      deck: [], // spil prazan, samo jedna runda
      table: [c("hearts", "7"), c("spades", "5"), c("diamonds", "3"), c("clubs", "K")],
      hands: {
        p0: [c("clubs", "2"), c("clubs", "7"), c("hearts", "J"), c("spades", "4")],
        p1: [c("clubs", "5"), c("diamonds", "10"), c("clubs", "8"), c("hearts", "A")],
      },
      captured: { p0: [], p1: [] },
      handNumber: 1,
      handScores: [],
      matchScore: { p0: 0, p1: 0 },
      targetScore: 21,
      moveHistory: [],
      rulesConfig: createRulesConfig(2),
      stateVersion: 0,
    };

    // MOVE 1: p1 igra 5♣ → rank match 5♠
    applyMove(
      state,
      move(state, "p1", "clubs-5", ["spades-5"]),
    );
    expect(state.captured["p1"]).toHaveLength(2);
    expect(state.lastCapturePlayerId).toBe("p1");
    expect(state.currentPlayerId).toBe("p0");

    // MOVE 2: p0 igra 2♣ → trail (nema sume)
    applyMove(state, move(state, "p0", "clubs-2", []));
    expect(state.table).toContainEqual(c("clubs", "2"));
    expect(state.currentPlayerId).toBe("p1");

    // MOVE 3: p1 igra 8♣ → trail (nema sume; 7+? = 8 nema A na stolu)
    applyMove(state, move(state, "p1", "clubs-8", []));
    expect(state.table).toContainEqual(c("clubs", "8"));

    // MOVE 4: p0 igra 7♣ → rank match 7♥
    applyMove(
      state,
      move(state, "p0", "clubs-7", ["hearts-7"]),
    );
    expect(state.captured["p0"]).toHaveLength(2);
    expect(state.lastCapturePlayerId).toBe("p0");

    // MOVE 5: p1 igra 10♦ → sum capture 2♣+8♣ = 10
    applyMove(
      state,
      move(state, "p1", "diamonds-10", ["clubs-2", "clubs-8"]),
    );
    expect(state.captured["p1"]).toHaveLength(5); // 5♣, 5♠, 10♦, 2♣, 8♣
    expect(state.lastCapturePlayerId).toBe("p1");

    // MOVE 6: p0 igra J♥ → jack clear (kupi 3♦ + K♣)
    applyMove(
      state,
      move(state, "p0", "hearts-J", ["diamonds-3", "clubs-K"]),
    );
    expect(state.captured["p0"]).toHaveLength(5); // 7♣, 7♥, J♥, 3♦, K♣
    expect(state.table).toEqual([]);
    expect(state.lastCapturePlayerId).toBe("p0");

    // MOVE 7: p1 igra A♥ → trail (sto prazan)
    applyMove(state, move(state, "p1", "hearts-A", []));
    expect(state.table).toEqual([c("hearts", "A")]);

    // MOVE 8: p0 igra 4♠ → trail (nema kombinacije za 4)
    applyMove(state, move(state, "p0", "spades-4", []));

    // HAND END: sve ruke prazne, spil prazan
    // Posljednji capturer (p0) dobija ostatak stola (A♥ + 4♠)
    expect(state.phase).toBe("hand_finished");
    expect(state.captured["p0"]).toHaveLength(7); // 5 + A♥ + 4♠
    expect(state.captured["p1"]).toHaveLength(5);
    expect(state.table).toEqual([]);

    // SCORING:
    // - Najvise karata: p0 (7 > 5) → +2 za p0
    // - Najvise trefova: p0 ima 7♣, K♣ = 2; p1 ima 5♣, 2♣, 8♣ = 3 → +1 za p1
    // - 2♣: p1 → +1 za p1
    // - 10♦: p1 → +1 za p1
    // p0 = 2, p1 = 3, ukupno 5
    expect(state.matchScore["p0"]).toBe(2);
    expect(state.matchScore["p1"]).toBe(3);
    expect(state.handScores).toHaveLength(1);

    const breakdown = state.handScores[0]?.breakdown;
    expect(breakdown?.mostCards?.winnerPileId).toBe("p0");
    expect(breakdown?.mostClubs?.winnerPileId).toBe("p1");
    expect(breakdown?.twoOfClubs?.winnerPileId).toBe("p1");
    expect(breakdown?.tenOfDiamonds?.winnerPileId).toBe("p1");
  });
});

describe("Integration: 4P team scoring", () => {
  it("captures se zbrajaju po timu, ne po individualnom igracu", () => {
    // Setup: svaki igrac ima 1 kartu, sve hvataju 1 kartu sa stola
    const state: GameState = {
      roomId: "r1",
      matchId: "m1",
      phase: "playing",
      players: makePlayers(4),
      pendingJoinRequests: [],
      reactions: [],
      dealerPlayerId: "p0",
      currentPlayerId: "p1",
      deck: [],
      table: [
        c("hearts", "7"),
        c("hearts", "K"),
        c("hearts", "2"),
        c("hearts", "10"),
      ],
      hands: {
        p0: [c("clubs", "7")], // p0 (team-0) → 7♥
        p1: [c("diamonds", "K")], // p1 (team-1) → K♥
        p2: [c("clubs", "2")], // p2 (team-0) → 2♥
        p3: [c("clubs", "10")], // p3 (team-1) → 10♥
      },
      captured: { "team-0": [], "team-1": [] },
      handNumber: 1,
      handScores: [],
      matchScore: { "team-0": 0, "team-1": 0 },
      targetScore: 21,
      moveHistory: [],
      rulesConfig: createRulesConfig(4),
      stateVersion: 0,
    };

    // p1 (team-1): K♦ kupi K♥
    applyMove(state, move(state, "p1", "diamonds-K", ["hearts-K"]));
    // p2 (team-0): 2♣ kupi 2♥
    applyMove(state, move(state, "p2", "clubs-2", ["hearts-2"]));
    // p3 (team-1): 10♣ kupi 10♥
    applyMove(state, move(state, "p3", "clubs-10", ["hearts-10"]));
    // p0 (team-0): 7♣ kupi 7♥
    applyMove(state, move(state, "p0", "clubs-7", ["hearts-7"]));

    // Sve ruke prazne, spil prazan, sto prazan → hand_finished
    expect(state.phase).toBe("hand_finished");

    // Team-0 ima 4 karte (p0 + p2 kupili po 2): 7♣, 7♥, 2♣, 2♥
    expect(state.captured["team-0"]).toHaveLength(4);
    // Team-1 ima 4 karte (p1 + p3 kupili po 2): K♦, K♥, 10♣, 10♥
    expect(state.captured["team-1"]).toHaveLength(4);

    // Scoring:
    // - Najvise karata: tie (4 vs 4) → niko ne dobija 2 poena
    // - Najvise trefova: team-0 ima 7♣, 2♣ = 2; team-1 ima 10♣ = 1 → +1 team-0
    // - 2♣: team-0 → +1
    // - 10♦: nije pokupljen → 0
    expect(state.matchScore["team-0"]).toBe(2);
    expect(state.matchScore["team-1"]).toBe(0);
  });
});

describe("Integration: match end detection", () => {
  it("postavlja phase na match_finished kad neko dostigne target", () => {
    // Scenario: p0 vec ima 19 poena, hand mu daje barem 2 → match end
    const state: GameState = {
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
      hands: { p0: [], p1: [c("hearts", "5")] },
      captured: {
        p0: [
          c("clubs", "2"),
          c("clubs", "5"),
          c("clubs", "7"),
          c("diamonds", "10"),
          c("hearts", "K"),
        ],
        p1: [],
      },
      handNumber: 3,
      handScores: [],
      matchScore: { p0: 19, p1: 10 }, // p0 blizu pobjede
      targetScore: 21,
      moveHistory: [],
      rulesConfig: createRulesConfig(2),
      stateVersion: 0,
    };

    // p1 odigra 5♥ → trail (sto prazan, nista da se kupi)
    applyMove(state, move(state, "p1", "hearts-5", []));

    // Sve ruke prazne, spil prazan, finishHand izvrsen
    // p0 ima sve poene (najvise karata, najvise trefova, 2♣, 10♦) = 5
    // 19 + 5 = 24 >= 21 → match_finished
    expect(state.phase).toBe("match_finished");
    expect(state.matchScore["p0"]).toBeGreaterThanOrEqual(21);
  });
});