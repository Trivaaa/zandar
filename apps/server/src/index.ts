import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server as SocketIOServer } from "socket.io";
import {
  applyMove,
  autoPlay,
  createInitialGameState,
  createRulesConfig,
} from "@zandar/game-core";
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
import { buildPrivateGameStateView } from "./gameStateView";

const JOIN_REQUEST_TTL_MS = 2 * 60 * 1000;
const REACTION_COOLDOWN_MS = 2000;
const VALID_REACTIONS = [
  "laugh",
  "wow",
  "fire",
  "clap",
  "cry",
  "angry",
  "thinking",
  "respect",
] as const;

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
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
type KickBody = {
  playerId: string;
  hostPlayerId: string;
  hostSessionToken: string;
};

fastify.post<{ Params: { roomId: string }; Body: KickBody }>(
  "/api/rooms/:roomId/kick",
  async (request, reply) => {
    const { roomId } = request.params;
    const { playerId, hostPlayerId, hostSessionToken } = request.body;

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
    if (room.status !== "waiting") {
      return reply
        .code(409)
        .send({ error: "Kick je dozvoljen samo prije start-a igre" });
    }
    if (playerId === room.hostPlayerId) {
      return reply.code(400).send({ error: "Ne možeš kick-ovati sebe" });
    }

    const target = room.players.find((p) => p.id === playerId);
    if (!target) {
      return reply.code(404).send({ error: "Igrač ne postoji" });
    }

    // Notify the kicked player via socket
    const socketsInRoom = await io.in(roomId).fetchSockets();
    for (const socket of socketsInRoom) {
      if (socket.data.playerId === playerId) {
        socket.emit("room:kicked", {
          reason: "Host te je izbacio iz sobe.",
        });
        socket.leave(roomId);
        break;
      }
    }

    // Remove from room and renumber seats
    room.players = room.players.filter((p) => p.id !== playerId);
    room.sessionTokens.delete(playerId);
    room.players.forEach((p, idx) => {
      p.seatIndex = idx;
      if (room.rulesConfig.playerCount === 4) {
        p.teamId = idx % 2;
      }
    });

    io.to(roomId).emit("room:update");

    fastify.log.info(
      `→ Kicked ${playerId} (${target.displayName}) from room ${roomId}`,
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

// ---- START GAME ----

type StartBody = {
  playerId: string;
  sessionToken: string;
};

fastify.post<{ Params: { roomId: string }; Body: StartBody }>(
  "/api/rooms/:roomId/start",
  async (request, reply) => {
    const { roomId } = request.params;
    const { playerId, sessionToken } = request.body;

    const room = getRoom(roomId);
    if (!room) {
      return reply.code(404).send({ error: "Soba ne postoji" });
    }
    if (!verifyToken(room, playerId, sessionToken)) {
      return reply.code(401).send({ error: "Nevalidan token" });
    }
    if (playerId !== room.hostPlayerId) {
      return reply
        .code(403)
        .send({ error: "Samo host može pokrenuti igru" });
    }
    if (room.status !== "waiting") {
      return reply
        .code(409)
        .send({ error: "Igra je već pokrenuta ili završena" });
    }
    if (room.players.length !== room.rulesConfig.playerCount) {
      return reply.code(409).send({
        error: `Treba ${room.rulesConfig.playerCount} igrača (ima ${room.players.length})`,
      });
    }

    const gameState = createInitialGameState({
      roomId,
      matchId: roomId,
      players: room.players,
      dealerPlayerId: room.hostPlayerId,
      rulesConfig: room.rulesConfig,
    });

    room.gameState = gameState;
    room.status = "playing";

    await broadcastGameState(roomId);
    fastify.log.info(`→ Game started in room ${roomId}`);

    return { success: true };
  },
);

// ---- SOCKET.IO ----

await fastify.ready();

const io = new SocketIOServer(fastify.server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  },
});

type SubscribePayload = {
  roomId: string;
  playerId: string;
  sessionToken: string;
};

type PlayCardPayload = {
  cardId: string;
  selectedCaptureCardIds: string[];
  clientMoveId: string;
  clientKnownStateVersion: number;
};

type ReactionPayload = { type: string };

const lastReactionAt = new Map<string, number>();

// ---- TURN TIMERS ----
// Mapa roomId → timeout handle. Reset-uje se na svakom broadcast-u stanja.
const turnTimers = new Map<string, NodeJS.Timeout>();
// Mapa roomId → timestamp kad ističe turn (za client UI)
const turnDeadlines = new Map<string, number>();

// ---- DISCONNECT TIMERS ----
// playerId → timeout. Posle 2 min disconnect-a partija ide u abandoned.
const disconnectTimers = new Map<string, NodeJS.Timeout>();
const ABANDON_TIMEOUT_MS = 2 * 60 * 1000;

function clearTurnTimer(roomId: string): void {
  const timer = turnTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    turnTimers.delete(roomId);
  }
  turnDeadlines.delete(roomId);
}

