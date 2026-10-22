import {
  createAccessTokenSource,
  OAUTH_TOKEN_URL,
  parseServiceAccount,
  type ServiceAccount,
} from "../google/serviceAuth";
import type { PushMessage } from "./messages";

// Postojeći uvoznici (testovi, `auth/idToken.ts`) ih uzimaju odavde.
export { OAUTH_TOKEN_URL, parseServiceAccount, type ServiceAccount };

/**
 * FCM HTTP v1 bez SDK-a (PRD §51).
 *
 * Access token daje `google/serviceAuth.ts` (isti ključ koristi i nalog igrača);
 * ovdje je samo POST na `messages:send`.
 *
 * Bez `FCM_SERVICE_ACCOUNT_JSON` sender je isključen i svako slanje je no-op —
 * lokalni dev i server bez ključa rade kao prije.
 */

export type SendResult = "sent" | "unregistered" | "failed" | "disabled";

export const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const REQUEST_TIMEOUT_MS = 10_000;
/** `res/drawable/ic_stat_notify.xml` u Android projektu. */
const NOTIFICATION_ICON = "ic_stat_notify";
/** Mesing iz DS palete (`--accent`) — Android njime boji ikonicu u traci. */
const NOTIFICATION_COLOR = "#C9A227";

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

export function createFcmSender(
  account: ServiceAccount | null,
  fetchImpl: typeof fetch = globalThis.fetch,
) {
  const tokens = account ? createAccessTokenSource(account, [FCM_SCOPE], fetchImpl) : null;

  return {
    enabled: account !== null,
    projectId: account?.project_id ?? null,

    /** Baca samo na mrežnu grešku / OAuth; odgovor FCM-a se vraća kao rezultat. */
    async send(token: string, msg: PushMessage): Promise<SendResult> {
      if (!account || !tokens) return "disabled";
      const res = await fetchImpl(
        `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(account.project_id)}/messages:send`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${await tokens.get()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildFcmPayload(token, msg)),
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );
      if (res.ok) return "sent";

      const body = await res.text();
      // Opozvan ključ ili istekao token — sljedeće slanje traži novi.
      if (res.status === 401) tokens.invalidate();
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
