// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import posthog from "posthog-js";
import { getGuestId } from "@/lib/guestId";

Sentry.init({
  dsn: "https://7d96f7464b04a409c8e48593145bbbe3@o4511503641739264.ingest.de.sentry.io/4511503655239760",

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  defaults: '2026-01-30',
  bootstrap: {
    distinctID: getGuestId(),
    isIdentifiedID: false,
  },
});
posthog.register({ gameType: 'zandar' });

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
