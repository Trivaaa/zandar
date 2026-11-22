import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { DEFAULT_QUICK_PLAY_PREFS, parseQuickPlayPrefs, quickPlayPrefsKey } from "./quickPlayPrefs";
import { tableThemeKey } from "./tableTheme";

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

describe("ključevi po igri (SPEC_POCETNA §4)", () => {
  test("Žandar zadržava zatečene ključe — niko ne gubi izbor", () => {
    assert.equal(quickPlayPrefsKey(), "zandar:quickplay");
    assert.equal(quickPlayPrefsKey("zandar"), "zandar:quickplay");
    assert.equal(tableThemeKey("zandar"), "zandar:table");
  });

  test("druga igra ima svoj ključ", () => {
    assert.equal(quickPlayPrefsKey("poker"), "kartaonica:quickplay:poker");
    assert.equal(tableThemeKey("poker"), "kartaonica:table:poker");
  });
});

describe("Raub: podrazumijevano 11, 21 iz podešavanja", () => {
  test("bez zapisa i sa pokvarenim ciljem → 11", () => {
    assert.equal(parseQuickPlayPrefs(null, "raub").targetScore, 11);
    assert.equal(parseQuickPlayPrefs('{"targetScore":15}', "raub").targetScore, 11);
    assert.equal(parseQuickPlayPrefs("{", "raub").targetScore, 11);
  });

  test("izabrano 21 ostaje 21", () => {
    assert.equal(parseQuickPlayPrefs('{"playerCount":4,"targetScore":21}', "raub").targetScore, 21);
  });

  test("nov ključ — stari zapis sa 21 koje niko nije birao se ne čita", () => {
    assert.equal(quickPlayPrefsKey("raub"), "kartaonica:quickplay:raub:v2");
  });

  test("Žandar ostaje na 21", () => {
    assert.equal(parseQuickPlayPrefs(null).targetScore, 21);
    assert.equal(parseQuickPlayPrefs(null, "zandar").targetScore, 21);
  });
});
