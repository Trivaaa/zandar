import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

import { UI_TRAIL_MAX, resetUiTrail, uiTrail, uiTrailLastError, uiTrailSnapshot } from "./uiTrail";

describe("uiTrail", () => {
  beforeEach(() => resetUiTrail());

  test("čuva samo zadnjih 20, najstariji prvi, `ago` od sada", () => {
    for (let i = 0; i < UI_TRAIL_MAX + 5; i++) uiTrail("tap", `c${i}`, 1000 + i);
    const snap = uiTrailSnapshot(2000);
    assert.equal(snap.length, UI_TRAIL_MAX);
    assert.equal(snap[0]!.d, "c5");
    assert.equal(snap.at(-1)!.ago, 2000 - (1000 + UI_TRAIL_MAX + 4));
  });

  test("pojedinost se skraćuje; bez nje nema polja", () => {
    uiTrail("send", "x".repeat(100), 1);
    uiTrail("ok", undefined, 2);
    const [a, b] = uiTrailSnapshot(3);
    assert.equal(a!.d!.length, 48);
    assert.equal("d" in b!, false);
  });

  test("zadnja greška", () => {
    assert.equal(uiTrailLastError(), null);
    uiTrail("error", "STALE_STATE", 1);
    uiTrail("ok", undefined, 2);
    uiTrail("error", "NOT_YOUR_TURN", 3);
    assert.equal(uiTrailLastError(), "NOT_YOUR_TURN");
  });
});
