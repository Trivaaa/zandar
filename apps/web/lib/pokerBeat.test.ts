import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { pokerPresentationMs } from "@zandar/game-core";
import type { Card, PokerHandResult, PokerSeatView } from "@zandar/shared-types";

import { pokerBeats, totalMs, type BeatView } from "./pokerBeat";

const c = (code: string): Card => ({
  id: code,
  rank: code.slice(0, -1) as Card["rank"],
  suit: ({ s: "spades", h: "hearts", d: "diamonds", c: "clubs" } as const)[code.slice(-1) as "s"],
});

function seat(id: string, seatNo: number, over: Partial<PokerSeatView> = {}): PokerSeatView {
  return {
    playerId: id, seatNo, stack: 90, status: "active", inHand: true, folded: false, allIn: false,
    streetBet: 0, totalBet: 10, lastAction: null, hasCards: true, place: null, ...over,
  };
}

function view(over: Partial<BeatView> = {}): BeatView {
  return {
    handNo: 4, phase: "betting", street: "preflop", board: [], currentPlayerId: "a", currentBet: 2, potTotal: 3,
    lastHandResult: null, buttonSeat: 0,
    seats: [seat("a", 0), seat("b", 1), seat("c", 2)],
    ...over,
  };
}

/** Isto što računa server za isti prelaz (game-core). */
function serverMs(prev: BeatView, next: BeatView, lastAction: Parameters<typeof pokerPresentationMs>[0]["lastAction"], busted = 0): number {
  return pokerPresentationMs({
    prev: { handNo: prev.handNo, phase: prev.phase, boardCount: prev.board.length },
    next: { handNo: next.handNo, phase: next.phase, boardCount: next.board.length },
    lastAction,
    dealtPlayers: next.seats.filter((s) => s.inHand).length,
    result: next.phase === "betting" ? null : next.lastHandResult,
    busted,
  });
}

