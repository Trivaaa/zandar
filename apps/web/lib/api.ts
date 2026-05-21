const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export type RoomPlayer = {
  id: string;
  displayName: string;
  seatIndex: number;
  isHost: boolean;
  teamId?: number;
};

export type RoomInfo = {
  id: string;
  status: string;
  players: RoomPlayer[];
  playerCount: number;
  targetScore: number;
  slotsAvailable: number;
};

export type CreateRoomResponse = {
  roomId: string;
  playerId: string;
  playerSessionToken: string;
  inviteUrl: string;
};

export type JoinRequestResponse = {
  requestId: string;
  expiresAt: number;
};

export type JoinRequestStatusResponse =
  | { status: "pending" | "rejected" | "expired" }
  | { status: "approved"; playerId: string; sessionToken: string };

export type PendingJoinRequest = {
  id: string;
  displayName: string;
  expiresAt: number;
};

export async function createRoom(input: {
  displayName: string;
  playerCount: 2 | 3 | 4;
  targetScore: number;
}): Promise<CreateRoomResponse> {
  const res = await fetch(`${API_BASE}/api/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Greška");
  }
  return res.json();
}

export async function getRoom(roomId: string): Promise<RoomInfo> {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Greška");
  }
  return res.json();
}

export async function submitJoinRequest(
  roomId: string,
  displayName: string,
): Promise<JoinRequestResponse> {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}/join-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ displayName }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Greška");
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
    const err = await res.json();
    throw new Error(err.error || "Greška");
  }
  return res.json();
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
    const err = await res.json();
    throw new Error(err.error || "Greška");
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
    const err = await res.json();
    throw new Error(err.error || "Greška");
  }
}

export async function getPendingJoinRequests(
  roomId: string,
  playerId: string,
  token: string,
): Promise<PendingJoinRequest[]> {
  const url = new URL(`${API_BASE}/api/rooms/${roomId}/join-requests`);
  url.searchParams.set("playerId", playerId);
  url.searchParams.set("token", token);
  const res = await fetch(url.toString());
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Greška");
  }
  const data = await res.json();
  return data.pending;
}

export async function startGame(
  roomId: string,
  playerId: string,
  sessionToken: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, sessionToken }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Greška");
  }
}
export async function kickPlayer(
  roomId: string,
  playerId: string,
  hostPlayerId: string,
  hostSessionToken: string,
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/rooms/${roomId}/kick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, hostPlayerId, hostSessionToken }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Greška");
  }
}