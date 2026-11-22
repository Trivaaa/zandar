import { randomBytes } from "node:crypto";
import { join } from "node:path";

import { GAME_IDS, type GameId } from "@zandar/shared-types";

import { localParts } from "./localTime";
import {
  createFileAdapter,
  DATA_DIR,
  type PersistenceAdapter,
} from "../persistence";
import { hashToken } from "../rooms";

/**
 * Uređaji koji primaju push (PRD §51) — jedan zapis po instalaciji aplikacije.
 *
 * Ključ je `pushId`: 32 slučajna bajta koje server izda pri registraciji i koje
 * zna SAMO taj telefon. Nije `guestId`, jer `guestId` nije tajna — ide u
 * PostHog i ispisuje se na `/delete-account` — pa bi svako ko ga zna mogao
 * prijaviti svoj token pod tuđim imenom i primati tuđa obavještenja. Na disku i
 * u sobama stoji samo `hashToken(pushId)`, isti obrazac kao session tokeni.
 *
 * Snimak je jedan JSON po uređaju u `${DATA_DIR}/push/` — isti volumen kao
 * sobe, a poddirektorijum ne smeta `loadAll` soba (čita samo `*.json` na vrhu).
 */

export type DeviceRecord = {
  idHash: string;
  /** FCM registracioni token. Rotira — osvježava se pri svakom otvaranju aplikacije. */
  token: string;
  platform: "android";
  /** Samo da ručni zahtjev za brisanje (`/delete-account`) nađe zapis. */
  guestId?: string;
  /** IANA zona sa uređaja — za tihe sate podsjetnika (slice 2). */
  tz?: string;
  /**
   * Firebase `uid` naloga prijavljenog na ovom uređaju (SPEC_IDENTITET §8) —
   * obavještenja o prijateljima idu na sve uređaje naloga. Postavlja ga SAMO
   * server iz provjerenog tokena; briše se na odjavi (T3).
   */
  uid?: string;
  createdAt: number;
  /** Zadnje otvaranje aplikacije — signal neaktivnosti za podsjetnike (SPEC_PUSH_V2). */
  lastSeenAt: number;
  /** `reminders` nedostaje u starim snapshotima = uključeno. */
  prefs: { table: boolean; reminders: boolean };
  /**
   * Šta paket na uređaju zna da prikaže. `reminders` = postoji kanal
   * `podsjetnici` (AAB 14+); stari paket bi podsjetnik pustio na podrazumijevani
   * kanal, pa ga ne dobija.
   */
  caps?: DeviceCap[];
  /** Igranje na ovom uređaju — izvor razloga za podsjetnik (SPEC_PUSH_V2 B2). */
  play?: PlayStats;
  /** Grupa za mjerenje; dodjeljuje se jednom, kad je prvi podsjetnik na redu. */
  reminderArm?: ReminderArm;
  /** Niz podsjetnika u trenutnom periodu neaktivnosti. */
  reminders?: ReminderState;
};

export const DEVICE_CAPS = ["reminders"] as const;
export type DeviceCap = (typeof DEVICE_CAPS)[number];
export type ReminderArm = "treatment" | "holdout";
export type ReminderStep = "d1" | "d3" | "d7";
export const REMINDER_STEPS: readonly ReminderStep[] = ["d1", "d3", "d7"];

export type PlayStats = {
  /** Samo odigrane do kraja (ne napuštene). */
  matchesFinished: number;
  lastMatchEndedAt: number;
  lastGame: GameId;
  lastResult: "won" | "lost" | "other";
  /** Igre koje je igrač bar jednom igrao — `new_game` ih preskače. */
  games: GameId[];
  /** 24 brojača: lokalni sat (po `tz` uređaja) početka partije. */
  hourCounts: number[];
};

export type ReminderState = {
  /** `lastSeenAt` igrača kad je niz počeo — drugačiji = igrač se vratio, novi niz. */
  streakStartedAt: number;
  sentSteps: ReminderStep[];
  lastSentAt: number;
};

export type PlayInput = {
  game: GameId;
  result: "won" | "lost" | "other";
  completed: boolean;
  startedAt?: number | undefined;
  endedAt: number;
};

export type RegisterInput = {
  token?: unknown;
  pushId?: unknown;
  tz?: unknown;
  guestId?: unknown;
  table?: unknown;
  reminders?: unknown;
  caps?: unknown;
  /** Iz provjerenog Firebase tokena — NIKAD iz tijela zahtjeva. */
  uid?: string | undefined;
};

