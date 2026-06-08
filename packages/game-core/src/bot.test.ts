import { describe, it, expect } from "vitest";
import type { Card, GameState, Player, Rank, Suit } from "@zandar/shared-types";
import { selectBotMove, DEFAULT_BOT_CONFIGS, type BotConfig, type BotWeights } from "./bot";
import { applyMove } from "./move";
import { createInitialGameState } from "./deal";
import { createRulesConfig } from "./rules";

// ====================================================
// TEST HELPERS
// ====================================================

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
    hands: { p0: [c("hearts", "K")], p1: [] },
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

/** LCG seeded RNG — isti algoritam koji koristi shuffle.ts */
function makeLcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// ====================================================
// FORCE-CAPTURE
// ====================================================

describe("selectBotMove — force-capture", () => {
  it("nikad ne trailuje kada je capture dostupan (forceCapture=true)", () => {
    const state = makeState({
      table: [c("hearts", "7")],
      hands: {
        p0: [c("hearts", "K")],
        p1: [c("clubs", "7"), c("spades", "3")],
      },
    });

    for (let i = 0; i < 20; i++) {
      const { selectedCaptureCardIds } = selectBotMove(
        state,
        "p1",
        DEFAULT_BOT_CONFIGS[1],
        makeLcg(i),
      );
      expect(selectedCaptureCardIds.length).toBeGreaterThan(0);
    }
  });

  it("može trailovati kada nema capture opcija", () => {
    const state = makeState({
      table: [c("hearts", "K")],
      hands: {
        p0: [c("spades", "Q")],
        p1: [c("clubs", "5"), c("spades", "3")],
      },
    });

    const { selectedCaptureCardIds } = selectBotMove(
      state,
      "p1",
      DEFAULT_BOT_CONFIGS[2],
      makeLcg(1),
    );
    expect(selectedCaptureCardIds).toEqual([]);
  });
});

// ====================================================
// LEGAL MOVES (applyMove provjera)
// ====================================================

describe("selectBotMove — legalnost", () => {
  it("svaki odabrani potez prolazi kroz applyMove bez greške", () => {
    const configs = [
      DEFAULT_BOT_CONFIGS[1],
      DEFAULT_BOT_CONFIGS[2],
      DEFAULT_BOT_CONFIGS[3],
    ];

    for (const config of configs) {
      for (let seed = 0; seed < 15; seed++) {
        const state = makeState({
          table: [c("hearts", "7"), c("clubs", "3")],
          hands: {
            p0: [c("hearts", "K")],
            p1: [c("clubs", "7"), c("diamonds", "4"), c("spades", "J")],
          },
        });

        const { cardId, selectedCaptureCardIds } = selectBotMove(
          state,
          "p1",
          config,
          makeLcg(seed),
        );

        expect(() =>
          applyMove(state, {
            roomId: "r1",
            playerId: "p1",
            cardId,
            selectedCaptureCardIds,
            clientMoveId: `test-${seed}`,
            clientKnownStateVersion: state.stateVersion,
          }),
        ).not.toThrow();
      }
    }
  });
});

// ====================================================
// BLUNDER PROBABILITY
// ====================================================

describe("selectBotMove — blunderP", () => {
  // Setup: table ima 3 karte, ruka ima 3 karte koje mogu kupiti po jednu svaku.
  // spades-10 kupuje diamonds-10 (BEST: dobiva 10♦ bonus) ili sum [hearts-7+clubs-3].
  // clubs-7 kupuje hearts-7. diamonds-3 kupuje clubs-3.
  // Sa 4 legalna poteza i jasnim bestom, blunder uvijek bira od ne-best opcija.
  function makeBlunderState(): GameState {
    return makeState({
      table: [c("hearts", "7"), c("diamonds", "10"), c("clubs", "3")],
      hands: {
        p0: [c("spades", "K")],
        p1: [c("clubs", "7"), c("spades", "10"), c("diamonds", "3")],
      },
    });
  }

  it("sa blunderP=1.0 uvijek bira suboptimalan potez — raznolikost izbora kroz sids", () => {
    const alwaysBlunderConfig: BotConfig = {
      ...DEFAULT_BOT_CONFIGS[3],
      blunderP: 1.0,
      noise: 0,
    };

    const choices = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      const state = makeBlunderState();
      const { cardId } = selectBotMove(state, "p1", alwaysBlunderConfig, makeLcg(seed));
      choices.add(cardId);
    }
    // Uz 3 suboptimalna izbora (clubs-7, spades-10-sum, diamonds-3), trebalo bi vidjeti >1
    expect(choices.size).toBeGreaterThan(1);
  });

  it("sa blunderP=0 i noise=0 uvijek bira isti (optimalni) potez", () => {
    const deterministicConfig: BotConfig = {
      ...DEFAULT_BOT_CONFIGS[3],
      blunderP: 0,
      noise: 0,
    };

    const results = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const state = makeBlunderState();
      const { cardId, selectedCaptureCardIds } = selectBotMove(
        state,
        "p1",
        deterministicConfig,
        makeLcg(i),
      );
      results.add(`${cardId}:${selectedCaptureCardIds.join(",")}`);
    }

    // Uvijek isti potez — spades-10 kupuje diamonds-10
    expect(results.size).toBe(1);
    expect([...results][0]).toContain("spades-10");
  });

  it("deterministički: isti seed → isti potez", () => {
    const state1 = makeBlunderState();
    const state2 = makeBlunderState();

    const r1 = selectBotMove(state1, "p1", DEFAULT_BOT_CONFIGS[1], makeLcg(42));
    const r2 = selectBotMove(state2, "p1", DEFAULT_BOT_CONFIGS[1], makeLcg(42));

    expect(r1).toEqual(r2);
  });
});

