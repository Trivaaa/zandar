import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { assignPushAskArm, decideMatchEndAsk, MATCH_END_CARD_MAX_SHOWS, PUSH_ASK_SOFT_SHARE } from "./pushAsk";

describe("decideMatchEndAsk", () => {
  test("prva partija: odmah sistemski dijalog", () => {
    assert.equal(decideMatchEndAsk({ permission: "prompt", snoozed: false, directAsked: false }), "direct");
    assert.equal(decideMatchEndAsk({ permission: "prompt", snoozed: false, directAsked: false, arm: "direct" }), "direct");
  });

  test("prva partija, grupa soft: list sa razlogom", () => {
    assert.equal(decideMatchEndAsk({ permission: "prompt", snoozed: false, directAsked: false, arm: "soft" }), "soft");
  });

  test("zadnja sistemska prilika se ne troši bez razloga: soft i u grupi direct", () => {
    assert.equal(
      decideMatchEndAsk({ permission: "prompt", rationale: true, snoozed: false, directAsked: false, arm: "direct" }),
      "soft",
    );
    assert.equal(decideMatchEndAsk({ permission: "prompt", rationale: true, snoozed: false, directAsked: false }), "soft");
  });

  test("prva partija i kad je kartica odgođena negdje drugdje", () => {
    assert.equal(decideMatchEndAsk({ permission: "prompt", snoozed: true, directAsked: false }), "direct");
    assert.equal(decideMatchEndAsk({ permission: "prompt", snoozed: true, directAsked: false, arm: "soft" }), "soft");
  });

  test("poslije prve prilike: kartica", () => {
    assert.equal(decideMatchEndAsk({ permission: "prompt", snoozed: false, directAsked: true }), "card");
    assert.equal(decideMatchEndAsk({ permission: "prompt", snoozed: false, directAsked: true, arm: "soft" }), "card");
  });

  test("poslije prve prilike i odgođene kartice: ništa", () => {
    assert.equal(decideMatchEndAsk({ permission: "prompt", snoozed: true, directAsked: true }), null);
  });

  test("kartica najviše jednom dnevno", () => {
    assert.equal(
      decideMatchEndAsk({ permission: "prompt", snoozed: false, directAsked: true, cardShows: 1, cardShownToday: true }),
      null,
    );
  });

  test("kartica najviše MATCH_END_CARD_MAX_SHOWS puta", () => {
    const base = { permission: "prompt", snoozed: false, directAsked: true, cardShownToday: false } as const;
    assert.equal(decideMatchEndAsk({ ...base, cardShows: MATCH_END_CARD_MAX_SHOWS - 1 }), "card");
    assert.equal(decideMatchEndAsk({ ...base, cardShows: MATCH_END_CARD_MAX_SHOWS }), null);
  });

  test("dozvola riješena ili nije podržana: ništa", () => {
    for (const permission of ["granted", "denied", "unsupported"] as const) {
      assert.equal(decideMatchEndAsk({ permission, snoozed: false, directAsked: false }), null);
      assert.equal(decideMatchEndAsk({ permission, snoozed: false, directAsked: false, arm: "soft" }), null);
    }
  });
});

describe("assignPushAskArm", () => {
  const fresh = { existing: null, permission: "prompt", directAsked: false } as const;

  test("nov uređaj: po udjelu", () => {
    assert.equal(assignPushAskArm({ ...fresh, random: 0 }), "soft");
    assert.equal(assignPushAskArm({ ...fresh, random: PUSH_ASK_SOFT_SHARE - 0.001 }), "soft");
    assert.equal(assignPushAskArm({ ...fresh, random: PUSH_ASK_SOFT_SHARE }), "direct");
    assert.equal(assignPushAskArm({ ...fresh, random: 0.99 }), "direct");
  });

  test("udio je config", () => {
    assert.equal(assignPushAskArm({ ...fresh, random: 0.5, share: 1 }), "soft");
    assert.equal(assignPushAskArm({ ...fresh, random: 0.5, share: 0 }), "direct");
  });

  test("postojeća grupa se ne mijenja", () => {
    assert.equal(assignPushAskArm({ ...fresh, existing: "direct", random: 0 }), "direct");
    assert.equal(assignPushAskArm({ ...fresh, existing: "soft", random: 0.99, directAsked: true }), "soft");
  });

  test("stari uređaj (prva prilika potrošena) ili riješena dozvola: van testa", () => {
    assert.equal(assignPushAskArm({ ...fresh, directAsked: true, random: 0 }), null);
    for (const permission of ["granted", "denied", "unsupported"] as const) {
      assert.equal(assignPushAskArm({ ...fresh, permission, random: 0 }), null);
    }
  });
});
