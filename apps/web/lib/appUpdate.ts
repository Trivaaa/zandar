import type { PluginListenerHandle } from "@capacitor/core";

import { resolveApiBase } from "./platform";

/**
 * Play In-App Updates (native `AppUpdatePlugin.java`).
 *
 * Ponuda je nenametljiva: traka na početnoj, preuzimanje u pozadini, pa
 * „Restartuj". Prisila (Play ekran preko cijele aplikacije) samo kad je
 * instalirana verzija ispod minimuma sa servera (`/api/app-config`) — za
 * verzije sa ozbiljnim bugom. Sve se dešava SAMO na početnoj: restart usred
 * partije bi prekinuo sto.
 *
 * Van instalacije sa Play-a (staging, debug) plugin uvijek kaže „nema", pa se
 * ništa ne prikazuje.
 */

export type UpdateInfo = {
  available: boolean;
  currentVersionCode: number;
  availableVersionCode?: number;
  flexibleAllowed?: boolean;
  immediateAllowed?: boolean;
  downloaded?: boolean;
  stalenessDays?: number;
};

export type UpdateDecision = "none" | "offer" | "force" | "restart";

/** „Ne sada" — ponuda miruje ovoliko. */
export const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
/** Najviše jedna provjera Play-a u ovom razmaku (pokretanje + povratak u prvi plan). */
export const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const SNOOZE_KEY = "zandar:appUpdateSnooze";
const LAST_CHECK_KEY = "zandar:appUpdateCheckedAt";

/**
 * Šta prikazati. Čista funkcija:
 * - preuzeto, čeka instalaciju → `restart` (i kad je odgođeno: posao je gotov, ostaje jedan dodir);
 * - ispod minimuma i Play dozvoljava prisilu → `force` (odgoda ne važi);
 * - postoji novija i flexible je dozvoljen → `offer`, osim dok traje odgoda.
 */
export function decideUpdate(
  info: UpdateInfo,
  minVersionCode: number,
  snoozedUntil: number,
  now: number,
): UpdateDecision {
  if (info.downloaded) return "restart";
  if (!info.available) return "none";
  if (info.currentVersionCode > 0 && info.currentVersionCode < minVersionCode && info.immediateAllowed) {
    return "force";
  }
  if (!info.flexibleAllowed) return "none";
  return now < snoozedUntil ? "none" : "offer";
}

/** Da li je vrijeme za novu provjeru (najviše jednom u `CHECK_INTERVAL_MS`). */
export function checkDue(lastCheckedAt: number, now: number): boolean {
  return !(now >= lastCheckedAt && now - lastCheckedAt < CHECK_INTERVAL_MS);
}

function readNumber(key: string): number {
  try {
    const n = Number(window.localStorage.getItem(key));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeNumber(key: string, value: number): void {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // bez skladišta: ponuda se može ponoviti ranije, ništa gore
  }
}

export const snoozedUntil = () => readNumber(SNOOZE_KEY);
export const snoozeOffer = (now: number) => writeNumber(SNOOZE_KEY, now + SNOOZE_MS);
export const lastCheckedAt = () => readNumber(LAST_CHECK_KEY);
export const markChecked = (now: number) => writeNumber(LAST_CHECK_KEY, now);

type AppUpdatePlugin = {
  check(): Promise<UpdateInfo>;
  startFlexible(): Promise<{ started: boolean }>;
  startImmediate(): Promise<{ started: boolean }>;
  completeUpdate(): Promise<void>;
  addListener(event: "downloaded", fn: () => void): Promise<PluginListenerHandle>;
};

/*
 * Plugin objekat se NIKAD ne vraća iz async funkcije niti awaituje kao
 * vrijednost (Capacitor proxy puca na `.then`, vidi CLAUDE.md); svaka funkcija
 * ispod ga dobija i zove metodu u istom izrazu.
 */
const NONE: UpdateInfo = { available: false, currentVersionCode: 0 };

export async function checkUpdate(): Promise<UpdateInfo> {
  try {
    const { registerPlugin } = await import("@capacitor/core");
    return await registerPlugin<AppUpdatePlugin>("AppUpdate").check();
  } catch {
    return NONE;
  }
}

export async function startUpdate(kind: "flexible" | "immediate"): Promise<boolean> {
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const plugin = registerPlugin<AppUpdatePlugin>("AppUpdate");
    const { started } = await (kind === "flexible" ? plugin.startFlexible() : plugin.startImmediate());
    return started;
  } catch {
    return false;
  }
}

export async function completeUpdate(): Promise<void> {
  try {
    const { registerPlugin } = await import("@capacitor/core");
    await registerPlugin<AppUpdatePlugin>("AppUpdate").completeUpdate();
  } catch {
    // ništa preuzeto ili plugin nedostupan
  }
}

/** Javlja kad preuzimanje u pozadini završi. Vraća odjavu. */
export async function onDownloaded(fn: () => void): Promise<() => void> {
  try {
    const { registerPlugin } = await import("@capacitor/core");
    const handle = await registerPlugin<AppUpdatePlugin>("AppUpdate").addListener("downloaded", fn);
    return () => void handle.remove();
  } catch {
    return () => {};
  }
}

/** Minimum sa servera; svaki neuspjeh = 0 (nema prisile). */
export async function fetchMinVersionCode(): Promise<number> {
  try {
    const res = await fetch(`${resolveApiBase()}/api/app-config`);
    if (!res.ok) return 0;
    const body = (await res.json()) as { android?: { minVersionCode?: unknown } };
    const n = body.android?.minVersionCode;
    return typeof n === "number" && Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
