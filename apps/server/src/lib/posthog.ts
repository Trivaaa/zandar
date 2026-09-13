import { PostHog } from "posthog-node";

const APP_ENV = process.env.APP_ENV ?? "development";

export const posthog = new PostHog(process.env.POSTHOG_KEY!, {
  host: process.env.POSTHOG_HOST,
});

/**
 * Tanak wrapper oko `posthog.capture` (§43 analitika).
 * - Preskoči ako nema `guestId` (anoniman/server akter) — nema smeća u podacima.
 * - Uvijek doda `gameType: "zandar"` i `appEnv`, da staging saobracaj ne
 *   zagadi produkcijske kohorte (filter `appEnv = production`).
 */
export function track(
  guestId: string | null | undefined,
  event: string,
  properties: Record<string, unknown> = {},
): void {
  if (!guestId) return;
  posthog.capture({
    distinctId: guestId,
    event,
    properties: { gameType: "zandar", appEnv: APP_ENV, ...properties },
  });
}
