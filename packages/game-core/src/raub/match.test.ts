import { describe, expect, it } from "vitest";
import type { Card, Rank, RaubGameState, Suit } from "@zandar/shared-types";
import { createRaubDeck, raubRankValue, trickWinnerIndex } from "./cards";
import { createRaubRules } from "./config";
import {
  RAUB_DECK_SIZE,
  applyRaubAction,
  createRaubMatch,
  raubCanRefa,
  raubCardCount,
  raubLegalCards,
  raubMustGo,
  raubPlacements,
  raubTalonPending,
  raubScoreDelta,
  startRaubHand,
  upgradeRaubState,
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

/** „Raub": adut i obaveza odmah, a karta s talona čeka na stolu (odluka 20). */
const raubBy = (s: RaubGameState, pid: string) => act(s, pid, { type: "bid", bid: "raub" });

/**
 * Zamjena. Nosilac kome karta s talona čeka (Raub, Štih) poslije zamjene je
 * uzima i odbacuje `discardId` (odluka 20); ostalima se `discardId` ne koristi.
 */
function ex(s: RaubGameState, pid: string, cardIds: string[] = [], discardId?: string): RaubGameState {
  const claimed = raubTalonPending(s) && s.talonTakenBy === pid;
  s = act(s, pid, { type: "exchange", cardIds });
  if (claimed) s = act(s, pid, { type: "discard", cardId: discardId! });
  return s;
}

/** Sedmica na talonu: djelilac kaže „Štih" (odluka 13 — više nije automatski). */
const stih = (s: RaubGameState) => act(s, s.dealerId, { type: "stih", take: true });

/** Špil u kojem je `talon` prva okrenuta karta (indeks 2n), ostalo redom. */
function deckWithTalon(talon: Card, n: number): Card[] {
  const rest = createRaubDeck().filter((x) => x.id !== talon.id);
  return [...rest.slice(0, 2 * n), talon, ...rest.slice(2 * n)];
}

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

/**
 * Herc adut, b dijeli i rauba (uzme Q, odbaci K — samo djelilac smije, odluka 15),
 * svi idu, niko ne mijenja → štihovi.
 */
function toTricks(): RaubGameState {
  let s = match({ hands: HANDS4, talon: H("Q"), dealer: "b" });
  s = raubBy(s, "b");
  for (const id of ["c", "d", "a"]) s = act(s, id, { type: "go", go: true });
  for (const id of ["b", "c", "d", "a"]) s = ex(s, id, [], "hearts-K");
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
    expect(s.step).toBe("bidding");
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

describe("raub scenarij 1 — sedmica (Štih)", () => {
  it("sedmica na talonu: djelilac bira Štih ili Dalje, naslijepo (odluka 26)", () => {
    const s = match({ hands: HANDS4, talon: D("7"), next: [H("Q")] });
    expect(s.step).toBe("seven_choice");
    expect(s.currentPlayerId).toBe("a");
    expect(s.scenario).toBeNull();
    expect(getRaubView(s, "a").myCards).toHaveLength(0);
    expect(getRaubView(s, "a").myCardsHidden).toBe(true);
    expect(() => act(s, "b", { type: "stih", take: true })).toThrow("NOT_YOUR_TURN");
    expect(() => act(s, "a", { type: "bid", bid: "pass" })).toThrow("INVALID_ACTION");
    expect(getRaubAutoAction(s, "a")).toEqual({ type: "stih", take: false });

    // Dalje: odmah nova karta i obična licitacija; sedmica ostaje prigušena ispod.
    const next = act(s, "a", { type: "stih", take: false });
    expect(next.step).toBe("bidding");
    expect(next.talonFlips).toBe(2);
    expect(next.talon.map((x) => x.id)).toEqual(["diamonds-7", "hearts-Q"]);
    expect(next.currentPlayerId).toBe("a");
    expect(next.declarerId).toBeNull();
  });

  it("bez Štiha na trećoj karti: refa", () => {
    let s = match({ hands: HANDS4, talon: D("7"), rules: { maxTalonFlips: 2 }, next: [H("Q")] });
    s = act(s, "a", { type: "stih", take: false });
    for (const id of IDS4) s = act(s, id, { type: "bid", bid: "pass" });
    expect(s.lastHand!.void).toBe(true);
  });

  it("parametar: stihOptional false = stari automatski scenarij 1", () => {
    const s = match({ hands: HANDS4, talon: D("7"), rules: { stihOptional: false } });
    expect(s.scenario).toBe("seven");
    expect(s.step).toBe("going");
    expect(raubTalonPending(s)).toBe(true);
  });

  it("odluke 20 i 22: Štih — sedmica čeka na stolu dok djelilac ne zamijeni i ne odbaci jednu, tek onda je uzima", () => {
    let s = stih(match({ hands: HANDS4, talon: D("7") }));
    expect(s.scenario).toBe("seven");
    expect(s.declarerId).toBe("a");
    expect(s.trumpSuit).toBe("diamonds");
    expect(s.requiredTricks).toBe(1);
    expect(s.step).toBe("going");
    expect(s.seats[0]!.hand).toHaveLength(4);
    expect(s.talon).toEqual([D("7")]);
    expect(s.talonTakenBy).toBe("a");
    expect(s.lockedCardId).toBe("diamonds-7");
    for (const id of ["b", "c", "d"]) s = act(s, id, { type: "go", go: true });
    expect(s.currentPlayerId).toBe("a");
    expect(getRaubView(s, "a").maxExchange).toBe(4);
    s = act(s, "a", { type: "exchange", cardIds: ["spades-A"] });
    expect(s.step).toBe("discard_extra");
    // Odluka 22: sedmica je i dalje na stolu, u ruci su 4 karte
    expect(s.talon).toEqual([D("7")]);
    expect(s.seats[0]!.hand).toHaveLength(4);
    expect(s.seats[0]!.hand.map((x) => x.id)).not.toContain("diamonds-7");
    expect(getRaubView(s, "b").claimedTalon).toBe(true);
    expect(() => act(s, "a", { type: "discard", cardId: "diamonds-7" })).toThrow("ILLEGAL_CARD");
    s = act(s, "a", { type: "discard", cardId: "spades-K" });
    expect(s.talon).toEqual([]);
    expect(s.seats[0]!.hand).toHaveLength(4);
    expect(s.seats[0]!.hand.map((x) => x.id)).toContain("diamonds-7");
    expect(s.step).toBe("exchange");
    expect(s.currentPlayerId).toBe("b");
    expect(raubCardCount(s)).toBe(32);
  });

  it("sedmica je javna: na stolu dok čeka, kod nosioca do štihova, pa nestaje", () => {
    let s = stih(match({ hands: HANDS4, talon: D("7") }));
    for (const pid of IDS4) {
      const v = getRaubView(s, pid);
      expect(v.claimedTalon).toBe(true);
      expect(v.takenTalonCard).toBeNull();
      expect(v.talon).toEqual([D("7")]);
      expect(v.talonTakenBy).toBe("a");
    }
    for (const id of ["b", "c", "d"]) s = act(s, id, { type: "go", go: true });
    s = ex(s, "a", [], "spades-K");
    for (const pid of IDS4) {
      expect(getRaubView(s, pid).claimedTalon).toBe(false);
      expect(getRaubView(s, pid).takenTalonCard).toEqual(D("7"));
    }
    for (const id of ["b", "c", "d"]) s = act(s, id, { type: "exchange", cardIds: [] });
    expect(s.step).toBe("tricks");
    expect(getRaubView(s, "b").takenTalonCard).toBeNull();
  });

  it("stari snapshot: sedmica već u ruci, višak bez reda zamjene — i dalje vodi u Idem", () => {
    const fresh = stih(match({ hands: HANDS4, talon: D("7") }));
    const old = structuredClone(fresh);
    old.seats[0]!.hand.push(old.talon.pop()!);
    old.step = "discard_extra";
    old.currentPlayerId = "a";
    expect(raubTalonPending(old)).toBe(false);
    expect(getRaubView(old, "b").takenTalonCard).toEqual(D("7"));
    const after = act(old, "a", { type: "discard", cardId: "spades-K" });
    expect(after.step).toBe("going");
    expect(after.currentPlayerId).toBe("b");
    expect(after.seats[0]!.hand).toHaveLength(4);
    expect(raubCardCount(after)).toBe(32);
  });
});

describe("raub odluka 13 — Raub samo na A/K/Q/J, Moja, bez naslijepo", () => {
  it("nema zasebnog koraka naslijepo: licitacija počinje odmah (odluka 26 skriva samo karte)", () => {
    const s = match({ hands: HANDS4, talon: H("Q") });
    expect(s.step).toBe("bidding");
    expect(getRaubView(s, "a").myCardsHidden).toBe(true);
    expect(() => act(s, "a", { type: "blind" } as never)).toThrow("INVALID_ACTION");
    expect(() => act(s, "a", { type: "open" } as never)).toThrow("INVALID_ACTION");
  });

  it("Raub dozvoljen na A, K, Q i J, a na 10, 9 i 8 nije", () => {
    for (const r of ["A", "K", "Q", "J"] as Rank[]) {
      const hands = { ...HANDS4, b: [S("8"), H("8"), C("K"), D("9")] };
      const s = match({ hands, talon: c("hearts", r) });
      expect(getRaubView(s, "a").bidOptions).toEqual({ raub: true, moja: false });
      expect(act(s, "a", { type: "bid", bid: "raub" }).declarerId).toBe("a");
    }
    for (const r of ["10", "9", "8"] as Rank[]) {
      const hands = { ...HANDS4, d: [S("9"), C("10"), C("9"), D("10")] };
      const s = match({ hands, talon: c("hearts", r) });
      expect(getRaubView(s, "a").bidOptions).toEqual({ raub: false, moja: true });
      expect(() => act(s, "a", { type: "bid", bid: "raub" })).toThrow("INVALID_ACTION");
      expect(act(s, "a", { type: "bid", bid: "pass" }).currentPlayerId).toBe("b");
    }
  });

  it("bidOptions ima samo igrač na potezu u licitaciji", () => {
    const s = match({ hands: HANDS4, talon: H("Q") });
    expect(getRaubView(s, "a").bidOptions).not.toBeNull();
    expect(getRaubView(s, "b").bidOptions).toBeNull();
  });

  it("Moja: sedmica te boje za kartu s talona, zaključana; nosi adut i mora 2", () => {
    const hands = { ...HANDS4, b: [H("7"), H("K"), C("K"), D("9")] };
    let s = match({ hands, talon: H("10") });
    s = act(s, "a", { type: "bid", bid: "pass" });
    expect(getRaubView(s, "b").bidOptions).toEqual({ raub: false, moja: true });
    s = act(s, "b", { type: "bid", bid: "moja" });
    expect(s.scenario).toBe("moja");
    expect(s.declarerId).toBe("b");
    expect(s.trumpSuit).toBe("hearts");
    expect(s.requiredTricks).toBe(2);
    const hand = s.seats[1]!.hand.map((x) => x.id);
    expect(hand).toContain("hearts-10");
    expect(hand).not.toContain("hearts-7");
    expect(s.seats[1]!.hand).toHaveLength(4);
    expect(s.talon).toEqual([H("7")]);
    expect(s.lockedCardId).toBe("hearts-10");
    expect(s.talonTakenBy).toBe("b");
    expect(s.step).toBe("going");
    expect(s.currentPlayerId).toBe("c");
    expect(raubCardCount(s)).toBe(32);
    expect(getRaubView(s, "d").takenTalonCard).toEqual(H("10"));
  });

  it("odluka 16: na kartu za Raub djelilac samo Raub ili Dalje (i sa sedmicom); ostali Moja", () => {
    const hands = { ...HANDS4, a: [H("7"), S("K"), C("A"), D("8")] };
    const s = match({ hands, talon: H("J") });
    expect(getRaubView(s, "a").bidOptions).toEqual({ raub: true, moja: false });
    expect(() => act(s, "a", { type: "bid", bid: "moja" })).toThrow("INVALID_ACTION");
    const passed = act(s, "a", { type: "bid", bid: "pass" });
    const moja = act(passed, "b", { type: "bid", bid: "moja" });
    expect(moja.declarerId).toBe("b");
    expect(() => act(moja, "c", { type: "bid", bid: "moja" })).toThrow("INVALID_ACTION");
  });

  it("odluka 15: Raub smije samo djelilac; ostali samo Moja ili Dalje", () => {
    let s = match({ hands: HANDS4, talon: H("Q") });
    expect(getRaubView(s, "a").bidOptions).toEqual({ raub: true, moja: false });
    s = act(s, "a", { type: "bid", bid: "pass" });
    expect(getRaubView(s, "b").bidOptions).toEqual({ raub: false, moja: true });
    expect(() => act(s, "b", { type: "bid", bid: "raub" })).toThrow("INVALID_ACTION");
  });

  it("odluka 15: Raub samo na prvoj karti — na drugoj djelilac kaže samo Moja ili Dalje", () => {
    let s = match({ hands: HANDS4, talon: H("8"), next: [S("J")] });
    for (const id of IDS4) s = act(s, id, { type: "bid", bid: "pass" });
    expect(s.talonFlips).toBe(2);
    expect(s.currentPlayerId).toBe("a");
    expect(getRaubView(s, "a").bidOptions).toEqual({ raub: false, moja: true });
    expect(() => act(s, "a", { type: "bid", bid: "raub" })).toThrow("INVALID_ACTION");
    const moja = act(s, "a", { type: "bid", bid: "moja" });
    expect(moja.declarerId).toBe("a");
    expect(moja.trumpSuit).toBe("spades");
    expect(moja.talon.at(-1)).toEqual(S("J")); // bez sedmice karta ostaje na talonu
    expect(raubCardCount(moja)).toBe(32);
  });

  it("odluka 15: prva karta 7, djelilac Dalje — na drugu kartu nema Rauba", () => {
    const s = act(match({ hands: HANDS4, talon: D("7"), next: [H("Q")] }), "a", { type: "stih", take: false });
    expect(s.step).toBe("bidding");
    expect(s.talonFlips).toBe(2);
    expect(getRaubView(s, "a").bidOptions).toEqual({ raub: false, moja: true });
    expect(() => act(s, "a", { type: "bid", bid: "raub" })).toThrow("INVALID_ACTION");
  });

  it("parametar raubFirstFlipOnly false: Raub djelioca i na drugoj karti", () => {
    let s = match({ hands: HANDS4, talon: H("8"), next: [S("J")], rules: { raubFirstFlipOnly: false } });
    for (const id of IDS4) s = act(s, id, { type: "bid", bid: "pass" });
    expect(getRaubView(s, "a").bidOptions).toEqual({ raub: true, moja: false });
  });

  it("parametar dealerRaubOrPass false: djelilac smije i Moja na kartu za Raub", () => {
    const s = match({ hands: HANDS4, talon: H("Q"), rules: { dealerRaubOrPass: false } });
    expect(getRaubView(s, "a").bidOptions).toEqual({ raub: true, moja: true });
    expect(act(s, "a", { type: "bid", bid: "moja" }).scenario).toBe("moja");
  });

  it("odluka 15: Moja bez sedmice — adut i mora 2, a karta ostaje na talonu", () => {
    let s = match({ hands: HANDS4, talon: H("8") });
    s = act(s, "a", { type: "bid", bid: "pass" });
    s = act(s, "b", { type: "bid", bid: "moja" });
    expect(s.scenario).toBe("moja");
    expect(s.declarerId).toBe("b");
    expect(s.trumpSuit).toBe("hearts");
    expect(s.requiredTricks).toBe(2);
    expect(s.talon).toEqual([H("8")]);
    expect(s.seats[1]!.hand.map((x) => x.id).sort()).toEqual(["clubs-K", "diamonds-9", "hearts-A", "hearts-K"]);
    expect(s.talonTakenBy).toBeNull();
    expect(s.lockedCardId).toBeNull();
    expect(getRaubView(s, "c").takenTalonCard).toBeNull();
    expect(s.step).toBe("going");
    expect(s.currentPlayerId).toBe("c");
    expect(raubCardCount(s)).toBe(32);
    s = autoToHandEnd(s);
    expect(s.lastHand!.scenario).toBe("moja");
    expect(raubCardCount(s)).toBe(32);
  });

  it("parametri raubDealerOnly false i mojaNeedsSeven true: pravilo odluke 13", () => {
    const rules = { raubDealerOnly: false, mojaNeedsSeven: true };
    let s = match({ hands: HANDS4, talon: H("Q"), rules });
    expect(getRaubView(s, "a").bidOptions).toEqual({ raub: true, moja: false });
    s = act(s, "a", { type: "bid", bid: "pass" });
    expect(getRaubView(s, "b").bidOptions).toEqual({ raub: true, moja: false });
    expect(raubBy(s, "b").declarerId).toBe("b");
  });

  it("Moja boduje kao Raub: jedan štih +3, nijedan +4", () => {
    expect(raubScoreDelta({ declarer: true, requiredTricks: 2, tricks: 1 })).toEqual({ delta: 3, penalty: true });
    expect(raubScoreDelta({ declarer: true, requiredTricks: 2, tricks: 0 })).toEqual({ delta: 4, penalty: true });
    const hands = { ...HANDS4, b: [H("7"), H("K"), C("K"), D("9")] };
    let s = match({ hands, talon: H("8") });
    s = act(s, "a", { type: "bid", bid: "pass" });
    s = act(s, "b", { type: "bid", bid: "moja" });
    s = autoToHandEnd(s);
    const row = s.lastHand!.rows.find((r) => r.playerId === "b")!;
    expect(s.lastHand!.scenario).toBe("moja");
    expect(s.lastHand!.requiredTricks).toBe(2);
    expect(row.delta).toBe(raubScoreDelta({ declarer: true, requiredTricks: 2, tricks: row.tricks }).delta);
  });

  it("stari snapshot u await_open: upgradeRaubState ga vodi u licitaciju", () => {
    const fresh = match({ hands: HANDS4, talon: H("Q") });
    const old: RaubGameState = { ...fresh, step: "await_open", dealerOpened: false };
    expect(getRaubView(old, "a").myCardsHidden).toBe(true);
    const up = upgradeRaubState(old);
    expect(up.step).toBe("bidding");
    expect(up.currentPlayerId).toBe("a");
    expect(up.dealerOpened).toBe(true);
    expect(up.stateVersion).toBe(old.stateVersion + 1);
    expect(getRaubView(up, "a").myCards).toHaveLength(4);
    expect(upgradeRaubState(fresh)).toBe(fresh);
  });

  it("stari snapshot bez novih pravila: podrazumijevane vrijednosti", () => {
    const fresh = match({ hands: HANDS4, talon: H("10") });
    const { raubRanks: _r, stihOptional: _s, mojaRequiredTricks: _m, ...oldRules } = fresh.rules;
    const old: RaubGameState = { ...fresh, rules: oldRules };
    expect(() => act(old, "a", { type: "bid", bid: "raub" })).toThrow("INVALID_ACTION");
  });

  it("stari snapshot bez raubFirstFlipOnly: Raub samo na prvoj karti", () => {
    let fresh = match({ hands: HANDS4, talon: H("8"), next: [S("J")] });
    for (const id of IDS4) fresh = act(fresh, id, { type: "bid", bid: "pass" });
    const { raubFirstFlipOnly: _f, ...oldRules } = fresh.rules;
    const old: RaubGameState = { ...fresh, rules: oldRules };
    expect(getRaubView(old, "a").bidOptions).toEqual({ raub: false, moja: true });
  });
});

describe("raub scenarij 3 — licitacija", () => {
  it("djelilac licitira prvi, pa redom; Raub djelioca: nosilac je i mora 2", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), dealer: "b" });
    expect(s.step).toBe("bidding");
    expect(s.currentPlayerId).toBe("b");
    s = act(s, "b", { type: "bid", bid: "raub" });
    expect(s.declarerId).toBe("b");
    expect(s.scenario).toBe("bid");
    expect(s.requiredTricks).toBe(2);
    expect(s.trumpSuit).toBe("hearts");
    // Odluka 20: karta ostaje na stolu (pripada nosiocu) do njegove zamjene.
    expect(s.talon).toEqual([H("Q")]);
    expect(s.seats[1]!.hand).toHaveLength(4);
    expect(s.lockedCardId).toBe("hearts-Q");
    expect(s.talonTakenBy).toBe("b");
    expect(s.step).toBe("going");
    expect(s.currentPlayerId).toBe("c");
    for (const pid of IDS4) {
      expect(getRaubView(s, pid).claimedTalon).toBe(true);
      expect(getRaubView(s, pid).takenTalonCard).toBeNull();
    }
    expect(getRaubView(s, "b").lockedCardId).toBeNull();
    for (const id of ["c", "d", "a"]) s = act(s, id, { type: "go", go: true });
    expect(s.currentPlayerId).toBe("b");
    s = act(s, "b", { type: "exchange", cardIds: [] });
    expect(s.step).toBe("discard_extra");
    expect(s.currentPlayerId).toBe("b");
    // Odluka 22: karta ostaje na stolu dok nosilac ne odbaci jednu od svoje 4
    expect(s.seats[1]!.hand).toHaveLength(4);
    expect(s.talon).toEqual([H("Q")]);
    for (const pid of IDS4) expect(getRaubView(s, pid).takenTalonCard).toBeNull();
    expect(() => act(s, "b", { type: "discard", cardId: "hearts-Q" })).toThrow("ILLEGAL_CARD");
    expect(getRaubAutoAction(s, "b")).toEqual({ type: "discard", cardId: "diamonds-9" });
    s = act(s, "b", { type: "discard", cardId: "clubs-K" });
    expect(s.talon).toEqual([]);
    expect(s.seats[1]!.hand.map((x) => x.id).sort()).toEqual(["diamonds-9", "hearts-A", "hearts-K", "hearts-Q"]);
    for (const pid of IDS4) expect(getRaubView(s, pid).takenTalonCard).toEqual(H("Q"));
    expect(s.step).toBe("exchange");
    expect(s.currentPlayerId).toBe("c");
    expect(raubCardCount(s)).toBe(32);
  });

  it("uzeta karta ostaje u ruci nosioca i on je odigra u štihu", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), rules: { allowDrop: false }, dealer: "b" });
    s = act(s, "b", { type: "bid", bid: "raub" });
    s = autoToHandEnd(s);
    const played = s.tricks.flatMap((t) => t.plays).find((p) => p.card.id === "hearts-Q");
    expect(played?.playerId).toBe("b");
  });

  it("Raub sa sedmicom aduta u ruci: nema ponude zamjene, sedmica ostaje kao adut", () => {
    const hands = { ...HANDS4, b: [H("7"), H("K"), C("K"), D("9")] };
    let s = match({ hands, talon: H("Q"), dealer: "b" });
    s = act(s, "b", { type: "bid", bid: "raub" });
    expect(s.step).toBe("going");
    expect(getRaubView(s, "b").swapOffer).toBeNull();
    for (const id of ["c", "d", "a"]) s = act(s, id, { type: "go", go: true });
    s = ex(s, "b", [], "diamonds-9");
    expect(s.seats[1]!.hand.map((x) => x.id).sort()).toEqual(["clubs-K", "hearts-7", "hearts-K", "hearts-Q"]);
    expect(s.talon).toEqual([]);
  });

  it("stari snapshot u swap_seven (prije odluke 14): zamjena i dalje radi", () => {
    const hands = { ...HANDS4, b: [H("7"), H("K"), C("K"), D("9")] };
    let fresh = match({ hands, talon: H("Q") });
    fresh = act(fresh, "a", { type: "bid", bid: "pass" });
    // Ruka zatečena poslije Rauba po starom pravilu: adut određen, talon netaknut.
    const s: RaubGameState = {
      ...structuredClone(fresh),
      scenario: "bid",
      declarerId: "b",
      trumpSuit: "hearts",
      requiredTricks: 2,
      step: "swap_seven",
      currentPlayerId: "b",
    };
    s.seats[1]!.bid = "raub";
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
    let s = match({ hands: HANDS4, talon: H("Q"), next: [S("7"), S("J")] });
    for (const id of IDS4) s = act(s, id, { type: "bid", bid: "pass" });
    expect(s.talonFlips).toBe(2);
    expect(s.talon.map((x) => x.id)).toEqual(["hearts-Q", "spades-7"]);
    expect(s.scenario).toBeNull(); // nije scenarij 1
    expect(s.step).toBe("bidding");
    expect(s.currentPlayerId).toBe("a");
    expect(s.seats.every((x) => x.bid === null)).toBe(true);
    expect(getRaubView(s, "b").offeredSuit).toBe("spades");
    // Na sedmicu se ne može ni Raub ni Moja (odluka 13): sljedeća karta.
    expect(getRaubView(s, "a").bidOptions).toEqual({ raub: false, moja: false });
    expect(() => act(s, "a", { type: "bid", bid: "raub" })).toThrow("INVALID_ACTION");
    for (const id of IDS4) s = act(s, id, { type: "bid", bid: "pass" });
    expect(s.talonFlips).toBe(3);
    // Treća karta: ni djelilac nema Raub (odluka 15), samo Moja ili Dalje.
    expect(getRaubView(s, "a").bidOptions).toEqual({ raub: false, moja: true });
    expect(() => act(s, "a", { type: "bid", bid: "raub" })).toThrow("INVALID_ACTION");
    s = act(s, "a", { type: "bid", bid: "moja" });
    expect(s.trumpSuit).toBe("spades");
    expect(s.requiredTricks).toBe(2);
  });

  it("niko ni poslije 3. karte: refa, ruka se ne boduje", () => {
    let s = match({ hands: HANDS4, talon: H("Q") });
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
    for (let flip = 0; flip < 2; flip++) {
      for (const id of IDS4) s = act(s, id, { type: "bid", bid: "pass" });
    }
    expect(s.lastHand!.void).toBe(true);
  });

  it("parametar: prvi licitira igrač desno od djelioca", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), rules: { firstBidder: "right_of_dealer" } });
    expect(s.currentPlayerId).toBe("b");
  });
});

