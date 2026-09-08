import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Politika privatnosti — Žandar",
  description:
    "Koje podatke Žandar prikuplja, zašto, i kako ih možeš obrisati.",
};

/**
 * Politika privatnosti. Play Console traži javni URL ovog sadržaja prije nego
 * aplikacija može na Store, a Data Safety obrazac mora da se poklapa sa onim
 * što ovdje piše.
 *
 * NACRT — nije pravni savjet. Pregledaj prije objave, posebno kontakt adresu.
 */
export default function PrivatnostPage() {
  return (
    <LegalPage title="Politika privatnosti" updated="8. septembar 2026.">
      <p>
        Žandar (kartaonica.com) je kartaška igra koja se igra bez naloga. Ne
        tražimo e-mail, broj telefona ni lozinku, i ne naplaćujemo ništa.
      </p>

      <LegalSection title="Šta prikupljamo">
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>Nadimak</strong> koji sam upišeš prije igre. Vidljiv je
            ostalim igračima za stolom. Ne provjeravamo da li je pravo ime i
            savjetujemo da to i ne bude.
          </li>
          <li>
            <strong>Nasumični identifikator uređaja</strong> (&bdquo;guest
            ID&ldquo;). Generiše ga tvoj uređaj, nije vezan za tebe kao osobu, i
            služi da te vratimo za tvoj sto poslije prekida veze.
          </li>
          <li>
            <strong>Tok partije</strong> — odigrani potezi, rezultat i trajanje.
            Bez ovoga igra ne bi mogla da radi.
          </li>
          <li>
            <strong>Tehnički podaci</strong> koje šalje svaki pretraživač: IP
            adresa, tip uređaja i verzija aplikacije.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Šta NE prikupljamo">
        <p>
          Nemamo pristup tvojim kontaktima, lokaciji, kameri, mikrofonu,
          fotografijama ni datotekama. Ne prodajemo podatke i ne dijelimo ih sa
          oglašivačima.
        </p>
      </LegalSection>

      <LegalSection title="Alati koje koristimo">
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>PostHog</strong> — statistika korišćenja (koliko partija je
            odigrano, gdje ljudi odustaju). Vezana je za nasumični guest ID, ne
            za tvoje ime.
          </li>
          <li>
            <strong>Sentry</strong> — prijave grešaka kad aplikacija pukne, da
            bismo znali šta da popravimo. Izvještaj može da sadrži IP adresu i
            podatke o uređaju.
          </li>
        </ul>
        <p>
          Oba alata obrađuju podatke na serverima van tvoje zemlje. Serveri igre
          su u Sjedinjenim Državama.
        </p>
      </LegalSection>

      <LegalSection title="Šta stoji na tvom uređaju">
        <p>
          U lokalnom skladištu pretraživača čuvamo samo ovo: guest ID
          (<code>kartaonica_guest_id</code>), tvoj nadimak
          (<code>zandar_name</code>), pristup sobama u kojima igraš
          (<code>zandar:session:*</code>, <code>zandar:join:*</code>) i
          podešavanja zvuka i vibracije (<code>zandar:sound</code>,
          <code> zandar:haptics</code>).
        </p>
        <p>
          Sve to obrišeš brisanjem podataka aplikacije, odnosno podataka sajta u
          pretraživaču. Time gubiš i pristup partijama koje su u toku.
        </p>
      </LegalSection>

      <LegalSection title="Djeca">
        <p>
          Igra nije namijenjena djeci mlađoj od 13 godina i ne prikupljamo
          svjesno njihove podatke.
        </p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>
          Za brisanje podataka ili bilo kakvo pitanje o privatnosti piši na{" "}
          <strong>kontakt@kartaonica.com</strong>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
