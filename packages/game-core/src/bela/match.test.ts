import { describe, expect, it } from "vitest";
import type { BelaGameState, BelaRules, Card, Rank, Suit } from "@zandar/shared-types";
import { BELA_CARD_POINTS, createBelaDeck } from "./cards";
import { createBelaRules } from "./config";
import {
  applyBelaAction,
  belaCardCount,
  belaHandAward,
  belaLegalCards,
  belaMatchWinner,
  createBelaMatch,
  finishBelaMatchEarly,
  startBelaHand,
} from "./match";
import { getBelaAutoAction, getBelaView } from "./view";

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

const IDS = ["a", "b", "c", "d"] as const;

/**
 * Špil za zadat raspored. Djelilac dijeli od sljedećeg, sebi zadnji: 3, 3, pa
 * 2 u talon. `hands[id]` = 8 karata: prvih 6 vidljive, zadnje 2 talon.
 * Karte koje fale se popunjavaju redom iz ostatka špila.
 */
function deckFor(dealer: string, partial: Partial<Record<string, Card[]>>): Card[] {
  const used = new Set(Object.values(partial).flat().map((x) => x!.id));
  const rest = createBelaDeck().filter((x) => !used.has(x.id));
  const hands: Record<string, Card[]> = {};
  for (const id of IDS) {
    const h = [...(partial[id] ?? [])];
    while (h.length < 8) h.push(rest.shift()!);
    hands[id] = h;
  }
  const di = IDS.indexOf(dealer as (typeof IDS)[number]);
  const order = [1, 2, 3, 4].map((k) => IDS[(di + k) % 4]!);
  const deck: Card[] = [];
  for (const id of order) deck.push(...hands[id]!.slice(0, 3));
  for (const id of order) deck.push(...hands[id]!.slice(3, 6));
  for (const id of order) deck.push(...hands[id]!.slice(6, 8));
  return deck;
}

function match(opts: { dealer?: string; deck?: Card[]; rules?: Partial<Omit<BelaRules, "playerCount">> } = {}) {
  return createBelaMatch({
    roomId: "r",
    matchId: "m",
    playerIds: IDS,
    rules: createBelaRules(opts.rules),
    rng: makeLcg(7),
    dealerId: opts.dealer ?? "d",
    deck: opts.deck,
  });
}

/** Odigra do kraja ruke: svako baca najjeftiniju dozvoljenu (auto-potez). */
function playOut(s: BelaGameState): BelaGameState {
  let st = s;
  while (st.phase === "playing") st = applyBelaAction(st, st.currentPlayerId!, getBelaAutoAction(st, st.currentPlayerId!)!);
  return st;
}

/** Stanje usred štiha sa zadatim rukama (za pravila bacanja). */
function trickState(trump: Suit, hands: Record<string, Card[]>, plays: [string, Card][], rules?: Partial<Omit<BelaRules, "playerCount">>) {
  let s = match({ rules });
  s = applyBelaAction(s, "a", { type: "call", suit: trump });
  s = structuredClone(s);
  for (const seat of s.seats) seat.hand = hands[seat.playerId] ?? [];
  const leader = plays[0]?.[0] ?? "a";
  s.tricks = [{ leaderId: leader, plays: plays.map(([playerId, card]) => ({ playerId, card })), winnerId: null }];
  return s;
}

/**
 * Raspored bez ijednog zvanja osim a-ove kvarte u piku (S7–S10 = 50): da
 * poređenje zvanja ne zavisi od popune iz ostatka špila.
 */
const DECL_DEAL: Record<string, Card[]> = {
  a: [S("7"), S("8"), S("9"), S("10"), H("A"), D("A"), C("K"), D("7")],
  b: [H("7"), H("9"), H("J"), S("J"), D("8"), D("10"), C("7"), C("9")],
  c: [H("8"), H("10"), S("Q"), S("A"), D("Q"), C("8"), C("10"), C("A")],
  d: [H("Q"), H("K"), S("K"), D("9"), D("J"), D("K"), C("J"), C("Q")],
};

const ids = (cards: Card[]) => cards.map((x) => x.id).sort();

