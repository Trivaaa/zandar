import { describe, expect, it } from "vitest";
import { simulateRaubMatches } from "./simulate";
import { createRaubRules } from "./config";
import { applyRaubAction, createRaubMatch, startRaubHand } from "./match";
import { getRaubView } from "./view";
import { DEFAULT_RAUB_BOT_CONFIG, raubBotThinkMs, raubNoHumanInHand, selectRaubBotAction } from "./bot";

function makeLcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

describe("raub bot", () => {
  it("igra samo dozvoljene poteze i odlučuje iz pogleda igrača", () => {
    const rng = makeLcg(9);
    let s = createRaubMatch({
      roomId: "r",
      matchId: "m",
      playerIds: ["a", "b", "c", "d"],
      rules: createRaubRules(4),
      rng,
    });
    for (let i = 0; i < 2000 && s.phase !== "match_finished"; i++) {
      if (s.phase === "hand_complete") {
        s = startRaubHand(s, rng);
        continue;
      }
      const pid = s.currentPlayerId!;
      const view = getRaubView(s, pid);
      const action = selectRaubBotAction(view, DEFAULT_RAUB_BOT_CONFIG, rng);
      if (action.type === "play") expect(view.legalCardIds).toContain(action.cardId);
      if (action.type === "exchange") {
        expect(action.cardIds.length).toBeLessThanOrEqual(view.maxExchange);
        expect(action.cardIds).not.toContain(view.lockedCardId);
        if (view.declarerId === view.myPlayerId) expect(action.cardIds.length).toBeLessThan(4);
      }
      s = applyRaubAction(s, pid, action);
    }
    expect(s.phase).toBe("match_finished");
  });

  it("odluka 15: Raub samo djelilac na A/K/Q/J, Moja i bez sedmice, Štih ponekad", () => {
    const rng = makeLcg(21);
    const seen = { raub: 0, moja: 0, mojaNoSeven: 0, stihYes: 0, stihNo: 0 };
    for (let m = 0; m < 30; m++) {
      let s = createRaubMatch({ roomId: "r", matchId: `m${m}`, playerIds: ["a", "b", "c", "d"], rules: createRaubRules(4), rng });
      for (let i = 0; i < 3000 && s.phase !== "match_finished"; i++) {
        if (s.phase === "hand_complete") {
          s = startRaubHand(s, rng);
          continue;
        }
        const pid = s.currentPlayerId!;
        const view = getRaubView(s, pid);
        const action = selectRaubBotAction(view, DEFAULT_RAUB_BOT_CONFIG, rng);
        if (action.type === "bid" && action.bid === "raub") {
          expect(["A", "K", "Q", "J"]).toContain(view.talon.at(-1)!.rank);
          expect(pid).toBe(view.dealerId);
          seen.raub += 1;
        }
        if (action.type === "bid" && action.bid === "moja") {
          const offered = view.talon.at(-1)!;
          if (!view.myCards.some((c) => c.rank === "7" && c.suit === offered.suit)) seen.mojaNoSeven += 1;
          seen.moja += 1;
        }
        if (action.type === "stih") seen[action.take ? "stihYes" : "stihNo"] += 1;
        s = applyRaubAction(s, pid, action);
      }
    }
    expect(seen.mojaNoSeven).toBeGreaterThan(0);
    expect(seen.raub).toBeGreaterThan(0);
    expect(seen.moja).toBeGreaterThan(0);
    expect(seen.stihYes).toBeGreaterThan(0);
    expect(seen.stihNo).toBeGreaterThan(0);
  });

  it("odluka 26: djelilac naslijepo odlučuje samo po karti (blindRaubP / blindStihP)", () => {
    const rng = makeLcg(26);
    const counts: Record<string, { raub: number; n: number }> = {};
    let stih = 0;
    let sevens = 0;
    for (let m = 0; m < 4000; m++) {
      const s = createRaubMatch({ roomId: "r", matchId: `m${m}`, playerIds: ["a", "b", "c", "d"], rules: createRaubRules(4), rng });
      const view = getRaubView(s, s.dealerId);
      if (!view.myCardsHidden) continue;
      expect(view.myCards).toEqual([]);
      const action = selectRaubBotAction(view, DEFAULT_RAUB_BOT_CONFIG, rng);
      const rank = view.talon.at(-1)!.rank;
      if (view.step === "seven_choice") {
        sevens += 1;
        if (action.type === "stih" && action.take) stih += 1;
        continue;
      }
      expect(action.type).toBe("bid");
      const e = (counts[rank] ??= { raub: 0, n: 0 });
      e.n += 1;
      if (action.type === "bid" && action.bid === "raub") e.raub += 1;
      else expect(action).toEqual({ type: "bid", bid: "pass" });
    }
    expect(counts.A!.raub).toBe(counts.A!.n);
    for (const r of ["K", "Q", "J"] as const) {
      const p = DEFAULT_RAUB_BOT_CONFIG.blindRaubP[r]!;
      expect(counts[r]!.raub / counts[r]!.n).toBeGreaterThan(p - 0.1);
      expect(counts[r]!.raub / counts[r]!.n).toBeLessThan(p + 0.1);
    }
    expect(stih / sevens).toBeGreaterThan(DEFAULT_RAUB_BOT_CONFIG.blindStihP - 0.1);
    expect(stih / sevens).toBeLessThan(DEFAULT_RAUB_BOT_CONFIG.blindStihP + 0.1);
  });

  it("odluka 17: djelilac na prvoj karti as uvijek kaže Raub, i za 1–8 s", () => {
    const rng = makeLcg(17);
    let aces = 0;
    let raubChoices = 0;
    let fastest = Infinity;
    let slowest = 0;
    for (let m = 0; m < 40; m++) {
      let s = createRaubMatch({ roomId: "r", matchId: `m${m}`, playerIds: ["a", "b", "c", "d"], rules: createRaubRules(4), rng });
      for (let i = 0; i < 3000 && s.phase !== "match_finished"; i++) {
        if (s.phase === "hand_complete") {
          s = startRaubHand(s, rng);
          continue;
        }
        const pid = s.currentPlayerId!;
        const view = getRaubView(s, pid);
        const ms = raubBotThinkMs(DEFAULT_RAUB_BOT_CONFIG, rng, view);
        // Odluka 26: i Štih naslijepo ide kroz isti raspon 1–8 s.
        if ((view.step === "bidding" && view.bidOptions?.raub) || (view.step === "seven_choice" && view.myCardsHidden)) {
          raubChoices += 1;
          expect(ms).toBeGreaterThanOrEqual(1000);
          expect(ms).toBeLessThanOrEqual(8000);
          fastest = Math.min(fastest, ms);
          slowest = Math.max(slowest, ms);
        } else {
          expect(ms).toBeGreaterThanOrEqual(2500);
          expect(ms).toBeLessThanOrEqual(7000);
        }
        const action = selectRaubBotAction(view, DEFAULT_RAUB_BOT_CONFIG, rng);
        if (view.step === "bidding" && view.bidOptions?.raub && view.talon.at(-1)!.rank === "A") {
          aces += 1;
          expect(action).toEqual({ type: "bid", bid: "raub" });
        }
        s = applyRaubAction(s, pid, action);
      }
    }
    expect(aces).toBeGreaterThan(10);
    expect(raubChoices).toBeGreaterThan(40);
    // Raspon se stvarno koristi, nije uvijek isto vrijeme.
    expect(fastest).toBeLessThan(2000);
    expect(slowest).toBeGreaterThan(7000);
  });

  it("baca grešku kad nije na potezu", () => {
    const s = createRaubMatch({
      roomId: "r",
      matchId: "m",
      playerIds: ["a", "b"],
      rules: createRaubRules(2),
      rng: makeLcg(1),
      dealerId: "a",
    });
    expect(() => selectRaubBotAction(getRaubView(s, "b"))).toThrow("BOT_NOT_ON_TURN");
  });

  it("vrijeme odluke 2,5–7 s", () => {
    const rng = makeLcg(3);
    for (let i = 0; i < 200; i++) {
      const ms = raubBotThinkMs(DEFAULT_RAUB_BOT_CONFIG, rng);
      expect(ms).toBeGreaterThanOrEqual(2500);
      expect(ms).toBeLessThanOrEqual(7000);
    }
  });
});

