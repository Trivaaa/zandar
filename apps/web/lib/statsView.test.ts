import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { EMPTY_GAME_STATS, type GameStats } from "@zandar/shared-types";

import { gameStatsView, matchEndLine, myGameLine, statsGames } from "./statsView";

const g = (x: Partial<GameStats>): GameStats => ({ ...EMPTY_GAME_STATS, ...x });

describe("statsGames — koje igre i kojim redom", () => {
  test("najviše partija prvo, nerješeno po redu početne; igre bez partija otpadaju", () => {
    const stats = {
      v: 1 as const,
      since: 1,
      byGame: { zandar: g({ won: 2, lost: 1 }), raub: g({ won: 1, lost: 1, abandoned: 1 }), bela: g({}), poker: g({ lost: 5 }) },
    };
    assert.deepEqual(statsGames(stats, ["raub", "bela", "poker", "zandar"]), ["poker", "raub", "zandar"]);
    assert.deepEqual(statsGames(undefined, ["raub"]), []);
  });
});

describe("gameStatsView", () => {
  test("procenat tek od 5 završenih; napuštene ne ulaze u procenat, ulaze u Završava", () => {
    const small = gameStatsView("bela", g({ won: 3, lost: 1, abandoned: 1 }));
    assert.equal(small.percent, null);
    assert.equal(small.finished, 4);
    assert.equal(small.completes, 80);
    const big = gameStatsView("raub", g({ won: 14, lost: 27, abandoned: 3 }));
    assert.equal(big.percent, 34);
    assert.equal(big.completes, 93);
  });

  test("red konteksta: samo poker i Raub, po najčešćem stolu, samo za 3–4 igrača", () => {
    assert.equal(gameStatsView("poker", g({ won: 8, lost: 27, tables: { "4": 30, "3": 5 } })).tableSize, 4);
    assert.equal(gameStatsView("raub", g({ won: 3, lost: 3, tables: { "2": 6, "3": 2 } })).tableSize, null, "Raub 2P: polazište 50 %");
    assert.equal(gameStatsView("bela", g({ won: 3, lost: 3, tables: { "4": 6 } })).tableSize, null, "timska igra");
    assert.equal(gameStatsView("raub", g({ won: 3, lost: 3 })).tableSize, null, "zapisi prije F1 nemaju tables");
    assert.equal(gameStatsView("raub", g({ won: 1, lost: 1, tables: { "3": 2, "4": 2 } })).tableSize, 4, "nerješeno → veći sto");
  });

  test("bez partija: nema procenta ni Završava", () => {
    const v = gameStatsView("zandar", g({}));
    assert.equal(v.percent, null);
    assert.equal(v.completes, null);
    assert.equal(v.share, 0);
  });
});

describe("myGameLine (S2)", () => {
  test("partije sa napuštenim; procenat po istom pragu", () => {
    assert.deepEqual(myGameLine("raub", g({ won: 14, lost: 27 })), { matches: 41, percent: 34 });
    assert.deepEqual(myGameLine("zandar", g({ won: 2, lost: 1 })), { matches: 3, percent: null });
    assert.equal(myGameLine("poker", undefined), null);
    assert.equal(myGameLine("poker", g({})), null);
  });
});

describe("matchEndLine (S3)", () => {
  const up = (outcome: "win" | "loss" | "abandon", before: GameStats | null, after: GameStats) => ({ game: "raub" as const, outcome, before, after });

  test("pobjeda bez niza, pobjeda sa nizom, novi rekord", () => {
    assert.deepEqual(matchEndLine(up("win", null, g({ won: 1, streak: 1, bestStreak: 1 }))), { kind: "win", won: 1 });
    assert.deepEqual(
      matchEndLine(up("win", g({ won: 14, streak: 2, bestStreak: 5 }), g({ won: 15, streak: 3, bestStreak: 5 }))),
      { kind: "streak", won: 15, streak: 3 },
    );
    assert.deepEqual(
      matchEndLine(up("win", g({ won: 20, streak: 5, bestStreak: 5 }), g({ won: 21, streak: 6, bestStreak: 6 }))),
      { kind: "record", streak: 6 },
    );
    assert.deepEqual(
      matchEndLine(up("win", g({ won: 1, streak: 1, bestStreak: 1 }), g({ won: 2, streak: 2, bestStreak: 2 }))),
      { kind: "streak", won: 2, streak: 2 },
      "prvi niz od 2 nije „rekord”",
    );
  });

  test("poraz: broj partije i procenat (ispod 5 bez procenta); napuštanje nema red", () => {
    assert.deepEqual(matchEndLine(up("loss", null, g({ won: 14, lost: 28 }))), { kind: "loss", match: 42, percent: 33 });
    assert.deepEqual(matchEndLine(up("loss", null, g({ won: 1, lost: 3 }))), { kind: "loss", match: 4, percent: null });
    assert.equal(matchEndLine(up("abandon", null, g({ abandoned: 1 }))), null);
  });
});
