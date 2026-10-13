import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { parseQuickPlayConfig } from "./quickplay";

describe("parseQuickPlayConfig", () => {
  test("izbor sa ekrana: 2 ili 4 igrača, do 11 ili 21", () => {
    assert.deepEqual(parseQuickPlayConfig({ playerCount: 2, targetScore: 11 }), {
      ok: true,
      config: { playerCount: 2, targetScore: 11, tableTheme: "classic" },
    });
    assert.deepEqual(parseQuickPlayConfig({ playerCount: 4, targetScore: 21 }), {
      ok: true,
      config: { playerCount: 4, targetScore: 21, tableTheme: "classic" },
    });
  });

  test("stari klijent bez targetScore → 21", () => {
    assert.deepEqual(parseQuickPlayConfig({ playerCount: 4 }), {
      ok: true,
      config: { playerCount: 4, targetScore: 21, tableTheme: "classic" },
    });
    assert.deepEqual(parseQuickPlayConfig({ playerCount: 4, targetScore: null }), {
      ok: true,
      config: { playerCount: 4, targetScore: 21, tableTheme: "classic" },
    });
  });

  test("cilj van ponude se odbija", () => {
    for (const targetScore of [1, 7, 9999, "21", NaN]) {
      const result = parseQuickPlayConfig({ playerCount: 4, targetScore });
      assert.equal(result.ok, false, `targetScore=${String(targetScore)}`);
    }
  });

  test("broj igrača van 2–4 se odbija", () => {
    for (const playerCount of [undefined, 1, 5, "4", 2.5]) {
      const result = parseQuickPlayConfig({ playerCount, targetScore: 21 });
      assert.equal(result.ok, false, `playerCount=${String(playerCount)}`);
    }
  });

  test("podloga: ispravna prolazi, izostavljena ili nepoznata → podrazumijevana, nikad 400", () => {
    const wood = parseQuickPlayConfig({ playerCount: 2, targetScore: 11, tableTheme: "wood" });
    assert.deepEqual(wood, {
      ok: true,
      config: { playerCount: 2, targetScore: 11, tableTheme: "wood" },
    });
    for (const tableTheme of [undefined, null, "", "marble", 1, {}, ["wood"]]) {
      const result = parseQuickPlayConfig({ playerCount: 4, targetScore: 21, tableTheme });
      assert.deepEqual(
        result,
        { ok: true, config: { playerCount: 4, targetScore: 21, tableTheme: "classic" } },
        `tableTheme=${JSON.stringify(tableTheme)}`,
      );
    }
  });
});
