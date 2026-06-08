import type { BotSkillTier, Card, GameState } from "@zandar/shared-types";
import { getCaptureOptions } from "./capture";

// ====================================================
// BOT CONFIG
// ====================================================

export type BotWeights = {
  cards: number;
  clubs: number;
  twoClubs: number;
  tenDiamonds: number;
  jackSweep: number;
  defense: number;
};

export type BotConfig = {
  tier: BotSkillTier;
  /** Uniform noise half-range added to each move score (0 = no noise). */
  noise: number;
  /** Probability [0,1] of intentionally picking a suboptimal move. */
  blunderP: number;
  weights: BotWeights;
  /** Only tier 3 penalises moves that leave easy captures for the opponent. */
  useDefense: boolean;
  /**
   * Minimum "table value" required before the bot considers playing a J.
   * 0 = play J whenever it's a legal capture (Tier 1 behaviour).
   */
  jackTimingThreshold: number;
};

export const DEFAULT_BOT_CONFIGS: Record<BotSkillTier, BotConfig> = {
  1: {
    tier: 1,
    noise: 1.5,
    blunderP: 0.25,
    weights: { cards: 1, clubs: 0.5, twoClubs: 0.5, tenDiamonds: 0.5, jackSweep: 0.5, defense: 0 },
    useDefense: false,
    jackTimingThreshold: 0,
  },
  2: {
    tier: 2,
    noise: 0.6,
    blunderP: 0.08,
    weights: { cards: 1, clubs: 1.0, twoClubs: 2.0, tenDiamonds: 2.0, jackSweep: 2.0, defense: 0 },
    useDefense: false,
    jackTimingThreshold: 3,
  },
  3: {
    tier: 3,
    noise: 0.1,
    blunderP: 0.0,
    weights: { cards: 1, clubs: 1.5, twoClubs: 3.0, tenDiamonds: 3.0, jackSweep: 3.0, defense: 1.5 },
    useDefense: true,
    jackTimingThreshold: 5,
  },
};

// ====================================================
// INTERNAL ENRICHED MOVE
// ====================================================

type EnrichedMove = {
  cardId: string;
  selectedCaptureCardIds: string[];
  playedCard: Card;
  capturedFromTable: Card[];
  isJackSweep: boolean;
  isTrail: boolean;
};

// ====================================================
// HELPERS
// ====================================================

/**
 * Procjenjuje "bogatstvo" stola za svrhu jack timing-a.
 * Viši skor = bogatiji sto = vrijedi igrati J.
 */
function assessTableValue(table: Card[]): number {
  let value = table.length;
  for (const c of table) {
    if (c.id === "clubs-2") value += 2;
    if (c.id === "diamonds-10") value += 2;
    if (c.suit === "clubs") value += 0.5;
  }
  return value;
}

/**
 * Strateška vrijednost igranja J-a, skalirana prema bogatstvu stola i konfigu.
 * Tier 1 (jackTimingThreshold=0): uvijek pozitivna vrijednost — igraj J odmah.
 * Tier 3 (jackTimingThreshold=5): negativna kazna dok sto nije dovoljno bogat
 * (modelira "čuvaj J za pravi trenutak" — bolje trailovati nego baciti J na prazan sto).
 */
function jackTimingValue(table: Card[], config: BotConfig): number {
  if (config.jackTimingThreshold === 0) return config.weights.jackSweep;
  const value = assessTableValue(table);
  return value >= config.jackTimingThreshold
    ? config.weights.jackSweep
    : -config.weights.jackSweep;
}

/**
 * Procjenjuje da li trailanje ove karte ostavlja lak plijen za protivnika.
 * Provjera: da li na stolu već postoji karta istog ranka? Ako da, protivnik
 * može igrati tu rank i pokupiti obje karte.
 */
function leavesEasyCaptureForOpp(playedCard: Card, table: Card[]): boolean {
  return table.some((t) => t.rank === playedCard.rank);
}

// ====================================================
// MOVE ENUMERATION
// ====================================================

/**
 * Vraća sve legalne poteze za igrača u datom state-u.
 *
 * Poštuje forceCapture: ako postoji ijedna capture opcija (za bilo koju kartu),
 * trail potezi se eliminišu i vraćaju se SAMO capture potezi.
 *
 * Svaka (karta, captureOption) kombinacija je poseban legalni potez.
 */
function enumerateLegalMoves(state: GameState, playerId: string): EnrichedMove[] {
  const hand = state.hands[playerId];
  if (!hand || hand.length === 0) return [];

  const table = state.table;
  const tableById = new Map(table.map((c) => [c.id, c]));

  const captures: EnrichedMove[] = [];

  for (const card of hand) {
    const options = getCaptureOptions(card, table);
    for (const option of options) {
      captures.push({
        cardId: card.id,
        selectedCaptureCardIds: option.cardIds,
        playedCard: card,
        capturedFromTable: option.cardIds
          .map((id) => tableById.get(id))
          .filter((c): c is Card => c !== undefined),
        isJackSweep: option.reason === "jack_clear",
        isTrail: false,
      });
    }
  }

  if (state.rulesConfig.forceCapture && captures.length > 0) {
    return captures;
  }

  const trails: EnrichedMove[] = hand.map((card) => ({
    cardId: card.id,
    selectedCaptureCardIds: [],
    playedCard: card,
    capturedFromTable: [],
    isJackSweep: false,
    isTrail: true,
  }));

  return [...captures, ...trails];
}