// ---- idem / ne idem ----

describe("raub refa djelioca (odluka 23)", () => {
  it("djelilac odmah na prvoj karti: ruka se poništava, refa se upisuje, ostali ne licitiraju", () => {
    const s0 = match({ hands: HANDS4, talon: H("Q"), dealer: "b" });
    expect(raubCanRefa(s0, "b")).toBe(true);
    expect(getRaubView(s0, "b").canRefa).toBe(true);
    for (const pid of ["a", "c", "d"]) {
      expect(raubCanRefa(s0, pid)).toBe(false);
      expect(getRaubView(s0, pid).canRefa).toBe(false);
    }
    expect(() => act(s0, "c", { type: "refa" })).toThrow("NOT_YOUR_TURN");
    const s = act(s0, "b", { type: "refa" });
    expect(s.phase).toBe("hand_complete");
    expect(s.pendingRefas).toBe(1);
    expect(s.lastHand!.void).toBe(true);
    expect(s.lastHand!.refaBy).toBe("b");
    expect(s.lastHand!.rows).toEqual([]);
    expect(s.seats.every((x) => x.score === 21)).toBe(true);
    // Djeljenje ide dalje, a sljedeća ruka je ×2.
    const next = startRaubHand(s, makeLcg(3));
    expect(next.dealerId).toBe("c");
    expect(next.multiplier).toBe(2);
  });

  it("i na sedmici (umjesto Štih / Dalje)", () => {
    const s0 = match({ hands: HANDS4, talon: D("7") });
    expect(s0.step).toBe("seven_choice");
    expect(raubCanRefa(s0, "a")).toBe(true);
    const s = act(s0, "a", { type: "refa" });
    expect(s.lastHand!.void).toBe(true);
    expect(s.lastHand!.refaBy).toBe("a");
  });

  it("na drugoj i trećoj karti ne smije, ni poslije Dalje na sedmicu", () => {
    let s = match({ hands: HANDS4, talon: H("8"), dealer: "a" });
    for (const id of IDS4) s = act(s, id, { type: "bid", bid: "pass" });
    expect(s.talonFlips).toBe(2);
    expect(s.currentPlayerId).toBe("a");
    expect(raubCanRefa(s, "a")).toBe(false);
    expect(getRaubView(s, "a").canRefa).toBe(false);
    expect(() => act(s, "a", { type: "refa" })).toThrow("INVALID_ACTION");
    for (const id of IDS4) s = act(s, id, { type: "bid", bid: "pass" });
    expect(s.talonFlips).toBe(3);
    expect(() => act(s, "a", { type: "refa" })).toThrow("INVALID_ACTION");

    let t = match({ hands: HANDS4, talon: D("7"), next: [H("Q")] });
    t = act(t, "a", { type: "stih", take: false });
    expect(t.talonFlips).toBe(2);
    expect(() => act(t, "a", { type: "refa" })).toThrow("INVALID_ACTION");
  });

  it("ne poslije svog odgovora, ne kad prvi licitira drugi igrač na redu poslije njega", () => {
    const s = match({ hands: HANDS4, talon: H("8"), dealer: "a" });
    const after = act(s, "a", { type: "bid", bid: "pass" });
    expect(raubCanRefa(after, "b")).toBe(false);
    expect(() => act(after, "b", { type: "refa" })).toThrow("INVALID_ACTION");
  });

  it("parametar: dealerRefaFirstFlip false = nema refe djelioca", () => {
    const s = match({ hands: HANDS4, talon: H("Q"), dealer: "b", rules: { dealerRefaFirstFlip: false } });
    expect(raubCanRefa(s, "b")).toBe(false);
    expect(() => act(s, "b", { type: "refa" })).toThrow("INVALID_ACTION");
  });

  it("stari snapshot bez polja = novo pravilo", () => {
    const s = match({ hands: HANDS4, talon: H("Q"), dealer: "b" });
    delete s.rules.dealerRefaFirstFlip;
    expect(raubCanRefa(s, "b")).toBe(true);
  });

  it("istek roka ostaje pasivan (Dalje), ne refa", () => {
    const s = match({ hands: HANDS4, talon: H("Q"), dealer: "b" });
    expect(getRaubAutoAction(s, "b")).toEqual({ type: "bid", bid: "pass" });
  });
});

