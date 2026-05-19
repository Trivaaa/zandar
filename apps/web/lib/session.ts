export type RoomSession = {
  roomId: string;
  playerId: string;
  sessionToken: string;
};

const KEY_PREFIX = "zandar:session:";

export function saveSession(session: RoomSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    KEY_PREFIX + session.roomId,
    JSON.stringify(session),
  );
}

export function getSession(roomId: string): RoomSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY_PREFIX + roomId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RoomSession;
  } catch {
    return null;
  }
}

export function clearSession(roomId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY_PREFIX + roomId);
}
export type JoinPending = {
  roomId: string;
  requestId: string;
  displayName: string;
  expiresAt: number;
};

const JOIN_KEY_PREFIX = "zandar:join:";

export function saveJoinPending(pending: JoinPending): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    JOIN_KEY_PREFIX + pending.roomId,
    JSON.stringify(pending),
  );
}

export function getJoinPending(roomId: string): JoinPending | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(JOIN_KEY_PREFIX + roomId);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as JoinPending;
  } catch {
    return null;
  }
}

export function clearJoinPending(roomId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(JOIN_KEY_PREFIX + roomId);
}