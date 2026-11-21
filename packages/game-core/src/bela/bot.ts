import type { BelaAction, BelaPlayerView, Card, Suit } from "@zandar/shared-types";
import { belaBeats, belaCardPoints, belaCheapestCard, belaStrength, belaTrickWinnerIndex, createBelaDeck } from "./cards";
import { BELA_SUITS } from "./match";
import { belaStrongestSuit } from "./view";

/**
 * Bela bot V1 — pravila, bez učenja (spec: „Botovi").
 *
 * Ulaz je `BelaPlayerView`: isti pogled koji dobija klijent — bez partnerovih
 * i protivničkih karata, talona i špila (HARD RULE 3). Igra samo karte iz
 * `legalCardIds` i boje iz `callOptions` (HARD RULE 2). Svi pragovi su config
 * (HARD RULE 7). Igra za tim samo iz javnih informacija (odigrane karte, ko
 * nosi štih).
 */
export interface BelaBotConfig {
  /** Zove adut kad procjena boje dostigne ovaj prag (bodovi aduta + bonusi). */
  callThreshold: number;
  /** Bonus po karti boje koja bi bila adut (dužina aduta). */
  perTrumpBonus: number;
  /** Bonus po asu van te boje. */
  sideAceBonus: number;
  /** Vjerovatnoća pomaka praga za ±`noiseAmount`. */
  noiseP: number;
  noiseAmount: number;
  /** Tim koji je zvao vuče adute najjačim adutom dok je on „gospodar". */
  callerPullsTrumps: boolean;
  /** Kad partner sigurno nosi štih, baca mu bodove („maže"). */
  smearToPartner: boolean;
  /** Vjerovatnoća namjerno slabijeg (ali dozvoljenog) poteza. */
  blunderP: number;
  thinkMinMs: number;
  thinkMaxMs: number;
}

export const DEFAULT_BELA_BOT_CONFIG: BelaBotConfig = {
  callThreshold: 42,
  perTrumpBonus: 5,
  sideAceBonus: 8,
  noiseP: 0.2,
  noiseAmount: 8,
  callerPullsTrumps: true,
  smearToPartner: true,
  blunderP: 0.04,
  // Isto kao Raub (odluka 11 u Raub specu): 2,5–7 s, nasumično.
  thinkMinMs: 2500,
  thinkMaxMs: 7000,
};

/** Procjena boje kao aduta iz vidljivih karata. */
export function belaSuitStrength(cards: readonly Card[], suit: Suit, config: BelaBotConfig = DEFAULT_BELA_BOT_CONFIG): number {
  let v = 0;
  for (const c of cards) {
    if (c.suit === suit) v += belaCardPoints(c, suit) + config.perTrumpBonus;
    else if (c.rank === "A") v += config.sideAceBonus;
  }
  return v;
}

function chooseCall(view: BelaPlayerView, config: BelaBotConfig, rng: () => number): Suit | null {
  const opts = view.callOptions!;
  const suits = opts.suits.length > 0 ? opts.suits : [...BELA_SUITS];
  if (!opts.canPass) return belaStrongestSuit(view.myCards, suits);
  let best: Suit | null = null;
  let bestV = -Infinity;
  for (const s of suits) {
    const v = belaSuitStrength(view.myCards, s, config);
    if (v > bestV) {
      bestV = v;
      best = s;
    }
  }
  let threshold = config.callThreshold;
  if (rng() < config.noiseP) threshold += rng() < 0.5 ? -config.noiseAmount : config.noiseAmount;
  return best && bestV >= threshold ? best : null;
}

/** Sve odigrane karte u ovoj ruci (javno). */
function playedCards(view: BelaPlayerView): Card[] {
  return view.tricks.flatMap((t) => t.plays.map((p) => p.card));
}

/** Karte koje bot ne vidi (nisu kod njega i nisu odigrane) — mogu biti kod bilo koga. */
function unseenCards(view: BelaPlayerView): Card[] {
  const known = new Set([...view.myCards, ...playedCards(view)].map((c) => c.id));
  return createBelaDeck().filter((c) => !known.has(c.id));
}

