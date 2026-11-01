import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";

import { installAttribution, roomIdFromReferrer } from "./installReferrer";
import {
  appOfferStoreUrl,
  appOpenUrl,
  appPackage,
  claimAppOfferVisit,
  decideAppOffer,
  playStoreUrl,
  readAppOfferState,
  recordAppOfferDismissed,
  recordMatchFinished,
  STORE_LINKS,
  withInviteReferrer,
  type AppOfferState,
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

  test("kampanja bez sobe ide u referrer", () => {
    const url = new URL(
      withInviteReferrer(LISTING, null, { utm_source: "facebook", utm_campaign: "zandar_boost_01" }),
    );
    assert.equal(
      url.searchParams.get("referrer"),
      "utm_source=facebook&utm_campaign=zandar_boost_01",
    );
    // `&` unutar vrijednosti mora biti kodiran, inače Play siječe referrer.
    assert.doesNotMatch(url.search, /referrer=[^&]*&utm_campaign/);
  });

  test("aplikacija čita i sobu i kampanju, što god da traka pošalje", () => {
    const sent = new URL(
      withInviteReferrer(LISTING, "c99edf", { utm_campaign: "zandar_boost_01" }),
    ).searchParams.get("referrer");
    assert.equal(roomIdFromReferrer(sent), "c99edf");
    assert.deepEqual(installAttribution(sent), {
      has_room: true,
      utm_campaign: "zandar_boost_01",
    });
  });
});

describe("appOpenUrl", () => {
  const url = appOpenUrl("kartaonica.com", "com.kartaonica.zandar", LISTING);

  test("gađa putanju koju prima intent-filter, samo naš paket", () => {
    assert.ok(url.startsWith("intent://kartaonica.com/otvori#Intent;scheme=https;"));
    assert.match(url, /;package=com\.kartaonica\.zandar;/);
    assert.ok(url.endsWith(";end"));
  });

  test("rezerva je Play listing, kodiran da `;` ne presiječe intent", () => {
    const raw = /S\.browser_fallback_url=([^;]+);/.exec(url)?.[1] ?? "";
    assert.equal(decodeURIComponent(raw), LISTING);
  });

  test("staging paket nosi sufiks", () => {
    if (STORE_LINKS["google-play"] === null) return;
    assert.equal(appPackage(false), "com.kartaonica.zandar");
    assert.equal(appPackage(true), "com.kartaonica.zandar.staging");
  });
});

describe("appOfferStoreUrl", () => {
  const referrer = (url: string | null) =>
    new URLSearchParams(new URL(url ?? "").searchParams.get("referrer") ?? "");

  test("bez kampanje nosi izvor i mjesto, a nikad sobu", () => {
    if (STORE_LINKS["google-play"] === null) return;
    const sent = referrer(appOfferStoreUrl("match_end"));
    assert.equal(sent.get("utm_source"), "web");
    assert.equal(sent.get("utm_content"), "match_end");
    assert.equal(sent.get("room"), null);
  });

  test("plaćena kampanja ostaje netaknuta", () => {
    if (STORE_LINKS["google-play"] === null) return;
    const sent = referrer(
      appOfferStoreUrl("home_top", { utm_source: "facebook", utm_campaign: "zandar_boost_01" }),
    );
    assert.equal(sent.get("utm_source"), "facebook");
    assert.equal(sent.get("utm_campaign"), "zandar_boost_01");
    assert.equal(sent.get("utm_content"), "home_top");
  });
});

describe("decideAppOffer", () => {
  const base: AppOfferState = {
    installed: false,
    snoozed: false,
    rejections: 0,
    matchFinished: true,
    shownThisVisit: null,
  };

  test("prvi dolazak: bez trake dok partija nije završena", () => {
    assert.equal(decideAppOffer("home", { ...base, matchFinished: false }), null);
    assert.equal(decideAppOffer("home", base), "home_top");
  });

  test("mir sakriva svaku ponudu", () => {
    const snoozed = { ...base, snoozed: true };
    assert.equal(decideAppOffer("home", snoozed), null);
    assert.equal(decideAppOffer("match_end", snoozed), null);
    assert.equal(decideAppOffer("home", { ...snoozed, installed: true }), null);
  });

  test("3 odbijanja: početna više ne nudi, kraj partije i dalje", () => {
    const rejected = { ...base, rejections: 3 };
    assert.equal(decideAppOffer("home", { ...base, rejections: 2 }), "home_top");
    assert.equal(decideAppOffer("home", rejected), null);
    assert.equal(decideAppOffer("match_end", rejected), "match_end");
  });

  test("jedna ponuda po posjeti, a ista ostaje pri povratku na ekran", () => {
    assert.equal(decideAppOffer("match_end", { ...base, shownThisVisit: "home_top" }), null);
    assert.equal(decideAppOffer("home", { ...base, shownThisVisit: "match_end" }), null);
    assert.equal(decideAppOffer("home", { ...base, shownThisVisit: "home_top" }), "home_top");
  });

  test("instalirana aplikacija: početna nudi Otvori bez uslova, kraj partije ništa", () => {
    const installed = { ...base, installed: true, matchFinished: false, rejections: 3 };
    assert.equal(decideAppOffer("home", installed), "home_open");
    assert.equal(decideAppOffer("match_end", installed), null);
  });
});

describe("skladište ponude", () => {
  const memory = () => {
    const map = new Map<string, string>();
    return {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
    };
  };
  const NOW = 1_000_000;
  const DAY = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: memory(), sessionStorage: memory() },
    });
  });
  afterEach(() => {
    Reflect.deleteProperty(globalThis, "window");
  });

  test("× daje tačno 7 dana mira", () => {
    recordAppOfferDismissed("home_top", NOW);
    assert.equal(readAppOfferState(false, NOW + 7 * DAY - 1).snoozed, true);
    assert.equal(readAppOfferState(false, NOW + 7 * DAY).snoozed, false);
  });

  test("broji se samo odbijena traka Preuzmi", () => {
    recordAppOfferDismissed("home_top", NOW);
    recordAppOfferDismissed("home_open", NOW);
    recordAppOfferDismissed("match_end", NOW);
    assert.equal(readAppOfferState(false, NOW).rejections, 1);
  });

  test("ponuda posjete se broji jednom", () => {
    assert.equal(claimAppOfferVisit("home_top"), true);
    assert.equal(claimAppOfferVisit("home_top"), false);
    assert.equal(readAppOfferState(false, NOW).shownThisVisit, "home_top");
  });

  test("završena partija se pamti", () => {
    assert.equal(readAppOfferState(false, NOW).matchFinished, false);
    recordMatchFinished();
    assert.equal(readAppOfferState(false, NOW).matchFinished, true);
  });

  test("skladište koje baca ne ruši ponudu", () => {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        get localStorage() {
          throw new Error("blokirano");
        },
      },
    });
    assert.deepEqual(readAppOfferState(true, NOW), {
      installed: true,
      snoozed: false,
      rejections: 0,
      matchFinished: false,
      shownThisVisit: null,
    });
    assert.equal(claimAppOfferVisit("home_top"), true);
    recordAppOfferDismissed("home_top", NOW);
    recordMatchFinished();
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
