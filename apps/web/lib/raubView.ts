import type {
  Card,
  GamePhase,
  RaubGamePayload,
  RaubHandResult,
  RaubPlayerView,
  RaubSeatView,
  Suit,
} from "@zandar/shared-types";

import { huRankLabel } from "@/lib/hungarianDeck";
import { sr } from "@/lib/sr";

/**
 * Čista logika prikaza Raub stola (docs/raub-spec.md, „UI i UX"). Bez Reacta,
 * da se testira bez pregledača. Pravila odlučuje server; ovdje se samo čita
 * pogled (`RaubPlayerView`).
 */

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

/** Crvene boje se crtaju crveno i u tekstu. */
export const isRedSuit = (s: Suit) => s === "hearts" || s === "diamonds";

/**
 * „7♣", „U♥": rang kako piše na mađarici (J → U, Q → O, odluka 12), boja kao
 * znak — ekran ga u tekstu zamjenjuje ikonicom sa karte (`withSuits`).
 */
export const cardLabel = (c: Pick<Card, "rank" | "suit">) => `${huRankLabel(c.rank)}${SUIT_SYMBOL[c.suit]}`;

/** Natpis faze na vrhu stola: „Licitacija", „Idem?", „Zamjena", „Štih 2 od 4". */
export function phaseLabel(v: Pick<RaubPlayerView, "phase" | "step" | "tricks">): string {
  if (v.phase === "match_finished" || v.phase === "abandoned") return sr.raub.phase.matchEnd;
  if (v.phase === "hand_complete") return sr.raub.phase.handEnd;
  switch (v.step) {
    case "await_open":
    case "bidding":
    case "swap_seven":
      return sr.raub.phase.bidding;
    case "discard_extra":
      return sr.raub.phase.discard;
    case "going":
      return sr.raub.phase.going;
    case "exchange":
      return sr.raub.phase.exchange;
    case "tricks":
      return sr.raub.phase.trick(Math.max(1, v.tricks.length));
    default:
      return "";
  }
}

/** Šta se crta u panelu nad rukom. */
export type RaubPanel =
  | { kind: "open" }
  | { kind: "bid"; suit: Suit }
  | { kind: "swap"; seven: Card; talon: Card }
  | { kind: "discard" }
  | { kind: "going"; trump: Suit; declarerName: string; required: number }
  | { kind: "exchange"; max: number }
  | { kind: "play"; hint: string }
  | { kind: "wait"; name: string }
  | { kind: "none" };

export function panelFor(
  v: RaubPlayerView,
  nameOf: (id: string) => string,
): RaubPanel {
  if (v.phase !== "playing" || !v.currentPlayerId) return { kind: "none" };
  if (v.currentPlayerId !== v.myPlayerId) return { kind: "wait", name: nameOf(v.currentPlayerId) };
  switch (v.step) {
    case "await_open":
      return { kind: "open" };
    case "bidding": {
      const offered = v.talon.at(-1);
      return offered ? { kind: "bid", suit: offered.suit } : { kind: "none" };
    }
    case "swap_seven":
      return v.swapOffer ? { kind: "swap", ...v.swapOffer } : { kind: "none" };
    case "discard_extra":
      return { kind: "discard" };
    case "going":
      return {
        kind: "going",
        trump: v.trumpSuit!,
        declarerName: v.declarerId ? nameOf(v.declarerId) : "",
        required: v.requiredTricks,
      };
    case "exchange":
      return { kind: "exchange", max: v.maxExchange };
    case "tricks":
      return { kind: "play", hint: playHint(v) };
    default:
      return { kind: "none" };
  }
}

/** Zašto su neke karte zatamnjene (ispod „Ti si na potezu"). */
/**
 * Karte sa katancem u mojoj ruci. Katanac znači samo „ne smiješ je odbaciti"
 * (talon karta; pri višku i otvorena karta) — u štihovima se igra kao svaka
 * druga, pa tamo katanca nema (ranije je zaključavao i potez: sedmica uzeta s
 * talona nije mogla biti odigrana).
 */
export function lockedHandIds(
  v: Pick<RaubPlayerView, "myCardsHidden" | "step" | "lockedCardId" | "openCard" | "myPlayerId">,
  panelKind: RaubPanel["kind"],
): string[] {
  if (v.myCardsHidden || v.step === "tricks") return [];
  const ids = v.lockedCardId ? [v.lockedCardId] : [];
  if (panelKind === "discard" && v.openCard?.playerId === v.myPlayerId) ids.push(v.openCard.card.id);
  return ids;
}

export function playHint(v: Pick<RaubPlayerView, "tricks" | "myCards" | "trumpSuit" | "legalCardIds">): string {
  const trick = v.tricks.at(-1);
  const plays = trick && trick.winnerId === null ? trick.plays : [];
  if (plays.length === 0) return sr.raub.hint.lead;
  const led = plays[0]!.card.suit;
  const legal = new Set(v.legalCardIds ?? []);
  const legalCards = v.myCards.filter((c) => legal.has(c.id));
  if (legalCards.length === v.myCards.length) return sr.raub.hint.any;
  if (legalCards.every((c) => c.suit === led)) return sr.raub.hint.follow(SUIT_SYMBOL[led]);
  if (v.trumpSuit && legalCards.every((c) => c.suit === v.trumpSuit)) return sr.raub.hint.trump;
  return sr.raub.hint.any;
}

