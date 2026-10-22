import { test } from "node:test";
import assert from "node:assert/strict";

import Fastify from "fastify";
import { checkNickname, NICKNAME_CHANGE_INTERVAL_MS } from "@zandar/shared-types";

import type { AuthUser } from "../auth/idToken";
import { registerProfileRoutes } from "./routes";
import { createMemoryProfileStore, type ProfileStore } from "./store";

/**
 * Lažna prijava: `Bearer user:<uid>` = nalog, `Bearer anon:<uid>` = gost,
 * ostalo = 401. Pravu provjeru tokena pokriva `auth/idToken.test.ts`.
 */
async function fakeRequireUser(
  request: { headers: { authorization?: string | undefined } },
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
): Promise<AuthUser | null> {
  const m = /^Bearer (user|anon):(\w+)(?::(\d+))?$/.exec(request.headers.authorization ?? "");
  if (!m) {
    reply.code(401).send({ code: "invalid" });
    return null;
  }
  return {
    uid: m[2]!,
    anonymous: m[1] === "anon",
    provider: m[1] === "anon" ? "anonymous" : "password",
    emailVerified: false,
    // `user:u1:<ms>` = prijava u tom trenutku (auth_time).
    ...(m[3] ? { authTime: Number(m[3]) } : {}),
  };
}

function setup(store: ProfileStore = createMemoryProfileStore()) {
  let clock = 1_000_000_000;
  const app = Fastify();
  const unbound: string[] = [];
  registerProfileRoutes(app, {
    store,
    requireUser: fakeRequireUser,
    now: () => clock,
    unbindDevices: (uid) => unbound.push(uid),
  });
  const as = (who: string) => ({ authorization: `Bearer ${who}` });
  return {
    app,
    store,
    unbound,
    now: () => clock,
    as,
    advance: (ms: number) => (clock += ms),
    check: async (who: string, n: string) =>
      (await app.inject({ method: "GET", url: `/api/nicknames/check?n=${encodeURIComponent(n)}`, headers: as(who) })),
    setNick: (who: string, nickname: unknown) =>
      app.inject({ method: "PUT", url: "/api/me/nickname", headers: as(who), payload: { nickname } }),
  };
}

test("bez prijave nema ničega", async () => {
  const { app } = setup();
  for (const [method, url] of [["GET", "/api/me"], ["GET", "/api/nicknames/check?n=abc"], ["PUT", "/api/me/nickname"], ["PUT", "/api/me/avatar"]] as const) {
    assert.equal((await app.inject({ method, url })).statusCode, 401, url);
  }
});

test("/api/me: gost bez profila", async () => {
  const { app, as } = setup();
  const res = await app.inject({ method: "GET", url: "/api/me", headers: as("anon:g1") });
  assert.deepEqual(res.json(), {
    uid: "g1",
    anonymous: true,
    completedMatches: 0,
    nickname: null,
    avatar: null,
    nicknameChangeAllowedAt: null,
  });
});

test("provjera: oblik (sa znakom), zabranjena riječ, slobodan, svoj", async () => {
  const { check, setNick } = setup();
  assert.deepEqual((await check("user:u1", "Marko Polo")).json(), {
    status: "invalid",
    problem: "invalid_chars",
    char: " ",
  });
  assert.deepEqual((await check("user:u1", "ab")).json(), { status: "invalid", problem: "too_short" });
  // K6: ni riječ ni razlog.
  assert.deepEqual((await check("user:u1", "Kreten")).json(), { status: "blocked" });
  assert.deepEqual((await check("user:u1", " Marko ")).json(), { status: "free", nickname: "Marko" });
  await setNick("user:u1", "Marko");
  assert.deepEqual((await check("user:u1", "MARKO")).json(), { status: "own", nickname: "MARKO" });
});

test("zauzet: tri slobodna, ispravna prijedloga, nijedan nije zauzet", async () => {
  const { check, setNick } = setup();
  await setNick("user:u1", "Marko");
  const body = (await check("user:u2", "marko")).json() as { status: string; suggestions: string[] };
  assert.equal(body.status, "taken");
  assert.equal(body.suggestions.length, 3);
  for (const s of body.suggestions) {
    assert.equal(checkNickname(s).ok, true, s);
    assert.match(s, /^Marko/i);
    assert.equal(((await check("user:u2", s)).json() as { status: string }).status, "free", s);
  }
});

