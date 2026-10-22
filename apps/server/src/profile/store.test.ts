import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createFirestore,
  decodeFields,
  docId,
  encodeFields,
} from "../google/firestore";
import type { AccessTokenSource } from "../google/serviceAuth";
import {
  createFirestoreProfileStore,
  createMemoryProfileStore,
  type ProfileStore,
} from "./store";

// ---------------------------------------------------------------------------
// Ugovor — isti za obje izvedbe; memorija ga drži ovdje, Firestore preko
// lažnog servera ispod.
// ---------------------------------------------------------------------------

async function contract(store: ProfileStore) {
  assert.equal(await store.getProfile("u1"), null);

  assert.equal(await store.recordCompletedMatch("m1", "u1"), true);
  assert.equal(await store.recordCompletedMatch("m1", "u1"), false, "dupla dostava se ne broji");
  assert.equal(await store.recordCompletedMatch("m1-rematch-1", "u1"), true, "revanš je nova partija");
  assert.equal(await store.recordCompletedMatch("m1", "u2"), true, "drugi igrač iste partije");

  assert.deepEqual(await store.getProfile("u1"), { completedMatches: 2 });
  assert.deepEqual(await store.getProfile("u2"), { completedMatches: 1 });
}

test("memorija: partija se broji jednom po igraču, revanš posebno", async () => {
  await contract(createMemoryProfileStore());
});

// ---------------------------------------------------------------------------
// Lažni Firestore: drži dokumente i poštuje `exists:false` i inkrement, pa
// isti ugovor provjerava i oblik zahtjeva koje šaljemo.
// ---------------------------------------------------------------------------

const tokens: AccessTokenSource & { invalidated: number } = {
  invalidated: 0,
  async get() {
    return "at";
  },
  invalidate() {
    this.invalidated++;
  },
};

type Doc = Record<string, unknown>;

function fakeFirestore() {
  const docs = new Map<string, Doc>();
  const prefix = "projects/p/databases/(default)/documents/";
  const bodies: unknown[] = [];

  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith(":commit")) {
      const body = JSON.parse(String(init?.body)) as { writes: Record<string, any>[] };
      bodies.push(body);
      // Atomski: prvo sve provjere, pa tek onda upisi.
      for (const w of body.writes) {
        const name = (w.update?.name ?? w.delete) as string;
        if (w.currentDocument?.exists === false && docs.has(name)) {
          return new Response(JSON.stringify({ error: { code: 409, status: "ALREADY_EXISTS" } }), {
            status: 409,
          });
        }
      }
      for (const w of body.writes) {
        const name = w.update.name as string;
        const prev = (docs.get(name) ?? {}) as Record<string, any>;
        const next: Record<string, any> = w.updateMask ? { ...prev } : {};
        for (const [k, v] of Object.entries(w.update.fields)) next[k] = v;
        for (const t of w.updateTransforms ?? []) {
          const cur = Number(prev[t.fieldPath]?.integerValue ?? 0);
          next[t.fieldPath] = { integerValue: String(cur + Number(t.increment.integerValue)) };
        }
        docs.set(name, next);
      }
      return new Response("{}", { status: 200 });
    }
    const name = decodeURI(url.slice(url.indexOf(prefix)));
    const doc = docs.get(name);
    if (!doc) return new Response("{}", { status: 404 });
    return new Response(JSON.stringify({ name, fields: doc }), { status: 200 });
  }) as typeof fetch;

  return { impl, docs, bodies };
}

test("Firestore: isti ugovor; rezultat sa exists:false i inkrement u jednom commitu", async () => {
  const fake = fakeFirestore();
  const store = createFirestoreProfileStore(createFirestore("p", tokens, fake.impl));
  await contract(store);

  const first = fake.bodies[0] as { writes: Record<string, any>[] };
  assert.equal(first.writes.length, 2, "rezultat i brojač idu zajedno");
  assert.deepEqual(first.writes[0]?.currentDocument, { exists: false });
  assert.match(first.writes[0]?.update.name, /\/results\/m1__u1$/);
  assert.deepEqual(first.writes[1]?.updateMask, { fieldPaths: ["updatedAt"] });
  assert.deepEqual(first.writes[1]?.updateTransforms, [
    { fieldPath: "completedMatches", increment: { integerValue: "1" } },
  ]);
});

test("Firestore: 401 traži svjež token i ponavlja jednom", async () => {
  let n = 0;
  const impl = (async () =>
    ++n === 1 ? new Response("", { status: 401 }) : new Response("{}", { status: 404 })) as typeof fetch;
  const before = tokens.invalidated;
  const db = createFirestore("p", tokens, impl);
  assert.equal(await db.get("profiles/x"), null);
  assert.equal(n, 2);
  assert.equal(tokens.invalidated, before + 1);
});

test("Firestore: druga greška nije tiha — baca, ne vraća false", async () => {
  const impl = (async () => new Response("boom", { status: 500 })) as typeof fetch;
  const store = createFirestoreProfileStore(createFirestore("p", tokens, impl));
  await assert.rejects(store.recordCompletedMatch("m", "u"), /Firestore commit 500/);
});

test("vrijednosti: kodiranje i dekodiranje su simetrični", () => {
  const fields = { s: "č", i: 3, d: 1.5, b: true, n: null, a: [1, "x"], m: { k: 2 } };
  assert.deepEqual(decodeFields(encodeFields(fields)), fields);
  assert.deepEqual(encodeFields({ i: 3 }), { i: { integerValue: "3" } });
});

test("docId: kosa crta i tačke ne prave putanju, dijelovi se ne miješaju", () => {
  assert.equal(docId("a/b", "c"), "a%2Fb__c");
  assert.equal(docId(".."), "%2E%2E");
  assert.notEqual(docId("a_", "_b"), docId("a", "__b"));
});
