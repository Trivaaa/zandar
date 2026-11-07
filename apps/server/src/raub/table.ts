import {
  DEFAULT_RAUB_BOT_CONFIG,
  applyRaubAction,
  createRaubMatch,
  createRaubRules,
  finishRaubMatchEarly,
  getRaubAutoAction,
  getRaubView,
  raubBotThinkMs,
  selectRaubBotAction,
  startRaubHand,
} from "@zandar/game-core";
import type {
  AbandonVote,
  GamePhase,
  RaubActionRequest,
  RaubGamePayload,
  RaubGameState,
} from "@zandar/shared-types";
import type { LobbyRoom } from "../rooms";
import { toPublicPlayer } from "../publicPlayer";
import {
  afterGrace,
  afterLeave,
  connectedHumans,
  hasReconnectingHuman,
  resolveVote,
  resolveVoteTimeout,
} from "../pause";
import { cryptoRng } from "../poker/table";

/**
 * Raub sto na serveru (docs/raub-spec.md).
 *
 * Isti okvir kao Poker: klijent šalje samo namjeru (`raub:action`), motor iz
 * game-core je provjerava i primjenjuje, svaki socket dobija samo svoj pogled,
 * a bot dobija ISTI pogled (`getRaubView`) — nikad cijelo stanje.
 *
 * Razlike prema Pokeru (odluke vlasnika 7.11.2026):
 *  - sljedeću ruku pokreće host („Sljedeća ruka →", `game:nextHand`) — odluka 2
 *  - prekid veze i izlazak: pauza i glasanje kao Žandar (PRD v2 §32) — odluka 3;
 *    odluke su iste čiste funkcije iz `pause.ts`, rokovi su apsolutni u stanju
 */

export interface RaubSocketLike {
  data: { playerId?: unknown };
  emit(event: string, payload: unknown): void;
}

export interface RaubTiming {
  /** Rok poteza (spec: 15 s). */
  turnMs: number;
  /** Rok za povratak prije pauze (kao Žandar `GRACE_MS`). */
  graceMs: number;
  /** Rezultat ruke bez ijednog povezanog čovjeka: toliko još čeka. */
  handEndGraceMs: number;
  pauseMs: number;
  voteMs: number;
  /** „Čekaj" u glasanju produžava pauzu za ovoliko. */
  waitExtensionMs: number;
  /** Quick Play: prozor za druge prave igrače (isto kao Poker). */
  matchWindowMs: number;
}

export interface RaubDeps {
  getRoom(roomId: string): LobbyRoom | undefined;
  socketsIn(roomId: string): Promise<RaubSocketLike[]>;
  persist(room: LobbyRoom): void;
  /** Popuni prazna mjesta botovima (isti generator imena kao Žandar). */
  fillBots(room: LobbyRoom): void;
  /** Poruka svima u sobi (npr. `game:autoPlay`). */
  emitToRoom?(roomId: string, event: string, payload: unknown): void;
  log: { info(msg: string): void; error(msg: string): void };
  timing: RaubTiming;
  rng?: () => number;
  /** Test: brže odluke bota. */
  botThinkMs?: () => number;
  onMatchStarted?(room: LobbyRoom): void;
  onMatchEnded?(room: LobbyRoom, reason: "completed" | "abandoned"): void;
}

/** Mrežni ulaz → namjera. Nevalidno = null (nikad izuzetak u handleru). */
export function parseRaubAction(raw: unknown): RaubActionRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  let out: RaubActionRequest;
  switch (r.type) {
    case "open":
    case "blind":
      out = { type: r.type };
      break;
    case "bid":
      if (r.bid !== "raub" && r.bid !== "pass") return null;
      out = { type: "bid", bid: r.bid };
      break;
    case "swap_seven":
      if (typeof r.swap !== "boolean") return null;
      out = { type: "swap_seven", swap: r.swap };
      break;
    case "go":
      if (typeof r.go !== "boolean") return null;
      out = { type: "go", go: r.go };
      break;
    case "discard":
    case "play":
      if (typeof r.cardId !== "string" || r.cardId.length > 32) return null;
      out = { type: r.type, cardId: r.cardId };
      break;
    case "exchange":
      if (
        !Array.isArray(r.cardIds) ||
        r.cardIds.length > 4 ||
        !r.cardIds.every((x) => typeof x === "string" && x.length <= 32)
      ) {
        return null;
      }
      out = { type: "exchange", cardIds: [...(r.cardIds as string[])] };
      break;
    default:
      return null;
  }
  if (r.clientKnownStateVersion !== undefined) {
    if (typeof r.clientKnownStateVersion !== "number") return null;
    out.clientKnownStateVersion = r.clientKnownStateVersion;
  }
  return out;
}

