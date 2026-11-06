import { describe, test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createRulesConfig } from "@zandar/game-core";
import { clientSupportsGame, type Player, type PokerGamePayload } from "@zandar/shared-types";
import type { LobbyRoom } from "../rooms";
import { pokerMatchEndedEvents, pokerMatchStartedEvents } from "../analytics";
import { PokerTables, parsePokerAction, type PokerSocketLike, type PokerTiming } from "./table";

type Emitted = { event: string; payload: unknown };

function fakeSocket(playerId: string): PokerSocketLike & { log: Emitted[] } {
  const log: Emitted[] = [];
  return { data: { playerId }, log, emit: (event, payload) => log.push({ event, payload }) };
}

function human(id: string, seatIndex: number, extra: Partial<Player> = {}): Player {
  return {
    id,
    displayName: `Čovjek ${id}`,
    seatIndex,
    connectionStatus: "connected",
    isHost: seatIndex === 0,
    consecutiveAutoPlays: 0,
    guestId: `g-${id}`,
    ...extra,
  };
}

function bot(id: string, seatIndex: number): Player {
  return { ...human(id, seatIndex), displayName: `Bot ${id}`, isBot: true, guestId: undefined, isHost: false };
}

function room(players: Player[], extra: Partial<LobbyRoom> = {}): LobbyRoom {
  return {
    id: "sto1",
    status: "waiting",
    hostPlayerId: players[0]!.id,
    players,
    rulesConfig: createRulesConfig(players.length as 2 | 3 | 4),
    gameState: null,
    sessionTokens: new Map(),
    joinRequests: new Map(),
    createdAt: Date.now(),
    game: "poker",
    poker: null,
    ...extra,
  };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(cond: () => boolean, ms = 8000): Promise<void> {
  const end = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > end) throw new Error("until: istekao rok");
    await wait(5);
  }
}

let tables: PokerTables[] = [];
afterEach(() => {
  for (const t of tables) t.dispose();
  tables = [];
});

function setup(r: LobbyRoom, sockets: PokerSocketLike[] = [], timing: Partial<PokerTiming> = {}) {
  const rooms = new Map([[r.id, r]]);
  const ended: string[] = [];
  const started: string[] = [];
  let botSeq = 0;
  const t = new PokerTables({
    getRoom: (id) => rooms.get(id),
    socketsIn: async () => sockets,
    persist: () => {},
    fillBots: (room) => {
      while (room.players.length < room.rulesConfig.playerCount) {
        room.players.push(bot(`b${++botSeq}`, room.players.length));
      }
    },
    log: { info: () => {}, error: () => {} },
    timing: {
      turnMs: 40,
      graceMs: 60,
      handPauseMs: 2,
      showdownPauseMs: 2,
      autoActMs: 2,
      matchWindowMs: 20,
      ...timing,
    },
    botThinkMs: () => 1,
    onMatchStarted: (rm) => started.push(rm.poker!.matchId),
    onMatchEnded: (_rm, reason) => ended.push(reason),
  });
  tables.push(t);
  return { t, rooms, ended, started };
}

const lastState = (s: { log: Emitted[] }) =>
  [...s.log].reverse().find((e) => e.event === "game:state")?.payload as PokerGamePayload | undefined;

describe("PokerTables — start i pogled", () => {
  test("start: meč počinje, čovjek dobija samo svoj pogled bez isBot-a", async () => {
    const me = fakeSocket("h1");
    const r = room([human("h1", 0), bot("b1", 1), bot("b2", 2), bot("b3", 3)]);
    const { t, started } = setup(r, [me], {});
    t.start(r);
    await until(() => lastState(me) !== undefined);
    assert.equal(r.status, "playing");
    assert.equal(started.length, 1);
    const st = lastState(me)!;
    assert.equal(st.game, "poker");
    assert.equal(st.myCards.length, 2);
    assert.equal(st.players.length, 4);
    assert.equal(st.seats.every((s) => s.stack + s.streetBet === 100), true);
    const json = JSON.stringify(st);
    assert.equal(json.includes("isBot"), false);
    assert.equal(json.includes("botProfile"), false);
    assert.equal(json.includes('"deck"'), false);
    assert.equal(json.includes("holeCards"), false);
    for (const seat of r.poker!.seats.filter((s) => s.playerId !== "h1")) {
      for (const c of seat.holeCards) assert.equal(json.includes(c.id), false, `curi ${c.id}`);
    }
  });

  test("bez interakcije: botovi igraju, čovjeku istekne rok, meč se završi", async () => {
    const r = room([human("h1", 0), bot("b1", 1), bot("b2", 2), bot("b3", 3)]);
    const { t, ended } = setup(r);
    t.start(r);
    await until(() => r.status === "finished", 20000);
    assert.equal(ended[0], "completed");
    assert.equal(r.poker!.phase, "match_finished");
    const places = r.poker!.seats.map((s) => s.place);
    assert.equal(places.every((p) => typeof p === "number"), true);
    assert.equal(places.includes(1), true);
  });

  test("tajmer se ne resetuje kad broadcast dođe za isti potez", async () => {
    const r = room([human("h1", 0), human("h2", 1)]);
    const me = fakeSocket("h1");
    const { t } = setup(r, [me], { turnMs: 5000 });
    t.start(r);
    await until(() => lastState(me)?.turnDeadline !== undefined);
    const first = lastState(me)!.turnDeadline;
    await wait(20);
    await t.broadcast(r.id);
    assert.equal(lastState(me)!.turnDeadline, first);
  });
});

