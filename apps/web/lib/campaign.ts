import type { InstallCampaign } from "@zandar/shared-types";

/**
 * Kampanja iz koje je igrač došao, da preživi put web → Play → aplikacija.
 *
 * Aplikacija dobija novi guest ID, pa je `utm_*` iz plaćenog linka jedini trag
 * koji Play prenosi do prvog pokretanja (`referrer`, `lib/stores.ts`). Pamti se
 * za sesiju pregledača, jer SPA navigacija skida parametre sa adrese prije nego
 * što igrač dodirne ponudu.
 */

const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
const STORAGE_KEY = "zandar:campaign";
/** Ulaz je tuđ (adresa, Play). Play-ov `(not set)` i sve neobično otpada. */
const VALUE = /^[\w.-]{1,100}$/;

export function campaignFromParams(query: string | null | undefined): InstallCampaign {
  const params = new URLSearchParams(query ?? "");
  const campaign: InstallCampaign = {};
  for (const key of KEYS) {
    const value = params.get(key);
    if (value && VALUE.test(value)) campaign[key] = value;
  }
  return campaign;
}

/** Kampanja iz adrese (i zapamti je), inače zapamćena. Bez skladišta: samo iz adrese. */
export function rememberCampaign(query: string): InstallCampaign {
  const current = campaignFromParams(query);
  const hasCurrent = Object.keys(current).length > 0;
  try {
    const storage = window.sessionStorage;
    if (hasCurrent) {
      storage.setItem(STORAGE_KEY, new URLSearchParams(current).toString());
      return current;
    }
    return campaignFromParams(storage.getItem(STORAGE_KEY));
  } catch {
    // sessionStorage ume da baci (privatni prozor, blokirani site data).
    return current;
  }
}
