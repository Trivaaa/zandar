import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";

import posthog from "posthog-js";

import { recordAccount, recordFirstOpen, recordInviteOpened, recordInviteShared, track } from "./track";

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

describe("recordAccount", () => {
  test("registracija → osobina + account_registered", () => {
    const capture = mock.method(posthog, "capture", () => undefined);
    const setProps = mock.method(posthog, "setPersonProperties", () => undefined);
    setAppEnv("production");
    recordAccount("google");
    assert.deepEqual(setProps.mock.calls[0]!.arguments[0], { registered: true });
    assert.equal(capture.mock.callCount(), 1);
    assert.equal(capture.mock.calls[0]!.arguments[0], "account_registered");
    assert.deepEqual(capture.mock.calls[0]!.arguments[1], { method: "google" });
  });

  test("prijava na postojeći nalog → samo osobina, bez događaja", () => {
    const capture = mock.method(posthog, "capture", () => undefined);
    const setProps = mock.method(posthog, "setPersonProperties", () => undefined);
    setAppEnv("production");
    recordAccount(null);
    assert.equal(setProps.mock.callCount(), 1);
    assert.equal(capture.mock.callCount(), 0);
  });

  for (const value of ["staging", undefined]) {
    test(`NEXT_PUBLIC_APP_ENV=${JSON.stringify(value)} → ništa`, () => {
      const capture = mock.method(posthog, "capture", () => undefined);
      const setProps = mock.method(posthog, "setPersonProperties", () => undefined);
      setAppEnv(value);
      recordAccount("password");
      assert.equal(capture.mock.callCount(), 0);
      assert.equal(setProps.mock.callCount(), 0);
    });
  }
});

describe("recordInviteShared", () => {
  test("meni → share, kopiranje → copy", () => {
    const capture = mock.method(posthog, "capture", () => undefined);
    setAppEnv("production");
    recordInviteShared("sto1", "shared");
    recordInviteShared("sto1", "copied");
    assert.deepEqual(capture.mock.calls[0]!.arguments[1], { room_id: "sto1", method: "share" });
    assert.deepEqual(capture.mock.calls[1]!.arguments[1], { room_id: "sto1", method: "copy" });
  });

  test("odustajanje iz menija → ništa", () => {
    const capture = mock.method(posthog, "capture", () => undefined);
    setAppEnv("production");
    recordInviteShared("sto1", "cancelled");
    assert.equal(capture.mock.callCount(), 0);
  });
});

describe("recordInviteOpened", () => {
  function stubSessionStorage(): Map<string, string> {
    const session = new Map<string, string>();
    Object.assign(globalThis, {
      sessionStorage: {
        getItem: (k: string) => session.get(k) ?? null,
        setItem: (k: string, v: string) => void session.set(k, v),
      },
    });
    return session;
  }

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).sessionStorage;
  });

  test("osvježavanje iste sobe se ne broji, druga soba se broji", () => {
    stubSessionStorage();
    const capture = mock.method(posthog, "capture", () => undefined);
    setAppEnv("production");
    recordInviteOpened("sto1", 2);
    recordInviteOpened("sto1", 2);
    recordInviteOpened("sto2", 1);
    assert.equal(capture.mock.callCount(), 2);
    assert.deepEqual(capture.mock.calls[0]!.arguments[1], { room_id: "sto1", seats_left: 2 });
  });

  test("bez sessionStorage-a događaj ipak ide", () => {
    const capture = mock.method(posthog, "capture", () => undefined);
    setAppEnv("production");
    recordInviteOpened("sto1", 1);
    assert.equal(capture.mock.callCount(), 1);
  });

  test("van produkcije → bez događaja i bez oznake", () => {
    const session = stubSessionStorage();
    const capture = mock.method(posthog, "capture", () => undefined);
    setAppEnv("staging");
    recordInviteOpened("sto1", 1);
    assert.equal(capture.mock.callCount(), 0);
    assert.equal(session.size, 0);
  });
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
