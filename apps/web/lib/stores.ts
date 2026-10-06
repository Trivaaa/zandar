/**
 * Prodavnice aplikacija — jedno mjesto za linkove.
 *
 * `null` = aplikacija tamo još nije objavljena. Sekcija „Kartaonica na
 * telefonu" se na webu prikazuje i tada, sa oba mjesta neaktivna i jasno
 * označena. Kad listing prođe, upiše se URL ovdje i mjesto postaje link.
 *
 * ⚠ Zvanična oznaka („GET IT ON Google Play", „Download on the App Store")
 * ide TEK uz živ URL — smjernice obje prodavnice traže da oznaka vodi na
 * stvaran listing. Dok je `null`, crta se neutralna pločica iz tokena.
 * Oznake se preuzimaju iz zvaničnih izvora, nikad se ne izrezuju iz crteža:
 *   https://play.google.com/console/about/brand-and-marketing/
 *   https://developer.apple.com/app-store/marketing/guidelines/
 *
 * U APK-u se sekcija ne renderuje uopšte (`isNative`) — aplikacija ne
 * promoviše preuzimanje same sebe.
 */
export type StoreId = "app-store" | "google-play";

export const STORE_LINKS: Readonly<Record<StoreId, string | null>> = {
  "app-store": null,
  "google-play": "https://play.google.com/store/apps/details?id=com.kartaonica.zandar",
};

/** Redoslijed na ekranu (kao na referenci). */
export const STORE_ORDER: readonly StoreId[] = ["app-store", "google-play"];

/**
 * Link ka Play listingu koji NOSI poziv u sobu. Play parametar `referrer` vrati
 * aplikaciji pri prvom pokretanju poslije instalacije (Install Referrer), pa
 * igrač koji je instalirao sa pozivnice sleti na tu sobu, ne na početnu
 * (`lib/installReferrer.ts`). Čista funkcija — listing se prosljeđuje.
 */
export function withInviteReferrer(listingUrl: string, roomId?: string | null): string {
  if (!roomId) return listingUrl;
  const url = new URL(listingUrl);
  url.searchParams.set("referrer", `room=${roomId}`);
  return url.toString();
}

/** `null` dok aplikacija nije na Play-u — ponuda se tada ne crta uopšte. */
export function playStoreUrl(roomId?: string | null): string | null {
  const listing = STORE_LINKS["google-play"];
  return listing ? withInviteReferrer(listing, roomId) : null;
}

/** Id paketa iz Play listinga; staging APK je isti paket sa sufiksom. */
export function appPackage(staging: boolean): string | null {
  const listing = STORE_LINKS["google-play"];
  const id = listing ? new URL(listing).searchParams.get("id") : null;
  return id ? (staging ? `${id}.staging` : id) : null;
}

/**
 * Android `intent:` link koji pozivnicu otvara U APLIKACIJI, a kad aplikacije
 * nema vodi na `fallbackUrl` (Play listing sa sobom u referreru).
 *
 * Zašto treba pored App Linka: ugrađeni browseri (Messenger, Instagram, Viber…)
 * link učitaju u vlastitom WebView-u i NE šalju intent, pa Android verifikaciju
 * domena niko ni ne pita — igrač koji ima aplikaciju ostane na webu. Dodir na
 * `intent:` link je jedini put odatle u aplikaciju. `host` mora biti onaj iz
 * intent-filtera (`deepLinkHost`), `package` sprečava da ga preuzme neko drugi.
 */
export function appIntentUrl(
  host: string,
  roomId: string,
  pkg: string,
  fallbackUrl: string,
): string {
  return (
    `intent://${host}/room/${encodeURIComponent(roomId)}` +
    `#Intent;scheme=https;package=${pkg};` +
    `S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`
  );
}

const STORE_SNOOZE_KEY = "zandar:store:snoozeUntil";
/** „Ne sada" sakriva ponudu nedjelju dana — isto pravilo kao push ponuda. */
const STORE_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/** localStorage ume da BACI (privatni prozor, blokirani site data). */
export function isStoreOfferSnoozed(now: number = Date.now()): boolean {
  try {
    const until = Number(window.localStorage.getItem(STORE_SNOOZE_KEY));
    return Number.isFinite(until) && until > now;
  } catch {
    return false;
  }
}

export function snoozeStoreOffer(now: number = Date.now()): void {
  try {
    window.localStorage.setItem(STORE_SNOOZE_KEY, String(now + STORE_SNOOZE_MS));
  } catch {
    // Bez skladišta ponuda se vrati na sljedećem učitavanju — prihvatljivo.
  }
}
