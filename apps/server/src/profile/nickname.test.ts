import { test } from "node:test";
import assert from "node:assert/strict";

import {
  checkNickname,
  NICKNAME_CHANGE_INTERVAL_MS,
  nicknameChangeAllowedAt,
} from "@zandar/shared-types";

/**
 * Pravila nadimka žive u `shared-types` (dijele ih forma i server), a testovi
 * ovdje: taj paket nema svoj pokretač testova.
 */

test("ispravan nadimak: skraćeni razmaci, prikaz i ključ malim slovima", () => {
  assert.deepEqual(checkNickname("  Marko_92  "), {
    ok: true,
    nickname: "Marko_92",
    key: "marko_92",
  });
  assert.deepEqual(checkNickname("ŽĆČŠĐ.x"), { ok: true, nickname: "ŽĆČŠĐ.x", key: "žćčšđ.x" });
  assert.equal(checkNickname("abc").ok, true);
  assert.equal(checkNickname("a".repeat(16)).ok, true);
});

test("velika i mala slova daju isti ključ jedinstvenosti", () => {
  const a = checkNickname("Čedo");
  const b = checkNickname("ČEDO");
  assert.ok(a.ok && b.ok);
  assert.equal(a.key, b.key);
  // Bez dijakritika je DRUGI nadimak — spec traži samo neosjetljivost na veličinu.
  const c = checkNickname("Cedo");
  assert.ok(c.ok && c.key !== a.key);
});

test("dužina se mjeri poslije skraćivanja razmaka", () => {
  assert.deepEqual(checkNickname("ab"), { ok: false, problem: "too_short" });
  assert.deepEqual(checkNickname("  ab  "), { ok: false, problem: "too_short" });
  assert.deepEqual(checkNickname(""), { ok: false, problem: "too_short" });
  assert.deepEqual(checkNickname("a".repeat(17)), { ok: false, problem: "too_long" });
});

test("razmak u sredini, drugi znakovi i druga pisma se odbijaju", () => {
  const cyrillicA = "Mаrko"; // ćirilično „а" umjesto latiničnog
  for (const bad of ["Marko Polo", "marko-polo", "marko@x", "emoji😀x", "марко", cyrillicA, "a\tb.c"]) {
    assert.deepEqual(checkNickname(bad), { ok: false, problem: "invalid_chars" }, bad);
  }
  for (const notString of [undefined, null, 42, {}, ["abc"]]) {
    assert.deepEqual(checkNickname(notString), { ok: false, problem: "invalid_chars" });
  }
});

test("razloženi dijakritik se sastavlja prije provjere", () => {
  const decomposed = "čedo"; // c + kombinovana kvačica
  assert.deepEqual(checkNickname(decomposed), { ok: true, nickname: "čedo", key: "čedo" });
});

test("promjena nadimka: jednom u 30 dana", () => {
  const changed = 1_000_000;
  assert.equal(nicknameChangeAllowedAt(null, changed), null);
  assert.equal(nicknameChangeAllowedAt(undefined, changed), null);
  assert.equal(nicknameChangeAllowedAt(changed, changed + 1), changed + NICKNAME_CHANGE_INTERVAL_MS);
  assert.equal(nicknameChangeAllowedAt(changed, changed + NICKNAME_CHANGE_INTERVAL_MS), null);
});