// ====================================================
// JACK TIMING
// ====================================================

describe("selectBotMove — jack timing", () => {
  it("tier 1 igra J na siromašnom stolu (jackTimingThreshold=0)", () => {
    // Tier 1: threshold=0 → jackTimingValue uvijek pozitivan → J je atraktivan
    // Ima i rank match opciju (clubs-7 kupuje hearts-7), ali J nosi više karata
    const state = makeState({
      table: [c("hearts", "7"), c("clubs", "3")],
      hands: {
        p0: [c("hearts", "K")],
        p1: [c("clubs", "7"), c("spades", "J")],
      },
    });

    const deterministicTier1: BotConfig = { ...DEFAULT_BOT_CONFIGS[1], noise: 0, blunderP: 0 };
    const { cardId } = selectBotMove(state, "p1", deterministicTier1, makeLcg(1));

    // Tier 1 preferira J (3 karte + pozitivan jackTimingValue) nad clubs-7 (2 karte)
    expect(cardId).toBe("spades-J");
  });

  it("tier 3 preferira rank match nad J-om na siromašnom stolu", () => {
    // Tier 3: jackTimingThreshold=5, assessTableValue([hearts-7, clubs-3]) = 2+0.5 = 2.5 < 5
    // → jackTimingValue = -weights.jackSweep (negativna kazna)
    // clubs-7 capture hearts-7: score = 2*1 + 1*1.5 = 3.5
    // spades-J jack-clear: score = 3*1 + 1*1.5 + (-3.0) = 1.5
    // Tier 3 bira clubs-7
    const state = makeState({
      table: [c("hearts", "7"), c("clubs", "3")],
      hands: {
        p0: [c("hearts", "K")],
        p1: [c("clubs", "7"), c("spades", "J")],
      },
    });

    const deterministicTier3: BotConfig = { ...DEFAULT_BOT_CONFIGS[3], noise: 0, blunderP: 0 };
    const { cardId } = selectBotMove(state, "p1", deterministicTier3, makeLcg(1));

    expect(cardId).toBe("clubs-7");
  });

  it("tier 3 igra J na bogatom stolu (2♣ + 10♦ prisutni)", () => {
    // assessTableValue([clubs-2, diamonds-10, hearts-2]) = 3 + 2 + 2 + 0.5 = 7.5 >= 5
    // clubs-J jack-clear: 4 karte + twoClubs + tenDiamonds + jackTimingValue(+3) → izuzetno visok skor
    // spades-2 capture clubs-2: daleko niži skor
    const state = makeState({
      table: [c("clubs", "2"), c("diamonds", "10"), c("hearts", "2")],
      hands: {
        p0: [c("hearts", "K")],
        p1: [c("clubs", "J"), c("spades", "2")],
      },
    });

    const deterministicTier3: BotConfig = { ...DEFAULT_BOT_CONFIGS[3], noise: 0, blunderP: 0 };
    const { cardId } = selectBotMove(state, "p1", deterministicTier3, makeLcg(1));

    expect(cardId).toBe("clubs-J");
  });

  it("kad je J jedina opcija, svaki tier igra J", () => {
    const state = makeState({
      table: [c("hearts", "5"), c("spades", "9")],
      hands: {
        p0: [c("hearts", "K")],
        p1: [c("clubs", "J")],
      },
    });

    for (const tier of [1, 2, 3] as const) {
      const { cardId, selectedCaptureCardIds } = selectBotMove(
        state,
        "p1",
        DEFAULT_BOT_CONFIGS[tier],
        makeLcg(1),
      );
      expect(cardId).toBe("clubs-J");
      expect(selectedCaptureCardIds).toEqual(
        expect.arrayContaining(["hearts-5", "spades-9"]),
      );
    }
  });
});

// ====================================================
// DEFENSE (tier 3)
// ====================================================

