import { PostHog } from "posthog-node";

export const posthog = new PostHog(process.env.POSTHOG_KEY!, {
  host: process.env.POSTHOG_HOST,
});

/**
 * Tanak wrapper oko `posthog.capture` (§43 analitika).
 * - Preskoči ako nema `guestId` (anoniman/server akter) — nema smeća u podacima.
 * - Uvijek doda `gameType: "zandar"`.
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
    properties: { gameType: "zandar", ...properties },
  });
}
