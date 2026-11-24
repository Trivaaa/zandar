import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { decideMatchEndAsk } from "./pushAsk";

describe("decideMatchEndAsk", () => {
  test("prva partija: odmah sistemski dijalog", () => {
    assert.equal(decideMatchEndAsk({ permission: "prompt", snoozed: false, directAsked: false }), "direct");
  });

  test("prva partija i kad je kartica odgođena negdje drugdje", () => {
    assert.equal(decideMatchEndAsk({ permission: "prompt", snoozed: true, directAsked: false }), "direct");
  });

  test("poslije direktnog pitanja: kartica", () => {
    assert.equal(decideMatchEndAsk({ permission: "prompt", snoozed: false, directAsked: true }), "card");
  });

  test("poslije direktnog pitanja i odgođene kartice: ništa", () => {
    assert.equal(decideMatchEndAsk({ permission: "prompt", snoozed: true, directAsked: true }), null);
  });

  test("dozvola riješena ili nije podržana: ništa", () => {
    for (const permission of ["granted", "denied", "unsupported"] as const) {
      assert.equal(decideMatchEndAsk({ permission, snoozed: false, directAsked: false }), null);
    }
  });
});
