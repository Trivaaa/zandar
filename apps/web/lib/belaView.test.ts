import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { BelaHandResult, BelaTeamHand, BelaTrick, Card, Rank, Suit } from "@zandar/shared-types";

import {
  belaHandRows,
  belaHandTable,
  belaOutcome,
  belaOutcomeSentence,
  belaPhaseLabel,
  belaPlayHint,
  belaScoreTable,
  belaSeatCaption,
  declarationLabel,
  declarationsLine,
  progressPercent,
  sortBelaHand,
  teamPair,
} from "./belaView";

const c = (rank: Rank, suit: Suit): Card => ({ id: `${suit}-${rank}`, rank, suit });
const ids = (cards: Card[]) => cards.map((x) => x.id);

function trick(plays: Array<[string, Card]>, winnerId: string | null = null): BelaTrick {
  return { leaderId: plays[0]?.[0] ?? "a", plays: plays.map(([playerId, card]) => ({ playerId, card })), winnerId };
}

function team(t: 0 | 1, x: Partial<BelaTeamHand> = {}): BelaTeamHand {
  return { team: t, tricks: 4, cardPoints: 81, declarationPoints: 0, belaPoints: 0, awarded: 81, scoreBefore: 0, scoreAfter: 81, ...x };
}

function hand(x: Partial<BelaHandResult> = {}): BelaHandResult {
  return {
    dealNo: 6,
    dealerId: "m",
    trumpSuit: "hearts",
    callerId: "a",
    callerTeam: 0,
    forced: false,
    outcome: "pass",
    stiglja: null,
    teams: [team(0), team(1)],
    belaBy: null,
    declarations: [],
    hangingAfter: 0,
    ...x,
  };
}

describe("belaView: ruka", () => {
  test("sortiranje: adut prvi po jačini aduta (U, IX, A…), ostale boje po jačini van aduta", () => {
    const cards = [c("A", "clubs"), c("9", "hearts"), c("10", "spades"), c("J", "hearts"), c("K", "clubs"), c("A", "hearts")];
    assert.deepEqual(ids(sortBelaHand(cards, "hearts")), [
      "hearts-J",
      "hearts-9",
      "hearts-A",
      "clubs-A",
      "clubs-K",
      "spades-10",
    ]);
    // Prije zvanja: samo po boji, van-adut red.
    assert.deepEqual(ids(sortBelaHand([c("J", "hearts"), c("A", "hearts")], null)), ["hearts-A", "hearts-J"]);
  });

  test("dva reda: gornji ima kartu više; do 4 karte jedan red", () => {
    assert.deepEqual(belaHandRows([1, 2, 3, 4, 5, 6, 7, 8]), [[1, 2, 3, 4], [5, 6, 7, 8]]);
    assert.deepEqual(belaHandRows([1, 2, 3, 4, 5, 6, 7]), [[1, 2, 3, 4], [5, 6, 7]]);
    assert.deepEqual(belaHandRows([1, 2, 3, 4, 5, 6]), [[1, 2, 3], [4, 5, 6]]);
    assert.deepEqual(belaHandRows([1, 2, 3]), [[], [1, 2, 3]]);
  });

  test("rezultat iz ugla gledaoca: naš : njihov", () => {
    assert.deepEqual(teamPair([312, 260], 1), [260, 312]);
    assert.deepEqual(teamPair([312, 260], 0), [312, 260]);
    assert.deepEqual(teamPair([312, 260], null), [312, 260]);
  });
});

describe("belaView: faza i traka poteza", () => {
  test("natpis faze", () => {
    assert.equal(belaPhaseLabel({ phase: "playing", step: "calling", tricks: [] }), "Zvanje aduta");
    assert.equal(belaPhaseLabel({ phase: "playing", step: "tricks", tricks: [trick([])] }), "Štih 1 od 8");
    const done = trick([["a", c("A", "clubs")]], "a");
    assert.equal(belaPhaseLabel({ phase: "playing", step: "tricks", tricks: [done, done, trick([])] }), "Štih 3 od 8");
    assert.equal(belaPhaseLabel({ phase: "hand_complete", step: "tricks", tricks: [] }), "Kraj ruke");
  });

  const mine = [c("J", "hearts"), c("Q", "clubs"), c("K", "clubs"), c("A", "clubs"), c("10", "spades")];

  test("moraš ići jače: samo jedna karta — imenuje je", () => {
    const hint = belaPlayHint({
      tricks: [trick([["t", c("8", "clubs")], ["i", c("10", "clubs")]])],
      myCards: mine,
      trumpSuit: "hearts",
      legalCardIds: ["clubs-A"],
    });
    assert.equal(hint, "Tvoj red · moraš ići jače: A ♣".replace("A ♣", hint.split(": ")[1]!));
    assert.ok(hint.startsWith("Tvoj red · moraš ići jače: "));
  });

  test("odgovori na boju kad su sve karte boje dozvoljene", () => {
    const hint = belaPlayHint({
      tricks: [trick([["t", c("A", "clubs")]])],
      myCards: mine,
      trumpSuit: "hearts",
      legalCardIds: ["clubs-Q", "clubs-K"],
    });
    assert.equal(hint, "Tvoj red · moraš ići jače");
    const all = belaPlayHint({
      tricks: [trick([["t", c("7", "clubs")]])],
      myCards: mine,
      trumpSuit: "hearts",
      legalCardIds: ["clubs-Q", "clubs-K", "clubs-A"],
    });
    assert.ok(all.startsWith("Tvoj red · odgovori na boju: žir"));
  });

  test("nema boje: adut; nema ni aduta: bilo koja; otvaranje: bilo koja", () => {
    const trumpHint = belaPlayHint({
      tricks: [trick([["t", c("A", "diamonds")]])],
      myCards: mine,
      trumpSuit: "hearts",
      legalCardIds: ["hearts-J"],
    });
    assert.ok(trumpHint.startsWith("Tvoj red · nemaš boju, baci adut srce"));
    const any = belaPlayHint({
      tricks: [trick([["t", c("A", "diamonds")]])],
      myCards: [c("10", "spades"), c("A", "clubs")],
      trumpSuit: "hearts",
      legalCardIds: ["spades-10", "clubs-A"],
    });
    assert.equal(any, "Tvoj red · nemaš ni boju ni adut");
    assert.equal(
      belaPlayHint({ tricks: [trick([])], myCards: mine, trumpSuit: "hearts", legalCardIds: ids(mine) }),
      "Tvoj red · igraj bilo koju kartu",
    );
  });
});