// ---- dijeljenje i zvanje aduta ----

describe("bela dijeljenje", () => {
  it("svako dobija 6 karata i 2 zatvorene; 32 karte na tačno jednom mjestu", () => {
    const s = match();
    expect(s.seats.every((x) => x.hand.length === 6 && x.talon.length === 2)).toBe(true);
    expect(belaCardCount(s)).toBe(32);
    expect(s.step).toBe("calling");
    // Prvi zove igrač desno od djelioca (sljedeći u smjeru igre).
    expect(s.currentPlayerId).toBe("a");
  });

  it("timovi: mjesta 0+2 protiv 1+3", () => {
    expect(match().seats.map((x) => x.team)).toEqual([0, 1, 0, 1]);
  });

  it("P-2 alternativa: svih 8 odmah, bez talona", () => {
    const s = match({ rules: { talonCards: 0 } });
    expect(s.seats.every((x) => x.hand.length === 8 && x.talon.length === 0)).toBe(true);
  });

  it("pogled ne nosi tuđe karte, talon (ni vlastiti) ni špil", () => {
    const s = match();
    const v = getBelaView(s, "a");
    expect(v.myCards).toHaveLength(6);
    const json = JSON.stringify(v);
    for (const seat of s.seats) {
      for (const t of seat.talon) expect(json).not.toContain(t.id);
      if (seat.playerId !== "a") for (const h of seat.hand) expect(json).not.toContain(h.id);
    }
    expect(v.seats.find((x) => x.playerId === "b")!.talonCount).toBe(2);
  });

  it("zvanje boje: talon prelazi u ruku (8 karata), prvi štih otvara igrač desno od djelioca", () => {
    let s = match();
    s = applyBelaAction(s, "a", { type: "call", suit: null });
    s = applyBelaAction(s, "b", { type: "call", suit: "spades" });
    expect(s.trumpSuit).toBe("spades");
    expect(s.callerId).toBe("b");
    expect(s.forced).toBe(false);
    expect(s.seats.every((x) => x.hand.length === 8 && x.talon.length === 0)).toBe(true);
    expect(s.step).toBe("tricks");
    expect(s.currentPlayerId).toBe("a");
    expect(belaCardCount(s)).toBe(32);
  });

  it("P-9 alternativa: prvi štih otvara onaj ko je zvao", () => {
    let s = match({ rules: { firstLead: "caller" } });
    s = applyBelaAction(s, "a", { type: "call", suit: null });
    s = applyBelaAction(s, "b", { type: "call", suit: "spades" });
    expect(s.currentPlayerId).toBe("b");
  });

  it("P-3 mus: djelilac ne smije reći „” kad su svi prije njega rekli", () => {
    let s = match();
    for (const id of ["a", "b", "c"]) s = applyBelaAction(s, id, { type: "call", suit: null });
    expect(getBelaView(s, "d").callOptions).toEqual({ suits: ["hearts", "spades", "diamonds", "clubs"], canPass: false });
    expect(() => applyBelaAction(s, "d", { type: "call", suit: null })).toThrow("MUST_CALL");
    s = applyBelaAction(s, "d", { type: "call", suit: "clubs" });
    expect(s.forced).toBe(true);
  });

  it("P-3 alternativa: svi „” → novo dijeljenje, djelilac ide dalje", () => {
    let s = match({ rules: { dealerMustCall: false } });
    for (const id of IDS) s = applyBelaAction(s, id, { type: "call", suit: null });
    expect(s.phase).toBe("hand_complete");
    expect(s.lastHand!.outcome).toBe("redeal");
    expect(s.scores).toEqual([0, 0]);
    s = startBelaHand(s, makeLcg(1));
    expect(s.dealerId).toBe("a");
    expect(s.currentPlayerId).toBe("b");
  });

  it("P-4 alternativa: drugi krug zvanja, mus tek u drugom", () => {
    let s = match({ rules: { callRounds: 2 } });
    for (const id of IDS) s = applyBelaAction(s, id, { type: "call", suit: null });
    expect(s.callRound).toBe(2);
    expect(s.currentPlayerId).toBe("a");
    for (const id of ["a", "b", "c"]) s = applyBelaAction(s, id, { type: "call", suit: null });
    expect(() => applyBelaAction(s, "d", { type: "call", suit: null })).toThrow("MUST_CALL");
  });

  it("greške: tuđi potez, zastarjelo stanje, bacanje karte u zvanju", () => {
    const s = match();
    expect(() => applyBelaAction(s, "b", { type: "call", suit: null })).toThrow("NOT_YOUR_TURN");
    expect(() => applyBelaAction(s, "a", { type: "call", suit: null, clientKnownStateVersion: 999 })).toThrow("STALE_STATE");
    expect(() => applyBelaAction(s, "a", { type: "play", cardId: s.seats[0]!.hand[0]!.id })).toThrow("INVALID_ACTION");
  });
});

