import { evaluateBestHand } from "@zandar/game-core";
import type {
  Card,
  PokerHandCategory,
  PokerHandResult,
  PokerLastAction,
  PokerLegalActions,
  PokerPlayerView,
  PokerSeatView,
} from "@zandar/shared-types";

/**
 * Prikaz poker stola — čiste funkcije od pogleda koji šalje server.
 *
 * Ništa ovdje ne odlučuje šta je legalno (HARD RULE 1): iznosi za brze izbore
 * se samo stežu u granice koje je server već dao (`legal.minTo`/`maxTo`), a
 * server ih ionako provjerava ponovo.
 */

/** Nazivi kombinacija ostaju na engleskom (odluka 6.11.2026, kako se govori u regionu). */
export const POKER_CATEGORY_LABEL: Record<PokerHandCategory, string> = {
  high_card: "High card",
  pair: "Pair",
  two_pair: "Two pair",
  three_of_a_kind: "Three of a kind",
  straight: "Straight",
  flush: "Flush",
  full_house: "Full house",
  four_of_a_kind: "Four of a kind",
  straight_flush: "Straight flush",
  royal_flush: "Royal flush",
};

export type PotChip = { label: "main" | "side"; index: number; amount: number };

/**
 * Potovi za prikaz u sredini stola. Zbir je UVIJEK `potTotal` (pot = sve na
 * stolu, uključujući uloge tekuće ulice — odluka 2 sa table).
 *
 * Side pot se reže samo na iznosu KRAĆEG all-ina (manje od najvećeg uloga među
 * živima). Slojevi blindova i ulog koji još niko nije pratio nisu side pot —
 * prva verzija (slojevi iz `buildPots`) je na stolu pokazivala „Pot 2" čim neko
 * gurne all-in preko blindova (uhvaćeno u e2e).
 */
export function displayPots(view: Pick<PokerPlayerView, "potTotal" | "seats">): PotChip[] {
  if (view.potTotal <= 0) return [];
  const live = view.seats.filter((s) => s.inHand && !s.folded && s.status !== "left");
  const top = Math.max(0, ...live.map((s) => s.totalBet));
  // Rezovi: kraći all-in (manje od najvećeg uloga među živima). Slojevi samih
  // blindova i nepraćen ulog nisu side pot.
  const cuts = [...new Set(live.filter((s) => s.allIn && s.totalBet < top).map((s) => s.totalBet))].sort(
    (a, b) => a - b,
  );
  if (cuts.length === 0) return [{ label: "main", index: 0, amount: view.potTotal }];

  const amounts: number[] = [];
  let prev = 0;
  for (const level of [...cuts, Infinity]) {
    let amount = 0;
    for (const s of view.seats) amount += Math.max(0, Math.min(s.totalBet, level) - prev);
    const eligible = live.filter((s) => s.totalBet > prev).length;
    // Iznad zadnjeg reza bez bar dva ovlaštena = vraćanje, ne pot.
    if (eligible < 2 && amounts.length > 0) amounts[amounts.length - 1]! += amount;
    else if (amount > 0) amounts.push(amount);
    prev = level;
  }
  const sum = amounts.reduce((a, b) => a + b, 0);
  if (sum !== view.potTotal || amounts.length === 1) return [{ label: "main", index: 0, amount: view.potTotal }];
  return amounts.map((amount, index) => ({ label: index === 0 ? "main" : "side", index, amount }));
}

/** Pločice uz sjedište. Heads-up: dealer je i small blind, pa dobija obje. */
export function positionTags(
  view: Pick<PokerPlayerView, "buttonSeat" | "smallBlindSeat" | "bigBlindSeat" | "phase">,
  seat: Pick<PokerSeatView, "seatNo" | "status">,
): Array<"D" | "SB" | "BB"> {
  if (view.phase === "match_finished" || view.phase === "abandoned") return [];
  if (seat.status === "left" || seat.status === "bankrupt") return [];
  const tags: Array<"D" | "SB" | "BB"> = [];
  if (seat.seatNo === view.buttonSeat) tags.push("D");
  if (seat.seatNo === view.smallBlindSeat) tags.push("SB");
  if (seat.seatNo === view.bigBlindSeat) tags.push("BB");
  return tags;
}

