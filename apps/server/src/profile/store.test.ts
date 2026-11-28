import { test } from "node:test";
import assert from "node:assert/strict";

import { NICKNAME_CHANGE_INTERVAL_MS } from "@zandar/shared-types";

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
  NICKNAME_RESERVATION_MS,
  type ProfileStore,
} from "./store";

// ---------------------------------------------------------------------------
// Ugovor — isti za obje izvedbe; memorija direktno, Firestore preko lažnog
// servera ispod (koji provjerava i oblik zahtjeva).
// ---------------------------------------------------------------------------

async function resultsContract(store: ProfileStore) {
  assert.equal(await store.getProfile("u1"), null);

  assert.equal(await store.recordCompletedMatch("m1", "u1", "zandar"), true);
  assert.equal(await store.recordCompletedMatch("m1", "u1", "zandar"), false, "dupla dostava se ne broji");
  assert.equal(await store.recordCompletedMatch("m1-rematch-1", "u1", "zandar"), true, "revanš je nova partija");
  assert.equal(await store.recordCompletedMatch("m1", "u2", "zandar"), true, "drugi igrač iste partije");
  assert.equal(await store.recordCompletedMatch("r1", "u1", "raub"), true, "druga igra");

  assert.deepEqual(await store.getProfile("u1"), {
    completedMatches: 3,
    completedMatchesByGame: { zandar: 2, raub: 1 },
  });
  assert.deepEqual(await store.getProfile("u2"), { completedMatches: 1, completedMatchesByGame: { zandar: 1 } });
}

const DAY = 24 * 60 * 60 * 1000;

async function nicknameContract(store: ProfileStore) {
  const t0 = 1_000_000_000;

  assert.equal(await store.nicknameAvailability("marko", "u1", t0), "free");
  assert.deepEqual(await store.setNickname("u1", "Marko", "marko", t0), { ok: true });
  assert.equal(await store.nicknameAvailability("marko", "u1", t0), "own");
  assert.equal(await store.nicknameAvailability("marko", "u2", t0), "taken");
  assert.deepEqual(await store.setNickname("u2", "MARKO", "marko", t0), { ok: false, reason: "taken" });

  // Prvi izbor ne pokreće bravu — odmah smije prva promjena.
  assert.deepEqual(await store.setNickname("u1", "Zvonko", "zvonko", t0 + 1), { ok: true });
  // Druga promjena u roku od 30 dana: brava od prve promjene.
  assert.deepEqual(await store.setNickname("u1", "Petar", "petar", t0 + 2), {
    ok: false,
    reason: "locked",
    allowedAt: t0 + 1 + NICKNAME_CHANGE_INTERVAL_MS,
  });
  // Samo velika/mala slova nije promjena nadimka.
  assert.deepEqual(await store.setNickname("u1", "ZVONKO", "zvonko", t0 + 3), { ok: true });

  const p = await store.getProfile("u1");
  assert.equal(p?.nickname, "ZVONKO");
  assert.equal(p?.nicknameKey, "zvonko");
  assert.equal(p?.nicknameChangedAt, t0 + 1);

  // Napušten nadimak: rezervisan 30 dana — drugima zauzet, vlasniku njegov.
  assert.equal(await store.nicknameAvailability("marko", "u2", t0 + 10 * DAY), "taken");
  assert.equal(await store.nicknameAvailability("marko", "u1", t0 + 10 * DAY), "own");
  const after = t0 + 1 + NICKNAME_RESERVATION_MS;
  assert.equal(await store.nicknameAvailability("marko", "u2", after), "free");
  assert.deepEqual(await store.setNickname("u2", "marko", "marko", after), { ok: true });
  assert.equal(await store.nicknameAvailability("marko", "u1", after), "taken");

  await store.setAvatar("u2", "jelen", after);
  const p2 = await store.getProfile("u2");
  assert.equal(p2?.avatar, "jelen");
  assert.equal(p2?.nickname, "marko");
}

