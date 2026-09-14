import { test } from "node:test";
import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";

import {
  buildFcmPayload,
  createFcmSender,
  FCM_SCOPE,
  isUnregistered,
  OAUTH_TOKEN_URL,
  parseServiceAccount,
  type ServiceAccount,
} from "./fcm";
import { buildGameStartedPush, buildJoinRequestPush } from "./messages";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

const account: ServiceAccount = {
  project_id: "kartaonica-staging",
  client_email: "push@kartaonica-staging.iam.gserviceaccount.com",
  private_key: privateKey,
};

const UNREGISTERED_BODY = JSON.stringify({
  error: {
    code: 404,
    status: "NOT_FOUND",
    details: [
      {
        "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError",
        errorCode: "UNREGISTERED",
      },
    ],
  },
});

type Call = { url: string; init: RequestInit | undefined };

function fakeFetch(fcmResponses: Response[]) {
  const calls: Call[] = [];
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    if (url === OAUTH_TOKEN_URL) {
      return new Response(JSON.stringify({ access_token: "at-1", expires_in: 3600 }), {
        status: 200,
      });
    }
    const next = fcmResponses.shift();
    if (!next) throw new Error("neočekivan poziv");
    return next;
  }) as typeof fetch;
  return { impl, calls };
}

test("servisni ključ: base64 i sirov JSON, a smeće i nepotpun ključ su isključen push", () => {
  const json = JSON.stringify({ ...account, type: "service_account" });
  assert.deepEqual(parseServiceAccount(json), account);
  assert.deepEqual(parseServiceAccount(Buffer.from(json).toString("base64")), account);
  assert.equal(parseServiceAccount(undefined), null);
  assert.equal(parseServiceAccount("  "), null);
  assert.equal(parseServiceAccount("nije-json"), null);
  assert.equal(parseServiceAccount(JSON.stringify({ project_id: "x" })), null);
});

test("payload: TTL u sekundama, kanal, tag i samo string podaci", () => {
  const msg = buildJoinRequestPush({ roomId: "a1b2c3", guestName: "Ana", expiresAt: 95_500, now: 0 });
  assert.ok(msg);
  const { message } = buildFcmPayload("tok", msg);
  assert.equal(message.token, "tok");
  assert.equal(message.android.ttl, "95s");
  assert.equal(message.android.priority, "HIGH");
  assert.equal(message.android.collapse_key, "join:a1b2c3");
  assert.equal(message.android.notification.channel_id, "sto");
  assert.equal(message.android.notification.tag, "join:a1b2c3");
  assert.equal(message.android.notification.icon, "ic_stat_notify");
  for (const value of Object.values(message.data)) assert.equal(typeof value, "string");
});

test("mrtav token je samo UNREGISTERED — golo 404 i INVALID_ARGUMENT ne brišu uređaje", () => {
  assert.equal(isUnregistered(UNREGISTERED_BODY), true);
  assert.equal(
    isUnregistered(JSON.stringify({ error: { code: 404, status: "NOT_FOUND", message: "Requested entity was not found." } })),
    false,
  );
  assert.equal(
    isUnregistered(
      JSON.stringify({
        error: { code: 400, status: "INVALID_ARGUMENT", details: [{ errorCode: "INVALID_ARGUMENT" }] },
      }),
    ),
    false,
  );
  assert.equal(isUnregistered("<html>502</html>"), false);
});

test("slanje: potpisan JWT za access token, pa POST na projekat", async () => {
  const { impl, calls } = fakeFetch([new Response("{}", { status: 200 })]);
  const sender = createFcmSender(account, impl);
  const result = await sender.send("tok", buildGameStartedPush({ roomId: "r1" }));

  assert.equal(result, "sent");
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.url, OAUTH_TOKEN_URL);

  const form = new URLSearchParams(String(calls[0]?.init?.body));
  assert.equal(form.get("grant_type"), "urn:ietf:params:oauth:grant-type:jwt-bearer");
  const [header, claims, signature] = (form.get("assertion") ?? "").split(".");
  assert.ok(header && claims && signature);
  const verified = createVerify("RSA-SHA256")
    .update(`${header}.${claims}`)
    .verify(publicKey, Buffer.from(signature, "base64url"));
  assert.equal(verified, true);
  const decoded = JSON.parse(Buffer.from(claims, "base64url").toString("utf8")) as Record<string, unknown>;
  assert.equal(decoded.iss, account.client_email);
  assert.equal(decoded.aud, OAUTH_TOKEN_URL);
  assert.equal(decoded.scope, FCM_SCOPE);

  assert.equal(
    calls[1]?.url,
    "https://fcm.googleapis.com/v1/projects/kartaonica-staging/messages:send",
  );
  const headers = calls[1]?.init?.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer at-1");
});

test("access token se kešira između slanja", async () => {
  const { impl, calls } = fakeFetch([
    new Response("{}", { status: 200 }),
    new Response("{}", { status: 200 }),
  ]);
  const sender = createFcmSender(account, impl);
  await sender.send("a", buildGameStartedPush({ roomId: "r1" }));
  await sender.send("b", buildGameStartedPush({ roomId: "r1" }));
  assert.equal(calls.filter((c) => c.url === OAUTH_TOKEN_URL).length, 1);
});

test("401 odbacuje keširan access token", async () => {
  const { impl, calls } = fakeFetch([
    new Response("{}", { status: 401 }),
    new Response("{}", { status: 200 }),
  ]);
  const sender = createFcmSender(account, impl);
  assert.equal(await sender.send("a", buildGameStartedPush({ roomId: "r1" })), "failed");
  assert.equal(await sender.send("a", buildGameStartedPush({ roomId: "r1" })), "sent");
  assert.equal(calls.filter((c) => c.url === OAUTH_TOKEN_URL).length, 2);
});

test("UNREGISTERED se vraća kao rezultat, ne kao izuzetak", async () => {
  const { impl } = fakeFetch([new Response(UNREGISTERED_BODY, { status: 404 })]);
  const sender = createFcmSender(account, impl);
  assert.equal(await sender.send("a", buildGameStartedPush({ roomId: "r1" })), "unregistered");
});

test("bez ključa nema mreže", async () => {
  const { impl, calls } = fakeFetch([]);
  const sender = createFcmSender(null, impl);
  assert.equal(sender.enabled, false);
  assert.equal(await sender.send("a", buildGameStartedPush({ roomId: "r1" })), "disabled");
  assert.equal(calls.length, 0);
});