describe("raub simulacija (skraćena; pun broj: pnpm simulate:raub)", () => {
  for (const players of [2, 3, 4] as const) {
    it(`${players} igrača: 32 karte, 4 štiha, bez odbijenih akcija, svaki meč završava`, () => {
      const r = simulateRaubMatches({ matches: players === 4 ? 150 : 300, players, seed: players });
      expect(r.cardErrors).toBe(0);
      expect(r.trickErrors).toBe(0);
      expect(r.illegalActions).toBe(0);
      expect(r.stuck).toBe(0);
    });
  }
});

describe("raub bot: mora ići (odluka 19)", () => {
  it("kad view kaže mustGo, bot uvijek kaže „Idem”, i sa najslabijom rukom", () => {
    const s = createRaubMatch({
      roomId: "r",
      matchId: "m",
      playerIds: ["a", "b"],
      rules: createRaubRules(2),
      rng: makeLcg(5),
      dealerId: "a",
    });
    const view = {
      ...getRaubView(s, "b"),
      step: "going" as const,
      currentPlayerId: "b",
      trumpSuit: "hearts" as const,
      myCards: [
        { id: "spades-7", suit: "spades" as const, rank: "7" as const },
        { id: "spades-8", suit: "spades" as const, rank: "8" as const },
        { id: "clubs-7", suit: "clubs" as const, rank: "7" as const },
        { id: "clubs-8", suit: "clubs" as const, rank: "8" as const },
      ],
    };
    const never = () => 0.999;
    expect(selectRaubBotAction({ ...view, mustGo: false }, DEFAULT_RAUB_BOT_CONFIG, never)).toEqual({
      type: "go",
      go: false,
    });
    expect(selectRaubBotAction({ ...view, mustGo: true }, DEFAULT_RAUB_BOT_CONFIG, never)).toEqual({
      type: "go",
      go: true,
    });
  });
});

