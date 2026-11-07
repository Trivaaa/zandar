import { describe, expect, it } from "vitest";
import type { Card, Rank, RaubGameState, Suit } from "@zandar/shared-types";
import { createRaubDeck, raubRankValue, trickWinnerIndex } from "./cards";
import { createRaubRules } from "./config";
import {
  RAUB_DECK_SIZE,
  applyRaubAction,
  createRaubMatch,
  raubCardCount,
  raubLegalCards,
  raubPlacements,
  raubScoreDelta,
  startRaubHand,
} from "./match";
import { getRaubAutoAction, getRaubView } from "./view";

// ---- pomoćne ----

const c = (suit: Suit, rank: Rank): Card => ({ id: `${suit}-${rank}`, suit, rank });
const H = (r: Rank) => c("hearts", r);
const S = (r: Rank) => c("spades", r);
const D = (r: Rank) => c("diamonds", r);
const C = (r: Rank) => c("clubs", r);

function makeLcg(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const IDS4 = ["a", "b", "c", "d"] as const;

/**
 * Špil za zadat raspored. Djelilac dijeli od sljedećeg, sebi zadnji: 2, talon, 2.
 * `next` su karte koje slijede odmah poslije dijeljenja (nova talon karta, zamjena).
 */
function deckFor(opts: {
  ids: readonly string[];
  dealer: string;
  hands: Record<string, Card[]>;
  talon: Card;
  next?: Card[];
}): Card[] {
  const n = opts.ids.length;
  const di = opts.ids.indexOf(opts.dealer);
  const order = Array.from({ length: n }, (_, k) => opts.ids[(di + 1 + k) % n]!);
  const deck: Card[] = [];
  for (const id of order) deck.push(...opts.hands[id]!.slice(0, 2));
  deck.push(opts.talon);
  for (const id of order) deck.push(...opts.hands[id]!.slice(2, 4));
  deck.push(...(opts.next ?? []));
  const used = new Set(deck.map((x) => x.id));
  for (const x of createRaubDeck()) if (!used.has(x.id)) deck.push(x);
  expect(deck).toHaveLength(RAUB_DECK_SIZE);
  return deck;
}

function match(opts: {
  ids?: readonly string[];
  dealer?: string;
  hands: Record<string, Card[]>;
  talon: Card;
  next?: Card[];
  rules?: Parameters<typeof createRaubRules>[1];
}): RaubGameState {
  const ids = opts.ids ?? IDS4;
  const dealer = opts.dealer ?? "a";
  return createRaubMatch({
    roomId: "r",
    matchId: "m",
    playerIds: ids,
    rules: createRaubRules(ids.length as 2 | 3 | 4, opts.rules),
    rng: makeLcg(1),
    dealerId: dealer,
    deck: deckFor({ ids, dealer, hands: opts.hands, talon: opts.talon, next: opts.next }),
  });
}

/** Standardne ruke za 4 igrača (dijeli a): niko nema sedmicu herca. */
const HANDS4: Record<string, Card[]> = {
  a: [S("A"), S("K"), C("A"), D("8")],
  b: [H("A"), H("K"), C("K"), D("9")],
  c: [S("Q"), C("Q"), D("A"), D("K")],
  d: [H("9"), S("9"), C("9"), D("10")],
};

const act = (s: RaubGameState, pid: string, a: Parameters<typeof applyRaubAction>[2]) =>
  applyRaubAction(s, pid, a);

/** Odigraj sve do kraja ruke automatskim (najsigurnijim) potezima. */
function autoToHandEnd(s: RaubGameState): RaubGameState {
  let guard = 0;
  while (s.phase === "playing") {
    const pid = s.currentPlayerId!;
    s = applyRaubAction(s, pid, getRaubAutoAction(s, pid)!);
    if (++guard > 200) throw new Error("LOOP");
  }
  return s;
}

/** Herc adut, b nosilac iz licitacije, svi idu, niko ne mijenja → štihovi. */
function toTricks(): RaubGameState {
  let s = match({ hands: HANDS4, talon: H("Q") });
  s = act(s, "a", { type: "open" });
  s = act(s, "a", { type: "bid", bid: "pass" });
  s = act(s, "b", { type: "bid", bid: "raub" });
  for (const id of ["c", "d", "a"]) s = act(s, id, { type: "go", go: true });
  for (const id of ["b", "c", "d", "a"]) s = act(s, id, { type: "exchange", cardIds: [] });
  return s;
}

// ---- karte ----

describe("raub karte", () => {
  it("špil ima 32 jedinstvene karte, 7 do A", () => {
    const deck = createRaubDeck();
    expect(deck).toHaveLength(32);
    expect(new Set(deck.map((x) => x.id)).size).toBe(32);
    expect(deck.every((x) => ["7", "8", "9", "10", "J", "Q", "K", "A"].includes(x.rank))).toBe(true);
  });

  it("rang: A > K > Q > J > 10 > 9 > 8 > 7", () => {
    const order: Rank[] = ["7", "8", "9", "10", "J", "Q", "K", "A"];
    order.forEach((r, i) => expect(raubRankValue({ rank: r })).toBe(i));
  });

  it("štih nosi najjači adut, inače najjača tražene boje", () => {
    expect(trickWinnerIndex([S("9"), S("A"), H("7")], "hearts")).toBe(2);
    expect(trickWinnerIndex([S("9"), S("A"), D("A")], "hearts")).toBe(1);
    expect(trickWinnerIndex([S("9"), D("A"), C("A")], null)).toBe(0);
    expect(trickWinnerIndex([H("8"), H("J"), S("A")], "hearts")).toBe(1);
  });
});

// ---- dijeljenje i scenariji aduta ----

describe("raub dijeljenje", () => {
  it("svako dobija 4 karte, talon 1, ostatak u špilu; 32 karte na tačno jednom mjestu", () => {
    const s = match({ hands: HANDS4, talon: H("Q") });
    for (const seat of s.seats) expect(seat.hand).toHaveLength(4);
    expect(s.talon).toEqual([H("Q")]);
    expect(s.deck).toHaveLength(32 - 16 - 1);
    expect(raubCardCount(s)).toBe(32);
    expect(s.step).toBe("await_open");
    expect(s.currentPlayerId).toBe("a");
  });

  it("sa 2 igrača u špilu ostaje 23 karte", () => {
    const s = match({
      ids: ["a", "b"],
      hands: { a: HANDS4.a!, b: HANDS4.b! },
      talon: H("Q"),
    });
    expect(s.deck).toHaveLength(23);
  });

  it("djelilac se mijenja svake ruke, u smjeru igre", () => {
    let s = match({ hands: HANDS4, talon: H("Q") });
    s = autoToHandEnd(s);
    s = startRaubHand(s, makeLcg(2));
    expect(s.dealerId).toBe("b");
    expect(s.dealNo).toBe(2);
  });
});

describe("raub scenarij 1 — sedmica", () => {
  it("sedmica na talonu: djelilac nosi adut, mora 1, uzima je (zaključana) i odbacuje jednu", () => {
    const s = match({ hands: HANDS4, talon: D("7") });
    expect(s.scenario).toBe("seven");
    expect(s.declarerId).toBe("a");
    expect(s.trumpSuit).toBe("diamonds");
    expect(s.requiredTricks).toBe(1);
    expect(s.step).toBe("discard_extra");
    expect(s.seats[0]!.hand).toHaveLength(5);
    expect(s.lockedCardId).toBe("diamonds-7");
    expect(() => act(s, "a", { type: "discard", cardId: "diamonds-7" })).toThrow("CARD_LOCKED");
    const after = act(s, "a", { type: "discard", cardId: "spades-K" });
    expect(after.seats[0]!.hand).toHaveLength(4);
    expect(after.step).toBe("going");
    expect(raubCardCount(after)).toBe(32);
  });
});

describe("raub scenarij 2 — raub naslijepo", () => {
  it("djelilac ne vidi svoje karte prije odluke; naslijepo uzima talon i mora 2", () => {
    const s = match({ hands: HANDS4, talon: H("Q") });
    const v = getRaubView(s, "a");
    expect(v.myCardsHidden).toBe(true);
    expect(v.myCards).toEqual([]);
    expect(v.seats[0]!.handCount).toBe(4);
    expect(getRaubView(s, "b").myCards).toHaveLength(4);

    const b = act(s, "a", { type: "blind" });
    expect(b.scenario).toBe("blind");
    expect(b.requiredTricks).toBe(2);
    expect(b.trumpSuit).toBe("hearts");
    expect(b.step).toBe("discard_extra");
    expect(getRaubView(b, "a").myCards).toHaveLength(5);
  });

  it("samo djelilac i samo prije otvaranja", () => {
    const s = match({ hands: HANDS4, talon: H("Q") });
    expect(() => act(s, "b", { type: "blind" })).toThrow("NOT_YOUR_TURN");
    const opened = act(s, "a", { type: "open" });
    expect(() => act(opened, "a", { type: "blind" })).toThrow("INVALID_ACTION");
  });
});

describe("raub scenarij 3 — licitacija", () => {
  it("djelilac licitira prvi, pa redom; prvi Raub je nosilac i mora 2", () => {
    let s = match({ hands: HANDS4, talon: H("Q") });
    s = act(s, "a", { type: "open" });
    expect(s.step).toBe("bidding");
    expect(s.currentPlayerId).toBe("a");
    s = act(s, "a", { type: "bid", bid: "pass" });
    expect(s.currentPlayerId).toBe("b");
    s = act(s, "b", { type: "bid", bid: "raub" });
    expect(s.declarerId).toBe("b");
    expect(s.scenario).toBe("bid");
    expect(s.requiredTricks).toBe(2);
    expect(s.talon).toEqual([H("Q")]); // talon se ne uzima bez sedmice
    expect(s.step).toBe("going");
    expect(s.currentPlayerId).toBe("c");
  });

  it("nosilac sa sedmicom aduta smije je zamijeniti za talon kartu", () => {
    const hands = { ...HANDS4, b: [H("7"), H("K"), C("K"), D("9")] };
    let s = match({ hands, talon: H("Q") });
    s = act(s, "a", { type: "open" });
    s = act(s, "a", { type: "bid", bid: "pass" });
    s = act(s, "b", { type: "bid", bid: "raub" });
    expect(s.step).toBe("swap_seven");
    expect(getRaubView(s, "b").swapOffer).toEqual({ seven: H("7"), talon: H("Q") });
    expect(getRaubView(s, "c").swapOffer).toBeNull();

    const swapped = act(s, "b", { type: "swap_seven", swap: true });
    const hand = swapped.seats[1]!.hand.map((x) => x.id);
    expect(hand).toContain("hearts-Q");
    expect(hand).not.toContain("hearts-7");
    expect(swapped.talon).toEqual([H("7")]);
    expect(swapped.lockedCardId).toBe("hearts-Q");
    expect(swapped.seats[1]!.hand).toHaveLength(4);

    const kept = act(s, "b", { type: "swap_seven", swap: false });
    expect(kept.talon).toEqual([H("Q")]);
    expect(kept.lockedCardId).toBeNull();
  });

  it("svi Dalje: nova karta na talon, licitacija opet od djelioca; sedmica kao druga je obična", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), next: [S("7")] });
    s = act(s, "a", { type: "open" });
    for (const id of IDS4) s = act(s, id, { type: "bid", bid: "pass" });
    expect(s.talonFlips).toBe(2);
    expect(s.talon.map((x) => x.id)).toEqual(["hearts-Q", "spades-7"]);
    expect(s.scenario).toBeNull(); // nije scenarij 1
    expect(s.step).toBe("bidding");
    expect(s.currentPlayerId).toBe("a");
    expect(s.seats.every((x) => x.bid === null)).toBe(true);
    expect(getRaubView(s, "b").offeredSuit).toBe("spades");
    s = act(s, "a", { type: "bid", bid: "raub" });
    expect(s.trumpSuit).toBe("spades");
    expect(s.requiredTricks).toBe(2);
  });

  it("niko ni poslije 3. karte: refa, ruka se ne boduje", () => {
    let s = match({ hands: HANDS4, talon: H("Q") });
    s = act(s, "a", { type: "open" });
    for (let flip = 0; flip < 3; flip++) {
      for (const id of IDS4) s = act(s, id, { type: "bid", bid: "pass" });
    }
    expect(s.phase).toBe("hand_complete");
    expect(s.pendingRefas).toBe(1);
    expect(s.lastHand!.void).toBe(true);
    expect(s.seats.every((x) => x.score === 21)).toBe(true);
    expect(raubCardCount(s)).toBe(32);
  });

  it("parametar: refa poslije 2 karte", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), rules: { maxTalonFlips: 2 } });
    s = act(s, "a", { type: "open" });
    for (let flip = 0; flip < 2; flip++) {
      for (const id of IDS4) s = act(s, id, { type: "bid", bid: "pass" });
    }
    expect(s.lastHand!.void).toBe(true);
  });

  it("parametar: prvi licitira igrač desno od djelioca", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), rules: { firstBidder: "right_of_dealer" } });
    s = act(s, "a", { type: "open" });
    expect(s.currentPlayerId).toBe("b");
  });
});

