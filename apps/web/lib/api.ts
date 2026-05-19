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
export type JoinRequestResponse = {
  requestId: string;
  expiresAt: number;
};

export type JoinRequestStatusResponse =
  | { status: "pending" }
  | { status: "approved"; playerId: string; sessionToken: string }
  | { status: "rejected" }
  | { status: "expired" };

export async function submitJoinRequest(
  roomId: string,
  displayName: string,
): Promise<JoinRequestResponse> {
  const res = await fetch(
    `${API_BASE}/api/rooms/${roomId}/join-request`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    },
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Network error" }));
    throw new Error(err.error || "Greška pri slanju zahtjeva");
  }
  return res.json();
}

export async function getJoinRequestStatus(
  roomId: string,
  requestId: string,
): Promise<JoinRequestStatusResponse> {
  const res = await fetch(
    `${API_BASE}/api/rooms/${roomId}/join-request/${requestId}`,
  );
  if (!res.ok) {
    if (res.status === 404) throw new Error("Zahtjev ne postoji");
    throw new Error("Greška pri provjeri statusa");
  }
  return res.json();
}
export type PendingJoinRequest = {
  id: string;
  displayName: string;
  expiresAt: number;
};

export async function getPendingJoinRequests(
  roomId: string,
  hostPlayerId: string,
  hostSessionToken: string,
): Promise<PendingJoinRequest[]> {
  const url = `${API_BASE}/api/rooms/${roomId}/join-requests?playerId=${encodeURIComponent(hostPlayerId)}&token=${encodeURIComponent(hostSessionToken)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Greška" }));
    throw new Error(err.error || "Greška pri učitavanju zahtjeva");
  }
  const data = await res.json();
  return data.pending;
}

export async function approveJoinRequest(
  roomId: string,
  requestId: string,
  hostPlayerId: string,
  hostSessionToken: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, hostPlayerId, hostSessionToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Greška" }));
    throw new Error(err.error || "Greška pri odobravanju");
  }
}

export async function rejectJoinRequest(
  roomId: string,
  requestId: string,
  hostPlayerId: string,
  hostSessionToken: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requestId, hostPlayerId, hostSessionToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Greška" }));
    throw new Error(err.error || "Greška pri odbijanju");
  }
}