/** Natpis zadnje akcije iznad avatara. `amount` je ulog u ulici POSLIJE akcije. */
export function actionLabel(action: PokerLastAction): string {
  switch (action.type) {
    case "fold":
      return "Fold";
    case "check":
      return "Check";
    case "call":
      return `Call ${action.amount}`;
    case "bet":
      return `Bet ${action.amount}`;
    case "raise":
      return `Raise ${action.amount}`;
    case "allin":
      return "All-in";
  }
}

export function actionTone(action: PokerLastAction): "normal" | "bet" | "allin" | "fold" {
  if (action.type === "allin") return "allin";
  if (action.type === "fold") return "fold";
  if (action.type === "bet" || action.type === "raise") return "bet";
  return "normal";
}

export type RaisePreset = { key: "min" | "half" | "pot" | "allin"; to: number };

/**
 * Brzi izbori u raise panelu, kao „raise to" iznosi (isto što server prima).
 * Pot-raise: prvo se izjednači, pa se diže za veličinu pota poslije calla.
 * Svaki iznos je stegnut u [minTo, maxTo]; isti iznos se ne ponavlja.
 */
export function raisePresets(
  legal: Pick<PokerLegalActions, "minTo" | "maxTo" | "callAmount">,
  currentBet: number,
  potTotal: number,
): RaisePreset[] {
  const clamp = (n: number) => Math.max(legal.minTo, Math.min(legal.maxTo, Math.round(n)));
  const potAfterCall = potTotal + legal.callAmount;
  const out: RaisePreset[] = [];
  const add = (key: RaisePreset["key"], to: number) => {
    if (!out.some((p) => p.to === to)) out.push({ key, to });
  };
  add("min", clamp(legal.minTo));
  add("half", clamp(currentBet + potAfterCall / 2));
  add("pot", clamp(currentBet + potAfterCall));
  add("allin", legal.maxTo);
  return out;
}

/** Korak klizača i +/−: big blind. */
export function stepRaise(to: number, delta: number, legal: Pick<PokerLegalActions, "minTo" | "maxTo">): number {
  return Math.max(legal.minTo, Math.min(legal.maxTo, to + delta));
}

const RANK_ORDER = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

/**
 * „Šta imaš" uz tvoje karte (odluka 4: ostaje za sada). Prije flopa opis
 * karata, poslije naziv najbolje kombinacije sa boardom.
 */
export function handHint(myCards: readonly Card[], board: readonly Card[]): string | null {
  if (myCards.length !== 2) return null;
  if (board.length >= 3) {
    return POKER_CATEGORY_LABEL[evaluateBestHand([...myCards, ...board]).category];
  }
  const [a, b] = [...myCards].sort((x, y) => RANK_ORDER.indexOf(y.rank) - RANK_ORDER.indexOf(x.rank)) as [
    Card,
    Card,
  ];
  if (a.rank === b.rank) return `Par ${a.rank}`;
  return a.suit === b.suit ? `${a.rank}, ${b.rank} iste boje` : `${a.rank}, ${b.rank}`;
}

export type HandWinner = { playerId: string; amount: number; category: PokerHandCategory | null };

export type HandSummary =
  | { kind: "uncontested"; winner: HandWinner }
  | { kind: "single"; winner: HandWinner }
  | { kind: "split"; winners: HandWinner[] }
  /** Više potova sa različitim pobjednicima (side pot). */
  | { kind: "multi"; winners: HandWinner[] };

