import assert from "node:assert/strict";
import { test } from "node:test";

import { HAPTIC } from "./haptics";
import { trickSnapOf, trickTableCues, type TrickTableSnap } from "./trickSound";

const ME = "p_me";
const opts = { mine: (id: string) => id === ME, holdMs: 1000 };

function snap(over: Partial<TrickTableSnap> = {}): TrickTableSnap {
  return {
    dealNo: 1,
    phase: "playing",
    myTurn: false,
    plays: 0,
    doneTricks: 0,
    lastWinnerId: null,
    myPlace: null,
    ...over,
  };
}

test("prvo crtanje ne zvoni (otvaranje stola, reconnect)", () => {
  assert.deepEqual(trickTableCues(undefined, snap({ myTurn: true, plays: 3 }), opts), []);
});

test("isto stanje ne zvoni", () => {
  assert.deepEqual(trickTableCues(snap({ plays: 2 }), snap({ plays: 2 }), opts), []);
});

test("nova ruka → dijeljenje, bez karte na sto", () => {
  const prev = snap({ phase: "hand_complete", plays: 32, doneTricks: 8, lastWinnerId: "b" });
  assert.deepEqual(trickTableCues(prev, snap({ dealNo: 2 }), opts), [{ sfx: "deal" }]);
});

test("karta na sto", () => {
  assert.deepEqual(trickTableCues(snap({ plays: 1 }), snap({ plays: 2 }), opts), [{ sfx: "place" }]);
});

test("štih: moj vibrira, tuđi ne; oba čekaju da se štih pokupi", () => {
  const prev = snap({ plays: 3 });
  assert.deepEqual(trickTableCues(prev, snap({ plays: 4, doneTricks: 1, lastWinnerId: ME }), opts), [
    { sfx: "place" },
    { sfx: "capture", delayMs: 1000, haptic: HAPTIC.capture },
  ]);
  assert.deepEqual(trickTableCues(prev, snap({ plays: 4, doneTricks: 1, lastWinnerId: "b" }), opts), [
    { sfx: "place" },
    { sfx: "capture", delayMs: 1000 },
  ]);
});

test("moj red: zvono i vibracija samo na prelaz", () => {
  assert.deepEqual(trickTableCues(snap(), snap({ myTurn: true }), opts), [{ sfx: "turn", haptic: HAPTIC.turn }]);
  assert.deepEqual(trickTableCues(snap({ myTurn: true }), snap({ myTurn: true }), opts), []);
});

test("Raub: karta s talona nosiocu", () => {
  assert.deepEqual(
    trickTableCues(snap({ talonTakenBy: null }), snap({ talonTakenBy: "b" }), opts),
    [{ sfx: "place" }],
  );
});

test("kraj meča: pobjeda i poraz; prekinut meč ćuti", () => {
  const prev = snap({ plays: 3 });
  assert.deepEqual(trickTableCues(prev, snap({ plays: 3, phase: "match_finished", myPlace: 1 }), opts), [
    { sfx: "win", delayMs: 1000 },
  ]);
  assert.deepEqual(trickTableCues(prev, snap({ plays: 3, phase: "match_finished", myPlace: 3 }), opts), [
    { sfx: "lose", delayMs: 1000 },
  ]);
  assert.deepEqual(trickTableCues(prev, snap({ plays: 3, phase: "abandoned" }), opts), []);
});

test("revanš poslije kraja meča → dijeljenje", () => {
  const prev = snap({ dealNo: 9, phase: "match_finished", myPlace: 1 });
  assert.deepEqual(trickTableCues(prev, snap({ dealNo: 1 }), opts), [{ sfx: "deal" }]);
});

test("trickSnapOf broji karte i štihove", () => {
  const s = trickSnapOf(
    {
      dealNo: 3,
      phase: "playing",
      myPlayerId: ME,
      tricks: [
        { plays: [1, 2, 3, 4], winnerId: "b" },
        { plays: [1, 2], winnerId: null },
      ],
      placements: [],
    },
    true,
    "b",
  );
  assert.deepEqual(s, {
    dealNo: 3,
    phase: "playing",
    myTurn: true,
    plays: 6,
    doneTricks: 1,
    lastWinnerId: "b",
    myPlace: null,
    talonTakenBy: "b",
  });
});
