"use client";

import posthog from "posthog-js";

import { isNative } from "@/lib/platform";

/**
 * Klijentski omotač za PostHog događaje.
 *
 * Serverski `track()` (`apps/server/src/lib/posthog.ts`) i dalje nosi sve što
 * se desi NA serveru — i to je izvor istine za ishode (npr. `signup_succeeded`
 * se šalje tek kad je prijava upisana, a ne kad klijent misli da jeste). Ovdje
 * idu samo stvari koje zna jedino klijent: šta je igrač VIDIO i OTVORIO.
 *
 * Svaki događaj nosi `platform` — to je jedini pouzdan način da se web i APK
 * razdvoje, jer je `isNative` build-time konstanta (WebView se predstavlja kao
 * Chrome, pa user-agent laže). `appEnv` ide iz iste varijable kao Sentry, pa se
 * §43 kohorte filtriraju isto kao serverski događaji. `gameType` je već
 * registrovan u `instrumentation-client.ts`.
 *
 * ⚠ Nikad e-adresa, nadimak ili bilo šta što je igrač ukucao. Parametri su
 * identifikatori (slug igre), ne sadržaj.
 */
export type ClientEvent = "upcoming_games_viewed" | "teaser_opened";

export function track(
  event: ClientEvent,
  properties: Record<string, string | number | boolean> = {},
): void {
  if (typeof window === "undefined") return;
  try {
    posthog.capture(event, {
      platform: isNative ? "native" : "web",
      appEnv: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
      ...properties,
    });
  } catch {
    // analitika nikad ne smije da obori ekran
  }
}
