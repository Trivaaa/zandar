import { track } from "../lib/posthog";
import { deviceStore } from "./devices";
import { fcm } from "./fcm";
import type { PushMessage } from "./messages";

/**
 * Isporuka push poruke uređajima (PRD §51): preklopka korisnika, idempotentnost
 * i čišćenje mrtvih tokena.
 */

/** Koliko dugo pamtimo da je događaj već poslat istom uređaju. */
const DEDUPE_TTL_MS = 60 * 60 * 1000;
const DEDUPE_PRUNE_AT = 2_000;
const sentAt = new Map<string, number>();

function firstDelivery(key: string, now: number): boolean {
  if (sentAt.has(key)) return false;
  if (sentAt.size >= DEDUPE_PRUNE_AT) {
    for (const [k, t] of sentAt) if (now - t > DEDUPE_TTL_MS) sentAt.delete(k);
  }
  sentAt.set(key, now);
  return true;
}

/**
 * Pošalji poruku uređajima. Ne čeka i NIKAD ne baca — pozivaju ga REST i
 * socket handleri koji ne smiju zavisiti od Google-a.
 *
 * ⚠ `.catch` na slanju nije ukras: neuhvaćeno odbijeno obećanje ide u
 * `unhandledRejection` → `shutdown(1)` (index.ts), pa bi mrežni ispad prema
 * FCM-u oborio SVE stolove.
 *
 * `dedupeKey` imenuje događaj (`join_request:<requestId>`); isti događaj istom
 * uređaju ide jednom, i kad ga handler pozove dvaput.
 */
export function notifyDevices(
  idHashes: readonly string[],
  msg: PushMessage | null,
  dedupeKey: string,
): void {
  if (!msg || !fcm.enabled) return;
  const now = Date.now();
  for (const idHash of idHashes) {
    const device = deviceStore.get(idHash);
    if (!device || !device.prefs.table) continue;
    if (!firstDelivery(`${dedupeKey}:${idHash}`, now)) continue;

    void fcm
      .send(device.token, msg)
      .then((result) => {
        if (result === "unregistered") deviceStore.removeByHash(idHash);
        if (result === "sent") track(device.guestId, "push_sent", { type: msg.type });
      })
      .catch((err) => console.error(`[push] ${msg.type} nije poslat:`, err));
  }
}