describe("belaView: zvanja i natpisi", () => {
  test("zvanja riječima", () => {
    assert.equal(
      declarationLabel({ kind: "sequence", points: 20, cards: [c("Q", "clubs"), c("K", "clubs"), c("A", "clubs")] }),
      "Terca u žiru · 20",
    );
    assert.equal(
      declarationLabel({
        kind: "sequence",
        points: 50,
        cards: [c("7", "diamonds"), c("8", "diamonds"), c("9", "diamonds"), c("10", "diamonds")],
      }),
      "Kvarta u tikvi · 50",
    );
    assert.equal(
      declarationLabel({ kind: "four", points: 200, cards: ["hearts", "clubs", "spades", "diamonds"].map((s) => c("J", s as Suit)) }),
      "Četiri U · 200",
    );
    assert.deepEqual(
      declarationsLine([
        { kind: "sequence", points: 20, cards: [c("Q", "clubs"), c("K", "clubs"), c("A", "clubs")] },
        { kind: "four", points: 100, cards: ["hearts", "clubs", "spades", "diamonds"].map((s) => c("A", s as Suit)) },
      ]),
      { label: "Terca u žiru · 20 + Četiri asa · 100", points: 120 },
    );
    assert.equal(declarationsLine([]), null);
  });

  test("natpis iznad avatara: zvanje aduta, pa prijava u prvom štihu", () => {
    const calling = { phase: "playing" as const, step: "calling" as const, tricks: [] };
    assert.equal(belaSeatCaption(calling, { call: "pass", declaredPoints: null }), "Dalje");
    assert.equal(belaSeatCaption(calling, { call: "hearts", declaredPoints: null }), "Srce ♥");
    assert.equal(belaSeatCaption(calling, { call: null, declaredPoints: null }), null);
    const first = { phase: "playing" as const, step: "tricks" as const, tricks: [trick([["i", c("10", "clubs")]])] };
    assert.equal(belaSeatCaption(first, { call: null, declaredPoints: 50 }), "Zove 50");
    assert.equal(belaSeatCaption(first, { call: null, declaredPoints: 0 }), "Bez zvanja");
    const later = { ...first, tricks: [trick([["i", c("10", "clubs")]], "i"), trick([])] };
    assert.equal(belaSeatCaption(later, { call: null, declaredPoints: 50 }), null);
  });
});

describe("belaView: kraj ruke i tabela", () => {
  test("pad tima koji je zvao: za njih „Pad” (loše), rečenica i tabela", () => {
    const r = hand({
      outcome: "fail",
      callerTeam: 0,
      teams: [
        team(0, { cardPoints: 96, awarded: 0 }),
        team(1, { cardPoints: 66, declarationPoints: 50, belaPoints: 20, awarded: 232 }),
      ],
    });
    assert.deepEqual(belaOutcome(r, 0), { label: "Pad", tone: "bad" });
    assert.deepEqual(belaOutcome(r, 1), { label: "Pad", tone: "good" });
    assert.equal(belaOutcomeSentence(r, 0), "Zvali smo mi: 96 od 232. Treba više od pola, pa sve ide njima.");
    const rows = belaHandTable(r, 0);
    assert.deepEqual(rows.map((x) => [x.label, x.mine, x.theirs]), [
      ["Karte", "96", "66"],
      ["Zvanja", "—", "50"],
      ["Bela", "—", "20"],
      ["Ukupno", "96", "136"],
      ["Upisuje se", "0", "232"],
    ]);
  });

  test("štiglja, visi i nova podjela", () => {
    assert.deepEqual(belaOutcome(hand({ stiglja: 1 }), 1), { label: "Štiglja", tone: "good" });
    assert.deepEqual(belaOutcome(hand({ outcome: "hang" }), 0), { label: "Visi", tone: "neutral" });
    assert.deepEqual(belaOutcome(hand({ outcome: "redeal", teams: [] }), 0).label, "Nova podjela");
    assert.deepEqual(belaHandTable(hand({ outcome: "redeal", teams: [] }), 0), []);
  });

  test("tabela meča iz ugla gledaoca, sa oznakama", () => {
    const rows = belaScoreTable(
      [
        hand({ dealNo: 1, teams: [team(0, { awarded: 112 }), team(1, { awarded: 50 })] }),
        hand({ dealNo: 2, outcome: "fail", teams: [team(0, { awarded: 0 }), team(1, { awarded: 202 })] }),
        hand({ dealNo: 3, outcome: "hang", teams: [team(0, { awarded: 0 }), team(1, { awarded: 81 })] }),
      ],
      1,
    );
    assert.deepEqual(rows, [
      { dealNo: 1, mine: 50, theirs: 112, tag: null },
      { dealNo: 2, mine: 202, theirs: 0, tag: "pad" },
      { dealNo: 3, mine: 81, theirs: 0, tag: "visi" },
    ]);
    assert.equal(progressPercent(431, 1001), 43);
    assert.equal(progressPercent(1200, 1001), 100);
  });
});
