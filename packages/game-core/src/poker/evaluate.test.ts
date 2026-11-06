import { describe, it, expect } from "vitest";
import type { Card, Rank, Suit } from "@zandar/shared-types";
import { compareHandScores, evaluateBestHand, evaluateFive } from "./evaluate";

const SUIT: Record<string, Suit> = { c: "clubs", d: "diamonds", h: "hearts", s: "spades" };

/** "Ah Kd 10c" → karte. */
function cards(spec: string): Card[] {
  return spec
    .trim()
    .split(/\s+/)
    .map((t) => {
      const rank = t.slice(0, -1) as Rank;
      const suit = SUIT[t.slice(-1)]!;
      return { id: `${suit}-${rank}`, suit, rank };
    });
}

const cat = (spec: string) => evaluateBestHand(cards(spec)).category;
const cmp = (a: string, b: string) =>
  Math.sign(compareHandScores(evaluateBestHand(cards(a)).score, evaluateBestHand(cards(b)).score));

describe("poker evaluate — kategorije", () => {
  it.each([
    ["Ah Kh Qh Jh 10h", "royal_flush"],
    ["9s 8s 7s 6s 5s", "straight_flush"],
    ["5d 4d 3d 2d Ad", "straight_flush"],
    ["Ac Ad Ah As 2c", "four_of_a_kind"],
    ["Kc Kd Kh 2s 2c", "full_house"],
    ["Ac 9c 7c 4c 2c", "flush"],
    ["10c 9d 8h 7s 6c", "straight"],
    ["Ac 2d 3h 4s 5c", "straight"],
    ["Ac Kd Qh Js 10c", "straight"],
    ["7c 7d 7h Ks 2c", "three_of_a_kind"],
    ["Jc Jd 4h 4s Ac", "two_pair"],
    ["Qc Qd 9h 5s 2c", "pair"],
    ["Ac Jd 9h 5s 3c", "high_card"],
  ])("%s → %s", (spec, expected) => {
    expect(cat(spec)).toBe(expected);
  });

  it("Q-K-A-2-3 nije kenta (As ne obrće ugao)", () => {
    expect(cat("Qc Kd Ah 2s 3c")).toBe("high_card");
  });

  it("evaluateFive traži tačno 5 karata", () => {
    expect(() => evaluateFive(cards("Ac Kd"))).toThrow();
  });
});

describe("poker evaluate — poređenje i kickeri", () => {
  it("redoslijed kategorija", () => {
    const ladder = [
      "Ac Jd 9h 5s 3c",
      "Qc Qd 9h 5s 2c",
      "Jc Jd 4h 4s Ac",
      "7c 7d 7h Ks 2c",
      "Ac 2d 3h 4s 5c",
      "Ac 9c 7c 4c 2c",
      "Kc Kd Kh 2s 2c",
      "Ac Ad Ah As 2c",
      "9s 8s 7s 6s 5s",
      "Ah Kh Qh Jh 10h",
    ];
    for (let i = 1; i < ladder.length; i++) expect(cmp(ladder[i]!, ladder[i - 1]!)).toBe(1);
  });

  it("par asova: kicker K pobjeđuje kicker Q", () => {
    expect(cmp("Ac Ad Kh 5s 3c", "Ah As Qd 5c 3d")).toBe(1);
  });

  it("par: odlučuje treći kicker", () => {
    expect(cmp("9c 9d Kh 7s 4c", "9h 9s Kd 7c 3d")).toBe(1);
  });

  it("dva para: viši gornji par, pa donji, pa kicker", () => {
    expect(cmp("Kc Kd 2h 2s 3c", "Qc Qd Jh Js Ac")).toBe(1);
    expect(cmp("Kc Kd 5h 5s 3c", "Kh Ks 4d 4c Ac")).toBe(1);
    expect(cmp("Kc Kd 5h 5s 9c", "Kh Ks 5d 5c 8c")).toBe(1);
  });

  it("tris: kickeri odlučuju", () => {
    expect(cmp("7c 7d 7h As 2c", "7s 7c 7d Ks Qc")).toBe(1);
  });

  it("full house: tris odlučuje prije para", () => {
    expect(cmp("3c 3d 3h 2s 2c", "2h 2s 2d As Ac")).toBe(1);
  });

  it("poker: kicker odlučuje", () => {
    expect(cmp("9c 9d 9h 9s Ac", "9c 9d 9h 9s Kc")).toBe(1);
  });

  it("flush: poređenje karta po karta", () => {
    expect(cmp("Ac Qc 9c 5c 3c", "Ad Qd 9d 5d 2d")).toBe(1);
  });

  it("kenta: točak A-2-3-4-5 je najslabija kenta", () => {
    expect(cmp("2c 3d 4h 5s 6c", "Ac 2d 3h 4s 5c")).toBe(1);
    expect(cmp("Ac Kd Qh Js 10c", "Kc Qd Jh 10s 9c")).toBe(1);
  });

  it("straight flush: čelični točak je najslabiji", () => {
    expect(cmp("6d 5d 4d 3d 2d", "5d 4d 3d 2d Ad")).toBe(1);
  });

  it("iste ruke u različitim bojama su jednake", () => {
    expect(cmp("Ac Kd Qh Js 9c", "Ad Kh Qs Jc 9d")).toBe(0);
  });
});

describe("poker evaluate — najbolja od 7", () => {
  it("bira flush iz 7 karata i vraća baš tih 5", () => {
    const r = evaluateBestHand(cards("Ah 2c Kh 9h 4h 7h Qs"));
    expect(r.category).toBe("flush");
    expect(r.bestCards.map((c) => c.id).sort()).toEqual(
      ["hearts-A", "hearts-K", "hearts-9", "hearts-7", "hearts-4"].sort(),
    );
  });

  it("šest karata za kentu — uzima najvišu", () => {
    const r = evaluateBestHand(cards("4c 5d 6h 7s 8c 9d 2h"));
    expect(r.category).toBe("straight");
    expect(r.score).toEqual([4, 9]);
  });

  it("točak iz 7 karata", () => {
    expect(evaluateBestHand(cards("Ac 2d 3h 4s 5c Kd Kh")).category).toBe("straight");
  });

  it("dva trisa = full house sa višim trisom", () => {
    const r = evaluateBestHand(cards("8c 8d 8h 4s 4c 4d Ah"));
    expect(r.category).toBe("full_house");
    expect(r.score.slice(1)).toEqual([8, 4]);
  });

  it("tri para: najbolja dva + najbolji kicker", () => {
    const r = evaluateBestHand(cards("Qc Qd 9h 9s 5c 5d 2h"));
    expect(r.category).toBe("two_pair");
    expect(r.score).toEqual([2, 12, 9, 5]);
  });

  it("board igra: oba igrača dijele", () => {
    const board = "Ac Kd Qh Js 10c";
    expect(cmp(`2c 3d ${board}`, `4h 5s ${board}`)).toBe(0);
  });

  it("kicker iz ruke prelama izjednačen board", () => {
    const board = "Ac Ad 9h 7s 2c";
    expect(cmp(`Kc 3d ${board}`, `Qh Js ${board}`)).toBe(1);
  });

  it("odbija manje od 5 ili više od 7 karata", () => {
    expect(() => evaluateBestHand(cards("Ac Kd Qh Js"))).toThrow();
    expect(() => evaluateBestHand(cards("Ac Kd Qh Js 10c 9c 8c 7c"))).toThrow();
  });
});
