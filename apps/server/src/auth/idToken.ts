import { createPublicKey, createVerify, type JsonWebKey, type KeyObject } from "node:crypto";

import { parseServiceAccount } from "../push/fcm";

/**
 * Provjera Firebase ID tokena bez SDK-a (spec: docs/Specs/player-profile-v1.md).
 *
 * Isti razlog kao kod `push/fcm.ts`: `firebase-admin` za jednu provjeru potpisa
 * povlači desetine paketa. Protokol je mali — RS256 JWT čiji javni ključevi
 * stoje na Googleovoj adresi, uz četiri tvrdnje koje moraju da se slože.
 *
 * Bez ID-ja projekta provjera je ISKLJUČENA i svaki token je „nema ga": lokalni
 * dev i server bez Firebase konfiguracije rade kao prije.
 */

/** Javni ključevi kojima Firebase potpisuje ID tokene, kao JWK skup. */
export const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

const REQUEST_TIMEOUT_MS = 10_000;
/** Kad odgovor ne nosi `max-age` — Google inače daje više sati. */
const DEFAULT_KEYS_TTL_MS = 60 * 60 * 1000;
/**
 * Nepoznat `kid` može biti svjež ključ poslije rotacije, pa se ključevi povuku
 * ponovo — ali najviše jednom u ovom razmaku, da lažni tokeni sa izmišljenim
 * `kid`-om ne pretvore server u generator zahtjeva ka Googleu.
 */
const KEYS_REFETCH_MIN_MS = 60_000;
/** Sat klijenta i servera se ne slažu u sekundu. */
const CLOCK_SKEW_S = 60;
/** JWT od par KB je normalan; sve preko ovoga nije token. */
const MAX_TOKEN_LENGTH = 8192;
/** Firebase UID je najviše 128 znakova. */
const MAX_UID_LENGTH = 128;

export type AuthUser = {
  uid: string;
  /** `true` za gosta — anonimni Firebase nalog. */
  anonymous: boolean;
  /** `anonymous`, `password`, `google.com`… */
  provider: string;
  email?: string;
  emailVerified: boolean;
};

export type VerifyFailure =
  /** Provjera nije konfigurisana na ovom serveru. */
  | "disabled"
  /** Nije JWT, pogrešan algoritam, nepoznat ključ ili potpis ne odgovara. */
  | "invalid"
  /** Potpis je dobar, ali je token istekao — klijent treba da ga osvježi. */
  | "expired"
  /** Token za drugi Firebase projekat (npr. staging token na produkciji). */
  | "wrong_project"
  /** Googleovi ključevi nisu dostupni — ne zna se, pa se ne vjeruje. */
  | "unavailable";

export type VerifyResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: VerifyFailure };

type Jwk = JsonWebKey & { kid?: string };

function decodeSegment(segment: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function maxAgeMs(cacheControl: string | null): number {
  const match = cacheControl?.match(/max-age=(\d+)/);
  return match ? Number(match[1]) * 1000 : DEFAULT_KEYS_TTL_MS;
}

/** `Authorization: Bearer <token>` → token, ili `undefined`. */
export function bearerToken(header: unknown): string | undefined {
  if (typeof header !== "string") return undefined;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1];
}

