import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import {
  ADDRESS_CITY,
  ADDRESS_COUNTRY,
  ADDRESS_STREET,
  BRAND,
  CONTACT_EMAIL,
  GAME,
  LEGAL_NAME,
  PUBLISHER,
} from "@/lib/contact";

export const metadata: Metadata = {
  title: "O nama i kontakt — Žandar",
  description:
    "Kartaonica je projekat Tricoma iz Banje Luke. Pravni podaci, kontakt i šta aplikacija trenutno nudi.",
  alternates: { canonical: "https://kartaonica.com/o-nama" },
};

/**
 * O nama i kontakt.
 *
 * Postoji zbog Google Play Organization verification: Google poredi naziv,
 * pravni naziv i adresu sa sajta sa onim sto stoji u payments profilu, pa ovi
 * podaci moraju biti javni i doslovni (`lib/contact.ts` je jedini izvor).
 *
 * Opisuje SAMO ono sto aplikacija danas radi. Buduce igre se ne pominju kao
 * dostupne — brend jeste "Kartaonica", ali je Zandar trenutno jedina igra.
 */
export default function ONamaPage() {
  return (
    <LegalPage title="O nama i kontakt" updated="13. septembar 2026.">
      <p>
        <strong>{BRAND}</strong> je projekat {PUBLISHER}a, male firme iz Banje
        Luke. {GAME} je prva i <strong>trenutno jedina</strong> igra na
        Kartaonici.
      </p>

      <LegalSection title="Šta aplikacija nudi">
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>Brza igra</strong> — pritisneš jedno dugme i dobiješ sto
            odmah.
          </li>
          <li>
            <strong>Privatne sobe</strong> — napraviš sto i pozoveš prijatelje
            linkom; ti odobravaš ko sjeda.
          </li>
          <li>
            <strong>Dva do četiri igrača</strong>, uz igru u paru kad su
            četvorica za stolom.
          </li>
          <li>
            Prazna mjesta mogu popuniti <strong>kompjuterski protivnici</strong>,
            da partija može početi bez čekanja.
          </li>
          <li>
            <strong>Besplatno, bez naloga.</strong> Nema registracije, nema
            oglasa i nema kupovina u aplikaciji. Žetoni u igri su ukrasni i
            nemaju novčanu vrijednost.
          </li>
        </ul>
        <p>
          Igra radi u pregledaču na <strong>kartaonica.com</strong> i kao Android
          aplikacija.
        </p>
      </LegalSection>

      <LegalSection title="Izdavač">
        <p>
          <strong>{LEGAL_NAME}</strong>
          <br />
          {ADDRESS_STREET}
          <br />
          {ADDRESS_CITY}
          <br />
          {ADDRESS_COUNTRY}
        </p>
        <p>
          Javni naziv izdavača: <strong>{PUBLISHER}</strong>
        </p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>
          Za sva pitanja, prijave grešaka i zahtjeve u vezi sa podacima piši na{" "}
          <strong>{CONTACT_EMAIL}</strong>.
        </p>
        <p>
          Trudimo se da odgovorimo u roku od nekoliko radnih dana. Za zahtjeve
          koji se tiču brisanja podataka rok je najviše 30 dana.
        </p>
      </LegalSection>

      <LegalSection title="Pravne stranice">
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <Link href="/privacy" className="underline text-accent">
              Politika privatnosti
            </Link>
          </li>
          <li>
            <Link href="/uslovi" className="underline text-accent">
              Uslovi korišćenja
            </Link>
          </li>
          <li>
            <Link href="/delete-account" className="underline text-accent">
              Brisanje podataka
            </Link>
          </li>
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
