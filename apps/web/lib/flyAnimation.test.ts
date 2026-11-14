import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { nonNegativeMs, runGhost } from "./flyAnimation";

/** Duh koji se ponaša kao pregledač: `animate` baca na negativno trajanje. */
function fakeGhost(opts: { alwaysThrow?: boolean } = {}) {
  const calls: KeyframeAnimationOptions[] = [];
  let removed = false;
  const ghost = {
    animate(_frames: Keyframe[], options: KeyframeAnimationOptions) {
      calls.push(options);
      const d = options.duration as number;
      if (opts.alwaysThrow || !(d >= 0)) {
        throw new TypeError("Failed to execute 'animate' on 'Element': duration must be non-negative or auto");
      }
      return { onfinish: null, oncancel: null } as unknown as Animation;
    },
    remove() {
      removed = true;
    },
  };
  return { ghost: ghost as unknown as HTMLElement, calls, isRemoved: () => removed };
}

const S = { scale: 1, opacity: 1 };

describe("nonNegativeMs", () => {
  test("negativno, NaN i beskonačno postaju 0; pozitivno ostaje", () => {
    assert.equal(nonNegativeMs(-37), 0);
    assert.equal(nonNegativeMs(Number.NaN), 0);
    assert.equal(nonNegativeMs(Number.POSITIVE_INFINITY), 0);
    assert.equal(nonNegativeMs(0), 0);
    assert.equal(nonNegativeMs(250), 250);
  });
});

describe("runGhost", () => {
  test("sabijen poker korak (stepMs - 140 < 0) ne baca — Sentry 2026-11-13", () => {
    const { ghost, calls, isRemoved } = fakeGhost();
    // fold pod MIN_SCALE / skrivenim tabom: stepMs ≈ 45 → trajanje -95
    assert.doesNotThrow(() => runGhost(ghost, 10, 20, S, S, 70, 45 - 140, "linear"));
    assert.equal(calls[0]!.duration, 0);
    assert.equal(isRemoved(), false);
  });

  test("negativno kašnjenje se svodi na 0", () => {
    const { ghost, calls } = fakeGhost();
    runGhost(ghost, 0, 0, S, S, -10, 100, "linear");
    assert.equal(calls[0]!.delay, 0);
    assert.equal(calls[0]!.duration, 100);
  });

  test("ako animate ipak baci, duh se ukloni i greška ne izlazi", () => {
    const { ghost, isRemoved } = fakeGhost({ alwaysThrow: true });
    assert.doesNotThrow(() => runGhost(ghost, 0, 0, S, S, 0, 100, "linear"));
    assert.equal(isRemoved(), true);
  });
});
