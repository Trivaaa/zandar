import { randomInt } from "node:crypto";
import {
  DEFAULT_POKER_BOT_CONFIG,
  applyPokerAction,
  createPokerMatch,
  finishPokerMatchEarly,
  getPokerAutoAction,
  getPokerView,
  leavePokerMatch,
  pokerBotThinkMs,
  pokerPresentationMs,
  selectPokerBotAction,
  setPokerSeatStatus,
  startPokerHand,
} from "@zandar/game-core";
import type { PaceFrame } from "@zandar/game-core";
import type {
  PokerActionRequest,
  PokerActionType,
  PokerGamePayload,
  PokerGameState,
  PokerPlayerView,
} from "@zandar/shared-types";
import type { LobbyRoom } from "../rooms";
import { toPublicPlayer } from "../publicPlayer";

/**
 * Poker sto na serveru (docs/poker-spec.md, plan faza 3).
 *
 * Server je sudija: klijent šalje samo namjeru (`poker:action`), motor iz
 * game-core je provjerava i primjenjuje, a svaki socket dobija samo svoj
 * pogled. Bot dobija ISTI pogled (`getPokerView`) — nikad cijelo stanje.
 *
 * Razlike prema Žandaru (odluke vlasnika 2026-11-06):
 *  - sto se nikad ne zaustavlja: nema pauze ni glasanja
 *  - bez veze = `sitting_out` (auto check/fold), poslije `graceMs` = napustio
 *  - napušteno mjesto ostaje prazno (bot ga ne preuzima)
 *  - ruke idu jedna za drugom bez hosta
 */

/** Kriptografski generator u [0, 1) za miješanje i nasumična mjesta (spec). */
const RNG_RANGE = 2 ** 48 - 1; // randomInt traži raspon < 2^48
export const cryptoRng = (): number => randomInt(0, RNG_RANGE) / RNG_RANGE;

export interface PokerSocketLike {
  data: { playerId?: unknown };
  emit(event: string, payload: unknown): void;
}

export interface PokerTiming {
  /** Rok poteza za čovjeka (spec: 20 s). */
  turnMs: number;
  /** Bez veze duže od ovoga = napustio meč (spec: 60 s). */
  graceMs: number;
  /** Pauza poslije ruke dobijene bez showdowna. */
  handPauseMs: number;
  /** Pauza poslije showdowna (otkrivene karte, isplata). */
  showdownPauseMs: number;
  /** Koliko server čeka prije auto-akcije za igrača bez veze. */
  autoActMs: number;
  /** Quick Play: prozor za druge prave igrače (spec: 3 s). */
  matchWindowMs: number;
  /**
   * Množilac vremena prikaza (`POKER_PACE`): 1 = sat sljedećeg igrača i nova
   * ruka čekaju da klijent ispriča prelaz (animacije); 0 = bez čekanja (testovi).
   */
  paceScale?: number;
}

export interface PokerDeps {
  getRoom(roomId: string): LobbyRoom | undefined;
  socketsIn(roomId: string): Promise<PokerSocketLike[]>;
  persist(room: LobbyRoom): void;
  /** Popuni prazna mjesta botovima (isti generator imena kao Žandar). */
  fillBots(room: LobbyRoom): void;
  log: { info(msg: string): void; error(msg: string): void };
  timing: PokerTiming;
  rng?: () => number;
  /** Test: brže odluke bota. */
  botThinkMs?: (view: PokerPlayerView) => number;
  onMatchStarted?(room: LobbyRoom): void;
  onMatchEnded?(room: LobbyRoom, reason: "completed" | "abandoned"): void;
}

const ACTION_TYPES: readonly PokerActionType[] = ["fold", "check", "call", "bet", "raise", "allin"];

/** Mrežni ulaz → namjera. Nevalidno = null (nikad izuzetak u handleru). */
export function parsePokerAction(raw: unknown): PokerActionRequest | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.type !== "string" || !(ACTION_TYPES as readonly string[]).includes(r.type)) return null;
  const out: PokerActionRequest = { type: r.type as PokerActionType };
  if (r.amount !== undefined) {
    if (typeof r.amount !== "number" || !Number.isInteger(r.amount) || r.amount < 0) return null;
    out.amount = r.amount;
  }
  if (r.clientKnownStateVersion !== undefined) {
    if (typeof r.clientKnownStateVersion !== "number") return null;
    out.clientKnownStateVersion = r.clientKnownStateVersion;
  }
  return out;
}