describe("raub idem / ne idem (odluka 9)", () => {
  it("ko ne ide odlaže karte i ne boduje se; zamjena i štihovi bez njega", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), dealer: "b" });
    s = raubBy(s, "b");
    s = act(s, "c", { type: "go", go: false });
    expect(s.seats[2]!.hand).toHaveLength(0);
    s = act(s, "d", { type: "go", go: true });
    s = act(s, "a", { type: "go", go: true });
    expect(s.exchangeOrder).toEqual(["b", "d", "a"]);
    for (const id of ["b", "d", "a"]) s = ex(s, id, [], "hearts-K");
    expect(s.step).toBe("tricks");
    s = autoToHandEnd(s);
    const row = s.lastHand!.rows.find((r) => r.playerId === "c")!;
    expect(row).toMatchObject({ dropped: true, delta: 0, penalty: false });
    expect(s.seats[2]!.score).toBe(21);
    expect(s.lastHand!.rows.reduce((sum, r) => sum + r.tricks, 0)).toBe(4);
    expect(raubCardCount(s)).toBe(32);
  });

  it("odluka 19 + 24: zadnji upitani poslije dva „Ne idem” ide bez pitanja", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), dealer: "b" });
    s = raubBy(s, "b");
    for (const id of ["c", "d"]) {
      expect(raubMustGo(s, id)).toBe(false);
      expect(getRaubView(s, id).mustGo).toBe(false);
      s = act(s, id, { type: "go", go: false });
    }
    expect(s.seats[0]!.going).toBe(true);
    expect(s.step).toBe("exchange");
    expect(s.currentPlayerId).toBe("b");
    expect(s.exchangeOrder).toEqual(["b", "a"]);
    expect(raubCardCount(s)).toBe(32);
  });

  it("stari snapshot: zatečen u going sa obaveznim „Idem” — samo Idem prolazi", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), dealer: "b" });
    s = raubBy(s, "b");
    // Stanje prije odluke 24: c i d rekli „Ne idem", a se još pita.
    for (const id of ["c", "d"]) {
      const seat = s.seats.find((x) => x.playerId === id)!;
      seat.going = false;
      s.discarded.push(...seat.hand.splice(0));
    }
    s.currentPlayerId = "a";
    expect(raubMustGo(s, "a")).toBe(true);
    expect(getRaubView(s, "a").mustGo).toBe(true);
    expect(getRaubView(s, "b").mustGo).toBe(false);
    expect(() => act(s, "a", { type: "go", go: false })).toThrow("INVALID_ACTION");
    expect(getRaubAutoAction(s, "a")).toEqual({ type: "go", go: true });
    s = act(s, "a", { type: "go", go: true });
    expect(s.step).toBe("exchange");
    expect(s.exchangeOrder).toEqual(["b", "a"]);
  });

  it("odluka 19: ako je neko već rekao „Idem”, zadnji smije „Ne idem”", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), dealer: "b" });
    s = raubBy(s, "b");
    s = act(s, "c", { type: "go", go: true });
    s = act(s, "d", { type: "go", go: false });
    expect(raubMustGo(s, "a")).toBe(false);
    expect(getRaubAutoAction(s, "a")).toEqual({ type: "go", go: false });
    s = act(s, "a", { type: "go", go: false });
    expect(s.exchangeOrder).toEqual(["b", "c"]);
  });

  it("odluka 24: u 2P protivnik nosioca ide bez pitanja (Raub, Moja, Štih)", () => {
    let s = match({ ids: ["a", "b"], hands: HANDS4, talon: H("Q"), dealer: "b" });
    s = raubBy(s, "b");
    expect(s.step).not.toBe("going");
    expect(s.seats.every((x) => x.going === true)).toBe(true);
    expect(s.exchangeOrder).toEqual(["b", "a"]);

    let m = match({ ids: ["a", "b"], hands: HANDS4, talon: H("Q"), dealer: "b" });
    m = act(m, "b", { type: "bid", bid: "pass" });
    m = act(m, "a", { type: "bid", bid: "moja" });
    expect(m.step).toBe("exchange");
    expect(m.seats.every((x) => x.going === true)).toBe(true);

    let t = match({ ids: ["a", "b"], hands: HANDS4, talon: D("7"), dealer: "b" });
    t = act(t, "b", { type: "stih", take: true });
    expect(t.step).toBe("exchange");
    expect(t.seats.every((x) => x.going === true)).toBe(true);
  });

  it("bez parametra svi igraju i nema koraka going", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), rules: { allowDrop: false }, dealer: "b" });
    s = raubBy(s, "b");
    expect(s.step).toBe("exchange");
    expect(s.currentPlayerId).toBe("b");
  });
});

