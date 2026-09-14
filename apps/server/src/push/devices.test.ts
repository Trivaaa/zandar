import { test } from "node:test";
import assert from "node:assert/strict";

import type { PersistenceAdapter } from "../persistence";
import { createDeviceStore, DEVICE_TTL_MS, type DeviceStore } from "./devices";

function memoryAdapter(initial: unknown[] = []) {
  const saved = new Map<string, unknown>();
  const removed: string[] = [];
  const adapter: PersistenceAdapter = {
    async init() {},
    async loadAll() {
      return initial;
    },
    async save(id, data) {
      saved.set(id, structuredClone(data));
    },
    async remove(id) {
      saved.delete(id);
      removed.push(id);
    },
  };
  return { adapter, saved, removed };
}

function register(store: DeviceStore, input: Parameters<DeviceStore["register"]>[0], now = 1_000): string {
  const res = store.register(input, now);
  if (!res.ok) throw new Error(res.error);
  return res.pushId;
}

function hashOrFail(store: DeviceStore, pushId: string): string {
  const idHash = store.resolve(pushId);
  if (idHash === null) throw new Error("uređaj nije poznat");
  return idHash;
}

test("prva registracija izdaje pushId, a na disk ide samo njegov hash", async () => {
  const { adapter, saved } = memoryAdapter();
  const store = createDeviceStore(adapter);
  const pushId = register(store, { token: "tok-a", tz: "Europe/Sarajevo", guestId: "g-1" });

  assert.match(pushId, /^[0-9a-f]{64}$/);
  const idHash = hashOrFail(store, pushId);
  assert.notEqual(idHash, pushId);

  await new Promise((r) => setImmediate(r));
  assert.ok(saved.has(idHash));
  assert.ok(!JSON.stringify([...saved.values()]).includes(pushId));

  const rec = store.get(idHash);
  assert.equal(rec?.token, "tok-a");
  assert.equal(rec?.tz, "Europe/Sarajevo");
  assert.equal(rec?.guestId, "g-1");
  assert.equal(rec?.prefs.table, true);
});

test("ponovljena registracija osvježava token pod istim pushId", () => {
  const store = createDeviceStore(memoryAdapter().adapter);
  const pushId = register(store, { token: "tok-a", tz: "Europe/Sarajevo" }, 1_000);
  const again = register(store, { token: "tok-b", pushId }, 5_000);

  assert.equal(again, pushId);
  assert.equal(store.size(), 1);
  const rec = store.get(hashOrFail(store, pushId));
  assert.equal(rec?.token, "tok-b");
  assert.equal(rec?.createdAt, 1_000);
  assert.equal(rec?.lastSeenAt, 5_000);
  assert.equal(rec?.tz, "Europe/Sarajevo", "polje koje nije poslato ostaje");
});

test("nepoznat pushId (ispravnog oblika) dobija nov — ne preuzima se tuđi identitet", () => {
  const store = createDeviceStore(memoryAdapter().adapter);
  const invented = "a".repeat(64);
  const pushId = register(store, { token: "tok-a", pushId: invented });
  assert.notEqual(pushId, invented);
  assert.equal(store.resolve(invented), null);
});

test("isti token pod novom registracijom briše stari zapis (telefon izgubio localStorage)", () => {
  const { adapter, removed } = memoryAdapter();
  const store = createDeviceStore(adapter);
  const first = register(store, { token: "tok-a" });
  const firstHash = hashOrFail(store, first);
  const second = register(store, { token: "tok-a" });

  assert.notEqual(second, first);
  assert.equal(store.resolve(first), null);
  assert.equal(store.size(), 1);
  assert.ok(removed.includes(firstHash));
});

test("token koji je prešao na drugi uređaj ne ostaje vezan za stari", () => {
  const store = createDeviceStore(memoryAdapter().adapter);
  const a = register(store, { token: "tok-a" });
  register(store, { token: "tok-b", pushId: a });
  // "tok-a" je sad slobodan; nova registracija sa njim ne smije obrisati uređaj `a`.
  register(store, { token: "tok-a" });
  assert.notEqual(store.resolve(a), null);
  assert.equal(store.size(), 2);
});

