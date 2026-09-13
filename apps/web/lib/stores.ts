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
  "google-play": null,
};

/** Redoslijed na ekranu (kao na referenci). */
export const STORE_ORDER: readonly StoreId[] = ["app-store", "google-play"];
