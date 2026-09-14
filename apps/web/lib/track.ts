"use client";

import posthog from "posthog-js";
import type { AnalyticsEvents, ClientAnalyticsEvent } from "@zandar/shared-types";

import { analyticsPlatform } from "@/lib/platform";

/**
 * Klijentski omotač za PostHog događaje (docs/analytics.md).
 *
 * Serverski `track()` (`apps/server/src/lib/posthog.ts`) nosi sve što se desi
 * NA serveru — i to je izvor istine za ishode (start i kraj meča, prijava).
 * Ovdje idu samo stvari koje zna jedino klijent: šta je igrač OTVORIO i TRAŽIO.
 *
 * Tipiziran preko `AnalyticsEvents` — događaj ili parametar van mape ne
 * kompajlira. ⚠ Nikad e-adresa, nadimak ili bilo šta što je igrač ukucao.
 */

/**
 * Analitika je FAIL-CLOSED: radi SAMO u produkcijskom buildu (kartaonica.com i
 * produkcijski APK), na tačno `NEXT_PUBLIC_APP_ENV=production`. Staging web,
 * staging APK i lokalni dev ne inicijalizuju PostHog i ne šalju ništa.
 *
 * Funkcija, ne konstanta: Next i dalje zapeče vrijednost u bundle, a testovi
 * mogu da je mijenjaju bez ponovnog učitavanja modula.
 */
export function isAnalyticsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_APP_ENV === "production";
}

/**
 * Parametri svakog događaja, registrovani jednom u `instrumentation-client.ts`
 * (pa ih nose i PostHog-ovi automatski događaji). `platform` je build-time
 * konstanta — WebView se predstavlja kao Chrome, pa user-agent laže.
 */
export const CLIENT_BASE_PROPS = {
  game: "zandar",
  platform: analyticsPlatform,
  app_env: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? "dev",
} as const;

type PropsArg<E extends ClientAnalyticsEvent> =
  AnalyticsEvents[E] extends Record<string, never> ? [] : [properties: AnalyticsEvents[E]];

export function track<E extends ClientAnalyticsEvent>(event: E, ...args: PropsArg<E>): void {
  if (!isAnalyticsEnabled() || typeof window === "undefined") return;
  try {
    posthog.capture(event, args[0]);
  } catch {
    // analitika nikad ne smije da obori ekran
  }
}

const FIRST_OPEN_KEY = "kartaonica_first_open";

/** Stranice koje nisu igra — otvaranje politike privatnosti nije prvo otvaranje aplikacije. */
const NON_APP_PATHS = ["/privatnost", "/privacy", "/uslovi", "/delete-account", "/o-nama", "/dev"];

/**
 * `first_open` — jednom po guest ID-u. Poziva se PRIJE nego što PostHog napravi
 * guest ID, sa informacijom da li je ID već postojao.
 *
 * Van produkcije ne dira ni `localStorage`: oznaka napisana na stagingu ne smije
 * da postoji, ni kao `sent` ni kao `pending`.
 *
 * Zašto stanje `pending`: ID nastaje na svakoj stranici (bootstrap PostHog-a),
 * pa bez njega igrač koji prvo otvori `/privatnost` ne bi nikad dobio
 * `first_open` — sljedeći put bi izgledao kao zatečen igrač.
 *
 * Zatečeni igrači (ID od prije ovog događaja) se tiho označe: inače bi svi
 * dobili lažan `first_open` na dan deploya i zagadili tu kohortu.
 *
 * Oznaka se piše PRIJE slanja — radije događaj manje nego duplikat.
 */
export function recordFirstOpen(hadGuestId: boolean): void {
  if (!isAnalyticsEnabled() || typeof window === "undefined") return;
  try {
    const state = localStorage.getItem(FIRST_OPEN_KEY);
    if (state === "sent") return;

    const path = window.location.pathname;
    if (NON_APP_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) {
      if (!hadGuestId) localStorage.setItem(FIRST_OPEN_KEY, "pending");
      return;
    }

    localStorage.setItem(FIRST_OPEN_KEY, "sent");
    if (hadGuestId && state !== "pending") return;
    track("first_open");
  } catch {
    // localStorage ume da baci (WebView bez site data) — bez događaja, bez pada
  }
}

/**
 * `?tester=1` / `?tester=0` — osobina osobe, ne događaja, pa PostHog-ov filter
 * internih korisnika skida i istoriju prije označavanja.
 */
export function applyTesterFlag(): void {
  if (!isAnalyticsEnabled() || typeof window === "undefined") return;
  try {
    const value = new URLSearchParams(window.location.search).get("tester");
    if (value === "1") posthog.setPersonProperties({ is_tester: true });
    else if (value === "0") posthog.setPersonProperties({ is_tester: false });
  } catch {
    // isto kao gore
  }
}
