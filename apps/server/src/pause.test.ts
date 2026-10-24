import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { GamePhase } from "@zandar/shared-types";

import { afterLeave } from "./pause";

type P = { id: string; isBot?: boolean; connectionStatus: "connected" | "reconnecting" | "abandoned" };

const gone: P = { id: "a", connectionStatus: "reconnecting" }; // upravo izašao
const human: P = { id: "b", connectionStatus: "connected" };
const bot: P = { id: "c", isBot: true, connectionStatus: "connected" };

const gs = (phase: GamePhase, players: P[]) => ({ phase, players }) as Parameters<typeof afterLeave>[0];

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