async function deleteContract(store: ProfileStore) {
  await store.recordCompletedMatch("m1", "gost", "zandar");
  await store.recordCompletedMatch("m2", "gost", "zandar");
  await store.recordCompletedMatch("m1", "drugi", "zandar");
  await store.deleteUserData("gost");
  assert.equal(await store.getProfile("gost"), null);
  // Rezultati su zaista nestali: ista partija se opet može upisati.
  assert.equal(await store.recordCompletedMatch("m1", "gost", "zandar"), true);
  assert.deepEqual(
    await store.getProfile("drugi"),
    { completedMatches: 1, completedMatchesByGame: { zandar: 1 } },
    "drugi igrač netaknut",
  );
  assert.equal(await store.recordCompletedMatch("m1", "drugi", "zandar"), false);
}

async function deleteAccountContract(store: ProfileStore) {
  const t0 = 5_000_000_000;
  await store.setNickname("u1", "Marko", "marko", t0);
  await store.recordCompletedMatch("m1", "u1", "zandar");
  await store.deleteAccount("u1", t0 + 1);
  assert.equal(await store.getProfile("u1"), null);
  // Nadimak obrisanog naloga: 30 dana zauzet za druge (Q2), pa slobodan.
  assert.equal(await store.nicknameAvailability("marko", "u2", t0 + 2), "taken");
  assert.equal(await store.nicknameAvailability("marko", "u2", t0 + 1 + NICKNAME_RESERVATION_MS), "free");
}

async function blockContract(store: ProfileStore) {
  assert.equal(await store.isBlocked("a", "b"), false);
  await store.setBlock("a", "b", true);
  assert.equal(await store.isBlocked("a", "b"), true);
  assert.equal(await store.isBlocked("b", "a"), false, "zabilješka je jednosmjerna");
  await store.setBlock("c", "a", true);
  await store.deleteAccount("a");
  assert.equal(await store.isBlocked("a", "b"), false, "brisanje naloga briše njegove blokade");
  assert.equal(await store.isBlocked("c", "a"), false, "i blokade prema njemu");
  await store.setBlock("x", "y", true);
  await store.setBlock("x", "y", false);
  assert.equal(await store.isBlocked("x", "y"), false);
}

async function friendsContract(store: ProfileStore) {
  await store.setNickname("u1", "Marko", "marko");
  await store.setNickname("u2", "Marina", "marina");
  await store.setNickname("u3", "Ana", "ana");
  assert.deepEqual(
    (await store.searchNicknames("mar", 10)).map((h) => h.key),
    ["marina", "marko"],
    "prefiks, po abecedi",
  );
  await store.setRequest("u1", "u2", true);
  assert.equal(await store.hasRequest("u1", "u2"), true);
  assert.deepEqual(await store.incomingRequestUids("u2"), ["u1"]);
  assert.deepEqual(await store.outgoingRequestUids("u1"), ["u2"]);
  await store.setFriends("u3", "u1", true);
  assert.equal(await store.areFriends("u1", "u3"), true, "par je neuređen");
  assert.deepEqual((await store.friendUids("u1")).sort(), ["u3"]);
  assert.deepEqual(await store.friendUids("u3"), ["u1"]);
  await store.deleteAccount("u1");
  assert.deepEqual(await store.friendUids("u3"), [], "brisanje naloga briše prijateljstva");
  assert.deepEqual(await store.incomingRequestUids("u2"), [], "i zahtjeve");
  assert.deepEqual((await store.searchNicknames("mar", 10)).map((h) => h.key), ["marina"], "napušten nadimak nije u pretrazi");
}

test("memorija: prijatelji — zahtjevi, parovi, pretraga, brisanje naloga", async () => {
  await friendsContract(createMemoryProfileStore());
});

test("Firestore: prijatelji — isti ugovor", async () => {
  const fake = fakeFirestore();
  await friendsContract(createFirestoreProfileStore(createFirestore("p", tokens, fake.impl)));
});

