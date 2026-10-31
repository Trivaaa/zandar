import assert from "node:assert/strict";
import { test } from "node:test";

import type { Card, GameState } from "@zandar/shared-types";

import { buildPrivateGameStateView } from "./gameStateView";

const card = (suit: Card["suit"], rank: Card["rank"]): Card =>
  ({ id: `${suit}-${rank}`, suit, rank }) as Card;

function state(captured: Record<string, Card[]>): GameState {
  const player = (id: string, teamId: number, isBot = false) => ({
    id,
    displayName: id,
    seatIndex: Number(id.slice(1)),
    isHost: id === "p0",
    teamId,
    connectionStatus: "connected",
    ...(isBot ? { isBot: true, botProfile: { tier: "tajna" } } : {}),
  });
  return {
    roomId: "r",
    matchId: "m",
    phase: "playing",
    players: [player("p0", 0), player("p1", 1, true), player("p2", 0), player("p3", 1, true)],
    pendingJoinRequests: [],
    reactions: [],
    dealerPlayerId: "p0",
    currentPlayerId: "p0",
    deck: [card("spades", "9")],
    table: [],
    hands: { p0: [card("hearts", "4")], p1: [card("hearts", "5")], p2: [], p3: [] },
    captured,
    handNumber: 3,
    handScores: [],
    matchScore: { "team-0": 7, "team-1": 12 },
    targetScore: 21,
    moveHistory: [],
    rulesConfig: {},
    stateVersion: 1,
  } as unknown as GameState;
}

test("liveHand: trefovi, karte i vlasnici male i velike po pile-u", () => {
  const view = buildPrivateGameStateView(
    state({
      "team-0": [card("clubs", "2"), card("clubs", "5"), card("hearts", "9")],
      "team-1": [card("diamonds", "10"), card("clubs", "K")],
    }),
    "p0",
  );
  const b = view.liveHand!.breakdown;
  assert.deepEqual(b.mostCards!.cardCountByPile, { "team-0": 3, "team-1": 2 });
  assert.equal(b.mostCards!.winnerPileId, "team-0");
  assert.deepEqual(b.mostClubs!.clubCountByPile, { "team-0": 2, "team-1": 1 });
  assert.equal(b.twoOfClubs!.winnerPileId, "team-0");
  assert.equal(b.tenOfDiamonds!.winnerPileId, "team-1");
});

test("liveHand: neriješeno i neodnesene karte nemaju vlasnika", () => {
  const view = buildPrivateGameStateView(
    state({ "team-0": [card("hearts", "9")], "team-1": [card("spades", "3")] }),
    "p0",
  );
  const b = view.liveHand!.breakdown;
  assert.equal(b.mostCards!.winnerPileId, undefined);
  assert.equal(b.mostClubs!.winnerPileId, undefined);
  assert.equal(b.twoOfClubs!.winnerPileId, undefined);
  assert.equal(b.tenOfDiamonds!.winnerPileId, undefined);
});

test("liveHand ne ulazi u matchScore usred ruke", () => {
  const view = buildPrivateGameStateView(state({ "team-0": [card("clubs", "2")], "team-1": [] }), "p0");
  assert.deepEqual(view.matchScore, { "team-0": 7, "team-1": 12 });
});

test("view ne otkriva tuđu ruku, špil ni da je neko bot", () => {
  const view = buildPrivateGameStateView(state({ "team-0": [], "team-1": [] }), "p0");
  const json = JSON.stringify(view);
  assert.deepEqual(view.myHand, [card("hearts", "4")]);
  assert.equal(json.includes("hearts-5"), false, "tuđa ruka");
  assert.equal(json.includes("spades-9"), false, "špil");
  assert.equal(json.includes("isBot"), false);
  assert.equal(json.includes("botProfile"), false);
});
