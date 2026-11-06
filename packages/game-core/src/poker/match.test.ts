import { describe, it, expect } from "vitest";
import type {
  Card,
  PokerActionRequest,
  PokerGameState,
  PokerSeatStatus,
  Rank,
  Suit,
} from "@zandar/shared-types";
import { createDeck } from "../deck";
import { createSeededRandom } from "../shuffle";
import { getPokerLegalActions } from "./betting";
import {
  applyPokerAction,
  createPokerMatch,
  isPokerMatchFinished,
  leavePokerMatch,
  pokerTotalChips,
  setPokerSeatStatus,
  startPokerHand,
} from "./match";
import { getPokerAutoAction, getPokerView } from "./view";

const SUIT: Record<string, Suit> = { c: "clubs", d: "diamonds", h: "hearts", s: "spades" };

function cards(spec: string): Card[] {
  if (!spec.trim()) return [];
  return spec
    .trim()
    .split(/\s+/)
    .map((t) => {
      const rank = t.slice(0, -1) as Rank;
      const suit = SUIT[t.slice(-1)]!;
      return { id: `${suit}-${rank}`, suit, rank };
    });
}

/**
 * Špil za ruku: `holes[i]` su karte igrača p{i}; dijeli se od prvog lijevo
 * od buttona, po jedna u dva kruga, pa board. Ostatak špila iza.
 */
function deckFor(
  n: number,
  button: number,
  holes: Record<number, string>,
  board: string,
  skip: number[] = [],
): Card[] {
  const order: number[] = [];
  for (let k = 1; k <= n; k++) {
    const i = (button + k) % n;
    if (!skip.includes(i)) order.push(i);
  }
  const top: Card[] = [];
  for (let round = 0; round < 2; round++) {
    for (const i of order) top.push(cards(holes[i]!)[round]!);
  }
  top.push(...cards(board));
  const used = new Set(top.map((c) => c.id));
  return [...top, ...createDeck().filter((c) => !used.has(c.id))];
}

const rng = createSeededRandom(7);

/** Ruka sa zadatim stackovima, buttonom i špilom (igrači p0..pN-1 na mjestima 0..N-1). */
function makeHand(opts: {
  stacks: number[];
  button: number;
  deck?: Card[];
  statuses?: Partial<Record<number, PokerSeatStatus>>;
  handNo?: number;
  handsPerLevel?: number;
}): PokerGameState {
  const n = opts.stacks.length;
  const base = createPokerMatch({
    roomId: "r1",
    matchId: "m1",
    playerIds: Array.from({ length: n }, (_, i) => `p${i}`),
    rng,
    fixedSeating: true,
    initialButtonSeat: 0,
    config: opts.handsPerLevel ? { handsPerLevel: opts.handsPerLevel } : undefined,
  });
  const s: PokerGameState = structuredClone(base);
  s.phase = "hand_complete";
  s.handNo = opts.handNo ?? 0;
  s.buttonSeat = (opts.button - 1 + n) % n;
  s.seats.forEach((seat, i) => {
    seat.stack = opts.stacks[i]!;
    seat.streetBet = 0;
    seat.totalBet = 0;
    seat.status = opts.statuses?.[i] ?? "active";
  });
  return startPokerHand(s, rng, { deck: opts.deck });
}

function act(state: PokerGameState, req: PokerActionRequest | PokerActionRequest["type"]) {
  const r = typeof req === "string" ? { type: req } : req;
  return applyPokerAction(state, state.currentPlayerId!, r);
}

const seat = (s: PokerGameState, i: number) => s.seats[i]!;

