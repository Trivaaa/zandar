import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { HU_SUIT_NAME, huAsset, huRankLabel, huSuitIcon } from "./hungarianDeck";
import { cardLabel } from "./raubView";

describe("mađarice (odluka 12)", () => {
  test("francuska karta → slika mađarice", () => {
    assert.equal(huAsset({ suit: "spades", rank: "J" }), "leaves_unter");
    assert.equal(huAsset({ suit: "hearts", rank: "Q" }), "hearts_ober");
    assert.equal(huAsset({ suit: "diamonds", rank: "K" }), "bells_king");
    assert.equal(huAsset({ suit: "clubs", rank: "A" }), "acorns_ace");
    assert.equal(huAsset({ suit: "clubs", rank: "10" }), "acorns_10");
    assert.equal(huAsset({ suit: "diamonds", rank: "7" }), "bells_7");
  });
  test("natpis: U i O kao na karti, boja tikva", () => {
    assert.equal(huRankLabel("J"), "U");
    assert.equal(huRankLabel("Q"), "O");
    assert.equal(huRankLabel("10"), "10");
    assert.equal(HU_SUIT_NAME.diamonds, "tikva");
    assert.equal(cardLabel({ suit: "hearts", rank: "Q" }), "O♥");
    assert.equal(huSuitIcon("clubs"), "/cards/hu/suit-acorns.webp");
  });
});
