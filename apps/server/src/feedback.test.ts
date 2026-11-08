import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import Fastify from "fastify";
import { FEEDBACK_LIMITS } from "@zandar/shared-types";

import {
  buildFeedbackMail,
  FEEDBACK_MAX_AGE_MS,
  feedbackToCsv,
  listFeedback,
  parseFeedback,
  registerFeedbackRoutes,
  saveFeedback,
  sniffImage,
  sweepExpiredFeedback,
  type FeedbackRecord,
} from "./feedback";
import type { Mail } from "./mail/resend";
import { SlidingWindowLimiter } from "./rateLimit";

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBPVP8 ")]);
const dataUrl = (bytes: Buffer, mime = "image/jpeg") => `data:${mime};base64,${bytes.toString("base64")}`;

const valid = (over: Record<string, unknown> = {}) => ({ kind: "bug", text: "Karte se ne vide", ...over });

const record = (over: Partial<FeedbackRecord> = {}): FeedbackRecord => ({
  id: "20261108-120000-abcd1234",
  kind: "bug",
  text: "Kad se karte dijele drugi put, moja ruka se ne vidi",
  platform: "android",
  createdAt: 1_789_000_000_000,
  attachments: [],
  ...over,
});

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "feedback-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("sniffImage", () => {
  test("prepoznaje jpg, png, webp po bajtovima", () => {
    assert.equal(sniffImage(JPEG), "jpg");
    assert.equal(sniffImage(PNG), "png");
    assert.equal(sniffImage(WEBP), "webp");
  });
  test("odbija sve ostalo", () => {
    assert.equal(sniffImage(Buffer.from("<svg onload=alert(1)>")), null);
    assert.equal(sniffImage(Buffer.alloc(0)), null);
  });
});

describe("parseFeedback", () => {
  test("ispravan minimum", () => {
    const res = parseFeedback(valid());
    assert.ok(res.ok);
    assert.equal(res.value.kind, "bug");
    assert.equal(res.value.platform, "web");
    assert.deepEqual(res.value.images, []);
    assert.equal(res.value.email, undefined);
  });

  test("nepoznata vrsta, prazan i predug tekst", () => {
    assert.equal(parseFeedback(valid({ kind: "spam" })).ok, false);
    assert.equal(parseFeedback(valid({ text: "   " })).ok, false);
    assert.equal(parseFeedback(valid({ text: "x".repeat(FEEDBACK_LIMITS.textMax + 1) })).ok, false);
    assert.equal(parseFeedback(null).ok, false);
  });

  test("e-mail: prazan je bez adrese, loš je greška, dobar se normalizuje", () => {
    const empty = parseFeedback(valid({ email: "  " }));
    assert.ok(empty.ok && empty.value.email === undefined);
    assert.equal(parseFeedback(valid({ email: "nije-adresa" })).ok, false);
    const good = parseFeedback(valid({ email: " Ana@Primjer.com " }));
    assert.ok(good.ok && good.value.email === "ana@primjer.com");
  });

  test("slike: do 3, samo prave slike, ne prevelike", () => {
    const three = parseFeedback(valid({ images: [dataUrl(JPEG), dataUrl(PNG, "image/png"), dataUrl(WEBP, "image/webp")] }));
    assert.ok(three.ok);
    assert.deepEqual(three.value.images.map((i) => i.ext), ["jpg", "png", "webp"]);

    assert.equal(parseFeedback(valid({ images: Array(4).fill(dataUrl(JPEG)) })).ok, false);
    // MIME laže: piše jpeg, a unutra je tekst.
    assert.equal(parseFeedback(valid({ images: [dataUrl(Buffer.from("<html>"))] })).ok, false);
    assert.equal(parseFeedback(valid({ images: ["data:image/svg+xml;base64,PHN2Zz4="] })).ok, false);
    assert.equal(parseFeedback(valid({ images: "nije niz" })).ok, false);
    const big = Buffer.concat([JPEG, Buffer.alloc(FEEDBACK_LIMITS.imageBytesMax)]);
    assert.equal(parseFeedback(valid({ images: [dataUrl(big)] })).ok, false);
  });

  test("meta polja se čiste i skraćuju", () => {
    const res = parseFeedback(valid({ userAgent: "Mozilla\n\u0000X".padEnd(1000, "a"), appVersion: "1.2.0", platform: "native" }));
    assert.ok(res.ok);
    assert.ok(!res.value.userAgent?.includes("\n"));
    assert.ok(!res.value.userAgent?.includes("\u0000"));
    assert.ok((res.value.userAgent?.length ?? 0) <= 400);
    assert.equal(res.value.appVersion, "1.2.0");
    assert.equal(res.value.platform, "android");
  });
});

