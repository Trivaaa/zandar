import type {
  Card,
  PokerActionRequest,
  PokerLegalActions,
  PokerPlayerView,
} from "@zandar/shared-types";
import { POKER_CATEGORIES, evaluateBestHand, pokerRankValue } from "./evaluate";

/**
 * Poker bot V1 — pravila, bez učenja (spec: „Botovi").
 *
 * Ulaz je `PokerPlayerView`: isti pogled koji dobija klijent. Bot nema pristup
 * tuđim kartama ni špilu — to drži tip, ne disciplina (HARD RULE 2/3 duh:
 * jačina dolazi samo iz kvaliteta odluke).
 *
 * Sve težine su config (HARD RULE 7). Jedan nivo jačine: solidan, ne savršen.
 */
export interface PokerBotConfig {
  /** Chen skor za otvaranje (raise kad niko nije podigao), po broju igrača u ruci. */
  openChen: { 2: number; 3: number; 4: number };
  /** Chen skor za poziv raisea. */
  callRaiseChen: number;
  /** Chen skor za re-raise. */
  reraiseChen: number;
  /** Odbrana uz dobru cijenu (pot odds < 0.3), npr. big blind protiv min-raisea. */
  defendChen: number;
  /** Postflop: vjerovatnoća raisea sa monster rukom kad neko uloži. */
  monsterRaiseP: number;
  /** Postflop: najviši pot odds koje plaća jaka/srednja ruka. */
  strongCallPotOdds: number;
  mediumCallPotOdds: number;
  /** Postflop raise: udio pota. */
  raisePotFraction: number;
  /** Gornja granica pot oddsa za odbranu. */
  defendPotOdds: number;
  /** Preflop otvaranje u BB. */
  openSizeBb: number;
  /** Čista vjerovatnoća da bot plati i sa slabom rukom (ljudski „da vidim flop"). */
  looseCallP: number;
  /** Ispod ovoliko BB efektivnog stacka: push/fold. */
  pushFoldBb: number;
  /** Push prag na 12 BB; svaki BB manje spušta prag za `pushSlopePerBb`. */
  pushChenAt12: number;
  pushSlopePerBb: number;
  /** Poziv tuđeg all-ina u push/fold zoni. */
  callShoveChen: number;
  /** Vjerovatnoće (šum da bot ne bude predvidiv). */
  bluffP: number;
  slowplayP: number;
  semiBluffP: number;
  /** Nasumični pomak pragova (± u Chen poenima). */
  noise: number;
  /** Raspon vremena odluke. */
  thinkMinMs: number;
  thinkMaxMs: number;
}

export const DEFAULT_POKER_BOT_CONFIG: PokerBotConfig = {
  openChen: { 2: 4, 3: 5, 4: 6 },
  callRaiseChen: 7,
  reraiseChen: 12,
  defendChen: 3,
  monsterRaiseP: 0.35,
  strongCallPotOdds: 0.35,
  mediumCallPotOdds: 0.25,
  raisePotFraction: 0.75,
  defendPotOdds: 0.35,
  openSizeBb: 2.5,
  looseCallP: 0.15,
  pushFoldBb: 12,
  pushChenAt12: 9,
  pushSlopePerBb: 0.45,
  callShoveChen: 9,
  bluffP: 0.12,
  slowplayP: 0.2,
  semiBluffP: 0.45,
  noise: 1,
  thinkMinMs: 1000,
  thinkMaxMs: 5000,
};

/**
 * Chen formula za dvije karte (preflop jačina). Raspon otprilike -1..20.
 * AA = 20, KK = 16, AKs = 12, 72o = -1.
 */
export function chenScore(hole: readonly Card[]): number {
  const [a, b] = hole;
  if (!a || !b) return 0;
  const va = pokerRankValue(a.rank);
  const vb = pokerRankValue(b.rank);
  const hi = Math.max(va, vb);
  const lo = Math.min(va, vb);
  const base = (v: number) => (v === 14 ? 10 : v === 13 ? 8 : v === 12 ? 7 : v === 11 ? 6 : v / 2);
  if (hi === lo) return Math.max(5, base(hi) * 2);
  let score = base(hi);
  if (a.suit === b.suit) score += 2;
  const gap = hi - lo - 1;
  score -= gap === 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
  if (gap <= 1 && hi < 12) score += 1;
  return Math.ceil(score);
}

