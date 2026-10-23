import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  guarded,
  parsePlayCardPayload,
  parseReactionType,
  parseSubscribePayload,
  splitArgs,
  type AckResult,
} from "./socketGuard";

const JUNK: unknown[] = [undefined, null, 42, "x", true, [], [{}]];

function recorder() {
  const calls: AckResult[] = [];
  return { calls, ack: (res: AckResult) => void calls.push(res) };
}

function silentLog() {
  const lines: string[] = [];
  return { lines, log: { error: (msg: string) => void lines.push(msg) } };
}

/** Pusti mikrotaskove i jedan krug event loop-a, da se odbijeni promise-i slegnu. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe("splitArgs", () => {
  test("bez argumenata: payload undefined, ack no-op", () => {
    const { payload, ack } = splitArgs([]);
    assert.equal(payload, undefined);
    assert.doesNotThrow(() => ack({ ok: false }));
  });

  test("samo ack: payload undefined, ack prolazi", () => {
    const r = recorder();
    const { payload, ack } = splitArgs([r.ack]);
    assert.equal(payload, undefined);
    ack({ ok: true });
    assert.deepEqual(r.calls, [{ ok: true }]);
  });

  test("zadnji argument koji nije funkcija nije ack", () => {
    for (const last of [5, "x", null, {}, []]) {
      const { payload, ack } = splitArgs([{ a: 1 }, last]);
      assert.deepEqual(payload, { a: 1 });
      assert.doesNotThrow(() => ack({ ok: false }), `ack=${JSON.stringify(last)}`);
    }
  });

  test("ack stiže najviše jednom", () => {
    const r = recorder();
    const { ack } = splitArgs([{}, r.ack]);
    ack({ ok: true });
    ack({ ok: false, error: "INTERNAL" });
    assert.deepEqual(r.calls, [{ ok: true }]);
  });
});

describe("guarded", () => {
  test("sinhroni throw ne izlazi; ack dobija INTERNAL, greška je u logu", () => {
    const r = recorder();
    const l = silentLog();
    const handler = guarded("game:react", l.log, (payload) => {
      (payload as { type: string }).type; // null → TypeError, kao stari game:react
    });
    assert.doesNotThrow(() => handler(null, r.ack));
    assert.deepEqual(r.calls, [{ ok: false, error: "INTERNAL" }]);
    assert.equal(l.lines.length, 1);
    assert.match(l.lines[0]!, /game:react/);
  });

  test("odbijen promise ne postaje unhandledRejection", async () => {
    const r = recorder();
    const l = silentLog();
    let unhandled: unknown = null;
    const onUnhandled = (reason: unknown) => (unhandled = reason);
    process.on("unhandledRejection", onUnhandled);
    try {
      const handler = guarded("room:subscribe", l.log, async (payload) => {
        const { roomId } = payload as { roomId: string }; // null → TypeError
        void roomId;
      });
      handler(null, r.ack);
      await settle();
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
    assert.equal(unhandled, null);
    assert.deepEqual(r.calls, [{ ok: false, error: "INTERNAL" }]);
    assert.equal(l.lines.length, 1);
  });

  test("ack koji nije funkcija ne ruši handler", async () => {
    const l = silentLog();
    let ran = false;
    const handler = guarded("game:nextHand", l.log, async (_payload, ack) => {
      ack({ ok: false, error: "NOT_SUBSCRIBED" });
      ran = true;
    });
    handler({}, 5);
    await settle();
    assert.equal(ran, true);
    assert.deepEqual(l.lines, []);
  });

  test("ispravan handler: payload i ack stižu netaknuti", async () => {
    const r = recorder();
    const l = silentLog();
    let seen: unknown;
    const handler = guarded("game:waitMore", l.log, async (payload, ack) => {
      seen = payload;
      ack({ ok: true });
    });
    handler({ a: 1 }, r.ack);
    await settle();
    assert.deepEqual(seen, { a: 1 });
    assert.deepEqual(r.calls, [{ ok: true }]);
    assert.deepEqual(l.lines, []);
  });

  test("greška poslije uspješnog ack-a ne šalje drugi odgovor", async () => {
    const r = recorder();
    const l = silentLog();
    const handler = guarded("game:abandonVote", l.log, async (_payload, ack) => {
      ack({ ok: true });
      throw new Error("broadcast pao");
    });
    handler({}, r.ack);
    await settle();
    assert.deepEqual(r.calls, [{ ok: true }]);
    assert.equal(l.lines.length, 1);
  });
});

describe("parseSubscribePayload", () => {
  const valid = { roomId: "a1b2c3", playerId: "p-1", sessionToken: "tok" };

  test("smeće → null", () => {
    for (const junk of [...JUNK, {}]) assert.equal(parseSubscribePayload(junk), null);
  });

  test("polje pogrešnog tipa ili predugačko → null", () => {
    assert.equal(parseSubscribePayload({ ...valid, roomId: {} }), null);
    assert.equal(parseSubscribePayload({ ...valid, playerId: 7 }), null);
    assert.equal(parseSubscribePayload({ ...valid, sessionToken: null }), null);
    assert.equal(parseSubscribePayload({ ...valid, sessionToken: "x".repeat(257) }), null);
  });

  test("payload sadašnjeg klijenta prolazi, pushId/idToken se prenose netaknuti", () => {
    assert.deepEqual(parseSubscribePayload(valid), { ...valid, pushId: undefined, idToken: undefined });
    const full = { ...valid, pushId: "push-1", idToken: 123 };
    assert.deepEqual(parseSubscribePayload(full), full);
  });
});

describe("parsePlayCardPayload", () => {
  const valid = {
    cardId: "hearts-7",
    selectedCaptureCardIds: ["clubs-3", "spades-4"],
    clientMoveId: `move-${Date.now()}-abc123`,
    clientKnownStateVersion: 12,
  };

  test("smeće → null", () => {
    for (const junk of [...JUNK, {}]) assert.equal(parsePlayCardPayload(junk), null);
  });

  test("polje pogrešnog tipa → null", () => {
    assert.equal(parsePlayCardPayload({ ...valid, cardId: {} }), null);
    assert.equal(parsePlayCardPayload({ ...valid, selectedCaptureCardIds: "clubs-3" }), null);
    assert.equal(parsePlayCardPayload({ ...valid, selectedCaptureCardIds: [1] }), null);
    assert.equal(parsePlayCardPayload({ ...valid, selectedCaptureCardIds: Array(53).fill("c") }), null);
    assert.equal(parsePlayCardPayload({ ...valid, clientMoveId: 1 }), null);
    assert.equal(parsePlayCardPayload({ ...valid, clientMoveId: "m".repeat(129) }), null);
    assert.equal(parsePlayCardPayload({ ...valid, clientKnownStateVersion: "12" }), null);
    assert.equal(parsePlayCardPayload({ ...valid, clientKnownStateVersion: NaN }), null);
  });

  test("potez sadašnjeg klijenta (i trail sa praznim nizom) prolazi", () => {
    assert.deepEqual(parsePlayCardPayload(valid), valid);
    const trail = { ...valid, selectedCaptureCardIds: [] };
    assert.deepEqual(parsePlayCardPayload(trail), trail);
  });
});

describe("parseReactionType", () => {
  test("smeće → null", () => {
    for (const junk of [...JUNK, {}, { type: 5 }]) assert.equal(parseReactionType(junk), null);
  });

  test("tip reakcije prolazi (spisak dozvoljenih provjerava index.ts)", () => {
    assert.equal(parseReactionType({ type: "laugh" }), "laugh");
  });
});
