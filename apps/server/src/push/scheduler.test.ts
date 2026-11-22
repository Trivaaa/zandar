import { test } from "node:test";
import assert from "node:assert/strict";

import type { PersistenceAdapter } from "../persistence";
import type { Capture } from "../analytics";
import { applyPlay, createDeviceStore } from "./devices";
import { playRecordsFromCaptures } from "./playRecords";
import { DEFAULT_REMINDER_CONFIG, type ReminderConfig } from "./reminders";
import { reminderConfigFromEnv, runReminderTick, type SchedulerDeps } from "./scheduler";
import type { PushMessage } from "./messages";

const DAY = 60_000;
const CFG: ReminderConfig = { ...DEFAULT_REMINDER_CONFIG, dayMs: DAY, minInactiveMs: DAY / 2, minGapMs: DAY / 2 };

function memoryAdapter(initial: unknown[] = []): PersistenceAdapter {
  return {
    async init() {},
    async loadAll() {
      return initial;
    },
    async save() {},
    async remove() {},
  };
}

function setup(opts: { caps?: string[]; random?: number; enabled?: boolean; result?: string } = {}) {
  const store = createDeviceStore(memoryAdapter());
  const reg = store.register({ token: "tok-1", guestId: "g-1", caps: opts.caps ?? ["reminders"] }, 0);
  if (!reg.ok) throw new Error(reg.error);
  const idHash = store.resolve(reg.pushId)!;
  const sent: PushMessage[] = [];
  const events: { event: string; props: Record<string, unknown> }[] = [];
  const deps: SchedulerDeps = {
    store,
    fcm: {
      enabled: true,
      send: async (_token, msg) => {
        sent.push(msg);
        return (opts.result ?? "sent") as "sent";
      },
    },
    track: (_id, event, props) => events.push({ event, props: props as Record<string, unknown> }),
    sendingEnabled: opts.enabled ?? true,
    config: CFG,
    random: () => opts.random ?? 0.9,
  };
  return { store, idHash, sent, events, deps };
}

const flush = () => new Promise((r) => setImmediate(r));

test("grupa treatment sa novim paketom dobija d1 jednom, i stanje preživljava sljedeći krug", async () => {
  const { store, idHash, sent, events, deps } = setup();
  assert.deepEqual(runReminderTick(deps, DAY + 1), { sent: 1, withheld: 0 });
  await flush();
  assert.equal(sent[0]?.data.step, "d1");
  assert.equal(sent[0]?.data.reason, "first_match");
  assert.equal(store.get(idHash)?.reminderArm, "treatment");
  assert.deepEqual(events.map((e) => e.event), ["push_sent"]);
  assert.deepEqual(runReminderTick(deps, DAY + 2), { sent: 0, withheld: 0 });
});

test("kontrolna grupa ide istim ritmom, ali samo bilježi", async () => {
  const { store, idHash, sent, events, deps } = setup({ random: 0.1 });
  runReminderTick(deps, DAY + 1);
  await flush();
  assert.equal(sent.length, 0);
  assert.equal(store.get(idHash)?.reminderArm, "holdout");
  assert.deepEqual(events[0], {
    event: "reminder_would_send",
    props: { step: "d1", reason: "first_match", arm: "holdout", capable: true, enabled: true },
  });
  assert.deepEqual(store.get(idHash)?.reminders?.sentSteps, ["d1"]);
});

test("stari paket (bez kanala) ne dobija poruku i ne ulazi u poređenje", async () => {
  const { store, idHash, sent, events, deps } = setup({ caps: [] });
  runReminderTick(deps, DAY + 1);
  await flush();
  assert.equal(sent.length, 0);
  assert.equal(store.get(idHash)?.reminderArm, undefined);
  assert.equal(events[0]?.props.capable, false);
  assert.equal(events[0]?.props.arm, "none");
});

test("bez PUSH_REMINDERS se ništa ne šalje", async () => {
  const { sent, events, deps } = setup({ enabled: false });
  runReminderTick(deps, DAY + 1);
  await flush();
  assert.equal(sent.length, 0);
  assert.equal(events[0]?.props.enabled, false);
});

