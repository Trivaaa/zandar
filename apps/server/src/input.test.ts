import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { DISPLAY_NAME_MAX_LENGTH, parseDisplayName, parseRoomTargetScore } from "./input";

describe("parseDisplayName", () => {
  test("obično ime prolazi, razmaci sa ivica se skidaju", () => {
    assert.equal(parseDisplayName("  Marko "), "Marko");
    assert.equal(parseDisplayName("Đorđe Ž."), "Đorđe Ž.");
  });

  test("ne-string i prazno → null (400, ne 500)", () => {
    for (const value of [undefined, null, 123, {}, [], true, "", "   "]) {
      assert.equal(parseDisplayName(value), null, `vrijednost: ${JSON.stringify(value)}`);
    }
  });

  test("predugo ime se skraćuje, ne odbija", () => {
    const name = parseDisplayName("a".repeat(200));
    assert.equal(name, "a".repeat(DISPLAY_NAME_MAX_LENGTH));
  });

  test("skraćivanje ne siječe emoji i ne ostavlja razmak na kraju", () => {
    const emoji = "🃏".repeat(DISPLAY_NAME_MAX_LENGTH + 5);
    assert.equal(Array.from(parseDisplayName(emoji) ?? "").length, DISPLAY_NAME_MAX_LENGTH);
    const spaced = `${"a".repeat(DISPLAY_NAME_MAX_LENGTH - 1)} bbb`;
    assert.equal(parseDisplayName(spaced), "a".repeat(DISPLAY_NAME_MAX_LENGTH - 1));
  });
});

describe("parseRoomTargetScore", () => {
  test("11 i 21 prolaze, izostavljen cilj → 21 (stari klijenti)", () => {
    assert.equal(parseRoomTargetScore(11, "zandar"), 11);
    assert.equal(parseRoomTargetScore(21, "zandar"), 21);
    assert.equal(parseRoomTargetScore(undefined, "zandar"), 21);
    assert.equal(parseRoomTargetScore(null, "zandar"), 21);
  });

  test("cilj van ponude se odbija", () => {
    for (const value of [0, 1, 9999, "21", NaN, {}]) {
      assert.equal(parseRoomTargetScore(value, "zandar"), null);
    }
  });

  test("poker i raub uvijek 21, šta god stiglo", () => {
    for (const game of ["poker", "raub"] as const) {
      assert.equal(parseRoomTargetScore(9999, game), 21);
      assert.equal(parseRoomTargetScore(undefined, game), 21);
    }
  });
});
