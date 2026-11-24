import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { TABLE_LOAD_STUCK_MS, stuckHint, tableLoadStuckReport, tableWaitPhase } from "./tableLoadWatch";

const base = { showIntro: false, hasSession: true, hasTableState: false, room: null };

describe("tableWaitPhase", () => {
  test("uvod brze igre čeka stanje", () => {
    assert.equal(tableWaitPhase({ ...base, showIntro: true }), "shuffle");
  });
  test("partija u toku bez stanja = Učitavanje stola", () => {
    assert.equal(tableWaitPhase({ ...base, room: { status: "playing" } }), "loading");
    assert.equal(tableWaitPhase({ ...base, room: { status: "finished" } }), "loading");
  });
  test("javni sto u waiting = Učitavanje stola", () => {
    assert.equal(tableWaitPhase({ ...base, room: { status: "waiting", isPublic: true } }), "loading");
  });
  test("privatni lobi ne čeka sto", () => {
    assert.equal(tableWaitPhase({ ...base, room: { status: "waiting", isPublic: false } }), null);
  });
  test("stanje je stiglo: ništa se ne prati, ni tokom izlaska iz uvoda", () => {
    assert.equal(tableWaitPhase({ ...base, showIntro: true, hasTableState: true }), null);
    assert.equal(tableWaitPhase({ ...base, hasTableState: true, room: { status: "playing" } }), null);
  });
  test("bez sesije (JoinFlow) i bez sobe: ništa", () => {
    assert.equal(tableWaitPhase({ ...base, hasSession: false, showIntro: true }), null);
    assert.equal(tableWaitPhase(base), null);
  });
});

describe("rokovi i poruka", () => {
  test("uvod ima duži rok od običnog učitavanja (sam traje ~4 s)", () => {
    assert.ok(TABLE_LOAD_STUCK_MS.shuffle > 4_000 + 5_000);
    assert.ok(TABLE_LOAD_STUCK_MS.loading < TABLE_LOAD_STUCK_MS.shuffle);
  });
  test("UPDATE_REQUIRED traži osvježavanje, sve ostalo ponovni pokušaj", () => {
    assert.equal(stuckHint("UPDATE_REQUIRED"), "refresh");
    assert.equal(stuckHint("INVALID_TOKEN"), "retry");
    assert.equal(stuckHint(null), "retry");
  });
});

describe("tableLoadStuckReport", () => {
  test("nosi fazu i grešku pretplate", () => {
    const r = tableLoadStuckReport({
      roomId: "r1",
      game: "poker",
      phase: "shuffle",
      room: { status: "playing", isPublic: true },
      socketConnected: true,
      subscribeError: "INVALID_TOKEN",
      msOnScreen: 12_004,
    });
    assert.deepEqual(r, {
      room_id: "r1",
      game: "poker",
      phase: "shuffle",
      room_status: "playing",
      is_public: true,
      socket_connected: true,
      subscribe_error: "INVALID_TOKEN",
      ms_on_screen: 12_004,
    });
  });
  test("bez greške nema ključa; soba koja još nije stigla = unknown", () => {
    const r = tableLoadStuckReport({
      roomId: "r1",
      game: "zandar",
      phase: "shuffle",
      room: null,
      socketConnected: false,
      subscribeError: null,
      msOnScreen: 12_000,
    });
    assert.equal("subscribe_error" in r, false);
    assert.equal(r.room_status, "unknown");
    assert.equal(r.is_public, false);
  });
});
