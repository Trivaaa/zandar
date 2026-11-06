import { describe, it, expect } from "vitest";
import type { Card, PokerGameState, Rank, Suit } from "@zandar/shared-types";
import { createSeededRandom } from "../shuffle";
import {
  DEFAULT_POKER_BOT_CONFIG,
  chenScore,
  pokerBotThinkMs,
  readPostflop,
  selectPokerBotAction,
} from "./bot";
import { applyPokerAction, createPokerMatch, startPokerHand } from "./match";
import { simulatePokerMatches } from "./simulate";
import { getPokerView } from "./view";

const SUIT: Record<string, Suit> = { c: "clubs", d: "diamonds", h: "hearts", s: "spades" };
function cards(spec: string): Card[] {
  return spec
    .trim()
    .split(/\s+/)
    .map((t) => {
      const rank = t.slice(0, -1) as Rank;
      const suit = SUIT[t.slice(-1)]!;
      return { id: `${suit}-${rank}`, suit, rank };
    });
}

/** Ruka sa zadatim stackovima; button 0, igrači p0..pN-1. Karte se postavljaju poslije. */
function hand(stacks: number[]): PokerGameState {
  const base = createPokerMatch({
    roomId: "r",
    matchId: "m",
    playerIds: stacks.map((_, i) => `p${i}`),
    rng: createSeededRandom(1),
    fixedSeating: true,
    initialButtonSeat: 0,
  });
  const s = structuredClone(base);
  s.phase = "hand_complete";
  s.handNo = 0;
  s.buttonSeat = stacks.length - 1;
  s.seats.forEach((x, i) => {
    x.stack = stacks[i]!;
    x.streetBet = 0;
    x.totalBet = 0;
  });
  return startPokerHand(s, createSeededRandom(2));
}

function withHole(s: PokerGameState, i: number, spec: string): PokerGameState {
  const out = structuredClone(s);
  out.seats[i]!.holeCards = cards(spec);
  return out;
}

describe("chenScore", () => {
  it.each([
    ["Ac Ad", 20],
    ["Kc Kd", 16],
    ["2c 2d", 5],
    ["Ah Kh", 12],
    ["Ah Kd", 10],
    ["7c 2d", -1],
    ["Jh 10h", 9],
  ])("%s = %d", (spec, expected) => {
    expect(chenScore(cards(spec))).toBe(expected);
  });
});

describe("readPostflop", () => {
  it("set je monster", () => {
    expect(readPostflop(cards("8c 8d"), cards("8h Ks 2d")).cls).toBe("monster");
  });
  it("top pair s dobrim kickerom je jaka ruka", () => {
    expect(readPostflop(cards("Kc Qd"), cards("Kh 7s 2d")).cls).toBe("strong");
  });
  it("srednji par je srednja ruka", () => {
    expect(readPostflop(cards("7c 6d"), cards("Kh 7s 2d")).cls).toBe("medium");
  });
  it("flush draw na flopu ima ~36% šanse", () => {
    const r = readPostflop(cards("Ah 5h"), cards("Kh 9h 2d"));
    expect(r.cls).toBe("draw");
    expect(r.drawEquity).toBeCloseTo(0.36, 2);
  });
  it("otvorena kenta na turnu", () => {
    const r = readPostflop(cards("9c 8d"), cards("7h 6s 2d Kc"));
    expect(r.cls).toBe("draw");
    expect(r.drawEquity).toBeCloseTo(0.16, 2);
  });
  it("kenta na boardu ne pripada igraču", () => {
    expect(readPostflop(cards("2c 3d"), cards("9h 10s Jd Qc Kh")).cls).toBe("air");
  });
  it("ništa je ništa", () => {
    expect(readPostflop(cards("2c 3d"), cards("Kh 9s 7d")).cls).toBe("air");
  });
});