test("neispravan token se odbija", () => {
  const store = createDeviceStore(memoryAdapter().adapter);
  for (const token of [undefined, "", 42, { x: 1 }, "x".repeat(4097)]) {
    const res = store.register({ token });
    assert.equal(res.ok, false);
  }
  assert.equal(store.size(), 0);
});

test("pushId pogrešnog oblika ne baca i ne pogađa ništa", () => {
  const store = createDeviceStore(memoryAdapter().adapter);
  for (const pushId of [undefined, null, 7, "abc", "Z".repeat(64), { toString: () => "x" }]) {
    assert.equal(store.resolve(pushId), null);
    assert.equal(store.setPrefs(pushId, { table: false }), false);
  }
});

test("isključena obavještenja preživljavaju sljedeću registraciju", () => {
  const store = createDeviceStore(memoryAdapter().adapter);
  const pushId = register(store, { token: "tok-a" });
  assert.equal(store.setPrefs(pushId, { table: false }), true);

  register(store, { token: "tok-a", pushId });
  assert.equal(store.get(hashOrFail(store, pushId))?.prefs.table, false);

  // Eksplicitna vrijednost iz registracije (lokalna preklopka) ima prednost.
  register(store, { token: "tok-a", pushId, table: true });
  assert.equal(store.get(hashOrFail(store, pushId))?.prefs.table, true);
});

test("sweep briše uređaje koji se nisu javili 60 dana", () => {
  const store = createDeviceStore(memoryAdapter().adapter);
  const old = register(store, { token: "tok-old" }, 0);
  const fresh = register(store, { token: "tok-new" }, DEVICE_TTL_MS);

  assert.equal(store.sweep(DEVICE_TTL_MS + 1), 1);
  assert.equal(store.resolve(old), null);
  assert.notEqual(store.resolve(fresh), null);
});

test("gornja granica broja uređaja važi samo za nove, ne za postojeće", () => {
  const store = createDeviceStore(memoryAdapter().adapter, { maxDevices: 1 });
  const pushId = register(store, { token: "tok-a" });
  assert.equal(store.register({ token: "tok-b" }).ok, false);
  assert.equal(register(store, { token: "tok-c", pushId }), pushId);
});

test("hidracija učitava ispravne zapise, preskače smeće i dopunjava stari oblik", async () => {
  const good = "b".repeat(64);
  const legacy = "c".repeat(64);
  const { adapter } = memoryAdapter([
    { idHash: good, token: "tok-g", platform: "android", createdAt: 1, lastSeenAt: 2, prefs: { table: false } },
    { idHash: legacy, token: "tok-l" }, // bez prefs i vremena
    { idHash: "kratak", token: "x" },
    { idHash: "d".repeat(64) }, // bez tokena
    "smeće",
    null,
  ]);
  const store = createDeviceStore(adapter);
  assert.equal(await store.hydrate(10), 2);
  assert.equal(store.get(good)?.prefs.table, false);
  assert.equal(store.get(legacy)?.prefs.table, true);
  assert.equal(store.get(legacy)?.lastSeenAt, 10);
});

test("hidracija sa dva zapisa istog tokena zadržava svježiji", async () => {
  const older = "e".repeat(64);
  const newer = "f".repeat(64);
  const { adapter, removed } = memoryAdapter([
    { idHash: older, token: "tok", lastSeenAt: 1 },
    { idHash: newer, token: "tok", lastSeenAt: 2 },
  ]);
  const store = createDeviceStore(adapter);
  assert.equal(await store.hydrate(), 1);
  assert.ok(store.get(newer));
  assert.equal(store.get(older), undefined);
  await new Promise((r) => setImmediate(r));
  assert.ok(removed.includes(older));
});
