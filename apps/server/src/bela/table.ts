import {
  BELA_QUICKPLAY_TARGET,
  DEFAULT_BELA_BOT_CONFIG,
  applyBelaAction,
  belaBotThinkMs,
  createBelaMatch,
  createBelaRules,
  finishBelaMatchEarly,
  getBelaAutoAction,
  getBelaView,
  selectBelaBotAction,
  startBelaHand,
} from "@zandar/game-core";
import type {
  AbandonVote,
  BelaActionRequest,
  BelaGamePayload,
  BelaGameState,
  GamePhase,
  Suit,
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
import { AFK_CONFIG, countMove, stallApplies } from "../afk";

/**
 * Bela sto na serveru (docs/bela-spec.md, faza 3).
 *
 * Isti okvir kao Raub: klijent šalje samo namjeru (`bela:action`), motor iz
 * game-core je provjerava i primjenjuje, svaki socket dobija samo svoj pogled,
 * a bot dobija ISTI pogled (`getBelaView`) — nikad cijelo stanje (HARD RULE 2/3).
 *
 *  - uvijek 4 igrača, 2 na 2; timovi po redu ulaska: mjesta 0 i 2 protiv 1 i 3
 *    (isto kao 4P Žandar, `seatIndex % 2`)
 *  - sljedeću ruku pokreće host (`game:nextHand`), kao Žandar i Raub
 *  - prekid veze i izlazak: pauza i glasanje kao Žandar (PRD v2 §32); odluke su
 *    iste čiste funkcije iz `pause.ts`, rokovi su apsolutni u stanju
 */

export interface BelaSocketLike {
  data: { playerId?: unknown };
  emit(event: string, payload: unknown): void;
}

export interface BelaTiming {
  /** Rok poteza (spec: 25 s, kao Raub). */
  turnMs: number;
  /** Rok za povratak prije pauze (kao Žandar `GRACE_MS`). */
  graceMs: number;
  /** Rezultat ruke bez ijednog povezanog čovjeka: toliko još čeka. */
  handEndGraceMs: number;
  pauseMs: number;
  voteMs: number;
  /** „Čekaj" u glasanju produžava pauzu za ovoliko. */
  waitExtensionMs: number;
  /** Rok za „Sljedeća ruka" (`AFK_CONFIG.nextHandIdleMs`); opciono — testovi ga skraćuju. */
  nextHandIdleMs?: number;
  /** Quick Play: prozor za druge prave igrače (isto kao Raub). */
  matchWindowMs: number;
}

export interface BelaDeps {
  getRoom(roomId: string): LobbyRoom | undefined;
  socketsIn(roomId: string): Promise<BelaSocketLike[]>;
  persist(room: LobbyRoom): void;
  /** Popuni prazna mjesta botovima (isti generator imena kao Žandar). */
  fillBots(room: LobbyRoom): void;
  /** Poruka svima u sobi (npr. `game:autoPlay`). */
  emitToRoom?(roomId: string, event: string, payload: unknown): void;
  log: { info(msg: string): void; error(msg: string): void };
  timing: BelaTiming;
  rng?: () => number;
  /** Test: brže odluke bota. */
  botThinkMs?: () => number;
  onMatchStarted?(room: LobbyRoom): void;
  onMatchEnded?(room: LobbyRoom, reason: "completed" | "abandoned", extra?: { stalled?: boolean }): void;
}

/** Ciljevi koje privatni sto prihvata (P-16); Quick Play je uvijek 501. */
export const BELA_PRIVATE_TARGETS = [501, 701, 1001] as const;
export const BELA_DEFAULT_PRIVATE_TARGET = 1001;

/** Cilj meča za sobu: Quick Play 501, privatni sto iz `rulesConfig` (inače 1001). */
export function belaTargetFor(room: Pick<LobbyRoom, "isPublic" | "rulesConfig">): number {
  if (room.isPublic) return BELA_QUICKPLAY_TARGET;
  const t = room.rulesConfig.targetScore;
  return (BELA_PRIVATE_TARGETS as readonly number[]).includes(t) ? t : BELA_DEFAULT_PRIVATE_TARGET;
}

const SUITS: readonly Suit[] = ["hearts", "spades", "diamonds", "clubs"];

/** Mrežni ulaz → namjera. Nevalidno = null (nikad izuzetak u handleru). */
export function parseBelaAction(raw: unknown): BelaActionRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  let out: BelaActionRequest;
  switch (r.type) {
    case "call":
      if (r.suit !== null && !SUITS.includes(r.suit as Suit)) return null;
      out = { type: "call", suit: r.suit as Suit | null };
      break;
    case "play":
      if (typeof r.cardId !== "string" || r.cardId.length > 32) return null;
      if (r.declare !== undefined && typeof r.declare !== "boolean") return null;
      out = { type: "play", cardId: r.cardId, ...(r.declare !== undefined ? { declare: r.declare as boolean } : {}) };
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

/** Bela faza (+ prekid) u jeziku `pause.ts`, da odluke budu iste kao u Žandaru. */
export function belaPausePhase(s: BelaGameState): GamePhase {
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

export class BelaTables {
  private readonly rng: () => number;
  /** roomId → tajmer poteza (čovjek: rok; bot: odluka). */
  private readonly actTimers = new Map<string, NodeJS.Timeout>();
  /** Rok za „Sljedeća ruka" po sobi (`routeStall`). */
  private readonly stallTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Sobe koje se upravo zatvaraju kao zaglavljene — `stalled` u `match_ended`. */
  private readonly stalled = new Set<string>();
  /** roomId → za koji potez je tajmer naoružan (da broadcast ne resetuje sat). */
  private readonly armedFor = new Map<string, string>();
  private readonly deadlines = new Map<string, number>();
  private readonly matchTimers = new Map<string, NodeJS.Timeout>();
  private readonly pauseTimers = new Map<string, NodeJS.Timeout>();
  /** `${roomId}:${playerId}` → istek roka za povratak. */
  private readonly graceTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly deps: BelaDeps) {
    this.rng = deps.rng ?? cryptoRng;
  }

  // ── Početak meča ──────────────────────────────────────────────────────────

  /** Nov meč za 4 igrača koji sjede u sobi, redom mjesta; prvi djelilac nasumično. */
  start(room: LobbyRoom, matchId: string = room.id): void {
    this.clearMatching(room.id);
    const seated = room.players
      .filter((p) => p.left !== true)
      .sort((a, b) => a.seatIndex - b.seatIndex);
    room.bela = createBelaMatch({
      roomId: room.id,
      matchId,
      playerIds: seated.map((p) => p.id),
      rules: createBelaRules({
        targetScore: belaTargetFor(room),
        turnTimeoutSeconds: Math.round(this.deps.timing.turnMs / 1000),
      }),
      rng: this.rng,
    });
    room.status = "playing";
    delete room.matchingUntil;
    this.deps.onMatchStarted?.(room);
    this.deps.log.info(`🂡 Bela meč ${matchId} počinje (do ${room.bela.rules.targetScore})`);
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
    if (!room || room.status !== "waiting" || room.game !== "bela") return;
    this.deps.fillBots(room);
    this.start(room);
  }

  /** Privatna soba: meč kreće sam čim se popune sva 4 mjesta (kao Raub). */
  startIfFull(room: LobbyRoom): boolean {
    if (room.game !== "bela" || room.status !== "waiting") return false;
    if (room.players.length < 4) return false;
    this.start(room);
    return true;
  }

  private clearMatching(roomId: string): void {
    const t = this.matchTimers.get(roomId);
    if (t) clearTimeout(t);
    this.matchTimers.delete(roomId);
  }

  // ── Slanje stanja ─────────────────────────────────────────────────────────

  payload(room: LobbyRoom, viewerId: string): BelaGamePayload | null {
    const s = room.bela;
    if (!s) return null;
    const deadline = s.phase === "playing" && !s.interruption ? this.deadlines.get(room.id) : undefined;
    return {
      ...getBelaView(s, viewerId),
      // `teamId` ostaje: Bela je timska, a soba ga daje po `seatIndex % 2` — isto kao motor.
      players: room.players.map((p) => toPublicPlayer(p)),
      interruption: s.interruption ?? null,
      ...(deadline !== undefined ? { turnDeadline: deadline } : {}),
    };
  }

  async broadcast(roomId: string): Promise<void> {
    const room = this.deps.getRoom(roomId);
    if (!room?.bela) return;
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
    const s = room.bela;
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
        const delay = this.deps.botThinkMs?.() ?? belaBotThinkMs(DEFAULT_BELA_BOT_CONFIG, this.rng);
        this.actTimers.set(room.id, setTimeout(() => this.botAct(room.id, pid), delay));
      } else {
        this.actTimers.set(room.id, setTimeout(() => this.autoAct(room.id, pid), this.deps.timing.turnMs));
      }
      return;
    }

    this.clearAct(room.id);
    this.deadlines.delete(room.id);
    this.routeStall(room);

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
      this.deps.onMatchEnded?.(room, s.phase === "match_finished" ? "completed" : "abandoned", {
        stalled: this.stalled.has(room.id),
      });
    }
  }

  /**
   * Rok za „Sljedeća ruka" (odluka vlasnika 27.11.2026): ruka je gotova, a niko
   * ne pritisne dugme → poslije `nextHandIdleMs` meč je napušten kao zaglavljen.
   * Početak čekanja je na sobi (`handEndedAt`), pa rok preživi restart.
   */
  private routeStall(room: LobbyRoom): void {
    const s = room.bela!;
    const waiting = s.phase === "hand_complete" && !s.interruption;
    if (!waiting) {
      this.clearStall(room.id);
      if (s.phase === "playing") delete room.handEndedAt;
      return;
    }
    if (this.stallTimers.has(room.id)) return;
    room.handEndedAt ??= Date.now();
    if (!stallApplies(room.players)) return; // ljudi za stolom: host kontroliše, bez roka
    const idleMs = this.deps.timing.nextHandIdleMs ?? AFK_CONFIG.nextHandIdleMs;
    const delay = Math.max(0, room.handEndedAt + idleMs - Date.now());
    const dealNo = s.dealNo;
    this.stallTimers.set(
      room.id,
      setTimeout(() => {
        this.stallTimers.delete(room.id);
        void this.abandonStalled(room.id, dealNo);
      }, delay),
    );
  }

  private clearStall(roomId: string): void {
    const t = this.stallTimers.get(roomId);
    if (t) clearTimeout(t);
    this.stallTimers.delete(roomId);
  }

  private async abandonStalled(roomId: string, dealNo: number): Promise<void> {
    const room = this.deps.getRoom(roomId);
    const s = room?.bela;
    if (!room || !s || s.phase !== "hand_complete" || s.interruption || s.dealNo !== dealNo) return;
    this.stalled.add(roomId);
    this.deps.log.info(`⏳ Bela sto ${roomId}: niko nije pokrenuo sljedeću ruku — prekid`);
    await this.abandon(roomId);
    this.stalled.delete(roomId);
  }

  private botAct(roomId: string, pid: string): void {
    this.actTimers.delete(roomId);
    this.armedFor.delete(roomId);
    const room = this.deps.getRoom(roomId);
    const s = room?.bela;
    if (!room || !s || s.phase !== "playing" || s.interruption || s.currentPlayerId !== pid) return;
    try {
      room.bela = applyBelaAction(s, pid, selectBelaBotAction(getBelaView(s, pid), DEFAULT_BELA_BOT_CONFIG, this.rng));
    } catch (err) {
      // Bot nema AFK rok: pad odluke ne smije zaglaviti sto.
      this.deps.log.error(`Bela bot ${pid} u ${roomId}: ${err} — auto akcija`);
      const auto = getBelaAutoAction(s, pid);
      if (!auto) return;
      room.bela = applyBelaAction(s, pid, auto);
    }
    void this.broadcast(roomId);
  }

  /** Istekao rok: najsigurnija dozvoljena akcija (spec, „Edge caseovi"). */
  private autoAct(roomId: string, pid: string): void {
    this.actTimers.delete(roomId);
    this.armedFor.delete(roomId);
    const room = this.deps.getRoom(roomId);
    const s = room?.bela;
    if (!room || !s || s.phase !== "playing" || s.interruption || s.currentPlayerId !== pid) return;
    const auto = getBelaAutoAction(s, pid);
    if (!auto) return;
    try {
      room.bela = applyBelaAction(s, pid, auto);
    } catch (err) {
      this.deps.log.error(`Bela auto ${pid} u ${roomId}: ${err}`);
      return;
    }
    const player = room.players.find((p) => p.id === pid);
    if (player && !player.isBot) countMove(room, s.matchId, pid, "auto");
    this.deps.emitToRoom?.(roomId, "game:autoPlay", { playerId: pid, displayName: player?.displayName ?? "" });
    void this.broadcast(roomId);
  }

  // ── Akcije igrača ─────────────────────────────────────────────────────────

  /** `bela:action`. Vraća grešku kao string kod (isto kao Žandar, Poker i Raub). */
  async act(roomId: string, playerId: string, raw: unknown): Promise<Ack> {
    const room = this.deps.getRoom(roomId);
    if (!room?.bela) return { ok: false, error: "GAME_NOT_STARTED" };
    const s = room.bela;
    // Odbijena akcija se loguje jednom linijom (prijava 20261124-091237: bez
    // ovoga se „ne mogu" nije dalo provjeriti). Samo kod, faza i verzija —
    // nikad karte ni imena.
    const reject = (error: string): Ack => {
      const kind = raw && typeof raw === "object" ? String((raw as { type?: unknown }).type).slice(0, 12) : typeof raw;
      this.deps.log.info(
        `⚠ Bela odbijeno ${error} · ${roomId} · ${kind} · ${s.step ?? s.phase} · štih ${s.tricks.length} · v${s.stateVersion}`,
      );
      return { ok: false, error };
    };
    if (s.interruption) return reject("GAME_PAUSED");
    const req = parseBelaAction(raw);
    if (!req) return reject("INVALID_PAYLOAD");
    try {
      room.bela = applyBelaAction(s, playerId, req);
    } catch (err) {
      return reject(err instanceof Error ? err.message : "INVALID_ACTION");
    }
    // Prije broadcast-a: kraj meča mora vidjeti i ovaj potez (`afk.ts`).
    countMove(room, room.bela.matchId, playerId, "manual");
    await this.broadcast(roomId);
    return { ok: true };
  }

  /** `game:nextHand` — samo host, poslije pregleda ruke. */
  async nextHand(roomId: string, playerId: string): Promise<Ack> {
    const room = this.deps.getRoom(roomId);
    const s = room?.bela;
    if (!room || !s) return { ok: false, error: "GAME_NOT_STARTED" };
    if (playerId !== room.hostPlayerId) return { ok: false, error: "NOT_HOST" };
    if (s.phase !== "hand_complete" || s.interruption) return { ok: false, error: "INVALID_PHASE" };
    this.dealNext(room);
    await this.broadcast(roomId);
    return { ok: true };
  }

  private dealNext(room: LobbyRoom): void {
    const s = room.bela!;
    this.clearStall(room.id);
    delete room.handEndedAt;
    if (s.phase !== "hand_complete") return;
    // Za stolom mora biti bar jedan pravi igrač — meč samo s botovima se ne igra.
    const humanHere = room.players.some(
      (p) => !p.isBot && p.left !== true && p.connectionStatus !== "abandoned",
    );
    try {
      room.bela = humanHere ? startBelaHand(s, this.rng) : finishBelaMatchEarly(s);
    } catch (err) {
      this.deps.log.error(`Bela nextHand ${room.id}: ${err}`);
      room.bela = finishBelaMatchEarly(s);
    }
  }

  /** Revanš: isto društvo, oba tima ponovo od 0. Bela traži sva 4 mjesta. */
  rematch(roomId: string, playerId: string): Ack {
    const room = this.deps.getRoom(roomId);
    if (!room?.bela) return { ok: false, error: "GAME_NOT_STARTED" };
    if (playerId !== room.hostPlayerId) return { ok: false, error: "NOT_HOST" };
    if (room.bela.phase !== "match_finished") return { ok: false, error: "INVALID_GAME_PHASE" };
    const staying = room.players.filter((p) => p.left !== true && p.connectionStatus !== "abandoned");
    if (staying.length < 4 || staying.every((p) => p.isBot)) {
      return { ok: false, error: "NOT_ENOUGH_PLAYERS" };
    }
    room.players = staying;
    this.start(room, `${room.id}-rematch-${Date.now()}`);
    return { ok: true };
  }

  // ── Izlazak, veza, pauza (PRD v2 §32) ─────────────────────────────────────

  /** `room:leave`. U lobiju: kreator zatvara privatni sto. U meču: glasanje za ostale. */
  async leave(roomId: string, playerId: string): Promise<void> {
    this.clearGrace(roomId, playerId);
    const room = this.deps.getRoom(roomId);
    if (!room) return;
    if (room.status === "waiting") {
      if (playerId === room.hostPlayerId && !room.isPublic) await this.close(room);
      return;
    }
    const s = room.bela;
    const player = room.players.find((p) => p.id === playerId);
    if (!s || !player || player.connectionStatus === "abandoned") return;

    const outcome = afterLeave({
      phase: belaPausePhase(s),
      players: room.players.map((p) =>
        p.id === playerId ? { ...p, connectionStatus: "reconnecting" as const } : p,
      ),
    });
    if (outcome === "ignore") return;
    player.connectionStatus = "reconnecting";
    player.left = true;
    this.deps.log.info(`🚪 Bela: ${playerId} napustio ${roomId} (${outcome})`);

    if (outcome === "abandon") await this.abandon(roomId);
    else if (outcome === "vote") await this.vote(roomId);
    else if (outcome === "next_hand_then_vote") {
      // Sljedeću ruku pokreće samo host; ako je otišao host, sto bi stao na rezultatu.
      this.dealNext(room);
      await this.vote(roomId);
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
        // Neuhvaćeno odbijanje = shutdown(1) = svi stolovi padaju; greška ostaje na ovom stolu.
        this.onGraceExpired(roomId, playerId, handEndWaited).catch((err) =>
          this.deps.log.error(`Bela: istek čekanja za ${playerId} u ${roomId}: ${err}`),
        );
      }, ms),
    );
  }

  private async onGraceExpired(roomId: string, playerId: string, handEndWaited: boolean): Promise<void> {
    const room = this.deps.getRoom(roomId);
    const s = room?.bela;
    const player = room?.players.find((p) => p.id === playerId);
    if (!room || !s || player?.connectionStatus !== "reconnecting") return;
    const outcome = afterGrace({ phase: belaPausePhase(s), players: room.players }, handEndWaited);
    if (outcome === "abandon") await this.abandon(roomId);
    else if (outcome === "pause") await this.pause(roomId);
    else if (outcome === "wait_hand_end") {
      this.armGrace(roomId, playerId, this.deps.timing.handEndGraceMs, true);
    }
  }

  /** Socket igrača je pao (i nema drugog): partija teče, a rok za povratak kreće. */
  async onDisconnect(roomId: string, playerId: string): Promise<void> {
    const room = this.deps.getRoom(roomId);
    if (!room?.bela || room.status !== "playing") return;
    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.isBot || player.connectionStatus === "abandoned") return;
    player.connectionStatus = "reconnecting";
    await this.broadcast(roomId);
    this.armGrace(roomId, playerId, this.deps.timing.graceMs, false);
  }

  /** `room:subscribe`: vratio se → povezan; ako niko drugi ne fali, sto nastavlja. */
  async onSubscribe(roomId: string, playerId: string, socket: BelaSocketLike): Promise<void> {
    this.clearGrace(roomId, playerId);
    const room = this.deps.getRoom(roomId);
    const s = room?.bela;
    if (!room || !s) return;
    const player = room.players.find((p) => p.id === playerId);
    if (player && player.connectionStatus === "reconnecting" && player.left !== true) {
      player.connectionStatus = "connected";
      if (s.interruption && !hasReconnectingHuman({ players: room.players })) {
        room.bela = { ...s, interruption: null };
        this.clearPause(roomId);
        this.deps.log.info(`▶ Bela ${roomId} nastavlja`);
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
    const endsAt = this.deps.getRoom(roomId)?.bela?.interruption?.endsAt;
    if (endsAt === undefined) return;
    this.pauseTimers.set(
      roomId,
      setTimeout(() => {
        this.onPauseDeadline(roomId).catch((err) =>
          this.deps.log.error(`Bela: rok prekida u ${roomId}: ${err}`),
        );
      }, Math.max(0, endsAt - Date.now())),
    );
  }

  private async onPauseDeadline(roomId: string): Promise<void> {
    this.pauseTimers.delete(roomId);
    const room = this.deps.getRoom(roomId);
    const it = room?.bela?.interruption;
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
    if (!room?.bela) return;
    const now = Date.now();
    room.bela = { ...room.bela, interruption: { kind: "paused", startedAt: now, endsAt: now + durationMs } };
    await this.broadcast(roomId); // gasi sat poteza (route)
    this.armPause(roomId);
    this.deps.log.info(`⏸ Bela ${roomId} pauza ${Math.round(durationMs / 1000)}s`);
  }

  private async vote(roomId: string): Promise<void> {
    const room = this.deps.getRoom(roomId);
    if (!room?.bela) return;
    const now = Date.now();
    room.bela = {
      ...room.bela,
      interruption: { kind: "vote", startedAt: now, endsAt: now + this.deps.timing.voteMs, votes: {} },
    };
    await this.broadcast(roomId);
    this.armPause(roomId);
  }

  private async abandon(roomId: string): Promise<void> {
    const room = this.deps.getRoom(roomId);
    if (!room?.bela) return;
    this.clearPause(roomId);
    for (const p of room.players) {
      if (p.connectionStatus === "reconnecting") p.connectionStatus = "abandoned";
    }
    room.bela = { ...finishBelaMatchEarly(room.bela), interruption: null };
    this.deps.log.info(`⚠ Bela meč prekinut u ${roomId}`);
    await this.broadcast(roomId); // route: status finished + match_ended
  }

  /** `game:waitMore` — bilo ko za stolom, samo dok traje pauza: pun rok ispočetka. */
  async waitMore(roomId: string): Promise<Ack> {
    const room = this.deps.getRoom(roomId);
    if (!room?.bela) return { ok: false, error: "GAME_NOT_STARTED" };
    if (room.bela.interruption?.kind !== "paused") return { ok: false, error: "INVALID_PHASE" };
    await this.pause(roomId);
    return { ok: true };
  }

  /** `game:abandonVote` — jedan „čekaj" pobjeđuje; prekid samo ako svi hoće. */
  async castVote(roomId: string, playerId: string, vote: AbandonVote): Promise<Ack> {
    const room = this.deps.getRoom(roomId);
    const it = room?.bela?.interruption;
    if (!room?.bela) return { ok: false, error: "GAME_NOT_STARTED" };
    if (it?.kind !== "vote") return { ok: false, error: "INVALID_PHASE" };
    const votes = { ...(it.votes ?? {}), [playerId]: vote };
    room.bela = { ...room.bela, interruption: { ...it, votes } };
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
    if (room.game !== "bela") return;
    if (room.status === "waiting" && room.isPublic) {
      this.closeMatching(room.id);
      return;
    }
    if (!room.bela || room.status !== "playing") return;
    for (const p of room.players) {
      if (p.isBot || p.left === true || p.connectionStatus === "abandoned") continue;
      p.connectionStatus = "reconnecting";
      this.armGrace(room.id, p.id, this.deps.timing.graceMs * 2, false);
    }
    if (room.bela.interruption) this.armPause(room.id);
    this.route(room);
  }

  /** Test i gašenje: ugasi sve tajmere. */
  dispose(): void {
    for (const m of [this.actTimers, this.matchTimers, this.pauseTimers, this.graceTimers, this.stallTimers]) {
      for (const t of m.values()) clearTimeout(t);
      m.clear();
    }
    this.armedFor.clear();
    this.deadlines.clear();
  }
}
