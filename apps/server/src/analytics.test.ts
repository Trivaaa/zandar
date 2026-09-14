import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { Player } from "@zandar/shared-types";

import {
  isRematch,
  matchEndedEvents,
  matchStartedEvents,
  parsePlatform,
} from "./analytics";

function player(id: string, seatIndex: number, extra: Partial<Player> = {}): Player {
  return {
    id,
    displayName: id,
    seatIndex,
    teamId: seatIndex % 2,
    connectionStatus: "connected",
    isHost: seatIndex === 0,
    consecutiveAutoPlays: 0,
    ...extra,
  };
}

function match(players: Player[], extra: Partial<{ matchId: string; matchScore: Record<string, number>; handScores: unknown[] }> = {}) {
  return {
    matchId: "abc123",
    players,
    matchScore: { "team-0": 21, "team-1": 12 },
    handScores: [{}, {}, {}],
    targetScore: 21,
    ...extra,
  };
}

const quickPlayTable = [
  player("me", 0, { guestId: "g-me", platform: "android" }),
  player("b1", 1, { isBot: true }),
  player("b2", 2, { isBot: true }),
  player("b3", 3, { isBot: true }),
];

describe("matchStartedEvents", () => {
  test("jedan događaj po čovjeku, botovi se ne emituju", () => {
    const events = matchStartedEvents(match(quickPlayTable), "quick_play");
    assert.equal(events.length, 1);
    assert.equal(events[0]!.distinctId, "g-me");
    assert.deepEqual(events[0]!.properties, {
      mode: "quick_play",
      match_id: "abc123",
      player_count: 4,
      human_count: 1,
      bot_count: 3,
      target_score: 21,
      is_rematch: false,
      platform: "android",
    });
  });

  test("čovjek bez guestId-a se preskače, ali se broji u sastavu stola", () => {
    const table = [
      player("a", 0, { guestId: "g-a" }),
      player("b", 1),
      player("c", 2, { guestId: "g-c" }),
      player("d", 3, { isBot: true }),
    ];
    const events = matchStartedEvents(match(table), "private_room");
    assert.deepEqual(events.map((e) => e.distinctId), ["g-a", "g-c"]);
    assert.equal(events[0]!.properties.human_count, 3);
    assert.equal("platform" in events[0]!.properties, false, "nepoznata platforma se ne izmišlja");
  });

  test("revanš se prepoznaje po matchId-u", () => {
    assert.equal(isRematch("abc123-rematch-1757800000000"), true);
    const events = matchStartedEvents(match(quickPlayTable, { matchId: "abc123-rematch-1" }), "private_room");
    assert.equal(events[0]!.properties.is_rematch, true);
  });
});

describe("matchEndedEvents", () => {
  test("čovjek koji je pao s veze i dalje dobija kraj meča", () => {
    const table = [
      player("a", 0, { guestId: "g-a" }),
      player("b", 1, { guestId: "g-b", connectionStatus: "reconnecting" }),
      player("c", 2, { guestId: "g-c", connectionStatus: "abandoned" }),
      player("d", 3, { isBot: true }),
    ];
    const events = matchEndedEvents(match(table), { mode: "private_room", reason: "completed", now: 0 });
    assert.deepEqual(events.map((e) => e.distinctId), ["g-a", "g-b", "g-c"]);
  });

  test("is_winner po timu u 4P, samo za odigran meč", () => {
    const table = [
      player("a", 0, { guestId: "g-a" }),
      player("b", 1, { guestId: "g-b" }),
      player("c", 2, { isBot: true }),
      player("d", 3, { isBot: true }),
    ];
    const done = matchEndedEvents(match(table), { mode: "quick_play", reason: "completed", startedAt: 1000, now: 61_000 });
    assert.equal(done[0]!.properties.is_winner, true, "team-0 ima 21");
    assert.equal(done[1]!.properties.is_winner, false);
    assert.equal(done[0]!.properties.duration_ms, 60_000);
    assert.equal(done[0]!.properties.hands_played, 3);

    const cut = matchEndedEvents(match(table), { mode: "quick_play", reason: "abandoned", now: 61_000 });
    assert.equal("is_winner" in cut[0]!.properties, false, "prekinut meč nema pobjednika");
    assert.equal("duration_ms" in cut[0]!.properties, false, "bez viđenog starta nema trajanja");
  });

  test("is_winner po igraču u 2P", () => {
    const table = [
      player("a", 0, { guestId: "g-a", teamId: undefined }),
      player("b", 1, { guestId: "g-b", teamId: undefined }),
    ];
    const events = matchEndedEvents(match(table, { matchScore: { a: 9, b: 22 } }), {
      mode: "private_room",
      reason: "completed",
      now: 0,
    });
    assert.deepEqual(events.map((e) => e.properties.is_winner), [false, true]);
  });
});

describe("parsePlatform", () => {
  test("native je APK, nepoznato ostaje nepoznato", () => {
    assert.equal(parsePlatform("native"), "android");
    assert.equal(parsePlatform("android"), "android");
    assert.equal(parsePlatform("web"), "web");
    assert.equal(parsePlatform("ios"), undefined);
    assert.equal(parsePlatform(undefined), undefined);
  });
});
