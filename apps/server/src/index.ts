import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server as SocketIOServer } from "socket.io";
import { createRulesConfig } from "@zandar/game-core";
import type { Player } from "@zandar/shared-types";
import {
  createPlayerId,
  createRequestId,
  createRoomId,
  createSessionToken,
  expireOldRequests,
  getRoom,
  hashToken,
  storeRoom,
  verifyToken,
  type JoinRequest,
  type LobbyRoom,
} from "./rooms";

const JOIN_REQUEST_TTL_MS = 2 * 60 * 1000;

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: "http://localhost:3000",
});

// ---- HEALTH ----
fastify.get("/", async () => ({ message: "Žandar server radi! 🃏" }));
fastify.get("/health", async () => ({ status: "ok", timestamp: Date.now() }));

// ---- ROOMS ----

type CreateRoomBody = {
  displayName: string;
  playerCount: 2 | 3 | 4;
  targetScore?: number;
};

fastify.post<{ Body: CreateRoomBody }>(
  "/api/rooms",
  async (request, reply) => {
    const { displayName, playerCount, targetScore = 21 } = request.body;

    if (!displayName || displayName.trim().length === 0) {
      return reply.code(400).send({ error: "displayName je obavezan" });
    }
    if (![2, 3, 4].includes(playerCount)) {
      return reply
        .code(400)
        .send({ error: "playerCount mora biti 2, 3 ili 4" });
    }

    const roomId = createRoomId();
    const playerId = createPlayerId();
    const sessionToken = createSessionToken();

    const rulesConfig = createRulesConfig(playerCount);
    rulesConfig.targetScore = targetScore;

    const hostPlayer: Player = {
      id: playerId,
      displayName: displayName.trim(),
      seatIndex: 0,
      connectionStatus: "connected",
      isHost: true,
      consecutiveAutoPlays: 0,
    };
    if (playerCount === 4) {
      hostPlayer.teamId = 0;
    }

    const room: LobbyRoom = {
      id: roomId,
      status: "waiting",
      hostPlayerId: playerId,
      players: [hostPlayer],
      rulesConfig,
      gameState: null,
      sessionTokens: new Map([[playerId, hashToken(sessionToken)]]),
      joinRequests: new Map(),
      createdAt: Date.now(),
    };

    storeRoom(room);

    return {
      roomId,
      playerId,
      playerSessionToken: sessionToken,
      inviteUrl: `http://localhost:3000/room/${roomId}`,
    };
  },
);

fastify.get<{ Params: { roomId: string } }>(
  "/api/rooms/:roomId",
  async (request, reply) => {
    const { roomId } = request.params;
    const room = getRoom(roomId);
    if (!room) {
      return reply.code(404).send({ error: "Soba ne postoji" });
    }
    return {
      id: room.id,
      status: room.status,
      players: room.players.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        seatIndex: p.seatIndex,
        isHost: p.isHost,
        teamId: p.teamId,
      })),
      playerCount: room.rulesConfig.playerCount,
      targetScore: room.rulesConfig.targetScore,
      slotsAvailable: room.rulesConfig.playerCount - room.players.length,
    };
  },
);

// ---- JOIN REQUESTS ----

type JoinRequestBody = { displayName: string };

fastify.post<{ Params: { roomId: string }; Body: JoinRequestBody }>(
  "/api/rooms/:roomId/join-request",
  async (request, reply) => {
    const { roomId } = request.params;
    const { displayName } = request.body;

    if (!displayName || displayName.trim().length === 0) {
      return reply.code(400).send({ error: "displayName je obavezan" });
    }

    const room = getRoom(roomId);
    if (!room) {
      return reply.code(404).send({ error: "Soba ne postoji" });
    }

    expireOldRequests(room);

    const pendingCount = Array.from(room.joinRequests.values()).filter(
      (r) => r.status === "pending",
    ).length;
    if (
      room.players.length + pendingCount >=
      room.rulesConfig.playerCount
    ) {
      return reply
        .code(409)
        .send({ error: "Soba je puna ili sva mjesta na čekanju" });
    }

    const requestId = createRequestId();
    const now = Date.now();
    const joinReq: JoinRequest = {
      id: requestId,
      displayName: displayName.trim(),
      status: "pending",
      createdAt: now,
      expiresAt: now + JOIN_REQUEST_TTL_MS,
    };

    room.joinRequests.set(requestId, joinReq);

    io.to(roomId).emit("room:joinRequested", {
      requestId,
      displayName: joinReq.displayName,
      expiresAt: joinReq.expiresAt,
    });

    fastify.log.info(
      `→ Join request ${requestId} (${joinReq.displayName}) za sobu ${roomId}`,
    );

    return {
      requestId,
      expiresAt: joinReq.expiresAt,
    };
  },
);

fastify.get<{
  Params: { roomId: string; requestId: string };
}>(
  "/api/rooms/:roomId/join-request/:requestId",
  async (request, reply) => {
    const { roomId, requestId } = request.params;

    const room = getRoom(roomId);
    if (!room) {
      return reply.code(404).send({ error: "Soba ne postoji" });
    }

    expireOldRequests(room);

    const req = room.joinRequests.get(requestId);
    if (!req) {
      return reply.code(404).send({ error: "Zahtjev ne postoji" });
    }

    if (req.status === "approved" && req.playerId && req.sessionToken) {
      return {
        status: "approved",
        playerId: req.playerId,
        sessionToken: req.sessionToken,
      };
    }
    return { status: req.status };
  },
);

