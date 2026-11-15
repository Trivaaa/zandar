"use client";

import { useEffect, useState } from "react";
import type { AppOfferPlace } from "@zandar/shared-types";

import { isAppInstalled, useAndroidBrowser } from "@/components/AppOffer";
import { rememberCampaign } from "@/lib/campaign";
import { isStaging } from "@/lib/platform";
import { sr } from "@/lib/sr";
import { appOfferStoreUrl, appOpenUrl, appPackage } from "@/lib/stores";
import { track } from "@/lib/track";

/** Prikaz trake broji se jednom po posjeti (isto kao ostale ponude). */
const SHOWN_KEY = "zandar:store:stripShown";

function claimShown(place: AppOfferPlace): boolean {
  try {
    if (window.sessionStorage.getItem(SHOWN_KEY) === place) return false;
    window.sessionStorage.setItem(SHOWN_KEY, place);
  } catch {
    // Bez skladišta: prikaz se možda izbroji dvaput — prihvatljivo.
  }
  return true;
}

/**
 * Traka „Igraj u aplikaciji" na web početnoj (W1). Odluka vlasnika 15.11.2026:
 * stoji UVIJEK na Android pregledaču, bez zatvaranja; iPhone i desktop je ne vide
 * (aplikacija je samo za Android). Kad je aplikacija na telefonu — „Otvori".
 * Ne ide kroz `decideAppOffer`: ta pravila ostaju za red na kraju partije.
 *
 * `preview` je samo za `/dev/home` (desktop pregledač nije Android).
 */
export function WebAppStrip({ preview }: { preview?: { installed: boolean } | undefined }) {
  const android = useAndroidBrowser();
  const show = android || preview !== undefined;
  const [installed, setInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    if (!android || preview) return;
    let live = true;
    void isAppInstalled().then((value) => {
      if (live) setInstalled(value);
    });
    return () => {
      live = false;
    };
  }, [android, preview]);

  const isOpen = preview ? preview.installed : installed === true;
  const place: AppOfferPlace = isOpen ? "home_open" : "home_strip";

  useEffect(() => {
    if (show && !preview && installed !== null && claimShown(place)) track("app_offer_shown", { place });
  }, [show, preview, installed, place]);

  if (!show) return null;

  // Traka je na klijentu tek poslije hidracije (`useAndroidBrowser`), pa je `window` tu.
  const campaign = typeof window === "undefined" ? {} : rememberCampaign(window.location.search);
  const storeUrl = appOfferStoreUrl(place, campaign);
  const pkg = appPackage(isStaging);
  if (!storeUrl || !pkg) return null;
  const href = isOpen ? appOpenUrl(window.location.host, pkg, storeUrl) : storeUrl;
  // `intent:` ide u istom prozoru: novi tab ga ne razriješi.
  const linkProps = href.startsWith("intent:") ? {} : { target: "_blank", rel: "noopener noreferrer" };
  const onClick = () => track("app_offer_click", { place, ...campaign });

  return (
    <aside className="web-app" aria-label={sr.stores.barLabel} data-place={place}>
      <span className="web-app__text">{isOpen ? sr.homeWeb.appOpen : sr.homeWeb.app}</span>
      {isOpen ? (
        <a className="web-app__open" href={href} {...linkProps} onClick={onClick}>
          {sr.homeWeb.appOpenGo}
        </a>
      ) : (
        <a className="web-app__badge" href={href} {...linkProps} onClick={onClick}>
          {/* Zvanična oznaka (vlasnik, 15.11.2026); bijela pozadina oko sive ivice je prozirna. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/google-play-badge.png" alt={sr.homeWeb.playBadgeAlt} width={361} height={139} />
        </a>
      )}
    </aside>
  );
}
