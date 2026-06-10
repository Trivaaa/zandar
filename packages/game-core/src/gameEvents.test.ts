import { describe, it, expect } from "vitest";
import { deriveGameEvents, type EventSnapshot } from "./gameEvents";

// Bazni snapshot: 2 igrača, faza playing, p1 na potezu, sto ima 2 karte.
function base(overrides: Partial<EventSnapshot> = {}): EventSnapshot {
  return {
    phase: "playing",
    currentPlayerId: "p1",
    table: [{}, {}],
    handCounts: { p1: 4, p2: 4 },
    capturedCounts: { p1: 0, p2: 0 },
    matchScore: { p1: 0, p2: 0 },
    targetScore: 21,
    handNumber: 1,
    players: [
      { id: "p1" },
      { id: "p2" },
    ],
    ...overrides,
  };
}

describe("deriveGameEvents", () => {
  it("nema događaja kad se ništa relevantno ne promijeni", () => {
    expect(deriveGameEvents(base(), base(), "p1")).toEqual([]);
  });

  it("capture (ja) — capturedCounts moje pile poraste, sto nije ispražnjen", () => {
    const prev = base({ currentPlayerId: "p1" });
    const next = base({
      currentPlayerId: "p2",
      capturedCounts: { p1: 3, p2: 0 },
      table: [], // svejedno; jackSweep heuristika zavisi od prev.table>0 && next.table==0
      handCounts: { p1: 3, p2: 4 },
    });
    // prev.table=2>0, next.table=0 → jackSweep heuristika TRUE u ovom slučaju
    const events = deriveGameEvents(prev, next, "p1");
    expect(events).toContainEqual({ type: "capture", byMe: true, jackSweep: true });
  });

  it("capture (ja) bez praznog stola → jackSweep false", () => {
    const prev = base({ currentPlayerId: "p1", table: [{}, {}, {}] });
    const next = base({
      currentPlayerId: "p2",
      table: [{}], // ostalo karata na stolu
      capturedCounts: { p1: 3, p2: 0 },
      handCounts: { p1: 3, p2: 4 },
    });
    expect(deriveGameEvents(prev, next, "p1")).toContainEqual({
      type: "capture",
      byMe: true,
      jackSweep: false,
    });
  });

  it("capture protivnika → byMe false", () => {
    const prev = base({ currentPlayerId: "p2", table: [{}, {}, {}] });
    const next = base({
      currentPlayerId: "p1",
      table: [{}],
      capturedCounts: { p1: 0, p2: 3 },
      handCounts: { p1: 4, p2: 3 },
    });
    const events = deriveGameEvents(prev, next, "p1");
    expect(events).toContainEqual({ type: "capture", byMe: false, jackSweep: false });
    // p1 je sada na potezu → i yourTurn
    expect(events).toContainEqual({ type: "yourTurn" });
  });

  it("trail (ja) — sto poraste za 1, nema kupljenja", () => {
    const prev = base({ currentPlayerId: "p1", table: [{}, {}] });
    const next = base({
      currentPlayerId: "p2",
      table: [{}, {}, {}],
      handCounts: { p1: 3, p2: 4 },
    });
    expect(deriveGameEvents(prev, next, "p1")).toEqual([{ type: "trail", byMe: true }]);
  });

  it("yourTurn rising edge", () => {
    const prev = base({ currentPlayerId: "p2" });
    const next = base({ currentPlayerId: "p1" });
    expect(deriveGameEvents(prev, next, "p1")).toEqual([{ type: "yourTurn" }]);
  });

  it("deal — ukupan broj karata u rukama poraste (re-deal)", () => {
    const prev = base({ handCounts: { p1: 0, p2: 0 }, currentPlayerId: "p1" });
    const next = base({ handCounts: { p1: 4, p2: 4 }, currentPlayerId: "p1" });
    expect(deriveGameEvents(prev, next, "p1")).toContainEqual({ type: "deal" });
  });

  it("handEnd — prelazak playing → hand_finished (bez poteznih događaja)", () => {
    const prev = base();
    const next = base({ phase: "hand_finished", capturedCounts: { p1: 9, p2: 3 } });
    expect(deriveGameEvents(prev, next, "p1")).toEqual([{ type: "handEnd" }]);
  });

  it("matchEnd — pobjeda (moj skor ≥ target)", () => {
    const prev = base();
    const next = base({ phase: "match_finished", matchScore: { p1: 21, p2: 12 } });
    expect(deriveGameEvents(prev, next, "p1")).toEqual([{ type: "matchEnd", iWon: true }]);
  });

  it("matchEnd — poraz (moj skor < target)", () => {
    const prev = base();
    const next = base({ phase: "match_finished", matchScore: { p1: 14, p2: 21 } });
    expect(deriveGameEvents(prev, next, "p1")).toEqual([{ type: "matchEnd", iWon: false }]);
  });

  it("matchEnd u 4P timovima — moj pile je team-{teamId}", () => {
    const players = [
      { id: "p1", teamId: 0 },
      { id: "p2", teamId: 1 },
      { id: "p3", teamId: 0 },
      { id: "p4", teamId: 1 },
    ];
    const prev = base({ players });
    const next = base({
      players,
      phase: "match_finished",
      matchScore: { "team-0": 22, "team-1": 10 },
    });
    expect(deriveGameEvents(prev, next, "p1")).toEqual([{ type: "matchEnd", iWon: true }]);
  });

  it("ne emituje potezne događaje van faze playing", () => {
    const prev = base({ phase: "hand_finished" });
    const next = base({ phase: "hand_finished", capturedCounts: { p1: 5, p2: 0 } });
    expect(deriveGameEvents(prev, next, "p1")).toEqual([]);
  });
});