test("upis: gost ne može, nalog može; brava od prve promjene", async () => {
  const { setNick, advance } = setup();
  assert.equal((await setNick("anon:g1", "Marko")).statusCode, 403);
  assert.equal(((await setNick("anon:g1", "Marko")).json() as { code: string }).code, "account_required");

  const first = await setNick("user:u1", "Marko");
  assert.equal(first.statusCode, 200);
  assert.equal((first.json() as { nickname: string }).nickname, "Marko");
  assert.equal((first.json() as { nicknameChangeAllowedAt: number | null }).nicknameChangeAllowedAt, null);

  advance(1);
  const second = await setNick("user:u1", "Zvonko");
  assert.equal(second.statusCode, 200);
  const lockedUntil = (second.json() as { nicknameChangeAllowedAt: number }).nicknameChangeAllowedAt;
  assert.ok(lockedUntil > 0, "poslije prve promjene profil javlja bravu (P2)");

  const third = await setNick("user:u1", "Petar");
  assert.equal(third.statusCode, 423);
  assert.deepEqual(third.json(), { code: "locked", allowedAt: lockedUntil });

  advance(NICKNAME_CHANGE_INTERVAL_MS);
  assert.equal((await setNick("user:u1", "Petar")).statusCode, 200);
});

test("upis: neispravan, zabranjen i zauzet nadimak", async () => {
  const { setNick } = setup();
  assert.deepEqual((await setNick("user:u1", "a@b")).json(), {
    code: "invalid",
    status: "invalid",
    problem: "invalid_chars",
    char: "@",
  });
  const blocked = await setNick("user:u1", "ustaša");
  assert.equal(blocked.statusCode, 400);
  assert.deepEqual(blocked.json(), { code: "blocked" });
  await setNick("user:u1", "Ana");
  const taken = await setNick("user:u2", "ANA");
  assert.equal(taken.statusCode, 409);
  assert.equal((taken.json() as { code: string }).code, "taken");
});

test("avatar: samo a1–a10, gost ne može", async () => {
  const { app, as } = setup();
  const put = (who: string, avatar: unknown) =>
    app.inject({ method: "PUT", url: "/api/me/avatar", headers: as(who), payload: { avatar } });
  assert.equal((await put("anon:g1", "a1")).statusCode, 403);
  assert.equal((await put("user:u1", "a11")).statusCode, 400);
  const ok = await put("user:u1", "a4");
  assert.equal(ok.statusCode, 200);
  assert.equal((ok.json() as { avatar: string }).avatar, "a4");
});

test("T6 abandon: gost se briše (204), nalog ne može da obriše sebe ovom rutom (403)", async () => {
  const { app, as, store } = setup();
  await store.recordCompletedMatch("m1", "g1");
  const res = await app.inject({ method: "POST", url: "/api/me/abandon", headers: as("anon:g1") });
  assert.equal(res.statusCode, 204);
  assert.equal(await store.getProfile("g1"), null);

  await store.recordCompletedMatch("m1", "u1");
  const acc = await app.inject({ method: "POST", url: "/api/me/abandon", headers: as("user:u1") });
  assert.equal(acc.statusCode, 403);
  assert.deepEqual(await store.getProfile("u1"), { completedMatches: 1 });
});

test("tok c: brisanje naloga traži nalog i prijavu iz zadnjih 5 minuta", async () => {
  const { app, as, store, unbound, setNick, now } = setup();
  await setNick("user:u1", "Marko");
  await store.recordCompletedMatch("m1", "u1");
  const del = (who: string) => app.inject({ method: "DELETE", url: "/api/me", headers: as(who) });

  assert.equal((await del("anon:g1")).statusCode, 403);
  const noAuthTime = await del("user:u1");
  assert.equal(noAuthTime.statusCode, 401);
  assert.equal((noAuthTime.json() as { code: string }).code, "recent_login_required");
  assert.equal((await del(`user:u1:${now() - 6 * 60 * 1000}`)).statusCode, 401, "stara prijava");
  assert.ok(await store.getProfile("u1"), "ništa nije obrisano prije svježe prijave");

  assert.equal((await del(`user:u1:${now() - 60 * 1000}`)).statusCode, 204);
  assert.equal(await store.getProfile("u1"), null);
  assert.deepEqual(unbound, ["u1"]);
  assert.equal(await store.nicknameAvailability("marko", "u2", now()), "taken", "nadimak rezervisan");
});

test("previše provjera u minuti → 429", async () => {
  const { check } = setup();
  for (let i = 0; i < 60; i++) assert.equal((await check("user:u1", `abc${i}`)).statusCode, 200);
  const over = await check("user:u1", "abc");
  assert.equal(over.statusCode, 429);
  assert.equal((await check("user:u2", "abc")).statusCode, 200, "limit je po igraču");
});

test("skladište ne odgovara → 503 store_unavailable, ne 500", async () => {
  const broken: ProfileStore = {
    ...createMemoryProfileStore(),
    getProfile: async () => {
      throw new Error("Firestore get 503");
    },
  };
  const { app, as } = setup(broken);
  const res = await app.inject({ method: "GET", url: "/api/me", headers: as("user:u1") });
  assert.equal(res.statusCode, 503);
  assert.equal((res.json() as { code: string }).code, "store_unavailable");
});