// ---- idem / ne idem ----

describe("raub idem / ne idem (odluka 9)", () => {
  it("ko ne ide odlaže karte i ne boduje se; zamjena i štihovi bez njega", () => {
    let s = match({ hands: HANDS4, talon: H("Q") });
    s = act(s, "a", { type: "open" });
    s = act(s, "a", { type: "bid", bid: "pass" });
    s = act(s, "b", { type: "bid", bid: "raub" });
    s = act(s, "c", { type: "go", go: false });
    expect(s.seats[2]!.hand).toHaveLength(0);
    s = act(s, "d", { type: "go", go: true });
    s = act(s, "a", { type: "go", go: true });
    expect(s.exchangeOrder).toEqual(["b", "d", "a"]);
    for (const id of ["b", "d", "a"]) s = act(s, id, { type: "exchange", cardIds: [] });
    expect(s.step).toBe("tricks");
    s = autoToHandEnd(s);
    const row = s.lastHand!.rows.find((r) => r.playerId === "c")!;
    expect(row).toMatchObject({ dropped: true, delta: 0, penalty: false });
    expect(s.seats[2]!.score).toBe(21);
    expect(s.lastHand!.rows.reduce((sum, r) => sum + r.tricks, 0)).toBe(4);
    expect(raubCardCount(s)).toBe(32);
  });

  it("niko ne ide: nosilac upisuje sva 4 štiha", () => {
    let s = match({ hands: HANDS4, talon: H("Q") });
    s = act(s, "a", { type: "open" });
    s = act(s, "a", { type: "bid", bid: "pass" });
    s = act(s, "b", { type: "bid", bid: "raub" });
    for (const id of ["c", "d", "a"]) s = act(s, id, { type: "go", go: false });
    expect(s.phase).toBe("hand_complete");
    expect(s.seats[1]!.score).toBe(21 - 4);
    expect(s.lastHand!.rows.find((r) => r.playerId === "b")!.tricks).toBe(4);
  });

  it("bez parametra svi igraju i nema koraka going", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), rules: { allowDrop: false } });
    s = act(s, "a", { type: "open" });
    s = act(s, "a", { type: "bid", bid: "pass" });
    s = act(s, "b", { type: "bid", bid: "raub" });
    expect(s.step).toBe("exchange");
    expect(s.currentPlayerId).toBe("b");
  });
});

