import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Uslovi korišćenja — Žandar",
  description: "Pravila korišćenja igre Žandar na kartaonica.com.",
};

/**
 * Uslovi korišćenja.
 *
 * Ovdje — i SAMO ovdje — stoji da za stolom mogu sjediti kompjuterski
 * protivnici (HARD RULE 5, PRD §38.4). U igri se ta riječ nikad ne pojavljuje.
 *
 * NACRT — nije pravni savjet. Pregledaj prije objave, posebno kontakt adresu.
 */
export default function UsloviPage() {
  return (
    <LegalPage title="Uslovi korišćenja" updated="8. septembar 2026.">
      <p>
        Korišćenjem igre Žandar (kartaonica.com i mobilna aplikacija)
        prihvataš uslove ispod. Ako se ne slažeš, nemoj koristiti igru.
      </p>

      <LegalSection title="Ko može da igra">
        <p>
          Igra je namijenjena osobama od 13 godina naviše. Nalog nije potreban —
          dovoljan je nadimak. Odgovoran si za nadimak koji izabereš; uvredljivi
          nadimci se uklanjaju.
        </p>
      </LegalSection>

      <LegalSection title="Protivnici za stolom">
        <p>
          Da bi partija mogla da počne odmah, prazna mjesta za stolom mogu
          popuniti <strong>kompjuterski protivnici</strong> kojima upravlja naš
          server. Oni igraju po istim pravilima kao i ljudi i nemaju uvid u tuđe
          karte — razlika je samo u kvalitetu odluka.
        </p>
        <p>
          U privatnoj sobi domaćin sam bira hoće li prazna mjesta biti popunjena.
          U brzoj igri imaju prednost ljudi: kompjuterski protivnik sjeda samo
          kad nema dovoljno igrača.
        </p>
      </LegalSection>

      <LegalSection title="Žetoni">
        <p>
          Žetoni u igri su isključivo ukrasni. Nemaju novčanu vrijednost, ne
          mogu se kupiti za pravi novac, ne mogu se prodati, prenijeti ni
          zamijeniti za novac ili bilo šta van igre. Žandar nije kockanje i ne
          nudi igre na sreću za novac.
        </p>
      </LegalSection>

      <LegalSection title="Fer igra">
        <p>
          Nije dozvoljeno mijenjati klijent, koristiti automate za igranje,
          dogovarati se sa protivnicima na štetu ostatka stola, niti namjerno
          napuštati partije. Pristup takvim korisnicima može biti ograničen bez
          najave.
        </p>
        <p>
          Server je jedini sudija. Sve poteze provjerava i primjenjuje server;
          ono što klijent prikaže nema prednost nad stanjem na serveru.
        </p>
      </LegalSection>

      <LegalSection title="Dostupnost i odgovornost">
        <p>
          Igra se nudi &bdquo;takva kakva jeste&ldquo;, bez garancija. Možemo je
          mijenjati, privremeno prekinuti ili ugasiti. Prekid veze, restart
          servera ili greška mogu prekinuti partiju u toku; ne odgovaramo za
          izgubljene partije, rezultate ni žetone.
        </p>
      </LegalSection>

      <LegalSection title="Privatnost">
        <p>
          Koje podatke prikupljamo i zašto piše u{" "}
          <Link href="/privatnost" className="underline text-accent">
            politici privatnosti
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Izmjene i kontakt">
        <p>
          Uslove možemo izmijeniti; datum izmjene stoji na vrhu ove stranice.
          Pitanja idu na <strong>kontakt@kartaonica.com</strong>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