test("memorija: blokade — jednosmjerne, odblokiranje, nestaju sa nalogom", async () => {
  await blockContract(createMemoryProfileStore());
});

test("Firestore: blokade — isti ugovor; prijava je novi dokument", async () => {
  const fake = fakeFirestore();
  const store = createFirestoreProfileStore(createFirestore("p", tokens, fake.impl));
  await blockContract(store);
  await store.addReport({ reporterUid: "r", reportedUid: "t", nickname: "Marko", reason: "nickname", at: 1 });
  const reports = [...fake.docs.keys()].filter((k) => k.includes("/reports/"));
  assert.equal(reports.length, 1);
});

test("memorija: brisanje naloga — podaci nestaju, nadimak rezervisan 30 dana", async () => {
  await deleteAccountContract(createMemoryProfileStore());
});

test("Firestore: brisanje naloga — isti ugovor", async () => {
  const fake = fakeFirestore();
  await deleteAccountContract(createFirestoreProfileStore(createFirestore("p", tokens, fake.impl)));
});

test("memorija: brisanje igrača — profil i svi rezultati, drugi netaknuti", async () => {
  await deleteContract(createMemoryProfileStore());
});

test("Firestore: brisanje igrača — isti ugovor (runQuery + delete)", async () => {
  const fake = fakeFirestore();
  await deleteContract(createFirestoreProfileStore(createFirestore("p", tokens, fake.impl)));
});

test("memorija: partija se broji jednom po igraču, revanš posebno", async () => {
  await resultsContract(createMemoryProfileStore());
});

test("memorija: nadimak — jedinstven, brava od prve promjene, rezervacija 30 dana", async () => {
  await nicknameContract(createMemoryProfileStore());
});

// ---------------------------------------------------------------------------
// Lažni Firestore: drži dokumente sa `updateTime`, poštuje preduslove
// (`exists`, `updateTime`), masku i inkrement, atomski po commitu.
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

type StoredDoc = { fields: Record<string, any>; updateTime: string };

