import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { Card, GamePhase, PrivateGameStateView } from "@zandar/shared-types";
import { decideBeat, drainQueue, initialTracked, receiveSnapshot } from "./useTableBeat";

const card = (suit: Card["suit"], rank: Card["rank"]): Card =>
  ({ id: `${rank}-${suit}`, suit, rank }) as Card;

const T1 = card("hearts", "5");
const T2 = card("spades", "5");
const T3 = card("clubs", "9");
const PLAYED = card("diamonds", "5");

/** 4P: me+p2 su team-0, p1+p3 su team-1. */
const players = ["me", "p1", "p2", "p3"].map((id, i) => ({
  id,
  displayName: id,
  seatIndex: i,
  isHost: i === 0,
  teamId: i % 2,
  connectionStatus: "connected" as const,
}));

function view(
  phase: GamePhase,
  over: Partial<PrivateGameStateView>,
): PrivateGameStateView {
  return {
    roomId: "r",
    matchId: "m",
    phase,
    players,
    table: [],
    currentPlayerId: "me",
    dealerPlayerId: "p3",
    deckCount: 0,
    handCounts: {},
    capturedCounts: { "team-0": 6, "team-1": 4 },
    matchScore: {},
    targetScore: 21,
    stateVersion: 2,
    handNumber: 1,
    handScores: [],
    myPlayerId: "me",
    myHand: [],
    ...over,
  } as PrivateGameStateView;
}

const move = (playerId: string, capturedCards: Card[]) => ({
  moveId: "m2",
  playerId,
  playedCard: PLAYED,
  capturedCards,
  isAutoPlay: false,
});

const prev = { table: [T1, T2, T3], capturedCounts: { "team-0": 6, "team-1": 4 } };

describe("decideBeat", () => {
  test("potez usred ruke: ništa od kraja ruke", () => {
    const b = decideBeat(prev, view("playing", { table: [T3], lastMove: move("p1", [T1, T2]) }));
    assert.equal(b?.final, false);
    assert.equal(b?.kind, "capture");
    assert.equal(b?.collectSeatId, "p1");
    assert.deepEqual(b?.heldTable, [T1, T2, T3]);
    assert.equal(b?.jackSweep, false);
  });

  test("zadnje kupljenje ruke dobija beat i zadržava sto", () => {
    const b = decideBeat(
      prev,
      view("hand_finished", {
        capturedCounts: { "team-0": 6, "team-1": 8 },
        lastMove: move("p1", [T1, T2]),
      }),
    );
    assert.ok(b, "kraj ruke više ne preskače potez");
    assert.equal(b.final, true);
    assert.equal(b.hold, true);
    assert.equal(b.collectSeatId, "p1");
    assert.deepEqual(b.heldTable, [T1, T2, T3]);
    assert.deepEqual(b.takenIds, [T1.id, T2.id]);
    // T3 je ostao poslije poteza i tek ga je kraj ruke dodijelio — to NIJE sweep,
    // iako je `next.table` prazan.
    assert.equal(b.jackSweep, false);
  });

  test("zadnje kupljenje koje samo isprazni sto jeste sweep", () => {
    const b = decideBeat(
      prev,
      view("match_finished", { lastMove: move("me", [T1, T2, T3]) }),
    );
    assert.equal(b?.final, true);
    assert.equal(b?.jackSweep, true);
  });

  test("zadnji trail: karta ulazi u zadržani sto, a sto leti zadnjem kupcu", () => {
    const b = decideBeat(
      prev,
      view("hand_finished", {
        // me (team-0) baca, a sto (3 + bačena) ide timu 1.
        capturedCounts: { "team-0": 6, "team-1": 8 },
        lastMove: move("me", []),
      }),
    );
    assert.ok(b);
    assert.equal(b.kind, "trail");
    assert.equal(b.final, true);
    assert.equal(b.hold, true);
    assert.deepEqual(b.heldTable, [T1, T2, T3, PLAYED]);
    assert.equal(b.seatId, "me");
    assert.equal(b.collectSeatId, "p1");
  });

  test("zadnji trail u pile vlastitog tima leti onome ko je bacio", () => {
    const b = decideBeat(
      prev,
      view("hand_finished", {
        capturedCounts: { "team-0": 10, "team-1": 4 },
        lastMove: move("p2", []),
      }),
    );
    assert.equal(b?.collectSeatId, "p2");
  });

  test("pauza i prekid i dalje ne daju beat", () => {
    for (const phase of ["paused_for_reconnect", "abandon_vote", "abandoned"] as GamePhase[]) {
      assert.equal(decideBeat(prev, view(phase, { lastMove: move("p1", [T1]) })), null);
    }
  });

  test("kraj ruke bez poteza: nema šta da se pokaže", () => {
    assert.equal(decideBeat(prev, view("hand_finished", {})), null);
  });
});

