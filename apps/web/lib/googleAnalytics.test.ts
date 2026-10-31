import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import vm from "node:vm";

import {
  GA_INLINE_SCRIPT,
  GA_MEASUREMENT_ID,
  GA_NO_COOKIE_REGIONS,
  isGoogleAnalyticsEnabled,
  stripRoomId,
} from "./googleAnalytics";

const original = {
  env: process.env.NEXT_PUBLIC_APP_ENV,
  platform: process.env.NEXT_PUBLIC_PLATFORM,
};

function setEnv(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  setEnv("NEXT_PUBLIC_APP_ENV", original.env);
  setEnv("NEXT_PUBLIC_PLATFORM", original.platform);
});

describe("isGoogleAnalyticsEnabled", () => {
  test("radi samo na produkcijskom webu", () => {
    setEnv("NEXT_PUBLIC_PLATFORM", undefined);
    setEnv("NEXT_PUBLIC_APP_ENV", "production");
    assert.equal(isGoogleAnalyticsEnabled(), true);

    for (const env of ["staging", "development", "Production", undefined]) {
      setEnv("NEXT_PUBLIC_APP_ENV", env);
      assert.equal(isGoogleAnalyticsEnabled(), false, String(env));
    }
  });

  test("produkcijski APK nema web tag", () => {
    setEnv("NEXT_PUBLIC_APP_ENV", "production");
    setEnv("NEXT_PUBLIC_PLATFORM", "native");
    assert.equal(isGoogleAnalyticsEnabled(), false);
  });
});

describe("stripRoomId", () => {
  test("skida ID sobe, ostatak adrese ostaje", () => {
    assert.equal(
      stripRoomId("https://kartaonica.com/room/abc123?utm_source=viber#x"),
      "https://kartaonica.com/room/?utm_source=viber#x",
    );
    assert.equal(stripRoomId("https://kartaonica.com/privatnost"), "https://kartaonica.com/privatnost");
  });
});

describe("GA_INLINE_SCRIPT", () => {
  /** Izvršava isječak i vraća ono što bi gtag.js pročitao iz dataLayer-a. */
  function run(href: string): unknown[][] {
    const context: Record<string, unknown> = { location: { href } };
    context.window = context;
    vm.runInNewContext(GA_INLINE_SCRIPT, context);
    // Array.from i spolja: niz iz vm konteksta ima tuđ prototip, pa deepEqual pada.
    return Array.from(context.dataLayer as ArrayLike<ArrayLike<unknown>>, (args) => Array.from(args));
  }

  test("saglasnost ide prije config-a, oglašavanje je odbijeno, EEA bez kolačića", () => {
    const calls = run("https://kartaonica.com/");
    assert.deepEqual(
      calls.map((c) => c[0]),
      ["consent", "consent", "js", "config"],
    );

    const global = calls[0][2] as Record<string, string>;
    assert.equal(global.ad_storage, "denied");
    assert.equal(global.ad_user_data, "denied");
    assert.equal(global.ad_personalization, "denied");

    const regional = calls[1][2] as { analytics_storage: string; region: string[] };
    assert.equal(regional.analytics_storage, "denied");
    assert.deepEqual(Array.from(regional.region), [...GA_NO_COOKIE_REGIONS]);
    assert.ok(regional.region.includes("HR") && regional.region.includes("SI"));
    assert.ok(!regional.region.includes("BA") && !regional.region.includes("RS"));

    assert.equal(calls[3][1], GA_MEASUREMENT_ID);
  });

  test("ID sobe ne ide u page_location", () => {
    const config = run("https://kartaonica.com/room/abc123").at(-1)!;
    assert.equal((config[2] as { page_location: string }).page_location, "https://kartaonica.com/room/");
  });
});
