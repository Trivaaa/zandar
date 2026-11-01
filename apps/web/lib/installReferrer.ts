import type { AnalyticsEvents } from "@zandar/shared-types";

import { campaignFromParams } from "./campaign";
import { ROOM_ID } from "./routes";
import { track } from "./track";

/**
 * Poziv koji preživi instalaciju (Play Install Referrer).
 *
 * Link sa sobom (`playStoreUrl(roomId)` u `lib/stores.ts`) Play pri prvom pokretanju
 * vrati kao isti `referrer` string, pa igrač sleti na sobu, ne na početnu. Web ga od
 * ponude aplikacije (W1/W4/W6) više ne šalje, jer za stolom i na pozivnici nema ponude;
 * čitanje ostaje zbog instalacija sa starih linkova i zbog kampanje.
 *
 * Čita se JEDNOM po instalaciji: Play vraća isti referrer i 90 dana kasnije, pa
 * bi bez oznake svako pokretanje vodilo u istu, odavno ugašenu sobu.
 */

const CONSUMED_KEY = "zandar:installReferrerRead";
/** Play Services zna kasniti na hladnom startu; preko ovoga ne držimo početnu. */
const READ_TIMEOUT_MS = 5_000;

type InstallReferrerPlugin = {
  getReferrer(): Promise<{ referrer?: string }>;
};

/**
 * Id sobe iz referrer stringa. Organska instalacija nosi
 * `utm_source=google-play&utm_medium=organic` — bez `room`, dakle `null`.
 */
export function roomIdFromReferrer(referrer: string | null | undefined): string | null {
  if (!referrer) return null;
  const id = new URLSearchParams(referrer).get("room");
  return id && ROOM_ID.test(id) ? id : null;
}

/** Parametri za `app_install_attributed`; id sobe ne ide u analitiku. */
export function installAttribution(
  referrer: string | null | undefined,
): AnalyticsEvents["app_install_attributed"] {
  return { has_room: roomIdFromReferrer(referrer) !== null, ...campaignFromParams(referrer) };
}

function alreadyConsumed(): boolean {
  try {
    return window.localStorage.getItem(CONSUMED_KEY) !== null;
  } catch {
    // Bez skladišta ne možemo znati da je pročitano — bolje nikad ne voditi
    // u sobu nego svaki put.
    return true;
  }
}

function markConsumed(): void {
  try {
    window.localStorage.setItem(CONSUMED_KEY, "1");
  } catch {
    // vidi `alreadyConsumed`
  }
}

/**
 * Soba iz pozivnice sa koje je aplikacija instalirana, ili `null`. Poziva se
 * samo u native shell-u. Neuspjelo čitanje (rok, Play Services) NE troši
 * pokušaj — sljedeće pokretanje proba ponovo.
 *
 * Plugin objekat se ne vraća i ne awaituje kao vrijednost (vidi CLAUDE.md —
 * Capacitor proxy puca na `.then`); awaituje se samo rezultat metode.
 */
export async function consumeInstallRoom(): Promise<string | null> {
  if (alreadyConsumed()) return null;
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), READ_TIMEOUT_MS));
    const result = await Promise.race([
      registerPlugin<InstallReferrerPlugin>("InstallReferrer").getReferrer(),
      timeout,
    ]);
    if (result === null) return null;
    markConsumed();
    track("app_install_attributed", installAttribution(result.referrer));
    return roomIdFromReferrer(result.referrer);
  } catch {
    return null;
  }
}