describe("disk", () => {
  test("upis: prilozi pa zapis, čitanje sortirano", async () => {
    await saveFeedback(record({ id: "b", createdAt: 2 }), [], dir);
    const saved = await saveFeedback(record({ id: "a", createdAt: 1 }), [{ ext: "jpg", bytes: JPEG }], dir);
    assert.deepEqual(saved.attachments, ["a-1.jpg"]);
    assert.deepEqual((await listFeedback(dir)).map((r) => r.id), ["a", "b"]);
    assert.deepEqual((await readdir(dir)).sort(), ["a-1.jpg", "a.json", "b.json"]);
  });

  test("istek briše zapis i priloge, svjež ostaje", async () => {
    const now = 10 * FEEDBACK_MAX_AGE_MS;
    await saveFeedback(record({ id: "star", createdAt: now - FEEDBACK_MAX_AGE_MS - 1 }), [{ ext: "png", bytes: PNG }], dir);
    await saveFeedback(record({ id: "nov", createdAt: now - 1000 }), [], dir);
    assert.equal(await sweepExpiredFeedback(now, dir), 1);
    assert.deepEqual(await readdir(dir), ["nov.json"]);
  });
});

describe("feedbackToCsv", () => {
  test("navodnici i zaštita od formula", () => {
    const csv = feedbackToCsv([record({ text: '=HYPERLINK("x")', email: "a@b.co" })]);
    assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`));
    assert.ok(csv.includes('"a@b.co"'));
  });
});

describe("buildFeedbackMail", () => {
  test("naslov po vrsti, Reply-To samo sa adresom, prilozi po imenu", () => {
    const mail = buildFeedbackMail(
      record({ email: "ana@primjer.com", nickname: "Ana", uid: "u1", attachments: ["x-1.jpg"], text: "a".repeat(100) }),
      "vlasnik@primjer.com",
      [{ ext: "jpg", bytes: JPEG }],
    );
    assert.equal(mail.to, "vlasnik@primjer.com");
    assert.ok(mail.subject.startsWith("[Kartaonica · Greška] "));
    assert.ok(mail.subject.endsWith("…"));
    assert.equal(mail.replyTo, "ana@primjer.com");
    assert.ok(mail.text.includes("Nalog: Ana (u1)"));
    assert.equal(mail.attachments[0]?.filename, "x-1.jpg");

    const anon = buildFeedbackMail(record({ kind: "praise" }), "v@p.com", []);
    assert.equal(anon.replyTo, undefined);
    assert.ok(anon.subject.startsWith("[Kartaonica · Pohvala]"));
    assert.ok(anon.text.includes("Nalog: gost"));
  });
});

describe("POST /api/feedback", () => {
  const originalToken = process.env.ADMIN_TOKEN;
  afterEach(() => {
    if (originalToken === undefined) delete process.env.ADMIN_TOKEN;
    else process.env.ADMIN_TOKEN = originalToken;
  });

  async function setup(opts: { to?: string; user?: { uid: string; nickname?: string }; ipLimit?: number } = {}) {
    const sent: Mail[] = [];
    const tracked: unknown[] = [];
    const app = Fastify();
    registerFeedbackRoutes(app, {
      dir: () => dir,
      mailer: {
        send: async (mail) => {
          sent.push(mail);
          return "sent";
        },
      },
      to: () => opts.to,
      resolveUser: async (auth) => (auth && opts.user ? opts.user : null),
      track: (_g, props) => tracked.push(props),
      limits: {
        ip: new SlidingWindowLimiter(opts.ipLimit ?? 10, 60_000),
        guest: new SlidingWindowLimiter(5, 60_000),
      },
      now: () => 1_789_000_000_000,
    });
    await app.ready();
    const post = (payload: unknown, headers: Record<string, string> = {}) =>
      app.inject({ method: "POST", url: "/api/feedback", payload: payload as object, headers });
    return { app, sent, tracked, post };
  }

  test("ispravan utisak: 200, zapis na disku, mejl sa prilogom, analitika bez teksta", async () => {
    const { app, sent, tracked, post } = await setup({ to: "vlasnik@primjer.com", user: { uid: "u1", nickname: "Ana" } });
    const res = await post(valid({ email: "ana@primjer.com", images: [dataUrl(JPEG)] }), { authorization: "Bearer t" });
    assert.equal(res.statusCode, 200);
    const [saved] = await listFeedback(dir);
    assert.equal(saved?.uid, "u1");
    assert.equal(saved?.nickname, "Ana");
    assert.equal(saved?.attachments.length, 1);
    assert.equal(sent.length, 1);
    assert.equal(sent[0]?.replyTo, "ana@primjer.com");
    assert.equal(sent[0]?.attachments?.length, 1);
    assert.deepEqual(tracked, [{ kind: "bug", platform: "web", has_attachments: true, has_email: true }]);
    assert.ok(!JSON.stringify(tracked).includes("Karte"));
    await app.close();
  });

  test("bez primaoca: zapis ostaje, mejla nema", async () => {
    const { app, sent, post } = await setup();
    assert.equal((await post(valid())).statusCode, 200);
    assert.equal(sent.length, 0);
    assert.equal((await listFeedback(dir)).length, 1);
    await app.close();
  });

  test("uid ne dolazi iz tijela — samo iz provjerenog tokena", async () => {
    const { app, post } = await setup();
    await post(valid({ uid: "lažni", nickname: "Admin" }));
    const [saved] = await listFeedback(dir);
    assert.equal(saved?.uid, undefined);
    assert.equal(saved?.nickname, undefined);
    await app.close();
  });

  test("loše tijelo: 400 i ništa na disku", async () => {
    const { app, post } = await setup();
    assert.equal((await post(valid({ text: "" }))).statusCode, 400);
    assert.deepEqual(await readdir(dir), []);
    await app.close();
  });

  test("limit po IP-u: 429", async () => {
    const { app, post } = await setup({ ipLimit: 2 });
    assert.equal((await post(valid())).statusCode, 200);
    assert.equal((await post(valid())).statusCode, 200);
    assert.equal((await post(valid())).statusCode, 429);
    await app.close();
  });

  test("export: 404 bez tokena, CSV sa tokenom", async () => {
    process.env.ADMIN_TOKEN = "tajna";
    const { app, post } = await setup();
    await post(valid());
    const no = await app.inject({ method: "GET", url: "/api/feedback/export" });
    assert.equal(no.statusCode, 404);
    const yes = await app.inject({ method: "GET", url: "/api/feedback/export", headers: { authorization: "Bearer tajna" } });
    assert.equal(yes.statusCode, 200);
    assert.ok(yes.body.includes("Karte se ne vide"));
    await app.close();
  });

  test("brisanje: 404 bez tokena, po e-adresi briše zapis i priloge", async () => {
    process.env.ADMIN_TOKEN = "tajna";
    const { app, post } = await setup();
    await post(valid({ email: "ana@primjer.com", images: [dataUrl(JPEG)] }));
    await post(valid());
    const del = (payload: object, auth?: string) =>
      app.inject({ method: "DELETE", url: "/api/feedback", payload, ...(auth ? { headers: { authorization: auth } } : {}) });
    assert.equal((await del({ email: "ana@primjer.com" })).statusCode, 404);
    assert.equal((await del({}, "Bearer tajna")).statusCode, 400);
    const res = await del({ email: "Ana@Primjer.com" }, "Bearer tajna");
    assert.deepEqual(res.json(), { removed: 1 });
    assert.equal((await readdir(dir)).length, 1);
    const [left] = await listFeedback(dir);
    assert.deepEqual((await del({ id: left?.id ?? "" }, "Bearer tajna")).json(), { removed: 1 });
    assert.deepEqual(await readdir(dir), []);
    await app.close();
  });
});
