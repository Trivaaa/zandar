import assert from "node:assert/strict";
import { describe, test } from "node:test";

import Fastify from "fastify";

import { parseMinVersionCode, registerAppConfigRoute } from "./appConfig";

async function fetchConfig(env: string | undefined) {
  const app = Fastify();
  registerAppConfigRoute(app, () => env);
  await app.ready();
  const res = await app.inject({ method: "GET", url: "/api/app-config" });
  await app.close();
  return res;
}

describe("parseMinVersionCode", () => {
  test("broj prolazi", () => {
    assert.equal(parseMinVersionCode("8"), 8);
    assert.equal(parseMinVersionCode(" 12 "), 12);
  });

  test("bez env-a ili neispravno → 0 (nema prisile)", () => {
    for (const raw of [undefined, "", "abc", "-3", "1.5", "8x", "99999999999999999999"]) {
      assert.equal(parseMinVersionCode(raw), 0, `vrijednost: ${raw}`);
    }
  });
});

describe("GET /api/app-config", () => {
  test("vraća minimalnu verziju iz env-a", async () => {
    const res = await fetchConfig("9");
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { android: { minVersionCode: 9 } });
  });

  test("bez env-a → 0", async () => {
    const res = await fetchConfig(undefined);
    assert.deepEqual(res.json(), { android: { minVersionCode: 0 } });
  });
});
