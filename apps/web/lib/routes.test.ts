import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { roomIdFromLink } from "./routes";

/**
 * Pozivnica → id sobe. Ovo je ulaz iz spoljnog svijeta (App Link koji otvori
 * aplikaciju), pa sve što nije čista soba mora dati `null`, ne navigaciju.
 */
describe("roomIdFromLink", () => {
  test("invite oblik", () => {
    assert.equal(roomIdFromLink("https://kartaonica.com/room/c99edf"), "c99edf");
    assert.equal(roomIdFromLink("https://zandar-web.vercel.app/room/A1b2C3"), "A1b2C3");
  });

  test("kosa crta na kraju i stari /zandar prefiks", () => {
    assert.equal(roomIdFromLink("https://kartaonica.com/room/c99edf/"), "c99edf");
    assert.equal(roomIdFromLink("https://kartaonica.com/zandar/room/c99edf"), "c99edf");
  });

  test("in-app query oblik", () => {
    assert.equal(roomIdFromLink("https://localhost/room?id=c99edf"), "c99edf");
    assert.equal(roomIdFromLink("https://localhost/room/?id=c99edf"), "c99edf");
  });

  test("query i hash na invite linku ne smetaju", () => {
    assert.equal(roomIdFromLink("https://kartaonica.com/room/c99edf?utm=x#y"), "c99edf");
  });

  test("sve ostalo je null", () => {
    for (const url of [
      "https://kartaonica.com/",
      "https://kartaonica.com/privatnost",
      "https://kartaonica.com/room",
      "https://kartaonica.com/room/",
      "https://kartaonica.com/room/c99edf/extra",
      "https://kartaonica.com/room/a%2Fb",
      "https://kartaonica.com/room/" + "a".repeat(33),
      "https://kartaonica.com/room?id=",
      "https://kartaonica.com/igre/room/c99edf",
      "nije link",
      "",
    ]) {
      assert.equal(roomIdFromLink(url), null, url);
    }
  });
});