describe("poker — tok ruke i pozicije", () => {
  it("novi meč: 100 žetona svima, blindovi 1/2, po 2 karte", () => {
    const s = createPokerMatch({ roomId: "r", matchId: "m", playerIds: ["a", "b", "c", "d"], rng });
    expect(s.handNo).toBe(1);
    expect(s.smallBlind).toBe(1);
    expect(s.bigBlind).toBe(2);
    expect(s.seats.every((x) => x.holeCards.length === 2)).toBe(true);
    expect(s.deck.length).toBe(52 - 8);
    expect(pokerTotalChips(s)).toBe(400);
    expect(new Set(s.seats.map((x) => x.playerId))).toEqual(new Set(["a", "b", "c", "d"]));
  });

  it("4 igrača: SB i BB lijevo od buttona, prvi igra lijevo od BB", () => {
    const s = makeHand({ stacks: [100, 100, 100, 100], button: 0 });
    expect([s.buttonSeat, s.smallBlindSeat, s.bigBlindSeat]).toEqual([0, 1, 2]);
    expect(seat(s, 1).streetBet).toBe(1);
    expect(seat(s, 2).streetBet).toBe(2);
    expect(s.currentPlayerId).toBe("p3");
  });

  it("3 igrača: button igra prvi preflop", () => {
    const s = makeHand({ stacks: [100, 100, 100], button: 0 });
    expect(s.currentPlayerId).toBe("p0");
  });

  it("heads-up: button je SB i igra prvi preflop, postflop prvi igra BB", () => {
    let s = makeHand({ stacks: [100, 100], button: 0 });
    expect(s.smallBlindSeat).toBe(0);
    expect(s.bigBlindSeat).toBe(1);
    expect(s.currentPlayerId).toBe("p0");
    s = act(s, "call");
    expect(s.currentPlayerId).toBe("p1"); // BB ima opciju
    expect(getPokerLegalActions(s, "p1")!.canCheck).toBe(true);
    s = act(s, "check");
    expect(s.street).toBe("flop");
    expect(s.board.length).toBe(3);
    expect(s.currentPlayerId).toBe("p1");
  });

  it("BB ima opciju: može raise kad svi samo izjednače", () => {
    let s = makeHand({ stacks: [100, 100, 100], button: 0 });
    s = act(s, "call"); // p0
    s = act(s, "call"); // p1 SB
    expect(s.currentPlayerId).toBe("p2");
    const legal = getPokerLegalActions(s, "p2")!;
    expect(legal.canCheck).toBe(true);
    expect(legal.canRaise).toBe(true);
    expect(legal.minTo).toBe(4);
  });

  it("button se pomjera svaku ruku", () => {
    let s = makeHand({ stacks: [100, 100, 100], button: 0 });
    s = act(s, "fold");
    s = act(s, "fold");
    expect(s.phase).toBe("hand_complete");
    s = startPokerHand(s, rng);
    expect(s.buttonSeat).toBe(1);
    expect(s.smallBlindSeat).toBe(2);
    expect(s.bigBlindSeat).toBe(0);
  });

  it("button preskače bankrotiranog; heads-up pravila poslije eliminacije", () => {
    const s = makeHand({ stacks: [100, 0, 100], button: 1, statuses: { 1: "bankrupt" } });
    // Prethodni button je bio 0 → sljedeći živ je p2.
    expect(s.buttonSeat).toBe(2);
    expect(s.smallBlindSeat).toBe(2);
    expect(s.bigBlindSeat).toBe(0);
    expect(s.currentPlayerId).toBe("p2");
    expect(seat(s, 1).inHand).toBe(false);
    expect(seat(s, 1).holeCards).toEqual([]);
  });

  it("nivo blindova raste na početku ruke", () => {
    let s = makeHand({ stacks: [100, 100, 100], button: 0, handsPerLevel: 1 });
    expect(s.bigBlind).toBe(2);
    s = act(s, "fold");
    s = act(s, "fold");
    s = startPokerHand(s, rng);
    expect(s.handNo).toBe(2);
    expect(s.blindLevel).toBe(2);
    expect([s.smallBlind, s.bigBlind]).toEqual([2, 4]);
  });

  it("igrač s manje od blinda postavlja all-in za koliko ima", () => {
    const s = makeHand({ stacks: [100, 1, 100], button: 0 });
    expect(seat(s, 1).streetBet).toBe(1);
    expect(seat(s, 1).allIn).toBe(true);
    const bbShort = makeHand({ stacks: [100, 100, 1], button: 0 });
    expect(seat(bbShort, 2).allIn).toBe(true);
    // Za poziv se i dalje traži puni big blind.
    expect(getPokerLegalActions(bbShort, "p0")!.callAmount).toBe(2);
  });

  it("nova ruka se ne može pokrenuti usred ruke", () => {
    const s = makeHand({ stacks: [100, 100], button: 0 });
    expect(() => startPokerHand(s, rng)).toThrow("INVALID_GAME_PHASE");
  });
});

