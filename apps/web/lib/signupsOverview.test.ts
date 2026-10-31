import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { groupSignups } from "./signupsOverview";

describe("groupSignups", () => {
  test("prazno", () => {
    assert.deepEqual(groupSignups([]), []);
  });

  test("ista adresa, dvije igre: jedan red, najraniji datum", () => {
    assert.deepEqual(
      groupSignups([
        { email: "a@b.com", game: "poker", createdAt: 20 },
        { email: "a@b.com", game: "raub", createdAt: 10 },
      ]),
      [{ email: "a@b.com", games: ["poker", "raub"], firstAt: 10 }],
    );
  });

  test("najnovija adresa prva", () => {
    const rows = groupSignups([
      { email: "stara@b.com", game: "poker", createdAt: 1 },
      { email: "nova@b.com", game: "poker", createdAt: 2 },
    ]);
    assert.deepEqual(rows.map((r) => r.email), ["nova@b.com", "stara@b.com"]);
  });

  test("ponovljena igra se ne duplira", () => {
    const [row] = groupSignups([
      { email: "a@b.com", game: "poker", createdAt: 1 },
      { email: "a@b.com", game: "poker", createdAt: 2 },
    ]);
    assert.deepEqual(row!.games, ["poker"]);
  });
});
