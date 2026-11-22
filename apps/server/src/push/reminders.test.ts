import { test } from "node:test";
import assert from "node:assert/strict";

import type { DeviceRecord, PlayStats } from "./devices";
import { buildFcmPayload } from "./fcm";
import { localParts } from "./localTime";
import {
  assignArm,
  buildReminderPush,
  decideReminder,
  DEFAULT_REMINDER_CONFIG,
  groupByPlayer,
  holdoutShare,
  mergePlay,
  personalHour,
  pickReason,
  type ReminderConfig,
} from "./reminders";

/** Lokalno vrijeme u Sarajevu u novembru (UTC+1) → ms. */
function sa(day: number, hour: number, minute = 0): number {
  return Date.UTC(2026, 10, day, hour - 1, minute);
}

const HOURS = (h: number, n = 1) => Array.from({ length: 24 }, (_, i) => (i === h ? n : 0));

function play(over: Partial<PlayStats> = {}): PlayStats {
  return {
    matchesFinished: 3,
    lastMatchEndedAt: sa(20, 21),
    lastGame: "raub",
    lastResult: "lost",
    games: ["raub"],
    hourCounts: HOURS(21, 3),
    ...over,
  };
}

function device(over: Partial<DeviceRecord> = {}): DeviceRecord {
  return {
    idHash: "a".repeat(64),
    token: "tok",
    platform: "android",
    tz: "Europe/Sarajevo",
    guestId: "g-1",
    createdAt: sa(1, 12),
    lastSeenAt: sa(20, 21, 30),
    prefs: { table: true, reminders: true },
    caps: ["reminders"],
    play: play(),
    ...over,
  };
}

const one = (d: DeviceRecord) => ({ key: "k", devices: [d] });

test("lokalni dan i sat po zoni uređaja; pokvarena zona pada na Sarajevo", () => {
  assert.deepEqual(localParts(sa(21, 0, 30), "Europe/Sarajevo").hour, 0);
  assert.equal(localParts(sa(21, 0, 30), "Europe/Sarajevo").day - localParts(sa(20, 23), "Europe/Sarajevo").day, 1);
  assert.equal(localParts(sa(21, 10), "Nije/Zona").hour, 10);
});

test("lični sat: najčešći sat početka, u granicama 10–22; bez istorije 20", () => {
  const cfg = DEFAULT_REMINDER_CONFIG;
  assert.equal(personalHour(play({ hourCounts: HOURS(21) }), cfg), 21);
  assert.equal(personalHour(play({ hourCounts: HOURS(23) }), cfg), 22);
  assert.equal(personalHour(play({ hourCounts: HOURS(7) }), cfg), 10);
  assert.equal(personalHour(undefined, cfg), 20);
});

test("d1 stiže sutradan u lični sat, ne prije", () => {
  const d = device();
  assert.equal(decideReminder(one(d), sa(21, 20, 45)), null, "prije ličnog sata (21 h)");
  const due = decideReminder(one(d), sa(21, 21, 0));
  assert.equal(due?.step, "d1");
  assert.equal(due?.reason, "rematch");
  assert.equal(due?.game, "raub");
});

test("tiho vrijeme i premalo neaktivnosti blokiraju", () => {
  // Igrao do 23:50, sutra u 10 h je prošlo tek ~10 h.
  const late = device({ lastSeenAt: sa(20, 23, 50), play: play({ hourCounts: HOURS(10) }) });
  assert.equal(decideReminder(one(late), sa(21, 10, 0)), null);
  // Lični sat 22 → 23 h je već tiho.
  const night = device({ play: play({ hourCounts: HOURS(22) }) });
  assert.equal(decideReminder(one(night), sa(21, 23, 15)), null);
  assert.equal(decideReminder(one(night), sa(21, 22, 15))?.step, "d1");
});

test("igrač bez završene partije dobija samo d1 (first_match)", () => {
  const d = device({ play: undefined });
  assert.equal(decideReminder(one(d), sa(21, 20, 0))?.reason, "first_match");
  const after = device({
    play: undefined,
    reminders: { streakStartedAt: d.lastSeenAt, sentSteps: ["d1"], lastSentAt: sa(21, 20) },
  });
  assert.equal(decideReminder(one(after), sa(23, 20, 0)), null, "d3 traži završenu partiju");
});

test("korak koji je već poslat se ne ponavlja; d3 i d7 dolaze na svoj dan", () => {
  const sent = { streakStartedAt: sa(20, 21, 30), sentSteps: ["d1" as const], lastSentAt: sa(21, 21) };
  const d = device({ reminders: sent });
  assert.equal(decideReminder(one(d), sa(22, 21, 0)), null, "2. dan: d1 poslat, d3 nije na redu");
  assert.equal(decideReminder(one(d), sa(23, 21, 0))?.step, "d3");
  const d7 = device({
    reminders: { ...sent, sentSteps: ["d1", "d3"], lastSentAt: sa(23, 21) },
  });
  const last = decideReminder(one(d7), sa(27, 21, 0));
  assert.equal(last?.step, "d7");
  assert.equal(last?.reason, "last_call");
  assert.deepEqual(last?.next.sentSteps, ["d1", "d3", "d7"]);
});

test("stari neaktivni igrači ne dobijaju ništa na prvom deployu (rok koraka)", () => {
  const old = device({ lastSeenAt: sa(1, 20) });
  assert.equal(decideReminder(one(old), sa(20, 21, 0)), null);
});

