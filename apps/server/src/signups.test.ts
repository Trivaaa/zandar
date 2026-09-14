import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, test } from "node:test";

import { normalizeEmail } from "@zandar/shared-types";

import {
  listSignups,
  saveSignup,
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