// ---- zamjena ----

describe("raub zamjena", () => {
  function toExchange(next: Card[] = [], rules?: Parameters<typeof createRaubRules>[1]) {
    let s = match({ hands: HANDS4, talon: H("Q"), next, dealer: "b", rules });
    s = raubBy(s, "b");
    for (const id of ["c", "d", "a"]) s = act(s, id, { type: "go", go: true });
    return s;
  }

  it("ide od nosioca, u smjeru igre; zamijenjene karte idu iz špila", () => {
    let s = toExchange([S("8"), S("10")]);
    expect(s.currentPlayerId).toBe("b");
    s = ex(s, "b", ["clubs-K", "diamonds-9"], "hearts-K");
    expect(s.seats[1]!.hand.map((x) => x.id)).toEqual(["hearts-A", "spades-8", "spades-10", "hearts-Q"]);
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

  it("odluka 20: dok karta čeka na stolu, nosilac mijenja do 4, a nju ne može", () => {
    const s = toExchange();
    expect(() => act(s, "b", { type: "exchange", cardIds: ["hearts-Q"] })).toThrow("CARD_LOCKED");
    expect(getRaubView(s, "b").maxExchange).toBe(4);
  });

  it("odluke 20 i 22: nosilac mijenja sve 4 — dobija tačno 4, bez otvorene, odbacuje jednu, pa uzima kartu", () => {
    let s = toExchange();
    const deckTop = s.deck.slice(0, 4);
    s = act(s, "b", { type: "exchange", cardIds: HANDS4.b!.map((x) => x.id) });
    expect(s.step).toBe("discard_extra");
    expect(s.seats[1]!.hand.map((x) => x.id)).toEqual(deckTop.map((x) => x.id));
    expect(s.talon.at(-1)).toEqual(H("Q"));
    expect(s.openCard).toBeNull();
    expect(s.fullExchangeUsed).toBe(false);
    s = act(s, "b", { type: "discard", cardId: deckTop[0]!.id });
    expect(s.seats[1]!.hand.map((x) => x.id)).toEqual([...deckTop.slice(1).map((x) => x.id), "hearts-Q"]);
    expect(s.currentPlayerId).toBe("c");
    // Sljedeći koji mijenja sve 4 dobija tačno 4, bez otvorene (odluka 25).
    s = act(s, "c", { type: "exchange", cardIds: HANDS4.c!.map((x) => x.id) });
    expect(s.seats[2]!.hand).toHaveLength(4);
    expect(s.openCard).toBeNull();
    expect(s.currentPlayerId).toBe("d");
    expect(raubCardCount(s)).toBe(32);
  });

  it("odluka 25: zamjena sve 4 daje tačno 4 skrivene — bez pete, otvorene i odbacivanja", () => {
    let s = toExchange();
    s = ex(s, "b", [], "hearts-K");
    const deckTop = s.deck.slice(0, 4);
    s = act(s, "c", { type: "exchange", cardIds: HANDS4.c!.map((x) => x.id) });
    expect(s.seats[2]!.hand.map((x) => x.id)).toEqual(deckTop.map((x) => x.id));
    expect(s.openCard).toBeNull();
    expect(s.fullExchangeUsed).toBe(false);
    expect(s.step).toBe("exchange");
    expect(s.currentPlayerId).toBe("d");
    expect(getRaubView(s, "d").openCard).toBeNull();
    expect(raubCardCount(s)).toBe(32);
  });

  it("odluka 25: stari snapshot bez `fullExchangeBonus` igra po novom pravilu", () => {
    let s = toExchange();
    delete s.rules.fullExchangeBonus;
    s = ex(s, "b", [], "hearts-K");
    s = act(s, "c", { type: "exchange", cardIds: HANDS4.c!.map((x) => x.id) });
    expect(s.seats[2]!.hand).toHaveLength(4);
    expect(s.openCard).toBeNull();
    expect(s.currentPlayerId).toBe("d");
  });

  it("uz `fullExchangeBonus`: prva zamjena sve 4 daje 5 karata (treća otvorena), odbacuje jednu ali ne otvorenu (odluka 1)", () => {
    let s = toExchange([], { fullExchangeBonus: true });
    s = ex(s, "b", [], "hearts-K");
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
    s = ex(s, "b", ["clubs-K", "diamonds-9"], "hearts-K");
    expect(s.deck).toHaveLength(0);
    expect(s.step).toBe("tricks");
    expect(s.seats.map((x) => x.exchanged)).toEqual([0, 2, 0, 0]);
    expect(s.seats.every((x) => x.hand.length === 4)).toBe(true);
  });

  it("odluka 22: špil prazan na redu nosioca — odbaci jednu, pa karta sa stola prelazi u ruku", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), dealer: "b" });
    s = act(s, "b", { type: "bid", bid: "raub" });
    for (const id of ["c", "d"]) s = act(s, id, { type: "go", go: true });
    s = { ...s, deck: [], discarded: [...s.discarded, ...s.deck] };
    s = act(s, "a", { type: "go", go: true });
    expect(s.step).toBe("discard_extra");
    expect(s.currentPlayerId).toBe("b");
    expect(s.talon).toEqual([H("Q")]);
    expect(s.seats[1]!.hand).toHaveLength(4);
    s = act(s, "b", { type: "discard", cardId: "clubs-K" });
    expect(s.talon).toEqual([]);
    expect(s.seats[1]!.hand.map((x) => x.id)).toContain("hearts-Q");
    expect(s.step).toBe("tricks");
    expect(s.seats.every((x) => x.hand.length === 4)).toBe(true);
    expect(raubCardCount(s)).toBe(32);
  });

  it("uz `fullExchangeBonus`: prva zamjena sve 4 kad je u špilu manje od 5 — dobija koliko ima, bez odbacivanja", () => {
    let s = toExchange([], { fullExchangeBonus: true });
    // b ne mijenja (uzme kartu s talona i odbaci), pa sve 4 mijenja c.
    s = ex(s, "b", [], "hearts-K");
    s = { ...s, deck: s.deck.slice(0, 4), discarded: [...s.discarded, ...s.deck.slice(4)] };
    s = act(s, "c", { type: "exchange", cardIds: s.seats[2]!.hand.map((x) => x.id) });
    expect(s.seats[2]!.hand).toHaveLength(4);
    expect(s.openCard!.playerId).toBe("c");
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
    expect(raubLegalCards(s, "b").map((x) => x.id).sort()).toEqual(["hearts-A", "hearts-Q"]);
  });

  it("bez boje i bez aduta: bilo koja karta", () => {
    const hands = {
      a: [S("A"), S("K"), S("Q"), S("J")],
      b: [H("A"), H("K"), C("K"), D("9")],
      c: [C("Q"), C("J"), D("A"), D("K")],
      d: [H("9"), S("9"), C("9"), D("10")],
    };
    let s = match({ hands, talon: H("Q"), dealer: "b" });
    s = raubBy(s, "b");
    for (const id of ["c", "d", "a"]) s = act(s, id, { type: "go", go: true });
    for (const id of ["b", "c", "d", "a"]) s = ex(s, id, [], "hearts-K");
    s = act(s, "b", { type: "play", cardId: "diamonds-9" });
    s = act(s, "c", { type: "play", cardId: "diamonds-A" });
    s = act(s, "d", { type: "play", cardId: "diamonds-10" });
    expect(raubLegalCards(s, "a")).toHaveLength(4);
  });

  it("mora nadjačati kad može (odluka 21); bez toga smije baciti bilo koju kartu boje", () => {
    let s = toTricks();
    s = act(s, "b", { type: "play", cardId: "diamonds-9" });
    // oba karoa nose štih → oba dozvoljena
    expect(raubLegalCards(s, "c").map((x) => x.id).sort()).toEqual(["diamonds-A", "diamonds-K"]);
    s = act(s, "c", { type: "play", cardId: "diamonds-A" });
    // d ima samo 10 karo, ne može nadjačati asa → smije baciti boju
    expect(raubLegalCards(s, "d").map((x) => x.id)).toEqual(["diamonds-10"]);
  });

  describe("nadjačavanje (odluka 21)", () => {
    const hands = {
      a: [S("A"), S("K"), S("Q"), S("J")],
      b: [H("A"), H("8"), C("K"), D("9")],
      c: [H("K"), H("9"), C("A"), C("9")],
      d: [H("10"), H("7"), S("7"), S("8")],
    };
    const start = (rules?: Parameters<typeof createRaubRules>[1]) => {
      let s = match({ hands, talon: H("Q"), dealer: "b", rules });
      s = raubBy(s, "b");
      for (const id of ["c", "d", "a"]) s = act(s, id, { type: "go", go: true });
      for (const id of ["b", "c", "d", "a"]) s = ex(s, id, [], "hearts-8");
      return s;
    };

    it("u boji: samo karta koja nosi štih (X na stolu, IX i figura u ruci → figura)", () => {
      let s = start();
      s = act(s, "b", { type: "play", cardId: "hearts-Q" });
      expect(raubLegalCards(s, "c").map((x) => x.id)).toEqual(["hearts-K"]);
      expect(() => act(s, "c", { type: "play", cardId: "hearts-9" })).toThrow("ILLEGAL_CARD");
    });

    it("bez boje: jači adut kad ga ima", () => {
      let s = start();
      s = act(s, "b", { type: "play", cardId: "diamonds-9" });
      s = act(s, "c", { type: "play", cardId: "hearts-9" });
      expect(raubLegalCards(s, "d").map((x) => x.id)).toEqual(["hearts-10"]);
    });

    it("parametar isključen: stara pravila (i stari snapshoti)", () => {
      let s = start({ mustOvertrump: false });
      s = act(s, "b", { type: "play", cardId: "hearts-Q" });
      expect(raubLegalCards(s, "c").map((x) => x.id).sort()).toEqual(["hearts-9", "hearts-K"]);
    });
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
    let s = match({ ids: ["a", "b", "c"], dealer: "a", hands: hands3, talon: H("Q") });
    s = raubBy(s, "a");
    s = act(s, "b", { type: "go", go: true });
    s = act(s, "c", { type: "go", go: true });
    for (const id of ["a", "b", "c"]) s = ex(s, id, [], "hearts-J"); // a uzme Q s talona, odbaci J
    // a: H A, H K, H Q nose 3 štiha; b nosi pik asom
    s = act(s, "a", { type: "play", cardId: "hearts-A" });
    s = act(s, "b", { type: "play", cardId: "spades-A" });
    s = act(s, "c", { type: "play", cardId: "spades-7" });
    s = act(s, "a", { type: "play", cardId: "hearts-K" });
    s = act(s, "b", { type: "play", cardId: "diamonds-8" });
    s = act(s, "c", { type: "play", cardId: "spades-8" });
    s = act(s, "a", { type: "play", cardId: "hearts-Q" });
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
      if (s.step === "seven_choice") s = act(s, s.currentPlayerId!, { type: "stih", take: false });
      while (s.phase === "playing" && s.step === "bidding") {
        s = act(s, s.currentPlayerId!, { type: "bid", bid: "pass" });
      }
      if (s.lastHand?.void) voided += 1;
    }
    expect(s.pendingRefas).toBe(3);

    const multipliers: number[] = [];
    while (multipliers.length < 4) {
      // Talon je as, pa prvi u licitaciji smije reći Raub (odluka 13).
      s = startRaubHand(s, rng, { deck: deckWithTalon(H("A"), s.seats.length) });
      s = act(s, s.currentPlayerId!, { type: "bid", bid: "raub" });
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
    let s = stih(match({ hands: HANDS4, talon: D("7") }));
    s = act(s, "b", { type: "go", go: false });
    for (const id of ["c", "d"]) s = act(s, id, { type: "go", go: true });
    s = ex(s, "a", [], "spades-K");
    for (const viewer of IDS4) {
      const json = JSON.stringify(getRaubView(s, viewer));
      expect(json).not.toContain('"spades-K"');
      if (viewer !== "b") expect(json).not.toContain('"hearts-A"');
    }
  });
});

