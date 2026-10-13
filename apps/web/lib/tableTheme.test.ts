import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { DEFAULT_TABLE_THEME, parseTableTheme, TABLE_THEMES } from "@zandar/shared-types";

// Zapis iz localStorage ide kroz isti `parseTableTheme` kao i odgovor servera.
describe("parseTableTheme (zapamćena podloga)", () => {
  test("prva podloga je podrazumijevana", () => {
    assert.equal(DEFAULT_TABLE_THEME, TABLE_THEMES[0]);
    assert.equal(DEFAULT_TABLE_THEME, "classic");
  });

  test("bez zapisa → podrazumijevana", () => {
    assert.equal(parseTableTheme(null), "classic");
    assert.equal(parseTableTheme(undefined), "classic");
    assert.equal(parseTableTheme(""), "classic");
  });

  test("svaka ponuđena podloga se vraća", () => {
    for (const theme of TABLE_THEMES) assert.equal(parseTableTheme(theme), theme);
  });

  test("podloga koju više ne nudimo ili pokvaren zapis → podrazumijevana", () => {
    for (const raw of ["marble", "WOOD", " wood", '"wood"', "0", 1, {}, ["wood"]]) {
      assert.equal(parseTableTheme(raw), "classic", `zapis=${JSON.stringify(raw)}`);
    }
  });
});