function isAliveSeat(s: PokerGameState["seats"][number]): boolean {
  return s.status !== "left" && s.status !== "bankrupt";
}

export class PokerTables {
  private readonly rng: () => number;
  /** roomId → tajmer poteza (čovjek: rok; bot: odluka; bez veze: auto). */
  private readonly actTimers = new Map<string, NodeJS.Timeout>();
  /** roomId → za koji potez je tajmer naoružan (da broadcast ne resetuje sat). */
  private readonly armedFor = new Map<string, string>();
  private readonly deadlines = new Map<string, number>();
  /** Od kad teče sat (poslije prikaza prethodnog prelaza). Šalje se klijentu. */
  private readonly turnStarts = new Map<string, number>();
  /** Zadnje stanje po kojem je računat prikaz — da se priča jednom po promjeni. */
  private readonly shown = new Map<string, PaceFrame & { actions: number }>();
  private readonly handTimers = new Map<string, NodeJS.Timeout>();
  private readonly matchTimers = new Map<string, NodeJS.Timeout>();
  /** `${roomId}:${playerId}` → istek veze. */
  private readonly graceTimers = new Map<string, NodeJS.Timeout>();

  constructor(private readonly deps: PokerDeps) {
    this.rng = deps.rng ?? cryptoRng;
  }

  // ── Početak meča ──────────────────────────────────────────────────────────

