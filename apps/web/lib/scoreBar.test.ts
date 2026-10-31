import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { HandScore, PublicPlayer } from "@zandar/shared-types";
import {
  barSides,
  barView,
  bonusByPile,
  cardNews,
  detailRows,
  EMPTY_QUEUE,
  enqueueNews,
  finishNews,
  frozenHandEnd,
  handEndNews,
  handEndPending,
  hiddenCards,
  settleNews,
  startNextNews,
} from "./scoreBar";

const player = (id: string, seatIndex: number, teamId?: number): PublicPlayer => ({
  id,
  displayName: id === "me" ? "Zvonko" : id,
  seatIndex,
  isHost: seatIndex === 0,
  connectionStatus: "connected",
  ...(teamId === undefined ? {} : { teamId }),
});

const four = [player("me", 0, 0), player("Goga", 1, 1), player("Milica", 2, 0), player("Rade", 3, 1)];
/** Isti sto, ali igrač je u timu 1: „Mi" mora ostati njegov tim. */
const fourTeamOne = [player("Goga", 0, 0), player("me", 1, 1), player("Rade", 2, 0), player("Milica", 3, 1)];
const two = [player("me", 0), player("Goga", 1)];
const three = [player("me", 0), player("Goga", 1), player("Rade", 2)];

function hand(over: Partial<HandScore["breakdown"]> = {}, points: Record<string, number> = {}): HandScore {
  return {
    handNumber: 3,
    pointsByPile: points,
    breakdown: {
      mostCards: { cardCountByPile: { "team-0": 14, "team-1": 9 }, winnerPileId: "team-0", points: 2 },
      mostClubs: { clubCountByPile: { "team-0": 3, "team-1": 3 }, points: 1 },
      twoOfClubs: { points: 1 },
      tenOfDiamonds: { points: 1 },
      ...over,
    },
  };
}

const view = (over: Partial<Parameters<typeof barView>[0]> = {}) =>
  barView({
    players: four,
    myPlayerId: "me",
    playing: true,
    matchScore: { "team-0": 7, "team-1": 12 },
    targetScore: 21,
    handNumber: 3,
    liveHand: hand(),
    queue: EMPTY_QUEUE,
    ...over,
  });

describe("barSides", () => {
  test("4P: Mi je pile igrača, i kad je u timu 1", () => {
    assert.deepEqual(barSides(four, "me"), [
      { pileId: "team-0", label: "Mi", tone: "a" },
      { pileId: "team-1", label: "Oni", tone: "b" },
    ]);
    assert.deepEqual(barSides(fourTeamOne, "me"), [
      { pileId: "team-1", label: "Mi", tone: "a" },
      { pileId: "team-0", label: "Oni", tone: "b" },
    ]);
  });

  test("2P: Ti i ime, u bojama", () => {
    assert.deepEqual(barSides(two, "me"), [
      { pileId: "me", label: "Ti", tone: "a" },
      { pileId: "Goga", label: "Goga", tone: "b" },
    ]);
  });

  test("3P: tri polja bez boja timova", () => {
    assert.deepEqual(
      barSides(three, "me").map((s) => [s.label, s.tone]),
      [["Ti", "none"], ["Goga", "none"], ["Rade", "none"]],
    );
  });
});

