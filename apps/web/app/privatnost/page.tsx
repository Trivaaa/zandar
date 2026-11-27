import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import {
  PrivacyPolicyBody,
  PRIVACY_UPDATED,
} from "@/components/legal/PrivacyPolicyBody";

export const metadata: Metadata = {
  title: "Politika privatnosti — Kartaonica",
  description:
    "Koje podatke Kartaonica prikuplja, zašto, kome ih prosljeđuje i kako ih obrišeš.",
  // Apsolutni URL: `app/layout.tsx` nema `metadataBase`, pa bi relativan
  // canonical pri buildu bio razrijesen prema localhost-u.
  alternates: { canonical: "https://kartaonica.com/privatnost" },
};

/**
 * Politika privatnosti (bosanski URL). Tijelo dijeli sa `/privacy` — vidi
 * `components/legal/PrivacyPolicyBody.tsx`. Ova ruta je kanonska jer je vec
 * deployovana i linkovana iz `/uslovi` i sa pocetne.
 *
 * NACRT — nije pravni savjet.
 */
export default function PrivatnostPage() {
  return (
    <LegalPage title="Politika privatnosti" updated={PRIVACY_UPDATED}>
      <PrivacyPolicyBody />
    </LegalPage>
  );
}