type PostflopClass = "monster" | "strong" | "medium" | "draw" | "air";

interface PostflopRead {
  cls: PostflopClass;
  /** Približna šansa da draw uspije do kraja (0 kad nema drawa). */
  drawEquity: number;
}

function hasFlushDraw(hole: readonly Card[], board: readonly Card[]): boolean {
  for (const suit of ["clubs", "diamonds", "hearts", "spades"] as const) {
    const n = [...hole, ...board].filter((c) => c.suit === suit).length;
    if (n === 4 && hole.some((c) => c.suit === suit)) return true;
  }
  return false;
}

function hasOpenEnder(hole: readonly Card[], board: readonly Card[]): boolean {
  const vals = new Set([...hole, ...board].map((c) => pokerRankValue(c.rank)));
  if (vals.has(14)) vals.add(1);
  const holeVals = new Set(hole.flatMap((c) => (c.rank === "A" ? [14, 1] : [pokerRankValue(c.rank)])));
  for (let lo = 1; lo <= 10; lo++) {
    const run = [lo, lo + 1, lo + 2, lo + 3];
    if (run.every((v) => vals.has(v)) && run.some((v) => holeVals.has(v))) {
      // Otvoren s obje strane (nije A-2-3-4 ni J-Q-K-A).
      if (lo >= 2 && lo + 3 <= 13) return true;
    }
  }
  return false;
}

/** Procjena ruke postflop iz vlastitih karata i boarda (ništa skriveno). */
export function readPostflop(hole: readonly Card[], board: readonly Card[]): PostflopRead {
  const mine = evaluateBestHand([...hole, ...board]);
  const cat = POKER_CATEGORIES.indexOf(mine.category);
  // Kombinacija koju daje sam board ne pripada nama.
  const boardOnly = board.length >= 5 ? POKER_CATEGORIES.indexOf(evaluateBestHand(board).category) : -1;
  const usesHole = cat > boardOnly;
  const cardsToCome = board.length === 3 ? 2 : board.length === 4 ? 1 : 0;

  if (usesHole && cat >= POKER_CATEGORIES.indexOf("straight")) return { cls: "monster", drawEquity: 0 };
  if (usesHole && cat >= POKER_CATEGORIES.indexOf("two_pair")) {
    return { cls: cat >= POKER_CATEGORIES.indexOf("three_of_a_kind") ? "monster" : "strong", drawEquity: 0 };
  }

  const boardVals = board.map((c) => pokerRankValue(c.rank)).sort((x, y) => y - x);
  const holeVals = hole.map((c) => pokerRankValue(c.rank));
  if (usesHole && mine.category === "pair") {
    const pairVal = mine.score[1]!;
    const pocket = holeVals[0] === holeVals[1];
    const topBoard = boardVals[0] ?? 0;
    const kicker = Math.max(...holeVals.filter((v) => v !== pairVal), 0);
    const overpair = pocket && pairVal > topBoard;
    const topPair = !pocket && pairVal === topBoard;
    if (overpair || (topPair && (kicker >= 10 || pairVal >= 13))) return { cls: "strong", drawEquity: 0 };
    return { cls: "medium", drawEquity: 0 };
  }

  if (cardsToCome > 0) {
    const flush = hasFlushDraw(hole, board);
    const oesd = hasOpenEnder(hole, board);
    if (flush || oesd) {
      const outs = (flush ? 9 : 0) + (oesd ? (flush ? 6 : 8) : 0);
      const equity = cardsToCome === 2 ? Math.min(0.6, outs * 0.04) : outs * 0.02;
      return { cls: "draw", drawEquity: equity };
    }
  }
  return { cls: "air", drawEquity: 0 };
}

