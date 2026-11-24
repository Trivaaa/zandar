import { describe, expect, it } from "vitest";
import type { Card, Rank, Suit } from "@zandar/shared-types";
import {
  BELA_CARD_POINTS,
  belaBeats,
  belaCardPoints,
  belaCheapestCard,
  belaTrickWinnerIndex,
  createBelaDeck,
} from "./cards";
import {
  compareDeclarations,
  findBelaDeclarations,
  resolveBelaDeclarations,
} from "./declarations";

const c = (suit: Suit, rank: Rank): Card => ({ id: `${suit}-${rank}`, suit, rank });
const H = (r: Rank) => c("hearts", r);
const S = (r: Rank) => c("spades", r);
const D = (r: Rank) => c("diamonds", r);
const C = (r: Rank) => c("clubs", r);

describe("bela karte", () => {
  it("špil ima 32 karte VII–A, bez duplikata", () => {
    const deck = createBelaDeck();
    expect(deck).toHaveLength(32);
    expect(new Set(deck.map((x) => x.id)).size).toBe(32);
    expect(deck.some((x) => x.rank === "6" || x.rank === "2")).toBe(false);
  });

  it("karte nose 152 boda za bilo koji adut (uz zadnji štih 162)", () => {
    for (const trump of ["hearts", "spades", "diamonds", "clubs"] as const) {
      const sum = createBelaDeck().reduce((s, x) => s + belaCardPoints(x, trump), 0);
      expect(sum).toBe(BELA_CARD_POINTS);
    }
  });

  it("bodovi: U aduta 20, IX aduta 14, U van aduta 2, IX van aduta 0", () => {
    expect(belaCardPoints(H("J"), "hearts")).toBe(20);
    expect(belaCardPoints(H("9"), "hearts")).toBe(14);
    expect(belaCardPoints(H("J"), "spades")).toBe(2);
    expect(belaCardPoints(H("9"), "spades")).toBe(0);
    expect(belaCardPoints(H("A"), "spades")).toBe(11);
  });

  it("jačina u adutu: U > IX > A > X > K > O > VIII > VII", () => {
    const order = ["J", "9", "A", "10", "K", "Q", "8", "7"] as Rank[];
    for (let i = 0; i < order.length - 1; i++) {
      expect(belaBeats(H(order[i]!), H(order[i + 1]!), "hearts", "hearts")).toBe(true);
    }
  });

  it("jačina van aduta: A > X > K > O > U > IX", () => {
    const order = ["A", "10", "K", "Q", "J", "9", "8", "7"] as Rank[];
    for (let i = 0; i < order.length - 1; i++) {
      expect(belaBeats(S(order[i]!), S(order[i + 1]!), "spades", "hearts")).toBe(true);
    }
  });

  it("štih: adut nosi, inače najjača tražene boje; tuđa boja ne nosi", () => {
    expect(belaTrickWinnerIndex([S("A"), S("10"), D("A"), H("7")], "hearts")).toBe(3);
    expect(belaTrickWinnerIndex([S("K"), S("A"), D("A"), C("A")], "hearts")).toBe(1);
    expect(belaTrickWinnerIndex([S("7"), D("A"), C("A"), S("8")], "hearts")).toBe(3);
  });

  it("najjeftinija karta: najmanje bodova, pa ne-adut", () => {
    expect(belaCheapestCard([H("7"), S("7"), S("A")], "hearts").id).toBe(S("7").id);
    expect(belaCheapestCard([H("J"), S("10")], "hearts").id).toBe(S("10").id);
  });
});

