import { createSign } from "node:crypto";

import type { PushMessage } from "./messages";

/**
 * FCM HTTP v1 bez SDK-a (PRD §51).
 *
 * `firebase-admin` bi za jedan POST povukao desetine paketa, a instalacija iz
 * registry-ja je na dev mašini već padala (Avast TLS presretanje, vidi `pg`).
 * Protokol je mali: potpisan JWT → OAuth access token (sat vremena) → POST.
 *
 * Bez `FCM_SERVICE_ACCOUNT_JSON` sender je isključen i svako slanje je no-op —
 * lokalni dev i server bez ključa rade kao prije.
 */

export type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

export type SendResult = "sent" | "unregistered" | "failed" | "disabled";

export const OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const REQUEST_TIMEOUT_MS = 10_000;
/** Osvježi access token minut prije isteka, da ne istekne usred slanja. */
const TOKEN_SKEW_MS = 60_000;
/** `res/drawable/ic_stat_notify.xml` u Android projektu. */
const NOTIFICATION_ICON = "ic_stat_notify";
/** Mesing iz DS palete (`--accent`) — Android njime boji ikonicu u traci. */
const NOTIFICATION_COLOR = "#C9A227";

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

export function buildFcmPayload(token: string, msg: PushMessage) {
  return {
    message: {
      token,
      notification: { title: msg.title, body: msg.body },
      // FCM `data` prima samo stringove.
      data: { type: msg.data.type, roomId: msg.data.roomId },
      android: {
        // HIGH budi telefon iz Doze — sve u katalogu je vremenski osjetljivo.
        priority: "HIGH",
        ttl: `${Math.max(1, Math.floor(msg.ttlMs / 1000))}s`,
        collapse_key: msg.tag,
        notification: {
          channel_id: msg.channelId,
          tag: msg.tag,
          icon: NOTIFICATION_ICON,
          color: NOTIFICATION_COLOR,
        },
      },
    },
  };
}

/**
 * Token je mrtav SAMO kad FCM kaže `UNREGISTERED` (aplikacija deinstalirana,
 * token zamijenjen). Golo 404 ili `INVALID_ARGUMENT` se namjerno NE broje:
 * vraća ih i pogrešan `project_id` odnosno pokvaren payload, pa bi greška u
 * NAŠOJ konfiguraciji obrisala svaki registrovan uređaj.
 */
export function isUnregistered(body: string): boolean {
  try {
    const parsed = JSON.parse(body) as {
      error?: { details?: { errorCode?: unknown }[] };
    };
    return parsed.error?.details?.some((d) => d?.errorCode === "UNREGISTERED") ?? false;
  } catch {
    return false;
  }
}

function b64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function createFcmSender(
  account: ServiceAccount | null,
  fetchImpl: typeof fetch = globalThis.fetch,
) {
  let cached: { value: string; expiresAt: number } | null = null;

  async function accessToken(acc: ServiceAccount): Promise<string> {
    const now = Date.now();
    if (cached && cached.expiresAt - TOKEN_SKEW_MS > now) return cached.value;

    const iat = Math.floor(now / 1000);
    const unsigned = `${b64url({ alg: "RS256", typ: "JWT" })}.${b64url({
      iss: acc.client_email,
      scope: FCM_SCOPE,
      aud: OAUTH_TOKEN_URL,
      iat,
      exp: iat + 3600,
    })}`;
    const signature = createSign("RSA-SHA256")
      .update(unsigned)
      .sign(acc.private_key)
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
  }

  return {
    enabled: account !== null,
    projectId: account?.project_id ?? null,

    /** Baca samo na mrežnu grešku / OAuth; odgovor FCM-a se vraća kao rezultat. */
    async send(token: string, msg: PushMessage): Promise<SendResult> {
      if (!account) return "disabled";
      const res = await fetchImpl(
        `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await accessToken(account)}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildFcmPayload(token, msg)),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );
      if (res.ok) return "sent";

      const body = await res.text();
      // Opozvan ključ ili istekao token — sljedeće slanje traži novi.
      if (res.status === 401) cached = null;
      if (isUnregistered(body)) return "unregistered";
      console.error(`[push] FCM ${res.status} (${msg.type}): ${body.slice(0, 300)}`);
      return "failed";
    },
  };
}

export type FcmSender = ReturnType<typeof createFcmSender>;

export const fcm: FcmSender = createFcmSender(
  parseServiceAccount(process.env.FCM_SERVICE_ACCOUNT_JSON),
);