/** „Raise to" iznos za udio pota, u granicama dozvoljenog; blizu stacka → all-in. */
function sizeTo(view: PokerPlayerView, legal: PokerLegalActions, potFraction: number): number {
  const toCall = legal.callAmount;
  const potAfterCall = view.potTotal + toCall;
  const raw = view.currentBet + Math.round(potFraction * potAfterCall);
  let to = Math.max(legal.minTo, Math.min(legal.maxTo, raw));
  if (to >= legal.maxTo * 0.7) to = legal.maxTo;
  return to;
}

function aggress(
  view: PokerPlayerView,
  legal: PokerLegalActions,
  potFraction: number,
): PokerActionRequest | null {
  if (!legal.canBet && !legal.canRaise) return null;
  const to = sizeTo(view, legal, potFraction);
  if (to >= legal.maxTo) return { type: "allin" };
  return { type: legal.canBet ? "bet" : "raise", amount: to };
}

/** Agresija na tačan „raise to" iznos (preflop otvaranje). */
function aggressTo(legal: PokerLegalActions, raw: number): PokerActionRequest | null {
  if (!legal.canBet && !legal.canRaise) return null;
  let to = Math.max(legal.minTo, Math.min(legal.maxTo, Math.round(raw)));
  if (to >= legal.maxTo * 0.7) to = legal.maxTo;
  if (to >= legal.maxTo) return { type: "allin" };
  return { type: legal.canBet ? "bet" : "raise", amount: to };
}

function passive(legal: PokerLegalActions): PokerActionRequest {
  return legal.canCheck ? { type: "check" } : { type: "fold" };
}

function callOr(legal: PokerLegalActions): PokerActionRequest {
  return legal.canCheck ? { type: "check" } : { type: "call" };
}

/**
 * Odluka bota. `view.legal` mora postojati (bot je na potezu); inače null.
 * Vraća samo akcije koje `getPokerLegalActions` dozvoljava.
 */