describe("poker — akcije i minimalni raise", () => {
  it("minimalni bet je big blind; minimalni raise je zadnje povećanje", () => {
    let s = makeHand({ stacks: [100, 100, 100, 100], button: 0 });
    s = act(s, { type: "raise", amount: 6 }); // p3: +4
    expect(s.minRaise).toBe(4);
    expect(getPokerLegalActions(s, "p0")!.minTo).toBe(10);
    expect(() => act(s, { type: "raise", amount: 8 })).toThrow("INVALID_AMOUNT");
    s = act(s, { type: "raise", amount: 15 }); // p0: +9
    expect(s.minRaise).toBe(9);
    expect(getPokerLegalActions(s, "p1")!.minTo).toBe(24);
  });

  it("postflop: bet ispod big blinda nije dozvoljen", () => {
    let s = makeHand({ stacks: [100, 100], button: 0 });
    s = act(s, "call");
    s = act(s, "check");
    const legal = getPokerLegalActions(s, "p1")!;
    expect(legal.canBet).toBe(true);
    expect(legal.minTo).toBe(2);
    expect(() => act(s, { type: "bet", amount: 1 })).toThrow("INVALID_AMOUNT");
    s = act(s, { type: "bet", amount: 2 });
    expect(s.currentBet).toBe(2);
  });

  it("raise do cijelog stacka je all-in, više od stacka nije dozvoljeno", () => {
    let s = makeHand({ stacks: [100, 100], button: 0 });
    expect(() => act(s, { type: "raise", amount: 101 })).toThrow("INVALID_AMOUNT");
    s = act(s, { type: "raise", amount: 100 });
    expect(seat(s, 0).allIn).toBe(true);
    expect(seat(s, 0).lastAction).toEqual({ type: "allin", amount: 100 });
  });

  it("all-in ispod minimalnog raisea je dozvoljen", () => {
    let s = makeHand({ stacks: [100, 100, 7], button: 0 });
    s = act(s, { type: "raise", amount: 6 }); // p0 raise +4 → min do 10
    s = act(s, "fold"); // p1
    // p2 (BB) ima ukupno 7 → all-in do 7 je ispod minimuma 10, ali dozvoljen.
    expect(getPokerLegalActions(s, "p2")!.minTo).toBe(7);
    s = act(s, "allin");
    expect(seat(s, 2).streetBet).toBe(7);
    expect(s.currentBet).toBe(7);
  });

  it("kratki all-in ne otvara ponovo betovanje onima koji su već odigrali", () => {
    let s = makeHand({ stacks: [100, 14, 100], button: 0 });
    s = act(s, { type: "raise", amount: 10 }); // p0: +8
    s = act(s, "allin"); // p1 SB: do 14 (+4 < 8) — kratak
    expect(s.currentBet).toBe(14);
    expect(s.fullRaiseCount).toBe(1);
    // p2 (BB) još nije odigrao → smije raise, minimum 14 + 8.
    const bb = getPokerLegalActions(s, "p2")!;
    expect(bb.canRaise).toBe(true);
    expect(bb.minTo).toBe(22);
    s = act(s, "call");
    // p0 je već odigrao → samo call ili fold.
    const p0 = getPokerLegalActions(s, "p0")!;
    expect(p0.canRaise).toBe(false);
    expect(p0.callAmount).toBe(4);
    expect(() => act(s, { type: "raise", amount: 30 })).toThrow("ILLEGAL_ACTION");
    expect(() => act(s, "allin")).toThrow("ILLEGAL_ACTION");
    s = act(s, "call");
    expect(s.street).toBe("flop");
    expect(s.currentPlayerId).toBe("p2"); // p1 je all-in, preskače se
  });

  it("puni raise poslije kratkog all-ina ponovo otvara betovanje", () => {
    let s = makeHand({ stacks: [100, 14, 100], button: 0 });
    s = act(s, { type: "raise", amount: 10 });
    s = act(s, "allin");
    s = act(s, { type: "raise", amount: 22 }); // p2: puni raise
    expect(getPokerLegalActions(s, "p0")!.canRaise).toBe(true);
  });

  it("check nije dozvoljen kad treba platiti", () => {
    const s = makeHand({ stacks: [100, 100, 100], button: 0 });
    expect(() => act(s, "check")).toThrow("ILLEGAL_ACTION");
  });

  it("greške: tuđi potez i zastarjelo stanje", () => {
    const s = makeHand({ stacks: [100, 100, 100], button: 0 });
    expect(() => applyPokerAction(s, "p1", { type: "fold" })).toThrow("NOT_YOUR_TURN");
    expect(() =>
      applyPokerAction(s, "p0", { type: "fold", clientKnownStateVersion: s.stateVersion - 1 }),
    ).toThrow("STALE_STATE");
  });

  it("akcija ne mijenja ulazno stanje", () => {
    const s = makeHand({ stacks: [100, 100, 100], button: 0 });
    const before = JSON.stringify(s);
    act(s, { type: "raise", amount: 10 });
    expect(JSON.stringify(s)).toBe(before);
  });

  it("raise je zabranjen kad niko drugi ne može odgovoriti", () => {
    let s = makeHand({ stacks: [100, 50, 100], button: 0 });
    s = act(s, "fold"); // p0
    s = act(s, "allin"); // p1 do 50
    const bb = getPokerLegalActions(s, "p2")!;
    expect(bb.canRaise).toBe(false);
    expect(bb.canCall).toBe(true);
  });
});

