import assert from "node:assert/strict";
import { describe, test } from "node:test";

import Fastify from "fastify";
import { createRulesConfig } from "@zandar/game-core";
import type { GameState, Player, PokerGameState, RaubGameState } from "@zandar/shared-types";

import { describeSeat, pickTable, registerActiveTableRoutes } from "./activeTable";
import { SlidingWindowLimiter } from "./rateLimit";
import { createSessionToken, hashToken, verifyToken, type LobbyRoom } from "./rooms";

function human(id: string, seatIndex: number, extra: Partial<Player> = {}): Player {
  return {
    id,
    displayName: `Igrač ${id}`,
    seatIndex,
    connectionStatus: "connected",
    isHost: seatIndex === 0,
    consecutiveAutoPlays: 0,
    ...extra,
  };
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
    createdAt: 1000,
    ...extra,
  };
}

/** Žandar stanje — samo polja koja traka čita. */
function zandar(players: Player[], over: Partial<GameState> = {}): GameState {
  return {
    matchId: "m1",
    phase: "playing",
    players,
    currentPlayerId: players[0]!.id,
    matchScore: {},
    ...over,
  } as GameState;
}

const four = () =>
  [0, 1, 2, 3].map((i) => human(`p${i}`, i, { teamId: i % 2, ...(i > 0 ? { isBot: true } : {}) }));

describe("describeSeat — Žandar", () => {
  test("4P na potezu: Vi : Oni po timu", () => {
    const players = four();
    const r = room(players, {
      status: "playing",
      gameState: zandar(players, { matchScore: { "team-0": 7, "team-1": 5 } }),
    });
    const t = describeSeat(r, "p0");
    assert.equal(t?.phase, "playing");
    assert.equal(t?.myTurn, true);
    assert.deepEqual(t?.state, { kind: "score", mine: 7, theirs: 5, team: true });
  });

  test("2P: ime protivnika, nije na potezu", () => {
    const players = [human("a", 0), human("b", 1, { displayName: "Marko" })];
    const r = room(players, {
      status: "playing",
      rulesConfig: createRulesConfig(2),
      gameState: zandar(players, { currentPlayerId: "b", matchScore: { a: 7, b: 5 } }),
    });
    const t = describeSeat(r, "a");
    assert.equal(t?.myTurn, false);
    assert.deepEqual(t?.state, { kind: "score", mine: 7, theirs: 5, team: false, opponentName: "Marko" });
  });

  test("kraj: soba ostaje „playing“, ishod iz match_finished", () => {
    const players = [human("a", 0), human("b", 1)];
    const r = room(players, {
      status: "playing",
      gameState: zandar(players, { phase: "match_finished", matchScore: { a: 11, b: 8 } }),
    });
    const t = describeSeat(r, "a");
    assert.equal(t?.phase, "finished");
    assert.deepEqual(t?.result, { kind: "score", won: true, mine: 11, theirs: 8 });
    assert.deepEqual(describeSeat(r, "b")?.result, { kind: "score", won: false, mine: 8, theirs: 11 });
  });

  test("pauza zbog mog odsustva: sto me čeka", () => {
    const players = [human("a", 0, { connectionStatus: "reconnecting" }), human("b", 1)];
    const r = room(players, { status: "playing", gameState: zandar(players, { phase: "paused_for_reconnect" }) });
    assert.equal(describeSeat(r, "a")?.waitingForMe, true);
    assert.equal(describeSeat(r, "a")?.myTurn, false);
    assert.equal(describeSeat(r, "b")?.waitingForMe, false);
  });

  test("napustio, prekinuta partija, bot ili nepoznat → nema trake", () => {
    const players = [human("a", 0, { left: true }), human("b", 1, { isBot: true })];
    const playing = room(players, { status: "playing", gameState: zandar(players) });
    assert.equal(describeSeat(playing, "a"), null);
    assert.equal(describeSeat(playing, "b"), null);
    assert.equal(describeSeat(playing, "x"), null);
    const p2 = [human("a", 0), human("c", 1)];
    const abandoned = room(p2, { status: "finished", gameState: zandar(p2, { phase: "abandoned" }) });
    assert.equal(describeSeat(abandoned, "a"), null);
  });

  test("lobi: zauzeta mjesta od ukupno", () => {
    const r = room([human("a", 0), human("b", 1), human("c", 2)]);
    assert.deepEqual(describeSeat(r, "a"), {
      roomId: "sto1",
      game: "zandar",
      matchId: "",
      phase: "lobby",
      myTurn: false,
      waitingForMe: false,
      state: { kind: "seats", taken: 3, total: 4 },
    });
  });
});

