import type { FastifyInstance } from "fastify";
import {
  ACTIVE_TABLE_MAX_SESSIONS,
  type ActiveTable,
  type ActiveTableClaim,
  type ActiveTableResponse,
  type ActiveTableResult,
  type GameState,
} from "@zandar/shared-types";

import { isMatchWinner } from "./analytics";
import type { SlidingWindowLimiter } from "./rateLimit";
import { createSessionToken, hashToken, verifyToken, type LobbyRoom } from "./rooms";

/**
 * „Vrati se za sto" na početnoj (tabla `UI_VratiSe`, QA 10-24 P2).
 *
 * Sobu pitamo server po igraču, ne localStorage: samo tako traka radi poslije
 * ponovnog pokretanja i na drugom uređaju sa istim nalogom.
 */

// ── Sjedište → traka (čisto) ────────────────────────────────────────────────

/** Žandar prekid zbog odsustva: sto stoji, pa traka kaže „STO TE ČEKA". */
const ZANDAR_WAITING = new Set<GameState["phase"]>(["paused_for_reconnect", "abandon_vote"]);
const ZANDAR_LOBBY = new Set<GameState["phase"]>(["waiting", "lobby_with_pending"]);

/**
 * Šta traka pokazuje igraču `playerId` za ovim stolom, ili `null` kad traka
 * ne postoji: nema ga za stolom, napustio je sto, mjesto mu je ispražnjeno
 * (poker poslije 60 s), ili je partija prekinuta.
 *
 * ⚠ Žandar: kraj partije je `gameState.phase === "match_finished"`; sama soba
 * ostaje `status: "playing"` (revanš je ponovo pokreće u istoj sobi).
 */
export function describeSeat(room: LobbyRoom, playerId: string): ActiveTable | null {
  const player = room.players.find((p) => p.id === playerId);
  if (!player || player.isBot || player.left) return null;

  const base = { roomId: room.id, myTurn: false, waitingForMe: false };
  const lobby = (): ActiveTable => ({
    ...base,
    game: room.game ?? "zandar",
    matchId: "",
    phase: "lobby",
    state: { kind: "seats", taken: room.players.length, total: room.rulesConfig.playerCount },
  });

  if (room.game === "poker") {
    const s = room.poker;
    if (!s) return room.status === "waiting" ? lobby() : null;
    if (s.phase === "abandoned") return null;
    const seat = s.seats.find((x) => x.playerId === playerId);
    if (!seat || seat.status === "left") return null;
    // Bez žetona je kraj za tog igrača, i dok ostali igraju.
    if (s.phase === "match_finished" || room.status === "finished" || seat.status === "bankrupt") {
      const place = seat.place ?? s.placements.find((p) => p.playerId === playerId)?.place ?? null;
      return finished(base, "poker", s.matchId, { kind: "chips", stack: seat.stack }, place);
    }
    return {
      ...base,
      game: "poker",
      matchId: s.matchId,
      phase: "playing",
      myTurn: s.phase === "betting" && s.currentPlayerId === playerId,
      state: { kind: "chips", stack: seat.stack },
    };
  }

  if (room.game === "raub") {
    const s = room.raub;
    if (!s) return room.status === "waiting" ? lobby() : null;
    if (s.phase === "abandoned") return null;
    const seat = s.seats.find((x) => x.playerId === playerId);
    if (!seat) return null;
    if (s.phase === "match_finished" || room.status === "finished") {
      const place = seat.place ?? s.placements.find((p) => p.playerId === playerId)?.place ?? null;
      return finished(base, "raub", s.matchId, { kind: "toZero", score: seat.score }, place);
    }
    return {
      ...base,
      game: "raub",
      matchId: s.matchId,
      phase: "playing",
      myTurn: s.phase === "playing" && s.currentPlayerId === playerId,
      state: { kind: "toZero", score: seat.score },
    };
  }

  if (room.game === "bela") {
    const s = room.bela;
    if (!s) return room.status === "waiting" ? lobby() : null;
    if (s.phase === "abandoned") return null;
    const seat = s.seats.find((x) => x.playerId === playerId);
    if (!seat) return null;
    // Timska igra: rezultat je „naš tim : njihov tim", kao 4P Žandar.
    const mine = s.scores[seat.team];
    const theirs = s.scores[seat.team === 0 ? 1 : 0];
    const state = { kind: "score" as const, mine, theirs, team: true };
    if (s.phase === "match_finished" || room.status === "finished") {
      const place = s.placements.find((p) => p.playerId === playerId)?.place ?? null;
      if (place === null) return null;
      return {
        ...base,
        game: "bela",
        matchId: s.matchId,
        phase: "finished",
        state,
        result: { kind: "score", won: place === 1, mine, theirs },
      };
    }
    return {
      ...base,
      game: "bela",
      matchId: s.matchId,
      phase: "playing",
      myTurn: s.phase === "playing" && s.currentPlayerId === playerId,
      state,
    };
  }

  // Žandar
  const gs = room.gameState;
  if (!gs) return room.status === "waiting" ? lobby() : null;
  if (ZANDAR_LOBBY.has(gs.phase)) return lobby();
  // Žandar soba postaje `finished` samo prekidom (`enterAbandoned`).
  if (gs.phase === "abandoned" || room.status === "finished") return null;
  const me = gs.players.find((p) => p.id === playerId);
  if (!me || me.connectionStatus === "abandoned" || me.left) return null;

  const team = me.teamId != null;
  const myKey = team ? `team-${me.teamId}` : playerId;
  const mine = gs.matchScore[myKey] ?? 0;
  const others = Object.entries(gs.matchScore).filter(([k]) => k !== myKey).map(([, v]) => v);
  const theirs = others.length > 0 ? Math.max(...others) : 0;
  const rivals = gs.players.filter((p) => p.id !== playerId);
  const opponentName = !team && rivals.length === 1 ? rivals[0]?.displayName : undefined;

  if (gs.phase === "match_finished") {
    const result: ActiveTableResult = { kind: "score", won: isMatchWinner(gs, playerId), mine, theirs };
    return {
      ...base,
      game: "zandar",
      matchId: gs.matchId,
      phase: "finished",
      state: { kind: "score", mine, theirs, team, ...(opponentName ? { opponentName } : {}) },
      result,
    };
  }
  return {
    ...base,
    game: "zandar",
    matchId: gs.matchId,
    phase: "playing",
    myTurn: gs.phase === "playing" && gs.currentPlayerId === playerId,
    waitingForMe: ZANDAR_WAITING.has(gs.phase) && me.connectionStatus !== "connected",
    state: { kind: "score", mine, theirs, team, ...(opponentName ? { opponentName } : {}) },
  };
}