describe("barView", () => {
  test("vodi samo jedan; neriješeno nema akcenta", () => {
    assert.deepEqual(view().sides.map((s) => s.lead), [false, true]);
    assert.deepEqual(
      view({ matchScore: { "team-0": 9, "team-1": 9 } }).sides.map((s) => s.lead),
      [false, false],
    );
  });

  test("do 21, a blizu kraja fali N (≤5)", () => {
    assert.deepEqual([view().target, view().near], ["do 21", false]);
    const at15 = view({ matchScore: { "team-0": 7, "team-1": 15 } });
    assert.deepEqual([at15.target, at15.near], ["do 21", false]);
    const at16 = view({ matchScore: { "team-0": 7, "team-1": 16 } });
    assert.deepEqual([at16.target, at16.near], ["fali 5", true]);
  });

  test("+N ne ulazi u ukupni broj", () => {
    const v = view({ liveHand: hand({ twoOfClubs: { winnerPileId: "team-0", points: 1 } }) });
    assert.deepEqual(v.sides.map((s) => [s.score, s.bonus]), [[7, 1], [12, 0]]);
  });

  test("bez liveHand (stariji server): samo ukupni brojevi", () => {
    const v = view({ liveHand: undefined });
    assert.deepEqual(v.sides.map((s) => [s.score, s.bonus]), [[7, 0], [12, 0]]);
  });

  test("poslije kraja ruke nema +N: već je u ukupnom broju", () => {
    const v = view({
      playing: false,
      liveHand: hand({ twoOfClubs: { winnerPileId: "team-0", points: 1 } }),
    });
    assert.deepEqual(v.sides.map((s) => s.bonus), [0, 0]);
  });

  test("aria-label iz ugla igrača", () => {
    assert.equal(view().aria, "Rezultat: Mi 7, Oni 12. Dodirni za detalje.");
  });

  test("vijest: +1 se vidi tek kad se traka vraća na rezultat", () => {
    const liveHand = hand({ twoOfClubs: { winnerPileId: "team-0", points: 1 } });
    const news = cardNews("twoOfClubs", "team-0", "Milica", four, "me");
    const queued = enqueueNews(EMPTY_QUEUE, [news]);
    assert.equal(view({ liveHand, queue: queued }).sides[0]!.bonus, 0);
    const started = startNextNews(queued);
    assert.equal(view({ liveHand, queue: started }).sides[0]!.bonus, 0);
    assert.equal(view({ liveHand, queue: settleNews(started) }).sides[0]!.bonus, 1);
    assert.equal(view({ liveHand, queue: finishNews(settleNews(started)) }).sides[0]!.bonus, 1);
  });

  test("kraj ruke: stari brojevi i stari +N dok vijest ne završi", () => {
    const before = hand({ twoOfClubs: { winnerPileId: "team-0", points: 1 } });
    const final = hand(
      {
        twoOfClubs: { winnerPileId: "team-0", points: 1 },
        tenOfDiamonds: { winnerPileId: "team-1", points: 1 },
      },
      { "team-0": 3, "team-1": 1 },
    );
    const queued = enqueueNews(EMPTY_QUEUE, [handEndNews(final, four, "me", before)]);
    const matchScore = { "team-0": 10, "team-1": 13 };
    const during = view({ playing: false, matchScore, liveHand: final, queue: startNextNews(queued) });
    assert.deepEqual(during.sides.map((s) => [s.score, s.bonus]), [[7, 1], [12, 0]]);
    // Reconnect i reload nemaju `handEnd`, pa ni zamrzavanja.
    const after = view({ playing: false, matchScore, liveHand: final, queue: settleNews(startNextNews(queued)) });
    assert.deepEqual(after.sides.map((s) => [s.score, s.bonus]), [[10, 0], [13, 0]]);
  });
});

describe("vijesti", () => {
  test("4P: tekstovi iz ugla igrača", () => {
    const ours = cardNews("twoOfClubs", "team-0", "Milica", four, "me");
    assert.deepEqual(
      [ours.title, ours.sub, ours.tone, ours.ours],
      ["Mala je naša!", "Milica · na kraju dijeljenja", "a", true],
    );
    const theirs = cardNews("tenOfDiamonds", "team-1", "Goga", four, "me");
    assert.deepEqual(
      [theirs.title, theirs.tone, theirs.ours],
      ["Velika ide njima", "b", false],
    );
  });

  test("4P iz tima 1: isti pile je „naš\"", () => {
    const n = cardNews("twoOfClubs", "team-1", "me", fourTeamOne, "me");
    assert.deepEqual(
      [n.title, n.sub, n.tone, n.ours],
      ["Mala je naša!", "Ti · na kraju dijeljenja", "a", true],
    );
  });

  test("2P/3P: tvoja i ime, bez roda", () => {
    assert.equal(cardNews("twoOfClubs", "me", "me", two, "me").title, "Mala je tvoja!");
    assert.equal(cardNews("tenOfDiamonds", "me", "me", two, "me").title, "Velika je tvoja!");
    const other = cardNews("tenOfDiamonds", "Rade", "Rade", three, "me");
    assert.deepEqual(
      [other.title, other.tone, other.ours],
      ["Velika ide Rade", "none", false],
    );
  });

  test("kraj ruke: poeni po strani, bez strana sa nulom", () => {
    const n = handEndNews(hand({}, { "team-0": 3, "team-1": 1 }), four, "me", undefined);
    assert.deepEqual(n.parts.map((p) => [p.label, p.points, p.tone]), [["Mi", 3, "a"], ["Oni", 1, "b"]]);
    const swept = handEndNews(hand({}, { "team-0": 5 }), four, "me", undefined);
    assert.deepEqual(swept.parts.map((p) => p.label), ["Mi"]);
  });
});

