import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { BELA_QUICK_TARGETS, parseBelaTarget } from "./belaTarget";

describe("parseBelaTarget", () => {
  test("zapamćen izbor", () => {
    assert.equal(parseBelaTarget("501"), 501);
    assert.equal(parseBelaTarget("1001"), 1001);
  });

  test("bez zapisa ili van ponude → 501", () => {
    for (const raw of [null, undefined, "", "701", "21", "abc", "1001.5"]) {
      assert.equal(parseBelaTarget(raw), 501);
    }
  });

  test("ponuda je 501 i 1001", () => {
    assert.deepEqual([...BELA_QUICK_TARGETS], [501, 1001]);
  });
});
