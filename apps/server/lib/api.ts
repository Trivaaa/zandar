const API_BASE = "http://localhost:3001";

export type CreateRoomResponse = {
  roomId: string;
  playerId: string;
  playerSessionToken: string;
  inviteUrl: string;
};

export type RoomInfo = {
  id: string;
  status: "waiting" | "playing" | "finished";
  players: Array<{
    id: string;
    displayName: string;
    seatIndex: number;
    isHost: boolean;
    teamId?: number;
  }>;
  playerCount: number;
  targetScore: number;
  slotsAvailable: number;
};

export async function createRoom(params: {
  displayName: string;
  playerCount: 2 | 3 | 4;
  targetScore?: number;
}): Promise<CreateRoomResponse> {
  const res = await fetch(`${API_BASE}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error(err.error || "Greška pri kreiranju sobe");
  }
  return res.json();
}

export async function getRoom(roomId: string): Promise<RoomInfo> {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error("Soba ne postoji");
    throw new Error("Greška pri učitavanju sobe");
  }
  return res.json();
}