import { test } from "node:test";
import assert from "node:assert/strict";

import {
  checkNickname,
  NICKNAME_CHANGE_INTERVAL_MS,
  nicknameChangeAllowedAt,
  parseProfileAvatar,
  PROFILE_AVATARS,
  suggestNicknameFromGuestName,
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

test("razmak u sredini, drugi znakovi i druga pisma se odbijaju — sa prvim lošim znakom", () => {
  const cyrillicA = "Mаrko"; // ćirilično „а" umjesto latiničnog
  const cases: [string, string][] = [
    ["Marko Polo", " "],
    ["marko-polo", "-"],
    ["marko@x", "@"],
    ["emoji😀x", "😀"],
    ["марко", "м"],
    [cyrillicA, "а"],
    ["a\tb.c", "\t"],
    ["a b", " "], // znak ima prednost pred dužinom
  ];
  for (const [bad, char] of cases) {
    assert.deepEqual(checkNickname(bad), { ok: false, problem: "invalid_chars", char }, bad);
  }
  for (const notString of [undefined, null, 42, {}, ["abc"]]) {
    assert.deepEqual(checkNickname(notString), { ok: false, problem: "invalid_chars" });
  }
});

test("K7: ime gosta → prijedlog nadimka", () => {
  assert.deepEqual(suggestNicknameFromGuestName("Marko Polo"), {
    nickname: "Marko_Polo",
    changes: ["space"],
  });
  assert.deepEqual(suggestNicknameFromGuestName("Љубиша Џаковић"), {
    nickname: "Ljubiša_Džaković",
    changes: ["cyrillic", "space"],
  });
  assert.deepEqual(suggestNicknameFromGuestName("Marko 🃏!"), {
    nickname: "Marko_",
    changes: ["space", "removed"],
  });
  assert.deepEqual(suggestNicknameFromGuestName("Aleksandar Aleksić"), {
    nickname: "Aleksandar_Aleks",
    changes: ["space", "shortened"],
  });
  assert.deepEqual(suggestNicknameFromGuestName("Zvonko"), { nickname: "Zvonko", changes: [] });
  // Ništa upotrebljivo → prazno polje (K4), ne „Ma".
  assert.equal(suggestNicknameFromGuestName("Ma!").nickname, "");
  assert.equal(suggestNicknameFromGuestName("😀😀😀").nickname, "");
  // Svaki neprazan prijedlog prolazi pravila.
  for (const name of ["Љубиша Џаковић", "Marko Polo", "Ana-Marija"]) {
    assert.equal(checkNickname(suggestNicknameFromGuestName(name).nickname).ok, true, name);
  }
});

test("avatar naloga: samo 10 id-jeva sa liste", () => {
  assert.equal(PROFILE_AVATARS.length, 10);
  for (const a of PROFILE_AVATARS) assert.equal(parseProfileAvatar(a), a);
  assert.equal(parseProfileAvatar("sova"), "sova");
  // Stari id-jevi (a1–a10), krivo slovo, dijakritika i putanja ne prolaze.
  for (const bad of ["a1", "a4", "Sova", "jež", "../sova", "sova.svg", "", null, 4]) {
    assert.equal(parseProfileAvatar(bad), null);
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
