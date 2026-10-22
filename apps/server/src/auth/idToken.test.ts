import { test } from "node:test";
import assert from "node:assert/strict";
import { createSign, generateKeyPairSync, type KeyObject } from "node:crypto";

import {
  bearerToken,
  createIdTokenVerifier,
  FIREBASE_JWKS_URL,
  resolveFirebaseProjectId,
} from "./idToken";

const PROJECT = "kartaonica-staging";
const NOW_MS = 1_800_000_000_000;
const NOW_S = NOW_MS / 1000;

function keyPair() {
  return generateKeyPairSync("rsa", { modulusLength: 2048 });
}

const google = keyPair();
const attacker = keyPair();

function b64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(
  claims: Record<string, unknown>,
  opts: { key?: KeyObject; kid?: string; alg?: string } = {},
): string {
  const unsigned = `${b64url({ alg: opts.alg ?? "RS256", kid: opts.kid ?? "k1", typ: "JWT" })}.${b64url(claims)}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(opts.key ?? google.privateKey)
    .toString("base64url");
  return `${unsigned}.${signature}`;
}

function claims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    iss: `https://securetoken.google.com/${PROJECT}`,
    aud: PROJECT,
    sub: "uid-123",
    iat: NOW_S - 10,
    exp: NOW_S + 3600,
    firebase: { sign_in_provider: "anonymous" },
    ...overrides,
  };
}

function jwks(entries: Record<string, KeyObject>) {
  return {
    keys: Object.entries(entries).map(([kid, key]) => ({
      ...key.export({ format: "jwk" }),
      kid,
      alg: "RS256",
      use: "sig",
    })),
  };
}

function fakeFetch(bodies: (object | Error)[], maxAge = 3600) {
  const calls: string[] = [];
  const impl = (async (input: string | URL | Request) => {
    calls.push(String(input));
    const next = bodies.length > 1 ? bodies.shift() : bodies[0];
    if (!next) throw new Error("neočekivan poziv");
    if (next instanceof Error) throw next;
    return new Response(JSON.stringify(next), {
      status: 200,
      headers: { "cache-control": `public, max-age=${maxAge}` },
    });
  }) as typeof fetch;
  return { impl, calls };
}

function verifier(bodies: (object | Error)[] = [jwks({ k1: google.publicKey })]) {
  const clock = { ms: NOW_MS };
  const { impl, calls } = fakeFetch(bodies);
  return { v: createIdTokenVerifier(PROJECT, impl, () => clock.ms), calls, clock };
}

test("ispravan token gosta: uid i oznaka anonimnog naloga", async () => {
  const { v, calls } = verifier();
  assert.deepEqual(await v.verify(sign(claims())), {
    ok: true,
    user: { uid: "uid-123", anonymous: true, provider: "anonymous", emailVerified: false },
  });
  assert.deepEqual(calls, [FIREBASE_JWKS_URL]);
});

test("registrovan nalog nosi email i potvrdu, i nije anoniman", async () => {
  const { v } = verifier();
  const result = await v.verify(
    sign(
      claims({
        email: "igrac@example.com",
        email_verified: true,
        firebase: { sign_in_provider: "google.com" },
      }),
    ),
  );
  assert.deepEqual(result, {
    ok: true,
    user: {
      uid: "uid-123",
      anonymous: false,
      provider: "google.com",
      email: "igrac@example.com",
      emailVerified: true,
    },
  });
});

test("auth_time (zadnja prava prijava) stiže u ms — za brisanje naloga", async () => {
  const { v } = verifier();
  const result = await v.verify(sign(claims({ auth_time: 1_700_000_000 })));
  assert.ok(result.ok);
  assert.equal(result.user.authTime, 1_700_000_000_000);
});

test("tuđi potpis, izmijenjen sadržaj i smeće su nevažeći", async () => {
  const { v } = verifier();
  assert.deepEqual(await v.verify(sign(claims(), { key: attacker.privateKey })), {
    ok: false,
    reason: "invalid",
  });

  const [h, , s] = sign(claims()).split(".");
  const forged = `${h}.${b64url(claims({ sub: "tudji-uid" }))}.${s}`;
  assert.deepEqual(await v.verify(forged), { ok: false, reason: "invalid" });

  for (const junk of ["", "nije-token", "a.b", "a.b.c", 42, null, undefined, "x".repeat(9000)]) {
    assert.deepEqual(await v.verify(junk), { ok: false, reason: "invalid" });
  }
});

test("algoritam se ne bira tokenom: `none` i HS256 ne prolaze", async () => {
  const { v } = verifier();
  const unsigned = `${b64url({ alg: "none", kid: "k1" })}.${b64url(claims())}`;
  assert.deepEqual(await v.verify(`${unsigned}.`), { ok: false, reason: "invalid" });
  assert.deepEqual(await v.verify(sign(claims(), { alg: "HS256" })), {
    ok: false,
    reason: "invalid",
  });
});