// ---- zamjena ----

describe("raub zamjena", () => {
  function toExchange(next: Card[] = []) {
    let s = match({ hands: HANDS4, talon: H("Q"), next });
    s = act(s, "a", { type: "open" });
    s = act(s, "a", { type: "bid", bid: "pass" });
    s = act(s, "b", { type: "bid", bid: "raub" });
    for (const id of ["c", "d", "a"]) s = act(s, id, { type: "go", go: true });
    return s;
  }

  it("ide od nosioca, u smjeru igre; zamijenjene karte idu iz špila", () => {
    let s = toExchange([S("8"), S("10")]);
    expect(s.currentPlayerId).toBe("b");
    s = act(s, "b", { type: "exchange", cardIds: ["clubs-K", "diamonds-9"] });
    expect(s.seats[1]!.hand.map((x) => x.id)).toEqual(["hearts-A", "hearts-K", "spades-8", "spades-10"]);
    expect(s.seats[1]!.exchanged).toBe(2);
    expect(s.currentPlayerId).toBe("c");
    expect(raubCardCount(s)).toBe(32);
  });

  it("odbija tuđu kartu, duplikat i više nego što ima u špilu", () => {
    const s = toExchange();
    expect(() => act(s, "b", { type: "exchange", cardIds: ["spades-A"] })).toThrow("ILLEGAL_CARD");
    expect(() => act(s, "b", { type: "exchange", cardIds: ["hearts-A", "hearts-A"] })).toThrow(
      "INVALID_ACTION",
    );
    const short = { ...structuredClone(s), deck: s.deck.slice(0, 1) };
    expect(getRaubView(short, "b").maxExchange).toBe(1);
    expect(() => act(short, "b", { type: "exchange", cardIds: ["clubs-K", "diamonds-9"] })).toThrow(
      "TOO_MANY_CARDS",
    );
  });

  it("karta s talona se ne može zamijeniti", () => {
    const hands = { ...HANDS4, b: [H("7"), H("K"), C("K"), D("9")] };
    let s = match({ hands, talon: H("Q") });
    s = act(s, "a", { type: "open" });
    s = act(s, "a", { type: "bid", bid: "pass" });
    s = act(s, "b", { type: "bid", bid: "raub" });
    s = act(s, "b", { type: "swap_seven", swap: true });
    for (const id of ["c", "d", "a"]) s = act(s, id, { type: "go", go: true });
    expect(() => act(s, "b", { type: "exchange", cardIds: ["hearts-Q"] })).toThrow("CARD_LOCKED");
    expect(getRaubView(s, "b").maxExchange).toBe(3);
  });

  it("prva zamjena sve 4: 5 karata (treća otvorena), odbacuje jednu ali ne otvorenu (odluka 1)", () => {
    let s = toExchange();
    s = act(s, "b", { type: "exchange", cardIds: [] });
    const deckTop = s.deck.slice(0, 5);
    s = act(s, "c", { type: "exchange", cardIds: HANDS4.c!.map((x) => x.id) });
    expect(s.seats[2]!.hand.map((x) => x.id)).toEqual(deckTop.map((x) => x.id));
    expect(s.openCard).toEqual({ playerId: "c", card: deckTop[2] });
    expect(getRaubView(s, "d").openCard?.card).toEqual(deckTop[2]);
    expect(s.step).toBe("discard_extra");
    expect(() => act(s, "c", { type: "discard", cardId: deckTop[2]!.id })).toThrow("CARD_LOCKED");
    s = act(s, "c", { type: "discard", cardId: deckTop[0]!.id });
    expect(s.seats[2]!.hand).toHaveLength(4);
    expect(s.step).toBe("exchange");
    expect(s.currentPlayerId).toBe("d");

    // Sljedeći koji mijenja sve 4 dobija tačno 4, skrivene.
    s = act(s, "d", { type: "exchange", cardIds: s.seats[3]!.hand.map((x) => x.id) });
    expect(s.seats[3]!.hand).toHaveLength(4);
    expect(s.openCard!.playerId).toBe("c");
    expect(raubCardCount(s)).toBe(32);
  });

  it("špil prazan: ostali preskaču zamjenu i ulazi se u štihove sa 4 karte", () => {
    let s = toExchange();
    s = { ...s, deck: s.deck.slice(0, 2), discarded: [...s.discarded, ...s.deck.slice(2)] };
    s = act(s, "b", { type: "exchange", cardIds: ["clubs-K", "diamonds-9"] });
    expect(s.deck).toHaveLength(0);
    expect(s.step).toBe("tricks");
    expect(s.seats.map((x) => x.exchanged)).toEqual([0, 2, 0, 0]);
    expect(s.seats.every((x) => x.hand.length === 4)).toBe(true);
  });

  it("prva zamjena sve 4 kad je u špilu manje od 5: dobija koliko ima, bez odbacivanja", () => {
    let s = toExchange();
    s = { ...s, deck: s.deck.slice(0, 4), discarded: [...s.discarded, ...s.deck.slice(4)] };
    s = act(s, "b", { type: "exchange", cardIds: s.seats[1]!.hand.map((x) => x.id) });
    expect(s.seats[1]!.hand).toHaveLength(4);
    expect(s.openCard!.playerId).toBe("b");
    expect(s.step).toBe("tricks");
  });
});

