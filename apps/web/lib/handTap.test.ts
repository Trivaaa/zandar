import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { Card } from "@zandar/shared-types";
import { decideHandTap, resolveQueuedPlay, type HandTapInput } from "./handTap";

const card = (suit: Card["suit"], rank: Card["rank"]): Card =>
  ({ id: `${rank}-${suit}`, suit, rank }) as Card;

const FIVE = card("diamonds", "5");
const NINE = card("diamonds", "9");
const T5h = card("hearts", "5");
const T5s = card("spades", "5");
const T9 = card("clubs", "9");
const TK = card("clubs", "K");

/** Moj potez, ništa izabrano, sto miran, prazan. */
const input = (over: Partial<HandTapInput>): HandTapInput => ({
  card: FIVE,
  selectedId: null,
  myTurn: true,
  busy: false,
  tableBusy: false,
  table: [],
  ...over,
});

describe("decideHandTap — dok sto animira prethodni potez (QA P6)", () => {
  test("prvi dodir podiže kartu i dok sto radi (ranije se gubio)", () => {
    assert.deepEqual(decideHandTap(input({ tableBusy: true })), { kind: "select", cardId: FIVE.id });
  });

  test("drugi dodir iste karte ide u red, ne igra nad starim stolom", () => {
    const tap = decideHandTap(input({ tableBusy: true, selectedId: FIVE.id, table: [TK] }));
    assert.deepEqual(tap, { kind: "queue", cardId: FIVE.id });
  });

  test("druga karta dok sto radi prebacuje izbor", () => {
    const tap = decideHandTap(input({ card: NINE, tableBusy: true, selectedId: FIVE.id }));
    assert.deepEqual(tap, { kind: "select", cardId: NINE.id });
  });

  test("nije moj potez ili se čeka server → ništa", () => {
    assert.equal(decideHandTap(input({ myTurn: false })).kind, "ignore");
    assert.equal(decideHandTap(input({ busy: true, selectedId: FIVE.id })).kind, "ignore");
    assert.equal(decideHandTap(input({ myTurn: false, tableBusy: true })).kind, "ignore");
  });
});

describe("decideHandTap — miran sto (ponašanje kao ranije)", () => {
  test("drugi dodir bez kupljenja baca kartu", () => {
    const tap = decideHandTap(input({ selectedId: FIVE.id, table: [TK] }));
    assert.deepEqual(tap, { kind: "play", cardId: FIVE.id, captureIds: [] });
  });

  test("drugi dodir sa jednim kupljenjem kupi", () => {
    const tap = decideHandTap(input({ selectedId: FIVE.id, table: [T5h, TK] }));
    assert.deepEqual(tap, { kind: "play", cardId: FIVE.id, captureIds: [T5h.id] });
  });

  test("više kupljenja → izbor grupe na stolu", () => {
    const tap = decideHandTap(input({ selectedId: FIVE.id, table: [T5h, T5s] }));
    assert.deepEqual(tap, { kind: "choose" });
  });
});

describe("resolveQueuedPlay — izvršenje kad se sto smiri", () => {
  test("bez kupljenja na NOVOM stolu → bacanje", () => {
    assert.deepEqual(resolveQueuedPlay(FIVE.id, [FIVE, NINE], [TK]), {
      kind: "play",
      cardId: FIVE.id,
      captureIds: [],
    });
  });

  test("jedno kupljenje → kupi; force-capture nikad ne postaje bacanje", () => {
    // Protivnik je upravo bacio devetku: na novom stolu je kupljenje obavezno.
    const next = resolveQueuedPlay(NINE.id, [FIVE, NINE], [T9, TK]);
    assert.deepEqual(next, { kind: "play", cardId: NINE.id, captureIds: [T9.id] });
  });

  test("više kupljenja → ostaje izbor igraču", () => {
    assert.deepEqual(resolveQueuedPlay(FIVE.id, [FIVE], [T5h, T5s]), { kind: "choose" });
  });

  test("karta više nije u ruci → red se odbacuje", () => {
    assert.deepEqual(resolveQueuedPlay(FIVE.id, [NINE], [TK]), { kind: "drop" });
  });
});
