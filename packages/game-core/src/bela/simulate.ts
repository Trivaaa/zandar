import type { BelaGameState, BelaHandResult, BelaRules } from "@zandar/shared-types";
import { createSeededRandom } from "../shuffle";
import { DEFAULT_BELA_BOT_CONFIG, belaBotThinkMs, selectBelaBotAction } from "./bot";
import type { BelaBotConfig } from "./bot";
import { BELA_CARD_POINTS, BELA_DECK_SIZE, BELA_TRICKS_PER_HAND } from "./cards";
import { createBelaRules } from "./config";
import { applyBelaAction, belaCardCount, createBelaMatch, isBelaMatchFinished, startBelaHand } from "./match";
import { getBelaView } from "./view";

export interface BelaSimOptions {
  matches: number;
  seed: number;
  rules?: Partial<Omit<BelaRules, "playerCount">>;
  botConfig?: BelaBotConfig;
  /** Sigurnosna granica ruku po meču (meč koji je ne dostigne smatra se zaglavljenim). */
  maxHands?: number;
}

export interface BelaSimMatch {
  /** Sve ruke, uključujući ponovljena dijeljenja. */
  hands: number;
  redeals: number;
  passes: number;
  fails: number;
  hangs: number;
  stigljas: number;
  forced: number;
  actions: number;
  /** Zbir vremena odluke botova (ms) — za procjenu trajanja. */
  thinkMs: number;
}

export interface BelaSimResult {
  matches: BelaSimMatch[];
  /** Stanja u kojima 32 karte nisu bile na tačno jednom mjestu (mora biti 0). */
  cardErrors: number;
  /** Odigrane ruke bez tačno 8 štihova (mora biti 0). */
  trickErrors: number;
  /** Odigrane ruke čiji zbir bodova karata nije 162 (+ štiglja) (mora biti 0). */
  pointErrors: number;
  /** Akcije bota koje je motor odbio (mora biti 0). */
  illegalActions: number;
  /** Mečevi koji nisu završili u `maxHands` (mora biti 0). */
  stuck: number;
}

/**
 * Mečevi samo s botovima (spec: „Simulacija"). Deterministično za isti seed.
 * Bot dobija samo `getBelaView` — isto kao na serveru.
 */
export function simulateBelaMatches(opts: BelaSimOptions): BelaSimResult {
  const rng = createSeededRandom(opts.seed);
  const botConfig = opts.botConfig ?? DEFAULT_BELA_BOT_CONFIG;
  const maxHands = opts.maxHands ?? 300;
  const rules = createBelaRules(opts.rules);
  const out: BelaSimResult = { matches: [], cardErrors: 0, trickErrors: 0, pointErrors: 0, illegalActions: 0, stuck: 0 };
  const ids = ["b0", "b1", "b2", "b3"];
  const check = (s: BelaGameState) => {
    if (belaCardCount(s) !== BELA_DECK_SIZE) out.cardErrors += 1;
  };

  for (let m = 0; m < opts.matches; m++) {
    let s = createBelaMatch({ roomId: "sim", matchId: `sim-${m}`, playerIds: ids, rules, rng });
    const rec: BelaSimMatch = { hands: 0, redeals: 0, passes: 0, fails: 0, hangs: 0, stigljas: 0, forced: 0, actions: 0, thinkMs: 0 };
    const record = (h: BelaHandResult, st: BelaGameState) => {
      rec.hands += 1;
      if (h.outcome === "redeal") {
        rec.redeals += 1;
        return;
      }
      if (h.outcome === "pass") rec.passes += 1;
      else if (h.outcome === "fail") rec.fails += 1;
      else rec.hangs += 1;
      if (h.stiglja !== null) rec.stigljas += 1;
      if (h.forced) rec.forced += 1;
      if (st.tricks.length !== BELA_TRICKS_PER_HAND || st.tricks.some((t) => t.plays.length !== 4)) out.trickErrors += 1;
      const cards = h.teams.reduce((a, t) => a + t.cardPoints, 0);
      const expected = BELA_CARD_POINTS + rules.lastTrickBonus + (h.stiglja !== null ? rules.stigljaBonus : 0);
      if (cards !== expected) out.pointErrors += 1;
    };
    check(s);

    while (!isBelaMatchFinished(s)) {
      if (s.phase === "hand_complete") {
        record(s.lastHand!, s);
        if (rec.hands >= maxHands) break;
        s = startBelaHand(s, rng);
        check(s);
        continue;
      }
      const pid = s.currentPlayerId!;
      const action = selectBelaBotAction(getBelaView(s, pid), botConfig, rng);
      rec.thinkMs += belaBotThinkMs(botConfig, rng);
      try {
        s = applyBelaAction(s, pid, action);
      } catch {
        out.illegalActions += 1;
        break;
      }
      rec.actions += 1;
      check(s);
    }

    if (s.phase === "match_finished") record(s.lastHand!, s);
    else out.stuck += 1;
    out.matches.push(rec);
  }
  return out;
}