describe("pokerBeats — šta se priča", () => {
  test("isto stanje poslano ponovo: ništa", () => {
    const v = view();
    assert.deepEqual(pokerBeats(v, { ...v }), []);
    assert.deepEqual(pokerBeats(null, v), []);
  });

  test("raise u istoj ulici: jedan korak, žetoni lete na mjesto uloga koje se još ne vidi", () => {
    const prev = view({ currentPlayerId: "a" });
    const next = view({
      currentPlayerId: "b",
      currentBet: 8,
      seats: [seat("a", 0, { stack: 82, streetBet: 8, lastAction: { type: "raise", amount: 8 } }), seat("b", 1), seat("c", 2)],
    });
    const steps = pokerBeats(prev, next);
    assert.equal(steps.length, 1);
    assert.deepEqual(steps[0]!.fx, { kind: "chipsToBet", playerId: "a" });
    assert.deepEqual(steps[0]!.hold.hiddenBets, ["a"]);
    assert.equal(totalMs(steps), serverMs(prev, next, "raise"));
  });

  test("zadnji call ulice: ulozi ostaju, pa idu u pot, pa flop karta po karta", () => {
    const prev = view({
      currentPlayerId: "c",
      currentBet: 6,
      seats: [seat("a", 0, { streetBet: 6, stack: 84 }), seat("b", 1, { streetBet: 6, stack: 84 }), seat("c", 2, { streetBet: 2, stack: 88 })],
    });
    const next = view({
      street: "flop",
      board: [c("9h"), c("Kd"), c("4c")],
      currentPlayerId: "a",
      currentBet: 0,
      potTotal: 18,
      seats: [seat("a", 0, { stack: 84 }), seat("b", 1, { stack: 84 }), seat("c", 2, { stack: 84 })],
    });
    const steps = pokerBeats(prev, next);
    // Prvi korak drži uloge poslije calla (c: 2 + 4 = 6) i natpis „Call 6".
    assert.deepEqual(steps[0]!.hold.bets, { a: 6, b: 6, c: 6 });
    assert.deepEqual(steps[0]!.hold.captions?.c, { type: "call", amount: 6 });
    assert.equal(steps[0]!.hold.board, 0);
    const toPot = steps.find((s) => s.fx?.kind === "betsToPot");
    assert.deepEqual(toPot?.fx, { kind: "betsToPot", playerIds: ["a", "b", "c"] });
    assert.deepEqual(
      steps.map((s) => s.hold.board),
      [0, 0, 0, 1, 2, 3],
    );
    assert.equal(totalMs(steps), serverMs(prev, next, "call"));
  });

  test("nova ruka: dijeljenje od prvog lijevo od djelioca, karte se ne crtaju dok putuju", () => {
    const prev = view({ phase: "hand_complete", currentPlayerId: null });
    const next = view({ handNo: 5, buttonSeat: 1 });
    const steps = pokerBeats(prev, next);
    assert.equal(steps.length, 1);
    assert.deepEqual(steps[0]!.fx, { kind: "deal", order: ["c", "a", "b"] });
    assert.equal(steps[0]!.hold.dealt, false);
    assert.equal(totalMs(steps), serverMs(prev, next, "big_blind"));
  });

  test("showdown na riveru: otkrivanje, isticanje, isplata, pa traka rezultata — isto trajanje kao server", () => {
    const board = [c("9h"), c("Kd"), c("4c"), c("2s"), c("7d")];
    const prev = view({
      street: "river", board, currentPlayerId: "b", currentBet: 10,
      seats: [seat("a", 0, { streetBet: 10, stack: 70 }), seat("b", 1, { stack: 80 }), seat("c", 2, { folded: true, hasCards: false, stack: 90 })],
    });
    const result: PokerHandResult = {
      handNo: 4, uncontested: false, allInRunout: false,
      pots: [{ amount: 60, eligiblePlayerIds: ["a", "b"] }],
      awards: [{ potIndex: 0, playerId: "a", amount: 60 }],
      showdown: [
        { playerId: "a", holeCards: [c("Ks"), c("Kh")], category: "three_of_a_kind", bestCards: [] },
        { playerId: "b", holeCards: [c("9s"), c("8s")], category: "pair", bestCards: [] },
      ],
    };
    const next = view({
      phase: "hand_complete", street: "river", board, currentPlayerId: null, currentBet: 0, potTotal: 0, lastHandResult: result,
      seats: [seat("a", 0, { stack: 130, totalBet: 0 }), seat("b", 1, { stack: 70, totalBet: 0 }), seat("c", 2, { folded: true, hasCards: false, stack: 90, totalBet: 0 })],
    });
    const steps = pokerBeats(prev, next);
    assert.deepEqual(steps[0]!.hold.captions?.b, { type: "call", amount: 10 });
    assert.equal(steps[0]!.hold.stacks?.a, 70, "dobitak se ne vidi prije isplate");
    assert.equal(steps.find((s) => s.fx?.kind === "potToWinners")?.hold.pot, 60);
    assert.deepEqual(steps.at(-1)!.hold, { ...steps.at(-1)!.hold, result: true, pot: 0 });
    assert.equal(steps.at(-1)!.hold.stacks?.a, 130);
    assert.equal(totalMs(steps), serverMs(prev, next, "call"));
  });

  test("svi foldali: bez otkrivanja, pot leti pobjedniku, kratko čitanje", () => {
    const prev = view({ currentPlayerId: "c", seats: [seat("a", 0, { folded: true }), seat("b", 1, { streetBet: 2, stack: 88 }), seat("c", 2, { streetBet: 1, stack: 89 })] });
    const result: PokerHandResult = {
      handNo: 4, uncontested: true, allInRunout: false,
      pots: [{ amount: 3, eligiblePlayerIds: ["b"] }],
      awards: [{ potIndex: 0, playerId: "b", amount: 3 }],
      showdown: [],
    };
    const next = view({
      phase: "hand_complete", currentPlayerId: null, potTotal: 0, lastHandResult: result,
      seats: [seat("a", 0, { folded: true }), seat("b", 1, { stack: 91, totalBet: 0 }), seat("c", 2, { folded: true, stack: 89, totalBet: 0, lastAction: { type: "fold", amount: 1 } })],
    });
    const steps = pokerBeats(prev, next);
    assert.deepEqual(steps[0]!.fx, { kind: "fold", playerId: "c" });
    assert.equal(steps.some((s) => (s.hold.revealed ?? []).length > 0), false);
    assert.deepEqual(steps.find((s) => s.fx?.kind === "potToWinners")?.fx, { kind: "potToWinners", winners: ["b"] });
    assert.equal(totalMs(steps), serverMs(prev, next, "fold"));
  });
});
