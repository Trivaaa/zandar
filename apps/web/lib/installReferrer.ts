import { ROOM_ID } from "./routes";

/**
 * Poziv koji preživi instalaciju (Play Install Referrer).
 *
 * Igrač bez aplikacije otvori pozivnicu na webu, instalira sa trake
 * (`playStoreUrl(roomId)` u `lib/stores.ts`), i Play pri prvom pokretanju vrati
 * isti `referrer` string. Odatle sleti na sobu u koju je pozvan, ne na početnu.
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
    return roomIdFromReferrer(result.referrer);
  } catch {
    return null;
  }
}
