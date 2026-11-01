import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { installAttribution, roomIdFromReferrer } from "./installReferrer";

describe("installAttribution", () => {
  test("instalacija sa oglasa", () => {
    assert.deepEqual(
      installAttribution("utm_source=facebook&utm_medium=paid_social&utm_campaign=zandar_boost_01"),
      {
        has_room: false,
        utm_source: "facebook",
        utm_medium: "paid_social",
        utm_campaign: "zandar_boost_01",
      },
    );
  });

  test("organska instalacija se razlikuje od oglasa", () => {
    assert.deepEqual(installAttribution("utm_source=google-play&utm_medium=organic"), {
      has_room: false,
      utm_source: "google-play",
      utm_medium: "organic",
    });
  });

  test("pozivnica: soba se računa, a njen id ne ide u analitiku", () => {
    assert.deepEqual(installAttribution("room=c99edf"), { has_room: true });
  });

  test("bez referrera", () => {
    assert.deepEqual(installAttribution(undefined), { has_room: false });
  });
});

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
