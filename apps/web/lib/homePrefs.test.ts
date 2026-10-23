import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseHomeHistory } from "./homePrefs";

// Zapis preživljava restart aplikacije (localStorage); ovo je jedini put nazad.
describe("parseHomeHistory (zakačena i igrane igre)", () => {
  test("bez zapisa → ništa zakačeno, ništa igrano", () => {
    assert.deepEqual(parseHomeHistory(null), { pinned: null, played: {} });
    assert.deepEqual(parseHomeHistory(""), { pinned: null, played: {} });
  });

  test("validan zapis se vraća", () => {
    assert.deepEqual(parseHomeHistory('{"pinned":"poker","played":{"zandar":100,"raub":200}}'), {
      pinned: "poker",
      played: { zandar: 100, raub: 200 },
    });
  });

  test("igra koje više nema i pokvarene vrijednosti se odbacuju, ostalo ostaje", () => {
    assert.deepEqual(parseHomeHistory('{"pinned":"remi","played":{"zandar":"x","bela":5,"poker":7}}'), {
      pinned: null,
      played: { poker: 7 },
    });
  });

  test("pokvaren JSON i ne-objekat → prazno", () => {
    for (const raw of ["{", "42", '"poker"', "null"]) {
      assert.deepEqual(parseHomeHistory(raw), { pinned: null, played: {} }, raw);
    }
  });
});