describe("bela zvanja", () => {
  it("nizovi: tri 20, četiri 50, pet i više 100", () => {
    expect(findBelaDeclarations([S("7"), S("8"), S("9"), D("A")]).map((d) => d.points)).toEqual([20]);
    expect(findBelaDeclarations([S("10"), S("J"), S("Q"), S("K")]).map((d) => d.points)).toEqual([50]);
    expect(findBelaDeclarations([S("9"), S("10"), S("J"), S("Q"), S("K")]).map((d) => d.points)).toEqual([100]);
    const all8 = (["7", "8", "9", "10", "J", "Q", "K", "A"] as Rank[]).map(S);
    expect(findBelaDeclarations(all8)).toEqual([{ kind: "sequence", points: 100, cards: all8 }]);
  });

  it("niz ide prirodnim redom (P-5): IX-X-U jeste, U-A nije", () => {
    expect(findBelaDeclarations([D("9"), D("10"), D("J")])).toHaveLength(1);
    expect(findBelaDeclarations([D("J"), D("K"), D("A")])).toHaveLength(0);
  });

  it("dva niza u istoj boji se broje posebno", () => {
    const d = findBelaDeclarations([S("7"), S("8"), S("9"), S("Q"), S("K"), S("A")]);
    expect(d.map((x) => x.points)).toEqual([20, 20]);
  });

  it("četiri iste: U 200, IX 150, A/X/K/O 100, VII/VIII ništa", () => {
    const four = (r: Rank) => [H(r), S(r), D(r), C(r)];
    expect(findBelaDeclarations(four("J"))[0]!.points).toBe(200);
    expect(findBelaDeclarations(four("9"))[0]!.points).toBe(150);
    expect(findBelaDeclarations(four("Q"))[0]!.points).toBe(100);
    expect(findBelaDeclarations(four("7"))).toHaveLength(0);
    expect(findBelaDeclarations(four("8"))).toHaveLength(0);
  });

  it("odluka 11: ista karta u četiri iste i u nizu — broje se oba", () => {
    const d = findBelaDeclarations([H("9"), H("10"), H("J"), S("J"), D("J"), C("J")]);
    expect(d.map((x) => [x.kind, x.points]).sort()).toEqual([["four", 200], ["sequence", 20]]);
  });

  it("više zvanja u ruci: niz u dvije boje i četiri iste", () => {
    const d = findBelaDeclarations([S("Q"), S("K"), S("A"), D("Q"), D("K"), D("A"), H("A"), C("A")]);
    expect(d.reduce((a, x) => a + x.points, 0)).toBe(20 + 20 + 100);
  });

  it("bez zvanja: prazno", () => {
    expect(findBelaDeclarations([S("7"), S("9"), D("J"), D("A"), H("8"), H("K"), C("10"), C("Q")])).toEqual([]);
  });

  it("poređenje: bodovi, pa dužina, pa viša karta, pa adutski niz", () => {
    const [t20lo] = findBelaDeclarations([S("7"), S("8"), S("9")]);
    const [t20hi] = findBelaDeclarations([D("Q"), D("K"), D("A")]);
    const [k50] = findBelaDeclarations([C("7"), C("8"), C("9"), C("10")]);
    const [h20] = findBelaDeclarations([H("Q"), H("K"), H("A")]);
    expect(compareDeclarations(k50!, t20hi!, null)).toBeGreaterThan(0);
    expect(compareDeclarations(t20hi!, t20lo!, null)).toBeGreaterThan(0);
    expect(compareDeclarations(h20!, t20hi!, "hearts")).toBeGreaterThan(0);
    expect(compareDeclarations(h20!, t20hi!, "spades")).toBe(0);
  });

  it("P-7: boduje samo tim sa najjačim zvanjem, ali oba njegova igrača", () => {
    const team = (id: string) => (id === "a" || id === "c" ? 0 : 1);
    const byOrder = [
      { playerId: "a", declarations: findBelaDeclarations([S("7"), S("8"), S("9")]) },
      { playerId: "b", declarations: findBelaDeclarations([D("7"), D("8"), D("9"), D("10")]) },
      { playerId: "c", declarations: [] },
      { playerId: "d", declarations: findBelaDeclarations([C("7"), C("8"), C("9")]) },
    ];
    const scored = resolveBelaDeclarations(byOrder, team, "hearts", true);
    expect(scored.map((p) => p.playerId)).toEqual(["b", "d"]);
    const both = resolveBelaDeclarations(byOrder, team, "hearts", false);
    expect(both.map((p) => p.playerId)).toEqual(["a", "b", "d"]);
  });

  it("P-7: potpuno jednaka zvanja — boduje igrač bliži prvom na potezu", () => {
    const team = (id: string) => (id === "a" || id === "c" ? 0 : 1);
    const byOrder = [
      { playerId: "b", declarations: findBelaDeclarations([S("7"), S("8"), S("9")]) },
      { playerId: "c", declarations: findBelaDeclarations([D("7"), D("8"), D("9")]) },
    ];
    expect(resolveBelaDeclarations(byOrder, team, "hearts", true).map((p) => p.playerId)).toEqual(["b"]);
  });
});
