import { describe, test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createRulesConfig } from "@zandar/game-core";
import { clientSupportsGame, inviteSummary, parseGameId, type BelaGamePayload, type Player } from "@zandar/shared-types";
import type { LobbyRoom } from "../rooms";
import { belaMatchLike, pokerMatchEndedEvents, pokerMatchStartedEvents } from "../analytics";
import { describeSeat } from "../activeTable";
import { parseRoomTargetScore } from "../input";
import {
  BelaTables,
  belaPausePhase,
  belaTargetFor,
  parseBelaAction,
  type BelaDeps,
  type BelaSocketLike,
  type BelaTiming,
} from "./table";

type Emitted = { event: string; payload: unknown };

function fakeSocket(playerId: string): BelaSocketLike & { log: Emitted[] } {
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
    teamId: seatIndex % 2,
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
    rulesConfig: createRulesConfig(4),
    gameState: null,
    sessionTokens: new Map(),
    joinRequests: new Map(),
    createdAt: Date.now(),
    game: "bela",
    bela: null,
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

let tables: BelaTables[] = [];
afterEach(() => {
  for (const t of tables) t.dispose();
  tables = [];
});

function setup(
  r: LobbyRoom,
  sockets: BelaSocketLike[] = [],
  timing: Partial<BelaTiming> = {},
  extra: Partial<BelaDeps> = {},
) {
  const rooms = new Map([[r.id, r]]);
  const ended: string[] = [];
  const stalledEnds: boolean[] = [];
  const started: string[] = [];
  const roomEvents: Emitted[] = [];
  let botSeq = 0;
  const t = new BelaTables({
    getRoom: (id) => rooms.get(id),
    socketsIn: async () => sockets,
    persist: () => {},
    fillBots: (room) => {
      while (room.players.length < 4) room.players.push(bot(`b${++botSeq}`, room.players.length));
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
    onMatchStarted: (room) => started.push(room.bela!.matchId),
    onMatchEnded: (_room, reason, extra) => {
      ended.push(reason);
      stalledEnds.push(extra?.stalled === true);
    },
    ...extra,
  });
  tables.push(t);
  return { t, ended, stalledEnds, started, roomEvents };
}

const lastState = (s: { log: Emitted[] }) =>
  [...s.log].reverse().find((e) => e.event === "game:state")?.payload as BelaGamePayload | undefined;

const four = () => [human("h", 0), bot("b1", 1), bot("b2", 2), bot("b3", 3)];
const fourHumans = () => [human("h", 0), human("g", 1), human("k", 2), human("m", 3)];

describe("bela: parseBelaAction", () => {
  test("prima ispravne namjere", () => {
    assert.deepEqual(parseBelaAction({ type: "call", suit: "hearts" }), { type: "call", suit: "hearts" });
    assert.deepEqual(parseBelaAction({ type: "call", suit: null }), { type: "call", suit: null });
    assert.deepEqual(parseBelaAction({ type: "play", cardId: "clubs-A" }), { type: "play", cardId: "clubs-A" });
    assert.deepEqual(parseBelaAction({ type: "play", cardId: "clubs-A", declare: false, clientKnownStateVersion: 4 }), {
      type: "play",
      cardId: "clubs-A",
      declare: false,
      clientKnownStateVersion: 4,
    });
  });

  test("odbija sve ostalo", () => {
    for (const bad of [
      null,
      "call",
      {},
      { type: "fold" },
      { type: "call" },
      { type: "call", suit: "stars" },
      { type: "play" },
      { type: "play", cardId: 7 },
      { type: "play", cardId: "x".repeat(33) },
      { type: "play", cardId: "clubs-A", declare: "da" },
      { type: "call", suit: null, clientKnownStateVersion: "1" },
    ]) {
      assert.equal(parseBelaAction(bad), null, JSON.stringify(bad));
    }
  });
});

describe("bela: igra, stari klijent i cilj", () => {
  test("parseGameId prepoznaje belu; klijent mora javiti bela:1", () => {
    assert.equal(parseGameId("bela"), "bela");
    assert.equal(parseGameId("BELA"), "zandar");
    assert.equal(clientSupportsGame(undefined, "bela"), false);
    assert.equal(clientSupportsGame(["zandar", "poker", "raub", "raub:2"], "bela"), false);
    assert.equal(clientSupportsGame(["zandar", "bela"], "bela"), false);
    assert.equal(clientSupportsGame(["zandar", "bela", "bela:1"], "bela"), true);
  });

  test("cilj: Quick Play 501, privatni sto 501/701/1001, inače 1001 (P-16)", () => {
    assert.equal(belaTargetFor({ isPublic: true, rulesConfig: createRulesConfig(4) }), 501);
    const rc = createRulesConfig(4);
    assert.equal(belaTargetFor({ rulesConfig: rc }), 1001); // 21 iz Žandar pravila → 1001
    rc.targetScore = 701;
    assert.equal(belaTargetFor({ rulesConfig: rc }), 701);
    assert.equal(parseRoomTargetScore(undefined, "bela"), 1001);
    assert.equal(parseRoomTargetScore(501, "bela"), 501);
    assert.equal(parseRoomTargetScore(21, "bela"), null);
    assert.equal(inviteSummary("bela", 4, 1001), "Bela · 4 igrača · do 1001");
  });
});

describe("bela: sto", () => {
  test("Quick Play: prozor istekne, botovi popune do 4, meč do 501", async () => {
    const r = room([human("h", 0)], { isPublic: true });
    const { t, started } = setup(r, [fakeSocket("h")]);
    t.openMatching(r);
    await until(() => r.status === "playing");
    assert.equal(r.players.length, 4);
    assert.equal(r.bela!.seats.length, 4);
    assert.equal(r.bela!.rules.targetScore, 501);
    assert.equal(r.bela!.rules.turnTimeoutSeconds, 60);
    assert.equal(started.length, 1);
    assert.equal(r.gameState, null); // Žandar kod Bela sobu preskače
  });

  test("timovi po redu ulaska: mjesta 0 i 2 protiv 1 i 3", () => {
    const r = room(fourHumans());
    const { t } = setup(r);
    t.start(r);
    assert.deepEqual(
      r.bela!.seats.map((s) => [s.playerId, s.team]),
      [["h", 0], ["g", 1], ["k", 0], ["m", 1]],
    );
    // Soba daje isti tim (`seatIndex % 2`), pa ga klijent smije pokazati.
    for (const s of r.bela!.seats) assert.equal(r.players.find((p) => p.id === s.playerId)!.teamId, s.team);
  });

  test("privatni sto kreće sam tek kad su sva 4 mjesta popunjena", () => {
    const r = room([human("h", 0), human("g", 1), human("k", 2)]);
    const { t } = setup(r);
    assert.equal(t.startIfFull(r), false);
    r.players.push(human("m", 3));
    assert.equal(t.startIfFull(r), true);
    assert.equal(r.bela!.rules.targetScore, 1001);
  });

  test("pogled: bez isBot, guestId, tuđih ruku, talona i špila", async () => {
    const r = room(four());
    const sock = fakeSocket("h");
    // Botovi „misle" dugo, pa se stanje ne mijenja dok test čita.
    const { t } = setup(r, [sock], {}, { botThinkMs: () => 60_000 });
    t.start(r);
    await until(() => lastState(sock) !== undefined);
    const p = lastState(sock)!;
    assert.equal(p.game, "bela");
    const json = JSON.stringify(p);
    assert.ok(!json.includes("isBot"));
    assert.ok(!json.includes("botProfile"));
    assert.ok(!json.includes("guestId"));
    assert.ok(!("deck" in p));
    for (const seat of r.bela!.seats) {
      // Talon je zatvoren i za vlasnika (P-2).
      for (const c of seat.talon) assert.ok(!json.includes(`"${c.id}"`), `curi talon ${c.id}`);
      if (seat.playerId === "h") continue;
      for (const c of seat.hand) assert.ok(!json.includes(`"${c.id}"`), `curi ruka ${c.id}`);
    }
    assert.equal(p.myCards.length, 6);
    assert.ok(typeof p.turnDeadline === "number");
  });

  test("botovi igraju sami, a čovjeku istek roka odigra najsigurniju akciju", async () => {
    const r = room(four());
    const { t, roomEvents } = setup(r, [fakeSocket("h")], { turnMs: 15 });
    t.start(r);
    await until(() => r.bela!.phase === "hand_complete");
    assert.equal(r.bela!.history.length, 1);
    // Čovjek je u ruci od 8 štihova sigurno bar jednom bio na potezu.
    assert.ok(roomEvents.some((e) => e.event === "game:autoPlay"));
  });

  test("cijeli meč do kraja: host vodi ruke, kraj javlja completed", async () => {
    const r = room(four(), { isPublic: true });
    const { t, ended } = setup(r, [], { turnMs: 2 });
    t.start(r);
    for (let i = 0; i < 40 && r.bela!.phase !== "match_finished"; i++) {
      await until(() => r.bela!.phase !== "playing");
      if (r.bela!.phase === "hand_complete") assert.deepEqual(await t.nextHand(r.id, "h"), { ok: true });
    }
    assert.equal(r.bela!.phase, "match_finished");
    assert.equal(r.status, "finished");
    assert.deepEqual(ended, ["completed"]);
    assert.ok(Math.max(...r.bela!.scores) >= 501);
  });

  test("sljedeću ruku pokreće samo host", async () => {
    const r = room(four());
    const { t } = setup(r, [], { turnMs: 2 });
    t.start(r);
    await until(() => r.bela!.phase === "hand_complete");
    r.hostPlayerId = "h";
    assert.deepEqual(await t.nextHand(r.id, "b1"), { ok: false, error: "NOT_HOST" });
    const dealNo = r.bela!.dealNo;
    assert.deepEqual(await t.nextHand(r.id, "h"), { ok: true });
    assert.equal(r.bela!.dealNo, dealNo + 1);
    assert.deepEqual(await t.nextHand(r.id, "h"), { ok: false, error: "INVALID_PHASE" });
  });

  test("rok za „Sljedeća ruka”: niko ne pritisne → napušten kao zaglavljen; čovjekovi auto potezi se broje", async () => {
    const r = room(four());
    const { t, ended, stalledEnds } = setup(r, [], { turnMs: 2, nextHandIdleMs: 30 });
    t.start(r);
    await until(() => r.bela!.phase === "hand_complete");
    assert.ok((r.moveCounts?.byPlayer.h?.auto ?? 0) >= 1);
    assert.equal(r.moveCounts?.byPlayer.b1, undefined, "bot se ne broji");
    await until(() => r.bela!.phase === "abandoned");
    assert.deepEqual(ended, ["abandoned"]);
    assert.deepEqual(stalledEnds, [true]);
  });

  test("rok za „Sljedeća ruka” ne važi za sto sa dva čovjeka — host kontroliše", async () => {
    const r = room(fourHumans());
    const { t, ended } = setup(r, [], { turnMs: 2, nextHandIdleMs: 30 });
    t.start(r);
    await until(() => r.bela!.phase === "hand_complete");
    assert.equal(typeof r.handEndedAt, "number", "početak čekanja se i dalje bilježi (sweeper)");
    await wait(150);
    assert.equal(r.bela!.phase, "hand_complete");
    assert.deepEqual(ended, []);
  });

  test("akcija van reda i nevažeća akcija se odbijaju kodom", async () => {
    const r = room(fourHumans());
    const { t } = setup(r);
    t.start(r);
    const onTurn = r.bela!.currentPlayerId!;
    const notOnTurn = r.bela!.seats.find((s) => s.playerId !== onTurn)!.playerId;
    assert.deepEqual(await t.act(r.id, notOnTurn, { type: "call", suit: null }), { ok: false, error: "NOT_YOUR_TURN" });
    assert.deepEqual(await t.act(r.id, onTurn, { type: "fold" }), { ok: false, error: "INVALID_PAYLOAD" });
    assert.equal((await t.act(r.id, onTurn, { type: "play", cardId: "clubs-A" })).ok, false);
    assert.deepEqual(await t.act(r.id, onTurn, { type: "call", suit: "hearts" }), { ok: true });
    assert.equal(r.bela!.trumpSuit, "hearts");
  });
});

describe("bela: prekid veze, pauza i glasanje", () => {
  test("jedini čovjek otpadne: poslije roka sto se raspušta bez glasanja", async () => {
    const r = room(four());
    const { t, ended } = setup(r, [], { graceMs: 20 }, { botThinkMs: () => 60_000 });
    t.start(r);
    await t.onDisconnect(r.id, "h");
    assert.equal(r.players[0]!.connectionStatus, "reconnecting");
    await until(() => r.bela!.phase === "abandoned");
    assert.equal(r.status, "finished");
    assert.deepEqual(ended, ["abandoned"]);
  });

  test("drugi čovjek otpadne: pauza, akcije stoje; povratak nastavlja", async () => {
    const r = room(fourHumans());
    const { t } = setup(r, [], { graceMs: 20 });
    t.start(r);
    await t.onDisconnect(r.id, "g");
    await until(() => r.bela!.interruption?.kind === "paused");
    assert.equal(belaPausePhase(r.bela!), "paused_for_reconnect");
    const pid = r.bela!.currentPlayerId!;
    assert.deepEqual(await t.act(r.id, pid, { type: "call", suit: null }), { ok: false, error: "GAME_PAUSED" });
    await t.onSubscribe(r.id, "g", fakeSocket("g"));
    assert.equal(r.players[1]!.connectionStatus, "connected");
    assert.equal(r.bela!.interruption, null);
  });

  test('pauza → glasanje; „Završi" svih preostalih prekida meč', async () => {
    const r = room(fourHumans());
    const { t, ended } = setup(r, [], { graceMs: 10, pauseMs: 20 });
    t.start(r);
    await t.onDisconnect(r.id, "m");
    await until(() => r.bela!.interruption?.kind === "vote");
    await t.castVote(r.id, "h", "end");
    await t.castVote(r.id, "g", "end");
    assert.equal(r.bela!.phase, "playing"); // još se čeka k
    await t.castVote(r.id, "k", "end");
    assert.equal(r.bela!.phase, "abandoned");
    assert.deepEqual(ended, ["abandoned"]);
  });

  test('jedan „Čekaj" pobjeđuje: nova pauza', async () => {
    const r = room(fourHumans());
    const { t } = setup(r, [], { graceMs: 10, pauseMs: 20 });
    t.start(r);
    await t.onDisconnect(r.id, "m");
    await until(() => r.bela!.interruption?.kind === "vote");
    await t.castVote(r.id, "h", "wait");
    assert.equal(r.bela!.interruption?.kind, "paused");
    assert.deepEqual(await t.waitMore(r.id), { ok: true });
  });

  test("namjeran izlazak: ostali odmah glasaju, bez pauze", async () => {
    const r = room(fourHumans());
    const { t } = setup(r);
    t.start(r);
    await t.leave(r.id, "g");
    assert.equal(r.players[1]!.left, true);
    assert.equal(r.bela!.interruption?.kind, "vote");
  });

  test("kreator izađe iz privatnog lobija: sto se zatvara", async () => {
    const r = room([human("h", 0), human("g", 1)]);
    const guest = fakeSocket("g");
    const { t } = setup(r, [guest]);
    await t.leave(r.id, "h");
    assert.equal(r.status, "finished");
    assert.equal(guest.log[0]?.event, "room:kicked");
  });

  test("hidracija: istekao rok pauze prelazi u glasanje odmah", async () => {
    const r = room(fourHumans());
    const { t } = setup(r);
    t.start(r);
    r.bela = { ...r.bela!, interruption: { kind: "paused", startedAt: 0, endsAt: Date.now() - 1 } };
    t.rearm(r);
    assert.equal(r.players[0]!.connectionStatus, "reconnecting");
    await until(() => r.bela!.interruption?.kind === "vote");
  });

  test("hidracija: snimak preživi JSON i sto igra dalje", async () => {
    const r = room(four());
    const { t } = setup(r, [], { turnMs: 2 }, { botThinkMs: () => 60_000 });
    t.start(r);
    t.dispose();
    const restored: LobbyRoom = { ...r, bela: JSON.parse(JSON.stringify(r.bela)) };
    const { t: t2 } = setup(restored, [], { turnMs: 2 });
    t2.rearm(restored);
    await until(() => restored.bela!.phase === "hand_complete");
    assert.equal(restored.bela!.history.length, 1);
  });
});

describe("bela: revanš, analitika i „Vrati se za sto”", () => {
  test("revanš samo host, samo poslije kraja, i samo sa sva 4 igrača", async () => {
    const r = room(fourHumans());
    const { t } = setup(r);
    t.start(r);
    assert.deepEqual(t.rematch(r.id, "h"), { ok: false, error: "INVALID_GAME_PHASE" });
    r.bela = { ...r.bela!, phase: "match_finished", scores: [1001, 400] };
    assert.deepEqual(t.rematch(r.id, "g"), { ok: false, error: "NOT_HOST" });
    assert.deepEqual(t.rematch(r.id, "h"), { ok: true });
    assert.ok(r.bela!.matchId.startsWith("sto1-rematch-"));
    assert.deepEqual(r.bela!.scores, [0, 0]);
    r.bela = { ...r.bela!, phase: "match_finished" };
    r.players[3]!.left = true;
    assert.deepEqual(t.rematch(r.id, "h"), { ok: false, error: "NOT_ENOUGH_PLAYERS" });
  });

  test("match_started / match_ended nose game: bela i timski plasman", () => {
    const r = room(four());
    const { t } = setup(r);
    t.start(r);
    const startedEv = pokerMatchStartedEvents(belaMatchLike(r.bela!), r.players, "quick_play", "bela");
    assert.equal(startedEv.length, 1);
    assert.equal(startedEv[0]!.properties.game, "bela");
    assert.equal(startedEv[0]!.properties.bot_count, 3);
    const finished = {
      ...r.bela!,
      placements: r.bela!.seats.map((s) => ({ playerId: s.playerId, team: s.team, place: s.team === 0 ? 1 : 2, score: 0 })),
    };
    const endedEv = pokerMatchEndedEvents(
      belaMatchLike(finished),
      r.players,
      { mode: "quick_play", reason: "completed", now: Date.now() },
      "bela",
    );
    assert.equal(endedEv[0]!.properties.game, "bela");
    assert.equal(endedEv[0]!.properties.is_winner, true); // h sjedi na mjestu 0, tim 0
    assert.equal(endedEv[0]!.properties.placement, 1);
  });

  test("traka na početnoj: rezultat našeg tima i njihovog", () => {
    const r = room(fourHumans());
    const { t } = setup(r);
    t.start(r);
    r.bela = { ...r.bela!, scores: [312, 260] };
    const g = describeSeat(r, "g")!;
    assert.equal(g.game, "bela");
    assert.equal(g.phase, "playing");
    assert.deepEqual(g.state, { kind: "score", mine: 260, theirs: 312, team: true });
    r.bela = {
      ...r.bela!,
      phase: "match_finished",
      placements: r.bela!.seats.map((s) => ({ playerId: s.playerId, team: s.team, place: s.team === 0 ? 1 : 2, score: 0 })),
    };
    assert.deepEqual(describeSeat(r, "h")!.result, { kind: "score", won: true, mine: 312, theirs: 260 });
    assert.equal(describeSeat(r, "b9"), null);
  });
});