describe("poker — kraj ruke i isplata", () => {
  it("svi osim jednog foldaju: pot bez otkrivanja karata", () => {
    let s = makeHand({ stacks: [100, 100, 100], button: 0 });
    s = act(s, "fold");
    s = act(s, "fold");
    expect(s.phase).toBe("hand_complete");
    expect(s.lastHandResult!.uncontested).toBe(true);
    expect(s.lastHandResult!.showdown).toEqual([]);
    expect(seat(s, 1).stack).toBe(99);
    expect(seat(s, 2).stack).toBe(101);
    expect(pokerTotalChips(s)).toBe(300);
  });

  it("svi all-in preflop: board se dijeli do kraja, ruke se otkrivaju", () => {
    const deck = deckFor(2, 0, { 0: "Ac Ad", 1: "Kc Kd" }, "2h 7s 9d 3c 4h");
    let s = makeHand({ stacks: [100, 100], button: 0, deck });
    s = act(s, "allin");
    s = act(s, "call");
    expect(s.board.length).toBe(5);
    const r = s.lastHandResult!;
    expect(r.allInRunout).toBe(true);
    expect(r.showdown.map((h) => h.playerId).sort()).toEqual(["p0", "p1"]);
    expect(r.showdown.find((h) => h.playerId === "p0")!.category).toBe("pair");
    expect(seat(s, 0).stack).toBe(200);
    expect(seat(s, 1).status).toBe("bankrupt");
    expect(s.phase).toBe("match_finished");
    expect(s.placements).toEqual([
      { playerId: "p1", place: 2 },
      { playerId: "p0", place: 1 },
    ]);
  });

  it("showdown na riveru: pobjeđuje najbolja kombinacija", () => {
    const deck = deckFor(2, 0, { 0: "2c 7d", 1: "Kh Ks" }, "Kd 9s 4h 3c Jd");
    let s = makeHand({ stacks: [100, 100], button: 0, deck });
    s = act(s, "call");
    s = act(s, "check");
    for (let i = 0; i < 3; i++) {
      s = act(s, "check");
      s = act(s, "check");
    }
    expect(s.phase).toBe("hand_complete");
    expect(s.lastHandResult!.allInRunout).toBe(false);
    expect(s.lastHandResult!.showdown.find((h) => h.playerId === "p1")!.category).toBe(
      "three_of_a_kind",
    );
    expect(seat(s, 1).stack).toBe(102);
    expect(seat(s, 0).stack).toBe(98);
  });

  it("podijeljen pot: neparan žeton ide prvom lijevo od buttona", () => {
    const deck = deckFor(3, 0, { 0: "2c 3d", 1: "4c 5d", 2: "2d 3c" }, "Ah Kh Qh Jh 10h");
    let s = makeHand({ stacks: [100, 100, 100], button: 0, deck });
    s = act(s, "call"); // p0
    s = act(s, "fold"); // p1 (SB, 1 ostaje u potu)
    s = act(s, "check"); // p2
    for (let i = 0; i < 3; i++) {
      s = act(s, "check");
      s = act(s, "check");
    }
    // Pot 5 = 2 + 2 + 1. Lijevo od buttona: p1 (foldao), p2, p0 → p2 dobija višak.
    const awards = s.lastHandResult!.awards;
    expect(awards).toEqual([
      { potIndex: 0, playerId: "p2", amount: 3 },
      { potIndex: 0, playerId: "p0", amount: 2 },
    ]);
    expect(pokerTotalChips(s)).toBe(300);
  });

  it("side pot: kratki stack osvaja glavni, drugi osvaja side pot", () => {
    const deck = deckFor(3, 0, { 0: "Kc Kd", 1: "Ac Ad", 2: "7c 2d" }, "3h 8s 9d Jc 4h");
    let s = makeHand({ stacks: [100, 20, 100], button: 0, deck });
    s = act(s, { type: "raise", amount: 50 }); // p0
    s = act(s, "allin"); // p1 do 20 (call, kratko)
    s = act(s, "call"); // p2 do 50
    for (let i = 0; i < 3; i++) {
      s = act(s, "check");
      s = act(s, "check");
    }
    const r = s.lastHandResult!;
    expect(r.pots.map((p) => p.amount)).toEqual([60, 60]);
    expect(seat(s, 1).stack).toBe(60);
    expect(seat(s, 0).stack).toBe(110);
    expect(seat(s, 2).stack).toBe(50);
    expect(pokerTotalChips(s)).toBe(220);
  });
});

