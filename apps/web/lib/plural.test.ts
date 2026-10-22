import { test } from "node:test";
import assert from "node:assert/strict";

import { pluralForm } from "./plural";
import { sr } from "./sr";

test("množina: jednina, paukal, genitiv — i 11–14 su genitiv", () => {
  const f = (n: number) => pluralForm(n, "1", "2", "5");
  assert.deepEqual([0, 1, 2, 4, 5, 11, 12, 14, 21, 22, 25, 101, 111, 112, 122].map(f), [
    "5", "1", "2", "2", "5", "5", "5", "5", "1", "2", "5", "1", "5", "5", "2",
  ]);
});

test("broj partija kako ga piše spec", () => {
  assert.equal(sr.profile.completed(1), "1 završena partija");
  assert.equal(sr.profile.completed(3), "3 završene partije");
  assert.equal(sr.profile.completed(12), "12 završenih partija");
  assert.equal(sr.profile.completed(21), "21 završena partija");
  assert.equal(sr.profile.guestCompleted(12), "Gost · 12 završenih partija");
});