// ---- pravila bacanja ----

describe("bela pravila bacanja", () => {
  it("mora odgovoriti na boju i ići jače kad može", () => {
    const s = trickState("hearts", { b: [S("7"), S("A"), D("A")] }, [["a", S("10")]]);
    expect(ids(belaLegalCards(s, "b"))).toEqual([S("A").id]);
  });

  it("u boji bez jače karte: bilo koja te boje", () => {
    const s = trickState("hearts", { b: [S("7"), S("8"), D("A")] }, [["a", S("10")]]);
    expect(ids(belaLegalCards(s, "b"))).toEqual(ids([S("7"), S("8")]));
  });

  it("štih već isječen adutom: boja se prati bilo kojom kartom", () => {
    const s = trickState("hearts", { c: [S("7"), S("A"), H("J")] }, [["a", S("10")], ["b", H("7")]]);
    expect(ids(belaLegalCards(s, "c"))).toEqual(ids([S("7"), S("A")]));
  });

  it("bez boje: mora sjeći, i nadjačati adut kad može", () => {
    const s = trickState("hearts", { c: [H("8"), H("9"), D("A")] }, [["a", S("10")], ["b", H("Q")]]);
    expect(ids(belaLegalCards(s, "c"))).toEqual([H("9").id]);
  });

  it("bez boje i bez jačeg aduta: i dalje baca adut (podsijecanje)", () => {
    const s = trickState("hearts", { c: [H("7"), H("8"), D("A")] }, [["a", S("10")], ["b", H("J")]]);
    expect(ids(belaLegalCards(s, "c"))).toEqual(ids([H("7"), H("8")]));
  });

  it("bez boje i bez aduta: bilo šta", () => {
    const s = trickState("hearts", { b: [D("7"), C("A")] }, [["a", S("10")]]);
    expect(ids(belaLegalCards(s, "b"))).toEqual(ids([D("7"), C("A")]));
  });

  it("P-10: mora ići jače i kad štih nosi partner", () => {
    const s = trickState("hearts", { c: [S("7"), S("A")] }, [["a", S("10")], ["b", S("8")]], {});
    // Štih nosi a (partner od c): c i dalje mora A.
    expect(ids(belaLegalCards(s, "c"))).toEqual([S("A").id]);
  });

  it("P-10 alternativa: kad nosi partner, boja bez obaveze jačeg, a bez boje bilo šta", () => {
    const s = trickState("hearts", { c: [S("7"), S("A")], d: [H("7"), D("A")] }, [["a", S("10")], ["b", S("8")]], {
      mustOvertakePartner: false,
    });
    expect(ids(belaLegalCards(s, "c"))).toEqual(ids([S("7"), S("A")]));
    const s2 = trickState("hearts", { c: [H("7"), D("A")] }, [["a", S("10")], ["b", S("8")]], { mustOvertakePartner: false });
    expect(ids(belaLegalCards(s2, "c"))).toEqual(ids([H("7"), D("A")]));
  });

  it("server odbija nedozvoljenu kartu", () => {
    let s = match({ deck: deckFor("d", { a: [S("10")], b: [S("7"), S("A")] }) });
    s = applyBelaAction(s, "a", { type: "call", suit: "hearts" });
    s = applyBelaAction(s, "a", { type: "play", cardId: S("10").id });
    expect(() => applyBelaAction(s, "b", { type: "play", cardId: S("7").id })).toThrow("ILLEGAL_CARD");
  });
});