describe("poker — bankrot, plasman i kraj meča", () => {
  it("dva bankrota u istoj ruci: bolji plasman ima ko je imao više žetona", () => {
    const deck = deckFor(3, 0, { 0: "Ac Ad", 1: "7c 2d", 2: "8h 3s" }, "Kh Qs 9d 5c 4h");
    let s = makeHand({ stacks: [100, 10, 20], button: 0, deck });
    s = act(s, "allin"); // p0
    s = act(s, "call"); // p1 all-in 10
    s = act(s, "call"); // p2 all-in 20
    expect(seat(s, 2).place).toBe(2);
    expect(seat(s, 1).place).toBe(3);
    expect(seat(s, 0).place).toBe(1);
    expect(s.phase).toBe("match_finished");
    expect(isPokerMatchFinished(s)).toBe(true);
  });

  it("dva bankrota s jednakim stackom dijele plasman", () => {
    const deck = deckFor(3, 0, { 0: "Ac Ad", 1: "7c 2d", 2: "8h 3s" }, "Kh Qs 9d 5c 4h");
    let s = makeHand({ stacks: [100, 10, 10], button: 0, deck });
    s = act(s, "allin");
    s = act(s, "call");
    s = act(s, "call");
    expect(seat(s, 1).place).toBe(2);
    expect(seat(s, 2).place).toBe(2);
  });

  it("bankrot jednog od četiri: meč ide dalje", () => {
    const deck = deckFor(4, 0, { 0: "Ac Ad", 1: "7c 2d", 2: "8h 3s", 3: "9c 9h" }, "Kh Qs Jd 5c 4h");
    let s = makeHand({ stacks: [100, 100, 100, 10], button: 0, deck });
    s = act(s, "allin"); // p3 all-in 10
    s = act(s, "call"); // p0 call 10
    s = act(s, "fold"); // p1
    s = act(s, "fold"); // p2
    // Samo p0 još može ulagati → nema licitacije, board se dijeli do kraja.
    expect(s.phase).toBe("hand_complete");
    expect(s.board.length).toBe(5);
    expect(s.lastHandResult!.allInRunout).toBe(true);
    expect(seat(s, 3).status).toBe("bankrupt");
    expect(seat(s, 3).place).toBe(4);
    expect(s.phase).not.toBe("match_finished");
  });
});

