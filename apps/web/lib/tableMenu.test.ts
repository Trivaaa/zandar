import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { cardLabel } from "./raubView";
import { parseRaubDeck, pokerMenuLine, raubMenuLine, zandarMenuLine } from "./tableMenu";

describe("tableMenu", () => {
  it("izgled karata: podrazumijevano mađarice, samo 'french' je klasik", () => {
    assert.equal(parseRaubDeck(null), "hungarian");
    assert.equal(parseRaubDeck(undefined), "hungarian");
    assert.equal(parseRaubDeck(""), "hungarian");
    assert.equal(parseRaubDeck("hungarian"), "hungarian");
    assert.equal(parseRaubDeck("nešto"), "hungarian");
    assert.equal(parseRaubDeck("french"), "french");
  });

  it("red stanja po igri", () => {
    assert.equal(zandarMenuLine(4, 21), "4 igrača · do 21");
    assert.equal(zandarMenuLine(2, 11), "2 igrača · do 11");
    assert.equal(raubMenuLine(4, 21), "4 igrača · od 21 do 0");
    assert.equal(
      pokerMenuLine({ smallBlind: 1, bigBlind: 2, nextSmallBlind: 2, nextBigBlind: 4, handsUntilNextLevel: 5 }),
      "Blindovi 1/2 · sljedeći nivo 2/4 za 5 ruku",
    );
    assert.equal(
      pokerMenuLine({ smallBlind: 1, bigBlind: 2, nextSmallBlind: 2, nextBigBlind: 4, handsUntilNextLevel: 3 }),
      "Blindovi 1/2 · sljedeći nivo 2/4 za 3 ruke",
    );
    assert.equal(
      pokerMenuLine({ smallBlind: 1, bigBlind: 2, nextSmallBlind: 2, nextBigBlind: 4, handsUntilNextLevel: 1 }),
      "Blindovi 1/2 · sljedeći nivo 2/4 od iduće ruke",
    );
  });

  it("oznaka karte prati komplet: U/O na mađarici, J/Q na klasiku", () => {
    assert.equal(cardLabel({ rank: "J", suit: "hearts" }), "U♥");
    assert.equal(cardLabel({ rank: "Q", suit: "clubs" }, "hungarian"), "O♣");
    assert.equal(cardLabel({ rank: "J", suit: "hearts" }, "french"), "J♥");
    assert.equal(cardLabel({ rank: "7", suit: "spades" }, "french"), "7♠");
  });
});
