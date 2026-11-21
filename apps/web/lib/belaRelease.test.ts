import assert from "node:assert/strict";
import { test } from "node:test";

import { belaEnabled } from "./belaRelease";

test("produkcija bez zastavice nema Belu (izdanje je svjesna odluka)", () => {
  assert.equal(belaEnabled({ appEnv: "production" }), false);
  assert.equal(belaEnabled({ appEnv: "production", flag: "1" }), true);
});

test("staging i razvoj imaju Belu; 0 je gasi svuda", () => {
  assert.equal(belaEnabled({ appEnv: "staging" }), true);
  assert.equal(belaEnabled({}), true);
  assert.equal(belaEnabled({ appEnv: "staging", flag: "0" }), false);
});
