import { PostHog } from "posthog-node";
import type { AnalyticsEvents, ServerAnalyticsEvent } from "@zandar/shared-types";

const APP_ENV = process.env.APP_ENV ?? "development";
/** Railway postavlja SHA za deploy sa GitHub-a; lokalno nema SHA-a. */
const APP_VERSION = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";

export const posthog = new PostHog(process.env.POSTHOG_KEY!, {
  host: process.env.POSTHOG_HOST,
});

/**
 * Analitika je FAIL-CLOSED: šalje SAMO produkcijski servis, i to na tačno
 * `APP_ENV=production`. Staging, lokalni dev, pogrešno napisan ili nepostavljen
 * env ne šalju ništa — PostHog projekat drži samo prave igrače.
 *
 * Čita se pri svakom pozivu, ne na učitavanju modula, da ga testovi mogu mijenjati.
 */
export function isAnalyticsEnabled(): boolean {
  return process.env.APP_ENV === "production";
}

/**
 * Tanak omotač oko `posthog.capture` (docs/analytics.md).
 * - Van produkcije ne radi ništa (`isAnalyticsEnabled`).
 * - Tipiziran preko `AnalyticsEvents`: događaj ili parametar van mape ne kompajlira.
 * - Preskoči bez distinctId-a (stari klijent, hidrirana soba) — nema smeća u podacima.
 * - Uvijek doda `game`, `app_env` i `app_version`, isto kao klijent.
 * - Nikad ne baca: analitika ne smije da obori potez.
 */
export function track<E extends ServerAnalyticsEvent>(
  distinctId: string | null | undefined,
  event: E,
  properties: AnalyticsEvents[E],
): void {
  if (!isAnalyticsEnabled() || !distinctId) return;
  try {
    posthog.capture({
      distinctId,
      event,
      properties: {
        game: "zandar",
        app_env: APP_ENV,
        app_version: APP_VERSION,
        ...properties,
      },
    });
  } catch {
    // analitika nikad ne smije da obori server
  }
}
