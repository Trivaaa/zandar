import type { RaubGameState } from "@zandar/shared-types";
import { createSeededRandom } from "../shuffle";
import { DEFAULT_RAUB_BOT_CONFIG, raubBotThinkMs, selectRaubBotAction } from "./bot";
import type { RaubBotConfig } from "./bot";
import { createRaubRules } from "./config";
import {
  RAUB_DECK_SIZE,
  RAUB_TRICKS_PER_HAND,
  applyRaubAction,
  createRaubMatch,
  isRaubMatchFinished,
  raubCardCount,
  startRaubHand,
} from "./match";
import { getRaubView } from "./view";

export interface RaubSimOptions {
  matches: number;
  players: 2 | 3 | 4;
  seed: number;
  botConfig?: RaubBotConfig;
  /** Sigurnosna granica ruku po meču (meč koji je ne dostigne smatra se zaglavljenim). */
  maxHands?: number;
}

export interface RaubSimMatch {
  hands: number;
  /** Ruke poništene refom. */
  voidHands: number;
  actions: number;
  /** Zbir vremena odluke botova (ms) — za procjenu trajanja. */
  thinkMs: number;
  /** Odigrane ruke po scenariju aduta. */
  seven: number;
  blind: number;
  bid: number;
}

export interface RaubSimResult {
  matches: RaubSimMatch[];
  /** Stanja u kojima 32 karte nisu bile na tačno jednom mjestu (mora biti 0). */
  cardErrors: number;
  /** Odigrane ruke koje nisu imale tačno 4 štiha (mora biti 0). */
  trickErrors: number;
  /** Akcije bota koje je motor odbio (mora biti 0). */
  illegalActions: number;
  /** Mečevi koji nisu završili u `maxHands` (mora biti 0). */
  stuck: number;
}

/**
 * Mečevi samo s botovima (spec: „Simulacija 10.000 mečeva"). Deterministično
 * za isti seed. Bot dobija samo `getRaubView` — isto kao na serveru.
 */
export function simulateRaubMatches(opts: RaubSimOptions): RaubSimResult {
  const rng = createSeededRandom(opts.seed);
  const botConfig = opts.botConfig ?? DEFAULT_RAUB_BOT_CONFIG;
  const maxHands = opts.maxHands ?? 500;
  const out: RaubSimResult = { matches: [], cardErrors: 0, trickErrors: 0, illegalActions: 0, stuck: 0 };
  const ids = Array.from({ length: opts.players }, (_, i) => `b${i}`);
  const check = (s: RaubGameState) => {
    if (raubCardCount(s) !== RAUB_DECK_SIZE) out.cardErrors += 1;
  };

  for (let m = 0; m < opts.matches; m++) {
    let s = createRaubMatch({
      roomId: "sim",
      matchId: `sim-${m}`,
      playerIds: ids,
      rules: createRaubRules(opts.players),
      rng,
    });
    const rec: RaubSimMatch = { hands: 0, voidHands: 0, actions: 0, thinkMs: 0, seven: 0, blind: 0, bid: 0 };
    check(s);

    while (!isRaubMatchFinished(s)) {
      if (s.phase === "hand_complete") {
        const last = s.lastHand!;
        rec.hands += 1;
        if (last.void) rec.voidHands += 1;
        else {
          rec[last.scenario!] += 1;
          const tricks = last.rows.reduce((sum, r) => sum + r.tricks, 0);
          if (tricks !== RAUB_TRICKS_PER_HAND) out.trickErrors += 1;
        }
        if (rec.hands >= maxHands) break;
        s = startRaubHand(s, rng);
        check(s);
        continue;
      }
      const pid = s.currentPlayerId!;
      const view = getRaubView(s, pid);
      const action = selectRaubBotAction(view, botConfig, rng);
      rec.thinkMs += raubBotThinkMs(botConfig, rng);
      try {
        s = applyRaubAction(s, pid, action);
      } catch {
        out.illegalActions += 1;
        break;
      }
      rec.actions += 1;
      check(s);
    }

    if (s.phase === "match_finished") {
      // Zadnja ruka meča (ona koja je dovela do 0) se broji ovdje.
      const last = s.lastHand!;
      rec.hands += 1;
      rec[last.scenario!] += 1;
      const tricks = last.rows.reduce((sum, r) => sum + r.tricks, 0);
      if (tricks !== RAUB_TRICKS_PER_HAND) out.trickErrors += 1;
    } else {
      out.stuck += 1;
    }
    out.matches.push(rec);
  }
  return out;
}
