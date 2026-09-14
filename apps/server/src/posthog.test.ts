import assert from "node:assert/strict";
import { after, afterEach, describe, test, mock } from "node:test";

// Klijent se pravi na učitavanju modula; test ne smije zavisiti od pravog ključa.
process.env.POSTHOG_KEY ??= "test-key";
const { posthog, track } = await import("./lib/posthog");

const originalAppEnv = process.env.APP_ENV;

function setAppEnv(value: string | undefined): void {
  if (value === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = value;
}

describe("analitika šalje samo produkcija", () => {
  afterEach(() => {
    mock.restoreAll();
    setAppEnv(originalAppEnv);
  });
  after(async () => {
    await posthog.shutdown();
  });

  test("APP_ENV=production → capture", () => {
    const capture = mock.method(posthog, "capture", () => {});
    setAppEnv("production");
    track("g-1", "hand_finished", {
      roomId: "r",
      matchId: "m",
      handNumber: 1,
      playerCount: 4,
      isPublic: true,
      humansAtTable: 1,
      botsAtTable: 3,
      botSeatShare: 0.75,
    });
    assert.equal(capture.mock.callCount(), 1);
    assert.equal(capture.mock.calls[0]!.arguments[0]!.distinctId, "g-1");
  });

  for (const value of ["staging", "development", "Production", "", undefined]) {
    test(`APP_ENV=${JSON.stringify(value)} → ništa`, () => {
      const capture = mock.method(posthog, "capture", () => {});
      setAppEnv(value);
      track("g-1", "signup_succeeded", { game: "poker", platform: "web" });
      assert.equal(capture.mock.callCount(), 0);
    });
  }
});
