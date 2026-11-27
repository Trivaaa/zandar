import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { nameBreakParts } from "./seatName";

describe("nameBreakParts", () => {
  test("spoj velikim slovom", () => {
    assert.deepEqual(nameBreakParts("KomandantŠef"), ["Komandant", "Šef"]);
    assert.deepEqual(nameBreakParts("MajstorKap"), ["Majstor", "Kap"]);
    assert.deepEqual(nameBreakParts("BataPenzioner"), ["Bata", "Penzioner"]);
  });

  test("razmak ostaje u dijelu (prelom po razmaku radi sam)", () => {
    assert.deepEqual(nameBreakParts("Ana Marić"), ["Ana Marić"]);
  });

  test("bez spoja: jedan dio", () => {
    assert.deepEqual(nameBreakParts("Marko"), ["Marko"]);
    assert.deepEqual(nameBreakParts("QA"), ["QA"]);
    assert.deepEqual(nameBreakParts("QaT514749"), ["Qa", "T514749"]);
    assert.deepEqual(nameBreakParts(""), []);
  });
});
