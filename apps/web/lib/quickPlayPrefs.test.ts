import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { DEFAULT_QUICK_PLAY_PREFS, parseQuickPlayPrefs } from "./quickPlayPrefs";

describe("parseQuickPlayPrefs", () => {
  test("bez zapisa → 4 / 21, kako je brza igra radila prije izbora", () => {
    assert.deepEqual(parseQuickPlayPrefs(null), { playerCount: 4, targetScore: 21 });
    assert.deepEqual(parseQuickPlayPrefs(""), DEFAULT_QUICK_PLAY_PREFS);
  });

  test("validan zapis se vraća", () => {
    assert.deepEqual(parseQuickPlayPrefs('{"playerCount":2,"targetScore":11}'), {
      playerCount: 2,
      targetScore: 11,
    });
  });

  test("pokvaren JSON i ne-objekat → podrazumijevano", () => {
    assert.deepEqual(parseQuickPlayPrefs("{"), DEFAULT_QUICK_PLAY_PREFS);
    assert.deepEqual(parseQuickPlayPrefs("null"), DEFAULT_QUICK_PLAY_PREFS);
    assert.deepEqual(parseQuickPlayPrefs("7"), DEFAULT_QUICK_PLAY_PREFS);
  });

  test("sto za 3 se u brzoj igri ne nudi", () => {
    assert.equal(parseQuickPlayPrefs('{"playerCount":3,"targetScore":11}').playerCount, 4);
  });

  test("nevalidno polje ne odnosi ono drugo", () => {
    assert.deepEqual(parseQuickPlayPrefs('{"playerCount":2,"targetScore":15}'), {
      playerCount: 2,
      targetScore: 21,
    });
    assert.deepEqual(parseQuickPlayPrefs('{"playerCount":"2","targetScore":11}'), {
      playerCount: 4,
      targetScore: 11,
    });
  });
});
