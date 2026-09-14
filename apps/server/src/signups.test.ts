import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { normalizeEmail } from "@zandar/shared-types";

import {
  listSignups,
  removeSignupsForEmail,
  saveSignup,
  SIGNUP_MAX_AGE_MS,
  sweepExpiredSignups,
  signupId,
  signupsToCsv,
  tokenMatches,
  type SignupRecord,
} from "./signups";

const record = (over: Partial<SignupRecord> = {}): SignupRecord => ({
  game: "poker",
  email: "ime@primjer.com",
  consentTextId: "signup-consent-2026-09",
  consentedAt: 1_789_000_000_000,
  createdAt: 1_789_000_000_000,
  ...over,
});

describe("normalizeEmail", () => {
  test("trim i mala slova", () => {
    assert.equal(normalizeEmail("  Ime.Prezime@Primjer.COM "), "ime.prezime@primjer.com");
  });

  test("zadržava tačke i +tag (bez Gmail pravila)", () => {
    assert.equal(normalizeEmail("i.m.e+zandar@gmail.com"), "i.m.e+zandar@gmail.com");
  });

  test("odbija očigledne ne-adrese", () => {
    for (const bad of ["", "ime", "@primjer.com", "ime@", "ime@primjer", "ime@@primjer.com", "i me@primjer.com", "ime@primjer..com", "ime@.com", 42, null, undefined]) {
      assert.equal(normalizeEmail(bad), null, String(bad));
    }
  });

  test("odbija preko 254 znaka", () => {
    assert.equal(normalizeEmail(`${"a".repeat(60)}@${"b".repeat(200)}.com`), null);
  });
});

describe("signupId", () => {
  test("ista adresa i igra = isti ključ; druga igra = drugi", () => {
    assert.equal(signupId("ime@primjer.com", "poker"), signupId("ime@primjer.com", "poker"));
    assert.notEqual(signupId("ime@primjer.com", "poker"), signupId("ime@primjer.com", "remi"));
  });

  test("adresa se ne vidi u ključu", () => {
    assert.ok(!signupId("ime@primjer.com", "poker").includes("ime"));
  });
});

describe("saveSignup", () => {
  let dir: string;
  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "signups-"));
  });
  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("prva prijava upisuje, ponovljena je idempotentna", async () => {
    assert.deepEqual(await saveSignup(record(), dir), { created: true });
    assert.deepEqual(await saveSignup(record({ createdAt: 1_789_000_999_000 }), dir), { created: false });
    const saved = await listSignups(dir);
    assert.equal(saved.length, 1);
    assert.equal(saved[0]?.createdAt, 1_789_000_000_000, "ponovljena prijava ne prepisuje prvu");
  });

  test("ista adresa smije na drugu igru", async () => {
    assert.deepEqual(await saveSignup(record({ game: "bela" }), dir), { created: true });
    assert.equal((await listSignups(dir)).length, 2);
  });

  test("trka: 20 istovremenih identičnih zahtjeva = tačno jedan upis", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => saveSignup(record({ game: "raub" }), dir)),
    );
    assert.equal(results.filter((r) => r.created).length, 1);
    const files = await readdir(dir);
    assert.equal(files.filter((f) => f.endsWith(".tmp")).length, 0, "nema zaostalih .tmp");
    assert.equal((await listSignups(dir)).filter((r) => r.game === "raub").length, 1);
  });
});

describe("signupsToCsv", () => {
  test("zaglavlje, tekst saglasnosti i ISO vrijeme", () => {
    const csv = signupsToCsv([record()]);
    const [header, row] = csv.trim().split("\n");
    assert.equal(header, '"game","email","consentTextId","consentText","consentedAt","createdAt"');
    assert.ok(row?.includes('"Pristajem da mi pošaljete obavještenje o ranom pristupu u ovu igru."'));
    assert.ok(row?.includes(new Date(1_789_000_000_000).toISOString()));
  });

  test("navodnici i formule ne probijaju ćeliju", () => {
    const csv = signupsToCsv([record({ email: '=cmd"x@primjer.com' })]);
    assert.ok(csv.includes(`"'=cmd""x@primjer.com"`));
  });
});

describe("tokenMatches", () => {
  test("isti token prolazi, drugi i drugačije dužine ne", () => {
    assert.equal(tokenMatches("tajna-123", "tajna-123"), true);
    assert.equal(tokenMatches("tajna-124", "tajna-123"), false);
    assert.equal(tokenMatches("t", "tajna-123"), false);
  });
});

describe("brisanje prijava", () => {
  let dir: string;
  before(async () => {
    dir = await mkdtemp(join(tmpdir(), "signups-del-"));
  });
  after(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  test("istek: briše samo starije od roka", async () => {
    const now = 1_800_000_000_000;
    await saveSignup(record({ email: "stara@primjer.com", createdAt: now - SIGNUP_MAX_AGE_MS - 1 }), dir);
    await saveSignup(record({ email: "granica@primjer.com", createdAt: now - SIGNUP_MAX_AGE_MS }), dir);
    await saveSignup(record({ email: "nova@primjer.com", createdAt: now - 1000 }), dir);
    assert.equal(await sweepExpiredSignups(now, dir), 1);
    assert.deepEqual((await listSignups(dir)).map((r) => r.email).sort(), ["granica@primjer.com", "nova@primjer.com"]);
  });

  test("na zahtjev: sve igre jedne adrese, tuđe ostaju", async () => {
    await saveSignup(record({ email: "igrac@primjer.com", game: "poker" }), dir);
    await saveSignup(record({ email: "igrac@primjer.com", game: "bela" }), dir);
    await saveSignup(record({ email: "drugi@primjer.com", game: "poker" }), dir);
    assert.equal(await removeSignupsForEmail("igrac@primjer.com", dir), 2);
    const left = (await listSignups(dir)).map((r) => r.email);
    assert.ok(!left.includes("igrac@primjer.com"));
    assert.ok(left.includes("drugi@primjer.com"));
    assert.equal(await removeSignupsForEmail("igrac@primjer.com", dir), 0, "ponovljeno brisanje je bezopasno");
  });
});
