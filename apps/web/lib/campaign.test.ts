import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";

import { campaignFromParams, rememberCampaign } from "./campaign";

const AD =
  "?utm_source=facebook&utm_medium=paid_social&utm_campaign=zandar_boost_01&utm_content=52528053747929&utm_term=1&fbclid=abc";

const AD_CAMPAIGN = {
  utm_source: "facebook",
  utm_medium: "paid_social",
  utm_campaign: "zandar_boost_01",
  utm_content: "52528053747929",
};

describe("campaignFromParams", () => {
  test("uzima samo četiri utm polja", () => {
    assert.deepEqual(campaignFromParams(AD), AD_CAMPAIGN);
  });

  test("organska instalacija sa Play-a", () => {
    assert.deepEqual(campaignFromParams("utm_source=google-play&utm_medium=organic"), {
      utm_source: "google-play",
      utm_medium: "organic",
    });
  });

  test("bez kampanje", () => {
    assert.deepEqual(campaignFromParams("room=c99edf&fbclid=abc"), {});
    assert.deepEqual(campaignFromParams(""), {});
    assert.deepEqual(campaignFromParams(null), {});
  });

  test("ulaz je tuđ — neobična vrijednost otpada, ostalo ostaje", () => {
    assert.deepEqual(
      campaignFromParams("utm_source=(not%20set)&utm_medium=a%26room%3Dx&utm_campaign=ok"),
      { utm_campaign: "ok" },
    );
    assert.deepEqual(campaignFromParams("utm_source=" + "a".repeat(101)), {});
  });
});

describe("rememberCampaign", () => {
  const setStorage = (storage: unknown) => {
    (globalThis as { window?: unknown }).window = {
      get sessionStorage() {
        if (storage === null) throw new Error("blocked");
        return storage;
      },
    };
  };
  const memoryStorage = () => {
    const data = new Map<string, string>();
    return {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    };
  };

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  test("preživi navigaciju koja skine parametre", () => {
    setStorage(memoryStorage());
    assert.deepEqual(rememberCampaign(AD), AD_CAMPAIGN);
    assert.deepEqual(rememberCampaign(""), AD_CAMPAIGN);
  });

  test("novija kampanja zamjenjuje staru", () => {
    setStorage(memoryStorage());
    rememberCampaign(AD);
    assert.deepEqual(rememberCampaign("?utm_source=viber"), { utm_source: "viber" });
    assert.deepEqual(rememberCampaign(""), { utm_source: "viber" });
  });

  test("bez kampanje je prazno", () => {
    setStorage(memoryStorage());
    assert.deepEqual(rememberCampaign(""), {});
  });

  test("blokirano skladište ne obara ekran", () => {
    setStorage(null);
    assert.deepEqual(rememberCampaign(AD), AD_CAMPAIGN);
    assert.deepEqual(rememberCampaign(""), {});
  });
});