// ---- zvanja, bela i bodovanje ----

describe("bela tok ruke i bodovanje", () => {
  it("cijela ruka: 8 štihova, 162 boda karata (+ štiglja), 32 karte", () => {
    for (let seed = 1; seed <= 30; seed++) {
      let s = createBelaMatch({ roomId: "r", matchId: "m", playerIds: IDS, rules: createBelaRules(), rng: makeLcg(seed) });
      s = playOut(s);
      const h = s.lastHand!;
      expect(s.tricks).toHaveLength(8);
      expect(belaCardCount(s)).toBe(32);
      const cards = h.teams.reduce((a, t) => a + t.cardPoints, 0);
      expect(cards).toBe(BELA_CARD_POINTS + 10 + (h.stiglja !== null ? 90 : 0));
      expect(h.teams.map((t) => t.scoreAfter)).toEqual(s.scores);
    }
  });

  it("zvanja: prijava uz prvu kartu, pokazuju se tek poslije prvog štiha (P-6)", () => {
    let s = match({ deck: deckFor("d", DECL_DEAL) });
    s = applyBelaAction(s, "a", { type: "call", suit: "hearts" });
    expect(getBelaView(s, "a").myDeclarations.map((d) => d.points)).toEqual([50]);
    s = applyBelaAction(s, "a", getBelaAutoAction(s, "a")!);
    expect(getBelaView(s, "b").seats[0]!.declaredPoints).toBe(50);
    expect(getBelaView(s, "b").shownDeclarations).toEqual([]);
    for (const id of ["b", "c", "d"]) s = applyBelaAction(s, id, getBelaAutoAction(s, id)!);
    const shown = getBelaView(s, "b").shownDeclarations;
    expect(shown.find((p) => p.playerId === "a")!.declarations[0]!.points).toBe(50);
  });

  it("„”: igrač se odriče zvanja", () => {
    let s = match({ deck: deckFor("d", DECL_DEAL) });
    s = applyBelaAction(s, "a", { type: "call", suit: "hearts" });
    const auto = getBelaAutoAction(s, "a")!;
    s = applyBelaAction(s, "a", { ...auto, declare: false } as typeof auto);
    expect(s.seats[0]!.declared).toEqual([]);
  });

  it("bela: igrač sa K i O aduta dobija 20 kad baci drugu", () => {
    let s = match({ deck: deckFor("d", { b: [H("K"), H("Q")] }) });
    s = applyBelaAction(s, "a", { type: "call", suit: "hearts" });
    expect(s.belaHolderId).toBe("b");
    s = playOut(s);
    expect(s.lastHand!.belaBy).toBe("b");
    expect(s.lastHand!.teams[1]!.belaPoints).toBe(20);
  });

  it("bela kod igrača koji ima samo jednu od dvije karte se ne broji", () => {
    let s = match({ deck: deckFor("d", { b: [H("K")], c: [H("Q")] }) });
    s = applyBelaAction(s, "a", { type: "call", suit: "hearts" });
    expect(s.belaHolderId).toBeNull();
    s = playOut(s);
    expect(s.lastHand!.belaBy).toBeNull();
  });

  it("prolaz: svako dobija svoje", () => {
    const r = belaHandAward({ card: [100, 62], decl: [20, 0], bela: [0, 0], callerTeam: 0, hanging: 0, rules: createBelaRules() });
    expect(r).toEqual({ outcome: "pass", awarded: [120, 62], hanging: 0 });
  });

  it("P-11 pad: protivnik dobija sve, i zvanja tima koji je zvao", () => {
    const r = belaHandAward({ card: [70, 92], decl: [20, 0], bela: [0, 0], callerTeam: 0, hanging: 0, rules: createBelaRules() });
    expect(r.outcome).toBe("fail");
    expect(r.awarded).toEqual([0, 182]);
    const alt = belaHandAward({
      card: [70, 92], decl: [20, 0], bela: [0, 0], callerTeam: 0, hanging: 0,
      rules: createBelaRules({ failGivesCallerDeclarations: false }),
    });
    expect(alt.awarded).toEqual([0, 162]);
  });

  it("P-12 visi: tim koji je zvao ništa, bodovi idu pobjedniku sljedeće ruke", () => {
    const rules = createBelaRules();
    const tie = belaHandAward({ card: [81, 81], decl: [0, 0], bela: [0, 0], callerTeam: 1, hanging: 0, rules });
    expect(tie).toEqual({ outcome: "hang", awarded: [81, 0], hanging: 81 });
    const next = belaHandAward({ card: [100, 62], decl: [0, 0], bela: [0, 0], callerTeam: 0, hanging: 81, rules });
    expect(next).toEqual({ outcome: "pass", awarded: [181, 62], hanging: 0 });
    const nextFail = belaHandAward({ card: [60, 102], decl: [0, 0], bela: [0, 0], callerTeam: 0, hanging: 81, rules });
    expect(nextFail.awarded).toEqual([0, 243]);
  });

  it("P-12 alternativa: jednako je pad", () => {
    const r = belaHandAward({ card: [81, 81], decl: [0, 0], bela: [0, 0], callerTeam: 1, hanging: 0, rules: createBelaRules({ tieRule: "fail" }) });
    expect(r).toEqual({ outcome: "fail", awarded: [162, 0], hanging: 0 });
  });

  it("P-14 alternativa: bodovi podijeljeni sa 10", () => {
    const r = belaHandAward({ card: [96, 66], decl: [0, 0], bela: [0, 0], callerTeam: 0, hanging: 0, rules: createBelaRules({ pointsDivisor: 10 }) });
    expect(r.awarded).toEqual([10, 7]);
  });

  it("P-16/P-17: pobjednik meča", () => {
    const rules = createBelaRules({ targetScore: 1001 });
    expect(belaMatchWinner([900, 1000], 0, rules)).toBeNull();
    expect(belaMatchWinner([1001, 900], 1, rules)).toBe(0);
    expect(belaMatchWinner([1010, 1100], 0, rules)).toBe(0);
    expect(belaMatchWinner([1010, 1100], 0, createBelaRules({ bothOverTarget: "higher" }))).toBe(1);
  });

  it("meč se završava kad tim pređe cilj; plasman po timu", () => {
    let s = createBelaMatch({ roomId: "r", matchId: "m", playerIds: IDS, rules: createBelaRules({ targetScore: 501 }), rng: makeLcg(3) });
    const rng = makeLcg(4);
    let guard = 0;
    while (s.phase !== "match_finished" && guard++ < 100) {
      s = playOut(s);
      if (s.phase === "hand_complete") s = startBelaHand(s, rng);
    }
    expect(s.phase).toBe("match_finished");
    const winner = s.placements.find((p) => p.place === 1)!.team;
    expect(s.scores[winner]).toBeGreaterThanOrEqual(501);
    expect(s.placements.filter((p) => p.place === 1).map((p) => p.team)).toEqual([winner, winner]);
    expect(() => startBelaHand(s, rng)).toThrow("INVALID_GAME_PHASE");
  });

  it("server prekida meč", () => {
    const s = finishBelaMatchEarly(match());
    expect(s.phase).toBe("abandoned");
    expect(s.currentPlayerId).toBeNull();
  });
});