function poker(seats: Partial<PokerGameState["seats"][number]>[], over: Partial<PokerGameState> = {}): PokerGameState {
  return {
    matchId: "pm1",
    phase: "betting",
    currentPlayerId: "a",
    placements: [],
    seats: seats.map((s) => ({ status: "active", stack: 100, place: null, ...s })),
    ...over,
  } as PokerGameState;
}

describe("describeSeat — Poker", () => {
  const players = [human("a", 0), human("b", 1)];

  test("u toku: moji žetoni, na potezu", () => {
    const r = room(players, {
      status: "playing",
      game: "poker",
      poker: poker([{ playerId: "a", stack: 140 }, { playerId: "b" }]),
    });
    const t = describeSeat(r, "a");
    assert.equal(t?.myTurn, true);
    assert.deepEqual(t?.state, { kind: "chips", stack: 140 });
  });

  test("ispražnjeno mjesto (poslije 60 s) → nema trake", () => {
    const r = room(players, {
      status: "playing",
      game: "poker",
      poker: poker([{ playerId: "a", status: "left" }, { playerId: "b" }]),
    });
    assert.equal(describeSeat(r, "a"), null);
  });

  test("bez žetona: kraj za mene, plasman", () => {
    const r = room(players, {
      status: "playing",
      game: "poker",
      poker: poker([{ playerId: "a", status: "bankrupt", stack: 0, place: 3 }, { playerId: "b" }]),
    });
    const t = describeSeat(r, "a");
    assert.equal(t?.phase, "finished");
    assert.deepEqual(t?.result, { kind: "place", won: false, place: 3 });
  });

  test("zatvoren lobi (kreator izašao) → nema trake", () => {
    const r = room(players, { status: "finished", game: "poker", poker: null });
    assert.equal(describeSeat(r, "a"), null);
  });
});

describe("describeSeat — Raub", () => {
  const players = [human("a", 0), human("b", 1)];
  const raub = (over: Partial<RaubGameState> = {}) =>
    ({
      matchId: "rm1",
      phase: "playing",
      currentPlayerId: "b",
      placements: [],
      seats: [
        { playerId: "a", score: 9, place: null },
        { playerId: "b", score: 14, place: null },
      ],
      ...over,
    }) as RaubGameState;

  test("u toku: do 0 fali, nije na potezu", () => {
    const r = room(players, { status: "playing", game: "raub", raub: raub() });
    const t = describeSeat(r, "a");
    assert.equal(t?.myTurn, false);
    assert.deepEqual(t?.state, { kind: "toZero", score: 9 });
  });

  test("kraj: pobjeda iz plasmana", () => {
    const r = room(players, {
      status: "finished",
      game: "raub",
      raub: raub({ phase: "match_finished", placements: [{ playerId: "a", place: 1, score: 0 }] }),
    });
    assert.deepEqual(describeSeat(r, "a")?.result, { kind: "place", won: true, place: 1 });
  });
});

describe("pickTable", () => {
  const t = (phase: "lobby" | "playing" | "finished") =>
    ({ roomId: phase, phase }) as unknown as Parameters<typeof pickTable>[0][number]["table"];
  test("partija ispred lobija, lobi ispred kraja, pa novije", () => {
    assert.equal(
      pickTable([
        { table: t("finished"), activity: 9 },
        { table: t("playing"), activity: 1 },
        { table: t("lobby"), activity: 5 },
      ])?.table.phase,
      "playing",
    );
    const a = { table: t("finished"), activity: 1 };
    const b = { table: t("finished"), activity: 2 };
    assert.equal(pickTable([a, b]), b);
    assert.equal(pickTable([]), null);
  });
});

