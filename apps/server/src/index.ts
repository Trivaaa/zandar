import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server as SocketIOServer } from "socket.io";
import {
  applyMove,
  autoPlay,
  createInitialGameState,
  createRulesConfig,
  DEFAULT_BOT_CONFIGS,
  generateTableIdentities,
  selectBotMove,
} from "@zandar/game-core";
import type { BotMoveTiming, BotSkillTier, Player } from "@zandar/shared-types";
import {
  createPlayerId,
  createRequestId,
  createRoomId,
  createSessionToken,
  expireOldRequests,
  getAllRooms,
  getRoom,
  hashToken,
  hydrateRooms,
  persistRoom,
  startRoomSweeper,
  storeRoom,
  sweepStaleRooms,
  verifyToken,
  type JoinRequest,
  type LobbyRoom,
} from "./rooms";
import { buildPrivateGameStateView } from "./gameStateView";
import {
  connectedHumans,
  hasReconnectingHuman,
  nextPhaseAfterGrace,
  resolveVote,
  resolveVoteTimeout,
} from "./pause";
import { posthog, track } from "./lib/posthog";

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

const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:3000"
).split(",").map((o) => o.trim());

await fastify.register(cors, {
  origin: allowedOrigins,
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
      isPublic: room.isPublic ?? false,
      createdAt: room.createdAt,
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
      // Room-level zastavica (NE per-player isBot) — host UI prikazuje toggle.
      botFill: room.botFill ?? false,
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

    // Ljudi imaju prioritet nad botovima: kad je bot-fill uključen, oslobodi
    // bot-sjedišta da bi novi čovjek mogao da uđe (kasnije se opet popuni).
    if (room.botFill) removeBotsFromRoom(room);

    if (room.players.length >= room.rulesConfig.playerCount) {
      if (room.botFill) fillSeatsWithBots(room); // vrati botove ako nije bilo mjesta
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

    // Bot-fill ON → popuni preostala prazna mjesta nazad botovima (soba ostaje puna).
    if (room.botFill) fillSeatsWithBots(room);

    req.status = "approved";
    req.playerId = playerId;
    req.sessionToken = sessionToken;

    persistRoom(room); // novi igrač u lobby-ju → preživi restart

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

    // Bot-fill ON → oslobođeno mjesto se opet popuni botom.
    if (room.botFill) fillSeatsWithBots(room);

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

// ---- QUICK PLAY ----

type QuickPlayBody = {
  displayName: string;
  playerCount: 2 | 3 | 4;
  targetScore?: number;
  guestId?: string; // za §43 atribuciju (PostHog distinctId)
};

fastify.post<{ Body: QuickPlayBody }>(
  "/api/quickplay",
  async (request, reply) => {
    const { displayName, playerCount, targetScore = 21, guestId } = request.body;

    if (!displayName || displayName.trim().length === 0) {
      return reply.code(400).send({ error: "displayName je obavezan" });
    }
    if (![2, 3, 4].includes(playerCount)) {
      return reply.code(400).send({ error: "playerCount mora biti 2, 3 ili 4" });
    }

    const matchStartedAt = Date.now();
    track(guestId, "quickplay_requested", { playerCount, targetScore });

    const playerId = createPlayerId();
    const sessionToken = createSessionToken();

    // Pokušaj matchmaking: nađi javnu sobu koja čeka igrače
    const existingRoom = getAllRooms().find(
      (r) =>
        r.isPublic &&
        r.status === "waiting" &&
        r.rulesConfig.playerCount === playerCount &&
        r.rulesConfig.targetScore === targetScore &&
        r.players.length < r.rulesConfig.playerCount,
    );

    if (existingRoom) {
      // Pridruži se postojećoj sobi
      const seatIndex = existingRoom.players.length;
      const newPlayer: Player = {
        id: playerId,
        displayName: displayName.trim(),
        seatIndex,
        teamId: playerCount === 4 ? seatIndex % 2 : undefined,
        connectionStatus: "connected",
        isHost: false,
        consecutiveAutoPlays: 0,
      };
      existingRoom.players.push(newPlayer);
      existingRoom.sessionTokens.set(playerId, hashToken(sessionToken));

      io.to(existingRoom.id).emit("room:update");
      fastify.log.info(`🤝 Matched ${playerId} into room ${existingRoom.id}`);

      if (existingRoom.players.length >= existingRoom.rulesConfig.playerCount) {
        // Soba puna — pokreni odmah
        startBotGame(existingRoom);
        await broadcastGameState(existingRoom.id);
        fastify.log.info(`▶ Room ${existingRoom.id} full, game started`);
      }

      track(guestId, "quickplay_matched", {
        matchType: "joined_existing",
        waitMs: Date.now() - matchStartedAt,
        ...tableComposition(existingRoom),
      });

      return { roomId: existingRoom.id, playerId, playerSessionToken: sessionToken };
    }

    // Nema odgovarajuće sobe — kreiraj novu, popuni botovima i startaj odmah (§49.2 fake matching)
    const roomId = createRoomId();
    const rulesConfig = createRulesConfig(playerCount);
    rulesConfig.targetScore = targetScore;

    const humanPlayer: Player = {
      id: playerId,
      displayName: displayName.trim(),
      seatIndex: 0,
      teamId: playerCount === 4 ? 0 : undefined,
      connectionStatus: "connected",
      isHost: true,
      consecutiveAutoPlays: 0,
    };

    const room: LobbyRoom = {
      id: roomId,
      status: "waiting",
      hostPlayerId: playerId,
      players: [humanPlayer],
      rulesConfig,
      gameState: null,
      sessionTokens: new Map([[playerId, hashToken(sessionToken)]]),
      joinRequests: new Map(),
      createdAt: Date.now(),
      isPublic: true,
    };

    const botsToFill = rulesConfig.playerCount - room.players.length;
    fillSeatsWithBots(room, 2);
    startBotGame(room);
    storeRoom(room);

    track(guestId, "bot_seat_filled", { count: botsToFill, tier: 2 });
    track(guestId, "quickplay_matched", {
      matchType: "new_room",
      waitMs: Date.now() - matchStartedAt,
      ...tableComposition(room),
    });

    fastify.log.info(`🎲 Quick Play room ${roomId} created and started (${playerCount}P)`);
    return { roomId, playerId, playerSessionToken: sessionToken };
  },
);

// Single-player endpoint uklonjen u v3.2 — Quick Play sa lakim botovima je dovoljan (§37.5)

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
    const sockets = await io.in(roomId).fetchSockets();
    const hostSocket = sockets.find((s) => s.data.playerId === room.hostPlayerId);
    const guestId = hostSocket?.data.guestId ?? null;
    track(guestId, "game_started", {
      roomId,
      matchId: room.gameState.matchId,
      playerCount: room.gameState.players.length,
      targetScore: room.gameState.targetScore,
      isPublic: room.isPublic ?? false,
      ...tableComposition(room.gameState),
    });
    fastify.log.info(`→ Game started in room ${roomId}`);

    return { success: true };
  },
);

// ---- HOST BOT-FILL (C3) ----

type BotFillBody = {
  playerId: string;
  sessionToken: string;
  enabled: boolean;
};

fastify.post<{ Params: { roomId: string }; Body: BotFillBody }>(
  "/api/rooms/:roomId/bot-fill",
  async (request, reply) => {
    const { roomId } = request.params;
    const { playerId, sessionToken, enabled } = request.body;

    const room = getRoom(roomId);
    if (!room) {
      return reply.code(404).send({ error: "Soba ne postoji" });
    }
    if (!verifyToken(room, playerId, sessionToken)) {
      return reply.code(401).send({ error: "Nevalidan token" });
    }
    if (playerId !== room.hostPlayerId) {
      return reply.code(403).send({ error: "Samo host može popuniti botovima" });
    }
    if (room.status !== "waiting") {
      return reply
        .code(409)
        .send({ error: "Bot-fill je dozvoljen samo prije start-a igre" });
    }

    // Uvijek kreni od čistih (samo ljudi) sjedišta pa popuni ako je uključeno —
    // ljudi imaju prioritet, botovi popunjavaju ostatak.
    removeBotsFromRoom(room);
    if (enabled) fillSeatsWithBots(room);
    room.botFill = enabled;

    persistRoom(room);
    io.to(roomId).emit("room:update");

    fastify.log.info(
      `→ Bot-fill ${enabled ? "ON" : "OFF"} room ${roomId} (${room.players.length}/${room.rulesConfig.playerCount})`,
    );

    return { success: true, botFill: enabled, players: room.players.length };
  },
);

// ---- SOCKET.IO ----

await fastify.ready();

const io = new SocketIOServer(fastify.server, {
  cors: {
    origin: allowedOrigins,
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

// ---- PREKID PARTIJE (PRD v2 §32) ----
// playerId → timeout. Grace period: partija JOŠ NE staje, samo indikator na
// sjedištu. Tek po isteku ide pauza (ili odmah prekid ako nema drugog čovjeka).
const disconnectTimers = new Map<string, NodeJS.Timeout>();
// roomId → timeout. Pauza i glasanje su stanje SOBE, ne igrača — dvoje ljudi
// može otpasti a pauza je jedna.
const pauseTimers = new Map<string, NodeJS.Timeout>();

/**
 * Trajanja iz PRD §32. Override kroz env postoji zbog testiranja: pun tok na
 * default vrijednostima traje 3.5 minuta po prolazu, što ručnu provjeru čini
 * neupotrebljivom.
 */
const ms = (name: string, fallback: number): number => {
  const raw = process.env[name];
  const n = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};
const GRACE_MS = ms("GRACE_MS", 30 * 1000);
const PAUSE_MS = ms("PAUSE_MS", 2 * 60 * 1000);
const VOTE_MS = ms("VOTE_MS", 60 * 1000);
const WAIT_EXTENSION_MS = ms("WAIT_EXTENSION_MS", 5 * 60 * 1000);

// ---- BOT MOVE TIMERS ----
// roomId → timeout. Kad je bot na potezu, server interno odigra potez.
const botMoveTimers = new Map<string, NodeJS.Timeout>();

// Kašnjenje bot poteza po situaciji i tieru (§41.1). Globalni okviri (zahtjev):
//   firstMove 3–5s, normal 2.5–7s, lastCard 1.5–2.5s — randomizirano unutar benda.
// Tier zadržava "ličnost": tier 1 = impulsivan (brži kraj), tier 3 = promišljen
// (sporiji kraj), uvijek unutar globalnih okvira.
const BOT_MOVE_TIMING: Record<BotSkillTier, BotMoveTiming> = {
  1: {
    firstMove: { minMs: 3000, maxMs: 4000 },
    normal:    { minMs: 2500, maxMs: 5000 },
    lastCard:  { minMs: 1500, maxMs: 2000 },
  },
  2: {
    firstMove: { minMs: 3300, maxMs: 4500 },
    normal:    { minMs: 3000, maxMs: 6000 },
    lastCard:  { minMs: 1600, maxMs: 2200 },
  },
  3: {
    firstMove: { minMs: 3800, maxMs: 5000 },
    normal:    { minMs: 3500, maxMs: 7000 },
    lastCard:  { minMs: 1800, maxMs: 2500 },
  },
};

function clearBotTimer(roomId: string): void {
  const t = botMoveTimers.get(roomId);
  if (t) { clearTimeout(t); botMoveTimers.delete(roomId); }
}

function scheduleBotMove(roomId: string): void {
  if (botMoveTimers.has(roomId)) return; // već zakazan
  const room = getRoom(roomId);
  if (!room?.gameState) return;
  const pid = room.gameState.currentPlayerId;
  const player = room.gameState.players.find((p) => p.id === pid);
  if (!player?.isBot || !player.botProfile) return;

  // Tolerantno na stari, perzistirani oblik timing-a ({minMs,maxMs}) — sobe koje su
  // preživjele restart preko promjene oblika nemaju firstMove/normal/lastCard bendove.
  // Fallback na svježu tabelu po tieru da scheduleBotMove NIKAD ne baci (inače bot
  // zaglavi: rok je postavljen, a potez se ne zakaže).
  const timing =
    player.botProfile.timing?.normal != null
      ? player.botProfile.timing
      : BOT_MOVE_TIMING[player.botProfile.tier] ?? BOT_MOVE_TIMING[2];

  const handSize = room.gameState.hands[pid]?.length ?? 4;
  // Prvi potez nakon (re)dijeljenja: svi igrači imaju pune ruke (niko još nije
  // odigrao iz svježe podijeljene grupe) → botu treba malo da sagleda novi sto.
  const cardsPerDeal = room.gameState.rulesConfig.cardsPerDeal;
  const isFirstMoveOfDeal = room.gameState.players.every(
    (p) => (room.gameState!.hands[p.id]?.length ?? 0) === cardsPerDeal,
  );

  // Izbor benda po situaciji (§41.1). 1 karta ima prioritet — odluka je trivijalna.
  const band =
    handSize <= 1 ? timing.lastCard
    : isFirstMoveOfDeal ? timing.firstMove
    : timing.normal;

  const delay = band.minMs + Math.random() * (band.maxMs - band.minMs);
  const timer = setTimeout(() => void driveBotTurn(roomId), delay);
  botMoveTimers.set(roomId, timer);
}

async function driveBotTurn(roomId: string): Promise<void> {
  botMoveTimers.delete(roomId);
  const room = getRoom(roomId);
  if (!room?.gameState || room.gameState.phase !== "playing") return;

  const pid = room.gameState.currentPlayerId;
  const player = room.gameState.players.find((p) => p.id === pid);
  if (!player?.isBot || !player.botProfile) return;

  try {
    const config = DEFAULT_BOT_CONFIGS[player.botProfile.tier]!;
    const { cardId, selectedCaptureCardIds } = selectBotMove(
      room.gameState,
      pid,
      config,
    );
    applyMove(room.gameState, {
      roomId,
      playerId: pid,
      cardId,
      selectedCaptureCardIds,
      clientMoveId: `bot-${room.gameState.stateVersion}`,
      clientKnownStateVersion: room.gameState.stateVersion,
    });
    fastify.log.info(`🤖 Bot ${pid} (${player.displayName}) played ${cardId}`);

    // Reakcija na vlastiti potez (§41.2)
    const lastMove = room.gameState.moveHistory.at(-1);
    if (lastMove) {
      scheduleBotReaction(roomId, pid, player.botProfile.reactionProbability, lastMove.capturedCards, lastMove.playedCard);
    }

    await broadcastGameState(roomId);
  } catch (err) {
    // Bot potez pao (npr. neočekivan state) — NE smije zaglaviti partiju jer bot
    // nema AFK timeout. Odigraj fallback auto-play (garantovano legalan) i rebroadcast.
    fastify.log.error(`Bot move failed in room ${roomId}: ${err} — autoplay fallback`);
    try {
      autoPlay(room.gameState);
      await broadcastGameState(roomId);
    } catch (err2) {
      fastify.log.error(`Bot autoplay fallback also failed in room ${roomId}: ${err2}`);
    }
  }
}

// ---- BOT REACTIONS (§41.2) ----

const BOT_REACTION_COOLDOWN_MS = 2000;

/**
 * Emituje reakciju jednog bota uz malo kašnjenje (da ne bude instant nakon poteza).
 * Poštuje isti 2s cooldown kao i ljudske reakcije.
 */
function emitBotReaction(
  roomId: string,
  botPlayerId: string,
  reactionType: string,
  delayMs = 600,
): void {
  const now = Date.now();
  const last = lastReactionAt.get(botPlayerId) ?? 0;
  if (now - last < BOT_REACTION_COOLDOWN_MS) return;
  lastReactionAt.set(botPlayerId, now + delayMs);

  setTimeout(() => {
    io.to(roomId).emit("game:reaction", {
      playerId: botPlayerId,
      type: reactionType,
      timestamp: Date.now(),
    });
  }, delayMs);
}

/**
 * Odlučuje da li i kako bot reaguje na vlastiti potez (§41.2):
 * - J sweep → 😮/🔥
 * - Kupio 2♣ ili 10♦ → 🔥
 * - Random (mala šansa) → 😂/🤔
 */
function scheduleBotReaction(
  roomId: string,
  botPlayerId: string,
  reactionProbability: number,
  capturedCards: import("@zandar/shared-types").Card[],
  playedCard: import("@zandar/shared-types").Card,
): void {
  const rand = Math.random();

  // J sweep
  if (playedCard.rank === "J" && capturedCards.length >= 2) {
    if (rand < reactionProbability * 2) {
      emitBotReaction(roomId, botPlayerId, rand < 0.5 ? "wow" : "fire");
      return;
    }
  }

  // Kupio 2♣ ili 10♦
  const gotBonus = capturedCards.some(
    (c) => c.id === "clubs-2" || c.id === "diamonds-10",
  );
  if (gotBonus && rand < reactionProbability) {
    emitBotReaction(roomId, botPlayerId, "fire");
    return;
  }

  // Nasumična reakcija (niska vjerovatnoća)
  if (rand < reactionProbability * 0.3) {
    emitBotReaction(roomId, botPlayerId, rand < 0.5 ? "laugh" : "thinking", 1200);
  }
}

/**
 * Bot gleda potez protivnika i reaguje (§41.2):
 * - Protivnik kupio 2♣ ili 10♦ → 😭
 * - Protivnik kupio puno karata (≥ 4) → 🙌
 */
function scheduleBotWatchReaction(
  roomId: string,
  capturedCards: import("@zandar/shared-types").Card[],
): void {
  const room = getRoom(roomId);
  if (!room?.gameState) return;

  const bots = room.gameState.players.filter((p) => p.isBot && p.botProfile);
  if (bots.length === 0) return;

  const lostBonus = capturedCards.some(
    (c) => c.id === "clubs-2" || c.id === "diamonds-10",
  );
  const bigCapture = capturedCards.length >= 4;

  if (!lostBonus && !bigCapture) return;

  // Nasumično jedan bot reaguje
  const reactor = bots[Math.floor(Math.random() * bots.length)]!;
  const prob = reactor.botProfile!.reactionProbability;

  if (lostBonus && Math.random() < prob * 1.5) {
    emitBotReaction(roomId, reactor.id, "cry", 800);
  } else if (bigCapture && Math.random() < prob) {
    emitBotReaction(roomId, reactor.id, "clap", 800);
  }
}

// ---- BOT HELPERS ----

function fillSeatsWithBots(
  room: LobbyRoom,
  tier: 1 | 2 | 3 = 2,
): void {
  const slots = room.rulesConfig.playerCount - room.players.length;
  if (slots <= 0) return;

  // Imena za stolom (ljudi + postojeći botovi) → izbjegni duplikate kod novih botova.
  const atTable = new Set(room.players.map((p) => p.displayName));
  const identities = generateTableIdentities(slots, atTable, () => Math.random());

  for (let i = 0; i < slots; i++) {
    const seatIndex = room.players.length;
    const identity = identities[i]!;
    const botPlayer: Player = {
      id: createPlayerId(),
      displayName: identity.displayName,
      seatIndex,
      teamId: room.rulesConfig.playerCount === 4 ? seatIndex % 2 : undefined,
      connectionStatus: "connected",
      isHost: false,
      consecutiveAutoPlays: 0,
      isBot: true,
      botProfile: {
        identity,
        tier,
        // Per-tier timing personality (§41.1): tier 1 = impulsivan, tier 3 = promišljen
        timing: BOT_MOVE_TIMING[tier],
        reactionProbability: 0.12,
      },
    };
    // Bots don't have session tokens — they are server-driven
    room.players.push(botPlayer);
  }
}

/**
 * Uklanja sve botove iz lobby sobe i renumerira sjedišta/timove (C3).
 * Botovi nemaju session token, pa nema dodatnog čišćenja. Samo prije start-a.
 */
function removeBotsFromRoom(room: LobbyRoom): void {
  room.players = room.players.filter((p) => !p.isBot);
  room.players.forEach((p, idx) => {
    p.seatIndex = idx;
    if (room.rulesConfig.playerCount === 4) p.teamId = idx % 2;
  });
}

function startBotGame(room: LobbyRoom): void {
  // J na početnom stolu → dealeru (award_to_dealer, iz rulesConfig). Špil smije
  // ostati neravnomjeran; ranije forsirani allow_on_table je ostavljao J na stolu.
  const gameState = createInitialGameState({
    roomId: room.id,
    matchId: room.id,
    players: room.players,
    dealerPlayerId: room.hostPlayerId,
    rulesConfig: room.rulesConfig,
  });
  room.gameState = gameState;
  room.status = "playing";
}

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

  // Grace period (§32.2): partija NE staje. Turn timer teče dalje i auto-play
  // važi — kratak prekid veze ne smije da zaustavi sto.
  const existing = disconnectTimers.get(playerId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(async () => {
    disconnectTimers.delete(playerId);
    const room = getRoom(roomId);
    if (!room?.gameState) return;
    const p = room.gameState.players.find((x) => x.id === playerId);
    if (!p || p.connectionStatus !== "reconnecting") return;

    // Neko drugi je već zaustavio sto (dva igrača otpala jedan za drugim) —
    // ne diraj rok koji već teče, inače bi drugi otpad produžio pauzu.
    const phase = room.gameState.phase;
    if (phase !== "playing") return;

    if (nextPhaseAfterGrace(room.gameState) === "abandoned") {
      // Sto pun botova: nema koga pitati, raspusti bez glasanja (PRD v3.1 #5).
      await enterAbandoned(roomId);
    } else {
      await enterPause(roomId);
    }
  }, GRACE_MS);

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

// ---- §43 ANALITIKA ----
// Guard da se hand/match završetak emituje JEDNOM (po matchId/handNumber).
// In-memory; resetuje se na restart (deploy) — dovoljno (eventi su idempotentni
// po ključu unutar jednog procesa).
const analyticsEmitted = new Set<string>();

/** Sastav stola: ljudi vs botovi + udio botova (za bot_seat_share i human-only kohortu). */
function tableComposition(gs: { players: { isBot?: boolean }[] }): {
  humansAtTable: number;
  botsAtTable: number;
  botSeatShare: number;
} {
  const total = gs.players.length;
  const botsAtTable = gs.players.filter((p) => p.isBot).length;
  return {
    humansAtTable: total - botsAtTable,
    botsAtTable,
    botSeatShare: total > 0 ? botsAtTable / total : 0,
  };
}

/** Da li je pile (igrač u 2P/3P, tim u 4P) datog igrača pobjednik meča. */
function isMatchWinner(
  gs: {
    players: { id: string; teamId?: number }[];
    matchScore: Record<string, number>;
  },
  viewerPlayerId: string,
): boolean {
  const me = gs.players.find((p) => p.id === viewerPlayerId);
  const myPile = me?.teamId != null ? `team-${me.teamId}` : viewerPlayerId;
  const entries = Object.entries(gs.matchScore);
  if (entries.length === 0) return false;
  const top = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  return top[0] === myPile;
}

/**
 * Emituj hand_finished / match_finished po svakom POVEZANOM ČOVJEKU (preskoči
 * botove), guard po matchId. Ovdje (ne u playCard handleru) da se uhvate i
 * partije koje je BOT završio (inače curi ~pola win-rate uzorka).
 */
function emitEndAnalytics(
  room: LobbyRoom,
  sockets: readonly { data: { playerId?: unknown; guestId?: unknown } }[],
): void {
  const gs = room.gameState;
  if (!gs) return;
  if (gs.phase !== "hand_finished" && gs.phase !== "match_finished") return;

  const isMatch = gs.phase === "match_finished";
  const key = isMatch
    ? `match:${gs.matchId}`
    : `hand:${gs.matchId}:${gs.handNumber}`;
  if (analyticsEmitted.has(key)) return;
  analyticsEmitted.add(key);

  const comp = tableComposition(gs);
  for (const s of sockets) {
    const pid = s.data.playerId;
    const guestId = s.data.guestId;
    if (typeof pid !== "string" || typeof guestId !== "string") continue;
    const player = gs.players.find((p) => p.id === pid);
    if (!player || player.isBot) continue;
    track(guestId, isMatch ? "match_finished" : "hand_finished", {
      roomId: room.id,
      matchId: gs.matchId,
      handNumber: gs.handNumber,
      playerCount: gs.players.length,
      isPublic: room.isPublic ?? false,
      ...comp,
      ...(isMatch ? { won: isMatchWinner(gs, pid) } : {}),
    });
  }
}

/**
 * Rutiranje timera + postavljanje roka poteza ZA PRIKAZ. Rok se šalje za SVAKI
 * aktivni potez — i čovjeka i bota (puni turnTimeoutSeconds). Bot odigra brzo
 * unutar toga (kao brz čovjek) → timer izgleda isto za sve (anti-leak).
 *
 * Zove se iz broadcastGameState (rok se čita POSLE rutiranja, pa je tačan za
 * aktuelni potez) i iz room:subscribe. Ovo drugo je bitno: svježa soba je
 * "playing" prije nego iko otvori socket, a broadcastGameState — jedino mjesto
 * koje je ranije postavljalo rok — do tada nije bio pozvan. Prvi state je zato
 * stizao bez `turnDeadline`, pa je klijent crtao pilulu na 0.
 */
function routeTurnTimers(roomId: string): void {
  const room = getRoom(roomId);
  if (!room?.gameState) return;
  const gs = room.gameState;

  if (gs.phase === "playing") {
    const currentPlayer = gs.players.find((p) => p.id === gs.currentPlayerId);
    if (currentPlayer?.isBot) {
      clearTurnTimer(roomId); // bot nema AFK timeout
      turnDeadlines.set(
        roomId,
        Date.now() + gs.rulesConfig.turnTimeoutSeconds * 1000,
      );
      scheduleBotMove(roomId);
    } else {
      clearBotTimer(roomId);
      startTurnTimer(roomId); // postavlja rok + AFK timeout
    }
  } else {
    clearTurnTimer(roomId);
    clearBotTimer(roomId);
    // Kraj ruke NE napreduje automatski — HOST pokreće sljedeću ruku dugmetom
    // ("Sljedeća ruka →" → game:nextHand). Ranije: auto-advance posle 4s u bot
    // partijama; uklonjeno na zahtjev (igrač kontroliše tempo).
  }
}

/* ------------------------------------------------------------------ *
 * Prekid partije (PRD v2 §32)
 *
 *  playing ──disconnect──▶ playing + "reconnecting"   (grace, partija teče)
 *          ──GRACE_MS───▶ paused_for_reconnect        (ili odmah abandoned
 *                                                      ako nema drugog čovjeka)
 *          ──PAUSE_MS───▶ abandon_vote
 *          ──VOTE_MS────▶ abandoned  (osim ako neko glasa "čekaj")
 *
 * Povratak igrača u bilo kojoj fazi osim `abandoned` vraća partiju u `playing`.
 * ------------------------------------------------------------------ */

function clearPauseTimer(roomId: string): void {
  const timer = pauseTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    pauseTimers.delete(roomId);
  }
}

/**
 * Naoruža timer prema `gs.pauseEndsAt`. Rok je APSOLUTAN, pa ovo radi i poslije
 * restarta servera: hidrirana soba nastavi odbrojavanje, a ako je rok u
 * međuvremenu prošao, tranzicija se izvrši odmah. Bez toga bi soba zaglavljena
 * u pauzi preživjela deploy i ostala zaglavljena zauvijek.
 */
function armPauseTimer(roomId: string): void {
  clearPauseTimer(roomId);
  const gs = getRoom(roomId)?.gameState;
  if (gs?.pauseEndsAt === undefined) return;
  const delay = Math.max(0, gs.pauseEndsAt - Date.now());
  pauseTimers.set(
    roomId,
    setTimeout(() => void onPauseDeadline(roomId), delay),
  );
}

async function onPauseDeadline(roomId: string): Promise<void> {
  pauseTimers.delete(roomId);
  const gs = getRoom(roomId)?.gameState;
  if (!gs) return;

  if (gs.phase === "paused_for_reconnect") {
    await enterVote(roomId);
    return;
  }
  if (gs.phase === "abandon_vote") {
    const voterIds = connectedHumans(gs.players).map((p) => p.id);
    if (resolveVoteTimeout(gs.abandonVotes, voterIds) === "extend") {
      await enterPause(roomId, WAIT_EXTENSION_MS);
    } else {
      await enterAbandoned(roomId);
    }
  }
}

async function enterPause(
  roomId: string,
  durationMs: number = PAUSE_MS,
): Promise<void> {
  const room = getRoom(roomId);
  if (!room?.gameState) return;
  const gs = room.gameState;

  const now = Date.now();
  gs.phase = "paused_for_reconnect";
  gs.pauseStartedAt = now;
  gs.pauseEndsAt = now + durationMs;
  delete gs.abandonVotes;

  await broadcastGameState(roomId); // gasi turn i bot timere (routeTurnTimers)
  armPauseTimer(roomId);
  fastify.log.info(`⏸ Room ${roomId} paused for ${Math.round(durationMs / 1000)}s`);
}

async function enterVote(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room?.gameState) return;
  const gs = room.gameState;

  const now = Date.now();
  gs.phase = "abandon_vote";
  gs.pauseStartedAt = now;
  gs.pauseEndsAt = now + VOTE_MS;
  gs.abandonVotes = {};

  await broadcastGameState(roomId);
  armPauseTimer(roomId);
  fastify.log.info(`🗳 Room ${roomId} abandon vote started`);
}

async function enterAbandoned(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room?.gameState) return;
  const gs = room.gameState;

  clearPauseTimer(roomId);
  for (const p of gs.players) {
    if (p.connectionStatus === "reconnecting") p.connectionStatus = "abandoned";
  }
  gs.phase = "abandoned";
  delete gs.pauseEndsAt;
  delete gs.pauseStartedAt;
  delete gs.abandonVotes;
  // Sweeper time dobija kraći TTL za završene sobe umjesto 12h idle.
  room.status = "finished";

  await broadcastGameState(roomId);
  fastify.log.info(`⚠ Match abandoned in room ${roomId}`);
}

async function resumeFromPause(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room?.gameState) return;
  const gs = room.gameState;
  if (gs.phase !== "paused_for_reconnect" && gs.phase !== "abandon_vote") return;

  clearPauseTimer(roomId);
  gs.phase = "playing";
  delete gs.pauseEndsAt;
  delete gs.pauseStartedAt;
  delete gs.abandonVotes;

  // routeTurnTimers unutar broadcast-a naoružava potez ispočetka — punih
  // turnTimeoutSeconds, ne ostatak. Namjerno velikodušno prema igraču koji se
  // upravo vratio.
  await broadcastGameState(roomId);
  fastify.log.info(`▶ Room ${roomId} resumed`);
}

async function broadcastGameState(roomId: string): Promise<void> {
  const room = getRoom(roomId);
  if (!room || !room.gameState) return;
  const gs = room.gameState;

  routeTurnTimers(roomId);

  const deadline =
    gs.phase === "playing" ? turnDeadlines.get(roomId) : undefined;
  const socketsInRoom = await io.in(roomId).fetchSockets();
  for (const socket of socketsInRoom) {
    const viewerPlayerId = socket.data.playerId;
    if (typeof viewerPlayerId !== "string") continue;
    const privateState = buildPrivateGameStateView(gs, viewerPlayerId);
    socket.emit("game:state", { ...privateState, turnDeadline: deadline });
  }

  // §43: hand/match završetak (jednom po matchId, po svakom čovjeku, sa sastavom
  // stola + `won`). Ovdje da uhvati i partije koje bot završi.
  emitEndAnalytics(room, socketsInRoom);

  // Perzistuj svjež state (debounce) — preživi restart servera.
  persistRoom(room);
}

io.on("connection", (socket) => {
  fastify.log.info(`✓ Socket connected: ${socket.id}`);

  socket.on(
    "room:subscribe",
    async (
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
      socket.data.guestId = socket.handshake.auth.guestId ?? null;

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

          // Vratio se posljednji koga smo čekali → partija se nastavlja.
          // Iz `abandoned` se NE vraća: taj meč je zaključan.
          if (!hasReconnectingHuman(room.gameState)) {
            await resumeFromPause(roomId);
          }
        }
      }

      if (room.gameState) {
        // Svježa soba jos nije prošla kroz broadcastGameState, pa rok ne postoji.
        // Rutiraj ovdje da prvi state koji igrač vidi već nosi turnDeadline.
        if (!turnDeadlines.has(roomId)) routeTurnTimers(roomId);
        const deadline = turnDeadlines.get(roomId);
        const privateState = buildPrivateGameStateView(
          room.gameState,
          playerId,
        );
        socket.emit("game:state", {
          ...privateState,
          turnDeadline: deadline,
        });

        // Kick off bot chain if it's a bot's turn and no timer is running yet
        if (room.gameState.phase === "playing") {
          const cp = room.gameState.players.find(
            (p) => p.id === room.gameState!.currentPlayerId,
          );
          if (cp?.isBot && !botMoveTimers.has(roomId)) {
            scheduleBotMove(roomId);
          }
        }
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

        // Bot gleda šta je čovjek uradio i možda reaguje (§41.2)
        const lastMove = room.gameState.moveHistory.at(-1);
        if (lastMove && lastMove.capturedCards.length > 0) {
          scheduleBotWatchReaction(roomId, lastMove.capturedCards);
        }

        // hand_finished / match_finished analitiku emituje broadcastGameState
        // (emitEndAnalytics) — hvata i partije koje bot završi, sa sastavom stola.
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

  // ---- PREKID: "Sačekaj još" (§32.3) ----
  // Bilo koji igrač za stolom, ne samo host — onaj ko zna da se Marko vraća
  // ne mora biti host da bi to rekao stolu.
  socket.on(
    "game:waitMore",
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
      if (!room?.gameState) {
        ack?.({ ok: false, error: "GAME_NOT_STARTED" });
        return;
      }
      if (room.gameState.phase !== "paused_for_reconnect") {
        ack?.({ ok: false, error: "INVALID_PHASE" });
        return;
      }

      await enterPause(roomId); // resetuje rok na pun PAUSE_MS
      ack?.({ ok: true });
      fastify.log.info(`⏸ Room ${roomId}: ${playerId} traži još vremena`);
    },
  );

  // ---- PREKID: glasanje (§32.4) ----
  socket.on(
    "game:abandonVote",
    async (
      payload: { vote?: unknown },
      ack?: (res: { ok: boolean; error?: string }) => void,
    ) => {
      const playerId = socket.data.playerId;
      const roomId = socket.data.roomId;
      if (typeof playerId !== "string" || typeof roomId !== "string") {
        ack?.({ ok: false, error: "NOT_SUBSCRIBED" });
        return;
      }
      const vote = payload?.vote;
      if (vote !== "wait" && vote !== "end") {
        ack?.({ ok: false, error: "INVALID_VOTE" });
        return;
      }
      const room = getRoom(roomId);
      if (!room?.gameState) {
        ack?.({ ok: false, error: "GAME_NOT_STARTED" });
        return;
      }
      const gs = room.gameState;
      if (gs.phase !== "abandon_vote") {
        ack?.({ ok: false, error: "INVALID_PHASE" });
        return;
      }

      gs.abandonVotes = { ...(gs.abandonVotes ?? {}), [playerId]: vote };
      ack?.({ ok: true });

      const voterIds = connectedHumans(gs.players).map((p) => p.id);
      const outcome = resolveVote(gs.abandonVotes, voterIds);
      if (outcome === "extend") {
        // Jedan glas za čekanje pobjeđuje sve ostale — prekid samo ako NIKO
        // ne želi da nastavi.
        await enterPause(roomId, WAIT_EXTENSION_MS);
      } else if (outcome === "end") {
        await enterAbandoned(roomId);
      } else {
        await broadcastGameState(roomId); // tally se vidi odmah
      }
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

// Hydrate perzistirane sobe (preživi restart) + re-arm bot poteza za partije
// koje su bile u toku. Human turn timer se NE pokreće dok se igrač ne vrati
// (room:subscribe → broadcastGameState ga pokrene) — da ne auto-play-uje odsutne.
try {
  const restoredIds = await hydrateRooms();
  if (restoredIds.length > 0) {
    fastify.log.info(`♻ Restored ${restoredIds.length} room(s) from persistence`);
    for (const id of restoredIds) {
      const room = getRoom(id);
      if (room?.gameState?.phase === "playing") {
        const cp = room.gameState.players.find(
          (p) => p.id === room.gameState!.currentPlayerId,
        );
        if (cp?.isBot) scheduleBotMove(id);
      }
      // Soba zatečena u pauzi ili glasanju: rok je apsolutan, pa se timer
      // naoruža na ostatak — a ako je rok prošao dok je server bio dolje,
      // tranzicija ide odmah. Bez ovoga bi pauza preživjela deploy i ostala
      // zaglavljena zauvijek (ista klasa greške kao bot-stuck 2026-06-10).
      const phase = room?.gameState?.phase;
      if (phase === "paused_for_reconnect" || phase === "abandon_vote") {
        armPauseTimer(id);
      }
    }
  }
} catch (err) {
  fastify.log.error(`Hydrate failed (nastavljam in-memory): ${err}`);
}

// Sweep napuštenih soba: jednom odmah (čisti stare fajlove naslijeđene s diska)
// pa periodično — inače rooms Map i .data rastu neograničeno.
const sweptOnBoot = sweepStaleRooms();
if (sweptOnBoot > 0) {
  fastify.log.info(`🧹 Sweep na startu: uklonjeno ${sweptOnBoot} napuštenih soba`);
}
startRoomSweeper((removed) => {
  fastify.log.info(`🧹 Sweep: uklonjeno ${removed} napuštenih soba`);
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

for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, async () => {
    await posthog.shutdown();
    process.exit(0);
  });
}