// ---- vidljivost zvanja i bele (prijava 20261124-091237) ----

describe("bela pogled: zvanja i bela", () => {
  it("canDeclare: svi u prvom štihu do svoje prve karte, bez obzira na potez", () => {
    let s = match({ deck: deckFor("d", DECL_DEAL) });
    expect(getBelaView(s, "a").canDeclare).toBe(false);
    s = applyBelaAction(s, "a", { type: "call", suit: "hearts" });
    expect(s.currentPlayerId).toBe("a");
    expect(getBelaView(s, "b").canDeclare).toBe(true);
    expect(getBelaView(s, "a").canDeclare).toBe(true);
    s = applyBelaAction(s, "a", getBelaAutoAction(s, "a")!);
    expect(getBelaView(s, "a").canDeclare).toBe(false);
    expect(getBelaView(s, "a").myDeclarations).toEqual([]);
    expect(getBelaView(s, "b").canDeclare).toBe(true);
  });

  it("declare poslije prve karte se ne uzima u obzir", () => {
    let s = match({ deck: deckFor("d", DECL_DEAL) });
    s = applyBelaAction(s, "a", { type: "call", suit: "hearts" });
    for (let i = 0; i < 4; i++) s = applyBelaAction(s, s.currentPlayerId!, getBelaAutoAction(s, s.currentPlayerId!)!);
    while (s.currentPlayerId !== "a") s = applyBelaAction(s, s.currentPlayerId!, getBelaAutoAction(s, s.currentPlayerId!)!);
    const auto = getBelaAutoAction(s, "a")!;
    s = applyBelaAction(s, "a", { ...auto, declare: false } as typeof auto);
    expect(s.seats[0]!.declared!.map((d) => d.points)).toEqual([50]);
  });

  it("myBela: holding → scored, samo za vlasnika", () => {
    let s = match({ deck: deckFor("d", { b: [H("K"), H("Q")] }) });
    expect(getBelaView(s, "b").myBela).toBeNull();
    s = applyBelaAction(s, "a", { type: "call", suit: "hearts" });
    expect(getBelaView(s, "b").myBela).toBe("holding");
    for (const id of ["a", "c", "d"]) expect(getBelaView(s, id).myBela).toBeNull();
    while (s.phase === "playing" && !s.belaBy) s = applyBelaAction(s, s.currentPlayerId!, getBelaAutoAction(s, s.currentPlayerId!)!);
    expect(getBelaView(s, "b").myBela).toBe("scored");
    expect(getBelaView(s, "a").myBela).toBeNull();
  });

  it("myBela: K i O razdvojeni — niko", () => {
    let s = match({ deck: deckFor("d", { b: [H("K")], c: [H("Q")] }) });
    s = applyBelaAction(s, "a", { type: "call", suit: "hearts" });
    for (const id of IDS) expect(getBelaView(s, id).myBela).toBeNull();
  });

  it("bela u adutskom nizu: broji se i niz i bela", () => {
    let s = match({ deck: deckFor("d", { b: [H("Q"), H("K"), H("A")] }) });
    s = applyBelaAction(s, "a", { type: "call", suit: "hearts" });
    s = playOut(s);
    expect(s.seats[1]!.declared!.some((d) => d.kind === "sequence" && d.cards.some((x) => x.id === "hearts-K"))).toBe(true);
    expect(s.lastHand!.teams[1]!.belaPoints).toBe(20);
  });

  it("P-11 pad: bela tima koji je zvao ide protivniku", () => {
    const r = belaHandAward({ card: [60, 102], decl: [0, 0], bela: [20, 0], callerTeam: 0, hanging: 0, rules: createBelaRules() });
    expect(r).toEqual({ outcome: "fail", awarded: [0, 182], hanging: 0 });
  });
});

// ---- istek roka ----

describe("bela auto-potez (istek roka)", () => {
  it("zvanje: „”; kod musa boja s najviše bodova", () => {
    let s = match({ deck: deckFor("d", { d: [C("J"), C("9"), C("A"), S("7"), D("7"), H("7")] }) });
    expect(getBelaAutoAction(s, "a")).toEqual({ type: "call", suit: null });
    for (const id of ["a", "b", "c"]) s = applyBelaAction(s, id, { type: "call", suit: null });
    expect(getBelaAutoAction(s, "d")).toEqual({ type: "call", suit: "clubs" });
  });

  it("štih: dozvoljena karta, uz prijavu zvanja; null kad nije na potezu", () => {
    let s = match();
    s = applyBelaAction(s, "a", { type: "call", suit: "hearts" });
    const a = getBelaAutoAction(s, "a")!;
    expect(a).toMatchObject({ type: "play", declare: true });
    expect(getBelaAutoAction(s, "b")).toBeNull();
  });
});