export type RegisterResult =
  | { ok: true; pushId: string }
  | { ok: false; error: string };

const HEX64 = /^[0-9a-f]{64}$/;
const TOKEN_MAX = 4096;
const SHORT_MAX = 64;
/** Uređaj koji se ne javi 60 dana je deinstaliran ili zaboravljen. */
export const DEVICE_TTL_MS = 60 * 24 * 60 * 60 * 1000;
/** Gornja granica protiv punjenja volumena lažnim registracijama (nema naloga ni rate-limita). */
const DEFAULT_MAX_DEVICES = 50_000;
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000;

function shortString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 && value.length <= SHORT_MAX
    ? value
    : undefined;
}

function hashOf(pushId: unknown): string | null {
  return typeof pushId === "string" && HEX64.test(pushId) ? hashToken(pushId) : null;
}

const isGameId = (v: unknown): v is GameId =>
  typeof v === "string" && (GAME_IDS as readonly string[]).includes(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Poznate mogućnosti iz tijela zahtjeva; nepoznate se ignorišu (noviji paket). */
export function parseCaps(value: unknown): DeviceCap[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const caps = DEVICE_CAPS.filter((cap) => value.includes(cap));
  return caps.length > 0 ? caps : undefined;
}

function playFromDisk(raw: unknown): PlayStats | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Partial<PlayStats>;
  if (!isFiniteNumber(p.lastMatchEndedAt) || !isGameId(p.lastGame)) return undefined;
  const hours = Array.from({ length: 24 }, (_, h) => {
    const v = Array.isArray(p.hourCounts) ? p.hourCounts[h] : 0;
    return isFiniteNumber(v) && v > 0 ? v : 0;
  });
  return {
    matchesFinished: isFiniteNumber(p.matchesFinished) ? Math.max(0, p.matchesFinished) : 0,
    lastMatchEndedAt: p.lastMatchEndedAt,
    lastGame: p.lastGame,
    lastResult: p.lastResult === "won" || p.lastResult === "lost" ? p.lastResult : "other",
    games: Array.isArray(p.games) ? GAME_IDS.filter((g) => p.games!.includes(g)) : [p.lastGame],
    hourCounts: hours,
  };
}

function remindersFromDisk(raw: unknown): ReminderState | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Partial<ReminderState>;
  if (!isFiniteNumber(r.streakStartedAt) || !isFiniteNumber(r.lastSentAt)) return undefined;
  return {
    streakStartedAt: r.streakStartedAt,
    lastSentAt: r.lastSentAt,
    sentSteps: Array.isArray(r.sentSteps)
      ? REMINDER_STEPS.filter((s) => r.sentSteps!.includes(s))
      : [],
  };
}

/** Nova statistika poslije jedne partije — čista funkcija (test). */
export function applyPlay(
  prev: PlayStats | undefined,
  input: PlayInput,
  tz: string | undefined,
): PlayStats {
  const hourCounts = prev ? [...prev.hourCounts] : Array.from({ length: 24 }, () => 0);
  const { hour } = localParts(input.startedAt ?? input.endedAt, tz);
  hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
  const games = prev ? [...prev.games] : [];
  if (!games.includes(input.game)) games.push(input.game);
  return {
    matchesFinished: (prev?.matchesFinished ?? 0) + (input.completed ? 1 : 0),
    lastMatchEndedAt: input.endedAt,
    lastGame: input.game,
    lastResult: input.result,
    games,
    hourCounts,
  };
}

/** Zapis sa diska — tolerantan, jer se oblik može mijenjati između deploya. */
function fromDisk(raw: unknown, now: number): DeviceRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<DeviceRecord>;
  if (typeof r.idHash !== "string" || !HEX64.test(r.idHash)) return null;
  if (typeof r.token !== "string" || r.token.length === 0) return null;
  const rec: DeviceRecord = {
    idHash: r.idHash,
    token: r.token,
    platform: "android",
    createdAt: typeof r.createdAt === "number" ? r.createdAt : now,
    lastSeenAt: typeof r.lastSeenAt === "number" ? r.lastSeenAt : now,
    prefs: { table: r.prefs?.table !== false, reminders: r.prefs?.reminders !== false },
  };
  const guestId = shortString(r.guestId);
  if (guestId) rec.guestId = guestId;
  const tz = shortString(r.tz);
  if (tz) rec.tz = tz;
  const uid = shortString(r.uid);
  if (uid) rec.uid = uid;
  const caps = parseCaps(r.caps);
  if (caps) rec.caps = caps;
  const play = playFromDisk(r.play);
  if (play) rec.play = play;
  if (r.reminderArm === "treatment" || r.reminderArm === "holdout") rec.reminderArm = r.reminderArm;
  const reminders = remindersFromDisk(r.reminders);
  if (reminders) rec.reminders = reminders;
  return rec;
}