describe("selectPokerBotAction", () => {
  it("null kad bot nije na potezu", () => {
    const s = hand([100, 100, 100]);
    expect(selectPokerBotAction(getPokerView(s, "p1"))).toBeNull();
  });

  it("odluka zavisi samo od pogleda — tuđe karte i špil ne utiču", () => {
    const a = withHole(hand([100, 100, 100]), 0, "Ac Kd");
    const b = structuredClone(a);
    b.seats[1]!.holeCards = cards("2c 7d");
    b.seats[2]!.holeCards = cards("Ah As");
    b.deck = [...b.deck].reverse();
    expect(getPokerView(a, "p0")).toEqual(getPokerView(b, "p0"));
    const ra = createSeededRandom(9);
    const rb = createSeededRandom(9);
    for (let i = 0; i < 20; i++) {
      expect(selectPokerBotAction(getPokerView(a, "p0"), DEFAULT_POKER_BOT_CONFIG, ra)).toEqual(
        selectPokerBotAction(getPokerView(b, "p0"), DEFAULT_POKER_BOT_CONFIG, rb),
      );
    }
  });

  it("AA se ne folda preflop", () => {
    const s = withHole(hand([100, 100, 100, 100]), 3, "Ac Ad");
    const r = createSeededRandom(4);
    for (let i = 0; i < 50; i++) {
      const a = selectPokerBotAction(getPokerView(s, "p3"), DEFAULT_POKER_BOT_CONFIG, r)!;
      expect(a.type).not.toBe("fold");
    }
  });

  it("kratak stack: AA ide all-in, 7-2 folda na tuđi all-in", () => {
    const short = withHole(hand([100, 100, 100, 14]), 3, "Ac Ad");
    expect(selectPokerBotAction(getPokerView(short, "p3"))!.type).toBe("allin");

    let s = withHole(hand([100, 14, 100]), 1, "7c 2d");
    s = applyPokerAction(s, "p0", { type: "allin" });
    const r = createSeededRandom(5);
    for (let i = 0; i < 30; i++) {
      expect(selectPokerBotAction(getPokerView(s, "p1"), DEFAULT_POKER_BOT_CONFIG, r)!.type).toBe(
        "fold",
      );
    }
  });

  it("monster ruka postflop ne folda", () => {
    let s = withHole(hand([100, 100]), 1, "8c 8d");
    s = applyPokerAction(s, "p0", { type: "call" });
    s = applyPokerAction(s, "p1", { type: "check" });
    s.board = cards("8h Ks 2d");
    const r = createSeededRandom(6);
    for (let i = 0; i < 30; i++) {
      expect(selectPokerBotAction(getPokerView(s, "p1"), DEFAULT_POKER_BOT_CONFIG, r)!.type).not.toBe(
        "fold",
      );
    }
  });
});

describe("pokerBotThinkMs", () => {
  it("uvijek 1–5 s, duže kod skupe odluke", () => {
    const cheap = hand([100, 100, 100]);
    let costly = hand([100, 100, 100]);
    costly = applyPokerAction(costly, "p0", { type: "allin" });
    const r = createSeededRandom(8);
    let sumCheap = 0;
    let sumCostly = 0;
    for (let i = 0; i < 300; i++) {
      const a = pokerBotThinkMs(getPokerView(cheap, "p0"), DEFAULT_POKER_BOT_CONFIG, r);
      const b = pokerBotThinkMs(getPokerView(costly, "p1"), DEFAULT_POKER_BOT_CONFIG, r);
      for (const ms of [a, b]) {
        expect(ms).toBeGreaterThanOrEqual(1000);
        expect(ms).toBeLessThanOrEqual(5000);
      }
      sumCheap += a;
      sumCostly += b;
    }
    expect(sumCostly).toBeGreaterThan(sumCheap);
  });
});

describe("simulacija samo s botovima", () => {
  it.each([2, 3, 4])("%d igrača: bez odstupanja u žetonima i bez nelegalnih akcija", (players) => {
    const r = simulatePokerMatches({ matches: 150, players, seed: players * 11 });
    expect(r.chipErrors).toBe(0);
    expect(r.illegalActions).toBe(0);
    expect(r.matches.every((m) => m.hands > 0)).toBe(true);
  });
});
