"use client";

import { useSyncExternalStore } from "react";
import posthog from "posthog-js";

import { registerPushDevice, setPushDevicePrefs } from "@/lib/api";
import { peekGuestId } from "@/lib/guestId";
import { isNative } from "@/lib/platform";
import { getPushReminders, getPushTable, setSetting } from "@/lib/settings";

/**
 * Push obavještenja (PRD §51) — samo u Android shell-u.
 *
 * `pushEnabled` je build-time konstanta: `NEXT_PUBLIC_PUSH=1` postavlja mobilni
 * build SAMO kad APK nosi `google-services.json` (`scripts/build-mobile.mjs`).
 * Bez tog fajla plugin na `register()` ruši aplikaciju u native kodu
 * ("Default FirebaseApp is not initialized"), a to se iz JS-a ne može uhvatiti
 * — zato prekidač, a ne try/catch. Na webu je uvijek false, pa bundler izbaci
 * grane zajedno sa dinamičkim importom plugina.
 */
export const pushEnabled = isNative && process.env.NEXT_PUBLIC_PUSH === "1";

/** Android kanal — isti id šalje server (`apps/server/src/push/messages.ts`). */
export const TABLE_CHANNEL_ID = "sto";
/** Zahtjevi za prijateljstvo — isti id kao `FRIENDS_CHANNEL_ID` na serveru. */
export const FRIENDS_CHANNEL_ID = "prijatelji";
/** Podsjetnici neaktivnim igračima — isti id kao `REMINDERS_CHANNEL_ID` na serveru (SPEC_PUSH_V2 B1). */
export const REMINDERS_CHANNEL_ID = "podsjetnici";

/**
 * Šta ovaj paket zna da prikaže. Server šalje podsjetnik SAMO uređaju koji je
 * javio `reminders` — stari paket nema kanal `podsjetnici`, pa bi poruka pala
 * na podrazumijevani kanal.
 */
export const PUSH_CAPS = ["reminders"] as const;

/** Parametar početne koji podsjetnik postavlja: `/?igra=raub` stavlja igru na vrh. */
export const HOME_GAME_PARAM = "igra";

/**
 * Emituje se kad uređaj dobije `pushId`. Soba (`room:subscribe`) i zahtjev za
 * ulazak se tada vežu za uređaj — dozvola se najčešće daje TEK u lobiju, dakle
 * poslije pretplate na sobu.
 */
export const PUSH_REGISTERED_EVENT = "zandar:push-registered";

const PUSH_ID_KEY = "zandar:pushId";
const SNOOZE_KEY = "zandar:push:snoozeUntil";
const DISMISS_COUNT_KEY = "zandar:push:dismissCount";
/** "Ne sada" sakriva ponudu nedjelju dana — ne pitamo pri svakom ulasku u lobi. */
const PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
/** Poslije ovoliko "Ne sada" ponuda ostaje samo u Postavkama (SPEC_PUSH_V2 A2). */
export const MAX_PROMPT_DISMISSALS = 3;
/**
 * Koliko čekamo token od Firebase-a. Izmjereno na uređaju: hladan start Play
 * Services-a (poslije restarta telefona/aplikacije) zna trajati preko 15s —
 * prekratak rok je davao lažan neuspjeh dok je token bio na putu. Sljedeći
 * pokušaj (novi start, ili `retryRegistrationOnResume` niže) svejedno pokriva
 * pravi timeout.
 */
const REGISTRATION_TIMEOUT_MS = 30_000;

export type PushPermission = "granted" | "denied" | "prompt" | "unsupported";

/** localStorage ume da BACI (WebView bez site data) — isti razlog kao `peekGuestId`. */
function readKey(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeKey(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // bez pamćenja — ponuda i registracija se ponove sljedeći put
  }
}

/**
 * `import("@capacitor/push-notifications")` je jedina bezbjedna referenca na
 * plugin. NIKAD ne vraćaj `PushNotifications` (destrukturiran plugin objekat)
 * iz `async` funkcije, čak ni kao "return" vrijednost koja se dalje awaituje —
 * razrješavanje Promise-a provjerava `.then` na vraćenoj vrijednosti, a
 * Capacitor-ov Android bridge proxy tretira svaki nepoznat pristup svojstvu
 * (uključujući "then") kao poziv native metode i puca sa
 * `"X.then() is not implemented on android"`. Modul (plain object) je
 * bezbjedan da se awaituje; sam plugin objekat nikad ne smije proći kroz još
 * jedan await/return sloj — zato svaki pozivalac ovdje odmah destrukturira i
 * pozove metodu u istom izrazu.
 */
