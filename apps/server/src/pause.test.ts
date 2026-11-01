import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { GamePhase } from "@zandar/shared-types";

import { afterGrace, afterLeave, isMatchOpen } from "./pause";

type P = { id: string; isBot?: boolean; connectionStatus: "connected" | "reconnecting" | "abandoned" };

const gone: P = { id: "a", connectionStatus: "reconnecting" }; // upravo izašao
const human: P = { id: "b", connectionStatus: "connected" };
const bot: P = { id: "c", isBot: true, connectionStatus: "connected" };

const gs = (phase: GamePhase, players: P[]) => ({ phase, players }) as Parameters<typeof afterLeave>[0];

describe("afterGrace", () => {
  test("partija teče: bez ljudi raspusti, sa ljudima pauza", () => {
    assert.equal(afterGrace(gs("playing", [gone, bot]), false), "abandon");
    assert.equal(afterGrace(gs("playing", [gone, human]), false), "pause");
  });

  test("rezultat ruke bez ljudi: prvo čeka, pa raspusti", () => {
    assert.equal(afterGrace(gs("hand_finished", [gone, bot]), false), "wait_hand_end");
    assert.equal(afterGrace(gs("hand_finished", [gone, bot]), true), "abandon");
  });

  test("rezultat ruke sa povezanim čovjekom: sto ostaje", () => {
    assert.equal(afterGrace(gs("hand_finished", [gone, human, bot]), false), "ignore");
    assert.equal(afterGrace(gs("hand_finished", [gone, human, bot]), true), "ignore");
  });

  test("nova ruka je krenula za vrijeme čekanja: važi pravilo partije", () => {
    assert.equal(afterGrace(gs("playing", [gone, bot]), true), "abandon");
  });

  test("sto već stoji ili je gotov: ne dira se", () => {
    for (const phase of ["paused_for_reconnect", "abandon_vote", "match_finished", "abandoned"] as const) {
      assert.equal(afterGrace(gs(phase, [gone, bot]), true), "ignore");
    }
  });
});

describe("isMatchOpen", () => {
  test("otvoren meč dobija prekid pri brisanju sobe, ostali ne", () => {
    for (const phase of ["playing", "hand_finished", "paused_for_reconnect", "abandon_vote"] as const) {
      assert.equal(isMatchOpen(phase), true, phase);
    }
    for (const phase of ["waiting", "match_finished", "abandoned"] as const) {
      assert.equal(isMatchOpen(phase), false, phase);
    }
  });
});

describe("afterLeave (QA B1)", () => {
  test("partija teče, ostaje čovjek → odmah pauza", () => {
    assert.equal(afterLeave(gs("playing", [gone, human])), "pause");
  });

  test("gotova ruka → nova ruka pa pauza (host je možda otišao)", () => {
    assert.equal(afterLeave(gs("hand_finished", [gone, human, bot])), "next_hand_then_pause");
  });

  test("sto već stoji → samo javi", () => {
    assert.equal(afterLeave(gs("paused_for_reconnect", [gone, human])), "mark_only");
    assert.equal(afterLeave(gs("abandon_vote", [gone, human])), "mark_only");
  });

  test("ostali su samo botovi → raspusti", () => {
    assert.equal(afterLeave(gs("playing", [gone, bot, bot])), "abandon");
    assert.equal(afterLeave(gs("hand_finished", [gone, bot])), "abandon");
  });

  test("drugi čovjek je i sam otpao → raspusti", () => {
    assert.equal(afterLeave(gs("paused_for_reconnect", [gone, { ...human, connectionStatus: "reconnecting" }])), "abandon");
  });

  test("partija ne traje → ništa", () => {
    for (const phase of ["waiting", "match_finished", "abandoned"] as const) {
      assert.equal(afterLeave(gs(phase, [gone, human])), "ignore");
    }
  });
});
