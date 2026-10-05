"use client";

import { useState, useSyncExternalStore } from "react";
import { isNative } from "@/lib/platform";
import { roomIdFromLink } from "@/lib/routes";
import { sr } from "@/lib/sr";
import { isStoreOfferSnoozed, playStoreUrl, snoozeStoreOffer } from "@/lib/stores";

/**
 * Ponuda aplikacije na webu (Android): „Nabavite na usluzi Google Play".
 *
 * Zašto naša traka, a ne Chrome-ova ugrađena (`prefer_related_applications`):
 * njen link je statičan u manifestu, pa ne može ponijeti id sobe — igrač koji
 * instalira sa pozivnice bi sletio na početnu i izgubio poziv. Ova nosi sobu
 * kroz Play `referrer` (`lib/installReferrer.ts` je čita pri prvom pokretanju).
 *
 * Ko ima aplikaciju ovu traku ne vidi na pozivnici: App Link otvori aplikaciju
 * prije nego što se web učita.
 */

const noSubscribe = () => () => {};
/** User agent je ovdje u redu: pitanje je „koji telefon", ne „web ili shell" —
 *  to drugo rješava `isNative` (vidi `lib/platform.ts`). */
const isAndroidBrowser = () => /Android/i.test(navigator.userAgent);
const onServer = () => false;

/**
 * Link ponude ili `null` kad je nema: u APK-u, van Androida, dok listing ne
 * postoji, ili nedjelju dana poslije „Ne sada". Na sobi link nosi njen id.
 * `pathname` je ulaz samo da se link preračuna na navigaciju.
 */
export function useStoreOffer(pathname: string | null): {
  url: string | null;
  dismiss: () => void;
} {
  const android = useSyncExternalStore(noSubscribe, isAndroidBrowser, onServer);
  const [dismissed, setDismissed] = useState(false);

  const dismiss = () => {
    snoozeStoreOffer();
    setDismissed(true);
  };

  if (isNative || !android || dismissed || isStoreOfferSnoozed()) {
    return { url: null, dismiss };
  }
  // `android` je tačno samo na klijentu, pa je `window` ovdje siguran.
  void pathname;
  return { url: playStoreUrl(roomIdFromLink(window.location.href)), dismiss };
}

export function StoreOffer({ url, onDismiss }: { url: string; onDismiss: () => void }) {
  return (
    <>
      <span className="text-sm text-white">{sr.stores.bannerText}</span>
      <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
        {/* Zvanična oznaka, netaknuta (smjernice brenda): bez sjenke, bez
            izmjene boja; slika nosi vlastiti prazan prostor oko znaka. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/google-play-badge.png"
          alt={sr.stores.badgeAlt}
          width={646}
          height={250}
          className="h-14 w-auto"
        />
      </a>
      <button
        type="button"
        onClick={onDismiss}
        className="min-h-12 px-2 text-sm text-muted active:text-white"
      >
        {sr.stores.later}
      </button>
    </>
  );
}