describe("raub: tempo u ruci bez čovjeka (odluka 18)", () => {
  const base = () =>
    createRaubMatch({
      roomId: "r",
      matchId: "m",
      playerIds: ["a", "b", "c", "d"],
      rules: createRaubRules(4),
      rng: makeLcg(5),
      dealerId: "a",
    });
  const withGoing = (going: Record<string, boolean | null>) => {
    const s = base();
    return { ...s, seats: s.seats.map((seat) => ({ ...seat, going: going[seat.playerId] ?? seat.going })) };
  };

  it("idle: 0,8–2 s, nasumično, raspon se koristi", () => {
    const rng = makeLcg(11);
    let fastest = Infinity;
    let slowest = 0;
    for (let i = 0; i < 200; i++) {
      const ms = raubBotThinkMs(DEFAULT_RAUB_BOT_CONFIG, rng, undefined, true);
      expect(ms).toBeGreaterThanOrEqual(800);
      expect(ms).toBeLessThanOrEqual(2000);
      fastest = Math.min(fastest, ms);
      slowest = Math.max(slowest, ms);
    }
    expect(fastest).toBeLessThan(1000);
    expect(slowest).toBeGreaterThan(1800);
  });

  it("licitacija (going null) nije ruka bez čovjeka", () => {
    expect(raubNoHumanInHand(base(), ["b"])).toBe(false);
  });

  it("čovjek koji ide → nije", () => {
    expect(raubNoHumanInHand(withGoing({ b: true }), ["b"])).toBe(false);
  });

  it("sto bez ljudi → nije", () => {
    expect(raubNoHumanInHand(withGoing({ b: false }), [])).toBe(false);
  });

  it("svi ljudi rekli „Ne idem” → jeste; jedan od dvojice ide → nije", () => {
    expect(raubNoHumanInHand(withGoing({ b: false }), ["b"])).toBe(true);
    expect(raubNoHumanInHand(withGoing({ b: false, c: false }), ["b", "c"])).toBe(true);
    expect(raubNoHumanInHand(withGoing({ b: false, c: true }), ["b", "c"])).toBe(false);
  });
});
