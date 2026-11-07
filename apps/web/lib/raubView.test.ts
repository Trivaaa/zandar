import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  applyRaubAction,
  createRaubMatch,
  createRaubRules,
  createSeededRandom,
  getRaubView,
  selectRaubBotAction,
  startRaubHand,
} from "@zandar/game-core";
import type { RaubGameState, RaubHandResult, RaubPlayerView } from "@zandar/shared-types";

import {
  declarerTag,
  formatDelta,
  handRows,
  handSentence,
  leaderIds,
  overlayPhase,
  panelFor,
  phaseLabel,
  playHint,
  scoreTable,
  seatCaptionText,
  sortedRaubPlacements,
} from "./raubView";

const IDS = ["p0", "p1", "p2", "p3"];

/** Pravi motor vodi meč (botovi) dok uslov ne važi — isto kao /dev/raub. */
function until(pred: (s: RaubGameState) => boolean, seed = 1): RaubGameState {
  for (let k = 0; k < 30; k++) {
    const rng = createSeededRandom(seed + k);
    let s = createRaubMatch({ roomId: "r", matchId: "m", playerIds: IDS, rules: createRaubRules(4), rng });
    for (let i = 0; i < 4000; i++) {
      if (pred(s)) return s;
      if (s.phase === "match_finished") break;
      if (s.phase === "hand_complete") {
        s = startRaubHand(s, rng);
        continue;
      }
      const pid = s.currentPlayerId!;
      s = applyRaubAction(s, pid, selectRaubBotAction(getRaubView(s, pid), undefined, rng));
    }
  }
  throw new Error("stanje nije nađeno");
}

const mine = (step: RaubGameState["step"]) => (s: RaubGameState) =>
  s.phase === "playing" && s.step === step && s.currentPlayerId === "p0";

const name = (id: string) => ({ p0: "Ti", p1: "Marko", p2: "Milica", p3: "Goga" })[id] ?? id;

describe("raubView: faza i panel", () => {
  test("natpis faze prati korak", () => {
    const base: Pick<RaubPlayerView, "tricks"> = { tricks: [] };
    assert.equal(phaseLabel({ ...base, phase: "playing", step: "bidding" }), "Licitacija");
    assert.equal(phaseLabel({ ...base, phase: "playing", step: "going" }), "Idem?");
    assert.equal(phaseLabel({ ...base, phase: "playing", step: "exchange" }), "Zamjena");
    assert.equal(
      phaseLabel({ phase: "playing", step: "tricks", tricks: [{ leaderId: "p0", plays: [], winnerId: null }, { leaderId: "p0", plays: [], winnerId: null }] }),
      "Štih 2 od 4",
    );
    assert.equal(phaseLabel({ ...base, phase: "hand_complete", step: null }), "Kraj ruke");
    assert.equal(phaseLabel({ ...base, phase: "match_finished", step: null }), "Kraj partije");
  });

  test("panel: djelilac prije otvaranja, licitacija, idem, zamjena, štih, čekanje", () => {
    assert.equal(panelFor(getRaubView(until(mine("await_open")), "p0"), name).kind, "open");
    const bid = panelFor(getRaubView(until(mine("bidding")), "p0"), name);
    assert.equal(bid.kind, "bid");
    const going = until(mine("going"));
    const gp = panelFor(getRaubView(going, "p0"), name);
    assert.equal(gp.kind, "going");
    if (gp.kind === "going") assert.equal(gp.declarerName, name(going.declarerId!));
    assert.equal(panelFor(getRaubView(until(mine("exchange")), "p0"), name).kind, "exchange");
    assert.equal(panelFor(getRaubView(until(mine("tricks")), "p0"), name).kind, "play");
    const other = until((s) => s.phase === "playing" && s.currentPlayerId === "p2");
    assert.deepEqual(panelFor(getRaubView(other, "p0"), name), { kind: "wait", name: "Milica" });
  });

  test("uputa u štihu: otvaranje, boja, adut", () => {
    const lead = until((s) => mine("tricks")(s) && s.tricks.at(-1)!.plays.length === 0);
    assert.match(playHint(getRaubView(lead, "p0")), /bilo koja/i);
    const follow = until((s) => {
      if (!mine("tricks")(s)) return false;
      const v = getRaubView(s, "p0");
      const led = s.tricks.at(-1)!.plays[0]?.card.suit;
      return !!led && v.legalCardIds!.length < v.myCards.length && v.myCards.some((c) => c.suit === led);
    });
    assert.match(playHint(getRaubView(follow, "p0")), /Odgovori na boju/);
  });
});

