import assert from "node:assert/strict";
import { test } from "node:test";

import { HAPTIC } from "./haptics";
import { pokerFxFeedback, turnWarning } from "./pokerSound";

const ME = "p_me";

test("dijeljenje, ulozi, check i fold", () => {
  assert.deepEqual(pokerFxFeedback({ kind: "deal", order: [ME, "b"] }, ME), { sfx: "deal" });
  assert.deepEqual(pokerFxFeedback({ kind: "chipsToBet", playerId: "b" }, ME), { sfx: "chips" });
  assert.deepEqual(pokerFxFeedback({ kind: "chipsToBet", playerId: ME }, ME), { sfx: "chips", haptic: HAPTIC.play });
  assert.deepEqual(pokerFxFeedback({ kind: "betsToPot", playerIds: [ME, "b"] }, ME), { sfx: "chips" });
  assert.deepEqual(pokerFxFeedback({ kind: "check", playerId: "b" }, ME), { sfx: "lift" });
  assert.equal(pokerFxFeedback({ kind: "fold", playerId: "b" }, ME), null);
});

test("pot: pobjeda je moja samo kad sam među dobitnicima", () => {
  assert.deepEqual(pokerFxFeedback({ kind: "potToWinners", winners: ["b", ME] }, ME), { sfx: "win", haptic: HAPTIC.capture });
  assert.deepEqual(pokerFxFeedback({ kind: "potToWinners", winners: ["b"] }, ME), { sfx: "chips" });
});

test("upozorenje na 5 s: samo na prelaz, jednom", () => {
  assert.equal(turnWarning(6, 5), true);
  assert.equal(turnWarning(null, 4), true); // otvorio sto kad je ostalo malo
  assert.equal(turnWarning(5, 4), false);
  assert.equal(turnWarning(7, 6), false);
  assert.equal(turnWarning(1, 0), false);
});
