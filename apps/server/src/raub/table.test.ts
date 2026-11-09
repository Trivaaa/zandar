import { describe, test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createRulesConfig } from "@zandar/game-core";
import { clientSupportsGame, parseGameId, type Player, type RaubGamePayload } from "@zandar/shared-types";
import type { LobbyRoom } from "../rooms";
import { pokerMatchEndedEvents, pokerMatchStartedEvents, raubMatchLike } from "../analytics";
import { RaubTables, parseRaubAction, raubPausePhase, type RaubSocketLike, type RaubTiming } from "./table";

type Emitted = { event: string; payload: unknown };

function fakeSocket(playerId: string): RaubSocketLike & { log: Emitted[] } {
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
  const rulesConfig = createRulesConfig(players.length as 2 | 3 | 4);
  return {
    id: "sto1",
    status: "waiting",
    hostPlayerId: players[0]!.id,
    // 4P Žandar pravila nose timove — Raub ih ne smije pokazati.
    players: players.map((p) => (players.length === 4 ? { ...p, teamId: p.seatIndex % 2 } : p)),
    rulesConfig,
    gameState: null,
    sessionTokens: new Map(),
    joinRequests: new Map(),
    createdAt: Date.now(),
    game: "raub",
    raub: null,
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

let tables: RaubTables[] = [];
afterEach(() => {
  for (const t of tables) t.dispose();
  tables = [];
});

function setup(r: LobbyRoom, sockets: RaubSocketLike[] = [], timing: Partial<RaubTiming> = {}) {
  const rooms = new Map([[r.id, r]]);
  const ended: string[] = [];
  const started: string[] = [];
  const roomEvents: Emitted[] = [];
  let botSeq = 0;
  const t = new RaubTables({
    getRoom: (id) => rooms.get(id),
    socketsIn: async () => sockets,
    persist: () => {},
    fillBots: (room) => {
      while (room.players.length < room.rulesConfig.playerCount) {
        room.players.push(bot(`b${++botSeq}`, room.players.length));
      }
    },
    emitToRoom: (_id, event, payload) => roomEvents.push({ event, payload }),
    log: { info: () => {}, error: () => {} },
    timing: {
      turnMs: 60_000,
      graceMs: 60_000,
      handEndGraceMs: 60_000,
      pauseMs: 60_000,
      voteMs: 60_000,
      waitExtensionMs: 60_000,
      matchWindowMs: 20,
      ...timing,
    },
    botThinkMs: () => 1,
    onMatchStarted: (room) => started.push(room.raub!.matchId),
    onMatchEnded: (_room, reason) => ended.push(reason),
  });
  tables.push(t);
  return { t, ended, started, roomEvents };
}

const lastState = (s: { log: Emitted[] }) =>
  [...s.log].reverse().find((e) => e.event === "game:state")?.payload as RaubGamePayload | undefined;

describe("raub: parseRaubAction", () => {
  test("prima ispravne namjere", () => {
    assert.deepEqual(parseRaubAction({ type: "open" }), { type: "open" });
    assert.deepEqual(parseRaubAction({ type: "bid", bid: "raub" }), { type: "bid", bid: "raub" });
    assert.deepEqual(parseRaubAction({ type: "go", go: false }), { type: "go", go: false });
    assert.deepEqual(parseRaubAction({ type: "exchange", cardIds: ["hearts-7"], clientKnownStateVersion: 3 }), {
      type: "exchange",
      cardIds: ["hearts-7"],
      clientKnownStateVersion: 3,
    });
    assert.deepEqual(parseRaubAction({ type: "play", cardId: "spades-A" }), { type: "play", cardId: "spades-A" });
  });

  test("odbija sve ostalo", () => {
    for (const bad of [
      null,
      "open",
      {},
      { type: "fold" },
      { type: "bid", bid: "maybe" },
      { type: "go", go: "yes" },
      { type: "swap_seven" },
      { type: "play" },
      { type: "play", cardId: 7 },
      { type: "exchange", cardIds: "hearts-7" },
      { type: "exchange", cardIds: ["a", "b", "c", "d", "e"] },
      { type: "open", clientKnownStateVersion: "1" },
    ]) {
      assert.equal(parseRaubAction(bad), null, JSON.stringify(bad));
    }
  });
});

describe("raub: igra i stari klijent", () => {
  test("parseGameId prepoznaje raub; stari klijent ga ne zna", () => {
    assert.equal(parseGameId("raub"), "raub");
    assert.equal(parseGameId("RAUB"), "zandar");
    assert.equal(clientSupportsGame(undefined, "raub"), false);
    assert.equal(clientSupportsGame(["zandar", "poker"], "raub"), false);
    assert.equal(clientSupportsGame(["zandar", "poker", "raub"], "raub"), true);
  });
});

describe("raub: sto", () => {
  test("Quick Play: prozor istekne, botovi popune do 4, meč počinje", async () => {
    const r = room([human("h", 0)], { isPublic: true });
    r.rulesConfig = createRulesConfig(4);
    const sock = fakeSocket("h");
    const { t, started } = setup(r, [sock]);
    t.openMatching(r);
    await until(() => r.status === "playing");
    assert.equal(r.players.length, 4);
    assert.equal(r.raub!.seats.length, 4);
    assert.equal(started.length, 1);
    assert.equal(r.gameState, null); // Žandar kod raub sobu preskače
  });

  test("pogled: bez isBot, teamId, tuđih ruku, špila i odbačenih karata", async () => {
    const r = room([human("h", 0), bot("b1", 1), bot("b2", 2), bot("b3", 3)]);
    const sock = fakeSocket("h");
    const { t } = setup(r, [sock]);
    t.start(r);
    await until(() => lastState(sock) !== undefined);
    const p = lastState(sock)!;
    assert.equal(p.game, "raub");
    const json = JSON.stringify(p);
    assert.ok(!json.includes("isBot"));
    assert.ok(!json.includes("botProfile"));
    assert.ok(!json.includes("guestId"));
    assert.ok(!json.includes("teamId"));
    assert.ok(!("deck" in p));
    assert.ok(!("discarded" in p));
    for (const seat of r.raub!.seats) {
      if (seat.playerId === "h") continue;
      for (const c of seat.hand) assert.ok(!json.includes(`"${c.id}"`), `curi ${c.id}`);
    }
    for (const c of r.raub!.deck) assert.ok(!json.includes(`"${c.id}"`), `curi špil ${c.id}`);
    assert.ok(typeof p.turnDeadline === "number");
  });

  test("botovi igraju sami, a čovjeku istek roka odigra najsigurniju akciju", async () => {
    const r = room([human("h", 0), bot("b1", 1), bot("b2", 2), bot("b3", 3)]);
    const sock = fakeSocket("h");
    const { t, roomEvents } = setup(r, [sock], { turnMs: 15 });
    t.start(r);
    await until(() => r.raub!.phase === "hand_complete" || r.raub!.phase === "match_finished");
    assert.ok(r.raub!.history.length >= 1);
    // Ako je čovjek bio na potezu, server je javio auto potez.
    if (roomEvents.length > 0) assert.equal(roomEvents[0]!.event, "game:autoPlay");
  });

  test("sljedeću ruku pokreće samo host (odluka 2)", async () => {
    const r = room([human("h", 0), human("g", 1)]);
    const { t } = setup(r, [], { turnMs: 5 });
    t.start(r);
    await until(() => r.raub!.phase !== "playing");
    if (r.raub!.phase === "match_finished") return;
    assert.deepEqual(await t.nextHand(r.id, "g"), { ok: false, error: "NOT_HOST" });
    const dealNo = r.raub!.dealNo;
    assert.deepEqual(await t.nextHand(r.id, "h"), { ok: true });
    assert.equal(r.raub!.dealNo, dealNo + 1);
    assert.deepEqual(await t.nextHand(r.id, "h"), { ok: false, error: "INVALID_PHASE" });
  });

  test("akcija van reda i nevažeća akcija se odbijaju kodom", async () => {
    const r = room([human("h", 0), human("g", 1)]);
    const { t } = setup(r);
    t.start(r);
    const notOnTurn = r.raub!.currentPlayerId === "h" ? "g" : "h";
    assert.deepEqual(await t.act(r.id, notOnTurn, { type: "open" }), { ok: false, error: "NOT_YOUR_TURN" });
    assert.deepEqual(await t.act(r.id, "h", { type: "fold" }), { ok: false, error: "INVALID_PAYLOAD" });
  });
});

describe("raub: prekid veze, pauza i glasanje (odluka 3)", () => {
  test("jedini čovjek otpadne: poslije roka sto se raspušta bez glasanja", async () => {
    const r = room([human("h", 0), bot("b1", 1), bot("b2", 2), bot("b3", 3)]);
    const { t, ended } = setup(r, [], { graceMs: 20 });
    t.start(r);
    await t.onDisconnect(r.id, "h");
    assert.equal(r.players[0]!.connectionStatus, "reconnecting");
    await until(() => r.raub!.phase === "abandoned");
    assert.equal(r.status, "finished");
    assert.deepEqual(ended, ["abandoned"]);
    assert.equal(r.players[0]!.connectionStatus, "abandoned");
  });

  test("drugi čovjek otpadne: pauza, akcije stoje; povratak nastavlja", async () => {
    const r = room([human("h", 0), human("g", 1)]);
    const { t } = setup(r, [], { graceMs: 20 });
    t.start(r);
    await t.onDisconnect(r.id, "g");
    await until(() => r.raub!.interruption?.kind === "paused");
    assert.equal(raubPausePhase(r.raub!), "paused_for_reconnect");
    const pid = r.raub!.currentPlayerId!;
    assert.deepEqual(await t.act(r.id, pid, { type: "open" }), { ok: false, error: "GAME_PAUSED" });
    await t.onSubscribe(r.id, "g", fakeSocket("g"));
    assert.equal(r.players[1]!.connectionStatus, "connected");
    assert.equal(r.raub!.interruption, null);
  });

  test('pauza → glasanje; „Završi" svih preostalih prekida meč', async () => {
    const r = room([human("h", 0), human("g", 1), human("k", 2)]);
    const { t, ended } = setup(r, [], { graceMs: 10, pauseMs: 20 });
    t.start(r);
    await t.onDisconnect(r.id, "k");
    await until(() => r.raub!.interruption?.kind === "vote");
    assert.deepEqual(await t.castVote(r.id, "h", "end"), { ok: true });
    assert.equal(r.raub!.phase, "playing"); // još se čeka g
    await t.castVote(r.id, "g", "end");
    assert.equal(r.raub!.phase, "abandoned");
    assert.deepEqual(ended, ["abandoned"]);
  });

  test('jedan „Čekaj" pobjeđuje: nova pauza', async () => {
    const r = room([human("h", 0), human("g", 1), human("k", 2)]);
    const { t } = setup(r, [], { graceMs: 10, pauseMs: 20 });
    t.start(r);
    await t.onDisconnect(r.id, "k");
    await until(() => r.raub!.interruption?.kind === "vote");
    await t.castVote(r.id, "h", "wait");
    assert.equal(r.raub!.interruption?.kind, "paused");
    assert.deepEqual(await t.waitMore(r.id), { ok: true });
  });

  test("namjeran izlazak: ostali odmah glasaju, bez pauze (QA 2026-11-09 B3)", async () => {
    const r = room([human("h", 0), human("g", 1)]);
    const { t } = setup(r);
    t.start(r);
    await t.leave(r.id, "g");
    assert.equal(r.players[1]!.left, true);
    assert.equal(r.raub!.interruption?.kind, "vote");
    // Jedini preostali čovjek glasa „prekini" → meč je gotov odmah.
    await t.castVote(r.id, "h", "end");
    assert.equal(r.raub!.phase, "abandoned");
  });

  test("kreator izađe iz privatnog lobija: sto se zatvara", async () => {
    const r = room([human("h", 0), human("g", 1)]);
    r.rulesConfig = createRulesConfig(3);
    const guest = fakeSocket("g");
    const { t } = setup(r, [guest]);
    await t.leave(r.id, "h");
    assert.equal(r.status, "finished");
    assert.equal(guest.log[0]?.event, "room:kicked");
  });

  test("hidracija: istekao rok pauze prelazi u glasanje odmah", async () => {
    const r = room([human("h", 0), human("g", 1)]);
    const { t } = setup(r);
    t.start(r);
    r.raub = { ...r.raub!, interruption: { kind: "paused", startedAt: 0, endsAt: Date.now() - 1 } };
    t.rearm(r);
    assert.equal(r.players[0]!.connectionStatus, "reconnecting");
    await until(() => r.raub!.interruption?.kind === "vote");
  });
});

describe("raub: revanš i analitika", () => {
  test("revanš samo host i samo poslije kraja meča; svi ponovo od 21", async () => {
    const r = room([human("h", 0), human("g", 1)]);
    const { t } = setup(r);
    t.start(r);
    assert.deepEqual(t.rematch(r.id, "h"), { ok: false, error: "INVALID_GAME_PHASE" });
    r.raub = { ...r.raub!, phase: "match_finished" };
    assert.deepEqual(t.rematch(r.id, "g"), { ok: false, error: "NOT_HOST" });
    assert.deepEqual(t.rematch(r.id, "h"), { ok: true });
    assert.ok(r.raub!.matchId.startsWith("sto1-rematch-"));
    assert.ok(r.raub!.seats.every((s) => s.score === 21));
  });

  test("match_started / match_ended nose game: raub i plasman", () => {
    const r = room([human("h", 0), bot("b1", 1)]);
    const { t } = setup(r);
    t.start(r);
    const startedEv = pokerMatchStartedEvents(raubMatchLike(r.raub!), r.players, "quick_play", "raub");
    assert.equal(startedEv.length, 1);
    assert.equal(startedEv[0]!.properties.game, "raub");
    assert.equal(startedEv[0]!.properties.bot_count, 1);
    const finished = { ...r.raub!, seats: r.raub!.seats.map((s) => ({ ...s, place: s.playerId === "h" ? 1 : 2 })) };
    const endedEv = pokerMatchEndedEvents(raubMatchLike(finished), r.players, {
      mode: "quick_play",
      reason: "completed",
      now: Date.now(),
    }, "raub");
    assert.equal(endedEv[0]!.properties.game, "raub");
    assert.equal(endedEv[0]!.properties.is_winner, true);
    assert.equal(endedEv[0]!.properties.placement, 1);
  });
});