export function selectPokerBotAction(
  view: PokerPlayerView,
  config: PokerBotConfig = DEFAULT_POKER_BOT_CONFIG,
  rng: () => number = Math.random,
): PokerActionRequest | null {
  const legal = view.legal;
  if (!legal) return null;
  const me = view.seats.find((s) => s.playerId === view.myPlayerId);
  if (!me) return null;

  const bb = Math.max(1, view.bigBlind);
  const contenders = view.seats.filter((s) => s.inHand && !s.folded);
  const opponents = contenders.filter((s) => s.playerId !== me.playerId);
  const maxOppStack = Math.max(0, ...opponents.map((s) => s.stack + s.streetBet));
  const effectiveBb = Math.min(me.stack + me.streetBet, maxOppStack) / bb;
  const jitter = () => (rng() * 2 - 1) * config.noise;
  const toCall = legal.callAmount;
  const potOdds = toCall > 0 ? toCall / (view.potTotal + toCall) : 0;

  if (view.street === "preflop") {
    const chen = chenScore(view.myCards) + jitter();
    const n = Math.min(4, Math.max(2, contenders.length)) as 2 | 3 | 4;
    const raised = view.currentBet > bb;

    // Kratak stack: push/fold.
    if (effectiveBb < config.pushFoldBb) {
      const facingShove = raised && opponents.some((s) => s.allIn);
      if (facingShove || toCall >= me.stack) {
        const need = config.callShoveChen - (potOdds < 0.3 ? 1.5 : 0);
        return chen >= need ? { type: legal.canCall ? "call" : "check" } : passive(legal);
      }
      const pushAt = config.pushChenAt12 - (config.pushFoldBb - effectiveBb) * config.pushSlopePerBb;
      if (chen >= pushAt && (legal.canBet || legal.canRaise)) return { type: "allin" };
      if (chen >= pushAt) return callOr(legal);
      return passive(legal);
    }

    if (!raised) {
      // Otvaranje 2,5 BB + po jedan BB za svakog ko je samo platio.
      const limpers = Math.max(0, Math.round((view.potTotal - view.smallBlind - bb) / bb));
      if (chen >= config.openChen[n]) {
        return aggressTo(legal, config.openSizeBb * bb + limpers * bb) ?? callOr(legal);
      }
      // Mali poziv iz small blinda / check u big blindu.
      if (legal.canCheck) return { type: "check" };
      if (toCall <= bb && chen >= config.openChen[n] - 3) return { type: "call" };
      if (toCall <= bb && rng() < config.looseCallP) return { type: "call" };
      if (rng() < config.bluffP / 2 && legal.canRaise) {
        return aggressTo(legal, config.openSizeBb * bb + limpers * bb) ?? passive(legal);
      }
      return passive(legal);
    }
    // Re-raise ~3× tuđeg uloga.
    if (chen >= config.reraiseChen) return aggressTo(legal, view.currentBet * 3) ?? callOr(legal);
    const priceOk = toCall <= (me.stack + me.streetBet) * 0.25;
    if (chen >= config.callRaiseChen && priceOk) return callOr(legal);
    if (chen >= config.defendChen && potOdds < config.defendPotOdds) return callOr(legal);
    if (priceOk && potOdds < 0.35 && rng() < config.looseCallP) return callOr(legal);
    return passive(legal);
  }

  // Postflop.
  const read = readPostflop(view.myCards, view.board);
  const headsUp = opponents.length === 1;
  const bluffP = config.bluffP * (headsUp ? 1.6 : 1);

  if (toCall === 0) {
    switch (read.cls) {
      case "monster":
        if (rng() < config.slowplayP) return { type: "check" };
        return aggress(view, legal, 0.75) ?? { type: "check" };
      case "strong":
        return aggress(view, legal, 0.66) ?? { type: "check" };
      case "medium":
        return rng() < 0.4 ? aggress(view, legal, 0.5) ?? { type: "check" } : { type: "check" };
      case "draw":
        return rng() < config.semiBluffP ? aggress(view, legal, 0.5) ?? { type: "check" } : { type: "check" };
      case "air":
        return rng() < bluffP ? aggress(view, legal, 0.5) ?? { type: "check" } : { type: "check" };
    }
  }

  switch (read.cls) {
    case "monster":
      return rng() < config.monsterRaiseP
        ? aggress(view, legal, config.raisePotFraction) ?? { type: "call" }
        : { type: "call" };
    case "strong":
      if (rng() < 0.25) return aggress(view, legal, 0.8) ?? { type: "call" };
      return potOdds < config.strongCallPotOdds ? { type: "call" } : passive(legal);
    case "medium":
      return potOdds < config.mediumCallPotOdds + jitter() * 0.05 ? { type: "call" } : passive(legal);
    case "draw":
      return potOdds < read.drawEquity ? { type: "call" } : passive(legal);
    case "air":
      if (rng() < bluffP / 4) return aggress(view, legal, 1) ?? passive(legal);
      return passive(legal);
  }
}

/**
 * Vrijeme odluke 1–5 s, nasumično, duže kod većih odluka (spec).
 * „Veća" = koliko stacka odluka košta ili koliko je pot velik.
 */
export function pokerBotThinkMs(
  view: PokerPlayerView,
  config: PokerBotConfig = DEFAULT_POKER_BOT_CONFIG,
  rng: () => number = Math.random,
): number {
  const me = view.seats.find((s) => s.playerId === view.myPlayerId);
  const stack = Math.max(1, (me?.stack ?? 0) + (me?.streetBet ?? 0));
  const cost = view.legal ? view.legal.callAmount / stack : 0;
  const potWeight = Math.min(1, view.potTotal / (stack * 2));
  const weight = Math.min(1, cost * 1.5 + potWeight * 0.5);
  const span = config.thinkMaxMs - config.thinkMinMs;
  const ms = config.thinkMinMs + span * (0.15 + 0.45 * rng() + 0.4 * weight);
  return Math.round(Math.min(config.thinkMaxMs, Math.max(config.thinkMinMs, ms)));
}