/** Ko je dobio šta u ruci — za traku rezultata. Iznos je zbir po igraču, preko svih potova. */
export function summarizeHand(result: PokerHandResult): HandSummary | null {
  const byPlayer = new Map<string, number>();
  for (const a of result.awards) byPlayer.set(a.playerId, (byPlayer.get(a.playerId) ?? 0) + a.amount);
  // Pot sa jednim ovlaštenim je vraćen nepraćen ulog, ne dobitak — ne broji se kao pobjeda.
  const contested = result.awards.filter((a) => (result.pots[a.potIndex]?.eligiblePlayerIds.length ?? 0) > 1);
  const category = (id: string) => result.showdown.find((h) => h.playerId === id)?.category ?? null;
  const winnerIds = [...new Set((contested.length > 0 ? contested : result.awards).map((a) => a.playerId))];
  const winners = winnerIds
    .map((id) => ({ playerId: id, amount: byPlayer.get(id) ?? 0, category: category(id) }))
    .sort((x, y) => y.amount - x.amount);
  if (winners.length === 0) return null;
  if (result.uncontested) return { kind: "uncontested", winner: winners[0]! };
  if (winners.length === 1) return { kind: "single", winner: winners[0]! };
  const splitPot = result.pots.some(
    (_, i) => new Set(result.awards.filter((a) => a.potIndex === i).map((a) => a.playerId)).size > 1,
  );
  return splitPot ? { kind: "split", winners } : { kind: "multi", winners };
}

/** Karte koje treba istaći na showdownu: najbolje karte pobjednika. Prazno kad niko ne otkriva. */
export function winningCardIds(result: PokerHandResult | null): Set<string> {
  const ids = new Set<string>();
  if (!result || result.uncontested) return ids;
  const summary = summarizeHand(result);
  if (!summary) return ids;
  const winners = summary.kind === "split" || summary.kind === "multi" ? summary.winners : [summary.winner];
  for (const w of winners) {
    for (const c of result.showdown.find((h) => h.playerId === w.playerId)?.bestCards ?? []) ids.add(c.id);
  }
  return ids;
}

export type ShowdownRow = {
  playerId: string;
  holeCards: Card[];
  category: PokerHandCategory;
  /** Karte (id) koje čine igračevu najbolju kombinaciju — ostale se prigušuju. */
  inBest: Set<string>;
  isWinner: boolean;
  /** Dobitak, tek kad su žetoni stigli (`paid`); inače `null`. */
  amount: number | null;
};

/**
 * Redovi ploče showdowna: ko je imao koje karte i šta je složio, redom kojim
 * server otkriva. `revealed` = koji su redovi već otkriveni (priča u toku);
 * `null` = svi. Iznos pobjednika tek kad je pot isplaćen (`paid`).
 */
export function showdownRows(
  result: PokerHandResult,
  revealed: readonly string[] | null,
  paid: boolean,
): ShowdownRow[] {
  if (result.uncontested) return [];
  const summary = summarizeHand(result);
  const winners = summary
    ? summary.kind === "split" || summary.kind === "multi"
      ? summary.winners
      : [summary.winner]
    : [];
  const won = new Map(winners.map((w) => [w.playerId, w.amount]));
  return result.showdown
    .filter((h) => revealed === null || revealed.includes(h.playerId))
    .map((h) => ({
      playerId: h.playerId,
      holeCards: h.holeCards,
      category: h.category,
      inBest: new Set(h.bestCards.map((c) => c.id)),
      isWinner: won.has(h.playerId),
      amount: paid && won.has(h.playerId) ? (won.get(h.playerId) ?? 0) : null,
    }));
}

/** Plasman za prikaz: isti broj = dijele mjesto. Igrači bez plasmana (meč prekinut) idu na kraj. */
export function sortedPlacements(
  view: Pick<PokerPlayerView, "placements" | "seats">,
): Array<{ playerId: string; place: number | null }> {
  const placeOf = new Map(view.placements.map((p) => [p.playerId, p.place]));
  return view.seats
    .map((s) => ({ playerId: s.playerId, place: placeOf.get(s.playerId) ?? s.place ?? null }))
    .sort((a, b) => (a.place ?? 99) - (b.place ?? 99));
}
