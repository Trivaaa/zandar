import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { roomIdFromReferrer } from "./installReferrer";
import { playStoreUrl, STORE_LINKS, withInviteReferrer } from "./stores";

const LISTING = "https://play.google.com/store/apps/details?id=com.kartaonica.zandar";

describe("withInviteReferrer", () => {
  test("bez sobe listing ostaje netaknut", () => {
    assert.equal(withInviteReferrer(LISTING), LISTING);
    assert.equal(withInviteReferrer(LISTING, null), LISTING);
  });

  test("soba ide u referrer, id paketa ostaje", () => {
    const url = new URL(withInviteReferrer(LISTING, "c99edf"));
    assert.equal(url.searchParams.get("id"), "com.kartaonica.zandar");
    assert.equal(url.searchParams.get("referrer"), "room=c99edf");
    // `=` unutar vrijednosti mora biti kodiran, inače Play siječe referrer.
    assert.match(url.search, /referrer=room%3Dc99edf/);
  });

  test("ono što traka pošalje, aplikacija pročita", () => {
    const sent = new URL(withInviteReferrer(LISTING, "c99edf")).searchParams.get("referrer");
    assert.equal(roomIdFromReferrer(sent), "c99edf");
  });
});

describe("playStoreUrl", () => {
  test("ponuda postoji samo uz listing", () => {
    if (STORE_LINKS["google-play"] === null) {
      assert.equal(playStoreUrl(), null);
      assert.equal(playStoreUrl("c99edf"), null);
    } else {
      assert.match(playStoreUrl("c99edf") ?? "", /referrer=room%3Dc99edf/);
    }
  });
});
