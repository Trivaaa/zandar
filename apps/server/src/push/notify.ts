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
  if (!msg) {
    console.log(`[push] ${dedupeKey}: preskočeno — poruka je null (rok istekao prije slanja)`);
    return;
  }
  if (!fcm.enabled) {
    console.log(`[push] ${dedupeKey}: preskočeno — FCM isključen (nema FCM_SERVICE_ACCOUNT_JSON)`);
    return;
  }
  const now = Date.now();
  for (const idHash of idHashes) {
    const device = deviceStore.get(idHash);
    if (!device) {
      console.log(`[push] ${dedupeKey}: uređaj ${idHash.slice(0, 8)}… nije nađen u registru`);
      continue;
    }
    if (!device.prefs.table) {
      console.log(`[push] ${dedupeKey}: uređaj ${idHash.slice(0, 8)}… ima isključenu preklopku`);
      continue;
    }
    if (!firstDelivery(`${dedupeKey}:${idHash}`, now)) {
      console.log(`[push] ${dedupeKey}: uređaj ${idHash.slice(0, 8)}… već dobio ovaj događaj (dedupe)`);
      continue;
    }

    console.log(`[push] ${dedupeKey}: šaljem uređaju ${idHash.slice(0, 8)}… (${msg.type})`);
    void fcm
      .send(device.token, msg)
      .then((result) => {
        console.log(`[push] ${dedupeKey}: ishod = ${result}`);
        if (result === "unregistered") deviceStore.removeByHash(idHash);
        if (result === "sent") track(device.guestId, "push_sent", { type: msg.type });
      })
      .catch((err) => console.error(`[push] ${dedupeKey}: nije poslat —`, err));
  }
}
