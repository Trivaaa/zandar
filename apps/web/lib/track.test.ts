import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";

import posthog from "posthog-js";

import { recordFirstOpen, track } from "./track";

/**
 * Gate analitike: PostHog dobija događaje SAMO u produkcijskom buildu.
 * Namjerno uzak — štiti fail-closed ponašanje, ne sve događaje.
 */

const originalAppEnv = process.env.NEXT_PUBLIC_APP_ENV;
let storage: Map<string, string>;

function setAppEnv(value: string | undefined): void {
  if (value === undefined) delete process.env.NEXT_PUBLIC_APP_ENV;
  else process.env.NEXT_PUBLIC_APP_ENV = value;
}

beforeEach(() => {
  storage = new Map();
  Object.assign(globalThis, {
    window: { location: { pathname: "/", search: "" } },
    localStorage: {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    },
  });
});

afterEach(() => {
  mock.restoreAll();
  setAppEnv(originalAppEnv);
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).localStorage;
});

describe("track", () => {
  test("production → capture", () => {
    const capture = mock.method(posthog, "capture", () => undefined);
    setAppEnv("production");
    track("play_requested", { mode: "quick_play" });
    assert.equal(capture.mock.callCount(), 1);
    assert.equal(capture.mock.calls[0]!.arguments[0], "play_requested");
  });

  for (const value of ["staging", "development", "Production", undefined]) {
    test(`NEXT_PUBLIC_APP_ENV=${JSON.stringify(value)} → ništa`, () => {
      const capture = mock.method(posthog, "capture", () => undefined);
      setAppEnv(value);
      track("play_requested", { mode: "quick_play" });
      assert.equal(capture.mock.callCount(), 0);
    });
  }
});

describe("recordFirstOpen van produkcije", () => {
  for (const value of ["staging", undefined]) {
    test(`NEXT_PUBLIC_APP_ENV=${JSON.stringify(value)} → bez događaja i bez oznake`, () => {
      const capture = mock.method(posthog, "capture", () => undefined);
      setAppEnv(value);
      recordFirstOpen(false);
      assert.equal(capture.mock.callCount(), 0);
      assert.equal(storage.size, 0, "kartaonica_first_open ne smije biti napisan");
    });
  }
});
