import { describe, it, expect } from "vitest";
import { DEFAULT_POKER_BLIND_LEVELS, pokerBlindsForLevel, pokerLevelForHand } from "./config";

describe("poker blindovi", () => {
  it("nivo raste svakih 5 ruku", () => {
    expect([1, 5, 6, 10, 11].map((h) => pokerLevelForHand(h, 5))).toEqual([1, 1, 2, 2, 3]);
  });

  it("tabela iz speca za startStack 100", () => {
    const got = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((l) => {
      const b = pokerBlindsForLevel(l, DEFAULT_POKER_BLIND_LEVELS, 100);
      return [b.smallBlind, b.bigBlind];
    });
    expect(got).toEqual(DEFAULT_POKER_BLIND_LEVELS);
  });

  it("11+ duplira svaki nivo", () => {
    expect(pokerBlindsForLevel(11, DEFAULT_POKER_BLIND_LEVELS, 100)).toEqual({
      smallBlind: 100,
      bigBlind: 200,
    });
    expect(pokerBlindsForLevel(12, DEFAULT_POKER_BLIND_LEVELS, 100)).toEqual({
      smallBlind: 200,
      bigBlind: 400,
    });
  });

  it("skalira se faktorom startStack/100", () => {
    expect(pokerBlindsForLevel(1, DEFAULT_POKER_BLIND_LEVELS, 1000)).toEqual({
      smallBlind: 10,
      bigBlind: 20,
    });
    expect(pokerBlindsForLevel(4, DEFAULT_POKER_BLIND_LEVELS, 200)).toEqual({
      smallBlind: 10,
      bigBlind: 20,
    });
  });
});
