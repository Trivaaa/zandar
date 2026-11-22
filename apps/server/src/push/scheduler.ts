import type { AnalyticsEvents } from "@zandar/shared-types";

import type { DeviceStore, ReminderArm } from "./devices";
import type { FcmSender } from "./fcm";
import {
  assignArm,
  buildReminderPush,
  decideReminder,
  DEFAULT_REMINDER_CONFIG,
  groupByPlayer,
  holdoutShare,
  type ReminderConfig,
} from "./reminders";

/**
 * Planer podsjetnika (SPEC_PUSH_V2 B3–B9). Svakih 15 minuta prolazi uređaje,
 * pita `decideReminder` i za svaku odluku:
 *  - upiše niz na uređaj (i kontrolnoj grupi, da obje grupe idu istim ritmom),
 *  - pošalje poruku SAMO ako je igrač u grupi `treatment`, paket zna kanal
 *    `podsjetnici` i `PUSH_REMINDERS=1`;
 *  - inače zabilježi `reminder_would_send`.
 *
 * Stanje je na zapisu uređaja (file-snapshot), pa restart ne šalje dvaput.
 * Nikad ne baca: greška jednog slanja ne zaustavlja ostale ni server.
 */

export type ReminderTrack = <E extends "push_sent" | "reminder_would_send">(
  distinctId: string | undefined,
  event: E,
  props: AnalyticsEvents[E],
) => void;

export type SchedulerDeps = {
  store: Pick<DeviceStore, "all" | "updateReminders" | "removeByHash">;
  fcm: Pick<FcmSender, "enabled" | "send">;
  track: ReminderTrack;
  /** `PUSH_REMINDERS=1` — bez toga se ništa ne šalje. */
  sendingEnabled: boolean;
  config?: ReminderConfig;
  random?: () => number;
};

export type TickResult = { sent: number; withheld: number };

export function runReminderTick(deps: SchedulerDeps, now: number = Date.now()): TickResult {
  const cfg = deps.config ?? DEFAULT_REMINDER_CONFIG;
  const random = deps.random ?? Math.random;
  const devices = deps.store.all();

  // Brojimo samo igrače sa paketom koji zna podsjetnike — oni ulaze u poređenje.
  const counts: Record<ReminderArm, number> = { treatment: 0, holdout: 0 };
  for (const d of devices) {
    if (d.reminderArm && d.caps?.includes("reminders")) counts[d.reminderArm] += 1;
  }

  const result: TickResult = { sent: 0, withheld: 0 };
  for (const group of groupByPlayer(devices)) {
    let decision;
    try {
      decision = decideReminder(group, now, cfg);
    } catch (err) {
      console.error("[reminders] odluka nije uspjela:", err);
      continue;
    }
    if (!decision) continue;

    const { target, step, reason, game, next } = decision;
    const capable = target.caps?.includes("reminders") === true;
    let arm: ReminderArm | undefined = decision.arm;
    if (!arm && capable) {
      arm = assignArm(holdoutShare(counts, cfg), random());
      counts[arm] += 1;
    }
    deps.store.updateReminders(target.idHash, { reminders: next, ...(arm ? { arm } : {}) });

    const props = { step, reason, arm: arm ?? "none" };
    const send = deps.sendingEnabled && deps.fcm.enabled && capable && arm === "treatment";
    if (!send) {
      result.withheld += 1;
      deps.track(target.guestId, "reminder_would_send", {
        ...props,
        capable,
        enabled: deps.sendingEnabled && deps.fcm.enabled,
      });
      continue;
    }

    result.sent += 1;
    void deps.fcm
      .send(target.token, buildReminderPush({ step, reason, game }, cfg))
      .then((outcome) => {
        if (outcome === "unregistered") deps.store.removeByHash(target.idHash);
        if (outcome === "sent") deps.track(target.guestId, "push_sent", { type: "reminder", ...props });
      })
      .catch((err) => console.error("[reminders] slanje nije uspjelo:", err));
  }
  return result;
}

const TICK_MS = 15 * 60 * 1000;

/** Pokreće planer. unref() — ne drži proces živim. */
export function startReminderScheduler(
  deps: SchedulerDeps,
  tickMs: number = TICK_MS,
): ReturnType<typeof setInterval> {
  const timer = setInterval(() => {
    try {
      const { sent, withheld } = runReminderTick(deps);
      if (sent + withheld > 0) console.log(`🔔 Podsjetnici: poslato ${sent}, zadržano ${withheld}`);
    } catch (err) {
      console.error("[reminders] krug nije uspio:", err);
    }
  }, tickMs);
  timer.unref();
  return timer;
}

/**
 * Konfiguracija iz okruženja. `PUSH_REMINDER_DAY_MS` (samo staging) skraćuje
 * „dan" za provjeru na uređaju; na produkciji se ne postavlja.
 */
export function reminderConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ReminderConfig {
  const dayMs = Number(env.PUSH_REMINDER_DAY_MS);
  if (!Number.isFinite(dayMs) || dayMs <= 0 || env.APP_ENV === "production") {
    return DEFAULT_REMINDER_CONFIG;
  }
  return {
    ...DEFAULT_REMINDER_CONFIG,
    dayMs,
    minInactiveMs: Math.min(DEFAULT_REMINDER_CONFIG.minInactiveMs, dayMs / 2),
    minGapMs: Math.min(DEFAULT_REMINDER_CONFIG.minGapMs, dayMs / 2),
  };
}