describe("raubView: sjedišta", () => {
  test("natpis licitacije i zamjene (rodno neutralno)", () => {
    const s = until((x) => x.phase === "playing" && x.step === "exchange" && x.seats.some((t) => t.exchanged !== null));
    const v = getRaubView(s, "p0");
    const done = v.seats.find((t) => t.exchanged !== null)!;
    const text = seatCaptionText(v, done)!;
    assert.ok(text === "Bez zamjene" || /^Zamjena \d$/.test(text), text);
    assert.ok(!/Zamijenio|Zamijenila/.test(text));
  });

  test("oznaka nosioca: ugovor, pa uzeto/obaveza u štihovima", () => {
    const s = until((x) => x.phase === "playing" && x.step === "tricks");
    const v = getRaubView(s, "p0");
    const decl = v.seats.find((t) => t.playerId === v.declarerId)!;
    const tag = declarerTag(v, decl)!;
    assert.match(tag.label, /mora [12]/);
    assert.equal(tag.progress, `${decl.tricks}/${v.requiredTricks}`);
    const notDecl = v.seats.find((t) => t.playerId !== v.declarerId)!;
    assert.equal(declarerTag(v, notDecl), null);
  });
});

describe("raubView: rezultat", () => {
  const result: RaubHandResult = {
    dealNo: 6,
    dealerId: "p1",
    void: false,
    trumpSuit: "hearts",
    scenario: "bid",
    declarerId: "p1",
    requiredTricks: 2,
    multiplier: 2,
    pendingRefasAfter: 0,
    rows: [
      { playerId: "p0", tricks: 2, delta: -4, penalty: false, dropped: false, scoreBefore: 13, scoreAfter: 9 },
      { playerId: "p1", tricks: 1, delta: 6, penalty: true, dropped: false, scoreBefore: 11, scoreAfter: 17 },
      { playerId: "p2", tricks: 1, delta: -2, penalty: false, dropped: false, scoreBefore: 14, scoreAfter: 12 },
      { playerId: "p3", tricks: 0, delta: 0, penalty: false, dropped: true, scoreBefore: 17, scoreAfter: 17 },
    ],
  };

  test("primjer sa table 11: nosilac prvi, kazna crvena, ×2", () => {
    const rows = handRows(result);
    assert.equal(rows[0]!.playerId, "p1");
    assert.equal(rows[0]!.isDeclarer, true);
    assert.equal(formatDelta(rows[0]!.delta), "+6");
    assert.equal(formatDelta(-4), "−4");
    assert.equal(formatDelta(0), "0");
    assert.match(handSentence(result, name), /Marko: uzeto 1 od 2 — kazna/);
    assert.match(handSentence({ ...result, void: true }, name), /poništava/);
  });

  test("tabela: refa kao red, ne idem bez broja", () => {
    const refa: RaubHandResult = { ...result, dealNo: 5, void: true, rows: [], multiplier: 1, pendingRefasAfter: 1 };
    const rows = scoreTable([refa, result]);
    assert.equal(rows[0]!.void, true);
    assert.equal(rows[1]!.multiplier, 2);
    assert.equal(rows[1]!.deltas.p3, null);
    assert.deepEqual(rows[1]!.deltas.p1, { delta: 6, penalty: true });
  });

  test("plasman i vodeći (najbliži nuli)", () => {
    const seats = [
      { playerId: "p0", seatNo: 0, score: 7, tricks: 0, bid: null, exchanged: null, going: null, handCount: 0, place: 3 },
      { playerId: "p1", seatNo: 1, score: 0, tricks: 0, bid: null, exchanged: null, going: null, handCount: 0, place: 1 },
      { playerId: "p2", seatNo: 2, score: 0, tricks: 0, bid: null, exchanged: null, going: null, handCount: 0, place: 1 },
    ];
    assert.deepEqual(
      sortedRaubPlacements({ seats, placements: [] }).map((r) => [r.playerId, r.place]),
      [
        ["p1", 1],
        ["p2", 1],
        ["p0", 3],
      ],
    );
    assert.deepEqual([...leaderIds(seats)].sort(), ["p1", "p2"]);
  });

  test("prekid: pauza, glasanje, raspušten sto", () => {
    assert.equal(overlayPhase({ phase: "playing", interruption: null }), null);
    assert.equal(overlayPhase({ phase: "playing", interruption: { kind: "paused", startedAt: 0, endsAt: 1 } }), "paused_for_reconnect");
    assert.equal(overlayPhase({ phase: "hand_complete", interruption: { kind: "vote", startedAt: 0, endsAt: 1 } }), "abandon_vote");
    assert.equal(overlayPhase({ phase: "abandoned", interruption: null }), "abandoned");
  });
});
