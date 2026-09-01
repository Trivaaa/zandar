import { randomBytes, createHash } from "node:crypto";
import type {
  GameState,
  Player,
  RulesConfig,
} from "@zandar/shared-types";
import { persistence } from "./persistence";

export type JoinRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "expired";

export type JoinRequest = {
  id: string;
  displayName: string;
  status: JoinRequestStatus;
  createdAt: number;
  expiresAt: number;
  playerId?: string;       // popunjeno nakon approve
  sessionToken?: string;   // plaintext, vraća se gostu jednom
};

export type LobbyRoom = {
  id: string;
  status: "waiting" | "playing" | "finished";
  hostPlayerId: string;
  players: Player[];
  rulesConfig: RulesConfig;
  gameState: GameState | null;
  sessionTokens: Map<string, string>;
  joinRequests: Map<string, JoinRequest>;
  createdAt: number;
  /** Zadnja aktivnost (osvježava se u persistRoom) — ulaz za sweep. */
  lastActivityAt?: number;
  /** Javni stolovi (Quick Play) — vidljivi matchmakeru. */
  isPublic?: boolean;
  /**
   * Host bot-fill (C3): kad je true, prazna mjesta se drže popunjena botovima
   * dok se ne pridruže ljudi (ljudi imaju prioritet — zauzimaju mjesto bota).
   */
  botFill?: boolean;
};

const rooms = new Map<string, LobbyRoom>();

export function createRoomId(): string {
  return randomBytes(3).toString("hex");
}

export function createPlayerId(): string {
  return `p_${randomBytes(6).toString("hex")}`;
}

export function createSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function createRequestId(): string {
  return `req_${randomBytes(8).toString("hex")}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Provjera session tokena.
 *
 * Ulaz dolazi sa mreže, pa se ne smije vjerovati tipovima: `hashToken` na
 * `undefined` baca ERR_INVALID_ARG_TYPE i — pošto je poziv u socket handleru —
 * ruši CIJELI proces. Jedan malformiran `room:subscribe` je do sad obarao
 * server. Nevalidan ulaz je odbijen token, ne pad.
 */
export function verifyToken(
  room: LobbyRoom,
  playerId: string,
  token: string,
): boolean {
  if (typeof playerId !== "string" || typeof token !== "string") return false;
  return room.sessionTokens.get(playerId) === hashToken(token);
}

export function storeRoom(room: LobbyRoom): void {
  rooms.set(room.id, room);
  persistRoom(room);
}

export function getRoom(roomId: string): LobbyRoom | undefined {
  return rooms.get(roomId);
}

export function deleteRoom(roomId: string): boolean {
  const existing = persistTimers.get(roomId);
  if (existing) {
    clearTimeout(existing);
    persistTimers.delete(roomId);
  }
  void persistence.remove(roomId).catch(() => {});
  return rooms.delete(roomId);
}

export function getAllRooms(): LobbyRoom[] {
  return Array.from(rooms.values());
}

// ── Persistence (DS backlog: rooms survive restart) ──────────────────────────

/** JSON-safe oblik sobe (Map-ovi → objekti). */
type SerializedRoom = Omit<LobbyRoom, "sessionTokens" | "joinRequests"> & {
  sessionTokens: Record<string, string>;
  joinRequests: Record<string, JoinRequest>;
};

function serializeRoom(room: LobbyRoom): SerializedRoom {
  return {
    ...room,
    sessionTokens: Object.fromEntries(room.sessionTokens),
    joinRequests: Object.fromEntries(room.joinRequests),
  };
}

function deserializeRoom(raw: unknown): LobbyRoom {
  const r = raw as SerializedRoom;
  return {
    ...r,
    sessionTokens: new Map(Object.entries(r.sessionTokens ?? {})),
    joinRequests: new Map(Object.entries(r.joinRequests ?? {})),
  };
}

const persistTimers = new Map<string, ReturnType<typeof setTimeout>>();
const PERSIST_DEBOUNCE_MS = 400;

/** Debounce-ovani upis sobe u durable store. Fire-and-forget. */
export function persistRoom(room: LobbyRoom): void {
  room.lastActivityAt = Date.now();
  const id = room.id;
  const existing = persistTimers.get(id);
  if (existing) clearTimeout(existing);
  persistTimers.set(
    id,
    setTimeout(() => {
      persistTimers.delete(id);
      void persistence
        .save(id, serializeRoom(room))
        .catch((e) => console.error(`[persist] save failed ${id}:`, e));
    }, PERSIST_DEBOUNCE_MS),
  );
}

/** Učitaj perzistirane sobe u memoriju na startu. Vraća ID-eve vraćenih soba. */
export async function hydrateRooms(): Promise<string[]> {
  await persistence.init();
  const all = await persistence.loadAll();
  const ids: string[] = [];
  for (const raw of all) {
    try {
      const room = deserializeRoom(raw);
      if (!room?.id) continue;
      rooms.set(room.id, room);
      ids.push(room.id);
    } catch (e) {
      console.error("[persist] hydrate skip:", e);
    }
  }
  return ids;
}

export function expireOldRequests(room: LobbyRoom): void {
  const now = Date.now();
  for (const req of room.joinRequests.values()) {
    if (req.status === "pending" && now >= req.expiresAt) {
      req.status = "expired";
    }
  }
}

// ── Sweep napuštenih soba ────────────────────────────────────────────────────

/**
 * Bez ovoga `rooms` Map i .data direktorij rastu bez granice: deleteRoom()
 * postoji, ali ga nijedna putanja nije zvala. Sobe se čiste po TTL-u od zadnje
 * aktivnosti (lastActivityAt, fallback createdAt).
 */
const FINISHED_ROOM_TTL_MS = 60 * 60 * 1000;      // 1h nakon završene partije
const IDLE_ROOM_TTL_MS = 12 * 60 * 60 * 1000;     // 12h bez ikakve aktivnosti
const SWEEP_INTERVAL_MS = 10 * 60 * 1000;         // provjera svakih 10 min

/** Ukloni sobe kojima je istekao TTL. Vraća broj uklonjenih. */
export function sweepStaleRooms(now: number = Date.now()): number {
  let removed = 0;
  for (const room of rooms.values()) {
    const last = room.lastActivityAt ?? room.createdAt;
    const ttl =
      room.status === "finished" ? FINISHED_ROOM_TTL_MS : IDLE_ROOM_TTL_MS;
    if (now - last >= ttl) {
      deleteRoom(room.id);
      removed += 1;
    }
  }
  return removed;
}

/** Pokreni periodični sweep. unref() — ne drži proces živim. */
export function startRoomSweeper(
  onSweep?: (removed: number) => void,
): ReturnType<typeof setInterval> {
  const timer = setInterval(() => {
    const removed = sweepStaleRooms();
    if (removed > 0) onSweep?.(removed);
  }, SWEEP_INTERVAL_MS);
  timer.unref();
  return timer;
}
