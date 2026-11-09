import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { pickShareChannel, shareInvite, type ShareEnv } from "./share";
import { sr } from "./sr";

const INPUT = { title: "Pozivnica za Žandar", text: "Zvonko te zove… https://k.com/room/a1", url: "https://k.com/room/a1" };

/** Okolina koja bilježi šta je pozvano. */
function env(over: Partial<ShareEnv> & { fail?: unknown } = {}) {
  const calls = { web: [] as unknown[], native: [] as unknown[], copied: [] as string[] };
  const thrower = async (d: unknown, into: unknown[]) => {
    into.push(d);
    if (over.fail !== undefined) throw over.fail;
  };
  const e: ShareEnv = {
    native: over.native ?? false,
    webShare: "webShare" in over ? over.webShare : (d) => thrower(d, calls.web),
    nativeShare: (d) => thrower(d, calls.native),
    copy: async (t) => void calls.copied.push(t),
  };
  return { e, calls };
}

describe("pickShareChannel", () => {
  test("aplikacija uvijek ide preko nativnog plugina (WebView nema navigator.share)", () => {
    assert.equal(pickShareChannel({ native: true, hasWebShare: false }), "native");
    assert.equal(pickShareChannel({ native: true, hasWebShare: true }), "native");
  });
  test("web sa dijeljenjem → navigator.share, bez → kopiranje", () => {
    assert.equal(pickShareChannel({ native: false, hasWebShare: true }), "web");
    assert.equal(pickShareChannel({ native: false, hasWebShare: false }), "copy");
  });
});

describe("shareInvite", () => {
  test("web: šalje naslov i tekst sa linkom, bez zasebnog url-a", async () => {
    const { e, calls } = env();
    assert.equal(await shareInvite(INPUT, e), "shared");
    assert.deepEqual(calls.web, [{ title: INPUT.title, text: INPUT.text }]);
    assert.deepEqual(calls.copied, []);
  });

  test("aplikacija: nativni meni, ne navigator.share", async () => {
    const { e, calls } = env({ native: true });
    assert.equal(await shareInvite(INPUT, e), "shared");
    assert.equal(calls.native.length, 1);
    assert.equal(calls.web.length, 0);
  });

  test("bez dijeljenja (desktop Firefox) → link u clipboard", async () => {
    const { e, calls } = env({ webShare: undefined });
    assert.equal(await shareInvite(INPUT, e), "copied");
    assert.deepEqual(calls.copied, [INPUT.url]);
  });

  test("odustajanje iz menija → ništa, bez kopiranja", async () => {
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    const { e, calls } = env({ fail: abort });
    assert.equal(await shareInvite(INPUT, e), "cancelled");
    assert.deepEqual(calls.copied, []);
  });

  test("plugin „Share canceled\" u aplikaciji je isto odustajanje", async () => {
    const { e, calls } = env({ native: true, fail: new Error("Share canceled") });
    assert.equal(await shareInvite(INPUT, e), "cancelled");
    assert.deepEqual(calls.copied, []);
  });

  test("dijeljenje puklo → kopira, dugme nikad nije mrtvo", async () => {
    const { e, calls } = env({ fail: new Error("NotAllowedError") });
    assert.equal(await shareInvite(INPUT, e), "copied");
    assert.deepEqual(calls.copied, [INPUT.url]);
  });
});

describe("sr.share.msg — share.msg.a", () => {
  const link = "https://kartaonica.com/room/d0928a";
  test("4 igrača: dva na dva, množina riječima", () => {
    assert.equal(
      sr.share.msg("zandar", "Zvonko", 4, 3, link),
      `Zvonko te zove na partiju Žandara 🃏 Igramo dva na dva, fale još tri. Ništa ne instaliraš, samo otvori: ${link}`,
    );
    assert.match(sr.share.msg("zandar", "Zvonko", 4, 2, link), /fale još dva\./);
    assert.match(sr.share.msg("zandar", "Zvonko", 4, 1, link), /fali još jedan\./);
  });
  test("2 igrača: jedan na jedan, fali još jedan", () => {
    assert.match(sr.share.msg("zandar", "Ana", 2, 1, link), /^Ana te zove .* Igramo jedan na jedan, fali još jedan\./);
  });
  test("Raub i Poker: ime igre, bez timova (QA 2026-11-09 B2)", () => {
    assert.equal(
      sr.share.msg("raub", "Ana", 3, 2, link),
      `Ana te zove na partiju Rauba 🃏 Igramo u troje, fale još dva. Ništa ne instaliraš, samo otvori: ${link}`,
    );
    assert.match(sr.share.msg("raub", "Ana", 4, 3, link), /Igramo u četvoro,/);
    assert.match(sr.share.msg("poker", "Ana", 2, 1, link), /^Ana te zove na partiju Pokera 🃏 Igramo jedan na jedan,/);
    assert.equal(sr.share.title("raub"), "Pozivnica za Raub");
  });
  test("Žandar u troje nije dva na dva", () => {
    assert.match(sr.share.msg("zandar", "Ana", 3, 1, link), /Igramo u troje,/);
  });
  test("red ispod naslova lobija i pozivnice po igri (B1)", () => {
    assert.equal(sr.lobby.metaFor("raub", 1, 2, 21), "1 / 2 igrača · Raub · od 21 do 0");
    assert.equal(sr.lobby.metaFor("poker", 1, 3, 0), "1 / 3 igrača · Poker · 100 žetona");
    assert.equal(sr.lobby.metaFor("zandar", 2, 4, 21), "2 / 4 igrača · 21 poena");
    assert.equal(sr.join.inviteTail("raub"), "te poziva na partiju Rauba");
  });
  test("link je na kraju poruke (pregled u Viberu/WhatsAppu)", () => {
    assert.ok(sr.share.msg("zandar", "Ana", 2, 1, link).endsWith(link));
  });
});
