import { describe, it, expect } from "vitest";
import type { PokerHandResult } from "@zandar/shared-types";
import { POKER_PACE as P, awardedPots, dealMs, pokerPresentationMs, type PaceFrame } from "./pace";

const frame = (over: Partial<PaceFrame> = {}): PaceFrame => ({ handNo: 3, phase: "betting", boardCount: 0, ...over });

function result(over: Partial<PokerHandResult> = {}): PokerHandResult {
  return {
    handNo: 3,
    uncontested: false,
    allInRunout: false,
    pots: [{ amount: 40, eligiblePlayerIds: ["a", "b"] }],
    awards: [{ potIndex: 0, playerId: "a", amount: 40 }],
    showdown: [
      { playerId: "a", holeCards: [], category: "pair", bestCards: [] },
      { playerId: "b", holeCards: [], category: "high_card", bestCards: [] },
    ],
    ...over,
  };
}

const base = { lastAction: null, dealtPlayers: 4, result: null, busted: 0 } as const;

describe("poker ritam prikaza", () => {
  it("bez prethodnog prikaza (start, hidracija) nema čekanja", () => {
    expect(pokerPresentationMs({ ...base, prev: null, next: frame() })).toBe(0);
  });

  it("nova ruka: blindovi + dijeljenje dvije karte svima", () => {
    const ms = pokerPresentationMs({ ...base, prev: frame({ handNo: 2, phase: "hand_complete" }), next: frame() });
    expect(ms).toBe(dealMs(4));
    expect(ms).toBe(P.blindsMs + 7 * P.dealStaggerMs + P.dealFlightMs + P.myFlipMs);
  });

  it("potez u istoj ulici: samo natpis i žetoni", () => {
    expect(pokerPresentationMs({ ...base, prev: frame(), next: frame(), lastAction: "raise" })).toBe(P.actionMs);
    expect(pokerPresentationMs({ ...base, prev: frame(), next: frame(), lastAction: "check" })).toBe(P.checkMs);
    expect(pokerPresentationMs({ ...base, prev: frame(), next: frame(), lastAction: "fold" })).toBe(P.foldMs);
  });

  it("kraj ulice: potez + mir + ulozi u pot + flop (pa turn)", () => {
    const flop = pokerPresentationMs({ ...base, prev: frame(), next: frame({ boardCount: 3 }), lastAction: "call" });
    expect(flop).toBe(P.actionMs + P.streetSettleMs + P.betsToPotMs + P.flopMs);
    const turn = pokerPresentationMs({ ...base, prev: frame({ boardCount: 3 }), next: frame({ boardCount: 4 }), lastAction: "check" });
    expect(turn).toBe(P.checkMs + P.streetSettleMs + P.betsToPotMs + P.turnRiverMs);
  });

  it("svi foldali: ulozi u pot, isplata, kratko čitanje — bez otkrivanja", () => {
    const r = result({ uncontested: true, showdown: [], pots: [{ amount: 9, eligiblePlayerIds: ["a"] }] });
    const ms = pokerPresentationMs({ ...base, prev: frame({ boardCount: 3 }), next: frame({ boardCount: 3, phase: "hand_complete" }), lastAction: "fold", result: r });
    expect(ms).toBe(P.foldMs + P.streetSettleMs + P.betsToPotMs + P.awardPerPotMs + P.readShortMs);
  });

  it("showdown na riveru: otkrivanje po igraču, zadržavanje, isplata, čitanje", () => {
    const ms = pokerPresentationMs({ ...base, prev: frame({ boardCount: 5 }), next: frame({ boardCount: 5, phase: "hand_complete" }), lastAction: "call", result: result() });
    expect(ms).toBe(P.actionMs + P.streetSettleMs + P.betsToPotMs + 2 * P.revealPerHandMs + P.showdownHoldMs + P.awardPerPotMs + P.readMs);
  });

  it("all-in prije flopa: flop, turn i river se dijele jedan po jedan, side pot i bankrot se računaju", () => {
    const r = result({
      allInRunout: true,
      pots: [
        { amount: 60, eligiblePlayerIds: ["a", "b", "c"] },
        { amount: 40, eligiblePlayerIds: ["a", "b"] },
      ],
      awards: [
        { potIndex: 0, playerId: "c", amount: 60 },
        { potIndex: 1, playerId: "a", amount: 40 },
      ],
      showdown: [
        { playerId: "a", holeCards: [], category: "pair", bestCards: [] },
        { playerId: "b", holeCards: [], category: "pair", bestCards: [] },
        { playerId: "c", holeCards: [], category: "flush", bestCards: [] },
      ],
    });
    const ms = pokerPresentationMs({ ...base, prev: frame(), next: frame({ boardCount: 5, phase: "hand_complete" }), lastAction: "allin", result: r, busted: 1 });
    const runout = 3 * P.runoutPauseMs + P.flopMs + 2 * P.turnRiverMs;
    expect(ms).toBe(P.actionMs + P.streetSettleMs + P.betsToPotMs + 3 * P.revealPerHandMs + runout + P.showdownHoldMs + 2 * P.awardPerPotMs + P.bustMs + P.readMs);
  });

  it("vraćen nepraćen ulog se ne broji kao posebna isplata", () => {
    expect(
      awardedPots(
        result({
          pots: [
            { amount: 40, eligiblePlayerIds: ["a", "b"] },
            { amount: 20, eligiblePlayerIds: ["a"] },
          ],
          awards: [
            { potIndex: 0, playerId: "a", amount: 40 },
            { potIndex: 1, playerId: "a", amount: 20 },
          ],
        }),
      ),
    ).toBe(1);
  });
});