describe("PokerTables — akcije", () => {
  test("nevalidan payload i tuđi potez se odbijaju", async () => {
    const r = room([human("h1", 0), human("h2", 1)]);
    const { t } = setup(r, [], { turnMs: 5000 });
    t.start(r);
    const cur = r.poker!.currentPlayerId!;
    const other = cur === "h1" ? "h2" : "h1";
    assert.deepEqual(await t.act(r.id, cur, { type: "teleport" }), { ok: false, error: "INVALID_PAYLOAD" });
    assert.deepEqual(await t.act(r.id, other, { type: "fold" }), { ok: false, error: "NOT_YOUR_TURN" });
    assert.deepEqual(await t.act(r.id, cur, { type: "call" }), { ok: true });
    assert.notEqual(r.poker!.currentPlayerId, cur);
  });

  test("parsePokerAction", () => {
    assert.deepEqual(parsePokerAction({ type: "raise", amount: 10 }), { type: "raise", amount: 10 });
    assert.equal(parsePokerAction({ type: "raise", amount: 1.5 }), null);
    assert.equal(parsePokerAction({ type: "raise", amount: -1 }), null);
    assert.equal(parsePokerAction(null), null);
    assert.equal(parsePokerAction("fold"), null);
    assert.deepEqual(parsePokerAction({ type: "fold", clientKnownStateVersion: 3 }), {
      type: "fold",
      clientKnownStateVersion: 3,
    });
  });
});

describe("PokerTables — veza i izlazak", () => {
  test("prekid veze: sitting out, poslije roka napušta — mjesto ostaje prazno", async () => {
    const r = room([human("h1", 0), human("h2", 1), bot("b1", 2)]);
    const { t } = setup(r, [], { turnMs: 5000, graceMs: 50 });
    t.start(r);
    await t.onDisconnect(r.id, "h2");
    assert.equal(r.poker!.seats.find((s) => s.playerId === "h2")!.status, "sitting_out");
    await until(() => r.poker!.seats.find((s) => s.playerId === "h2")!.status === "left");
    const seat = r.poker!.seats.find((s) => s.playerId === "h2")!;
    assert.equal(seat.place, 3);
    assert.equal(r.players.find((p) => p.id === "h2")!.left, true);
    // Bot ne preuzima mjesto.
    assert.equal(r.players.filter((p) => p.isBot).length, 1);
  });

  test("povratak prije roka: ponovo aktivan, ne napušta", async () => {
    const r = room([human("h1", 0), human("h2", 1)]);
    const sock = fakeSocket("h2");
    const { t } = setup(r, [sock], { turnMs: 5000, graceMs: 60 });
    t.start(r);
    await t.onDisconnect(r.id, "h2");
    await t.onSubscribe(r.id, "h2", sock);
    assert.equal(r.poker!.seats.find((s) => s.playerId === "h2")!.status, "active");
    await wait(100);
    assert.equal(r.poker!.seats.find((s) => s.playerId === "h2")!.status, "active");
  });

  test("namjeran izlazak zadnjeg protivnika završava meč", async () => {
    const r = room([human("h1", 0), human("h2", 1)]);
    const { t, ended } = setup(r, [], { turnMs: 5000 });
    t.start(r);
    await t.leave(r.id, "h2");
    assert.equal(r.poker!.phase, "match_finished");
    assert.equal(r.status, "finished");
    assert.equal(ended[0], "completed");
  });

  test("kreator napusti privatnu sobu prije starta → soba se zatvara", async () => {
    const r = room([human("h1", 0), human("h2", 1)]);
    r.rulesConfig = createRulesConfig(4);
    const guest = fakeSocket("h2");
    const { t } = setup(r, [fakeSocket("h1"), guest]);
    await t.leave(r.id, "h1");
    assert.equal(r.status, "finished");
    assert.equal(guest.log.some((e) => e.event === "room:kicked"), true);
  });
});

