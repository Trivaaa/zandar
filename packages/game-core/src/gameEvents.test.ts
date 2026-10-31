import { describe, it, expect } from "vitest";
import { deriveGameEvents, isJackSweep, type EventSnapshot } from "./gameEvents";

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
    expect(events).toContainEqual({ type: "capture", byMe: true, jackSweep: true, playerId: "p1" });
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
      playerId: "p1",
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
    expect(events).toContainEqual({ type: "capture", byMe: false, jackSweep: false, playerId: "p2" });
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
    expect(deriveGameEvents(prev, next, "p1")).toContainEqual({
      type: "deal",
      perSeat: 4,
      toTable: 0,
    });
  });

  it("deal (re-deal poslije traila) — sto NE dobija kartu koju je igrač spustio", () => {
    // Zadnja karta runde spuštena na sto: sto poraste za 1, ali to nije dijeljenje.
    const prev = base({
      handCounts: { p1: 1, p2: 0 },
      currentPlayerId: "p1",
      table: [{}, {}],
    });
    const next = base({
      handCounts: { p1: 4, p2: 4 },
      currentPlayerId: "p2",
      table: [{}, {}, {}],
    });
    expect(deriveGameEvents(prev, next, "p1")).toContainEqual({
      type: "deal",
      perSeat: 4,
      toTable: 0,
    });
  });

  it("deal (početak ruke) — sto dobija karte, prethodna faza nije igra", () => {
    const prev = base({
      phase: "hand_finished",
      handCounts: { p1: 0, p2: 0 },
      table: [],
    });
    const next = base({ handCounts: { p1: 4, p2: 4 }, table: [{}, {}, {}, {}] });
    expect(deriveGameEvents(prev, next, "p1")).toContainEqual({
      type: "deal",
      perSeat: 4,
      toTable: 4,
    });
  });

  it("deal — nepun zadnji deal (špil se ispraznio) daje manji perSeat", () => {
    const prev = base({ handCounts: { p1: 0, p2: 0 }, currentPlayerId: "p1" });
    const next = base({ handCounts: { p1: 2, p2: 1 }, currentPlayerId: "p1" });
    expect(deriveGameEvents(prev, next, "p1")).toContainEqual({
      type: "deal",
      perSeat: 2,
      toTable: 0,
    });
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

describe("deriveGameEvents — capture.scoring", () => {
  const hand = (twoOfClubs?: string, tenOfDiamonds?: string) => ({
    breakdown: {
      twoOfClubs: twoOfClubs === undefined ? {} : { winnerPileId: twoOfClubs },
      tenOfDiamonds: tenOfDiamonds === undefined ? {} : { winnerPileId: tenOfDiamonds },
    },
  });
  // Običan potez: p1 kupi dvije karte, na stolu ostane jedna (nije sweep).
  const prevOf = (liveHand?: EventSnapshot["liveHand"]) =>
    base({ table: [{}, {}, {}], ...(liveHand ? { liveHand } : {}) });
  const nextOf = (liveHand?: EventSnapshot["liveHand"], over: Partial<EventSnapshot> = {}) =>
    base({
      currentPlayerId: "p2",
      table: [{}],
      capturedCounts: { p1: 3, p2: 0 },
      handCounts: { p1: 3, p2: 4 },
      ...(liveHand ? { liveHand } : {}),
      ...over,
    });
  const capture = (events: ReturnType<typeof deriveGameEvents>) =>
    events.find((e) => e.type === "capture");

  it("mala: pile dobije 2♣", () => {
    const events = deriveGameEvents(prevOf(hand()), nextOf(hand("p1")), "p1");
    expect(capture(events)).toEqual({
      type: "capture",
      byMe: true,
      jackSweep: false,
      playerId: "p1",
      scoring: ["twoOfClubs"],
    });
  });

  it("velika kod protivnika: scoring ne zavisi od toga ko gleda", () => {
    const prev = base({ currentPlayerId: "p2", table: [{}, {}, {}], liveHand: hand() });
    const next = nextOf(hand(undefined, "p2"), {
      currentPlayerId: "p1",
      capturedCounts: { p1: 0, p2: 3 },
    });
    expect(capture(deriveGameEvents(prev, next, "p1"))).toMatchObject({
      byMe: false,
      scoring: ["tenOfDiamonds"],
    });
  });

  it("obje u jednom potezu (10♦ kupi 2♣ + 8)", () => {
    const events = deriveGameEvents(prevOf(hand()), nextOf(hand("p1", "p1")), "p1");
    expect(capture(events)).toMatchObject({ scoring: ["twoOfClubs", "tenOfDiamonds"] });
  });

  it("J sweep koji nosi malu: i dalje je scoring", () => {
    const events = deriveGameEvents(prevOf(hand()), nextOf(hand("p1"), { table: [] }), "p1");
    expect(capture(events)).toMatchObject({ jackSweep: true, scoring: ["twoOfClubs"] });
  });

  it("sweep bez male i velike nema polje scoring", () => {
    const events = deriveGameEvents(prevOf(hand()), nextOf(hand(), { table: [] }), "p1");
    expect(capture(events)).toEqual({
      type: "capture",
      byMe: true,
      jackSweep: true,
      playerId: "p1",
    });
  });

  it("karta osvojena ranije se ne javlja ponovo", () => {
    const events = deriveGameEvents(prevOf(hand("p1")), nextOf(hand("p1")), "p1");
    expect(capture(events)).not.toHaveProperty("scoring");
  });

  it("javlja se samo nova karta, ne i ona od ranije", () => {
    const events = deriveGameEvents(prevOf(hand("p2")), nextOf(hand("p2", "p1")), "p1");
    expect(capture(events)).toMatchObject({ scoring: ["tenOfDiamonds"] });
  });

  it("trail nema scoring ni kad se vlasnik promijeni u istom snapshotu", () => {
    const prev = base({ table: [{}, {}], liveHand: hand() });
    const next = base({
      currentPlayerId: "p2",
      table: [{}, {}, {}],
      handCounts: { p1: 3, p2: 4 },
      liveHand: hand("p1"),
    });
    expect(deriveGameEvents(prev, next, "p1")).toEqual([{ type: "trail", byMe: true }]);
  });

  it("zadnji potez ruke daje samo handEnd: pokriva ga vijest o kraju dijeljenja", () => {
    const next = nextOf(hand("p1", "p1"), { phase: "hand_finished", table: [] });
    expect(deriveGameEvents(prevOf(hand()), next, "p1")).toEqual([{ type: "handEnd" }]);
  });

  it("stariji server (bez liveHand): nema polja, u oba smjera", () => {
    expect(capture(deriveGameEvents(prevOf(), nextOf(), "p1"))).not.toHaveProperty("scoring");
    // Tek deployovan server: `prev` nema s čim da se poredi, pa nema lažne vijesti.
    expect(capture(deriveGameEvents(prevOf(), nextOf(hand("p1")), "p1"))).not.toHaveProperty(
      "scoring",
    );
  });

  it("nova ruka: vlasnici se resetuju i ništa se ne javlja", () => {
    const prev = base({
      phase: "hand_finished",
      capturedCounts: { p1: 30, p2: 22 },
      liveHand: hand("p1", "p2"),
    });
    const next = base({
      capturedCounts: { p1: 0, p2: 0 },
      handNumber: 2,
      liveHand: hand(),
    });
    expect(capture(deriveGameEvents(prev, next, "p1"))).toBeUndefined();
  });
});

describe("isJackSweep", () => {
  it("pun sto koji ostane prazan je sweep", () => {
    expect(isJackSweep(3, 0)).toBe(true);
    expect(isJackSweep(1, 0)).toBe(true);
  });

  it("sto koji nije ispražnjen nije sweep", () => {
    expect(isJackSweep(3, 1)).toBe(false);
    expect(isJackSweep(3, 3)).toBe(false);
  });

  it("prazan sto prije poteza nije sweep — nema se šta počistiti", () => {
    expect(isJackSweep(0, 0)).toBe(false);
  });

  it("isto pravilo koje deriveGameEvents prijavljuje kao jackSweep", () => {
    // Jedan izvor za zvuk, flash i natpis uz sjedište: kad se ovo razidje,
    // potez zvuči kao žandar a piše kao obično kupljenje (ili obrnuto).
    const prev = base({ table: [{}, {}] });
    const next = base({ table: [], capturedCounts: { p1: 3, p2: 0 } });
    const [event] = deriveGameEvents(prev, next, "p1");
    expect(event).toMatchObject({ type: "capture", jackSweep: true });
    expect(isJackSweep(prev.table.length, next.table.length)).toBe(true);
  });
});
