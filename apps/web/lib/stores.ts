import type { AppOfferPlace, InstallCampaign } from "@zandar/shared-types";

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
 * (`lib/installReferrer.ts`). Istim putem ide i kampanja iz koje je došao, da se
 * instalacija može pripisati oglasu. Čista funkcija — listing se prosljeđuje.
 */
export function withInviteReferrer(
  listingUrl: string,
  roomId?: string | null,
  campaign: InstallCampaign = {},
): string {
  const referrer = new URLSearchParams(roomId ? { room: roomId } : {});
  for (const [key, value] of Object.entries(campaign)) referrer.set(key, value);
  // `toString`, ne `size`: `size` ne postoji na starijim Android pregledačima.
  const value = referrer.toString();
  if (!value) return listingUrl;
  const url = new URL(listingUrl);
  url.searchParams.set("referrer", value);
  return url.toString();
}

/** `null` dok aplikacija nije na Play-u — ponuda se tada ne crta uopšte. */
export function playStoreUrl(
  roomId?: string | null,
  campaign?: InstallCampaign,
): string | null {
  const listing = STORE_LINKS["google-play"];
  return listing ? withInviteReferrer(listing, roomId, campaign) : null;
}

/** Id paketa iz Play listinga; staging APK je isti paket sa sufiksom. */
export function appPackage(staging: boolean): string | null {
  const listing = STORE_LINKS["google-play"];
  const id = listing ? new URL(listing).searchParams.get("id") : null;
  return id ? (staging ? `${id}.staging` : id) : null;
}

/**
 * Play link ponude: `utm_content` kaže koje mjesto je donijelo instalaciju. Plaćena
 * kampanja ostaje netaknuta, jer po njoj se čita kohorta; mjesto se tada vidi iz
 * `app_offer_click`.
 */
export function appOfferStoreUrl(
  place: AppOfferPlace,
  campaign: InstallCampaign = {},
): string | null {
  return playStoreUrl(null, { utm_source: "web", utm_content: place, ...campaign });
}

/**
 * Android `intent:` link koji otvara APLIKACIJU, a kad je nema (ili je starija od
 * putanje `/otvori`) vodi na `fallbackUrl`. Launcher filter nije `BROWSABLE`, pa
 * pregledač smije pokrenuti samo App Link filter iz AndroidManifest-a; `host` mora
 * biti njegov (`deepLinkHost`), a `package` sprečava da link preuzme neko drugi.
 */
export function appOpenUrl(host: string, pkg: string, fallbackUrl: string): string {
  return (
    "intent://" + host + "/otvori" +
    "#Intent;scheme=https;package=" + pkg + ";" +
    "S.browser_fallback_url=" + encodeURIComponent(fallbackUrl) + ";end"
  );
}

/** Gdje host može prikazati ponudu; `AppOfferPlace` je ono što je stvarno prikazano. */
export type AppOfferSurface = "home" | "match_end";

export type AppOfferState = {
  /** Aplikacija je otkrivena na telefonu (`getInstalledRelatedApps`). */
  installed: boolean;
  snoozed: boolean;
  /** Koliko je puta odbijena traka „Preuzmi". */
  rejections: number;
  /** Igrač je na ovom pregledaču završio bar jednu partiju. */
  matchFinished: boolean;
  /** Ponuda prikazana u ovoj posjeti. */
  shownThisVisit: AppOfferPlace | null;
};

/** Poslije ovoliko × početna više ne nudi preuzimanje; ostaje red na kraju partije. */
const MAX_REJECTIONS = 3;

/** Šta ekran prikazuje, ili `null`. Na stolu, u lobiju i na pozivnici nema poziva. */
export function decideAppOffer(
  surface: AppOfferSurface,
  state: AppOfferState,
): AppOfferPlace | null {
  if (state.snoozed) return null;
  let place: AppOfferPlace | null;
  if (surface === "match_end") {
    place = state.installed ? null : "match_end";
  } else if (state.installed) {
    place = "home_open";
  } else {
    place = state.matchFinished && state.rejections < MAX_REJECTIONS ? "home_top" : null;
  }
  // Jedna ponuda po posjeti; ista se vraća kad se igrač vrati na ekran.
  return state.shownThisVisit && state.shownThisVisit !== place ? null : place;
}

const STORE_SNOOZE_KEY = "zandar:store:snoozeUntil";
const REJECTIONS_KEY = "zandar:store:rejections";
const MATCH_FINISHED_KEY = "zandar:store:matchFinished";
const VISIT_KEY = "zandar:store:offerShown";
/** × sakriva ponudu nedjelju dana — isto pravilo kao push ponuda. */
const STORE_SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

const OFFER_PLACES: readonly string[] = ["home_top", "home_open", "match_end"] satisfies AppOfferPlace[];

/** Skladište ume da BACI (privatni prozor, blokirani site data). Bez njega: čisto stanje. */
export function readAppOfferState(
  installed: boolean,
  now: number = Date.now(),
): AppOfferState {
  const state: AppOfferState = {
    installed,
    snoozed: false,
    rejections: 0,
    matchFinished: false,
    shownThisVisit: null,
  };
  try {
    const until = Number(window.localStorage.getItem(STORE_SNOOZE_KEY));
    state.snoozed = Number.isFinite(until) && until > now;
    const rejections = Number(window.localStorage.getItem(REJECTIONS_KEY));
    state.rejections = Number.isFinite(rejections) ? rejections : 0;
    state.matchFinished = window.localStorage.getItem(MATCH_FINISHED_KEY) !== null;
    const shown = window.sessionStorage.getItem(VISIT_KEY);
    state.shownThisVisit = shown && OFFER_PLACES.includes(shown) ? (shown as AppOfferPlace) : null;
  } catch {
    // Ponuda se u najgorem slučaju vrati na sljedećem učitavanju — prihvatljivo.
  }
  return state;
}

/** Zauzima ponudu ove posjete. `true` samo prvi put, da se prikaz broji jednom. */
export function claimAppOfferVisit(place: AppOfferPlace): boolean {
  try {
    if (window.sessionStorage.getItem(VISIT_KEY) === place) return false;
    window.sessionStorage.setItem(VISIT_KEY, place);
  } catch {
    // vidi `readAppOfferState`
  }
  return true;
}

export function recordAppOfferDismissed(place: AppOfferPlace, now: number = Date.now()): void {
  try {
    window.localStorage.setItem(STORE_SNOOZE_KEY, String(now + STORE_SNOOZE_MS));
    // Samo odbijena traka „Preuzmi" se broji: „Otvori" i red na kraju partije ostaju.
    if (place === "home_top") {
      const rejections = Number(window.localStorage.getItem(REJECTIONS_KEY));
      window.localStorage.setItem(
        REJECTIONS_KEY,
        String((Number.isFinite(rejections) ? rejections : 0) + 1),
      );
    }
  } catch {
    // vidi `readAppOfferState`
  }
}

export function recordMatchFinished(): void {
  try {
    window.localStorage.setItem(MATCH_FINISHED_KEY, "1");
  } catch {
    // vidi `readAppOfferState`
  }
}
