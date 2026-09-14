"use client";

import { useSyncExternalStore } from "react";
import posthog from "posthog-js";

import { registerPushDevice, setPushDevicePrefs } from "@/lib/api";
import { peekGuestId } from "@/lib/guestId";
import { isNative } from "@/lib/platform";
import { getPushTable, setSetting } from "@/lib/settings";

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

/**
 * Emituje se kad uređaj dobije `pushId`. Soba (`room:subscribe`) i zahtjev za
 * ulazak se tada vežu za uređaj — dozvola se najčešće daje TEK u lobiju, dakle
 * poslije pretplate na sobu.
 */
export const PUSH_REGISTERED_EVENT = "zandar:push-registered";

const PUSH_ID_KEY = "zandar:pushId";
const SNOOZE_KEY = "zandar:push:snoozeUntil";
/** "Ne sada" sakriva ponudu nedjelju dana — ne pitamo pri svakom ulasku u lobi. */
const PROMPT_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
/** Koliko čekamo token od Firebase-a; poslije toga sljedeći start pokušava ponovo. */
const REGISTRATION_TIMEOUT_MS = 15_000;

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
    });
    writeKey(PUSH_ID_KEY, pushId);
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

export function isPromptSnoozed(now: number = Date.now()): boolean {
  const until = Number(readKey(SNOOZE_KEY));
  return Number.isFinite(until) && until > now;
}

export function snoozePrompt(now: number = Date.now()): void {
  writeKey(SNOOZE_KEY, String(now + PROMPT_SNOOZE_MS));
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