export function createDeviceStore(
  adapter: PersistenceAdapter,
  options: { maxDevices?: number } = {},
) {
  const maxDevices = options.maxDevices ?? DEFAULT_MAX_DEVICES;
  const devices = new Map<string, DeviceRecord>();
  /** token → idHash. Jedan telefon = jedan zapis, i kad izgubi localStorage. */
  const owners = new Map<string, string>();

  function persist(rec: DeviceRecord): void {
    void adapter
      .save(rec.idHash, rec)
      .catch((e) => console.error("[push] upis uređaja nije uspio:", e));
  }

  function drop(idHash: string): boolean {
    const rec = devices.get(idHash);
    if (!rec) return false;
    devices.delete(idHash);
    if (owners.get(rec.token) === idHash) owners.delete(rec.token);
    void adapter.remove(idHash).catch(() => {});
    return true;
  }

  /** Hash POZNATOG uređaja, ili null (nepoznat, pogrešnog oblika ili nije string). */
  function resolve(pushId: unknown): string | null {
    const idHash = hashOf(pushId);
    return idHash !== null && devices.has(idHash) ? idHash : null;
  }

  return {
    async hydrate(now: number = Date.now()): Promise<number> {
      await adapter.init();
      for (const raw of await adapter.loadAll()) {
        const rec = fromDisk(raw, now);
        if (!rec) continue;
        // Dva zapisa sa istim tokenom ne bi smjela postojati; ako postoje, svježiji ostaje.
        const other = owners.get(rec.token);
        const otherRec = other === undefined ? undefined : devices.get(other);
        if (otherRec) {
          if (otherRec.lastSeenAt >= rec.lastSeenAt) {
            void adapter.remove(rec.idHash).catch(() => {});
            continue;
          }
          drop(otherRec.idHash);
        }
        devices.set(rec.idHash, rec);
        owners.set(rec.token, rec.idHash);
      }
      return devices.size;
    },

    resolve,
    get: (idHash: string): DeviceRecord | undefined => devices.get(idHash),
    size: (): number => devices.size,

    /**
     * Prva registracija izdaje `pushId`; ponovljena (svako otvaranje aplikacije)
     * osvježava token i `lastSeenAt` pod istim. Nepoznat `pushId` dobija nov —
     * klijent ga mora zamijeniti onim iz odgovora.
     */
    register(input: RegisterInput, now: number = Date.now()): RegisterResult {
      const { token } = input;
      if (typeof token !== "string" || token.length === 0 || token.length > TOKEN_MAX) {
        return { ok: false, error: "token je obavezan" };
      }

      let pushId: string;
      let idHash: string;
      const known = resolve(input.pushId);
      if (known !== null) {
        pushId = input.pushId as string;
        idHash = known;
      } else {
        if (devices.size >= maxDevices && !owners.has(token)) {
          return { ok: false, error: "registracija trenutno nije moguća" };
        }
        pushId = randomBytes(32).toString("hex");
        idHash = hashToken(pushId);
      }

      // Isti token pod drugim zapisom = isti telefon koji je izgubio localStorage
      // (brisanje podataka aplikacije). Bez ovoga bi dobijao svako obavještenje dvaput.
      const previousOwner = owners.get(token);
      if (previousOwner !== undefined && previousOwner !== idHash) drop(previousOwner);

      const existing = devices.get(idHash);
      if (existing && existing.token !== token) owners.delete(existing.token);

      const rec: DeviceRecord = {
        idHash,
        token,
        platform: "android",
        createdAt: existing?.createdAt ?? now,
        lastSeenAt: now,
        prefs: {
          table:
            typeof input.table === "boolean"
              ? input.table
              : (existing?.prefs.table ?? true),
          reminders:
            typeof input.reminders === "boolean"
              ? input.reminders
              : (existing?.prefs.reminders ?? true),
        },
      };
      const guestId = shortString(input.guestId) ?? existing?.guestId;
      if (guestId) rec.guestId = guestId;
      const tz = shortString(input.tz) ?? existing?.tz;
      if (tz) rec.tz = tz;
      // Bez tokena (Firebase nedostupan) uređaj ostaje vezan za dosadašnji nalog.
      const uid = shortString(input.uid) ?? existing?.uid;
      if (uid) rec.uid = uid;
      // Mogućnosti javlja SVAKA registracija: paket se ažurira (i vraća) na istom uređaju.
      const caps = parseCaps(input.caps);
      if (caps) rec.caps = caps;
      if (existing?.play) rec.play = existing.play;
      if (existing?.reminderArm) rec.reminderArm = existing.reminderArm;
      if (existing?.reminders) rec.reminders = existing.reminders;

      devices.set(idHash, rec);
      owners.set(token, idHash);
      persist(rec);
      return { ok: true, pushId };
    },

    setPrefs(pushId: unknown, prefs: { table?: unknown; reminders?: unknown }): boolean {
      const idHash = resolve(pushId);
      const rec = idHash === null ? undefined : devices.get(idHash);
      if (!rec) return false;
      if (typeof prefs.table === "boolean") rec.prefs.table = prefs.table;
      if (typeof prefs.reminders === "boolean") rec.prefs.reminders = prefs.reminders;
      persist(rec);
      return true;
    },

    /** Kraj partije za igrača na ovom uređaju (SPEC_PUSH_V2 B2). */
    recordPlay(idHash: string, input: PlayInput): boolean {
      const rec = devices.get(idHash);
      if (!rec) return false;
      rec.play = applyPlay(rec.play, input, rec.tz);
      persist(rec);
      return true;
    },

    /** Planer podsjetnika upisuje grupu i niz; stanje preživljava restart. */
    updateReminders(
      idHash: string,
      patch: { arm?: ReminderArm; reminders?: ReminderState },
    ): boolean {
      const rec = devices.get(idHash);
      if (!rec) return false;
      if (patch.arm) rec.reminderArm = patch.arm;
      if (patch.reminders) rec.reminders = patch.reminders;
      persist(rec);
      return true;
    },

    /** Svi zapisi — planer ih prolazi svakih 15 minuta. */
    all: (): DeviceRecord[] => [...devices.values()],

    /** T3: odjava — uređaj više ne prima obavještenja tog naloga. */
    unbind(pushId: unknown): boolean {
      const idHash = resolve(pushId);
      const rec = idHash === null ? undefined : devices.get(idHash);
      if (!rec) return false;
      delete rec.uid;
      persist(rec);
      return true;
    },

    /** Svi uređaji na kojima je nalog prijavljen (SPEC_IDENTITET §8). */
    hashesForUid(uid: string): string[] {
      return [...devices.values()].filter((rec) => rec.uid === uid).map((rec) => rec.idHash);
    },

    /** Brisanje naloga: nijedan uređaj više ne prima obavještenja tog naloga. */
    unbindUid(uid: string): number {
      let n = 0;
      for (const rec of devices.values()) {
        if (rec.uid !== uid) continue;
        delete rec.uid;
        persist(rec);
        n++;
      }
      return n;
    },

    /** FCM javio UNREGISTERED — aplikacija je deinstalirana ili je token zamijenjen. */
    removeByHash: drop,

    sweep(now: number = Date.now()): number {
      let removed = 0;
      for (const rec of [...devices.values()]) {
        if (now - rec.lastSeenAt >= DEVICE_TTL_MS && drop(rec.idHash)) removed += 1;
      }
      return removed;
    },
  };
}

export type DeviceStore = ReturnType<typeof createDeviceStore>;

export const deviceStore: DeviceStore = createDeviceStore(
  createFileAdapter(join(DATA_DIR, "push")),
);

/** Periodično čišćenje zaboravljenih uređaja. unref() — ne drži proces živim. */
export function startDeviceSweeper(
  onSweep?: (removed: number) => void,
): ReturnType<typeof setInterval> {
  const timer = setInterval(() => {
    const removed = deviceStore.sweep();
    if (removed > 0) onSweep?.(removed);
  }, SWEEP_INTERVAL_MS);
  timer.unref();
  return timer;
}