describe("selectBotMove — defense (tier 3)", () => {
  // Scenarij: weights.cards=0 i weights.clubs=0 → karte u pile ne donose skor.
  // Capture i trails su izjednačeni po broju karata.
  // Jedina razlika: tier 3 kažnjava trail koji kreira rank par na stolu (-1.5 penali).
  //
  // Table: [clubs-Q]. Hand: [spades-5, diamonds-Q] (u ovom redoslijedu).
  // Legalni potezi (forceCapture=false):
  //   1. diamonds-Q capture clubs-Q       → score 0 (nije trail)
  //   2. spades-5 trail                   → score 0 (nema 5 na stolu)
  //   3. diamonds-Q trail                 → score -1.5 (tier 3) ili 0 (tier 1, bez defense)
  //
  // argmax s `>=` (bira zadnji s max skorom):
  //   Tier 3: [0, 0, -1.5] → picks spades-5 (index 1, zadnji max)
  //   Tier 1: [0, 0,  0.0] → picks diamonds-Q trail (index 2, zadnji max)

  const zeroWeights: BotWeights = {
    cards: 0,
    clubs: 0,
    twoClubs: 0,
    tenDiamonds: 0,
    jackSweep: 0,
    defense: 1.5,
  };

  it("tier 3 sa useDefense=true izbjegava trail koji kreira rank par", () => {
    const state = makeState({
      table: [c("clubs", "Q")],
      hands: {
        p0: [c("hearts", "K")],
        p1: [c("spades", "5"), c("diamonds", "Q")],
      },
      rulesConfig: createRulesConfig(2, { forceCapture: false }),
    });

    const tier3Config: BotConfig = {
      ...DEFAULT_BOT_CONFIGS[3],
      noise: 0,
      blunderP: 0,
      weights: zeroWeights,
    };

    const { cardId } = selectBotMove(state, "p1", tier3Config, makeLcg(1));

    // Tier 3 bira spades-5 trail (score 0) umjesto diamonds-Q trail (score -1.5)
    expect(cardId).toBe("spades-5");
  });

  it("tier 1 bez useDefense bira diamonds-Q trail (zadnji s max 0 scorom)", () => {
    const state = makeState({
      table: [c("clubs", "Q")],
      hands: {
        p0: [c("hearts", "K")],
        p1: [c("spades", "5"), c("diamonds", "Q")],
      },
      rulesConfig: createRulesConfig(2, { forceCapture: false }),
    });

    const tier1Config: BotConfig = {
      ...DEFAULT_BOT_CONFIGS[1],
      noise: 0,
      blunderP: 0,
      useDefense: false,
      weights: zeroWeights,
    };

    const { cardId } = selectBotMove(state, "p1", tier1Config, makeLcg(1));

    // Tier 1: svi skor 0 → argmax bira zadnji = diamonds-Q trail
    expect(cardId).toBe("diamonds-Q");
  });

  it("tier 1 i tier 3 se razlikuju u ovom scenariju", () => {
    const stateT1 = makeState({
      table: [c("clubs", "Q")],
      hands: { p0: [c("hearts", "K")], p1: [c("spades", "5"), c("diamonds", "Q")] },
      rulesConfig: createRulesConfig(2, { forceCapture: false }),
    });
    const stateT3 = makeState({
      table: [c("clubs", "Q")],
      hands: { p0: [c("hearts", "K")], p1: [c("spades", "5"), c("diamonds", "Q")] },
      rulesConfig: createRulesConfig(2, { forceCapture: false }),
    });

    const tier1Config: BotConfig = { ...DEFAULT_BOT_CONFIGS[1], noise: 0, blunderP: 0, useDefense: false, weights: zeroWeights };
    const tier3Config: BotConfig = { ...DEFAULT_BOT_CONFIGS[3], noise: 0, blunderP: 0, weights: zeroWeights };

    const { cardId: t1 } = selectBotMove(stateT1, "p1", tier1Config, makeLcg(1));
    const { cardId: t3 } = selectBotMove(stateT3, "p1", tier3Config, makeLcg(1));

    expect(t1).not.toBe(t3);
  });
});

// ====================================================
// SCORING — vrijedne karte
// ====================================================

describe("selectBotMove — scoring", () => {
  it("preferira kupiti 2♣ nad manje vrijednom kartom (tier 2+, noise=0, blunderP=0)", () => {
    const state = makeState({
      table: [c("clubs", "2"), c("hearts", "9")],
      hands: {
        p0: [c("spades", "K")],
        p1: [c("spades", "2"), c("diamonds", "9")],
      },
    });

    const deterministicTier2: BotConfig = { ...DEFAULT_BOT_CONFIGS[2], noise: 0, blunderP: 0 };
    const { cardId } = selectBotMove(state, "p1", deterministicTier2, makeLcg(1));

    expect(cardId).toBe("spades-2");
  });

  it("preferira kupiti 10♦ (tier 2+, noise=0, blunderP=0)", () => {
    const state = makeState({
      table: [c("diamonds", "10"), c("hearts", "3")],
      hands: {
        p0: [c("spades", "K")],
        p1: [c("clubs", "10"), c("spades", "3")],
      },
    });

    const deterministicTier2: BotConfig = { ...DEFAULT_BOT_CONFIGS[2], noise: 0, blunderP: 0 };
    const { cardId } = selectBotMove(state, "p1", deterministicTier2, makeLcg(1));

    expect(cardId).toBe("clubs-10");
  });
});