function fakeFirestore() {
  const docs = new Map<string, StoredDoc>();
  const prefix = "projects/p/databases/(default)/documents/";
  const bodies: unknown[] = [];
  let clock = 0;

  const conflict = (status: string) =>
    new Response(JSON.stringify({ error: { status } }), { status: status === "ALREADY_EXISTS" ? 409 : 400 });

  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith(":commit")) {
      const body = JSON.parse(String(init?.body)) as { writes: Record<string, any>[] };
      bodies.push(body);
      for (const w of body.writes) {
        const name = (w.update?.name ?? w.delete) as string;
        const cur = docs.get(name);
        const pre = w.currentDocument;
        if (pre?.exists === false && cur) return conflict("ALREADY_EXISTS");
        if (pre?.exists === true && !cur) return conflict("FAILED_PRECONDITION");
        if (pre?.updateTime !== undefined && cur?.updateTime !== pre.updateTime) {
          return conflict("FAILED_PRECONDITION");
        }
      }
      for (const w of body.writes) {
        if (w.delete) {
          docs.delete(w.delete);
          continue;
        }
        const name = w.update.name as string;
        const prev = docs.get(name)?.fields ?? {};
        const next: Record<string, any> = w.updateMask ? { ...prev } : {};
        for (const [k, v] of Object.entries(w.update.fields)) next[k] = v;
        for (const t of w.updateTransforms ?? []) {
          // Kao pravi Firestore: `a.b` je polje `b` u mapi `a`.
          const [head, sub] = (t.fieldPath as string).split(".");
          if (sub === undefined) {
            const n = Number(prev[head!]?.integerValue ?? 0);
            next[head!] = { integerValue: String(n + Number(t.increment.integerValue)) };
          } else {
            const map = { ...(next[head!]?.mapValue?.fields ?? {}) };
            const n = Number(map[sub]?.integerValue ?? 0);
            map[sub] = { integerValue: String(n + Number(t.increment.integerValue)) };
            next[head!] = { mapValue: { fields: map } };
          }
        }
        docs.set(name, { fields: next, updateTime: `t${++clock}` });
      }
      return new Response("{}", { status: 200 });
    }
    if (url.endsWith(":runQuery")) {
      const q = JSON.parse(String(init?.body)).structuredQuery;
      const coll = q.from[0].collectionId;
      const filters: { field: { fieldPath: string }; op: string; value: { stringValue: string } }[] =
        q.where.fieldFilter ? [q.where.fieldFilter] : q.where.compositeFilter.filters.map((f: any) => f.fieldFilter);
      const ok = (v: string | undefined, f: (typeof filters)[number]) =>
        v !== undefined &&
        (f.op === "EQUAL" ? v === f.value.stringValue
          : f.op === "GREATER_THAN_OR_EQUAL" ? v >= f.value.stringValue
          : v < f.value.stringValue);
      const rows = [...docs.entries()]
        .filter(([name, d]) => name.startsWith(prefix + coll + "/") && filters.every((f) => ok(d.fields[f.field.fieldPath]?.stringValue, f)))
        .sort(([, a], [, b]) => {
          const k = q.orderBy?.[0]?.field.fieldPath;
          return k ? String(a.fields[k]?.stringValue).localeCompare(String(b.fields[k]?.stringValue)) : 0;
        })
        .slice(0, q.limit)
        .map(([name, d]) => ({ document: { name, fields: d.fields } }));
      return new Response(JSON.stringify(rows.length ? rows : [{ readTime: "t" }]), { status: 200 });
    }
    // Kao pravi Firestore: svaki segment URL-a se dekodira jednom.
    const name = url.slice(url.indexOf(prefix)).split("/").map(decodeURIComponent).join("/");
    const doc = docs.get(name);
    if (!doc) return new Response("{}", { status: 404 });
    return new Response(JSON.stringify({ name, ...doc }), { status: 200 });
  }) as typeof fetch;

  return { impl, docs, bodies };
}

test("Firestore: isti ugovor; rezultat sa exists:false i inkrement u jednom commitu", async () => {
  const fake = fakeFirestore();
  const store = createFirestoreProfileStore(createFirestore("p", tokens, fake.impl));
  await resultsContract(store);

  const first = fake.bodies[0] as { writes: Record<string, any>[] };
  assert.equal(first.writes.length, 2, "rezultat i brojač idu zajedno");
  assert.deepEqual(first.writes[0]?.currentDocument, { exists: false });
  assert.match(first.writes[0]?.update.name, /\/results\/m1__u1$/);
  assert.deepEqual(first.writes[1]?.updateMask, { fieldPaths: ["updatedAt"] });
  assert.deepEqual(first.writes[1]?.updateTransforms, [
    { fieldPath: "completedMatches", increment: { integerValue: "1" } },
    { fieldPath: "completedMatchesByGame.zandar", increment: { integerValue: "1" } },
  ]);
  assert.equal(first.writes[0]?.update.fields.game?.stringValue, "zandar", "rezultat pamti igru");
});

test("Firestore: nadimak sa _ . č se čita iz istog dokumenta u koji je upisan", async () => {
  const fake = fakeFirestore();
  const store = createFirestoreProfileStore(createFirestore("p", tokens, fake.impl));
  for (const [uid, nick] of [["u1", "Goran_B"], ["u2", "a.b.c"], ["u3", "Čiča"]] as const) {
    const key = nick.toLowerCase();
    assert.equal((await store.setNickname(uid, nick, key)).ok, true);
    assert.equal(await store.uidForNickname(key), uid, nick);
    assert.equal(await store.nicknameAvailability(key, "drugi"), "taken", nick);
    assert.equal(await store.nicknameAvailability(key, uid), "own", nick);
  }
});