function pushModule() {
  return import("@capacitor/push-notifications");
}

function toPermission(receive: string): PushPermission {
  if (receive === "granted") return "granted";
  if (receive === "denied") return "denied";
  return "prompt"; // "prompt" | "prompt-with-rationale"
}

function timeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Analitika obavještenja (§43). `appEnv` ide eksplicitno, jer klijentski
 * PostHog ne registruje okruženje sam.
 */
export function capturePush(
  event: string,
  properties: Record<string, unknown> = {},
): void {
  try {
    posthog.capture(event, {
      appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
      ...properties,
    });
  } catch {
    // analitika nikad ne ruši tok
  }
}

/** Tajna ovog uređaja za push. Null na webu i dok uređaj nije registrovan. */
export function getPushId(): string | null {
  return pushEnabled ? readKey(PUSH_ID_KEY) : null;
}

export async function pushPermission(): Promise<PushPermission> {
  if (!pushEnabled) return "unsupported";
  try {
    const { PushNotifications } = await pushModule();
    const { receive } = await PushNotifications.checkPermissions();
    return toPermission(receive);
  } catch {
    return "unsupported";
  }
}

let inFlight: Promise<string | null> | null = null;

/**
 * Da li je server u OVOM pokretanju aplikacije potvrdio uređaj. Sačuvan
 * `pushId` to ne dokazuje: registracija na startu ume da otkaže (token kasni,
 * mreža), a server ume i da zaboravi uređaj — tada stari `pushId` stoji u
 * localStorage-u, a obavještenja ćutke ne stižu do sljedećeg pokretanja.
 */
let registeredThisSession = false;

/** Treba li pokušati registraciju ponovo (povratak u prvi plan). */
export function pushRegistrationPending(): boolean {
  return pushEnabled && !registeredThisSession;
}

/**
 * Token → server → `pushId`. Poziva se na svakom startu aplikacije (token
 * rotira, a server tako vidi `lastSeenAt`) i odmah poslije date dozvole.
 * Istovremeni pozivi dijele jedan tok. Ne baca — neuspjeh je `null`.
 */
export function registerForPush(): Promise<string | null> {
  if (!pushEnabled) return Promise.resolve(null);
  inFlight ??= doRegister().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doRegister(): Promise<string | null> {
  let PushNotifications: Awaited<ReturnType<typeof pushModule>>["PushNotifications"];
  try {
    ({ PushNotifications } = await pushModule());
  } catch {
    return null;
  }

  const token = await new Promise<string | null>((resolve) => {
    let done = false;
    const handles: { remove: () => Promise<void> }[] = [];
    const finish = (value: string | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      for (const handle of handles) void handle.remove();
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), REGISTRATION_TIMEOUT_MS);

    void (async () => {
      handles.push(
        await PushNotifications.addListener("registration", ({ value }) => finish(value)),
        await PushNotifications.addListener("registrationError", () => finish(null)),
      );
      // Tok je istekao dok su se listeneri prijavljivali — ne ostavljaj ih visiti.
      if (done) {
        for (const handle of handles) void handle.remove();
        return;
      }
      // Listeneri PRIJE `register()`: token zna stići odmah.
      await PushNotifications.register();
    })().catch(() => finish(null));
  });
  if (!token) return null;

  try {
    const { pushId } = await registerPushDevice({
      token,
      pushId: readKey(PUSH_ID_KEY) ?? undefined,
      tz: timeZone(),
      guestId: peekGuestId() ?? undefined,
      table: getPushTable(),
      reminders: getPushReminders(),
      caps: PUSH_CAPS,
    });
    writeKey(PUSH_ID_KEY, pushId);
    registeredThisSession = true;
    window.dispatchEvent(new Event(PUSH_REGISTERED_EVENT));
    return pushId;
  } catch {
    return null;
  }
}

/**
 * Sistemski dijalog. Zove ga SAMO dugme iz `PushPrompt`-a: na Androidu 13+
 * poslije "Ne dozvoli" aplikacija ga praktično više ne može pokazati.
 */
export async function requestPushPermission(): Promise<PushPermission> {
  if (!pushEnabled) return "unsupported";
  let result: PushPermission;
  try {
    const { PushNotifications } = await pushModule();
    const { receive } = await PushNotifications.requestPermissions();
    result = toPermission(receive);
  } catch {
    return "unsupported";
  }
  capturePush("push_permission_result", { result });
  if (result === "granted") void registerForPush();
  return result;
}

