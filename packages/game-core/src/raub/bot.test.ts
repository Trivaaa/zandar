import { describe, expect, it } from "vitest";
import { simulateRaubMatches } from "./simulate";
import { createRaubRules } from "./config";
import { applyRaubAction, createRaubMatch, startRaubHand } from "./match";
import { getRaubView } from "./view";
import { DEFAULT_RAUB_BOT_CONFIG, raubBotThinkMs, selectRaubBotAction } from "./bot";

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