// ---- štihovi ----

describe("raub štihovi", () => {
  it("prvi štih otvara nosilac; pobjednik otvara sljedeći", () => {
    let s = toTricks();
    expect(s.currentPlayerId).toBe("b");
    s = act(s, "b", { type: "play", cardId: "clubs-K" });
    s = act(s, "c", { type: "play", cardId: "clubs-Q" });
    s = act(s, "d", { type: "play", cardId: "clubs-9" });
    s = act(s, "a", { type: "play", cardId: "clubs-A" });
    expect(s.tricks[0]!.winnerId).toBe("a");
    expect(s.seats[0]!.tricks).toBe(1);
    expect(s.currentPlayerId).toBe("a");
    expect(s.tricks).toHaveLength(2);
  });

  it("mora odgovoriti na boju, pa adut, pa bilo šta", () => {
    let s = toTricks();
    s = act(s, "b", { type: "play", cardId: "diamonds-9" });
    // c ima karo: samo karo
    expect(raubLegalCards(s, "c").map((x) => x.id).sort()).toEqual(["diamonds-A", "diamonds-K"]);
    expect(() => act(s, "c", { type: "play", cardId: "spades-Q" })).toThrow("ILLEGAL_CARD");
    s = act(s, "c", { type: "play", cardId: "diamonds-K" });
    s = act(s, "d", { type: "play", cardId: "diamonds-10" });
    s = act(s, "a", { type: "play", cardId: "diamonds-8" });
    expect(s.tricks[0]!.winnerId).toBe("c");

    // c otvara pik; b nema pik → mora adut (herc)
    s = act(s, "c", { type: "play", cardId: "spades-Q" });
    s = act(s, "d", { type: "play", cardId: "spades-9" });
    s = act(s, "a", { type: "play", cardId: "spades-A" });
    expect(raubLegalCards(s, "b").map((x) => x.id).sort()).toEqual(["hearts-A", "hearts-K"]);
  });

  it("bez boje i bez aduta: bilo koja karta", () => {
    const hands = {
      a: [S("A"), S("K"), S("Q"), S("J")],
      b: [H("A"), H("K"), C("K"), D("9")],
      c: [C("Q"), C("J"), D("A"), D("K")],
      d: [H("9"), S("9"), C("9"), D("10")],
    };
    let s = match({ hands, talon: H("Q") });
    s = act(s, "a", { type: "open" });
    s = act(s, "a", { type: "bid", bid: "pass" });
    s = act(s, "b", { type: "bid", bid: "raub" });
    for (const id of ["c", "d", "a"]) s = act(s, id, { type: "go", go: true });
    for (const id of ["b", "c", "d", "a"]) s = act(s, id, { type: "exchange", cardIds: [] });
    s = act(s, "b", { type: "play", cardId: "diamonds-9" });
    s = act(s, "c", { type: "play", cardId: "diamonds-A" });
    s = act(s, "d", { type: "play", cardId: "diamonds-10" });
    expect(raubLegalCards(s, "a")).toHaveLength(4);
  });

  it("u V1 ne mora nadjačati; uz parametar mora kad može", () => {
    let s = toTricks();
    s = act(s, "b", { type: "play", cardId: "diamonds-9" });
    expect(raubLegalCards(s, "c").map((x) => x.id).sort()).toEqual(["diamonds-A", "diamonds-K"]);
    const strict = { ...s, rules: { ...s.rules, mustOvertrump: true } };
    s = act(s, "c", { type: "play", cardId: "diamonds-A" });
    const strict2 = { ...s, rules: { ...s.rules, mustOvertrump: true } };
    // d ima samo 10 karo, ne može nadjačati asa → smije baciti boju
    expect(raubLegalCards(strict2, "d").map((x) => x.id)).toEqual(["diamonds-10"]);
    expect(raubLegalCards(strict, "c").map((x) => x.id).sort()).toEqual(["diamonds-A", "diamonds-K"]);
  });

  it("odbija potez van reda i zastarjelo stanje", () => {
    const s = toTricks();
    expect(() => act(s, "c", { type: "play", cardId: "clubs-Q" })).toThrow("NOT_YOUR_TURN");
    expect(() =>
      applyRaubAction(s, "b", { type: "play", cardId: "clubs-K", clientKnownStateVersion: s.stateVersion - 1 }),
    ).toThrow("STALE_STATE");
    expect(() => act(s, "b", { type: "bid", bid: "raub" })).toThrow("INVALID_ACTION");
  });

  it("ruka ima tačno 4 štiha i završava bodovanjem", () => {
    const s = autoToHandEnd(toTricks());
    expect(s.phase).toBe("hand_complete");
    expect(s.tricks).toHaveLength(4);
    expect(s.tricks.every((t) => t.plays.length === 4 && t.winnerId !== null)).toBe(true);
    expect(s.lastHand!.rows.reduce((sum, r) => sum + r.tricks, 0)).toBe(4);
    expect(raubCardCount(s)).toBe(32);
  });
});