/** Poker/Raub kraj (V6) — bez plasmana nema šta da se pokaže, traka nestaje. */
function finished(
  base: { roomId: string; myTurn: boolean; waitingForMe: boolean },
  game: "poker" | "raub",
  matchId: string,
  state: ActiveTable["state"],
  place: number | null,
): ActiveTable | null {
  if (place === null) return null;
  return { ...base, game, matchId, phase: "finished", state, result: { kind: "place", won: place === 1, place } };
}

const PHASE_RANK: Record<ActiveTable["phase"], number> = { playing: 3, lobby: 2, finished: 1 };

/**
 * Jedna traka (pravilo table): partija u toku ima prednost nad lobijem, lobi
 * nad završenom; među istima novija aktivnost.
 */
export function pickTable<T extends { table: ActiveTable; activity: number }>(cands: readonly T[]): T | null {
  let best: T | null = null;
  for (const c of cands) {
    if (
      !best ||
      PHASE_RANK[c.table.phase] > PHASE_RANK[best.table.phase] ||
      (PHASE_RANK[c.table.phase] === PHASE_RANK[best.table.phase] && c.activity > best.activity)
    ) {
      best = c;
    }
  }
  return best;
}

// ── Rute ────────────────────────────────────────────────────────────────────

export interface ActiveTableDeps {
  rooms: () => readonly LobbyRoom[];
  getRoom: (roomId: string) => LobbyRoom | undefined;
  /** UID iz PROVJERENOG Firebase tokena (`Authorization: Bearer`), inače `null`. */
  verifiedUid: (authorization: string | undefined) => Promise<string | null>;
  /**
   * Sjedište je prešlo na novi uređaj: stari socket tog sjedišta izlazi sa
   * stola (`room:kicked`), soba se snima (novi hash ključa).
   */
  onClaim: (room: LobbyRoom, playerId: string) => Promise<void>;
  /** Isto što i `room:leave` sa socketa (QA B1), bez socketa. */
  leaveSeat: (roomId: string, playerId: string) => Promise<void>;
  limiter: SlidingWindowLimiter;
}

