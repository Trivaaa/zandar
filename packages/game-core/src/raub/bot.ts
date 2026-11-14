import type { Card, RaubAction, RaubPlayerView, Suit } from "@zandar/shared-types";
import { beats, isSeven, raubRankValue, trickWinnerIndex, weakestCard } from "./cards";

/**
 * Raub bot V1 — pravila, bez učenja (spec: „Botovi").
 *
 * Ulaz je `RaubPlayerView`: isti pogled koji dobija klijent. Bot nema pristup
 * tuđim kartama, špilu ni odbačenim kartama — to drži tip. Igra samo poteze
 * iz `legalCardIds` / `maxExchange` (HARD RULE 2). Svi pragovi su config
 * (HARD RULE 7).
 */
export interface RaubBotConfig {
  /** Štih na sedmicu: najmanje aduta računajući i tu sedmicu (ili as/kralj sa strane). */
  stihMinTrumps: number;
  /** Vjerovatnoća štiha i sa slabom rukom (mora samo 1). */
  stihLooseP: number;
  /** Licitacija (Raub i Moja): najmanje aduta (uz talon kartu ako je dobija zamjenom sedmice). */
  bidMinTrumps: number;
  /** Ili jedan jak adut (A, K) i ovoliko aseva sa strane. */
  bidStrongTrumpSideAces: number;
  /** Na zadnjoj okrenutoj karti bot je hrabriji: prag aduta manje za ovoliko (refa je skupa za sve). */
  lastFlipLeniency: number;
  /** Nasumični pomak praga aduta (± cijeli broj sa ovom vjerovatnoćom). */
  noiseP: number;
  /** „Idem": ide kad ima bar ovoliko aduta, ili asa sa strane. */
  goMinTrumps: number;
  /** Vjerovatnoća da ide i sa slabom rukom (ljudsko „da vidim šta dođe u zamjeni"). */
  goLooseP: number;
  /** Vjerovatnoća namjerno slabijeg (ali dozvoljenog) poteza u štihu. */
  blunderP: number;
  /** Najniži rang koji se zadržava pri zamjeni (0 = 7 … 7 = A); ispod se mijenja. */
  keepSideRank: number;
  thinkMinMs: number;
  thinkMaxMs: number;
}

export const DEFAULT_RAUB_BOT_CONFIG: RaubBotConfig = {
  stihMinTrumps: 2,
  stihLooseP: 0.25,
  bidMinTrumps: 2,
  bidStrongTrumpSideAces: 1,
  lastFlipLeniency: 0,
  noiseP: 0.15,
  goMinTrumps: 2,
  goLooseP: 0.1,
  blunderP: 0.05,
  keepSideRank: 7,
  // Odluka 11: 2,5–7 s, nasumično (1–3 s je djelovalo mašinski).
  thinkMinMs: 2500,
  thinkMaxMs: 7000,
};

const isHigh = (c: Card) => c.rank === "A" || c.rank === "K";

/** Procjena ruke za boju `suit`: broj aduta i da li uz jak adut ima as sa strane. */
function strengthFor(hand: readonly Card[], suit: Suit, talon: Card | null) {
  let trumps = hand.filter((c) => c.suit === suit);
  // Sedmica aduta se može zamijeniti za kartu s talona: računaj talon umjesto nje.
  if (talon && talon.suit === suit && trumps.some(isSeven)) {
    trumps = [...trumps.filter((c) => !isSeven(c)), talon];
  }
  const sideAces = hand.filter((c) => c.suit !== suit && c.rank === "A").length;
  return { trumps: trumps.length, strongTrump: trumps.some(isHigh), sideAces };
}

function jitter(rng: () => number, p: number): number {
  const r = rng();
  if (r < p / 2) return -1;
  if (r < p) return 1;
  return 0;
}