// ---- bodovanje ----

describe("raub bodovanje", () => {
  it("svaki red tabele bodova", () => {
    // štih −1
    expect(raubScoreDelta({ declarer: false, requiredTricks: 2, tricks: 1 })).toEqual({ delta: -1, penalty: false });
    expect(raubScoreDelta({ declarer: false, requiredTricks: 2, tricks: 3 })).toEqual({ delta: -3, penalty: false });
    // igrač koji nije nosilac, 0 štihova: +2
    expect(raubScoreDelta({ declarer: false, requiredTricks: 2, tricks: 0 })).toEqual({ delta: 2, penalty: true });
    // sedmica (mora 1): ispunio −1 po štihu, 0 štihova +3
    expect(raubScoreDelta({ declarer: true, requiredTricks: 1, tricks: 1 })).toEqual({ delta: -1, penalty: false });
    expect(raubScoreDelta({ declarer: true, requiredTricks: 1, tricks: 0 })).toEqual({ delta: 3, penalty: true });
    // nosilac (mora 2): 2+ štiha −1 po štihu, 1 štih +3, 0 štihova +4
    expect(raubScoreDelta({ declarer: true, requiredTricks: 2, tricks: 3 })).toEqual({ delta: -3, penalty: false });
    expect(raubScoreDelta({ declarer: true, requiredTricks: 2, tricks: 1 })).toEqual({ delta: 3, penalty: true });
    expect(raubScoreDelta({ declarer: true, requiredTricks: 2, tricks: 0 })).toEqual({ delta: 4, penalty: true });
  });

  it("primjer iz speca: nosilac 3 štiha 21→18, drugi 1 štih →20, treći 0 →23", () => {
    const hands3 = {
      a: [H("A"), H("K"), H("J"), C("8")],
      b: [S("A"), D("8"), D("9"), C("9")],
      c: [S("7"), S("8"), D("7"), C("7")],
    };
    let s = match({ ids: ["a", "b", "c"], dealer: "c", hands: hands3, talon: H("Q") });
    s = act(s, "c", { type: "open" });
    s = act(s, "c", { type: "bid", bid: "pass" });
    s = act(s, "a", { type: "bid", bid: "raub" });
    s = act(s, "b", { type: "go", go: true });
    s = act(s, "c", { type: "go", go: true });
    for (const id of ["a", "b", "c"]) s = act(s, id, { type: "exchange", cardIds: [] });
    // a: H A, H K, H J nose 3 štiha; b nosi pik asom
    s = act(s, "a", { type: "play", cardId: "hearts-A" });
    s = act(s, "b", { type: "play", cardId: "spades-A" });
    s = act(s, "c", { type: "play", cardId: "spades-7" });
    s = act(s, "a", { type: "play", cardId: "hearts-K" });
    s = act(s, "b", { type: "play", cardId: "diamonds-8" });
    s = act(s, "c", { type: "play", cardId: "spades-8" });
    s = act(s, "a", { type: "play", cardId: "hearts-J" });
    s = act(s, "b", { type: "play", cardId: "diamonds-9" });
    s = act(s, "c", { type: "play", cardId: "diamonds-7" });
    s = act(s, "a", { type: "play", cardId: "clubs-8" });
    s = act(s, "b", { type: "play", cardId: "clubs-9" });
    s = act(s, "c", { type: "play", cardId: "clubs-7" });
    expect(s.seats.map((x) => x.score)).toEqual([18, 20, 23]);
  });

  it("refe se slažu u red: 3 refe = naredne 3 odigrane ruke ×2, svaka posebno", () => {
    let s = match({ hands: HANDS4, talon: H("Q") });
    const rng = makeLcg(5);
    let voided = 0;
    // Tri ruke zaredom bez aduta.
    while (voided < 3) {
      if (s.phase === "hand_complete") s = startRaubHand(s, rng);
      if (s.step === "await_open") s = act(s, s.currentPlayerId!, { type: "open" });
      if (s.step !== "bidding") {
        s = autoToHandEnd(s); // sedmica — preskoči, nije refa
        continue;
      }
      while (s.phase === "playing" && s.step === "bidding") {
        s = act(s, s.currentPlayerId!, { type: "bid", bid: "pass" });
      }
      if (s.lastHand?.void) voided += 1;
    }
    expect(s.pendingRefas).toBe(3);

    const multipliers: number[] = [];
    while (multipliers.length < 4) {
      s = startRaubHand(s, rng);
      if (s.step === "await_open") s = act(s, s.currentPlayerId!, { type: "open" });
      if (s.step === "bidding") s = act(s, s.currentPlayerId!, { type: "bid", bid: "raub" });
      s = autoToHandEnd(s);
      expect(s.lastHand!.void).toBe(false);
      multipliers.push(s.lastHand!.multiplier);
      for (const r of s.lastHand!.rows) {
        if (!r.dropped) expect(Math.abs(r.delta) % s.lastHand!.multiplier).toBe(0);
      }
      if (s.phase === "match_finished") break;
    }
    expect(multipliers.slice(0, 4)).toEqual([2, 2, 2, 1]);
    expect(s.pendingRefas).toBe(0);
  });

  it("kraj meča: neko na 0 ili ispod; plasman po bodovima, jednaki dijele mjesto", () => {
    let s = toTricks();
    // Svi na 1: ko god uzme štih stiže do 0, pa se meč mora završiti.
    s = { ...s, seats: s.seats.map((x) => ({ ...x, score: 1 })) };
    s = autoToHandEnd(s);
    expect(s.phase).toBe("match_finished");
    expect(s.seats.some((x) => x.score <= 0)).toBe(true);
    expect(s.placements[0]!.place).toBe(1);
    expect(s.placements[0]!.score).toBe(Math.min(...s.seats.map((x) => x.score)));
    expect(s.seats.every((x) => x.place !== null)).toBe(true);
    expect(() => startRaubHand(s, makeLcg(1))).toThrow("INVALID_GAME_PHASE");
    expect(
      raubPlacements({
        seats: [
          { ...s.seats[0]!, score: 0 },
          { ...s.seats[1]!, score: 0 },
          { ...s.seats[2]!, score: 7 },
          { ...s.seats[3]!, score: 4 },
        ],
      }).map((p) => [p.playerId, p.place]),
    ).toEqual([
      ["a", 1],
      ["b", 1],
      ["d", 3],
      ["c", 4],
    ]);
  });
});

