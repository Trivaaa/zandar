import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { roomIdFromReferrer } from "./installReferrer";

describe("roomIdFromReferrer", () => {
  test("soba iz pozivnice", () => {
    assert.equal(roomIdFromReferrer("room=c99edf"), "c99edf");
    assert.equal(roomIdFromReferrer("utm_source=invite&room=c99edf"), "c99edf");
  });

  test("organska instalacija i prazno", () => {
    assert.equal(roomIdFromReferrer("utm_source=google-play&utm_medium=organic"), null);
    assert.equal(roomIdFromReferrer(""), null);
    assert.equal(roomIdFromReferrer(null), null);
    assert.equal(roomIdFromReferrer(undefined), null);
  });

  test("referrer je tuđi ulaz — nevaljan id se odbija", () => {
    assert.equal(roomIdFromReferrer("room=../../x"), null);
    assert.equal(roomIdFromReferrer("room=a b"), null);
    assert.equal(roomIdFromReferrer("room=" + "a".repeat(33)), null);
    assert.equal(roomIdFromReferrer("room="), null);
  });
});