export function selectRaubBotAction(
  view: RaubPlayerView,
  config: RaubBotConfig = DEFAULT_RAUB_BOT_CONFIG,
  rng: () => number = Math.random,
): RaubAction {
  if (view.phase !== "playing" || view.currentPlayerId !== view.myPlayerId) {
    throw new Error("BOT_NOT_ON_TURN");
  }
  const trump = view.trumpSuit;
  const hand = view.myCards;

  switch (view.step) {
    case "seven_choice": {
      // Sedmica na talonu: sa njom u ruci, mora samo 1 štih.
      const seven = view.talon.at(-1)!;
      const trumps = hand.filter((c) => c.suit === seven.suit).length + 1;
      const sideHigh = hand.some((c) => c.suit !== seven.suit && isHigh(c));
      const take = trumps >= config.stihMinTrumps || sideHigh || rng() < config.stihLooseP;
      return { type: "stih", take };
    }
    case "bidding": {
      // Server kaže šta je dozvoljeno (Raub samo na A/K/Q/J, Moja samo sa sedmicom).
      const options = view.bidOptions ?? { raub: false, moja: false };
      if (!options.raub && !options.moja) return { type: "bid", bid: "pass" };
      const offered = view.talon.at(-1)!;
      const s = strengthFor(hand, offered.suit, offered);
      const lastFlip = view.talonFlips >= view.rules.maxTalonFlips;
      const need = config.bidMinTrumps - (lastFlip ? config.lastFlipLeniency : 0) + jitter(rng, config.noiseP);
      const strong = s.strongTrump && s.sideAces >= config.bidStrongTrumpSideAces;
      if (!(s.trumps >= Math.max(1, need) || strong)) return { type: "bid", bid: "pass" };
      // Isti ugovor (mora 2); Raub uz sedmicu ionako nudi zamjenu poslije.
      return { type: "bid", bid: options.raub ? "raub" : "moja" };
    }
    case "swap_seven":
      // Talon karta je uvijek jača od sedmice iste boje.
      return { type: "swap_seven", swap: view.swapOffer !== null };
    case "going": {
      const trumps = hand.filter((c) => c.suit === trump).length;
      const aces = hand.filter((c) => c.suit !== trump && c.rank === "A").length;
      const go = trumps >= config.goMinTrumps || aces > 0 || rng() < config.goLooseP;
      return { type: "go", go };
    }
    case "discard_extra": {
      const blocked = new Set<string>();
      if (view.lockedCardId) blocked.add(view.lockedCardId);
      if (view.openCard?.playerId === view.myPlayerId) blocked.add(view.openCard.card.id);
      return { type: "discard", cardId: weakestCard(hand.filter((c) => !blocked.has(c.id)), trump).id };
    }
    case "exchange":
      return { type: "exchange", cardIds: chooseExchange(view, config) };
    case "tricks":
      return { type: "play", cardId: choosePlay(view, config, rng).id };
    default:
      throw new Error("BOT_NO_ACTION");
  }
}

/** Zadržava adute i aseve; mijenja ostalo. Nosilac nikad ne mijenja sve 4. */
function chooseExchange(view: RaubPlayerView, config: RaubBotConfig): string[] {
  const trump = view.trumpSuit;
  const candidates = view.myCards
    .filter((c) => c.id !== view.lockedCardId)
    .filter((c) => c.suit !== trump && raubRankValue(c) < config.keepSideRank)
    .sort((a, b) => raubRankValue(a) - raubRankValue(b));
  let limit = view.maxExchange;
  if (view.declarerId === view.myPlayerId) limit = Math.min(limit, 3);
  return candidates.slice(0, limit).map((c) => c.id);
}

function choosePlay(view: RaubPlayerView, config: RaubBotConfig, rng: () => number): Card {
  const legalIds = new Set(view.legalCardIds ?? []);
  const legal = view.myCards.filter((c) => legalIds.has(c.id));
  if (legal.length === 0) throw new Error("BOT_NO_LEGAL_MOVES");
  if (legal.length === 1) return legal[0]!;
  const trump = view.trumpSuit;
  const byRank = (a: Card, b: Card) => raubRankValue(a) - raubRankValue(b);
  const weakest = weakestCard(legal, trump);
  if (rng() < config.blunderP) return legal[Math.floor(rng() * legal.length)]!;

  const trick = view.tricks.at(-1);
  const plays = trick && trick.winnerId === null ? trick.plays : [];

  if (plays.length === 0) {
    // Otvaranje: nosilac kome trebaju štihovi ide jakim adutom; inače as sa strane.
    const me = view.seats.find((s) => s.playerId === view.myPlayerId)!;
    const needs = view.declarerId === view.myPlayerId && me.tricks < view.requiredTricks;
    const trumps = legal.filter((c) => c.suit === trump).sort(byRank);
    if (needs && trumps.length > 0 && isHigh(trumps.at(-1)!)) return trumps.at(-1)!;
    const sideAce = legal.find((c) => c.suit !== trump && c.rank === "A");
    if (sideAce) return sideAce;
    if (needs && trumps.length > 0) return trumps.at(-1)!;
    return [...legal].sort(byRank).at(-1)!;
  }

  const led = plays[0]!.card.suit;
  const cards = plays.map((p) => p.card);
  const best = cards[trickWinnerIndex(cards, trump)]!;
  const winners = legal.filter((c) => beats(c, best, led, trump)).sort((a, b) => {
    // Najjeftiniji pobjednik: prvo ne-adut, pa najniži rang.
    const ta = Number(a.suit === trump);
    const tb = Number(b.suit === trump);
    return ta - tb || byRank(a, b);
  });
  if (winners.length === 0) return weakest;
  const last = plays.length === view.seats.length - 1;
  // Zadnji u štihu uzima najjeftinijim; inače najjačim da ga ne nadjačaju poslije.
  if (last) return winners[0]!;
  // Nije zadnji: u boji igra najjaču da ga ne nadjačaju poslije; adut ne troši —
  // najjeftiniji adut koji nosi štih.
  if (winners[0]!.suit === trump) return winners[0]!;
  return winners.filter((c) => c.suit === winners[0]!.suit).sort(byRank).at(-1)!;
}

/** Vrijeme odluke, nasumično (odluka 11: 2,5–7 s). */
export function raubBotThinkMs(
  config: RaubBotConfig = DEFAULT_RAUB_BOT_CONFIG,
  rng: () => number = Math.random,
): number {
  return Math.round(config.thinkMinMs + (config.thinkMaxMs - config.thinkMinMs) * rng());
}
