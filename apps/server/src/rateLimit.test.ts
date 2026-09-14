import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { SlidingWindowLimiter } from "./rateLimit";

describe("SlidingWindowLimiter", () => {
  test("propušta do limita, pa odbija", () => {
    const limiter = new SlidingWindowLimiter(3, 1000);
    assert.deepEqual([1, 2, 3, 4].map(() => limiter.tryHit("ip", 100)), [true, true, true, false]);
  });

  test("ključevi su nezavisni", () => {
    const limiter = new SlidingWindowLimiter(1, 1000);
    assert.equal(limiter.tryHit("a", 0), true);
    assert.equal(limiter.tryHit("b", 0), true);
    assert.equal(limiter.tryHit("a", 0), false);
  });

  test("prozor klizi: stari pokušaji ispadaju", () => {
    const limiter = new SlidingWindowLimiter(2, 1000);
    limiter.tryHit("ip", 0);
    limiter.tryHit("ip", 500);
    assert.equal(limiter.tryHit("ip", 900), false);
    assert.equal(limiter.tryHit("ip", 1001), true, "pokušaj od 0 je izašao iz prozora");
  });

  test("odbijen pokušaj se ne broji", () => {
    const limiter = new SlidingWindowLimiter(1, 1000);
    limiter.tryHit("ip", 0);
    for (let i = 0; i < 50; i++) limiter.tryHit("ip", 10);
    assert.equal(limiter.tryHit("ip", 1001), true);
  });

  test("sweep briše prazne ključeve", () => {
    const limiter = new SlidingWindowLimiter(5, 1000);
    limiter.tryHit("a", 0);
    limiter.tryHit("b", 900);
    limiter.sweep(1500);
    assert.equal(limiter.size, 1);
  });
});
