import assert from "node:assert/strict";
import { test } from "node:test";

import { raubEnabled } from "./raubRelease";

test("produkcija bez zastavice nema Raub (izdanje je svjesna odluka)", () => {
  assert.equal(raubEnabled({ appEnv: "production" }), false);
  assert.equal(raubEnabled({ appEnv: "production", flag: "1" }), true);
});

test("staging i razvoj imaju Raub; 0 ga gasi svuda", () => {
  assert.equal(raubEnabled({ appEnv: "staging" }), true);
  assert.equal(raubEnabled({}), true);
  assert.equal(raubEnabled({ appEnv: "staging", flag: "0" }), false);
});
