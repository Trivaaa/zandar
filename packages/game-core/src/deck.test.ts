import { describe, it, expect } from "vitest";
import { createDeck } from "./deck";

describe("createDeck", () => {
  it("vraća tačno 52 karte", () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
  });

  it("sve karte imaju jedinstveni id", () => {
    const deck = createDeck();
    const ids = deck.map((card) => card.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(52);
  });

  it("sadrži tačno 13 karata za svaki znak", () => {
    const deck = createDeck();
    const suitCounts: Record<string, number> = {};
    for (const card of deck) {
      suitCounts[card.suit] = (suitCounts[card.suit] ?? 0) + 1;
    }
    expect(suitCounts).toEqual({
      clubs: 13,
      diamonds: 13,
      hearts: 13,
      spades: 13,
    });
  });

  it("sadrži tačno 4 karte za svaki rang", () => {
    const deck = createDeck();
    const rankCounts: Record<string, number> = {};
    for (const card of deck) {
      rankCounts[card.rank] = (rankCounts[card.rank] ?? 0) + 1;
    }
    // 13 rangova, svaki se pojavljuje 4 puta (po jednom za svaki znak)
    expect(Object.keys(rankCounts)).toHaveLength(13);
    expect(Object.values(rankCounts).every((count) => count === 4)).toBe(true);
  });
});