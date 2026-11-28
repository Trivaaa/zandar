import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { EMPTY_GAME_STATS } from "@zandar/shared-types";

import { canSeeStats, sharedStats } from "./statsAccess";

describe("canSeeStats — ko vidi tuđu statistiku (v0.3)", () => {
  const base = { relation: "none" as const, blockedEitherWay: false, hidden: false, sharesPrivateTable: false };
  test("prijatelj ili isti privatni sto: da; inače ne", () => {
    assert.equal(canSeeStats({ ...base, relation: "friends" }), true);
    assert.equal(canSeeStats({ ...base, sharesPrivateTable: true }), true);
    assert.equal(canSeeStats(base), false, "brza igra bez prijateljstva");
    assert.equal(canSeeStats({ ...base, relation: "outgoing" }), false, "poslat zahtjev nije prijateljstvo");
  });
  test("skrivena, blokada i sebe: ne", () => {
    assert.equal(canSeeStats({ ...base, relation: "friends", hidden: true }), false);
    assert.equal(canSeeStats({ ...base, sharesPrivateTable: true, blockedEitherWay: true }), false);
    assert.equal(canSeeStats({ ...base, relation: "self", sharesPrivateTable: true }), false);
  });
});

describe("sharedStats — šta drugi vidi", () => {
  const g = { ...EMPTY_GAME_STATS, lastAt: 99 };
  test("ispod 10 započetih: bez napuštenih i bez Završava; nikad lastAt", () => {
    const s = sharedStats({ v: 1, since: 5, byGame: { raub: { ...g, won: 3, lost: 4, abandoned: 2 } } })!;
    assert.equal(s.showCompletes, false);
    assert.deepEqual(s.byGame.raub, { won: 3, lost: 4, abandoned: 0, streak: 0, bestStreak: 0 });
  });
  test("od 10 započetih (sve igre zajedno): napuštene i Završava", () => {
    const s = sharedStats({
      v: 1,
      since: 5,
      byGame: { raub: { ...g, won: 3, lost: 4, abandoned: 1 }, poker: { ...g, lost: 2, tables: { "4": 2 } } },
    })!;
    assert.equal(s.showCompletes, true);
    assert.equal(s.byGame.raub!.abandoned, 1);
    assert.deepEqual(s.byGame.poker!.tables, { "4": 2 });
    assert.ok(!JSON.stringify(s).includes("lastAt"));
  });
  test("bez statistike: ništa", () => {
    assert.equal(sharedStats(undefined), undefined);
  });
});
