import assert from "node:assert/strict";
import { describe, test } from "node:test";

import Fastify from "fastify";

import { trustFirstHop } from "./trustProxy";

/** `request.ip` kako ga vidi pravi Fastify sa našom postavkom. */
async function ipFor(remoteAddress: string, forwardedFor?: string): Promise<string> {
  const app = Fastify({ trustProxy: trustFirstHop });
  app.get("/ip", async (request) => ({ ip: request.ip }));
  const res = await app.inject({
    method: "GET",
    url: "/ip",
    remoteAddress,
    headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {},
  });
  await app.close();
  return (res.json() as { ip: string }).ip;
}

describe("trustFirstHop", () => {
  test("iza proxyja: ip je adresa koju je proxy dopisao", async () => {
    assert.equal(await ipFor("10.0.0.5", "203.0.113.7"), "203.0.113.7");
  });

  test("klijent ne može podmetnuti adresu — vrijedi samo zadnji unos", async () => {
    // Klijent pošalje lažni X-Forwarded-For; proxy na kraj dopiše pravu adresu.
    assert.equal(await ipFor("10.0.0.5", "1.2.3.4, 203.0.113.7"), "203.0.113.7");
  });

  test("dva igrača iza istog proxyja NE dijele ip (rate-limit po igraču)", async () => {
    const a = await ipFor("10.0.0.5", "203.0.113.7");
    const b = await ipFor("10.0.0.5", "198.51.100.9");
    assert.notEqual(a, b);
  });

  test("bez zaglavlja (lokalno) ip je adresa konekcije", async () => {
    assert.equal(await ipFor("192.168.1.20"), "192.168.1.20");
  });
});