function startTurnTimer(roomId: string): void {
  clearTurnTimer(roomId);

  const room = getRoom(roomId);
  if (!room?.gameState) return;
  if (room.gameState.phase !== "playing") return;

  const timeoutMs = room.gameState.rulesConfig.turnTimeoutSeconds * 1000;
  const deadline = Date.now() + timeoutMs;
  turnDeadlines.set(roomId, deadline);

  const timer = setTimeout(() => {
    void handleTurnTimeout(roomId);
  }, timeoutMs);

  turnTimers.set(roomId, timer);
}

async function handlePlayerDisconnect(
  roomId: string,
  playerId: string,
): Promise<void> {
  // Provjeri ima li drugih aktivnih socket-a za ovog igrača (multi-tab)
  const sockets = await io.in(roomId).fetchSockets();
  const stillConnected = sockets.some((s) => s.data.playerId === playerId);
  if (stillConnected) return;

  const room = getRoom(roomId);
  if (!room?.gameState) return;

  const player = room.gameState.players.find((p) => p.id === playerId);
  if (!player) return;
  if (player.connectionStatus === "abandoned") return;

  player.connectionStatus = "reconnecting";
  await broadcastGameState(roomId);
  fastify.log.info(`📶 Player ${playerId} reconnecting...`);

  const existing = disconnectTimers.get(playerId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    const room = getRoom(roomId);
    if (!room?.gameState) return;
    const p = room.gameState.players.find((p) => p.id === playerId);
    if (!p || p.connectionStatus !== "reconnecting") return;

    p.connectionStatus = "abandoned";
    room.gameState.phase = "abandoned";
    await broadcastGameState(roomId);
    fastify.log.info(`⚠ Match abandoned: ${playerId} did not return`);
    disconnectTimers.delete(playerId);
  }, ABANDON_TIMEOUT_MS);

  disconnectTimers.set(playerId, timer);
}

async function handleTurnTimeout(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room?.gameState) return;
  if (room.gameState.phase !== "playing") return;

  const currentPlayerId = room.gameState.currentPlayerId;
  const player = room.gameState.players.find((p) => p.id === currentPlayerId);
  if (!player) return;

  try {
    autoPlay(room.gameState);

    fastify.log.info(
      `⏱ Auto-play in room ${roomId} for player ${currentPlayerId} (${player.displayName})`,
    );

    io.to(roomId).emit("game:autoPlay", {
      playerId: currentPlayerId,
      displayName: player.displayName,
    });

    await broadcastGameState(roomId);
  } catch (err) {
    fastify.log.error(`Auto-play failed in room ${roomId}: ${err}`);
  }
}

