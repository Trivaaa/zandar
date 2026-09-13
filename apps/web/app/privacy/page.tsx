import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import {
  PrivacyPolicyBody,
  PRIVACY_UPDATED,
} from "@/components/legal/PrivacyPolicyBody";

export const metadata: Metadata = {
  title: "Politika privatnosti — Žandar",
  description:
    "Koje podatke Kartaonica prikuplja, zašto, kome ih prosljeđuje i kako ih obrišeš.",
  // Isti kanonski cilj kao `/privatnost` — dva URL-a, jedan sadrzaj.
  alternates: { canonical: "https://kartaonica.com/privatnost" },
};

/**
 * Politika privatnosti na engleskoj putanji. OVAJ URL ide u Play Console:
 * stabilan je, recenzent po imenu vidi sta je, i pravi je 200 sa sadrzajem u
 * OBA builda (nije redirect — `redirects()` je no-op u `output: "export"`).
 *
 * Sadrzaj je namjerno isti fajl kao `/privatnost`, da se dvije stranice ne
 * raziđu.
 */
export default function PrivacyPage() {
  return (
    <LegalPage title="Politika privatnosti" updated={PRIVACY_UPDATED}>
      <PrivacyPolicyBody />
    </LegalPage>
  );
}