describe("red snapshota — tuđi beat se ne prekida mojim potezom", () => {
  const T4 = card("clubs", "K");
  const MINE = card("hearts", "K");
  const base = view("playing", { table: [T1, T2, T3], stateVersion: 1 });
  // p1 kupi dvije petice; zatim ja kupim kralja koji je bio na stolu.
  const s2 = view("playing", {
    table: [T3, T4],
    stateVersion: 2,
    lastMove: { ...move("p1", [T1, T2]), moveId: "a" },
  });
  const s3 = view("playing", {
    table: [T3],
    stateVersion: 3,
    lastMove: { moveId: "b", playerId: "me", playedCard: MINE, capturedCards: [T4], isAutoPlay: false },
  });

  test("miran sto: potez kreće odmah", () => {
    const t = receiveSnapshot(initialTracked(base), s2);
    assert.equal(t.version, 2);
    assert.equal(t.beat?.moveId, "a");
    assert.equal(t.queue.length, 0);
  });

  test("potez usred beat-a čeka u redu, sto ostaje na prikazanom", () => {
    const busy = receiveSnapshot(initialTracked(base), s2);
    const t = receiveSnapshot(busy, s3);
    assert.equal(t.beat?.moveId, "a", "tuđi beat nije prekinut");
    assert.equal(t.version, 2);
    assert.equal(t.seen, 3);
    assert.deepEqual(t.queue.map((q) => q.stateVersion), [3]);
  });

  test("kraj beat-a pušta sljedeći, nad stolom koji je bio prikazan", () => {
    const busy = receiveSnapshot(receiveSnapshot(initialTracked(base), s2), s3);
    const t = drainQueue({ ...busy, beat: null, phase: "idle" });
    assert.equal(t.beat?.moveId, "b");
    assert.equal(t.beat?.byMe, true);
    assert.deepEqual(t.beat?.heldTable, [T3, T4]);
    assert.equal(t.version, 3);
    assert.equal(t.queue.length, 0);
  });

  test("snapshot bez novog poteza prolazi odmah pri pražnjenju", () => {
    const busy = receiveSnapshot(initialTracked(base), s2);
    const same = { ...s2, stateVersion: 3 } as PrivateGameStateView;
    const t = drainQueue({ ...receiveSnapshot(busy, same), beat: null, phase: "idle" });
    assert.equal(t.beat, null);
    assert.equal(t.version, 3);
  });

  test("pauza ne čeka: snap na stvarno stanje, red se baca", () => {
    const busy = receiveSnapshot(receiveSnapshot(initialTracked(base), s2), s3);
    const paused = view("paused_for_reconnect", { table: [T3], stateVersion: 4 });
    const t = receiveSnapshot(busy, paused);
    assert.equal(t.beat, null);
    assert.equal(t.phase, "idle");
    assert.equal(t.queue.length, 0);
    assert.equal(t.version, 4);
  });

  test("nova partija sa manjom verzijom: `seen` je tačno zadnja (bez petlje)", () => {
    const busy = receiveSnapshot(initialTracked(base), s2);
    const fresh = view("playing", { table: [], stateVersion: 1 });
    assert.equal(receiveSnapshot(busy, fresh).seen, 1);
  });
});