  /** Nov meč za sve koji sjede u sobi. Mjesta i button nasumično. */
  start(room: LobbyRoom, matchId: string = room.id): void {
    this.clearMatching(room.id);
    room.poker = createPokerMatch({
      roomId: room.id,
      matchId,
      playerIds: room.players.filter((p) => p.left !== true).map((p) => p.id),
      rng: this.rng,
    });
    room.status = "playing";
    delete room.matchingUntil;
    // Prva ruka se priča kao svaka sljedeća (blindovi + dijeljenje), pa se
    // „prethodno prikazano" postavi na prazan sto prije nje.
    this.shown.set(room.id, { handNo: 0, phase: "hand_complete", boardCount: 0, actions: 0 });
    this.deps.onMatchStarted?.(room);
    this.deps.log.info(`🃏 Poker meč ${matchId} počinje (${room.players.length} igrača)`);
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

  /** Istekao prozor (ili hidracija): botovi na prazna mjesta, start. */
  closeMatching(roomId: string): void {
    this.matchTimers.delete(roomId);
    const room = this.deps.getRoom(roomId);
    if (!room || room.status !== "waiting" || room.game !== "poker") return;
    this.deps.fillBots(room);
    this.start(room);
  }

  /** Privatna soba: meč kreće sam čim se popune sva mjesta (samo poker). */
  startIfFull(room: LobbyRoom): boolean {
    if (room.game !== "poker" || room.status !== "waiting") return false;
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

  payload(room: LobbyRoom, viewerId: string): PokerGamePayload | null {
    if (!room.poker) return null;
    const betting = room.poker.phase === "betting";
    const deadline = betting ? this.deadlines.get(room.id) : undefined;
    const turnStartsAt = betting ? this.turnStarts.get(room.id) : undefined;
    return {
      ...getPokerView(room.poker, viewerId),
      players: room.players.map(toPublicPlayer),
      ...(deadline !== undefined ? { turnDeadline: deadline } : {}),
      ...(turnStartsAt !== undefined ? { turnStartsAt } : {}),
    };
  }

  async broadcast(roomId: string): Promise<void> {
    const room = this.deps.getRoom(roomId);
    if (!room?.poker) return;
    this.route(room);
    for (const socket of await this.deps.socketsIn(roomId)) {
      const viewer = socket.data.playerId;
      if (typeof viewer !== "string") continue;
      socket.emit("game:state", this.payload(room, viewer));
    }
    this.deps.persist(room);
  }

  // ── Tajmeri ───────────────────────────────────────────────────────────────

  private clearAct(roomId: string): void {
    const t = this.actTimers.get(roomId);
    if (t) clearTimeout(t);
    this.actTimers.delete(roomId);
    this.armedFor.delete(roomId);
  }

  /**
   * Koliko klijentu treba da ispriča prelaz od zadnjeg prikazanog stanja
   * (`POKER_PACE`). Računa se JEDNOM po stvarnoj promjeni — ponovno slanje istog
   * stanja (pretplata, prekid veze) vraća 0 i ne pomjera ništa.
   */
  private presentation(room: LobbyRoom): number {
    const s = room.poker!;
    const prev = this.shown.get(room.id) ?? null;
    const next = { handNo: s.handNo, phase: s.phase, boardCount: s.board.length, actions: s.actionLog.length };
    this.shown.set(room.id, next);
    if (
      !prev ||
      (prev.handNo === next.handNo &&
        prev.phase === next.phase &&
        prev.boardCount === next.boardCount &&
        prev.actions === next.actions)
    ) {
      return 0;
    }
    const scale = this.deps.timing.paceScale ?? 1;
    if (scale <= 0) return 0;
    const ms = pokerPresentationMs({
      prev,
      next,
      lastAction: s.actionLog[s.actionLog.length - 1]?.type ?? null,
      dealtPlayers: s.seats.filter((x) => x.inHand).length,
      result: s.phase === "betting" ? null : s.lastHandResult,
      busted: s.seats.filter((x) => x.status === "bankrupt" && x.stackAtHandStart > 0).length,
    });
    return Math.round(ms * scale);
  }

  /** Ko je na potezu i šta server čeka; kraj ruke → sljedeća; kraj meča. */
  private route(room: LobbyRoom): void {
    const s = room.poker;
    if (!s) return;
    const { timing } = this.deps;

    if (s.phase === "betting" && s.currentPlayerId) {
      const pid = s.currentPlayerId;
      const seat = s.seats.find((x) => x.playerId === pid);
      const key = `${s.handNo}:${s.actionLog.length}:${pid}:${seat?.status}`;
      if (this.armedFor.get(room.id) === key) return; // isti potez — sat teče dalje
      this.clearAct(room.id);
      this.armedFor.set(room.id, key);
      // Sat kreće tek kad klijent ispriča prethodni prelaz (animacije) — inače
      // bi igrač gubio sekunde gledajući kako žetoni idu u pot.
      const show = this.presentation(room);
      const startsAt = Date.now() + show;
      // Rok za prikaz i za bota: bot odluči brže, a sat izgleda isto (HARD RULE 4/5).
      this.deadlines.set(room.id, startsAt + timing.turnMs);
      this.turnStarts.set(room.id, startsAt);
      const player = room.players.find((p) => p.id === pid);
      let delay: number;
      let fire: () => void;
      if (player?.isBot) {
        const view = getPokerView(s, pid);
        delay = this.deps.botThinkMs?.(view) ?? pokerBotThinkMs(view, DEFAULT_POKER_BOT_CONFIG, this.rng);
        fire = () => this.botAct(room.id, pid);
      } else if (seat?.status === "sitting_out") {
        delay = timing.autoActMs;
        fire = () => this.autoAct(room.id, pid);
      } else {
        delay = timing.turnMs;
        fire = () => this.autoAct(room.id, pid);
      }
      this.actTimers.set(room.id, setTimeout(fire, show + delay));
      return;
    }

    this.clearAct(room.id);
    this.deadlines.delete(room.id);
    this.turnStarts.delete(room.id);

    if (s.phase === "hand_complete" && !this.handTimers.has(room.id)) {
      // Pauza = priča kraja ruke (otkrivanje, isplata, čitanje). Bez nje (testovi,
      // hidracija) ostaju stare fiksne pauze.
      const show = this.presentation(room);
      const pause =
        show > 0 ? show : s.lastHandResult?.uncontested ? timing.handPauseMs : timing.showdownPauseMs;
      this.handTimers.set(room.id, setTimeout(() => this.nextHand(room.id), pause));
    } else if (s.phase !== "hand_complete") {
      // Kraj meča: zapamti zadnje stanje, da revanš ne priča „prelaz" iz starog meča.
      this.presentation(room);
    }
    if (s.phase === "match_finished" || s.phase === "abandoned") {
      if (room.status !== "finished") {
        room.status = "finished";
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

  private nextHand(roomId: string): void {
    this.handTimers.delete(roomId);
    const room = this.deps.getRoom(roomId);
    const s = room?.poker;
    if (!room || !s || s.phase !== "hand_complete") return;
    // Za stolom mora biti bar jedan pravi igrač — meč samo s botovima se ne igra.
    const humanAlive = s.seats.some(
      (x) => isAliveSeat(x) && !room.players.find((p) => p.id === x.playerId)?.isBot,
    );
    try {
      room.poker = humanAlive ? startPokerHand(s, this.rng) : finishPokerMatchEarly(s);
    } catch (err) {
      this.deps.log.error(`Poker nextHand ${roomId}: ${err}`);
      room.poker = finishPokerMatchEarly(s);
    }
    void this.broadcast(roomId);
  }

  private botAct(roomId: string, pid: string): void {
    this.actTimers.delete(roomId);
    this.armedFor.delete(roomId);
    const room = this.deps.getRoom(roomId);
    const s = room?.poker;
    if (!room || !s || s.phase !== "betting" || s.currentPlayerId !== pid) return;
    const view = getPokerView(s, pid);
    const action = selectPokerBotAction(view, DEFAULT_POKER_BOT_CONFIG, this.rng);
    try {
      room.poker = applyPokerAction(s, pid, action ?? { type: "fold" });
    } catch (err) {
      // Bot nema AFK rok: pad odluke ne smije zaglaviti sto.
      this.deps.log.error(`Poker bot ${pid} u ${roomId}: ${err} — auto akcija`);
      room.poker = applyPokerAction(s, pid, getPokerAutoAction(s, pid) ?? { type: "fold" });
    }
    void this.broadcast(roomId);
  }

  /** Istekao rok ili igrač bez veze: check ako može, inače fold. */
  private autoAct(roomId: string, pid: string): void {
    this.actTimers.delete(roomId);
    this.armedFor.delete(roomId);
    const room = this.deps.getRoom(roomId);
    const s = room?.poker;
    if (!room || !s || s.phase !== "betting" || s.currentPlayerId !== pid) return;
    const auto = getPokerAutoAction(s, pid);
    if (!auto) return;
    room.poker = applyPokerAction(s, pid, auto);
    void this.broadcast(roomId);
  }

  // ── Akcije igrača ─────────────────────────────────────────────────────────

  /** `poker:action`. Vraća grešku kao string kod (isto kao Žandar). */
  async act(roomId: string, playerId: string, raw: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
    const room = this.deps.getRoom(roomId);
    if (!room?.poker) return { ok: false, error: "GAME_NOT_STARTED" };
    const req = parsePokerAction(raw);
    if (!req) return { ok: false, error: "INVALID_PAYLOAD" };
    try {
      room.poker = applyPokerAction(room.poker, playerId, req);
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "ILLEGAL_ACTION" };
    }
    await this.broadcast(roomId);
    return { ok: true };
  }

  /** Igrač napušta meč (namjerno ili istekla veza): mjesto ostaje prazno. */
  async leave(roomId: string, playerId: string): Promise<void> {
    this.clearGrace(roomId, playerId);
    const room = this.deps.getRoom(roomId);
    if (!room) return;
    if (room.status === "waiting") {
      // Kreator izađe prije starta → soba se zatvara (spec: „Edge caseovi").
      if (playerId === room.hostPlayerId && !room.isPublic) await this.close(room);
      return;
    }
    if (!room.poker) return;
    const before = room.poker;
    room.poker = leavePokerMatch(before, playerId);
    if (room.poker === before) return;
    const player = room.players.find((p) => p.id === playerId);
    if (player) player.left = true;
    this.deps.log.info(`🚪 Poker: ${playerId} napustio ${roomId}`);
    await this.broadcast(roomId);
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

  // ── Veza ──────────────────────────────────────────────────────────────────

  private graceKey(roomId: string, playerId: string): string {
    return `${roomId}:${playerId}`;
  }

  private clearGrace(roomId: string, playerId: string): void {
    const key = this.graceKey(roomId, playerId);
    const t = this.graceTimers.get(key);
    if (t) clearTimeout(t);
    this.graceTimers.delete(key);
  }

  private armGrace(roomId: string, playerId: string, ms: number): void {
    this.clearGrace(roomId, playerId);
    this.graceTimers.set(
      this.graceKey(roomId, playerId),
      setTimeout(() => {
        this.graceTimers.delete(this.graceKey(roomId, playerId));
        void this.leave(roomId, playerId);
      }, ms),
    );
  }

  /** Socket igrača je pao (i nema drugog): sitting out, pa poslije roka napušta. */
  async onDisconnect(roomId: string, playerId: string): Promise<void> {
    const room = this.deps.getRoom(roomId);
    const s = room?.poker;
    if (!room || !s || room.status !== "playing") return;
    const seat = s.seats.find((x) => x.playerId === playerId);
    if (!seat || !isAliveSeat(seat)) return;
    room.poker = setPokerSeatStatus(s, playerId, "sitting_out");
    this.armGrace(roomId, playerId, this.deps.timing.graceMs);
    await this.broadcast(roomId);
  }

  /** `room:subscribe`: vratio se → ponovo aktivan. Šalje stanje tom socketu. */
  async onSubscribe(roomId: string, playerId: string, socket: PokerSocketLike): Promise<void> {
    this.clearGrace(roomId, playerId);
    const room = this.deps.getRoom(roomId);
    if (!room?.poker) return;
    const seat = room.poker.seats.find((x) => x.playerId === playerId);
    if (seat?.status === "sitting_out") {
      room.poker = setPokerSeatStatus(room.poker, playerId, "active");
      await this.broadcast(roomId);
      return;
    }
    this.route(room);
    socket.emit("game:state", this.payload(room, playerId));
  }

  /** Revanš: isto društvo (bez onih koji su otišli), svi ponovo od 100 žetona. */
  rematch(roomId: string, playerId: string): { ok: true } | { ok: false; error: string } {
    const room = this.deps.getRoom(roomId);
    if (!room?.poker) return { ok: false, error: "GAME_NOT_STARTED" };
    if (playerId !== room.hostPlayerId) return { ok: false, error: "NOT_HOST" };
    if (room.poker.phase !== "match_finished") return { ok: false, error: "INVALID_GAME_PHASE" };
    const staying = room.players.filter((p) => p.left !== true);
    if (staying.length < 2 || staying.every((p) => p.isBot)) {
      return { ok: false, error: "NOT_ENOUGH_PLAYERS" };
    }
    this.start(room, `${room.id}-rematch-${Date.now()}`);
    return { ok: true };
  }

  /**
   * Poslije hidracije (deploy = restart). Ljudi dobijaju dvostruki rok veze:
   * restart ih je sve odspojio, a nisu otišli.
   */
  rearm(room: LobbyRoom): void {
    if (room.game !== "poker") return;
    if (room.status === "waiting" && room.isPublic) {
      this.closeMatching(room.id);
      return;
    }
    const s = room.poker;
    if (!s || room.status !== "playing") return;
    for (const seat of s.seats) {
      const player = room.players.find((p) => p.id === seat.playerId);
      if (isAliveSeat(seat) && player && !player.isBot) {
        this.armGrace(room.id, seat.playerId, this.deps.timing.graceMs * 2);
      }
    }
    this.route(room);
  }

  /** Test i gašenje: ugasi sve tajmere. */
  dispose(): void {
    for (const m of [this.actTimers, this.handTimers, this.matchTimers, this.graceTimers]) {
      for (const t of m.values()) clearTimeout(t);
      m.clear();
    }
    this.armedFor.clear();
    this.deadlines.clear();
    this.turnStarts.clear();
    this.shown.clear();
  }
}
