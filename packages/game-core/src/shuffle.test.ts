import { describe, it, expect } from "vitest";
import { createDeck } from "./deck";
import { shuffle } from "./shuffle";

describe("shuffle", () => {
  it("vraća isti broj karata kao originalni špil", () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    expect(shuffled).toHaveLength(deck.length);
  });

  it("vraća iste karte (samo u drugom redoslijedu)", () => {
    const deck = createDeck();
    const shuffled = shuffle(deck);
    const originalIds = new Set(deck.map((c) => c.id));
    const shuffledIds = new Set(shuffled.map((c) => c.id));
    expect(shuffledIds).toEqual(originalIds);
  });

  it("ne mijenja originalni špil (immutability)", () => {
    const deck = createDeck();
    const firstCardBefore = deck[0];
    shuffle(deck);
    expect(deck[0]).toBe(firstCardBefore);
  });

  it("sa istim seed-om uvijek vraća isti redoslijed (determinizam)", () => {
    const deck = createDeck();
    const shuffled1 = shuffle(deck, 42);
    const shuffled2 = shuffle(deck, 42);
    expect(shuffled1.map((c) => c.id)).toEqual(shuffled2.map((c) => c.id));
  });

  it("sa različitim seed-ima vraća različite redoslijede", () => {
    const deck = createDeck();
    const shuffled1 = shuffle(deck, 1);
    const shuffled2 = shuffle(deck, 999);
    expect(shuffled1.map((c) => c.id)).not.toEqual(shuffled2.map((c) => c.id));
  });

  it("zaista mijenja redoslijed (nije isti kao originalni)", () => {
    const deck = createDeck();
    const shuffled = shuffle(deck, 42);
    expect(shuffled.map((c) => c.id)).not.toEqual(deck.map((c) => c.id));
  });
});