const isId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= 128;

function parseSessions(raw: unknown): { roomId: string; playerId: string; sessionToken: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { roomId: string; playerId: string; sessionToken: string }[] = [];
  for (const s of raw.slice(0, ACTIVE_TABLE_MAX_SESSIONS)) {
    if (!s || typeof s !== "object") continue;
    const { roomId, playerId, sessionToken } = s as Record<string, unknown>;
    if (isId(roomId) && isId(playerId) && isId(sessionToken)) out.push({ roomId, playerId, sessionToken });
  }
  return out;
}

const activityOf = (room: LobbyRoom) => room.lastActivityAt ?? room.createdAt;

export function registerActiveTableRoutes(app: FastifyInstance, deps: ActiveTableDeps): void {
  /**
   * Za kojim stolom sjedim. Dva izvora: ključevi sa ovog uređaja (svaki gost)
   * i provjeren nalog (drugi uređaj). `guestId` se NE koristi — nije tajna.
   */
  app.post<{ Body: { sessions?: unknown } | null }>("/api/me/table", async (request, reply) => {
    if (!deps.limiter.tryHit(request.ip)) {
      return reply.code(429).send({ error: "Previše zahtjeva" });
    }
    const sessions = parseSessions(request.body?.sessions);
    const gone: string[] = [];
    const cands: { table: ActiveTable; activity: number; claim: boolean }[] = [];
    const seen = new Set<string>();

    for (const s of sessions) {
      const room = deps.getRoom(s.roomId);
      if (!room) {
        gone.push(s.roomId);
        continue;
      }
      if (!verifyToken(room, s.playerId, s.sessionToken)) continue;
      seen.add(room.id);
      const table = describeSeat(room, s.playerId);
      if (table) cands.push({ table, activity: activityOf(room), claim: false });
    }

    const uid = await deps.verifiedUid(request.headers.authorization);
    if (uid) {
      for (const room of deps.rooms()) {
        if (seen.has(room.id)) continue;
        const player = room.players.find((p) => p.uid === uid && !p.isBot);
        if (!player) continue;
        const table = describeSeat(room, player.id);
        if (table) cands.push({ table, activity: activityOf(room), claim: true });
      }
    }

    const best = pickTable(cands);
    const body: ActiveTableResponse = {
      table: best?.table ?? null,
      ...(best?.claim ? { claim: true } : {}),
      ...(gone.length > 0 ? { gone } : {}),
    };
    return body;
  });

  /** Sjedište prelazi na ovaj uređaj — SAMO provjerenom nalogu tog sjedišta. */
  app.post<{ Body: { roomId?: unknown } | null }>("/api/me/table/claim", async (request, reply) => {
    if (!deps.limiter.tryHit(request.ip)) {
      return reply.code(429).send({ error: "Previše zahtjeva" });
    }
    const uid = await deps.verifiedUid(request.headers.authorization);
    if (!uid) return reply.code(401).send({ error: "Prijava nije važeća" });
    const roomId = request.body?.roomId;
    const room = isId(roomId) ? deps.getRoom(roomId) : undefined;
    const player = room?.players.find((p) => p.uid === uid && !p.isBot);
    if (!room || !player) return reply.code(404).send({ error: "Nema stola" });
    if (!describeSeat(room, player.id)) return reply.code(409).send({ error: "Sto više ne čeka" });

    const sessionToken = createSessionToken();
    room.sessionTokens.set(player.id, hashToken(sessionToken));
    await deps.onClaim(room, player.id);
    const body: ActiveTableClaim = { roomId: room.id, playerId: player.id, sessionToken };
    return body;
  });

  /** „Napusti partiju i igraj …" sa početne (V5): socket nije na stolu. */
  app.post<{ Params: { roomId: string }; Body: { playerId?: unknown; sessionToken?: unknown } | null }>(
    "/api/rooms/:roomId/leave",
    async (request, reply) => {
      const room = deps.getRoom(request.params.roomId);
      if (!room) return reply.code(404).send({ error: "Soba ne postoji" });
      const { playerId, sessionToken } = request.body ?? {};
      if (!isId(playerId) || !isId(sessionToken) || !verifyToken(room, playerId, sessionToken)) {
        return reply.code(403).send({ error: "Nevažeći ključ" });
      }
      await deps.leaveSeat(room.id, playerId);
      return { ok: true };
    },
  );
}