type ApproveBody = {
  requestId: string;
  hostPlayerId: string;
  hostSessionToken: string;
};

fastify.post<{ Params: { roomId: string }; Body: ApproveBody }>(
  "/api/rooms/:roomId/approve",
  async (request, reply) => {
    const { roomId } = request.params;
    const { requestId, hostPlayerId, hostSessionToken } = request.body;

    const room = getRoom(roomId);
    if (!room) {
      return reply.code(404).send({ error: "Soba ne postoji" });
    }
    if (!verifyToken(room, hostPlayerId, hostSessionToken)) {
      return reply.code(401).send({ error: "Nevalidan token" });
    }
    if (hostPlayerId !== room.hostPlayerId) {
      return reply.code(403).send({ error: "Nisi host" });
    }

    expireOldRequests(room);
    const req = room.joinRequests.get(requestId);
    if (!req) {
      return reply.code(404).send({ error: "Zahtjev ne postoji" });
    }
    if (req.status !== "pending") {
      return reply
        .code(409)
        .send({ error: `Zahtjev nije pending: ${req.status}` });
    }
    if (room.players.length >= room.rulesConfig.playerCount) {
      return reply.code(409).send({ error: "Soba je puna" });
    }

    const playerId = createPlayerId();
    const sessionToken = createSessionToken();
    const seatIndex = room.players.length;

    const newPlayer: Player = {
      id: playerId,
      displayName: req.displayName,
      seatIndex,
      connectionStatus: "connected",
      isHost: false,
      consecutiveAutoPlays: 0,
    };
    if (room.rulesConfig.playerCount === 4) {
      newPlayer.teamId = seatIndex % 2;
    }

    room.players.push(newPlayer);
    room.sessionTokens.set(playerId, hashToken(sessionToken));

    req.status = "approved";
    req.playerId = playerId;
    req.sessionToken = sessionToken;

    io.to(roomId).emit("room:update");

    fastify.log.info(
      `→ Approved ${requestId} → player ${playerId} (${req.displayName})`,
    );

    return { success: true };
  },
);

type RejectBody = {
  requestId: string;
  hostPlayerId: string;
  hostSessionToken: string;
};

fastify.post<{ Params: { roomId: string }; Body: RejectBody }>(
  "/api/rooms/:roomId/reject",
  async (request, reply) => {
    const { roomId } = request.params;
    const { requestId, hostPlayerId, hostSessionToken } = request.body;

    const room = getRoom(roomId);
    if (!room) {
      return reply.code(404).send({ error: "Soba ne postoji" });
    }
    if (!verifyToken(room, hostPlayerId, hostSessionToken)) {
      return reply.code(401).send({ error: "Nevalidan token" });
    }
    if (hostPlayerId !== room.hostPlayerId) {
      return reply.code(403).send({ error: "Nisi host" });
    }

    const req = room.joinRequests.get(requestId);
    if (!req) {
      return reply.code(404).send({ error: "Zahtjev ne postoji" });
    }
    if (req.status !== "pending") {
      return reply
        .code(409)
        .send({ error: `Zahtjev nije pending: ${req.status}` });
    }

    req.status = "rejected";
    fastify.log.info(`→ Rejected ${requestId} (${req.displayName})`);

    return { success: true };
  },
);

fastify.get<{
  Params: { roomId: string };
  Querystring: { playerId: string; token: string };
}>("/api/rooms/:roomId/join-requests", async (request, reply) => {
  const { roomId } = request.params;
  const { playerId, token } = request.query;

  const room = getRoom(roomId);
  if (!room) {
    return reply.code(404).send({ error: "Soba ne postoji" });
  }
  if (!verifyToken(room, playerId, token)) {
    return reply.code(401).send({ error: "Nevalidan token" });
  }
  if (playerId !== room.hostPlayerId) {
    return reply.code(403).send({ error: "Nisi host" });
  }

  expireOldRequests(room);

  const pending = Array.from(room.joinRequests.values())
    .filter((r) => r.status === "pending")
    .map((r) => ({
      id: r.id,
      displayName: r.displayName,
      expiresAt: r.expiresAt,
    }));

  return { pending };
});

// ---- SOCKET.IO ----

await fastify.ready();

const io = new SocketIOServer(fastify.server, {
  cors: { origin: "http://localhost:3000" },
});

type SubscribePayload = {
  roomId: string;
  playerId: string;
  sessionToken: string;
};

io.on("connection", (socket) => {
  fastify.log.info(`✓ Socket connected: ${socket.id}`);

  socket.on(
    "room:subscribe",
    (
      payload: SubscribePayload,
      ack?: (res: { ok: boolean; error?: string }) => void,
    ) => {
      const { roomId, playerId, sessionToken } = payload;

      const room = getRoom(roomId);
      if (!room) {
        ack?.({ ok: false, error: "ROOM_NOT_FOUND" });
        return;
      }
      if (!verifyToken(room, playerId, sessionToken)) {
        ack?.({ ok: false, error: "INVALID_TOKEN" });
        return;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.playerId = playerId;

      fastify.log.info(
        `→ Player ${playerId} subscribed to room ${roomId}`,
      );
      ack?.({ ok: true });
    },
  );

  socket.on("disconnect", (reason) => {
    fastify.log.info(
      `✗ Socket disconnected: ${socket.id} (${reason})`,
    );
  });
});

try {
  await fastify.listen({ port: 3001, host: "0.0.0.0" });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}