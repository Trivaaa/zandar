import { randomBytes, createHash } from "node:crypto";
import type {
  GameState,
  Player,
  RulesConfig,
} from "@zandar/shared-types";

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

export function verifyToken(
  room: LobbyRoom,
  playerId: string,
  token: string,
): boolean {
  return room.sessionTokens.get(playerId) === hashToken(token);
}

export function storeRoom(room: LobbyRoom): void {
  rooms.set(room.id, room);
}

export function getRoom(roomId: string): LobbyRoom | undefined {
  return rooms.get(roomId);
}

export function deleteRoom(roomId: string): boolean {
  return rooms.delete(roomId);
}

export function getAllRooms(): LobbyRoom[] {
  return Array.from(rooms.values());
}

export function expireOldRequests(room: LobbyRoom): void {
  const now = Date.now();
  for (const req of room.joinRequests.values()) {
    if (req.status === "pending" && now >= req.expiresAt) {
      req.status = "expired";
    }
  }
}