describe("raub istek roka", () => {
  it("najsigurnija akcija po koraku", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), dealer: "b" });
    expect(getRaubAutoAction(s, "a")).toBeNull();
    expect(getRaubAutoAction(s, "b")).toEqual({ type: "bid", bid: "pass" });
    s = act(s, "b", { type: "bid", bid: "raub" });
    expect(getRaubAutoAction(s, "c")).toEqual({ type: "go", go: false });
    for (const id of ["c", "d", "a"]) s = act(s, id, { type: "go", go: true });
    expect(getRaubAutoAction(s, "b")).toEqual({ type: "exchange", cardIds: [] });
    s = act(s, "b", { type: "exchange", cardIds: [] });
    expect(getRaubAutoAction(s, "b")).toEqual({ type: "discard", cardId: "diamonds-9" });
  });

  it("višak: najslabija koja nije adut i nije s talona", () => {
    let s = stih(match({ hands: { ...HANDS4, a: [D("J"), S("8"), C("A"), D("8")] }, talon: D("7") }));
    for (const id of ["b", "c", "d"]) s = act(s, id, { type: "go", go: true });
    s = act(s, "a", { type: "exchange", cardIds: [] });
    expect(getRaubAutoAction(s, "a")).toEqual({ type: "discard", cardId: "spades-8" });
  });

  it("štih: najslabija dozvoljena", () => {
    let s = toTricks();
    s = act(s, "b", { type: "play", cardId: "diamonds-9" });
    expect(getRaubAutoAction(s, "c")).toEqual({ type: "play", cardId: "diamonds-K" });
  });
});