/** Raub faza (+ prekid) u jeziku `pause.ts`, da odluke budu iste kao u Žandaru. */
export function raubPausePhase(s: RaubGameState): GamePhase {
  if (s.interruption?.kind === "paused") return "paused_for_reconnect";
  if (s.interruption?.kind === "vote") return "abandon_vote";
  switch (s.phase) {
    case "playing":
      return "playing";
    case "hand_complete":
      return "hand_finished";
    case "match_finished":
      return "match_finished";
    default:
      return "abandoned";
  }
}

type Ack = { ok: true } | { ok: false; error: string };

export class RaubTables {
  private readonly rng: () => number;
  /** roomId → tajmer poteza (čovjek: rok; bot: odluka). */
  private readonly actTimers = new Map<string, NodeJS.Timeout>();
  /** roomId → za koji potez je tajmer naoružan (da broadcast ne resetuje sat). */
  private readonly armedFor = new Map<string, string>();
  private readonly deadlines = new Map<string, number>();
  private readonly matchTimers = new Map<string, NodeJS.Timeout>();
  private readonly pauseTimers = new Map<string, NodeJS.Timeout>();
  /** `${roomId}:${playerId}` → istek roka za povratak. */
  private readonly graceTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly deps: RaubDeps) {
    this.rng = deps.rng ?? cryptoRng;
  }

  // ── Početak meča ──────────────────────────────────────────────────────────

  /** Nov meč za sve koji sjede u sobi, redom mjesta; prvi djelilac nasumično. */
  start(room: LobbyRoom, matchId: string = room.id): void {
    this.clearMatching(room.id);
    const seated = room.players
      .filter((p) => p.left !== true)
      .sort((a, b) => a.seatIndex - b.seatIndex);
    room.raub = createRaubMatch({
      roomId: room.id,
      matchId,
      playerIds: seated.map((p) => p.id),
      rules: createRaubRules(seated.length as 2 | 3 | 4),
      rng: this.rng,
    });
    room.status = "playing";
    delete room.matchingUntil;
    this.deps.onMatchStarted?.(room);
    this.deps.log.info(`🂡 Raub meč ${matchId} počinje (${seated.length} igrača)`);
    void this.broadcast(room.id);
  }

  /** Quick Play: sto čeka `matchWindowMs` druge prave igrače, pa ostatak dobijaju botovi. */
  openMatching(room: LobbyRoom): void {
    room.matchingUntil = Date.now() + this.deps.timing.matchWindowMs;
    this.clearMatching(room.id);
    this.matchTimers.set(
      room.id,
      setTimeout(() => this.closeMatching(room.id), this.deps.timing.matchWindowMs),
    );
  }

  closeMatching(roomId: string): void {
    this.matchTimers.delete(roomId);
    const room = this.deps.getRoom(roomId);
    if (!room || room.status !== "waiting" || room.game !== "raub") return;
    this.deps.fillBots(room);
    this.start(room);
  }

  /** Privatna soba: meč kreće sam čim se popune sva mjesta (kao Poker). */
  startIfFull(room: LobbyRoom): boolean {
    if (room.game !== "raub" || room.status !== "waiting") return false;
    if (room.players.length < room.rulesConfig.playerCount) return false;
    this.start(room);
    return true;
  }

  private clearMatching(roomId: string): void {
    const t = this.matchTimers.get(roomId);
    if (t) clearTimeout(t);
    this.matchTimers.delete(roomId);
  }

  // ── Slanje stanja ─────────────────────────────────────────────────────────

  payload(room: LobbyRoom, viewerId: string): RaubGamePayload | null {
    const s = room.raub;
    if (!s) return null;
    const deadline = s.phase === "playing" && !s.interruption ? this.deadlines.get(room.id) : undefined;
    return {
      ...getRaubView(s, viewerId),
      // Bez `teamId`: Raub nema timove, a 4P soba ga nasljeđuje iz Žandar pravila.
      players: room.players.map((p) => {
        const { teamId: _team, ...pub } = toPublicPlayer(p);
        return pub;
      }),
      interruption: s.interruption ?? null,
      ...(deadline !== undefined ? { turnDeadline: deadline } : {}),
    };
  }

  async broadcast(roomId: string): Promise<void> {
    const room = this.deps.getRoom(roomId);
    if (!room?.raub) return;
    this.route(room);
    for (const socket of await this.deps.socketsIn(roomId)) {
      const viewer = socket.data.playerId;
      if (typeof viewer !== "string") continue;
      socket.emit("game:state", this.payload(room, viewer));
    }
    this.deps.persist(room);
  }

  // ── Tajmeri poteza ────────────────────────────────────────────────────────

  private clearAct(roomId: string): void {
    const t = this.actTimers.get(roomId);
    if (t) clearTimeout(t);
    this.actTimers.delete(roomId);
    this.armedFor.delete(roomId);
  }

  /** Ko je na potezu i šta server čeka; kraj meča. Pauza gasi sat poteza. */
  private route(room: LobbyRoom): void {
    const s = room.raub;
    if (!s) return;

    if (s.phase === "playing" && s.currentPlayerId && !s.interruption) {
      const pid = s.currentPlayerId;
      const key = `${s.dealNo}:${s.stateVersion}:${pid}`;
      if (this.armedFor.get(room.id) === key) return; // isti potez — sat teče dalje
      this.clearAct(room.id);
      this.armedFor.set(room.id, key);
      // Rok za prikaz i za bota: bot odluči brže, a sat izgleda isto (HARD RULE 4/5).
      this.deadlines.set(room.id, Date.now() + this.deps.timing.turnMs);
      const player = room.players.find((p) => p.id === pid);
      if (player?.isBot) {
        const delay = this.deps.botThinkMs?.() ?? raubBotThinkMs(DEFAULT_RAUB_BOT_CONFIG, this.rng);
        this.actTimers.set(room.id, setTimeout(() => this.botAct(room.id, pid), delay));
      } else {
        this.actTimers.set(room.id, setTimeout(() => this.autoAct(room.id, pid), this.deps.timing.turnMs));
      }
      return;
    }

    this.clearAct(room.id);
    this.deadlines.delete(room.id);

    if (s.phase === "match_finished" || s.phase === "abandoned") {
      if (room.status !== "finished") {
        room.status = "finished";
        this.clearPause(room.id);
        for (const key of [...this.graceTimers.keys()]) {
          if (key.startsWith(`${room.id}:`)) {
            clearTimeout(this.graceTimers.get(key)!);
            this.graceTimers.delete(key);
          }
        }
      }
      this.deps.onMatchEnded?.(room, s.phase === "match_finished" ? "completed" : "abandoned");
    }
  }

  private botAct(roomId: string, pid: string): void {
    this.actTimers.delete(roomId);
    this.armedFor.delete(roomId);
    const room = this.deps.getRoom(roomId);
    const s = room?.raub;
    if (!room || !s || s.phase !== "playing" || s.interruption || s.currentPlayerId !== pid) return;
    try {
      room.raub = applyRaubAction(s, pid, selectRaubBotAction(getRaubView(s, pid), DEFAULT_RAUB_BOT_CONFIG, this.rng));
    } catch (err) {
      // Bot nema AFK rok: pad odluke ne smije zaglaviti sto.
      this.deps.log.error(`Raub bot ${pid} u ${roomId}: ${err} — auto akcija`);
      const auto = getRaubAutoAction(s, pid);
      if (!auto) return;
      room.raub = applyRaubAction(s, pid, auto);
    }
    void this.broadcast(roomId);
  }

  /** Istekao rok: najsigurnija dozvoljena akcija (spec, „Edge caseovi"). */
  private autoAct(roomId: string, pid: string): void {
    this.actTimers.delete(roomId);
    this.armedFor.delete(roomId);
    const room = this.deps.getRoom(roomId);
    const s = room?.raub;
    if (!room || !s || s.phase !== "playing" || s.interruption || s.currentPlayerId !== pid) return;
    const auto = getRaubAutoAction(s, pid);
    if (!auto) return;
    try {
      room.raub = applyRaubAction(s, pid, auto);
    } catch (err) {
      this.deps.log.error(`Raub auto ${pid} u ${roomId}: ${err}`);
      return;
    }
    const player = room.players.find((p) => p.id === pid);
    this.deps.emitToRoom?.(roomId, "game:autoPlay", { playerId: pid, displayName: player?.displayName ?? "" });
    void this.broadcast(roomId);
  }

  // ── Akcije igrača ─────────────────────────────────────────────────────────

  /** `raub:action`. Vraća grešku kao string kod (isto kao Žandar i Poker). */
  async act(roomId: string, playerId: string, raw: unknown): Promise<Ack> {
    const room = this.deps.getRoom(roomId);
    if (!room?.raub) return { ok: false, error: "GAME_NOT_STARTED" };
    if (room.raub.interruption) return { ok: false, error: "GAME_PAUSED" };
    const req = parseRaubAction(raw);
    if (!req) return { ok: false, error: "INVALID_PAYLOAD" };
    try {
      room.raub = applyRaubAction(room.raub, playerId, req);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "INVALID_ACTION" };
    }
    await this.broadcast(roomId);
    return { ok: true };
  }

  /** `game:nextHand` — samo host, poslije pregleda ruke (odluka 2). */
  async nextHand(roomId: string, playerId: string): Promise<Ack> {
    const room = this.deps.getRoom(roomId);
    const s = room?.raub;
    if (!room || !s) return { ok: false, error: "GAME_NOT_STARTED" };
    if (playerId !== room.hostPlayerId) return { ok: false, error: "NOT_HOST" };
    if (s.phase !== "hand_complete" || s.interruption) return { ok: false, error: "INVALID_PHASE" };
    this.dealNext(room);
    await this.broadcast(roomId);
    return { ok: true };
  }

  private dealNext(room: LobbyRoom): void {
    const s = room.raub!;
    // Za stolom mora biti bar jedan pravi igrač — meč samo s botovima se ne igra.
    const humanHere = room.players.some(
      (p) => !p.isBot && p.left !== true && p.connectionStatus !== "abandoned",
    );
    try {
      room.raub = humanHere ? startRaubHand(s, this.rng) : finishRaubMatchEarly(s);
    } catch (err) {
      this.deps.log.error(`Raub nextHand ${room.id}: ${err}`);
      room.raub = finishRaubMatchEarly(s);
    }
  }

  /** Revanš: isto društvo (bez onih koji su otišli), svi ponovo od 21. */
  rematch(roomId: string, playerId: string): Ack {
    const room = this.deps.getRoom(roomId);
    if (!room?.raub) return { ok: false, error: "GAME_NOT_STARTED" };
    if (playerId !== room.hostPlayerId) return { ok: false, error: "NOT_HOST" };
    if (room.raub.phase !== "match_finished") return { ok: false, error: "INVALID_GAME_PHASE" };
    const staying = room.players.filter((p) => p.left !== true && p.connectionStatus !== "abandoned");
    if (staying.length < 2 || staying.every((p) => p.isBot)) {
      return { ok: false, error: "NOT_ENOUGH_PLAYERS" };
    }
    room.players = staying;
    this.start(room, `${room.id}-rematch-${Date.now()}`);
    return { ok: true };
  }

  // ── Izlazak, veza, pauza (PRD v2 §32, odluka 3) ──────────────────────────

  /** `room:leave`. U lobiju: kreator zatvara privatni sto. U meču: pauza za ostale. */
  async leave(roomId: string, playerId: string): Promise<void> {
    this.clearGrace(roomId, playerId);
    const room = this.deps.getRoom(roomId);
    if (!room) return;
    if (room.status === "waiting") {
      if (playerId === room.hostPlayerId && !room.isPublic) await this.close(room);
      return;
    }
    const s = room.raub;
    const player = room.players.find((p) => p.id === playerId);
    if (!s || !player || player.connectionStatus === "abandoned") return;

    const outcome = afterLeave({
      phase: raubPausePhase(s),
      players: room.players.map((p) =>
        p.id === playerId ? { ...p, connectionStatus: "reconnecting" as const } : p,
      ),
    });
    if (outcome === "ignore") return;
    player.connectionStatus = "reconnecting";
    player.left = true;
    this.deps.log.info(`🚪 Raub: ${playerId} napustio ${roomId} (${outcome})`);

    if (outcome === "abandon") await this.abandon(roomId);
    else if (outcome === "pause") await this.pause(roomId);
    else if (outcome === "next_hand_then_pause") {
      // Sljedeću ruku pokreće samo host; ako je otišao host, sto bi stao na rezultatu.
      this.dealNext(room);
      await this.pause(roomId);
    } else await this.broadcast(roomId);
  }

  private async close(room: LobbyRoom): Promise<void> {
    room.status = "finished";
    this.clearMatching(room.id);
    for (const socket of await this.deps.socketsIn(room.id)) {
      if (socket.data.playerId !== room.hostPlayerId) {
        socket.emit("room:kicked", { reason: "Kreator je zatvorio sto." });
      }
    }
    this.deps.persist(room);
  }

  private graceKey(roomId: string, playerId: string): string {
    return `${roomId}:${playerId}`;
  }

  private clearGrace(roomId: string, playerId: string): void {
    const key = this.graceKey(roomId, playerId);
    const t = this.graceTimers.get(key);
    if (t) clearTimeout(t);
    this.graceTimers.delete(key);
  }

  private armGrace(roomId: string, playerId: string, ms: number, handEndWaited: boolean): void {
    this.clearGrace(roomId, playerId);
    this.graceTimers.set(
      this.graceKey(roomId, playerId),
      setTimeout(() => {
        this.graceTimers.delete(this.graceKey(roomId, playerId));
        void this.onGraceExpired(roomId, playerId, handEndWaited);
      }, ms),
    );
  }

  private async onGraceExpired(roomId: string, playerId: string, handEndWaited: boolean): Promise<void> {
    const room = this.deps.getRoom(roomId);
    const s = room?.raub;
    const player = room?.players.find((p) => p.id === playerId);
    if (!room || !s || player?.connectionStatus !== "reconnecting") return;
    const outcome = afterGrace({ phase: raubPausePhase(s), players: room.players }, handEndWaited);
    if (outcome === "abandon") await this.abandon(roomId);
    else if (outcome === "pause") await this.pause(roomId);
    else if (outcome === "wait_hand_end") {
      this.armGrace(roomId, playerId, this.deps.timing.handEndGraceMs, true);
    }
  }

  /** Socket igrača je pao (i nema drugog): partija teče, a rok za povratak kreće. */
  async onDisconnect(roomId: string, playerId: string): Promise<void> {
    const room = this.deps.getRoom(roomId);
    if (!room?.raub || room.status !== "playing") return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.isBot || player.connectionStatus === "abandoned") return;
    player.connectionStatus = "reconnecting";
    await this.broadcast(roomId);
    this.armGrace(roomId, playerId, this.deps.timing.graceMs, false);
  }

  /** `room:subscribe`: vratio se → povezan; ako niko drugi ne fali, sto nastavlja. */
  async onSubscribe(roomId: string, playerId: string, socket: RaubSocketLike): Promise<void> {
    this.clearGrace(roomId, playerId);
    const room = this.deps.getRoom(roomId);
    const s = room?.raub;
    if (!room || !s) return;
    const player = room.players.find((p) => p.id === playerId);
    if (player && player.connectionStatus === "reconnecting" && player.left !== true) {
      player.connectionStatus = "connected";
      if (s.interruption && !hasReconnectingHuman({ players: room.players })) {
        room.raub = { ...s, interruption: null };
        this.clearPause(roomId);
        this.deps.log.info(`▶ Raub ${roomId} nastavlja`);
      }
      await this.broadcast(roomId);
      return;
    }
    this.route(room);
    socket.emit("game:state", this.payload(room, playerId));
  }

  private clearPause(roomId: string): void {
    const t = this.pauseTimers.get(roomId);
    if (t) clearTimeout(t);
    this.pauseTimers.delete(roomId);
  }

  /** Naoruža rok prekida prema apsolutnom `endsAt` (radi i poslije restarta). */
  private armPause(roomId: string): void {
    this.clearPause(roomId);
    const endsAt = this.deps.getRoom(roomId)?.raub?.interruption?.endsAt;
    if (endsAt === undefined) return;
    this.pauseTimers.set(
      roomId,
      setTimeout(() => void this.onPauseDeadline(roomId), Math.max(0, endsAt - Date.now())),
    );
  }

  private async onPauseDeadline(roomId: string): Promise<void> {
    this.pauseTimers.delete(roomId);
    const room = this.deps.getRoom(roomId);
    const it = room?.raub?.interruption;
    if (!room || !it) return;
    if (it.kind === "paused") {
      await this.vote(roomId);
      return;
    }
    const voterIds = connectedHumans(room.players).map((p) => p.id);
    if (resolveVoteTimeout(it.votes, voterIds) === "extend") await this.pause(roomId, this.deps.timing.waitExtensionMs);
    else await this.abandon(roomId);
  }

  private async pause(roomId: string, durationMs: number = this.deps.timing.pauseMs): Promise<void> {
    const room = this.deps.getRoom(roomId);
    if (!room?.raub) return;
    const now = Date.now();
    room.raub = { ...room.raub, interruption: { kind: "paused", startedAt: now, endsAt: now + durationMs } };
    await this.broadcast(roomId); // gasi sat poteza (route)
    this.armPause(roomId);
    this.deps.log.info(`⏸ Raub ${roomId} pauza ${Math.round(durationMs / 1000)}s`);
  }

  private async vote(roomId: string): Promise<void> {
    const room = this.deps.getRoom(roomId);
    if (!room?.raub) return;
    const now = Date.now();
    room.raub = {
      ...room.raub,
      interruption: { kind: "vote", startedAt: now, endsAt: now + this.deps.timing.voteMs, votes: {} },
    };
    await this.broadcast(roomId);
    this.armPause(roomId);
  }

  private async abandon(roomId: string): Promise<void> {
    const room = this.deps.getRoom(roomId);
    if (!room?.raub) return;
    this.clearPause(roomId);
    for (const p of room.players) {
      if (p.connectionStatus === "reconnecting") p.connectionStatus = "abandoned";
    }
    room.raub = { ...finishRaubMatchEarly(room.raub), interruption: null };
    this.deps.log.info(`⚠ Raub meč prekinut u ${roomId}`);
    await this.broadcast(roomId); // route: status finished + match_ended
  }

  /** `game:waitMore` — bilo ko za stolom, samo dok traje pauza: pun rok ispočetka. */
  async waitMore(roomId: string): Promise<Ack> {
    const room = this.deps.getRoom(roomId);
    if (!room?.raub) return { ok: false, error: "GAME_NOT_STARTED" };
    if (room.raub.interruption?.kind !== "paused") return { ok: false, error: "INVALID_PHASE" };
    await this.pause(roomId);
    return { ok: true };
  }

  /** `game:abandonVote` — jedan „čekaj" pobjeđuje; prekid samo ako svi hoće. */
  async castVote(roomId: string, playerId: string, vote: AbandonVote): Promise<Ack> {
    const room = this.deps.getRoom(roomId);
    const it = room?.raub?.interruption;
    if (!room?.raub) return { ok: false, error: "GAME_NOT_STARTED" };
    if (it?.kind !== "vote") return { ok: false, error: "INVALID_PHASE" };
    const votes = { ...(it.votes ?? {}), [playerId]: vote };
    room.raub = { ...room.raub, interruption: { ...it, votes } };
    const outcome = resolveVote(votes, connectedHumans(room.players).map((p) => p.id));
    if (outcome === "extend") await this.pause(roomId, this.deps.timing.waitExtensionMs);
    else if (outcome === "end") await this.abandon(roomId);
    else await this.broadcast(roomId);
    return { ok: true };
  }

  /**
   * Poslije hidracije (deploy = restart): restart je odspojio sve ljude, pa
   * dobijaju dvostruki rok za povratak; prekid nastavlja po apsolutnom roku.
   */
  rearm(room: LobbyRoom): void {
    if (room.game !== "raub") return;
    if (room.status === "waiting" && room.isPublic) {
      this.closeMatching(room.id);
      return;
    }
    const s = room.raub;
    if (!s || room.status !== "playing") return;
    for (const p of room.players) {
      if (p.isBot || p.left === true || p.connectionStatus === "abandoned") continue;
      p.connectionStatus = "reconnecting";
      this.armGrace(room.id, p.id, this.deps.timing.graceMs * 2, false);
    }
    if (s.interruption) this.armPause(room.id);
    this.route(room);
  }

  /** Test i gašenje: ugasi sve tajmere. */
  dispose(): void {
    for (const m of [this.actTimers, this.matchTimers, this.pauseTimers, this.graceTimers]) {
      for (const t of m.values()) clearTimeout(t);
      m.clear();
    }
    this.armedFor.clear();
    this.deadlines.clear();
  }
}
