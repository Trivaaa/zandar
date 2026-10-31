import Script from "next/script";

import {
  GA_INLINE_SCRIPT,
  GA_MEASUREMENT_ID,
  isGoogleAnalyticsEnabled,
} from "@/lib/googleAnalytics";

export function GoogleAnalytics() {
  if (!isGoogleAnalyticsEnabled()) return null;
  return (
    <>
      <Script id="google-analytics" strategy="afterInteractive">
        {GA_INLINE_SCRIPT}
      </Script>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
    </>
  );
}
