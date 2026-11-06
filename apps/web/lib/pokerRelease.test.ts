import assert from "node:assert/strict";
import { test } from "node:test";

import { pokerEnabled } from "./pokerRelease";

test("produkcija bez zastavice nema poker (IARC prije izdanja)", () => {
  assert.equal(pokerEnabled({ appEnv: "production" }), false);
  assert.equal(pokerEnabled({ appEnv: "production", flag: "1" }), true);
});

test("staging i razvoj imaju poker; 0 ga gasi svuda", () => {
  assert.equal(pokerEnabled({ appEnv: "staging" }), true);
  assert.equal(pokerEnabled({}), true);
  assert.equal(pokerEnabled({ appEnv: "staging", flag: "0" }), false);
});