// ====================================================
// SCORING
// ====================================================

/**
 * Daje skor jednom potezu prema BotConfig težinama.
 *
 * Za capture poteze:
 *   - Broj karata koje idu u pile = capturedFromTable + odigrana karta
 *   - Trefovi, 2♣, 10♦ nose bonus
 *   - J sweep nosi dodatnu stratešku vrijednost skaliranu timingovm praga
 *
 * Za trail poteze:
 *   - Skor je 0 po defaultu
 *   - Tier 3 kažnjava trail koji kreira rank par na stolu (lak plijen za protivnika)
 */
function scoreMove(move: EnrichedMove, state: GameState, config: BotConfig): number {
  let s = 0;

  if (!move.isTrail) {
    // Sve karte koje idu u pile: odigrana karta + pokupljene sa stola
    const allGained = [move.playedCard, ...move.capturedFromTable];

    s += allGained.length * config.weights.cards;
    s += allGained.filter((c) => c.suit === "clubs").length * config.weights.clubs;
    if (allGained.some((c) => c.id === "clubs-2")) s += config.weights.twoClubs;
    if (allGained.some((c) => c.id === "diamonds-10")) s += config.weights.tenDiamonds;

    // Jack sweep: strateška bonus vrijednost za čišćenje stola u pravom trenutku
    if (move.isJackSweep) {
      s += jackTimingValue(state.table, config);
    }
  }

  if (config.useDefense && move.isTrail) {
    if (leavesEasyCaptureForOpp(move.playedCard, state.table)) {
      s -= config.weights.defense;
    }
  }

  return s;
}

// ====================================================
// MOVE SELECTION
// ====================================================

/**
 * Bira potez sa maksimalnim skorom, uz uniformni šum ±noise.
 * noise=0 je deterministički argmax.
 */
function argmaxWithNoise(
  scored: Array<{ move: EnrichedMove; base: number }>,
  noise: number,
  rng: () => number,
): EnrichedMove {
  if (scored.length === 1) return scored[0]!.move;

  if (noise === 0) {
    return scored.reduce((best, curr) => (curr.base >= best.base ? curr : best)).move;
  }

  return scored
    .map((x) => ({ move: x.move, score: x.base + (rng() - 0.5) * 2 * noise }))
    .reduce((best, curr) => (curr.score >= best.score ? curr : best)).move;
}

/**
 * Namjerno bira suboptimalan potez ("blunder").
 * Bira nasumično iz svih poteza OSIM najboljeg (prema base skoru).
 */
function pickPlausibleSuboptimal(
  scored: Array<{ move: EnrichedMove; base: number }>,
  rng: () => number,
): EnrichedMove {
  if (scored.length <= 1) return scored[0]!.move;

  const sorted = [...scored].sort((a, b) => b.base - a.base);
  const nonBest = sorted.slice(1);
  return nonBest[Math.floor(rng() * nonBest.length)]!.move;
}

// ====================================================
// PUBLIC API
// ====================================================

/**
 * Bira bot potez za igrača u datom state-u.
 *
 * Garantuje:
 * - Uvijek vraća legalan potez (prolazi kroz applyMove bez greške)
 * - Poštuje forceCapture
 * - Deterministički ako je proslijeđen seeded rng
 *
 * @param state    Cijeli GameState (server-side)
 * @param playerId ID igrača (mora biti currentPlayerId)
 * @param config   Konfiguracija za ovaj bot tier
 * @param rng      Opcionalni seeded RNG; default Math.random
 * @returns        { cardId, selectedCaptureCardIds } za PlayCardRequest
 */
export function selectBotMove(
  state: GameState,
  playerId: string,
  config: BotConfig,
  rng: () => number = Math.random,
): { cardId: string; selectedCaptureCardIds: string[] } {
  const legal = enumerateLegalMoves(state, playerId);

  if (legal.length === 0) {
    throw new Error("BOT_NO_LEGAL_MOVES");
  }

  if (legal.length === 1) {
    const m = legal[0]!;
    return { cardId: m.cardId, selectedCaptureCardIds: m.selectedCaptureCardIds };
  }

  const scored = legal.map((move) => ({
    move,
    base: scoreMove(move, state, config),
  }));

  const chosen =
    rng() < config.blunderP
      ? pickPlausibleSuboptimal(scored, rng)
      : argmaxWithNoise(scored, config.noise, rng);

  return {
    cardId: chosen.cardId,
    selectedCaptureCardIds: chosen.selectedCaptureCardIds,
  };
}
