import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { CHECK_INTERVAL_MS, checkDue, decideUpdate, type UpdateInfo } from "./appUpdate";

const NOW = 1_800_000_000_000;
const base: UpdateInfo = {
  available: true,
  currentVersionCode: 9,
  availableVersionCode: 10,
  flexibleAllowed: true,
  immediateAllowed: true,
  downloaded: false,
};

describe("decideUpdate", () => {
  test("nema novije verzije (ili nije sa Play-a) → none", () => {
    assert.equal(decideUpdate({ available: false, currentVersionCode: 0 }, 0, 0, NOW), "none");
    assert.equal(decideUpdate({ ...base, available: false }, 50, 0, NOW), "none");
  });

  test("novija postoji → offer", () => {
    assert.equal(decideUpdate(base, 0, 0, NOW), "offer");
  });

  test("„Ne sada” drži ponudu dok traje odgoda", () => {
    assert.equal(decideUpdate(base, 0, NOW + 1, NOW), "none");
    assert.equal(decideUpdate(base, 0, NOW - 1, NOW), "offer");
  });

  test("ispod minimuma → force, i dok traje odgoda", () => {
    assert.equal(decideUpdate(base, 10, 0, NOW), "force");
    assert.equal(decideUpdate(base, 10, NOW + 1, NOW), "force");
  });

  test("na minimumu ili iznad → nema prisile", () => {
    assert.equal(decideUpdate(base, 9, 0, NOW), "offer");
  });

  test("Play ne dozvoljava immediate → obična ponuda, ne zaključavanje", () => {
    assert.equal(decideUpdate({ ...base, immediateAllowed: false }, 10, 0, NOW), "offer");
  });

  test("ni flexible ni prisila → none", () => {
    assert.equal(decideUpdate({ ...base, flexibleAllowed: false }, 0, 0, NOW), "none");
  });

  test("nepoznata trenutna verzija (0) nikad ne traži prisilu", () => {
    assert.equal(decideUpdate({ ...base, currentVersionCode: 0 }, 10, 0, NOW), "offer");
  });

  test("preuzeto → restart, i dok traje odgoda", () => {
    assert.equal(decideUpdate({ ...base, downloaded: true }, 0, NOW + 1, NOW), "restart");
  });
});

describe("checkDue", () => {
  test("prvi put i poslije razmaka → da", () => {
    assert.equal(checkDue(0, NOW), true);
    assert.equal(checkDue(NOW - CHECK_INTERVAL_MS, NOW), true);
  });

  test("unutar razmaka → ne", () => {
    assert.equal(checkDue(NOW - 1000, NOW), false);
  });

  test("sat vraćen unazad (zapis iz budućnosti) → da", () => {
    assert.equal(checkDue(NOW + 60_000, NOW), true);
  });
});
