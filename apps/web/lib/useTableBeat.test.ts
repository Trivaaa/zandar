import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { Card, GamePhase, PrivateGameStateView } from "@zandar/shared-types";
import { decideBeat } from "./useTableBeat";

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
