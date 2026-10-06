import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { roomIdFromReferrer } from "./installReferrer";
import {
  appIntentUrl,
  appPackage,
  playStoreUrl,
  STORE_LINKS,
  withInviteReferrer,
} from "./stores";

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

describe("appIntentUrl", () => {
  const fallback = withInviteReferrer(LISTING, "c99edf");
  const url = appIntentUrl("kartaonica.com", "c99edf", "com.kartaonica.zandar", fallback);

  test("gađa putanju koju prima intent-filter, samo naš paket", () => {
    assert.ok(url.startsWith("intent://kartaonica.com/room/c99edf#Intent;scheme=https;"));
    assert.match(url, /;package=com\.kartaonica\.zandar;/);
    assert.ok(url.endsWith(";end"));
  });

  test("rezerva je Play listing sa sobom, kodiran da `;` ne presiječe intent", () => {
    const raw = /S\.browser_fallback_url=([^;]+);/.exec(url)?.[1] ?? "";
    assert.equal(decodeURIComponent(raw), fallback);
    assert.equal(roomIdFromReferrer(new URL(fallback).searchParams.get("referrer")), "c99edf");
  });

  test("staging paket nosi sufiks", () => {
    if (STORE_LINKS["google-play"] === null) return;
    assert.equal(appPackage(false), "com.kartaonica.zandar");
    assert.equal(appPackage(true), "com.kartaonica.zandar.staging");
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