describe("red vijesti", () => {
  const mala = cardNews("twoOfClubs", "team-0", "me", four, "me");
  const velika = cardNews("tenOfDiamonds", "team-1", "Goga", four, "me");

  test("jedna za drugom, nikad dvije", () => {
    let q = enqueueNews(EMPTY_QUEUE, [mala, velika]);
    assert.equal(q.current, null);
    q = startNextNews(q);
    assert.equal(q.current!.title, mala.title);
    assert.equal(q.waiting.length, 1);
    q = startNextNews(finishNews(q));
    assert.equal(q.current!.title, velika.title);
    assert.equal(q.waiting.length, 0);
    assert.notEqual(q.current!.id, 1);
  });

  test("skrivene karte: sve koje čekaju i tekuća dok se ne slegne", () => {
    const q = startNextNews(enqueueNews(EMPTY_QUEUE, [mala, velika]));
    assert.deepEqual(hiddenCards(q), ["twoOfClubs", "tenOfDiamonds"]);
    assert.deepEqual(hiddenCards(settleNews(q)), ["tenOfDiamonds"]);
  });

  test("kraj ruke čeka overlay dok vijest ne ode, a zamrzava samo do slijeganja", () => {
    const end = handEndNews(hand({}, { "team-0": 3 }), four, "me", undefined);
    const waiting = enqueueNews(EMPTY_QUEUE, [mala, end]);
    assert.equal(handEndPending(waiting), true);
    assert.notEqual(frozenHandEnd(waiting), null);
    const started = startNextNews(finishNews(startNextNews(waiting)));
    assert.equal(handEndPending(started), true);
    assert.equal(handEndPending(settleNews(started)), true);
    assert.equal(frozenHandEnd(settleNews(started)), null);
    assert.equal(handEndPending(finishNews(settleNews(started))), false);
  });

  test("prazan red ne pokreće ništa", () => {
    assert.equal(startNextNews(EMPTY_QUEUE), EMPTY_QUEUE);
    assert.equal(handEndPending(EMPTY_QUEUE), false);
  });
});

describe("bonusByPile i detailRows", () => {
  test("oba +1 istom pile-u", () => {
    const h = hand({
      twoOfClubs: { winnerPileId: "team-0", points: 1 },
      tenOfDiamonds: { winnerPileId: "team-0", points: 1 },
    });
    assert.deepEqual(bonusByPile(h), { "team-0": 2 });
    assert.deepEqual(bonusByPile(h, ["tenOfDiamonds"]), { "team-0": 1 });
  });

  test("redovi: brojevi, pobjednik i crtice, natpisi iz sr.score", () => {
    const rows = detailRows(
      hand({ twoOfClubs: { winnerPileId: "team-0", points: 1 } }),
      barSides(four, "me"),
    );
    const of = (key: string) => rows.find((r) => r.key === key)!;
    assert.equal(of("mostCards").label, "Najviše karata");
    assert.equal(of("mostCards").points, "2 poena");
    assert.deepEqual(of("mostCards").cells.map((c) => [c.text, c.won]), [["14", true], ["9", false]]);
    // Neriješeno: brojevi stoje, ali niko nije pobijedio.
    assert.deepEqual(of("mostClubs").cells.map((c) => [c.text, c.won]), [["3", false], ["3", false]]);
    assert.equal(of("twoOfClubs").points, "1 poen");
    assert.deepEqual(of("twoOfClubs").cells.map((c) => c.text), ["+1", "—"]);
    assert.deepEqual(of("tenOfDiamonds").cells.map((c) => c.text), ["—", "—"]);
  });

  test("kolone prate ugao igrača iz tima 1", () => {
    const rows = detailRows(hand(), barSides(fourTeamOne, "me"));
    assert.deepEqual(rows[0]!.cells.map((c) => c.text), ["9", "14"]);
  });

  test("bez liveHand: svuda crtice, isti redovi", () => {
    const rows = detailRows(undefined, barSides(four, "me"));
    assert.equal(rows.length, 4);
    assert.ok(rows.every((r) => r.cells.every((c) => c.text === "—" && !c.won)));
  });
});
