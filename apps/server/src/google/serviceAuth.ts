import { createSign } from "node:crypto";

/**
 * Google servisni nalog bez SDK-a: potpisan JWT → OAuth access token (sat
 * vremena). Dijele ga FCM (push) i Firestore/Identity Toolkit (nalog igrača).
 *
 * `firebase-admin` bi za par REST poziva povukao desetine paketa, a instalacija
 * iz registry-ja je na dev mašini već padala (Avast TLS presretanje, vidi `pg`).
 */

export type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

export const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const REQUEST_TIMEOUT_MS = 10_000;
/** Osvježi access token minut prije isteka, da ne istekne usred poziva. */
const TOKEN_SKEW_MS = 60_000;

/**
 * Servisni ključ Firebase projekta, kao base64 ili sirov JSON. Base64 je
 * preporučen oblik: `private_key` nosi prelome redova, koje dashboard
 * varijable lako pokvare.
 */
export function parseServiceAccount(raw: string | undefined): ServiceAccount | null {
  if (!raw || raw.trim() === "") return null;
  try {
    const text = raw.trim().startsWith("{")
      ? raw
      : Buffer.from(raw.trim(), "base64").toString("utf8");
    const json = JSON.parse(text) as Partial<ServiceAccount>;
    if (
      typeof json.project_id === "string" &&
      typeof json.client_email === "string" &&
      typeof json.private_key === "string"
    ) {
      return {
        project_id: json.project_id,
        client_email: json.client_email,
        private_key: json.private_key,
      };
    }
  } catch {
    // pada ispod
  }
  return null;
}

function b64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export type AccessTokenSource = {
  /** Baca na mrežnu grešku ili odbijen OAuth. */
  get(): Promise<string>;
  /** Poslije 401: sljedeći `get` traži novi token. */
  invalidate(): void;
};

/** Jedan izvor po skupu scope-ova; token se kešira dok ne istekne. */
export function createAccessTokenSource(
  account: ServiceAccount,
  scopes: readonly string[],
  fetchImpl: typeof fetch = globalThis.fetch,
): AccessTokenSource {
  let cached: { value: string; expiresAt: number } | null = null;

  return {
    async get() {
      const now = Date.now();
      if (cached && cached.expiresAt - TOKEN_SKEW_MS > now) return cached.value;

      const iat = Math.floor(now / 1000);
      const unsigned = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({
        iss: account.client_email,
        scope: scopes.join(" "),
        aud: OAUTH_TOKEN_URL,
        iat,
        exp: iat + 3600,
      })}`;
      const signature = createSign("RSA-SHA256")
        .update(unsigned)
        .sign(account.private_key)
        .toString("base64url");

      const res = await fetchImpl(OAUTH_TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: `${unsigned}.${signature}`,
        }).toString(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        throw new Error(`OAuth ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      const json = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
      if (typeof json.access_token !== "string") {
        throw new Error("OAuth odgovor bez access_token");
      }
      const ttlSeconds = typeof json.expires_in === "number" ? json.expires_in : 3600;
      cached = { value: json.access_token, expiresAt: now + ttlSeconds * 1000 };
      return cached.value;
    },
    invalidate() {
      cached = null;
    },
  };
}