// ---- pogled i automatski potezi ----

describe("raub pogled (anti-leak)", () => {
  it("nikad tuđe ruke, špil ni odbačene karte", () => {
    let s = toTricks();
    s = act(s, "b", { type: "play", cardId: "clubs-K" });
    const v = getRaubView(s, "c");
    const json = JSON.stringify(v);
    for (const id of ["a", "b", "d"]) {
      for (const card of s.seats.find((x) => x.playerId === id)!.hand) {
        expect(json).not.toContain(`"${card.id}"`);
      }
    }
    for (const card of s.deck) expect(json).not.toContain(`"${card.id}"`);
    expect(v).not.toHaveProperty("deck");
    expect(v).not.toHaveProperty("discarded");
    expect(v.deckCount).toBe(s.deck.length);
    expect(v.legalCardIds).not.toBeNull(); // c je na potezu
    expect(getRaubView(s, "d").legalCardIds).toBeNull();
  });

  it("odbačene karte (i karte onog ko ne ide) se ne vide", () => {
    let s = match({ hands: HANDS4, talon: D("7") });
    s = act(s, "a", { type: "discard", cardId: "spades-K" });
    s = act(s, "b", { type: "go", go: false });
    for (const viewer of IDS4) {
      const json = JSON.stringify(getRaubView(s, viewer));
      expect(json).not.toContain('"spades-K"');
      if (viewer !== "b") expect(json).not.toContain('"hearts-A"');
    }
  });
});

