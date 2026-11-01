"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { AppOfferPlace } from "@zandar/shared-types";
import { rememberCampaign } from "@/lib/campaign";
import { isNative, isStaging } from "@/lib/platform";
import { sr } from "@/lib/sr";
import {
  appOfferStoreUrl,
  appOpenUrl,
  appPackage,
  claimAppOfferVisit,
  decideAppOffer,
  readAppOfferState,
  recordAppOfferDismissed,
  recordMatchFinished,
  type AppOfferSurface,
} from "@/lib/stores";
import { track } from "@/lib/track";

/**
 * Ponuda aplikacije na webu (Android, tabla „Ponuda aplikacije"): traka na vrhu
 * početne (W1), ista traka sa „Otvori" kad je aplikacija na telefonu (W6) i tih
 * red na kraju partije (W4). Pravila su u `decideAppOffer`.
 *
 * Zašto naša ponuda, a ne Chrome-ova ugrađena (`prefer_related_applications`): njen
 * link je statičan u manifestu, pa ne može reći Play-u koje je mjesto donijelo
 * instalaciju ni koja kampanja.
 */

const noSubscribe = () => () => {};
/** User agent je ovdje u redu: pitanje je „koji telefon", ne „web ili shell" —
 *  to drugo rješava `isNative` (vidi `lib/platform.ts`). */
const isAndroidBrowser = () => /Android/i.test(navigator.userAgent);
const onServer = () => false;

export function useAndroidBrowser(): boolean {
  return useSyncExternalStore(noSubscribe, isAndroidBrowser, onServer);
}

type NavigatorWithRelatedApps = Navigator & {
  getInstalledRelatedApps?: () => Promise<unknown[]>;
};

let installedCheck: Promise<boolean> | null = null;

/**
 * Traži `related_applications` u manifestu i `asset_statements` u APK-u. Radi samo
 * u Chrome-u na Androidu; gdje API ne postoji ili baci, igrač dobija „Preuzmi".
 */
function isAppInstalled(): Promise<boolean> {
  installedCheck ??= (async () => {
    try {
      const apps = await (navigator as NavigatorWithRelatedApps).getInstalledRelatedApps?.();
      return (apps?.length ?? 0) > 0;
    } catch {
      return false;
    }
  })();
  return installedCheck;
}

type AppOffer = {
  place: AppOfferPlace;
  href: string;
  /** `intent:` ide u istom prozoru: novi tab ga ne razriješi. */
  linkProps: { target: string; rel: string } | Record<string, never>;
  onClick: () => void;
  onDismiss: () => void;
};

function useAppOffer(surface: AppOfferSurface): AppOffer | null {
  const android = useAndroidBrowser();
  const eligible = !isNative && android;
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!eligible) return;
    let live = true;
    void isAppInstalled().then((value) => {
      if (live) setInstalled(value);
    });
    return () => {
      live = false;
    };
  }, [eligible]);

  const place =
    eligible && installed !== null && !dismissed
      ? decideAppOffer(surface, readAppOfferState(installed))
      : null;

  useEffect(() => {
    if (place && claimAppOfferVisit(place)) track("app_offer_shown", { place });
  }, [place]);

  if (!place) return null;

  // `place` postoji samo na klijentu, pa je `window` ovdje siguran.
  const campaign = rememberCampaign(window.location.search);
  const storeUrl = appOfferStoreUrl(place, campaign);
  const pkg = appPackage(isStaging);
  if (!storeUrl || !pkg) return null;
  const href = place === "home_open" ? appOpenUrl(window.location.host, pkg, storeUrl) : storeUrl;

  return {
    place,
    href,
    linkProps: href.startsWith("intent:") ? {} : { target: "_blank", rel: "noopener noreferrer" },
    onClick: () => track("app_offer_click", { place, ...campaign }),
    onDismiss: () => {
      recordAppOfferDismissed(place);
      track("app_offer_dismiss", { place });
      setDismissed(true);
    },
  };
}

function CloseIcon({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/** W1 i W6: u toku stranice, gura sadržaj nadolje i ništa ne pokriva. */
export function AppOfferBar() {
  const offer = useAppOffer("home");
  if (!offer) return null;
  const open = offer.place === "home_open";
  return (
    <aside className="app-bar" aria-label={sr.stores.barLabel} data-place={offer.place}>
      <button type="button" className="app-bar__close" aria-label={sr.stores.close} onClick={offer.onDismiss}>
        <CloseIcon size={18} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="app-bar__icon" src="/icon-192.png" alt="" width={40} height={40} />
      <span className="app-bar__text">
        <b>{open ? sr.stores.openTitle : sr.stores.barTitle}</b>
        <small>{open ? sr.stores.openBody : sr.stores.barBody}</small>
      </span>
      <a className="app-bar__go" href={offer.href} {...offer.linkProps} onClick={offer.onClick}>
        {open ? sr.stores.openGo : sr.stores.barGo}
      </a>
    </aside>
  );
}

/** W4: tih red ispod „Igraj još". Prikaz znači da je partija završena. */
export function AppOfferRow() {
  useEffect(() => {
    if (!isNative) recordMatchFinished();
  }, []);
  const offer = useAppOffer("match_end");
  if (!offer) return null;
  return (
    <div className="app-row" data-place={offer.place}>
      <span className="app-row__text">
        {sr.stores.rowTitle}
        <small>{sr.stores.rowBody}</small>
      </span>
      <a className="app-row__go" href={offer.href} {...offer.linkProps} onClick={offer.onClick}>
        {sr.stores.rowGo}
      </a>
      <button type="button" className="app-row__close" aria-label={sr.stores.later} onClick={offer.onDismiss}>
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
