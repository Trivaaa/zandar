import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { seatToLeave } from "./roomSwitch";

describe("seatToLeave", () => {
  test("prva pretplata: nema šta da se napusti", () => {
    assert.equal(seatToLeave({}, { roomId: "b", playerId: "pb" }), null);
  });

  test("ponovna pretplata na isto sjedište (reconnect): ništa", () => {
    assert.equal(
      seatToLeave({ roomId: "a", playerId: "pa" }, { roomId: "a", playerId: "pa" }),
      null,
    );
  });

  test("druga soba: napušta staro sjedište", () => {
    assert.deepEqual(
      seatToLeave({ roomId: "a", playerId: "pa" }, { roomId: "b", playerId: "pb" }),
      { roomId: "a", playerId: "pa" },
    );
  });

  test("ista soba, drugo sjedište: napušta staro", () => {
    assert.deepEqual(
      seatToLeave({ roomId: "a", playerId: "p1" }, { roomId: "a", playerId: "p2" }),
      { roomId: "a", playerId: "p1" },
    );
  });

  test("smeće u socket.data se ignoriše", () => {
    assert.equal(
      seatToLeave({ roomId: 42, playerId: null }, { roomId: "b", playerId: "pb" }),
      null,
    );
  });
});