const OPEN_DAYS_KEY = "zandar:push:openDays";
const LAST_OPEN_DAY_KEY = "zandar:push:lastOpenDay";

function localDay(now: number): string {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * Broji RAZLIČITE dane u kojima je aplikacija otvorena (SPEC_PUSH_V2 A4).
 * Zove se jednom po pokretanju; vraća broj dana uključujući današnji.
 */
export function noteAppOpenDay(now: number = Date.now()): number {
  const today = localDay(now);
  const prev = Number(readKey(OPEN_DAYS_KEY));
  const count = Number.isFinite(prev) && prev > 0 ? Math.floor(prev) : 0;
  if (readKey(LAST_OPEN_DAY_KEY) === today) return Math.max(1, count);
  writeKey(LAST_OPEN_DAY_KEY, today);
  writeKey(OPEN_DAYS_KEY, String(count + 1));
  return count + 1;
}

export function appOpenDays(): number {
  const n = Number(readKey(OPEN_DAYS_KEY));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Ponuda koja se pokazuje samo jednom (`PushPrompt onceKey`). */
export function promptShownOnce(key: string): boolean {
  return readKey(`zandar:push:once:${key}`) !== null;
}

export function markPromptShownOnce(key: string): void {
  writeKey(`zandar:push:once:${key}`, "1");
}

/** Odgođena ("Ne sada" u zadnjih 7 dana) ili ugašena (3 puta "Ne sada") ponuda. */
export function isPromptSnoozed(now: number = Date.now()): boolean {
  if (promptDismissCount() >= MAX_PROMPT_DISMISSALS) return true;
  const until = Number(readKey(SNOOZE_KEY));
  return Number.isFinite(until) && until > now;
}

export function promptDismissCount(): number {
  const n = Number(readKey(DISMISS_COUNT_KEY));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export function snoozePrompt(now: number = Date.now()): void {
  writeKey(SNOOZE_KEY, String(now + PROMPT_SNOOZE_MS));
  writeKey(DISMISS_COUNT_KEY, String(promptDismissCount() + 1));
}

/**
 * Preklopka "obavještenja o stolu". Lokalno odmah, server u pozadini; ako
 * zahtjev padne, sljedeća registracija (start aplikacije) nosi lokalnu vrijednost.
 */
export function setPushTable(enabled: boolean): void {
  setSetting("pushTable", enabled);
  const pushId = getPushId();
  if (pushId) void setPushDevicePrefs(pushId, { table: enabled }).catch(() => {});
}

/** Preklopka podsjetnika (SPEC_PUSH_V2 B1) — isti tok kao `setPushTable`. */
export function setPushReminders(enabled: boolean): void {
  setSetting("pushReminders", enabled);
  const pushId = getPushId();
  if (pushId) void setPushDevicePrefs(pushId, { reminders: enabled }).catch(() => {});
}

type NotificationSettingsPlugin = { open(): Promise<{ opened: boolean }> };

/**
 * Sistemska podešavanja obavještenja aplikacije (SPEC_PUSH_V2 A3) — jedini put
 * nazad poslije "Ne dozvoli" na Androidu 13+. Plugin objekat se ne vraća ni ne
 * awaituje kao vrijednost (CLAUDE.md, Capacitor proxy i `.then`).
 */
export async function openNotificationSettings(): Promise<boolean> {
  if (!pushEnabled) return false;
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const { opened } = await registerPlugin<NotificationSettingsPlugin>("NotificationSettings").open();
    return opened;
  } catch {
    return false;
  }
}

let stateSent = false;

/**
 * `push_state` jednom po pokretanju (SPEC_PUSH_V2 A5): stanje dozvole i
 * preklopki. Iz njega se računa doseg — koliko aktivnih igrača uopšte može
 * dobiti obavještenje — bez pristupa serveru.
 */
export async function capturePushState(): Promise<void> {
  if (!pushEnabled || stateSent) return;
  stateSent = true;
  capturePush("push_state", {
    permission: await pushPermission(),
    table: getPushTable(),
    reminders: getPushReminders(),
  });
}

function subscribeRegistered(onChange: () => void): () => void {
  window.addEventListener(PUSH_REGISTERED_EVENT, onChange);
  return () => window.removeEventListener(PUSH_REGISTERED_EVENT, onChange);
}

/** Da li je ovaj uređaj registrovan — preklopka se ne crta prije toga. */
export function usePushRegistered(): boolean {
  return useSyncExternalStore(
    subscribeRegistered,
    () => getPushId() !== null,
    () => false,
  );
}