test("povratak igrača briše niz; novi niz kreće od početka", () => {
  const d = device({
    lastSeenAt: sa(24, 21, 30),
    reminders: { streakStartedAt: sa(20, 21, 30), sentSteps: ["d1", "d3"], lastSentAt: sa(23, 21) },
  });
  const due = decideReminder(one(d), sa(25, 21, 0));
  assert.equal(due?.step, "d1");
  assert.deepEqual(due?.next.sentSteps, ["d1"]);
});

test("najviše jedan podsjetnik u 20 h", () => {
  const d = device({
    lastSeenAt: sa(20, 9),
    reminders: { streakStartedAt: 0, sentSteps: [], lastSentAt: sa(21, 7) },
    play: play({ hourCounts: HOURS(10) }),
  });
  assert.equal(decideReminder(one(d), sa(21, 10, 0)), null);
});

test("igrač sa dva uređaja: aktivnost na jednom gasi podsjetnik na drugom", () => {
  const phone = device({ idHash: "a".repeat(64), uid: "u1", lastSeenAt: sa(18, 21) });
  const tablet = device({ idHash: "b".repeat(64), uid: "u1", lastSeenAt: sa(21, 19) });
  const groups = groupByPlayer([phone, tablet]);
  assert.equal(groups.length, 1);
  assert.equal(decideReminder(groups[0]!, sa(21, 21, 0)), null);
});

test("preklopka: podsjetnik ide na uređaj na kojem su uključeni, inače nikud", () => {
  const off = device({ idHash: "a".repeat(64), uid: "u1", prefs: { table: true, reminders: false } });
  const on = device({ idHash: "b".repeat(64), uid: "u1", lastSeenAt: sa(20, 10) });
  const group = groupByPlayer([off, on])[0]!;
  assert.equal(decideReminder(group, sa(21, 21, 0))?.target.idHash, "b".repeat(64));
  assert.equal(decideReminder(one(off), sa(21, 21, 0)), null);
});

test("razlozi po prioritetu", () => {
  const base = { lastSeenAt: sa(20, 21), now: sa(23, 21), releasedAt: {} };
  assert.equal(pickReason("d1", { ...base, play: play({ lastResult: "won" }) }).reason, "win_again");
  assert.equal(pickReason("d1", { ...base, play: play({ lastResult: "other" }) }).reason, "default");
  assert.equal(pickReason("d7", { ...base, play: play() }).reason, "last_call");
  // Nova igra izašla poslije zadnjeg viđenja, a igrač je nije igrao.
  const released = { ...base, releasedAt: { bela: sa(22, 12) } };
  assert.deepEqual(pickReason("d3", { ...released, play: play() }), { reason: "new_game", game: "bela" });
  assert.equal(pickReason("d3", { ...released, play: play({ games: ["raub", "bela"] }) }).reason, "rematch");
  assert.equal(pickReason("d1", { ...released, play: play() }).reason, "rematch", "d1 ne najavljuje igru");
});

test("statistika sa više uređaja: zbir partija, zadnja partija najnovija", () => {
  const merged = mergePlay([
    device({ play: play({ matchesFinished: 2, lastGame: "poker", lastMatchEndedAt: 10, games: ["poker"] }) }),
    device({ play: play({ matchesFinished: 1, lastGame: "bela", lastMatchEndedAt: 20, lastResult: "won", games: ["bela"] }) }),
  ]);
  assert.equal(merged?.matchesFinished, 3);
  assert.equal(merged?.lastGame, "bela");
  assert.equal(merged?.lastResult, "won");
  assert.deepEqual(merged?.games.sort(), ["bela", "poker"]);
});

test("kontrolna grupa: 50 % dok obje grupe nemaju 100, zatim 10 %", () => {
  assert.equal(holdoutShare({ treatment: 99, holdout: 150 }), 0.5);
  assert.equal(holdoutShare({ treatment: 100, holdout: 100 }), 0.1);
  assert.equal(assignArm(0.5, 0.49), "holdout");
  assert.equal(assignArm(0.5, 0.5), "treatment");
});

test("ubrzan dan (staging) ne gleda sat ni kalendar", () => {
  const cfg: ReminderConfig = { ...DEFAULT_REMINDER_CONFIG, dayMs: 60_000, minInactiveMs: 30_000, minGapMs: 30_000 };
  const d = device({ lastSeenAt: 1_000_000 });
  assert.equal(decideReminder(one(d), 1_000_000 + 59_000, cfg), null);
  assert.equal(decideReminder(one(d), 1_000_000 + 61_000, cfg)?.step, "d1");
  assert.equal(decideReminder(one(d), 1_000_000 + 3 * 60_000 + 1, cfg)?.step, "d3");
});

test("poruka: kanal podsjetnici, NORMAL prioritet, tap nosi korak, razlog i igru", () => {
  const msg = buildReminderPush({ step: "d1", reason: "rematch", game: "bela" });
  assert.equal(msg.title, "Revanš?");
  assert.match(msg.body, /Bele/);
  const payload = buildFcmPayload("tok", msg);
  assert.equal(payload.message.android.priority, "NORMAL");
  assert.equal(payload.message.android.notification.channel_id, "podsjetnici");
  assert.deepEqual(payload.message.data, { type: "reminder", step: "d1", reason: "rematch", game: "bela" });
});

test("tekstovi ne pominju botove, broj ljudi ni da neko čeka", () => {
  for (const reason of ["new_game", "rematch", "win_again", "first_match", "default", "last_call"] as const) {
    for (const game of ["zandar", "poker", "raub", "bela"] as const) {
      const { title, body } = buildReminderPush({ step: "d1", reason, game });
      assert.doesNotMatch(`${title} ${body}`, /bot|čeka|igrača|igrači/i);
    }
  }
});
