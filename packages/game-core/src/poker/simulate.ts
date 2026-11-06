import type { PokerGameState } from "@zandar/shared-types";
import { createSeededRandom } from "../shuffle";
import { DEFAULT_POKER_BOT_CONFIG, pokerBotThinkMs, selectPokerBotAction } from "./bot";
import type { PokerBotConfig } from "./bot";
import type { PokerConfig } from "./config";
import {
  applyPokerAction,
  createPokerMatch,
  isPokerMatchFinished,
  pokerTotalChips,
  startPokerHand,
} from "./match";
import { getPokerView } from "./view";

export interface PokerSimOptions {
  matches: number;
  players: number;
  seed: number;
  config?: Partial<Pick<PokerConfig, "startStack" | "handsPerLevel" | "blindLevels">>;
  botConfig?: PokerBotConfig;
}

export interface PokerSimMatch {
  hands: number;
  actions: number;
  /** Zbir vremena odluke botova (ms) — za procjenu trajanja. */
  thinkMs: number;
  /** Ruke koje su završile all-in runoutom. */
  allInHands: number;
  /** Ruke dobijene bez showdowna. */
  uncontestedHands: number;
  /** Ruke koje su vidjele flop. */
  flopHands: number;
  /** Ruka u kojoj je prvi igrač ispao. */
  firstBustHand: number;
}

export interface PokerSimResult {
  matches: PokerSimMatch[];
  /** Akcije kod kojih se zbir žetona promijenio (mora biti 0). */
  chipErrors: number;
  /** Akcije bota koje je motor odbio (mora biti 0). */
  illegalActions: number;
}

/**
 * Mečevi samo s botovima (spec: „Simulacija 10.000 mečeva"). Deterministično
 * za isti seed. Bot dobija samo `getPokerView` — isto kao na serveru.
 */
export function simulatePokerMatches(opts: PokerSimOptions): PokerSimResult {
  const rng = createSeededRandom(opts.seed);
  const botConfig = opts.botConfig ?? DEFAULT_POKER_BOT_CONFIG;
  const out: PokerSimResult = { matches: [], chipErrors: 0, illegalActions: 0 };
  const ids = Array.from({ length: opts.players }, (_, i) => `b${i}`);

  for (let m = 0; m < opts.matches; m++) {
    let s: PokerGameState = createPokerMatch({
      roomId: "sim",
      matchId: `sim-${m}`,
      playerIds: ids,
      rng,
      config: opts.config,
    });
    const total = pokerTotalChips(s);
    const stat: PokerSimMatch = {
      hands: 0,
      actions: 0,
      thinkMs: 0,
      allInHands: 0,
      uncontestedHands: 0,
      flopHands: 0,
      firstBustHand: 0,
    };
    let guard = 0;
    while (!isPokerMatchFinished(s)) {
      if (++guard > 200_000) throw new Error(`SIM_STUCK match ${m}`);
      if (s.phase === "hand_complete") {
        s = startPokerHand(s, rng);
        continue;
      }
      const pid = s.currentPlayerId!;
      const view = getPokerView(s, pid);
      const action = selectPokerBotAction(view, botConfig, rng);
      stat.thinkMs += pokerBotThinkMs(view, botConfig, rng);
      stat.actions += 1;
      const handBefore = s.handNo;
      try {
        s = applyPokerAction(s, pid, action ?? { type: "fold" });
      } catch {
        out.illegalActions += 1;
        s = applyPokerAction(s, pid, { type: view.legal?.canCheck ? "check" : "fold" });
      }
      if (pokerTotalChips(s) !== total) out.chipErrors += 1;
      if (s.phase !== "betting" && s.lastHandResult?.handNo === handBefore) {
        stat.hands += 1;
        if (s.lastHandResult.allInRunout) stat.allInHands += 1;
        if (s.lastHandResult.uncontested) stat.uncontestedHands += 1;
        if (s.board.length >= 3) stat.flopHands += 1;
        if (!stat.firstBustHand && s.seats.some((x) => x.status === "bankrupt")) {
          stat.firstBustHand = handBefore;
        }
      }
    }
    out.matches.push(stat);
  }
  return out;
}
