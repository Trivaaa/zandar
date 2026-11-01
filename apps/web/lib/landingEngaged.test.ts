import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";

import posthog from "posthog-js";

import { armLandingEngaged } from "./landingEngaged";

const originalAppEnv = process.env.NEXT_PUBLIC_APP_ENV;
let storage: Map<string, string>;
let page: EventTarget & { visibilityState: string };
let win: EventTarget & { location: { pathname: string; search: string } };

function hide(state: "hidden" | "visible"): void {
  page.visibilityState = state;
  page.dispatchEvent(new Event("visibilitychange"));
}

beforeEach(() => {
  storage = new Map();
  page = Object.assign(new EventTarget(), { visibilityState: "visible" });
  win = Object.assign(new EventTarget(), {
    location: { pathname: "/", search: "?utm_campaign=zandar_boost_01&utm_content=52528053747929" },
    sessionStorage: { getItem: () => null, setItem: () => undefined },
  });
  Object.assign(globalThis, {
    window: win,
    document: page,
    localStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
    },
  });
  process.env.NEXT_PUBLIC_APP_ENV = "production";
  mock.timers.enable({ apis: ["setTimeout", "Date"] });
});

afterEach(() => {
  mock.timers.reset();
  mock.restoreAll();
  if (originalAppEnv === undefined) delete process.env.NEXT_PUBLIC_APP_ENV;
  else process.env.NEXT_PUBLIC_APP_ENV = originalAppEnv;
  for (const key of ["window", "document", "localStorage"]) {
    delete (globalThis as Record<string, unknown>)[key];
  }
});

describe("armLandingEngaged", () => {
  test("5 s vidljivosti šalje događaj sa kampanjom", () => {
    const capture = mock.method(posthog, "capture", () => undefined);
    armLandingEngaged();
    mock.timers.tick(4_999);
    assert.equal(capture.mock.callCount(), 0);
    mock.timers.tick(1);
    assert.equal(capture.mock.callCount(), 1);
    assert.equal(capture.mock.calls[0]!.arguments[0], "landing_engaged");
    assert.deepEqual(capture.mock.calls[0]!.arguments[1], {
      trigger: "visible_5s",
      utm_campaign: "zandar_boost_01",
      utm_content: "52528053747929",
    });
  });

  test("dodir šalje odmah, a tajmer se više ne javlja", () => {
    const capture = mock.method(posthog, "capture", () => undefined);
    armLandingEngaged();
    win.dispatchEvent(new Event("pointerdown"));
    mock.timers.tick(10_000);
    assert.equal(capture.mock.callCount(), 1);
    assert.equal((capture.mock.calls[0]!.arguments[1] as { trigger: string }).trigger, "tap");
  });

  test("vrijeme u pozadini se ne računa", () => {
    const capture = mock.method(posthog, "capture", () => undefined);
    armLandingEngaged();
    mock.timers.tick(3_000);
    hide("hidden");
    mock.timers.tick(60_000);
    assert.equal(capture.mock.callCount(), 0);
    hide("visible");
    mock.timers.tick(1_999);
    assert.equal(capture.mock.callCount(), 0);
    mock.timers.tick(1);
    assert.equal(capture.mock.callCount(), 1);
  });

  test("stranica učitana u pozadini ne broji dok ne postane vidljiva", () => {
    const capture = mock.method(posthog, "capture", () => undefined);
    page.visibilityState = "hidden";
    armLandingEngaged();
    mock.timers.tick(60_000);
    assert.equal(capture.mock.callCount(), 0);
    hide("visible");
    mock.timers.tick(5_000);
    assert.equal(capture.mock.callCount(), 1);
  });

  test("jednom po guest ID-u", () => {
    const capture = mock.method(posthog, "capture", () => undefined);
    armLandingEngaged();
    mock.timers.tick(5_000);
    armLandingEngaged();
    win.dispatchEvent(new Event("pointerdown"));
    mock.timers.tick(5_000);
    assert.equal(capture.mock.callCount(), 1);
  });

  test("politika privatnosti se ne broji", () => {
    const capture = mock.method(posthog, "capture", () => undefined);
    win.location.pathname = "/privatnost";
    armLandingEngaged();
    mock.timers.tick(5_000);
    assert.equal(capture.mock.callCount(), 0);
    assert.equal(storage.size, 0);
  });

  test("van produkcije → bez događaja i bez oznake", () => {
    const capture = mock.method(posthog, "capture", () => undefined);
    process.env.NEXT_PUBLIC_APP_ENV = "staging";
    armLandingEngaged();
    mock.timers.tick(5_000);
    win.dispatchEvent(new Event("pointerdown"));
    assert.equal(capture.mock.callCount(), 0);
    assert.equal(storage.size, 0);
  });
});