describe("raub odluka 26 — djelilac odlučuje naslijepo", () => {
  const hidden = (s: RaubGameState, pid: string) => getRaubView(s, pid).myCardsHidden;
  // Bez herca u rukama, pa je svaki herc slobodan za talon.
  const HANDS4 = {
    a: [S("8"), S("10"), C("10"), D("8")],
    b: [S("9"), C("9"), D("9"), D("10")],
    c: [S("J"), C("J"), D("J"), D("Q")],
    d: [S("A"), S("Q"), C("Q"), C("8")],
  };

  it("prva karta za Raub: djelilac ne vidi karte, ostali vide", () => {
    for (const r of ["A", "K", "Q", "J"] as Rank[]) {
      const s = match({ hands: HANDS4, talon: c("hearts", r) });
      expect(hidden(s, "a")).toBe(true);
      expect(getRaubView(s, "a").myCards).toEqual([]);
      expect(getRaubView(s, "a").bidOptions).toEqual({ raub: true, moja: false });
      expect(getRaubView(s, "a").canRefa).toBe(true);
      for (const o of ["b", "c", "d"]) {
        expect(hidden(s, o)).toBe(false);
        expect(getRaubView(s, o).myCards).toHaveLength(4);
      }
      // Tuđi pogled vidi broj djeliočevih karata, kao i uvijek.
      expect(getRaubView(s, "b").seats.find((x) => x.playerId === "a")!.handCount).toBe(4);
    }
  });

  it("Raub otkriva karte djeliocu", () => {
    const s = raubBy(match({ hands: HANDS4, talon: H("K") }), "a");
    expect(s.dealerOpened).toBe(true);
    expect(hidden(s, "a")).toBe(false);
    expect(getRaubView(s, "a").myCards.map((x) => x.id)).toEqual(HANDS4.a!.map((x) => x.id));
  });

  it("Dalje otkriva karte; ostali licitiraju kao i prije", () => {
    const s = act(match({ hands: HANDS4, talon: H("Q") }), "a", { type: "bid", bid: "pass" });
    expect(hidden(s, "a")).toBe(false);
    expect(s.currentPlayerId).toBe("b");
    expect(getRaubView(s, "a").myCards).toHaveLength(4);
  });

  it("sedmica: Štih i Dalje otkrivaju karte", () => {
    const base = match({ hands: HANDS4, talon: D("7"), next: [H("Q")] });
    expect(hidden(base, "a")).toBe(true);
    expect(hidden(act(base, "a", { type: "stih", take: true }), "a")).toBe(false);
    const passed = act(base, "a", { type: "stih", take: false });
    expect(passed.talonFlips).toBe(2);
    expect(hidden(passed, "a")).toBe(false);
  });

  it("Refa naslijepo završava ruku i otkriva karte", () => {
    const s = act(match({ hands: HANDS4, talon: H("A") }), "a", { type: "refa" });
    expect(s.phase).toBe("hand_complete");
    expect(s.dealerOpened).toBe(true);
  });

  it("istek roka naslijepo = Dalje, pa djelilac vidi karte", () => {
    const s = match({ hands: HANDS4, talon: H("J") });
    const auto = getRaubAutoAction(s, "a")!;
    expect(auto).toEqual({ type: "bid", bid: "pass" });
    expect(hidden(act(s, "a", auto), "a")).toBe(false);
  });

  it("prva karta 10, 9 ili 8: djelilac odmah vidi karte", () => {
    for (const r of ["10", "9", "8"] as Rank[]) {
      const s = match({ hands: HANDS4, talon: c("hearts", r) });
      expect(hidden(s, "a")).toBe(false);
      expect(getRaubView(s, "a").myCards).toHaveLength(4);
    }
  });

  it("firstBidder right_of_dealer: Moja prije djelioca otkriva i njegove karte", () => {
    let s = match({ hands: HANDS4, talon: H("Q"), rules: { firstBidder: "right_of_dealer" } });
    expect(s.currentPlayerId).toBe("b");
    expect(hidden(s, "a")).toBe(true);
    s = act(s, "b", { type: "bid", bid: "moja" });
    expect(hidden(s, "a")).toBe(false);
  });

  it("parametar: dealerBlindFirstFlip false = djelilac odmah vidi karte", () => {
    const s = match({ hands: HANDS4, talon: H("A"), rules: { dealerBlindFirstFlip: false } });
    expect(hidden(s, "a")).toBe(false);
    expect(getRaubView(s, "a").myCards).toHaveLength(4);
  });

  it("stari snapshot: ruka usred licitacije sa otvorenim kartama ostaje otvorena", () => {
    const s = match({ hands: HANDS4, talon: H("A"), rules: { dealerBlindFirstFlip: false } });
    delete s.rules.dealerBlindFirstFlip;
    expect(hidden(s, "a")).toBe(false);
    const next = act(s, "a", { type: "bid", bid: "pass" });
    expect(hidden(next, "a")).toBe(false);
  });
});
