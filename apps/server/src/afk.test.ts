import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { countMove, countsFor, isAfk, ownEndReason, stallApplies, type MoveCounts } from "./afk";

describe("countMove / countsFor", () => {
  test("broji po igraču i po vrsti poteza", () => {
    const room: { moveCounts?: MoveCounts } = {};
    countMove(room, "m1", "a", "manual");
    countMove(room, "m1", "a", "auto");
    countMove(room, "m1", "a", "auto");
    countMove(room, "m1", "b", "manual");
    assert.deepEqual(countsFor(room, "m1"), {
      a: { manual: 1, auto: 2 },
      b: { manual: 1, auto: 0 },
    });
  });

  test("novi meč (revanš) briše stare brojače", () => {
    const room: { moveCounts?: MoveCounts } = {};
    countMove(room, "m1", "a", "auto");
    countMove(room, "m1-rematch-1", "a", "manual");
    assert.deepEqual(countsFor(room, "m1-rematch-1"), { a: { manual: 1, auto: 0 } });
    assert.equal(countsFor(room, "m1"), undefined);
  });

  test("soba bez brojača (stari snapshot) → nepoznato", () => {
    assert.equal(countsFor({}, "m1"), undefined);
  });
});

describe("isAfk — prag 50 % ručnih poteza", () => {
  test("bez brojača ili bez poteza: ne zna se → nije AFK", () => {
    assert.equal(isAfk(undefined), false);
    assert.equal(isAfk({ manual: 0, auto: 0 }), false);
  });

  test("1 ručni od 3 → AFK", () => {
    assert.equal(isAfk({ manual: 1, auto: 2 }), true);
  });

  test("tačno pola → igrao", () => {
    assert.equal(isAfk({ manual: 2, auto: 2 }), false);
  });

  test("sve auto → AFK; sve ručno → igrao", () => {
    assert.equal(isAfk({ manual: 0, auto: 12 }), true);
    assert.equal(isAfk({ manual: 12, auto: 0 }), false);
  });

  test("prag je konfiguracija", () => {
    const cfg = { minManualShare: 0.8, nextHandIdleMs: 1 };
    assert.equal(isAfk({ manual: 7, auto: 3 }, cfg), true);
    assert.equal(isAfk({ manual: 8, auto: 2 }, cfg), false);
  });
});

describe("ownEndReason", () => {
  test("završen meč: igrao → completed, AFK → abandoned + afk, izašao → abandoned + left", () => {
    assert.deepEqual(ownEndReason("completed", {}, { manual: 9, auto: 1 }), {
      reason: "completed",
      left: false,
      afk: false,
    });
    assert.deepEqual(ownEndReason("completed", {}, { manual: 1, auto: 9 }), {
      reason: "abandoned",
      left: false,
      afk: true,
    });
    assert.deepEqual(ownEndReason("completed", { left: true }, { manual: 1, auto: 9 }), {
      reason: "abandoned",
      left: true,
      afk: false,
    });
  });

  test("prekinut meč ostaje prekinut, bez oznake afk", () => {
    assert.deepEqual(ownEndReason("abandoned", {}, { manual: 0, auto: 5 }), {
      reason: "abandoned",
      left: false,
      afk: false,
    });
  });
});

describe("stallApplies — rok za „Sljedeća ruka” samo kad čovjek igra sam protiv botova", () => {
  const h = { isBot: false };
  const b = { isBot: true };
  test("1 čovjek + botovi → rok", () => {
    assert.equal(stallApplies([h, b, b, b]), true);
    assert.equal(stallApplies([h, b]), true);
  });
  test("dva ili više ljudi → bez roka, i kad ima botova", () => {
    assert.equal(stallApplies([h, h, b, b]), false);
    assert.equal(stallApplies([h, h]), false);
    assert.equal(stallApplies([h, h, h, h]), false);
  });
});
