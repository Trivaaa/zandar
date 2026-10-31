import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, test } from "node:test";

import Fastify from "fastify";
import { CURRENT_CONSENT_TEXT_ID } from "@zandar/shared-types";

import { registerSignupListRoute, saveSignup } from "./signups";

const TOKEN = "tajni-token";
const originalToken = process.env.ADMIN_TOKEN;
let dir: string;

async function setup() {
  const app = Fastify();
  registerSignupListRoute(app, () => dir);
  await app.ready();
  return app;
}

const get = async (authorization?: string) => {
  const app = await setup();
  const res = await app.inject({ method: "GET", url: "/api/signups", ...(authorization ? { headers: { authorization } } : {}) });
  await app.close();
  return res;
};

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "signup-routes-"));
  process.env.ADMIN_TOKEN = TOKEN;
  await saveSignup({ game: "poker", email: "ana@primjer.com", consentTextId: CURRENT_CONSENT_TEXT_ID, consentedAt: 10, createdAt: 10 }, dir);
});

afterEach(async () => {
  if (originalToken === undefined) delete process.env.ADMIN_TOKEN;
  else process.env.ADMIN_TOKEN = originalToken;
  await rm(dir, { recursive: true, force: true });
});

describe("GET /api/signups", () => {
  test("bez tokena: 404, bez adresa", async () => {
    const res = await get();
    assert.equal(res.statusCode, 404);
    assert.ok(!res.body.includes("ana@primjer.com"));
  });

  test("pogrešan token: isti 404", async () => {
    const res = await get("Bearer pogresan");
    assert.equal(res.statusCode, 404);
    assert.ok(!res.body.includes("ana@primjer.com"));
  });

  test("server bez ADMIN_TOKEN-a: 404", async () => {
    delete process.env.ADMIN_TOKEN;
    assert.equal((await get("Bearer ")).statusCode, 404);
    assert.equal((await get(`Bearer ${TOKEN}`)).statusCode, 404);
  });

  test("ispravan token: samo polja pregleda, bez keširanja", async () => {
    const res = await get(`Bearer ${TOKEN}`);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers["cache-control"], "no-store");
    assert.deepEqual(res.json(), { signups: [{ game: "poker", email: "ana@primjer.com", createdAt: 10 }] });
  });

  test("token u URL-u se ne prihvata", async () => {
    const app = await setup();
    const res = await app.inject({ method: "GET", url: `/api/signups?token=${TOKEN}` });
    await app.close();
    assert.equal(res.statusCode, 404);
  });
});