test("token drugog projekta se odbija iako je potpis Googleov", async () => {
  const { v } = verifier();
  const other = "kartaonica-production";
  assert.deepEqual(
    await v.verify(sign(claims({ aud: other, iss: `https://securetoken.google.com/${other}` }))),
    { ok: false, reason: "wrong_project" },
  );
  assert.deepEqual(await v.verify(sign(claims({ iss: "https://accounts.google.com" }))), {
    ok: false,
    reason: "wrong_project",
  });
});

test("istekao token je `expired`, uz minut tolerancije sata", async () => {
  const { v } = verifier();
  assert.deepEqual(await v.verify(sign(claims({ exp: NOW_S - 3600 }))), {
    ok: false,
    reason: "expired",
  });
  assert.equal((await v.verify(sign(claims({ exp: NOW_S - 30 })))).ok, true);
  assert.deepEqual(await v.verify(sign(claims({ iat: NOW_S + 3600 }))), {
    ok: false,
    reason: "invalid",
  });
});

test("tvrdnje pogrešnog tipa i prazan uid su nevažeći", async () => {
  const { v } = verifier();
  for (const bad of [
    { sub: "" },
    { sub: 7 },
    { sub: "u".repeat(129) },
    { exp: "sutra" },
    { iat: undefined },
  ]) {
    assert.deepEqual(await v.verify(sign(claims(bad))), { ok: false, reason: "invalid" });
  }
});

test("ključevi se keširaju, a rotacija se hvata ponovnim povlačenjem", async () => {
  const rotated = keyPair();
  const { v, calls, clock } = verifier([
    jwks({ k1: google.publicKey }),
    jwks({ k1: google.publicKey, k2: rotated.publicKey }),
  ]);
  const fresh = sign(claims(), { key: rotated.privateKey, kid: "k2" });

  assert.equal((await v.verify(sign(claims()))).ok, true);
  assert.equal((await v.verify(sign(claims()))).ok, true);
  assert.equal(calls.length, 1);

  // Nepoznat `kid` odmah poslije povlačenja NE okida novi zahtjev.
  assert.deepEqual(await v.verify(fresh), { ok: false, reason: "invalid" });
  assert.equal(calls.length, 1);

  clock.ms += 61_000;
  assert.equal((await v.verify(fresh)).ok, true);
  assert.equal(calls.length, 2);
});

test("istovremene provjere dijele jedan zahtjev za ključeve", async () => {
  const { v, calls } = verifier();
  const results = await Promise.all([1, 2, 3].map(() => v.verify(sign(claims()))));
  assert.ok(results.every((r) => r.ok));
  assert.equal(calls.length, 1);
});

test("nedostupni ključevi: `unavailable`, a sljedeći pokušaj se oporavlja", async () => {
  const { v } = verifier([new Error("mreža"), jwks({ k1: google.publicKey })]);
  assert.deepEqual(await v.verify(sign(claims())), { ok: false, reason: "unavailable" });
  assert.equal((await v.verify(sign(claims()))).ok, true);
});

test("bez ID-ja projekta provjera je isključena i ne zove mrežu", async () => {
  const { impl, calls } = fakeFetch([jwks({ k1: google.publicKey })]);
  const v = createIdTokenVerifier(null, impl);
  assert.equal(v.enabled, false);
  assert.deepEqual(await v.verify(sign(claims())), { ok: false, reason: "disabled" });
  assert.equal(calls.length, 0);
});

test("ID projekta: izričita varijabla, pa servisni ključ pusha, pa ništa", () => {
  const account = JSON.stringify({
    project_id: "iz-kljuca",
    client_email: "push@iz-kljuca.iam.gserviceaccount.com",
    private_key: "x",
  });
  assert.equal(resolveFirebaseProjectId({ FIREBASE_PROJECT_ID: " izricit " }), "izricit");
  assert.equal(
    resolveFirebaseProjectId({ FIREBASE_PROJECT_ID: "izricit", FCM_SERVICE_ACCOUNT_JSON: account }),
    "izricit",
  );
  assert.equal(resolveFirebaseProjectId({ FCM_SERVICE_ACCOUNT_JSON: account }), "iz-kljuca");
  assert.equal(resolveFirebaseProjectId({}), null);
});

test("Bearer zaglavlje", () => {
  assert.equal(bearerToken("Bearer abc.def.ghi"), "abc.def.ghi");
  assert.equal(bearerToken("bearer   abc"), "abc");
  assert.equal(bearerToken("Basic abc"), undefined);
  assert.equal(bearerToken("Bearer"), undefined);
  assert.equal(bearerToken("Bearer a b"), undefined);
  assert.equal(bearerToken(undefined), undefined);
  assert.equal(bearerToken(["Bearer a"]), undefined);
});
