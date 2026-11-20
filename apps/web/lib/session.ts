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

/**
 * Svi sačuvani ključevi sjedišta („Vrati se za sto"): server kaže za kojim
 * stolom igrač još sjedi. Pokvaren zapis se preskače, ne ruši početnu.
 */
export function listSessions(): RoomSession[] {
  if (typeof window === "undefined") return [];
  const out: RoomSession[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(KEY_PREFIX)) continue;
      const session = getSession(key.slice(KEY_PREFIX.length));
      if (session?.roomId && session.playerId && session.sessionToken) out.push(session);
    }
  } catch {
    // Blokirano skladište (privatni prozor) — kao da ključeva nema.
  }
  return out;
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