describe("poker — napuštanje i sitting out", () => {
  it("napusti usred ruke: najlošiji plasman, žetoni izlaze, ulog ostaje u potu", () => {
    let s = makeHand({ stacks: [100, 100, 100], button: 0 });
    s = act(s, { type: "raise", amount: 10 }); // p0
    s = leavePokerMatch(s, "p0");
    expect(seat(s, 0).status).toBe("left");
    expect(seat(s, 0).place).toBe(3);
    expect(seat(s, 0).folded).toBe(true);
    expect(s.chipsRemoved).toBe(90);
    expect(pokerTotalChips(s)).toBe(300);
    expect(s.currentPlayerId).toBe("p1");
    s = act(s, "fold");
    // p2 osvaja pot uključujući 10 od p0.
    expect(seat(s, 2).stack).toBe(100 + 10 + 1);
    s = startPokerHand(s, rng);
    expect(seat(s, 0).inHand).toBe(false);
  });

  it("napusti dok je na potezu: igra ide na sljedećeg", () => {
    let s = makeHand({ stacks: [100, 100, 100, 100], button: 0 });
    expect(s.currentPlayerId).toBe("p3");
    s = leavePokerMatch(s, "p3");
    expect(s.currentPlayerId).toBe("p0");
  });

  it("kad ostane jedan igrač, meč je gotov", () => {
    let s = makeHand({ stacks: [100, 100], button: 0 });
    s = leavePokerMatch(s, "p1");
    expect(s.phase).toBe("match_finished");
    expect(seat(s, 0).place).toBe(1);
    expect(seat(s, 1).place).toBe(2);
    expect(pokerTotalChips(s)).toBe(200);
  });

  it("dvostruki izlazak se ignoriše", () => {
    let s = makeHand({ stacks: [100, 100, 100], button: 0 });
    s = leavePokerMatch(s, "p1");
    const again = leavePokerMatch(s, "p1");
    expect(again).toBe(s);
  });

  it("sitting out mijenja samo status; blindovi se i dalje plaćaju", () => {
    let s = makeHand({ stacks: [100, 100, 100], button: 0 });
    s = setPokerSeatStatus(s, "p1", "sitting_out");
    expect(seat(s, 1).status).toBe("sitting_out");
    s = act(s, "fold");
    s = act(s, "fold");
    s = startPokerHand(s, rng);
    // Button p1, SB p2, BB p0 — sitting out p1 je i dalje u ruci.
    expect(seat(s, 1).inHand).toBe(true);
  });

  it("auto akcija: check kad može, inače fold", () => {
    let s = makeHand({ stacks: [100, 100], button: 0 });
    expect(getPokerAutoAction(s, "p0")).toEqual({ type: "fold" });
    s = act(s, "call");
    expect(getPokerAutoAction(s, "p1")).toEqual({ type: "check" });
    expect(getPokerAutoAction(s, "p0")).toBeNull();
  });
});