/** Može li `card` biti nadjačana nekom neviđenom kartom (iste boje ili adutom). */
function isBoss(card: Card, view: BelaPlayerView, led: Suit): boolean {
  const trump = view.trumpSuit;
  return !unseenCards(view).some((u) => belaBeats(u, card, led, trump));
}

function teamOf(view: BelaPlayerView, playerId: string): number {
  return view.seats.find((s) => s.playerId === playerId)!.team;
}

function choosePlay(view: BelaPlayerView, config: BelaBotConfig, rng: () => number): Card {
  const trump = view.trumpSuit;
  const legal = view.myCards.filter((c) => view.legalCardIds!.includes(c.id));
  if (legal.length === 1) return legal[0]!;
  if (rng() < config.blunderP) return legal[Math.floor(rng() * legal.length)]!;

  const trick = view.tricks.at(-1)!;
  const byStrength = (a: Card, b: Card) => belaStrength(a, trump) - belaStrength(b, trump);

  if (trick.plays.length === 0) {
    // Otvaranje.
    const myTrumps = legal.filter((c) => c.suit === trump).sort(byStrength);
    const trumpsOut = unseenCards(view).some((c) => c.suit === trump);
    const weCalled = view.callerId !== null && teamOf(view, view.callerId) === view.myTeam;
    const topTrump = myTrumps.at(-1);
    if (config.callerPullsTrumps && weCalled && trumpsOut && topTrump && isBoss(topTrump, view, trump!)) return topTrump;
    const sideBoss = legal
      .filter((c) => c.suit !== trump && isBoss(c, view, c.suit))
      .sort((a, b) => belaCardPoints(b, trump) - belaCardPoints(a, trump));
    if (sideBoss.length > 0 && !(trumpsOut && !weCalled && sideBoss[0]!.rank !== "A")) return sideBoss[0]!;
    const side = legal.filter((c) => c.suit !== trump);
    return belaCheapestCard(side.length > 0 ? side : legal, trump);
  }

  const led = trick.plays[0]!.card.suit;
  const cards = trick.plays.map((p) => p.card);
  const bestIdx = belaTrickWinnerIndex(cards, trump);
  const best = cards[bestIdx]!;
  const partnerWinning = teamOf(view, trick.plays[bestIdx]!.playerId) === view.myTeam;
  const last = trick.plays.length === view.seats.length - 1;

  if (partnerWinning) {
    if (config.smearToPartner && (last || isBoss(best, view, led))) {
      // Maže: najviše bodova, ali ne adut (čuva adute).
      const side = legal.filter((c) => c.suit !== trump);
      if (side.length > 0) {
        return [...side].sort((a, b) => belaCardPoints(b, trump) - belaCardPoints(a, trump) || byStrength(a, b))[0]!;
      }
    }
    return belaCheapestCard(legal, trump);
  }

  const winners = legal.filter((c) => belaBeats(c, best, led, trump)).sort(byStrength);
  if (winners.length > 0) {
    if (last) return winners[0]!;
    // Nije zadnji: najslabija karta koja ostaje gospodar, inače najslabija pobjednička.
    return winners.find((c) => isBoss(c, view, led)) ?? winners[0]!;
  }
  return belaCheapestCard(legal, trump);
}

/** Akcija bota za igrača na potezu (iz njegovog pogleda). */
export function selectBelaBotAction(
  view: BelaPlayerView,
  config: BelaBotConfig = DEFAULT_BELA_BOT_CONFIG,
  rng: () => number = Math.random,
): BelaAction {
  if (view.phase !== "playing" || view.currentPlayerId !== view.myPlayerId) throw new Error("NOT_YOUR_TURN");
  if (view.step === "calling" && view.callOptions) return { type: "call", suit: chooseCall(view, config, rng) };
  if (view.step === "tricks" && view.legalCardIds) {
    return { type: "play", cardId: choosePlay(view, config, rng).id, declare: true };
  }
  throw new Error("INVALID_ACTION");
}

/** Vrijeme odluke bota (ms), nasumično u rasponu iz configa. */
export function belaBotThinkMs(config: BelaBotConfig = DEFAULT_BELA_BOT_CONFIG, rng: () => number = Math.random): number {
  return Math.round(config.thinkMinMs + (config.thinkMaxMs - config.thinkMinMs) * rng());
}
