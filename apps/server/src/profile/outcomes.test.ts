import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { matchOutcomes, type OutcomeInput, type OutcomePlayer } from "./outcomes";

const human = (id: string, extra: Partial<OutcomePlayer> = {}): OutcomePlayer => ({
  id,
  uid: `u-${id}`,
  connectionStatus: "connected",
  ...extra,
});
const bot = (id: string, tier: 1 | 2 | 3 = 2): OutcomePlayer => ({ id, isBot: true, botProfile: { tier } });

function input(players: OutcomePlayer[], places: Record<string, number | null>, extra: Partial<OutcomeInput> = {}): OutcomeInput {
  return {
    game: "raub",
    players,
    reason: "completed",
    mode: "quick_play",
    startedAt: 1000,
    now: 61_000,
    hands: 7,
    placeOf: (id) => places[id] ?? null,
    ...extra,
  };
}

const byUid = (rows: ReturnType<typeof matchOutcomes>) => Object.fromEntries(rows.map((r) => [r.uid, r.result]));

describe("matchOutcomes — ishod po igraču (SPEC_STATISTIKA §5.1)", () => {
  test("Raub 3P protiv botova: 1. mjesto = pobjeda, bot nema upis, zapis nosi polja za Ligu", () => {
    const rows = matchOutcomes(
      input([human("a"), bot("b1", 3), bot("b2", 1)], { a: 1, b1: 2, b2: 3 }, {
        target: 21,
        raubScores: { a: -1, b1: 6, b2: 13 },
      }),
    );
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0], {
      uid: "u-a",
      playerId: "a",
      result: {
        outcome: "win",
        place: 1,
        players: 3,
        mode: "quick_play",
        opponents: ["bot:3", "bot:1"],
        hands: 7,
        target: 21,
        raub: { finalScore: -1, othersRemaining: [6, 13] },
        durationMs: 60_000,
      },
    });
  });

  test("pobjeda je samo 1. mjesto: 2. od 4 je poraz", () => {
    const r = byUid(matchOutcomes(input([human("a"), human("b"), bot("c"), bot("d")], { a: 2, b: 1, c: 3, d: 4 }, { game: "poker" })));
    assert.equal(r["u-a"]!.outcome, "loss");
    assert.equal(r["u-a"]!.place, 2);
    assert.equal(r["u-b"]!.outcome, "win");
    assert.deepEqual(r["u-a"]!.opponents, ["u-b", "bot:2", "bot:2"]);
  });

  test("dijeljeno 1. mjesto u Raubu: pobjeda za oba", () => {
    const r = byUid(matchOutcomes(input([human("a"), human("b"), bot("c")], { a: 1, b: 1, c: 3 })));
    assert.equal(r["u-a"]!.outcome, "win");
    assert.equal(r["u-b"]!.outcome, "win");
  });

  test("izašao, a meč su ostali završili: napuštanje (left), bez mjesta", () => {
    const r = byUid(matchOutcomes(input([human("a", { left: true }), human("b"), bot("c")], { a: 3, b: 1, c: 2 })));
    assert.deepEqual(
      { outcome: r["u-a"]!.outcome, place: r["u-a"]!.place, left: r["u-a"]!.left },
      { outcome: "abandon", place: null, left: true },
    );
    assert.equal(r["u-b"]!.outcome, "win");
  });

  test("AFK (manje od 50 % ručnih poteza): napuštanje uz afk, i kad je bio prvi", () => {
    const r = byUid(
      matchOutcomes(
        input([human("a"), human("b"), bot("c")], { a: 1, b: 2, c: 3 }, {
          counts: { a: { manual: 2, auto: 8 }, b: { manual: 5, auto: 5 } },
        }),
      ),
    );
    assert.equal(r["u-a"]!.outcome, "abandon");
    assert.equal(r["u-a"]!.afk, true);
    assert.equal(r["u-b"]!.outcome, "loss", "tačno pola ručnih = igrao");
  });

  test("prekid: ko je ostao nema upis, ko je otišao ili mu je istekao rok dobija napuštanje", () => {
    const rows = matchOutcomes(
      input(
        [human("a"), human("b", { connectionStatus: "abandoned" }), human("c", { left: true }), bot("d")],
        {},
        { reason: "abandoned", game: "zandar" },
      ),
    );
    assert.deepEqual(rows.map((r) => [r.uid, r.result.outcome]), [
      ["u-b", "abandon"],
      ["u-c", "abandon"],
    ]);
  });

  test("zaglavljen sto / glasanje o prekidu: niko nije otišao → nikome ništa", () => {
    assert.deepEqual(matchOutcomes(input([human("a"), bot("b")], {}, { reason: "abandoned" })), []);
  });

  test("čovjek bez uid-a nema upis, ali je protivnik „human”; isti uid na dva sjedišta jednom", () => {
    const rows = matchOutcomes(input([human("a"), { id: "g", connectionStatus: "connected" }, human("a2", { uid: "u-a" })], { a: 1, g: 2, a2: 3 }));
    assert.equal(rows.length, 1);
    assert.deepEqual(rows[0]!.result.opponents, ["human", "u-a"]);
  });

  test("timska igra (Bela): partner odvojeno od protivnika, pobjeda tima", () => {
    const players = [human("a", { teamId: 0 }), bot("b", 1), human("c", { teamId: 0 }), bot("d", 3)].map((p, i) =>
      p.teamId === undefined ? { ...p, teamId: i % 2 } : p,
    );
    const r = byUid(matchOutcomes(input(players, { a: 1, b: 2, c: 1, d: 2 }, { game: "bela", target: 501 })));
    assert.equal(r["u-a"]!.outcome, "win");
    assert.equal(r["u-a"]!.partner, "u-c");
    assert.deepEqual(r["u-a"]!.opponents, ["bot:1", "bot:3"]);
  });

  test("bez starta u ovom procesu (restart): nema trajanja", () => {
    const rows = matchOutcomes(input([human("a"), bot("b")], { a: 1, b: 2 }, { startedAt: undefined }));
    assert.equal(rows[0]!.result.durationMs, undefined);
  });
});