describe("poker — pogled igrača (vidljivost podataka)", () => {
  it("igrač vidi samo svoje karte; nema špila ni tuđih karata", () => {
    const s = makeHand({ stacks: [100, 100, 100], button: 0 });
    const v = getPokerView(s, "p0");
    expect(v.myCards).toEqual(seat(s, 0).holeCards);
    expect(v.legal).not.toBeNull();
    expect(v.seats.every((x) => x.hasCards)).toBe(true);
    const json = JSON.stringify(v);
    expect(json).not.toContain('"deck"');
    expect(json).not.toContain("holeCards");
    for (const c of [...seat(s, 1).holeCards, ...seat(s, 2).holeCards, ...s.deck]) {
      expect(json).not.toContain(c.id);
    }
  });

  it("igrač koji nije na potezu nema `legal`; gledalac nema karte", () => {
    const s = makeHand({ stacks: [100, 100, 100], button: 0 });
    expect(getPokerView(s, "p1").legal).toBeNull();
    const spectator = getPokerView(s, "neko");
    expect(spectator.myCards).toEqual([]);
    expect(spectator.legal).toBeNull();
  });

  it("na showdownu se otkrivaju ruke onih koji su ostali", () => {
    const deck = deckFor(2, 0, { 0: "Ac Ad", 1: "Kc Kd" }, "2h 7s 9d 3c 4h");
    let s = makeHand({ stacks: [100, 100], button: 0, deck });
    s = act(s, "allin");
    s = act(s, "call");
    const v = getPokerView(s, "p0");
    const p1 = v.lastHandResult!.showdown.find((h) => h.playerId === "p1")!;
    expect(p1.holeCards.map((c) => c.id).sort()).toEqual(["clubs-K", "diamonds-K"]);
  });

  it("foldane karte se ne otkrivaju na showdownu", () => {
    const deck = deckFor(3, 0, { 0: "2c 3d", 1: "4c 5d", 2: "2d 3c" }, "Ah Kh Qh Jh 10h");
    let s = makeHand({ stacks: [100, 100, 100], button: 0, deck });
    s = act(s, "call");
    s = act(s, "fold");
    s = act(s, "check");
    for (let i = 0; i < 3; i++) {
      s = act(s, "check");
      s = act(s, "check");
    }
    const json = JSON.stringify(getPokerView(s, "p0"));
    expect(json).not.toContain("clubs-4");
    expect(json).not.toContain("diamonds-5");
  });

  it("indikator blindova: ruke do sljedećeg nivoa", () => {
    const s = makeHand({ stacks: [100, 100], button: 0, handNo: 3 });
    const v = getPokerView(s, "p0");
    expect(v.handNo).toBe(4);
    expect(v.handsUntilNextLevel).toBe(2);
    expect([v.nextSmallBlind, v.nextBigBlind]).toEqual([2, 4]);
  });
});

describe("poker — invarijanta žetona (nasumični mečevi)", () => {
  function randomAction(s: PokerGameState, r: () => number): PokerActionRequest {
    const legal = getPokerLegalActions(s, s.currentPlayerId!)!;
    const roll = r();
    if (roll < 0.12) return { type: "fold" };
    if (roll < 0.2 && (legal.canBet || legal.canRaise)) return { type: "allin" };
    if (roll < 0.45 && (legal.canBet || legal.canRaise)) {
      const span = legal.maxTo - legal.minTo;
      const amount = legal.minTo + Math.floor(r() * (span + 1));
      return { type: legal.canBet ? "bet" : "raise", amount };
    }
    return legal.canCheck ? { type: "check" } : { type: "call" };
  }

  it("500 mečeva: zbir žetona konstantan poslije svake akcije, svaki meč se završi", () => {
    const r = createSeededRandom(12345);
    for (let m = 0; m < 500; m++) {
      const n = 2 + (m % 3);
      const ids = Array.from({ length: n }, (_, i) => `p${i}`);
      let s = createPokerMatch({ roomId: "r", matchId: `m${m}`, playerIds: ids, rng: r });
      const total = n * 100;
      let guard = 0;
      while (!isPokerMatchFinished(s)) {
        if (++guard > 20000) throw new Error(`meč ${m} se ne završava`);
        if (s.phase === "hand_complete") {
          s = startPokerHand(s, r);
        } else if (r() < 0.002) {
          const alive = s.seats.filter((x) => x.status === "active");
          s = leavePokerMatch(s, alive[Math.floor(r() * alive.length)]!.playerId);
        } else {
          s = applyPokerAction(s, s.currentPlayerId!, randomAction(s, r));
        }
        expect(pokerTotalChips(s)).toBe(total);
        expect(s.seats.every((x) => x.stack >= 0)).toBe(true);
        if (s.phase === "betting") expect(s.currentPlayerId).not.toBeNull();
      }
      const places = s.placements.map((p) => p.place);
      expect(places).toContain(1);
      expect(s.placements.length).toBe(n);
    }
  });
});
