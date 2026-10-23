import { test } from "node:test";
import assert from "node:assert/strict";

import Fastify from "fastify";

import type { AuthUser } from "../auth/idToken";
import { registerFriendRoutes } from "./friendRoutes";
import { createMemoryProfileStore } from "./store";

/** `Bearer user:<uid>` = nalog, `Bearer anon:<uid>` = gost (vidi routes.test.ts). */
async function fakeRequireUser(
  request: { headers: { authorization?: string | undefined } },
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
): Promise<AuthUser | null> {
  const m = /^Bearer (user|anon):(\w+)$/.exec(request.headers.authorization ?? "");
  if (!m) {
    reply.code(401).send({ code: "invalid" });
    return null;
  }
  return { uid: m[2]!, anonymous: m[1] === "anon", provider: "password", emailVerified: false };
}

async function setup() {
  const store = createMemoryProfileStore();
  await store.setNickname("u1", "Marko", "marko");
  await store.setNickname("u2", "Marina", "marina");
  await store.setNickname("u3", "Ana", "ana");
  const notified: string[][] = [];
  const app = Fastify();
  registerFriendRoutes(app, { store, requireUser: fakeRequireUser, onFriendsChanged: (u) => notified.push(u) });
  const call = (method: "GET" | "POST" | "DELETE", url: string, who: string, payload?: object) =>
    app.inject({ method, url, headers: { authorization: `Bearer ${who}` }, ...(payload ? { payload } : {}) });
  return { store, notified, call };
}

test("samo nalog sa nadimkom: gost 403 account_required, nedovršen 403 nickname_required", async () => {
  const { call } = await setup();
  assert.equal((await call("GET", "/api/friends", "anon:g1")).json().code, "account_required");
  assert.equal((await call("GET", "/api/friends", "user:bez")).json().code, "nickname_required");
});

test("pretraga: ≥3 slova, prefiks, bez sebe i blokiranih, sa odnosom", async () => {
  const { call, store } = await setup();
  assert.equal((await call("GET", "/api/players/search?q=ma", "user:u1")).statusCode, 400);
  const res = await call("GET", "/api/players/search?q=MAR", "user:u3");
  assert.deepEqual(res.json(), {
    results: [
      { profileId: "marina", nickname: "Marina", avatar: null, relation: "none" },
      { profileId: "marko", nickname: "Marko", avatar: null, relation: "none" },
    ],
  });
  assert.doesNotMatch(res.body, /u1|u2/, "nikad uid");
  const self = await call("GET", "/api/players/search?q=mar", "user:u1");
  assert.deepEqual(self.json().results.map((r: { profileId: string }) => r.profileId), ["marina"]);

  await store.setBlock("u2", "u3", true);
  const hidden = await call("GET", "/api/players/search?q=mar", "user:u3");
  assert.deepEqual(hidden.json().results.map((r: { profileId: string }) => r.profileId), ["marko"], "ko me blokirao, nije u pretrazi");
});

test("zahtjev → dolazni → prihvati; kanal javlja broj; lista po abecedi", async () => {
  const { call, notified } = await setup();
  assert.deepEqual((await call("POST", "/api/friend-requests", "user:u1", { profileId: "marina" })).json(), { relation: "outgoing" });
  assert.deepEqual(notified.at(-1), ["u2", "u1"]);

  const inbox = (await call("GET", "/api/friends", "user:u2")).json();
  assert.deepEqual(inbox.incoming, [{ profileId: "marko", nickname: "Marko", avatar: null }]);

  assert.deepEqual((await call("POST", "/api/friend-requests/marko/accept", "user:u2")).json(), { relation: "friends" });
  await call("POST", "/api/friend-requests", "user:u3", { profileId: "marko" });
  await call("POST", "/api/friend-requests/ana/accept", "user:u1");
  const list = (await call("GET", "/api/friends", "user:u1")).json();
  assert.deepEqual(list.friends.map((f: { nickname: string }) => f.nickname), ["Ana", "Marina"]);
  assert.deepEqual(list.incoming, []);

  assert.deepEqual((await call("DELETE", "/api/friends/ana", "user:u1")).json(), { relation: "none" });
  assert.equal((await call("POST", "/api/friend-requests", "user:u1", { profileId: "nepostoji" })).statusCode, 404);
});

test("povuci i odbij", async () => {
  const { call } = await setup();
  await call("POST", "/api/friend-requests", "user:u1", { profileId: "ana" });
  assert.deepEqual((await call("DELETE", "/api/friend-requests/ana", "user:u1")).json(), { relation: "none" });
  await call("POST", "/api/friend-requests", "user:u1", { profileId: "ana" });
  assert.deepEqual((await call("POST", "/api/friend-requests/marko/decline", "user:u3")).json(), { relation: "none" });
  assert.deepEqual((await call("GET", "/api/friends", "user:u3")).json().incoming, []);
});

test("§8 push za zahtjev: samo kad je zahtjev upisan — tiho odbijen (blokada) ne šalje", async () => {
  const store = createMemoryProfileStore();
  await store.setNickname("u1", "Marko", "marko");
  await store.setNickname("u2", "Ana", "ana");
  const sent: { from: string; to: string }[] = [];
  const app = Fastify();
  registerFriendRoutes(app, {
    store,
    requireUser: fakeRequireUser,
    onRequestSent: (from, to) => sent.push({ from: from.nickname, to }),
  });
  const send = (who: string, profileId: string) =>
    app.inject({ method: "POST", url: "/api/friend-requests", headers: { authorization: `Bearer ${who}` }, payload: { profileId } });

  await send("user:u1", "ana");
  assert.deepEqual(sent, [{ from: "Marko", to: "u2" }]);

  await store.setBlock("u2", "u1", false);
  await store.setRequest("u1", "u2", false);
  await store.setBlock("u2", "u1", true);
  await send("user:u1", "ana");
  assert.equal(sent.length, 1, "blokirani ne pravi buku kod blokatora");

  await send("user:u2", "marko");
  assert.equal(sent.length, 1, "blokator ne može slati zahtjev blokiranom (relation blocked)");
});
