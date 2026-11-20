import assert from "node:assert/strict";
import { test } from "node:test";

import { isConnectionLost } from "./connection";

test("pregledač offline = prekid, i dok socket još misli da je povezan", () => {
  assert.equal(isConnectionLost({ browserOnline: false, socketStatus: "connected" }), true);
});

test("socket pao ili greška = prekid", () => {
  assert.equal(isConnectionLost({ browserOnline: true, socketStatus: "disconnected" }), true);
  assert.equal(isConnectionLost({ browserOnline: true, socketStatus: "error" }), true);
});

test("povezan ili prvo spajanje = nije prekid", () => {
  assert.equal(isConnectionLost({ browserOnline: true, socketStatus: "connected" }), false);
  assert.equal(isConnectionLost({ browserOnline: true, socketStatus: "connecting" }), false);
});
