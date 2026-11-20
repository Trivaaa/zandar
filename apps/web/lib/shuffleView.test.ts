import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  INITIAL_TONES,
  SHUFFLE_EXIT_MS,
  arrivalSlots,
  revealAt,
  clearIntro,
  hasIntro,
  initialOf,
  initialTone,
  introOnState,
  markIntro,
  shuffleKicker,
  shuffleSeats,
} from "./shuffleView";

const p = (id: string, seatIndex: number) => ({ id, displayName: id, seatIndex });

describe("shuffleView — inicijal", () => {
  test("ista boja za isto ime, bez obzira na slova i razmake", () => {
    assert.equal(initialTone("Mirza"), initialTone(" mirza "));
    assert.equal(initialTone("Šime"), initialTone("ŠIME"));
  });
  test("ton je u opsegu i imena se raspoređuju", () => {
    const tones = new Set(["Jelena", "SokoKap", "Mirza", "Igor", "Petar", "Ana", "Dino", "Lejla"].map(initialTone));
    for (const t of tones) assert.ok(t >= 0 && t < INITIAL_TONES);
    assert.ok(tones.size >= 3);
  });
  test("inicijal: prvo slovo, veliko, i za č/š/ž", () => {
    assert.equal(initialOf("  čika"), "Č");
    assert.equal(initialOf(""), "?");
  });
});

describe("shuffleView — mjesta", () => {
  test("4P kao za stolom (seating.ts): +1 desno, +2 gore, +3 lijevo", () => {
    const seats = shuffleSeats([p("a", 0), p("b", 1), p("c", 2), p("d", 3)], "b", 4);
    assert.deepEqual(
      seats.map((s) => [s.place, s.player?.id, s.me]),
      [
        ["bottom", "b", true],
        ["right", "c", false],
        ["top", "d", false],
        ["left", "a", false],
      ],
    );
  });
  test("4P, sam za stolom: tri slobodna mjesta", () => {
    const seats = shuffleSeats([p("a", 0)], "a", 4);
    assert.equal(seats.length, 4);
    assert.deepEqual(seats.map((s) => s.player?.id ?? null), ["a", null, null, null]);
  });
  test("2P: dva mjesta, dolje i gore", () => {
    const seats = shuffleSeats([p("a", 0), p("b", 1)], "b", 2);
    assert.deepEqual(seats.map((s) => [s.place, s.player?.id]), [["bottom", "b"], ["top", "a"]]);
  });
  test("3P: +1 desno, +2 lijevo", () => {
    const seats = shuffleSeats([p("a", 0), p("b", 1), p("c", 2)], "a", 3);
    assert.deepEqual(seats.map((s) => [s.place, s.player?.id]), [["bottom", "a"], ["right", "b"], ["left", "c"]]);
  });
  test("bez mene u rosteru (roster još nije stigao): niko nije „Ti\"", () => {
    const seats = shuffleSeats([], "x", 4);
    assert.ok(seats.every((s) => !s.me && s.player === null));
  });
});

describe("shuffleView — tekst i tok", () => {
  test("nadnaslov po igri", () => {
    assert.equal(shuffleKicker({ playerCount: 4, targetScore: 11 }), "Žandar · 4 igrača · do 11");
    assert.equal(shuffleKicker({ game: "poker", playerCount: 4, targetScore: 21 }), "Poker · 4 igrača");
    assert.equal(shuffleKicker({ game: "raub", playerCount: 2, targetScore: 21 }), "Raub · 2 igrača");
  });
  test("stanje partije: miješanje → S2, inače ostaje", () => {
    assert.equal(introOnState("shuffle"), "exit");
    assert.equal(introOnState("exit"), "exit");
    assert.equal(introOnState("done"), "done");
  });
  test("izlaz S2 je najviše 0,65 s (tabla)", () => {
    assert.ok(SHUFFLE_EXIT_MS <= 650);
  });
  test("oznaka uvoda: samo za tu sobu, čitanje ne briše", () => {
    const mem = new Map<string, string>();
    const store = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
    markIntro("sto1", store);
    assert.equal(hasIntro("sto2", store), false);
    assert.equal(hasIntro("sto1", store), true);
    assert.equal(hasIntro("sto1", store), true);
    clearIntro(store);
    assert.equal(hasIntro("sto1", store), false);
  });
});

describe("shuffleView — sjedanje jedan po jedan", () => {
  const seeded = (seed: number) => () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  test("razmaci 800–1200 ms, tri dolaska ukupno 2,4–3,6 s", () => {
    for (let s = 1; s < 200; s++) {
      const slots = arrivalSlots(3, seeded(s));
      let prev = 0;
      for (const at of slots) {
        assert.ok(at - prev >= 800 && at - prev <= 1200, `${at - prev}`);
        prev = at;
      }
      assert.ok(slots[2]! >= 2400 && slots[2]! <= 3600);
    }
  });
  test("niko ne sjeda prije nego ga server javi", () => {
    assert.equal(revealAt(1000, 2000, null), 2000);
    assert.equal(revealAt(1000, 0, null), 1000);
  });
  test("poker: botovi javljeni zajedno ipak sjedaju redom", () => {
    const slots = [1000, 2000, 3000];
    const known = 2050;
    const out: number[] = [];
    for (const slot of slots) out.push(revealAt(slot, known, out.at(-1) ?? null));
    assert.deepEqual(out, [2050, 2350, 3000]);
  });
});
