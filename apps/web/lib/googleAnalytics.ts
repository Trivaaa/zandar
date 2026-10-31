/**
 * Google Analytics na webu (stream „Kartaonica Web", docs/analytics.md).
 *
 * FAIL-CLOSED kao i PostHog: samo produkcijski WEB build. APK dijeli isti kod i
 * isti `NEXT_PUBLIC_APP_ENV`, ali ima Firebase Analytics, pa bi ga tag brojao
 * dvaput. Funkcija, ne konstanta, da je testovi mogu mijenjati (vidi `track.ts`).
 */
export const GA_MEASUREMENT_ID = "G-76WWHZ49Y0";

export function isGoogleAnalyticsEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_APP_ENV === "production" &&
    process.env.NEXT_PUBLIC_PLATFORM !== "native"
  );
}

/**
 * EEA + UK + Švajcarska: tu nema banera za saglasnost, pa GA ne smije upisivati
 * kolačiće. Odluku o regiji donosi Google po IP adresi posjetioca.
 */
export const GA_NO_COOKIE_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO",
  "GB", "CH",
] as const;

/** ID sobe je pozivnica za sto i ne ide Googleu. */
const ROOM_ID = /\/room\/[^/?#]+/;

export function stripRoomId(href: string): string {
  return href.replace(ROOM_ID, "/room/");
}

/**
 * Google-ov isječak uz saglasnost: oglašavanje je odbijeno svuda (reklama nema),
 * a kolačići za mjerenje u regijama iznad. `consent` mora ići PRIJE `config`.
 */
export const GA_INLINE_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'granted'
});
gtag('consent', 'default', {
  analytics_storage: 'denied',
  region: ${JSON.stringify(GA_NO_COOKIE_REGIONS)}
});
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', {
  page_location: location.href.replace(${ROOM_ID}, '/room/')
});
`;
