/**
 * Gdje kod trenutno radi. `NEXT_PUBLIC_PLATFORM=native` postavlja SAMO mobilni
 * build (`scripts/build-mobile.mjs`), pa je ovo build-time konstanta — bundler
 * je izbaci iz web bundle-a zajedno sa granama koje čuva.
 *
 * Ne pogađaj platformu iz `navigator.userAgent`: WebView se predstavlja kao
 * Chrome, pa bi native shell dobio web ponašanje.
 */
export const isNative = process.env.NEXT_PUBLIC_PLATFORM === "native";

/**
 * Baza API-ja. U native buildu NEMA fallback-a: `http://localhost:3001` unutar
 * APK-a pokazuje na sam telefon, pa bi aplikacija tiho otkazivala umjesto da
 * build padne. Android uz to blokira cleartext — produkcija mora biti HTTPS.
 */
export function resolveApiBase(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (url) return url;
  if (isNative) {
    throw new Error(
      "NEXT_PUBLIC_API_URL nije postavljen za mobilni build — APK bi gađao localhost telefona.",
    );
  }
  return "http://localhost:3001";
}
