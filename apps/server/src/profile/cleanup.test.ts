import { test } from "node:test";
import assert from "node:assert/strict";

import { createIdentityAdmin, type AuthUserRecord, type IdentityAdmin } from "../google/identityToolkit";
import type { AccessTokenSource } from "../google/serviceAuth";
import { abandonGuest, INCOMPLETE_ACCOUNT_MAX_AGE_MS, sweepIncompleteAccounts } from "./cleanup";
import { createMemoryProfileStore } from "./store";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 100 * DAY;

function fakeIdentity(pages: AuthUserRecord[][]): IdentityAdmin & { deleted: string[] } {
  const deleted: string[] = [];
  return {
    deleted,
    async deleteUser(uid) {
      deleted.push(uid);
    },
    async listUsers(pageToken) {
      const i = pageToken ? Number(pageToken) : 0;
      return { users: pages[i] ?? [], nextPageToken: i + 1 < pages.length ? String(i + 1) : null };
    },
  };
}

test("T6: napušten gost — rezultati, profil i Firebase nalog nestaju", async () => {
  const store = createMemoryProfileStore();
  await store.recordCompletedMatch("m1", "gost");
  const identity = fakeIdentity([]);
  await abandonGuest("gost", { store, identity });
  assert.equal(await store.getProfile("gost"), null);
  assert.deepEqual(identity.deleted, ["gost"]);
});

test("Q10: briše se samo nalog sa provajderom, bez nadimka, stariji od 30 dana", async () => {
  const store = createMemoryProfileStore();
  await store.setNickname("sa-nadimkom", "Marko", "marko", 0);
  await store.recordCompletedMatch("m1", "nedovrsen");
  const old = NOW - INCOMPLETE_ACCOUNT_MAX_AGE_MS - DAY;
  const identity = fakeIdentity([
    [
      { uid: "nedovrsen", createdAt: old, providers: ["password"] },
      { uid: "sa-nadimkom", createdAt: old, providers: ["google.com"] },
      { uid: "mlad", createdAt: NOW - DAY, providers: ["password"] },
    ],
    [
      { uid: "stari-gost", createdAt: old, providers: [] },
      { uid: "nedovrsen-2", createdAt: old, providers: ["google.com"] },
    ],
  ]);
  assert.equal(await sweepIncompleteAccounts({ store, identity }, NOW), 2);
  assert.deepEqual(identity.deleted, ["nedovrsen", "nedovrsen-2"]);
  assert.equal(await store.getProfile("nedovrsen"), null, "i podaci, ne samo Firebase nalog");
  assert.equal((await store.getProfile("sa-nadimkom"))?.nickname, "Marko");
});

test("Q10: bez Firebase admina ne radi ništa", async () => {
  assert.equal(await sweepIncompleteAccounts({ store: createMemoryProfileStore(), identity: null }, NOW), 0);
});

const tokens: AccessTokenSource = { get: async () => "at", invalidate: () => {} };

test("Identity Toolkit: već obrisan korisnik nije greška, druga greška jeste", async () => {
  let status = 400;
  let body = JSON.stringify({ error: { message: "USER_NOT_FOUND" } });
  const impl = (async () => new Response(body, { status })) as typeof fetch;
  const admin = createIdentityAdmin("p", tokens, impl);
  await admin.deleteUser("x");
  status = 500;
  body = "boom";
  await assert.rejects(admin.deleteUser("x"), /delete 500/);
});

test("Identity Toolkit: lista — uid, createdAt u ms, provajderi; prazan token = kraj", async () => {
  const impl = (async (url: string) => {
    assert.match(String(url), /accounts:batchGet\?maxResults=500/);
    return new Response(
      JSON.stringify({
        users: [
          { localId: "a", createdAt: "1700000000000", providerUserInfo: [{ providerId: "password" }] },
          { localId: "b", createdAt: "1700000000001" },
        ],
      }),
      { status: 200 },
    );
  }) as unknown as typeof fetch;
  const page = await createIdentityAdmin("p", tokens, impl).listUsers(null);
  assert.deepEqual(page, {
    users: [
      { uid: "a", createdAt: 1700000000000, providers: ["password"] },
      { uid: "b", createdAt: 1700000000001, providers: [] },
    ],
    nextPageToken: null,
  });
});