describe("PokerTables — ulazak", () => {
  test("Quick Play: poslije prozora prazna mjesta dobijaju botovi i meč kreće", async () => {
    const r = room([human("h1", 0)], { isPublic: true });
    r.rulesConfig = createRulesConfig(4);
    const { t } = setup(r);
    t.openMatching(r);
    assert.equal(r.status, "waiting");
    assert.ok(r.matchingUntil! > Date.now());
    await until(() => r.status === "playing");
    assert.equal(r.players.length, 4);
    assert.equal(r.players.filter((p) => p.isBot).length, 3);
    assert.equal(r.matchingUntil, undefined);
  });

  test("privatna soba kreće sama kad se popuni; Žandar soba se ne dira", () => {
    const full = room([human("h1", 0), human("h2", 1)]);
    const { t } = setup(full, [], { turnMs: 5000 });
    assert.equal(t.startIfFull(full), true);
    assert.equal(full.status, "playing");

    const half = room([human("h1", 0)]);
    half.rulesConfig = createRulesConfig(2);
    assert.equal(t.startIfFull(half), false);

    const zandar = room([human("h1", 0), human("h2", 1)], { game: undefined });
    assert.equal(t.startIfFull(zandar), false);
    assert.equal(zandar.status, "waiting");
  });

  test("hidracija: stanje iz JSON-a nastavlja igru (botovi igraju dalje)", async () => {
    const r = room([human("h1", 0), bot("b1", 1), bot("b2", 2)]);
    const first = setup(r, [], { turnMs: 5000 });
    first.t.start(r);
    first.t.dispose();
    // Kao FileAdapter: JSON krug, novi proces.
    const restored: LobbyRoom = { ...r, poker: JSON.parse(JSON.stringify(r.poker)) };
    const version = restored.poker!.stateVersion;
    const second = setup(restored, [], { turnMs: 30 });
    second.t.rearm(restored);
    await until(() => restored.poker!.stateVersion > version);
  });

  test("revanš: samo host, samo poslije kraja, svi ponovo od 100", async () => {
    const r = room([human("h1", 0), human("h2", 1)]);
    const { t, started } = setup(r, [], { turnMs: 5000 });
    t.start(r);
    assert.deepEqual(t.rematch(r.id, "h1"), { ok: false, error: "INVALID_GAME_PHASE" });
    await t.leave(r.id, "h2");
    r.players.find((p) => p.id === "h2")!.left = false; // vratio se za revanš
    assert.deepEqual(t.rematch(r.id, "h2"), { ok: false, error: "NOT_HOST" });
    assert.deepEqual(t.rematch(r.id, "h1"), { ok: true });
    assert.equal(r.poker!.phase, "betting");
    assert.match(r.poker!.matchId, /-rematch-/);
    assert.equal(started.length, 2);
    assert.equal(r.poker!.seats.reduce((a, s) => a + s.stack + s.totalBet, 0), 200);
  });
});

describe("stari klijenti i analitika", () => {
  test("klijent bez `games` zna samo Žandar", () => {
    assert.equal(clientSupportsGame(undefined, "poker"), false);
    assert.equal(clientSupportsGame(["zandar"], "poker"), false);
    assert.equal(clientSupportsGame(["zandar", "poker"], "poker"), true);
    assert.equal(clientSupportsGame(undefined, "zandar"), true);
  });

  test("poker match_started/match_ended: game, plasman, bez botova", async () => {
    const r = room([human("h1", 0, { platform: "android" }), bot("b1", 1)]);
    const { t } = setup(r, [], { turnMs: 5000 });
    t.start(r);
    const start = pokerMatchStartedEvents(r.poker!, r.players, "quick_play");
    assert.equal(start.length, 1);
    assert.deepEqual(start[0]!.properties, {
      mode: "quick_play",
      match_id: "sto1",
      game: "poker",
      player_count: 2,
      human_count: 1,
      bot_count: 1,
      is_rematch: false,
      platform: "android",
    });
    await t.leave(r.id, "b1");
    const end = pokerMatchEndedEvents(r.poker!, r.players, {
      mode: "quick_play",
      reason: "completed",
      startedAt: 1000,
      now: 4000,
    });
    assert.equal(end[0]!.properties.placement, 1);
    assert.equal(end[0]!.properties.is_winner, true);
    assert.equal(end[0]!.properties.game, "poker");
    assert.equal(end[0]!.properties.duration_ms, 3000);
  });
});
