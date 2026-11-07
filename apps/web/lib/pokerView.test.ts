import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { Card, PokerHandResult, PokerSeatView } from "@zandar/shared-types";

import {
  actionLabel,
  displayPots,
  handHint,
  positionTags,
  raisePresets,
  showdownRows,
  sortedPlacements,
  summarizeHand,
  winningCardIds,
} from "./pokerView";

const card = (id: string): Card => {
  const suit = { s: "spades", h: "hearts", d: "diamonds", c: "clubs" }[id.slice(-1)] as Card["suit"];
  return { id, rank: id.slice(0, -1) as Card["rank"], suit };
};

function seat(playerId: string, seatNo: number, over: Partial<PokerSeatView> = {}): PokerSeatView {
  return {
    playerId,
    seatNo,
    stack: 90,
    status: "active",
    inHand: true,
    folded: false,
    allIn: false,
    streetBet: 0,
    totalBet: 10,
    lastAction: null,
    hasCards: true,
    place: null,
    ...over,
  };
}

describe("displayPots", () => {
  test("bez all-ina je jedan pot = sve na stolu", () => {
    const seats = [seat("a", 0, { totalBet: 12 }), seat("b", 1, { totalBet: 12 }), seat("c", 2, { totalBet: 4 })];
    assert.deepEqual(displayPots({ potTotal: 28, seats }), [{ label: "main", index: 0, amount: 28 }]);
  });

  test("kraći all-in pravi glavni pot i pot 2", () => {
    const seats = [
      seat("a", 0, { totalBet: 30, allIn: true, stack: 0 }),
      seat("b", 1, { totalBet: 60 }),
      seat("c", 2, { totalBet: 60 }),
    ];
    assert.deepEqual(displayPots({ potTotal: 150, seats }), [
      { label: "main", index: 0, amount: 90 },
      { label: "side", index: 1, amount: 60 },
    ]);
  });

  test("nepraćen ulog nije zaseban pot", () => {
    const seats = [
      seat("a", 0, { totalBet: 20, allIn: true, stack: 0 }),
      seat("b", 1, { totalBet: 50 }),
      seat("c", 2, { totalBet: 20, folded: true }),
    ];
    // Sloj 20→50 ima samo `b`: ide u glavni, pa je to i dalje jedan pot.
    assert.deepEqual(displayPots({ potTotal: 90, seats }), [{ label: "main", index: 0, amount: 90 }]);
  });

  test("nepraćen all-in preko blindova je jedan pot", () => {
    const seats = [
      seat("a", 0, { totalBet: 100, allIn: true, stack: 0 }),
      seat("b", 1, { totalBet: 1 }),
      seat("c", 2, { totalBet: 2 }),
    ];
    assert.deepEqual(displayPots({ potTotal: 103, seats }), [{ label: "main", index: 0, amount: 103 }]);
  });

  test("prazan pot se ne crta", () => {
    assert.deepEqual(displayPots({ potTotal: 0, seats: [] }), []);
  });
});

test("positionTags: heads-up dealer je i small blind", () => {
  const view = { buttonSeat: 0, smallBlindSeat: 0, bigBlindSeat: 1, phase: "betting" as const };
  assert.deepEqual(positionTags(view, { seatNo: 0, status: "active" }), ["D", "SB"]);
  assert.deepEqual(positionTags(view, { seatNo: 1, status: "active" }), ["BB"]);
  assert.deepEqual(positionTags(view, { seatNo: 0, status: "left" }), []);
});

test("actionLabel nosi ulog u ulici", () => {
  assert.equal(actionLabel({ type: "call", amount: 12 }), "Prati 12");
  assert.equal(actionLabel({ type: "raise", amount: 30 }), "Diže na 30");
  assert.equal(actionLabel({ type: "bet", amount: 6 }), "Ulaže 6");
  assert.equal(actionLabel({ type: "allin", amount: 88 }), "Va-bank");
  assert.equal(actionLabel({ type: "check", amount: 0 }), "Dalje");
  assert.equal(actionLabel({ type: "fold", amount: 0 }), "Odustaje");
});

describe("raisePresets", () => {
  test("Min · ½ pota · Pot · All-in, u granicama servera", () => {
    // Na stolu 30, treba platiti 10 do 12; pot poslije calla 40.
    const p = raisePresets({ minTo: 20, maxTo: 98, callAmount: 10 }, 12, 30);
    assert.deepEqual(p, [
      { key: "min", to: 20 },
      { key: "half", to: 32 },
      { key: "pot", to: 52 },
      { key: "allin", to: 98 },
    ]);
  });

  test("kratak stack: isti iznosi se ne ponavljaju", () => {
    const p = raisePresets({ minTo: 20, maxTo: 24, callAmount: 4 }, 8, 20);
    assert.deepEqual(
      p.map((x) => x.to),
      [20, 24],
    );
  });
});

test("handHint: prije flopa opis karata, poslije kombinacija", () => {
  assert.equal(handHint([card("Qs"), card("As")], []), "A, Q iste boje");
  assert.equal(handHint([card("7h"), card("7d")], []), "Par 7");
  assert.equal(handHint([card("Kh"), card("2c")], []), "K, 2");
  assert.equal(handHint([card("Kh"), card("Kc")], [card("Ks"), card("2d"), card("2h")]), "Ful");
});