export function createIdTokenVerifier(
  projectId: string | null,
  fetchImpl: typeof fetch = globalThis.fetch,
  now: () => number = Date.now,
) {
  let keys: { byKid: Map<string, KeyObject>; expiresAt: number; fetchedAt: number } | null = null;
  let inflight: Promise<Map<string, KeyObject>> | null = null;

  async function fetchKeys(): Promise<Map<string, KeyObject>> {
    const res = await fetchImpl(FIREBASE_JWKS_URL, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`JWKS ${res.status}`);
    const json = (await res.json()) as { keys?: unknown };
    const byKid = new Map<string, KeyObject>();
    for (const jwk of Array.isArray(json.keys) ? (json.keys as Jwk[]) : []) {
      if (typeof jwk?.kid !== "string") continue;
      try {
        byKid.set(jwk.kid, createPublicKey({ key: jwk, format: "jwk" }));
      } catch {
        // jedan pokvaren ključ ne smije da obori ostale
      }
    }
    if (byKid.size === 0) throw new Error("JWKS bez ključeva");
    const at = now();
    keys = { byKid, expiresAt: at + maxAgeMs(res.headers.get("cache-control")), fetchedAt: at };
    return byKid;
  }

  /** Jedan zahtjev ka Googleu i kad više provjera čeka ključeve istovremeno. */
  function loadKeys(): Promise<Map<string, KeyObject>> {
    inflight ??= fetchKeys().finally(() => {
      inflight = null;
    });
    return inflight;
  }

  async function keyFor(kid: string): Promise<KeyObject | undefined> {
    const at = now();
    if (!keys || keys.expiresAt <= at) return (await loadKeys()).get(kid);
    const known = keys.byKid.get(kid);
    if (known || at - keys.fetchedAt < KEYS_REFETCH_MIN_MS) return known;
    return (await loadKeys()).get(kid);
  }

  return {
    enabled: projectId !== null,
    projectId,

    /** Nikad ne baca — svaki ishod je vrijednost, pa pozivalac ne treba `try`. */
    async verify(token: unknown): Promise<VerifyResult> {
      if (!projectId) return { ok: false, reason: "disabled" };
      if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
        return { ok: false, reason: "invalid" };
      }
      const parts = token.split(".");
      if (parts.length !== 3) return { ok: false, reason: "invalid" };
      const [headerPart, payloadPart, signaturePart] = parts as [string, string, string];

      const header = decodeSegment(headerPart);
      const claims = decodeSegment(payloadPart);
      // `alg` se NE čita iz tokena kao izbor — prihvata se isključivo RS256,
      // inače bi `none` ili HS256 sa javnim ključem kao tajnom prošli provjeru.
      if (!header || !claims || header.alg !== "RS256" || typeof header.kid !== "string") {
        return { ok: false, reason: "invalid" };
      }

      let key: KeyObject | undefined;
      try {
        key = await keyFor(header.kid);
      } catch {
        return { ok: false, reason: "unavailable" };
      }
      if (!key) return { ok: false, reason: "invalid" };

      let signatureOk = false;
      try {
        signatureOk = createVerify("RSA-SHA256")
          .update(`${headerPart}.${payloadPart}`)
          .verify(key, Buffer.from(signaturePart, "base64url"));
      } catch {
        signatureOk = false;
      }
      if (!signatureOk) return { ok: false, reason: "invalid" };

      // Tvrdnje se čitaju tek POSLIJE potpisa — prije toga su tuđi tekst.
      if (claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}`) {
        return { ok: false, reason: "wrong_project" };
      }
      const nowS = Math.floor(now() / 1000);
      const { sub, exp, iat } = claims;
      if (typeof exp !== "number" || typeof iat !== "number") {
        return { ok: false, reason: "invalid" };
      }
      if (exp <= nowS - CLOCK_SKEW_S) return { ok: false, reason: "expired" };
      if (iat > nowS + CLOCK_SKEW_S) return { ok: false, reason: "invalid" };
      if (typeof sub !== "string" || sub.length === 0 || sub.length > MAX_UID_LENGTH) {
        return { ok: false, reason: "invalid" };
      }

      const firebase =
        claims.firebase !== null && typeof claims.firebase === "object"
          ? (claims.firebase as Record<string, unknown>)
          : {};
      const provider =
        typeof firebase.sign_in_provider === "string" ? firebase.sign_in_provider : "unknown";
      return {
        ok: true,
        user: {
          uid: sub,
          anonymous: provider === "anonymous",
          provider,
          ...(typeof claims.email === "string" ? { email: claims.email } : {}),
          emailVerified: claims.email_verified === true,
        },
      };
    },
  };
}

export type IdTokenVerifier = ReturnType<typeof createIdTokenVerifier>;

/**
 * ID projekta: `FIREBASE_PROJECT_ID`, a bez njega projekat servisnog ključa
 * koji server već nosi zbog pusha — na Railwayu zato ne treba nova varijabla.
 */
export function resolveFirebaseProjectId(env: NodeJS.ProcessEnv = process.env): string | null {
  const explicit = env.FIREBASE_PROJECT_ID?.trim();
  if (explicit) return explicit;
  return parseServiceAccount(env.FCM_SERVICE_ACCOUNT_JSON)?.project_id ?? null;
}

export const idTokens: IdTokenVerifier = createIdTokenVerifier(resolveFirebaseProjectId());
