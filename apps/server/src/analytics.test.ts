import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { Player } from "@zandar/shared-types";

import {
  friendInviteAcceptedEvent,
  friendInviteSentEvent,
  isRematch,
  joinApprovedEvent,
  joinRequestedEvent,
  matchEndedEvents,
  matchStartedEvents,
  parsePlatform,
  pokerMatchEndedEvents,
  raubMatchLike,
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

describe("lijevak pozivnice", () => {
  const req = { createdAt: 1_000, guestId: "g-gost", platform: "web" as const };

  test("join_requested ide gostu, sa sobom i platformom", () => {
    assert.deepEqual(joinRequestedEvent("sto1", req), {
      distinctId: "g-gost",
      event: "join_requested",
      properties: { room_id: "sto1", platform: "web" },
    });
  });

  test("join_approved nosi koliko je gost čekao", () => {
    assert.deepEqual(joinApprovedEvent("sto1", req, 46_000), {
      distinctId: "g-gost",
      event: "join_approved",
      properties: { room_id: "sto1", wait_ms: 45_000, platform: "web" },
    });
  });

  test("sat servera unazad ne daje negativno čekanje", () => {
    assert.equal(joinApprovedEvent("sto1", req, 500)!.properties.wait_ms, 0);
  });

  test("bez guestId-a (stari klijent) nema događaja", () => {
    assert.equal(joinRequestedEvent("sto1", { createdAt: 1 }), null);
    assert.equal(joinApprovedEvent("sto1", { createdAt: 1 }, 2), null);
  });

  test("bez platforme polje izostaje", () => {
    const event = joinRequestedEvent("sto1", { createdAt: 1, guestId: "g" });
    assert.deepEqual(event!.properties, { room_id: "sto1" });
  });
});

describe("pozivi iz liste prijatelja", () => {
  const host = { guestId: "g-host", platform: "android" as const };

  test("friend_invite_sent ide pozivaocu, sa brojem pozvanih i izvorom", () => {
    assert.deepEqual(friendInviteSentEvent("sto1", { game: "raub" }, host, 2, "new_room"), {
      distinctId: "g-host",
      event: "friend_invite_sent",
      properties: { room_id: "sto1", invited_count: 2, source: "new_room", game: "raub", platform: "android" },
    });
  });

  test("soba bez igre je Žandar", () => {
    const event = friendInviteSentEvent("sto1", {}, { guestId: "g" }, 1, "lobby");
    assert.deepEqual(event!.properties, { room_id: "sto1", invited_count: 1, source: "lobby", game: "zandar" });
  });

  test("bez guestId-a pozivaoca ili bez pozvanih nema događaja", () => {
    assert.equal(friendInviteSentEvent("sto1", {}, undefined, 1, "lobby"), null);
    assert.equal(friendInviteSentEvent("sto1", {}, {}, 1, "lobby"), null);
    assert.equal(friendInviteSentEvent("sto1", {}, host, 0, "lobby"), null);
  });

  test("friend_invite_accepted ide pozvanom i nosi čekanje od poziva", () => {
    assert.deepEqual(friendInviteAcceptedEvent("sto1", { game: "poker" }, { guestId: "g-gost", platform: "web" }, 1_000, 61_000), {
      distinctId: "g-gost",
      event: "friend_invite_accepted",
      properties: { room_id: "sto1", game: "poker", wait_ms: 60_000, platform: "web" },
    });
  });

  test("prihvatanje: sat unazad ne daje negativno čekanje, bez guestId-a nema događaja", () => {
    assert.equal(friendInviteAcceptedEvent("sto1", {}, { guestId: "g" }, 5_000, 1_000)!.properties.wait_ms, 0);
    assert.equal(friendInviteAcceptedEvent("sto1", {}, {}, 1, 2), null);
  });
});

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
      game: "zandar",
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

describe("pokerMatchEndedEvents — izlazak", () => {
  const seats = [
    { playerId: "a", place: 1 },
    { playerId: "b", place: 2 },
    { playerId: "c", place: 3 },
    { playerId: "d", place: 4 },
  ];
  const state = { matchId: "pk1", handNo: 3, seats };

  test("ko je sam izašao dobija abandoned i left, bez is_winner; ostali ostaju completed", () => {
    const table = [
      player("a", 0, { isBot: true }),
      player("b", 1, { guestId: "g-b" }),
      player("c", 2, { isBot: true }),
      player("d", 3, { guestId: "g-d", left: true }),
    ];
    const events = pokerMatchEndedEvents(state, table, { mode: "quick_play", reason: "completed", now: 0 });
    const byId = new Map(events.map((e) => [e.distinctId, e.properties]));

    const leaver = byId.get("g-d")!;
    assert.equal(leaver.end_reason, "abandoned");
    assert.equal(leaver.left, true);
    assert.equal("is_winner" in leaver, false, "izlazak nije poraz");
    assert.equal(leaver.placement, 4, "plasman ostaje");

    const stayed = byId.get("g-b")!;
    assert.equal(stayed.end_reason, "completed");
    assert.equal(stayed.is_winner, false);
    assert.equal("left" in stayed, false);
  });

  test("raub bez izlaska: isto kao prije (completed, pobjednik na 1. mjestu)", () => {
    const table = [player("a", 0, { guestId: "g-a" }), player("b", 1, { guestId: "g-b" })];
    const events = pokerMatchEndedEvents(
      raubMatchLike({ matchId: "r1", dealNo: 9, seats: seats.slice(0, 2) }),
      table,
      { mode: "private_room", reason: "completed", now: 0 },
      "raub",
    );
    assert.deepEqual(
      events.map((e) => [e.properties.end_reason, e.properties.is_winner, "left" in e.properties]),
      [
        ["completed", true, false],
        ["completed", false, false],
      ],
    );
  });

  test("prekinut meč: i onaj koji je izašao i ostali su abandoned", () => {
    const table = [player("b", 1, { guestId: "g-b" }), player("d", 3, { guestId: "g-d", left: true })];
    const events = pokerMatchEndedEvents(state, table, { mode: "quick_play", reason: "abandoned", now: 0 });
    assert.deepEqual(
      events.map((e) => [e.properties.end_reason, e.properties.left ?? false]),
      [
        ["abandoned", false],
        ["abandoned", true],
      ],
    );
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