describe("summarizeHand", () => {
  const base: Omit<PokerHandResult, "awards" | "pots" | "showdown" | "uncontested"> = {
    handNo: 3,
    allInRunout: false,
  };

  test("svi foldali — samo ko uzima pot, bez kombinacije", () => {
    const s = summarizeHand({
      ...base,
      uncontested: true,
      pots: [{ amount: 18, eligiblePlayerIds: ["m"] }],
      awards: [{ potIndex: 0, playerId: "m", amount: 18 }],
      showdown: [],
    });
    assert.deepEqual(s, { kind: "uncontested", winner: { playerId: "m", amount: 18, category: null } });
  });

  test("podijeljen pot ima oba pobjednika", () => {
    const result: PokerHandResult = {
      ...base,
      uncontested: false,
      pots: [{ amount: 48, eligiblePlayerIds: ["a", "b"] }],
      awards: [
        { potIndex: 0, playerId: "a", amount: 24 },
        { potIndex: 0, playerId: "b", amount: 24 },
      ],
      showdown: [
        { playerId: "a", holeCards: [], category: "straight", bestCards: [card("5s"), card("6h")] },
        { playerId: "b", holeCards: [], category: "straight", bestCards: [card("5s"), card("6h")] },
      ],
    };
    const s = summarizeHand(result);
    assert.equal(s?.kind, "split");
    assert.deepEqual([...winningCardIds(result)].sort(), ["5s", "6h"]);
  });

  test("vraćen nepraćen ulog nije pobjeda", () => {
    const s = summarizeHand({
      ...base,
      uncontested: false,
      pots: [
        { amount: 60, eligiblePlayerIds: ["a", "b"] },
        { amount: 20, eligiblePlayerIds: ["b"] },
      ],
      awards: [
        { potIndex: 0, playerId: "a", amount: 60 },
        { potIndex: 1, playerId: "b", amount: 20 },
      ],
      showdown: [
        { playerId: "a", holeCards: [], category: "flush", bestCards: [] },
        { playerId: "b", holeCards: [], category: "pair", bestCards: [] },
      ],
    });
    assert.deepEqual(s, { kind: "single", winner: { playerId: "a", amount: 60, category: "flush" } });
  });
});

test("sortedPlacements: po plasmanu, bez plasmana na kraj", () => {
  const out = sortedPlacements({
    placements: [
      { playerId: "b", place: 1 },
      { playerId: "a", place: 3 },
    ],
    seats: [seat("a", 0), seat("b", 1), seat("c", 2, { place: 2 }), seat("d", 3)],
  });
  assert.deepEqual(
    out.map((p) => p.playerId),
    ["b", "c", "a", "d"],
  );
});

describe("showdownRows — ploča showdowna", () => {
  const result: PokerHandResult = {
    handNo: 5,
    uncontested: false,
    allInRunout: false,
    pots: [{ amount: 60, eligiblePlayerIds: ["a", "b", "c"] }],
    awards: [{ potIndex: 0, playerId: "b", amount: 60 }],
    showdown: [
      { playerId: "a", holeCards: [card("Ks"), card("2h")], category: "pair", bestCards: [card("Ks"), card("Kd"), card("9c"), card("8c"), card("7h")] },
      { playerId: "b", holeCards: [card("9s"), card("9h")], category: "three_of_a_kind", bestCards: [card("9s"), card("9h"), card("9c"), card("Kd"), card("8c")] },
      { playerId: "c", holeCards: [card("Ac"), card("3d")], category: "high_card", bestCards: [card("Ac"), card("Kd"), card("9c"), card("8c"), card("7h")] },
    ],
  };

  test("redovi prate otkrivanje, pobjednik je označen, iznos tek poslije isplate", () => {
    assert.deepEqual(showdownRows(result, ["a"], false).map((r) => r.playerId), ["a"]);
    const all = showdownRows(result, null, false);
    assert.deepEqual(all.map((r) => [r.playerId, r.isWinner, r.amount]), [["a", false, null], ["b", true, null], ["c", false, null]]);
    assert.equal(showdownRows(result, null, true).find((r) => r.isWinner)?.amount, 60);
  });

  test("karta koja ne učestvuje u kombinaciji je van `inBest`", () => {
    const a = showdownRows(result, null, false)[0]!;
    assert.equal(a.inBest.has("Ks"), true);
    assert.equal(a.inBest.has("2h"), false);
  });

  test("podijeljen pot: oba pobjednika; svi foldali: nema ploče", () => {
    const split: PokerHandResult = {
      ...result,
      awards: [
        { potIndex: 0, playerId: "a", amount: 30 },
        { potIndex: 0, playerId: "b", amount: 30 },
      ],
    };
    assert.deepEqual(showdownRows(split, null, true).filter((r) => r.isWinner).map((r) => r.amount), [30, 30]);
    assert.deepEqual(showdownRows({ ...result, uncontested: true }, null, true), []);
  });
});