describe("rute", () => {
  async function setup(rooms: LobbyRoom[], users: Record<string, string> = {}) {
    const claimed: string[] = [];
    const left: string[] = [];
    const app = Fastify();
    registerActiveTableRoutes(app, {
      rooms: () => rooms,
      getRoom: (id) => rooms.find((r) => r.id === id),
      verifiedUid: async (auth) => (auth ? (users[auth.replace("Bearer ", "")] ?? null) : null),
      onClaim: async (r, playerId) => {
        claimed.push(`${r.id}:${playerId}`);
      },
      leaveSeat: async (roomId, playerId) => {
        left.push(`${roomId}:${playerId}`);
      },
      limiter: new SlidingWindowLimiter(100, 60_000),
    });
    await app.ready();
    const post = (url: string, payload: unknown, token?: string) =>
      app.inject({
        method: "POST",
        url,
        payload: payload as object,
        ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
      });
    return { post, claimed, left };
  }

  function seated() {
    const players = [human("a", 0, { uid: "uid-a" }), human("b", 1)];
    const r = room(players, { status: "playing", gameState: zandar(players, { matchScore: { a: 3, b: 1 } }) });
    const token = createSessionToken();
    r.sessionTokens.set("a", hashToken(token));
    return { r, token };
  }

  test("ključ sa uređaja: traka bez claim-a; nepostojeća soba ide u gone", async () => {
    const { r, token } = seated();
    const { post } = await setup([r]);
    const res = await post("/api/me/table", {
      sessions: [
        { roomId: "sto1", playerId: "a", sessionToken: token },
        { roomId: "nema", playerId: "a", sessionToken: "x" },
      ],
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.table.roomId, "sto1");
    assert.equal(body.claim, undefined);
    assert.deepEqual(body.gone, ["nema"]);
  });

  test("pogrešan ključ i bez naloga → nema stola", async () => {
    const { r } = seated();
    const { post } = await setup([r]);
    const res = await post("/api/me/table", { sessions: [{ roomId: "sto1", playerId: "a", sessionToken: "krivi" }] });
    assert.equal(res.json().table, null);
  });

  test("nalog na drugom uređaju: traka uz claim; tuđi nalog ništa", async () => {
    const { r } = seated();
    const { post } = await setup([r], { tokA: "uid-a", tokZ: "uid-z" });
    const mine = (await post("/api/me/table", { sessions: [] }, "tokA")).json();
    assert.equal(mine.table.roomId, "sto1");
    assert.equal(mine.claim, true);
    assert.equal((await post("/api/me/table", {}, "tokZ")).json().table, null);
  });

  test("claim: bez naloga 401, tuđi 404, svoj daje novi ključ a stari više ne važi", async () => {
    const { r, token } = seated();
    const { post, claimed } = await setup([r], { tokA: "uid-a", tokZ: "uid-z" });
    assert.equal((await post("/api/me/table/claim", { roomId: "sto1" })).statusCode, 401);
    assert.equal((await post("/api/me/table/claim", { roomId: "sto1" }, "tokZ")).statusCode, 404);
    const res = await post("/api/me/table/claim", { roomId: "sto1" }, "tokA");
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.playerId, "a");
    assert.equal(verifyToken(r, "a", body.sessionToken), true);
    assert.equal(verifyToken(r, "a", token), false);
    assert.deepEqual(claimed, ["sto1:a"]);
  });

  test("claim na stolu koji više ne čeka → 409", async () => {
    const { r } = seated();
    r.players[0]!.left = true;
    const { post } = await setup([r], { tokA: "uid-a" });
    assert.equal((await post("/api/me/table/claim", { roomId: "sto1" }, "tokA")).statusCode, 409);
  });

  test("napusti sa početne: samo sa važećim ključem", async () => {
    const { r, token } = seated();
    const { post, left } = await setup([r]);
    assert.equal((await post("/api/rooms/sto1/leave", { playerId: "a", sessionToken: "krivi" })).statusCode, 403);
    assert.equal((await post("/api/rooms/nema/leave", { playerId: "a", sessionToken: token })).statusCode, 404);
    assert.equal((await post("/api/rooms/sto1/leave", { playerId: "a", sessionToken: token })).statusCode, 200);
    assert.deepEqual(left, ["sto1:a"]);
  });

  test("ulaz sa mreže: smeće u tijelu ne ruši rutu", async () => {
    const { post } = await setup([]);
    for (const payload of [null, { sessions: "x" }, { sessions: [null, 1, { roomId: 5 }] }]) {
      const res = await post("/api/me/table", payload);
      assert.equal(res.statusCode, 200);
      assert.equal(res.json().table, null);
    }
  });
});