describe("raub istek roka", () => {
  it("najsigurnija akcija po koraku", () => {
    let s = match({ hands: HANDS4, talon: H("Q") });
    expect(getRaubAutoAction(s, "a")).toEqual({ type: "open" });
    expect(getRaubAutoAction(s, "b")).toBeNull();
    s = act(s, "a", { type: "open" });
    expect(getRaubAutoAction(s, "a")).toEqual({ type: "bid", bid: "pass" });
    s = act(s, "a", { type: "bid", bid: "pass" });
    s = act(s, "b", { type: "bid", bid: "raub" });
    expect(getRaubAutoAction(s, "c")).toEqual({ type: "go", go: false });
    for (const id of ["c", "d", "a"]) s = act(s, id, { type: "go", go: true });
    expect(getRaubAutoAction(s, "b")).toEqual({ type: "exchange", cardIds: [] });
  });

  it("višak: najslabija koja nije adut i nije s talona", () => {
    const s = match({ hands: { ...HANDS4, a: [D("J"), S("8"), C("A"), D("8")] }, talon: D("7") });
    expect(getRaubAutoAction(s, "a")).toEqual({ type: "discard", cardId: "spades-8" });
  });

  it("štih: najslabija dozvoljena", () => {
    let s = toTricks();
    s = act(s, "b", { type: "play", cardId: "diamonds-9" });
    expect(getRaubAutoAction(s, "c")).toEqual({ type: "play", cardId: "diamonds-K" });
  });
});