test("Firestore: isti ugovor za nadimak i avatar", async () => {
  const fake = fakeFirestore();
  await nicknameContract(createFirestoreProfileStore(createFirestore("p", tokens, fake.impl)));
});

test("Firestore: nadimak koji je neko uzeo između čitanja i upisa → zauzet, ne dva vlasnika", async () => {
  const fake = fakeFirestore();
  const db = createFirestore("p", tokens, fake.impl);
  const store = createFirestoreProfileStore(db);
  // Svaki commit za u1 prethodi tuđi upis istog ključa — preduslov uvijek pada.
  const realCommit = db.commit;
  db.commit = async (writes) => {
    await realCommit([{ kind: "set", path: `nicknames/${docId("ana")}`, fields: { uid: "uX", nickname: "Ana" } }]);
    return realCommit(writes);
  };
  assert.deepEqual(await store.setNickname("u1", "Ana", "ana"), { ok: false, reason: "taken" });
  db.commit = realCommit;
  assert.equal(await store.nicknameAvailability("ana", "u1"), "taken");
  assert.equal((await store.getProfile("u1"))?.nickname, undefined);
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
  await assert.rejects(store.recordCompletedMatch("m", "u", "zandar"), /Firestore commit 500/);
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

test("stari profil bez brojača po igri: čita se kao prazan, ukupno ostaje", async () => {
  const fake = fakeFirestore();
  const store = createFirestoreProfileStore(createFirestore("p", tokens, fake.impl));
  await store.recordCompletedMatch("m1", "u1", "poker");
  // Dokument kakav je bio prije 22.11.2026: samo ukupan broj.
  for (const [name, doc] of fake.docs) {
    if (name.endsWith("/profiles/u1")) {
      const { completedMatchesByGame: _drop, ...rest } = doc.fields;
      fake.docs.set(name, { ...doc, fields: { ...rest, completedMatches: { integerValue: "7" } } });
    }
  }
  assert.deepEqual(await store.getProfile("u1"), { completedMatches: 7 });
  await store.recordCompletedMatch("m2", "u1", "bela");
  assert.deepEqual(await store.getProfile("u1"), { completedMatches: 8, completedMatchesByGame: { bela: 1 } });
});

// ---------------------------------------------------------------------------
// Statistika po igri (SPEC_STATISTIKA F0) — isti ugovor za obje izvedbe
// ---------------------------------------------------------------------------

const RESULT = { place: 1, players: 3, mode: "quick_play" as const, opponents: ["bot:2", "bot:2"], hands: 8 };

async function statsContract(store: ProfileStore) {
  // Stari profil: partija prije F0 (samo brojač).
  await store.recordCompletedMatch("old", "u1", "raub", 500);

  assert.equal(await store.recordMatchResult("m1", "u1", "raub", { ...RESULT, outcome: "win" }, 1000), true);
  assert.equal(await store.recordMatchResult("m1", "u1", "raub", { ...RESULT, outcome: "win" }, 1001), false, "dupla dostava");
  await store.recordMatchResult("m2", "u1", "raub", { ...RESULT, outcome: "win" }, 2000);
  await store.recordMatchResult("m3", "u1", "raub", { ...RESULT, place: 2, outcome: "loss" }, 3000);
  await store.recordMatchResult("m4", "u1", "raub", { ...RESULT, outcome: "win" }, 4000);
  await store.recordMatchResult("m5", "u1", "raub", { ...RESULT, place: null, outcome: "abandon", left: true }, 5000);
  await store.recordMatchResult("b1", "u1", "bela", { ...RESULT, players: 4, outcome: "loss" }, 6000);

  const p = await store.getProfile("u1");
  assert.equal(p?.completedMatches, 6, "1 stara + 5 sa ishodom win/loss; napuštanje se ne broji");
  assert.deepEqual(p?.completedMatchesByGame, { raub: 5, bela: 1 });
  assert.deepEqual(p?.stats, {
    v: 1,
    since: 1000,
    byGame: {
      raub: { won: 3, lost: 1, abandoned: 1, streak: 0, bestStreak: 2, lastAt: 5000 },
      bela: { won: 0, lost: 1, abandoned: 0, streak: 0, bestStreak: 0, lastAt: 6000 },
    },
  });

  await store.deleteUserData("u1");
  assert.equal(await store.getProfile("u1"), null, "brisanje nosi i statistiku");
  assert.equal(await store.recordMatchResult("m1", "u1", "raub", { ...RESULT, outcome: "win" }, 7000), true, "i zapise u results/");
}

test("memorija: statistika po igri — ishodi, niz, dupla dostava, stari profil", async () => {
  await statsContract(createMemoryProfileStore());
});

test("Firestore: statistika — isti ugovor; zapis nosi ishod i protivnike", async () => {
  const fake = fakeFirestore();
  const store = createFirestoreProfileStore(createFirestore("p", tokens, fake.impl));
  await statsContract(store);
  const doc = [...fake.docs.entries()].find(([name]) => name.endsWith(`/results/${docId("m1", "u1")}`))?.[1];
  const fields = decodeFields(doc?.fields) as Record<string, unknown>;
  assert.equal(fields.outcome, "win");
  assert.deepEqual(fields.opponents, ["bot:2", "bot:2"]);
  assert.equal(fields.game, "raub");
});

test("Firestore: profil se mijenjao između čitanja i upisa → novi pokušaj, ništa se ne gubi", async () => {
  const fake = fakeFirestore();
  const db = createFirestore("p", tokens, fake.impl);
  const store = createFirestoreProfileStore(db);
  await store.setAvatar("u1", "jez");
  const realCommit = db.commit;
  let raced = false;
  db.commit = async (writes) => {
    if (!raced) {
      raced = true;
      await store.setAvatar("u1", "lisica"); // tuđi upis pomjeri updateTime
    }
    return realCommit(writes);
  };
  assert.equal(await store.recordMatchResult("m1", "u1", "poker", { ...RESULT, outcome: "win" }, 1000), true);
  db.commit = realCommit;
  const p = await store.getProfile("u1");
  assert.equal(p?.avatar, "lisica");
  assert.equal(p?.stats?.byGame.poker?.won, 1);
  assert.equal(p?.completedMatches, 1);
});

test("Firestore: stalni konflikt → baca (pozivalac loguje), ne vraća lažno true", async () => {
  const fake = fakeFirestore();
  const db = createFirestore("p", tokens, fake.impl);
  const store = createFirestoreProfileStore(db);
  await store.setAvatar("u1", "jez");
  const realCommit = db.commit;
  db.commit = async (writes) => {
    if (writes.some((w) => w.path.startsWith("results/"))) await store.setAvatar("u1", "jez");
    return realCommit(writes);
  };
  await assert.rejects(store.recordMatchResult("m1", "u1", "poker", { ...RESULT, outcome: "win" }, 1000), /mijenjao/);
});

test("stari profil bez stats: čita se bez statistike; neispravan stats se tiho preskače", async () => {
  const fake = fakeFirestore();
  const store = createFirestoreProfileStore(createFirestore("p", tokens, fake.impl));
  await store.recordCompletedMatch("m1", "u1", "zandar");
  assert.equal((await store.getProfile("u1"))?.stats, undefined);
  for (const [name, doc] of fake.docs) {
    if (name.endsWith("/profiles/u1")) {
      fake.docs.set(name, { ...doc, fields: { ...doc.fields, ...encodeFields({ stats: { byGame: { raub: { won: "x", lost: 2 }, kviz: { won: 9 } } } }) } });
    }
  }
  assert.deepEqual((await store.getProfile("u1"))?.stats, {
    v: 1,
    since: null,
    byGame: { raub: { won: 0, lost: 2, abandoned: 0, streak: 0, bestStreak: 0, lastAt: 0 } },
  });
});