test("UNREGISTERED briše uređaj", async () => {
  const { store, idHash, deps } = setup({ result: "unregistered" });
  runReminderTick(deps, DAY + 1);
  await flush();
  assert.equal(store.get(idHash), undefined);
});

test("stari snapshot uređaja: podsjetnici uključeni, statistika i niz prazni", async () => {
  const store = createDeviceStore(
    memoryAdapter([
      { idHash: "c".repeat(64), token: "t", platform: "android", createdAt: 1, lastSeenAt: 2, prefs: { table: false } },
    ]),
  );
  await store.hydrate(10);
  const rec = store.get("c".repeat(64));
  assert.deepEqual(rec?.prefs, { table: false, reminders: true });
  assert.equal(rec?.play, undefined);
  assert.equal(rec?.caps, undefined);
});

test("ponovna registracija čuva statistiku i grupu; preklopka podsjetnika se mijenja", () => {
  const store = createDeviceStore(memoryAdapter());
  const reg = store.register({ token: "t", caps: ["reminders", "nepoznato"] }, 0);
  if (!reg.ok) throw new Error(reg.error);
  const idHash = store.resolve(reg.pushId)!;
  assert.deepEqual(store.get(idHash)?.caps, ["reminders"]);
  store.recordPlay(idHash, { game: "poker", result: "won", completed: true, endedAt: 5 });
  store.updateReminders(idHash, { arm: "holdout" });
  store.register({ token: "t2", pushId: reg.pushId }, 10);
  assert.equal(store.get(idHash)?.play?.lastGame, "poker");
  assert.equal(store.get(idHash)?.reminderArm, "holdout");
  assert.ok(store.setPrefs(reg.pushId, { reminders: false }));
  assert.equal(store.get(idHash)?.prefs.reminders, false);
  assert.equal(store.get(idHash)?.prefs.table, true);
});

test("statistika partije: napuštena se ne broji kao završena, sat po zoni uređaja", () => {
  const start = Date.UTC(2026, 10, 20, 20, 10); // 21:10 u Sarajevu
  const a = applyPlay(undefined, { game: "raub", result: "lost", completed: true, startedAt: start, endedAt: start + 1 }, "Europe/Sarajevo");
  assert.equal(a.matchesFinished, 1);
  assert.equal(a.hourCounts[21], 1);
  const b = applyPlay(a, { game: "bela", result: "other", completed: false, endedAt: start + 2 }, "Europe/Sarajevo");
  assert.equal(b.matchesFinished, 1);
  assert.equal(b.lastGame, "bela");
  assert.deepEqual(b.games, ["raub", "bela"]);
});

test("kraj meča → uređaj sjedišta; bot i igrač bez uređaja se preskaču", () => {
  const capture = (distinctId: string, is_winner?: boolean): Capture<"match_ended"> => ({
    distinctId,
    event: "match_ended",
    properties: {
      mode: "quick_play",
      match_id: "m",
      end_reason: "completed",
      hands_played: 3,
      ...(is_winner === undefined ? {} : { is_winner }),
    },
  });
  const records = playRecordsFromCaptures(
    {
      players: [
        { id: "p1", guestId: "g1" },
        { id: "p2", guestId: "g2" },
        { id: "bot" },
      ],
      pushIds: { p1: "h1" },
    },
    [capture("g1", false), capture("g2", true)],
    "zandar",
    { endedAt: 9 },
  );
  assert.deepEqual(records, [
    { idHash: "h1", input: { game: "zandar", result: "lost", completed: true, startedAt: undefined, endedAt: 9 } },
  ]);
});

test("ubrzan dan važi samo van produkcije", () => {
  assert.equal(reminderConfigFromEnv({ PUSH_REMINDER_DAY_MS: "60000" }).dayMs, 60000);
  assert.equal(reminderConfigFromEnv({ PUSH_REMINDER_DAY_MS: "60000", APP_ENV: "production" }).dayMs, null);
  assert.equal(reminderConfigFromEnv({}).dayMs, null);
});