/**
 * Natpis iznad avatara dok faza traje: odgovor u licitaciji, „Idem/Ne idem",
 * „Zamjena 3" / „Bez zamjene" (rodno neutralno). `null` = ništa.
 */
export function seatCaptionText(v: RaubPlayerView, seat: RaubSeatView): string | null {
  if (v.phase !== "playing") return null;
  if (v.step === "await_open" || v.step === "bidding") {
    if (seat.bid === "raub") return sr.raub.bid.raub;
    if (seat.bid === "pass") return sr.raub.bid.pass;
    return null;
  }
  if (v.step === "going" || v.step === "swap_seven" || v.step === "discard_extra") {
    if (seat.playerId === v.declarerId) return null;
    if (seat.going === true) return sr.raub.go.yes;
    if (seat.going === false) return sr.raub.go.no;
    return null;
  }
  if (v.step === "exchange" && seat.exchanged !== null) {
    return seat.exchanged === 0 ? sr.raub.exchange.none : sr.raub.exchange.count(seat.exchanged);
  }
  return null;
}

/** Oznaka nosioca uz avatar: „Raub · mora 2" (ili „Sedmica · mora 1") i uzeto/obaveza. */
export function declarerTag(v: RaubPlayerView, seat: RaubSeatView): { label: string; progress: string | null } | null {
  if (seat.playerId !== v.declarerId || v.phase === "match_finished" || v.phase === "abandoned") return null;
  const label = v.scenario === "seven" ? sr.raub.declarer.seven(v.requiredTricks) : sr.raub.declarer.raub(v.requiredTricks);
  const progress = v.step === "tricks" || v.phase === "hand_complete" ? `${seat.tricks}/${v.requiredTricks}` : null;
  return { label, progress };
}

/** Rekao „Ne idem" u ovoj ruci (prigušen do kraja ruke). */
export const isDropped = (v: RaubPlayerView, seat: RaubSeatView) =>
  seat.going === false && (v.phase === "playing" || v.phase === "hand_complete");

/** Red pregleda ruke; najbolji prvi po promjeni bodova. */
export type HandRowView = {
  playerId: string;
  tricks: number;
  delta: number;
  penalty: boolean;
  dropped: boolean;
  scoreBefore: number;
  scoreAfter: number;
  isDeclarer: boolean;
};

export function handRows(result: RaubHandResult): HandRowView[] {
  return result.rows
    .map((r) => ({ ...r, isDeclarer: r.playerId === result.declarerId }))
    .sort((a, b) => Number(b.isDeclarer) - Number(a.isDeclarer) || a.delta - b.delta);
}

/** „+3", „−2", „0". */
export const formatDelta = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : "0");

/** Jedna rečenica o ruci: ko je raubovao, šta je uzeo, kazna. */
export function handSentence(result: RaubHandResult, nameOf: (id: string) => string): string {
  if (result.void) return sr.raub.summary.void;
  const decl = result.rows.find((r) => r.playerId === result.declarerId);
  if (!decl || !result.declarerId) return "";
  const name = nameOf(result.declarerId);
  if (decl.tricks >= result.requiredTricks) return sr.raub.summary.made(name, decl.tricks, result.requiredTricks);
  return sr.raub.summary.failed(name, decl.tricks, result.requiredTricks);
}

/** Tabela rezultata: red po ruci, refa kao poseban red, ×2 ruke označene. */
export type ScoreTableRow = {
  dealNo: number;
  void: boolean;
  multiplier: 1 | 2;
  /** playerId → promjena; `null` = Ne idem / refa. */
  deltas: Record<string, { delta: number; penalty: boolean } | null>;
};

export function scoreTable(history: readonly RaubHandResult[]): ScoreTableRow[] {
  return history.map((h) => ({
    dealNo: h.dealNo,
    void: h.void,
    multiplier: h.multiplier,
    deltas: Object.fromEntries(
      h.rows.map((r) => [r.playerId, r.dropped ? null : { delta: r.delta, penalty: r.penalty }]),
    ),
  }));
}

/** Plasman za kraj meča: po mjestu, pa po bodovima. */
export function sortedRaubPlacements(
  v: Pick<RaubPlayerView, "placements" | "seats">,
): Array<{ playerId: string; place: number | null; score: number }> {
  const placeOf = new Map(v.placements.map((p) => [p.playerId, p.place]));
  return v.seats
    .map((s) => ({ playerId: s.playerId, place: placeOf.get(s.playerId) ?? s.place ?? null, score: s.score }))
    .sort((a, b) => (a.place ?? 99) - (b.place ?? 99) || a.score - b.score);
}

/** Najbliži nuli (mesing u tabeli). */
export function leaderIds(seats: readonly RaubSeatView[]): Set<string> {
  const best = Math.min(...seats.map((s) => s.score));
  return new Set(seats.filter((s) => s.score === best).map((s) => s.playerId));
}

/** Prekid u jeziku `PauseAbandonOverlay`-a (ista pauza i glasanje kao Žandar). */
export function overlayPhase(p: Pick<RaubGamePayload, "phase" | "interruption">): GamePhase | null {
  if (p.phase === "abandoned") return "abandoned";
  if (p.interruption?.kind === "paused") return "paused_for_reconnect";
  if (p.interruption?.kind === "vote") return "abandon_vote";
  return null;
}

/** Pravac sa koga je karta bačena — za položaj u prostoru štiha. */
export type Dir = "top" | "left" | "right" | "bottom";
