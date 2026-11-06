import { describe, it, expect } from "vitest";
import type { PokerPot } from "@zandar/shared-types";
import { buildPots, splitPot } from "./pots";
import type { PotContribution } from "./pots";

/** "a:50 b:20 c:50f" → doprinosi; sufiks `f` = foldao. */
function contribs(spec: string): PotContribution[] {
  return spec
    .trim()
    .split(/\s+/)
    .map((t) => {
      const [id, rest] = t.split(":");
      const folded = rest!.endsWith("f");
      return { playerId: id!, amount: Number(folded ? rest!.slice(0, -1) : rest), folded };
    });
}

/** Pot kao "amount[ids]" sa sortiranim ovlaštenima, radi čitljivog poređenja. */
function fmt(pots: PokerPot[]): string[] {
  return pots.map((p) => `${p.amount}[${[...p.eligiblePlayerIds].sort().join("")}]`);
}

describe("buildPots — side potovi (30+ scenarija)", () => {
  const cases: Array<[string, string, string[]]> = [
    // [opis, doprinosi, očekivani potovi]
    ["heads-up jednaki ulozi", "a:10 b:10", ["20[ab]"]],
    ["tri igrača jednako", "a:20 b:20 c:20", ["60[abc]"]],
    ["četiri igrača jednako", "a:5 b:5 c:5 d:5", ["20[abcd]"]],
    ["jedan kratki all-in", "a:50 b:20 c:50", ["60[abc]", "60[ac]"]],
    ["dva različita all-ina", "a:100 b:20 c:50 d:100", ["80[abcd]", "90[acd]", "100[ad]"]],
    ["dva all-ina iste visine", "a:100 b:30 c:30 d:100", ["120[abcd]", "140[ad]"]],
    ["nepraćen višak se vraća", "a:100 b:40", ["80[ab]", "60[a]"]],
    ["nepraćen višak, tri igrača", "a:200 b:50 c:50", ["150[abc]", "150[a]"]],
    ["foldani blind ostaje u potu", "a:1f b:10 c:10", ["21[bc]"]],
    ["foldani mali i veliki blind", "a:1f b:2f c:6 d:6", ["15[cd]"]],
    ["foldani sa više od kratkog all-ina", "a:30f b:10 c:60", ["30[bc]", "70[c]"]],
    ["foldani iznad all-ina, pratilac ostaje", "a:40f b:10 c:40 d:40", ["40[bcd]", "90[cd]"]],
    ["svi osim jednog all-in različito", "a:5 b:10 c:15 d:100", ["20[abcd]", "15[bcd]", "10[cd]", "85[d]"]],
    ["sve različite visine, svi all-in", "a:10 b:20 c:30 d:40", ["40[abcd]", "30[bcd]", "20[cd]", "10[d]"]],
    ["foldani na najnižem nivou", "a:10f b:20 c:20", ["50[bc]"]],
    ["dva foldana, dvojica u ruci", "a:4f b:8f c:20 d:20", ["52[cd]"]],
    ["foldani pa kratki all-in", "a:20f b:5 c:20", ["15[bc]", "30[c]"]],
    ["kratki all-in iznad foldanog", "a:5f b:15 c:40", ["35[bc]", "25[c]"]],
    ["dupli kratki all-in, jedan foldao", "a:10 b:10 c:30f d:30", ["40[abd]", "40[d]"]],
    ["svi isti all-in", "a:100 b:100 c:100 d:100", ["400[abcd]"]],
    ["jedan igrač bez uloga (0) se ignoriše", "a:0 b:10 c:10", ["20[bc]"]],
    ["heads-up all-in kraći", "a:37 b:100", ["74[ab]", "63[b]"]],
    ["mali all-in i ostali dalje", "a:2 b:50 c:50 d:50", ["8[abcd]", "144[bcd]"]],
    ["dva side pota i foldani na vrhu", "a:10 b:25 c:60f d:60 e:60", ["50[abde]", "60[bde]", "105[de]"]],
    ["pet igrača, dva foldana", "a:3f b:3f c:50 d:12 e:50", ["42[cde]", "76[ce]"]],
    ["pet igrača, svi all-in različito", "a:1 b:2 c:3 d:4 e:5", ["5[abcde]", "4[bcde]", "3[cde]", "2[de]", "1[e]"]],
    ["foldani doprinosi u svaki sloj", "a:50f b:10 c:20 d:50", ["40[bcd]", "30[cd]", "60[d]"]],
    ["svi foldani osim jednog", "a:10f b:10f c:10", ["30[c]"]],
    ["dvojica all-in ista visina, treći više", "a:25 b:25 c:80", ["75[abc]", "55[c]"]],
    ["foldani preko svih pratilaca", "a:90f b:30 c:30", ["150[bc]"]],
    ["jedan all-in tačno između", "a:40 b:60 c:20 d:60", ["80[abcd]", "60[abd]", "40[bd]"]],
    ["blindovi + jedan poziv + fold", "a:1f b:2 c:2", ["5[bc]"]],
  ];

  it("ima najmanje 30 scenarija (acceptance)", () => {
    expect(cases.length).toBeGreaterThanOrEqual(30);
  });

  it.each(cases)("%s", (_label, spec, expected) => {
    const input = contribs(spec);
    const pots = buildPots(input);
    expect(fmt(pots)).toEqual(expected);
    // Zbir potova = zbir uloga (nijedan žeton ne nestaje).
    const total = input.reduce((s, c) => s + c.amount, 0);
    expect(pots.reduce((s, p) => s + p.amount, 0)).toBe(total);
  });
});

describe("splitPot — neparan žeton", () => {
  it("dijeli jednako", () => {
    expect([...splitPot(20, ["a", "b"])]).toEqual([
      ["a", 10],
      ["b", 10],
    ]);
  });

  it("neparan žeton ide prvom lijevo od buttona", () => {
    expect([...splitPot(21, ["b", "a"])]).toEqual([
      ["b", 11],
      ["a", 10],
    ]);
  });

  it("tri pobjednika, dva viška", () => {
    expect([...splitPot(11, ["c", "a", "b"])]).toEqual([
      ["c", 4],
      ["a", 4],
      ["b", 3],
    ]);
  });

  it("bez pobjednika — prazno", () => {
    expect(splitPot(10, []).size).toBe(0);
  });
});