// ====================================================
// INTEGRATION — kompletna ruka (seeded, allow_on_table da deck bude paran)
// ====================================================

describe("selectBotMove — integracija", () => {
  // Napomena: jackOnInitialTableBehavior: "allow_on_table" garantuje da se tačno 4 karte
  // uzmu za stol, ostatak (48) je djeljiv sa 8 (2×4) → svi dealovi su ravnomjerni.

  it("bot odigra kompletnu 2P ruku bez ilegalnih poteza (seed=42)", () => {
    const players = makePlayers(2);
    const state = createInitialGameState({
      roomId: "r-test",
      matchId: "m-test",
      players,
      dealerPlayerId: "p0",
      rulesConfig: createRulesConfig(2, { jackOnInitialTableBehavior: "allow_on_table" }),
      shuffleSeed: 42,
    });

    const rng = makeLcg(99);
    let moves = 0;

    while (state.phase === "playing" && moves < 200) {
      const pid = state.currentPlayerId;
      const config = pid === "p0" ? DEFAULT_BOT_CONFIGS[2] : DEFAULT_BOT_CONFIGS[3];

      const { cardId, selectedCaptureCardIds } = selectBotMove(state, pid, config, rng);

      applyMove(state, {
        roomId: "r-test",
        playerId: pid,
        cardId,
        selectedCaptureCardIds,
        clientMoveId: `bot-${moves}`,
        clientKnownStateVersion: state.stateVersion,
      });

      moves++;
    }

    expect(moves).toBeGreaterThan(0);
    expect(["hand_finished", "match_finished"]).toContain(state.phase);
  });

  it("bot odigra kompletnu 3P ruku bez ilegalnih poteza (seed=7)", () => {
    const players = makePlayers(3);
    const state = createInitialGameState({
      roomId: "r-test3",
      matchId: "m-test3",
      players,
      dealerPlayerId: "p0",
      rulesConfig: createRulesConfig(3, { jackOnInitialTableBehavior: "allow_on_table" }),
      shuffleSeed: 7,
    });

    const rng = makeLcg(13);
    let moves = 0;

    while (state.phase === "playing" && moves < 200) {
      const pid = state.currentPlayerId;
      const tierIndex = (["p0", "p1", "p2"].indexOf(pid) % 3) + 1;
      const config = DEFAULT_BOT_CONFIGS[tierIndex as 1 | 2 | 3];

      const { cardId, selectedCaptureCardIds } = selectBotMove(state, pid, config, rng);

      applyMove(state, {
        roomId: "r-test3",
        playerId: pid,
        cardId,
        selectedCaptureCardIds,
        clientMoveId: `bot3-${moves}`,
        clientKnownStateVersion: state.stateVersion,
      });

      moves++;
    }

    expect(moves).toBeGreaterThan(0);
    expect(["hand_finished", "match_finished"]).toContain(state.phase);
  });

  it("bot odigra kompletnu 4P ruku bez ilegalnih poteza (seed=123)", () => {
    const players = makePlayers(4);
    const state = createInitialGameState({
      roomId: "r-test4",
      matchId: "m-test4",
      players,
      dealerPlayerId: "p0",
      rulesConfig: createRulesConfig(4, { jackOnInitialTableBehavior: "allow_on_table" }),
      shuffleSeed: 123,
    });

    const rng = makeLcg(77);
    let moves = 0;

    while (state.phase === "playing" && moves < 200) {
      const pid = state.currentPlayerId;
      const tierMap: Record<string, 1 | 2 | 3> = { p0: 1, p1: 2, p2: 3, p3: 2 };
      const config = DEFAULT_BOT_CONFIGS[tierMap[pid] ?? 2];

      const { cardId, selectedCaptureCardIds } = selectBotMove(state, pid, config, rng);

      applyMove(state, {
        roomId: "r-test4",
        playerId: pid,
        cardId,
        selectedCaptureCardIds,
        clientMoveId: `bot4-${moves}`,
        clientKnownStateVersion: state.stateVersion,
      });

      moves++;
    }

    expect(moves).toBeGreaterThan(0);
    expect(["hand_finished", "match_finished"]).toContain(state.phase);
  });
});
