import { test } from "node:test";
import assert from "node:assert/strict";

import { dayMonth } from "./dates";

test("datum brave nadimka: dan i mjesec u genitivu, godina samo kad nije ova", () => {
  const now = new Date(2026, 9, 22).getTime();
  assert.equal(dayMonth(new Date(2026, 10, 9).getTime(), now), "9. novembra");
  assert.equal(dayMonth(new Date(2026, 6, 1).getTime(), now), "1. jula");
  assert.equal(dayMonth(new Date(2027, 0, 15).getTime(), now), "15. januara 2027.");
});
