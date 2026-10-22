import { test } from "node:test";
import assert from "node:assert/strict";

import { createIdentityAdmin, type IdentityAdmin } from "../google/identityToolkit";
import type { AccessTokenSource } from "../google/serviceAuth";
import { abandonGuest } from "./cleanup";
import { createMemoryProfileStore } from "./store";

function fakeIdentity(): IdentityAdmin & { deleted: string[] } {
  const deleted: string[] = [];
  return {
    deleted,
    async deleteUser(uid) {
      deleted.push(uid);
    },
  };
}

test("T6: napušten gost — rezultati, profil i Firebase nalog nestaju", async () => {
  const store = createMemoryProfileStore();
  await store.recordCompletedMatch("m1", "gost");
  const identity = fakeIdentity();
  await abandonGuest("gost", { store, identity });
  assert.equal(await store.getProfile("gost"), null);
  assert.deepEqual(identity.deleted, ["gost"]);
});

test("T6: bez Firebase admina brišu se samo podaci", async () => {
  const store = createMemoryProfileStore();
  await store.recordCompletedMatch("m1", "gost");
  await abandonGuest("gost", { store, identity: null });
  assert.equal(await store.getProfile("gost"), null);
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
