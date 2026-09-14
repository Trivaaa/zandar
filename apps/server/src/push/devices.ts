import { randomBytes } from "node:crypto";
import { join } from "node:path";

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
  createdAt: number;
  /** Zadnje otvaranje aplikacije — signal neaktivnosti za podsjetnike (slice 2). */
  lastSeenAt: number;
  prefs: { table: boolean };
};

export type RegisterInput = {
  token?: unknown;
  pushId?: unknown;
  tz?: unknown;
  guestId?: unknown;
  table?: unknown;
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
    prefs: { table: r.prefs?.table !== false },
  };
  const guestId = shortString(r.guestId);
  if (guestId) rec.guestId = guestId;
  const tz = shortString(r.tz);
  if (tz) rec.tz = tz;
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
        },
      };
      const guestId = shortString(input.guestId) ?? existing?.guestId;
      if (guestId) rec.guestId = guestId;
      const tz = shortString(input.tz) ?? existing?.tz;
      if (tz) rec.tz = tz;

      devices.set(idHash, rec);
      owners.set(token, idHash);
      persist(rec);
      return { ok: true, pushId };
    },

    setPrefs(pushId: unknown, prefs: { table?: unknown }): boolean {
      const idHash = resolve(pushId);
      const rec = idHash === null ? undefined : devices.get(idHash);
      if (!rec) return false;
      if (typeof prefs.table === "boolean") rec.prefs.table = prefs.table;
      persist(rec);
      return true;
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
