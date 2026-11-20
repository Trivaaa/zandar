import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { ActiveTable } from "@zandar/shared-types";

import { blocksNewTable, dismissKey, isHidden, resumeView } from "./resumeView";

const base: ActiveTable = {
  roomId: "sto1",
  game: "zandar",
  matchId: "m1",
  phase: "playing",
  myTurn: false,
  waitingForMe: false,
  state: { kind: "score", mine: 7, theirs: 5, team: true },
};

describe("resumeView — tekstovi sa table", () => {
  test("V1: Žandar 4P na potezu", () => {
    assert.deepEqual(resumeView({ ...base, myTurn: true }), {
      tone: "turn",
      top: "NA POTEZU SI",
      detail: "Vi 7 : 5 Oni",
    });
  });

  test("2P: ime protivnika", () => {
    const v = resumeView({ ...base, state: { kind: "score", mine: 7, theirs: 5, team: false, opponentName: "Marko" } });
    assert.equal(v.detail, "Ti 7 : 5 Marko");
    assert.equal(v.tone, "away");
    assert.equal(v.top, "IGRA SE BEZ TEBE");
  });

  test("V2: Poker žetoni, množina", () => {
    assert.equal(resumeView({ ...base, game: "poker", state: { kind: "chips", stack: 140 } }).detail, "140 žetona");
    assert.equal(resumeView({ ...base, game: "poker", state: { kind: "chips", stack: 21 } }).detail, "21 žeton");
    assert.equal(resumeView({ ...base, game: "poker", state: { kind: "chips", stack: 3 } }).detail, "3 žetona");
  });

  test("V3: Raub do 0", () => {
    assert.equal(resumeView({ ...base, game: "raub", state: { kind: "toZero", score: 9 } }).detail, "do 0 ti fali 9");
  });

  test("lobi i pauza: STO TE ČEKA", () => {
    const lobby = resumeView({ ...base, phase: "lobby", matchId: "", state: { kind: "seats", taken: 3, total: 4 } });
    assert.deepEqual(lobby, { tone: "waiting", top: "STO TE ČEKA", detail: "3 od 4 igrača" });
    assert.equal(resumeView({ ...base, waitingForMe: true }).tone, "waiting");
  });

  test("V6: ishod", () => {
    const won = resumeView({ ...base, phase: "finished", result: { kind: "score", won: true, mine: 11, theirs: 8 } });
    assert.deepEqual(won, { tone: "done", top: "PARTIJA ZAVRŠENA", detail: "Pobjeda · 11 : 8" });
    const place = resumeView({ ...base, game: "raub", phase: "finished", result: { kind: "place", won: false, place: 2 } });
    assert.equal(place.detail, "2. mjesto");
  });
});

describe("zatvaranje i list", () => {
  test("zatvorena V6 traka se ne crta; revanš (nova partija) opet da", () => {
    const done: ActiveTable = { ...base, phase: "finished", result: { kind: "score", won: true, mine: 11, theirs: 8 } };
    const dismissed = new Set([dismissKey(done)]);
    assert.equal(isHidden(done, dismissed), true);
    assert.equal(isHidden({ ...done, matchId: "m1-rematch-1" }, dismissed), false);
    assert.equal(isHidden(base, new Set([dismissKey(base)])), false);
  });

  test("list „Već igraš“ samo dok partija traje", () => {
    assert.equal(blocksNewTable(base), true);
    assert.equal(blocksNewTable({ ...base, phase: "lobby" }), false);
    assert.equal(blocksNewTable({ ...base, phase: "finished" }), false);
    assert.equal(blocksNewTable(null), false);
  });
});