async function broadcastGameState(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room || !room.gameState) return;
  const socketsInRoom = await io.in(roomId).fetchSockets();

  const deadline = turnDeadlines.get(roomId);

  for (const socket of socketsInRoom) {
    const viewerPlayerId = socket.data.playerId;
    if (typeof viewerPlayerId !== "string") continue;
    const privateState = buildPrivateGameStateView(
      room.gameState,
      viewerPlayerId,
    );
    // Attach turn deadline (kao server timestamp)
    socket.emit("game:state", {
      ...privateState,
      turnDeadline: deadline,
    });
  }

  // Manage timer based on phase
  if (room.gameState.phase === "playing") {
    startTurnTimer(roomId);
  } else {
    clearTurnTimer(roomId);
  }
}

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

      // Clear pending disconnect timer (ako se vraća)
      const existingTimer = disconnectTimers.get(playerId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        disconnectTimers.delete(playerId);
      }
      // Ako je bio reconnecting, vrati na connected
      if (room.gameState) {
        const player = room.gameState.players.find((p) => p.id === playerId);
        if (player && player.connectionStatus === "reconnecting") {
          player.connectionStatus = "connected";
          fastify.log.info(`✓ Player ${playerId} reconnected`);
          // broadcast će ići za nekoliko linija dole
        }
      }

      if (room.gameState) {
        const deadline = turnDeadlines.get(roomId);
        const privateState = buildPrivateGameStateView(
          room.gameState,
          playerId,
        );
        socket.emit("game:state", {
          ...privateState,
          turnDeadline: deadline,
        });
      }
    },
  );

  socket.on(
    "game:playCard",
    async (
      payload: PlayCardPayload,
      ack?: (res: { ok: boolean; error?: string }) => void,
    ) => {
      const playerId = socket.data.playerId;
      const roomId = socket.data.roomId;
      if (typeof playerId !== "string" || typeof roomId !== "string") {
        ack?.({ ok: false, error: "NOT_SUBSCRIBED" });
        return;
      }

      const room = getRoom(roomId);
      if (!room) {
        ack?.({ ok: false, error: "ROOM_NOT_FOUND" });
        return;
      }
      if (!room.gameState) {
        ack?.({ ok: false, error: "GAME_NOT_STARTED" });
        return;
      }

      try {
        applyMove(room.gameState, {
          roomId,
          playerId,
          cardId: payload.cardId,
          selectedCaptureCardIds: payload.selectedCaptureCardIds,
          clientMoveId: payload.clientMoveId,
          clientKnownStateVersion: payload.clientKnownStateVersion,
        });

        await broadcastGameState(roomId);
        ack?.({ ok: true });
        fastify.log.info(
          `→ Move applied: ${playerId} played ${payload.cardId}`,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        ack?.({ ok: false, error: message });
        fastify.log.warn(`✗ Move rejected: ${message}`);
      }
    },
  );

  socket.on(
    "game:nextHand",
    async (
      _payload: unknown,
      ack?: (res: { ok: boolean; error?: string }) => void,
    ) => {
      const playerId = socket.data.playerId;
      const roomId = socket.data.roomId;
      if (typeof playerId !== "string" || typeof roomId !== "string") {
        ack?.({ ok: false, error: "NOT_SUBSCRIBED" });
        return;
      }

      const room = getRoom(roomId);
      if (!room || !room.gameState) {
        ack?.({ ok: false, error: "GAME_NOT_STARTED" });
        return;
      }
      if (playerId !== room.hostPlayerId) {
        ack?.({ ok: false, error: "NOT_HOST" });
        return;
      }
      if (room.gameState.phase !== "hand_finished") {
        ack?.({ ok: false, error: "INVALID_PHASE" });
        return;
      }

      const oldState = room.gameState;
      const oldDealerIdx = oldState.players.findIndex(
        (p) => p.id === oldState.dealerPlayerId,
      );
      const newDealerIdx =
        (oldDealerIdx + 1) % oldState.players.length;
      const newDealerId = oldState.players[newDealerIdx]!.id;

      const newState = createInitialGameState({
        roomId: oldState.roomId,
        matchId: oldState.matchId,
        players: oldState.players,
        dealerPlayerId: newDealerId,
        rulesConfig: oldState.rulesConfig,
      });

      newState.matchScore = { ...oldState.matchScore };
      newState.handNumber = oldState.handNumber + 1;
      newState.handScores = [...oldState.handScores];

      room.gameState = newState;

      await broadcastGameState(roomId);
      ack?.({ ok: true });
      fastify.log.info(
        `→ Next hand started in room ${roomId} (hand #${newState.handNumber}, dealer ${newDealerId})`,
      );
    },
  );

  socket.on(
    "game:rematch",
    async (
      _payload: unknown,
      ack?: (res: { ok: boolean; error?: string }) => void,
    ) => {
      const playerId = socket.data.playerId;
      const roomId = socket.data.roomId;
      if (typeof playerId !== "string" || typeof roomId !== "string") {
        ack?.({ ok: false, error: "NOT_SUBSCRIBED" });
        return;
      }

      const room = getRoom(roomId);
      if (!room || !room.gameState) {
        ack?.({ ok: false, error: "GAME_NOT_STARTED" });
        return;
      }
      if (playerId !== room.hostPlayerId) {
        ack?.({ ok: false, error: "NOT_HOST" });
        return;
      }
      if (room.gameState.phase !== "match_finished") {
        ack?.({ ok: false, error: "INVALID_PHASE" });
        return;
      }

      const oldState = room.gameState;
      const oldDealerIdx = oldState.players.findIndex(
        (p) => p.id === oldState.dealerPlayerId,
      );
      const newDealerIdx =
        (oldDealerIdx + 1) % oldState.players.length;
      const newDealerId = oldState.players[newDealerIdx]!.id;

      const newState = createInitialGameState({
        roomId: oldState.roomId,
        matchId: `${oldState.matchId}-rematch-${Date.now()}`,
        players: oldState.players,
        dealerPlayerId: newDealerId,
        rulesConfig: oldState.rulesConfig,
      });

      room.gameState = newState;
      room.status = "playing";

      await broadcastGameState(roomId);
      ack?.({ ok: true });
      fastify.log.info(`→ Rematch started in room ${roomId}`);
    },
  );

  socket.on(
    "game:react",
    (
      payload: ReactionPayload,
      ack?: (res: { ok: boolean; error?: string }) => void,
    ) => {
      const playerId = socket.data.playerId;
      const roomId = socket.data.roomId;
      if (typeof playerId !== "string" || typeof roomId !== "string") {
        ack?.({ ok: false, error: "NOT_SUBSCRIBED" });
        return;
      }

      if (
        !payload.type ||
        !(VALID_REACTIONS as readonly string[]).includes(payload.type)
      ) {
        ack?.({ ok: false, error: "INVALID_REACTION" });
        return;
      }

      const now = Date.now();
      const last = lastReactionAt.get(playerId) ?? 0;
      if (now - last < REACTION_COOLDOWN_MS) {
        ack?.({ ok: false, error: "REACTION_COOLDOWN" });
        return;
      }
      lastReactionAt.set(playerId, now);

      io.to(roomId).emit("game:reaction", {
        playerId,
        type: payload.type,
        timestamp: now,
      });

      ack?.({ ok: true });
    },
  );

  socket.on("disconnect", (reason) => {
    fastify.log.info(
      `✗ Socket disconnected: ${socket.id} (${reason})`,
    );
    const playerId = socket.data.playerId;
    const roomId = socket.data.roomId;
    if (typeof playerId === "string" && typeof roomId === "string") {
      setTimeout(() => {
        handlePlayerDisconnect(roomId, playerId).catch((err) =>
          fastify.log.error(`Disconnect handler error: ${err}`),
        );
      }, 100);
    }
  });
});

try {
  await fastify.listen({
    port: parseInt(process.env.PORT || "3001", 10),
    host: "0.0.0.0",
  });
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
