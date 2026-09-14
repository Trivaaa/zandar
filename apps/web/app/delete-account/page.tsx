import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { GuestIdBlock } from "@/components/legal/GuestIdBlock";
import { BRAND, CONTACT_EMAIL, LEGAL_NAME, PUBLISHER } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Brisanje podataka — Žandar",
  description:
    "Kako zatražiti brisanje podataka koje Kartaonica čuva, šta se briše i u kom roku.",
  alternates: { canonical: "https://kartaonica.com/delete-account" },
};

/**
 * Brisanje podataka.
 *
 * Putanja je `/delete-account` jer je to URL koji ide u Play Console, ali se
 * stranica zove "Brisanje podataka", a ne "Brisanje naloga": aplikacija NEMA
 * naloge (nema registracije ni lozinke; e-adresa postoji samo kao dobrovoljna
 * prijava za obavještenje o budućoj igri), pa bi drugi naslov tvrdio
 * nesto sto ne postoji i recenzent bi trazio nepostojeci ekran za prijavu.
 *
 * Postupak je RUCAN i tekst to izricito kaze — nema automatizovanog brisanja u
 * kodu. Zato stranica prikazuje ID uredjaja: server ga ne cuva, pa je broj koji
 * korisnik sam posalje jedini nacin da se zahtjev poveze sa podacima.
 *
 * NACRT — nije pravni savjet.
 */
export default function DeleteAccountPage() {
  return (
    <LegalPage title="Brisanje podataka" updated="14. septembar 2026.">
      <p>
        Ova stranica se odnosi na <strong>{BRAND}</strong> i igru Žandar
        (kartaonica.com i Android aplikacija), koje izdaje {PUBLISHER} (
        {LEGAL_NAME}).
      </p>

      <LegalSection title="Igra nema naloge">
        <p>
          Ne postoji registracija ni prijava, pa nema naloga koji bi se ugasio.
          Umjesto naloga, tvoj uređaj nosi{" "}
          <strong>nasumični identifikator</strong> pod kojim se vode podaci u
          analitici i izvještajima o greškama. Brisanje se traži za taj broj.
        </p>
      </LegalSection>

      <LegalSection title="Pošalji zahtjev">
        <p>
          Ispod je ID ovog uređaja. Kopiraj ga i pošalji nam poruku — dugme
          otvara tvoj program za e-mail sa unaprijed popunjenim naslovom i
          tekstom.
        </p>

        <GuestIdBlock />

        <p>
          Ako se dugme ne otvori, pošalji poruku ručno na{" "}
          <strong>{CONTACT_EMAIL}</strong> sa naslovom{" "}
          <strong>&bdquo;Zahtjev za brisanje podataka — Kartaonica&ldquo;</strong>{" "}
          i navedi ID uređaja.
        </p>
        <p>
          <strong>Ne moraš ponovo instalirati aplikaciju</strong> ni bilo šta
          preuzimati da bi poslao zahtjev.
        </p>
      </LegalSection>

      <LegalSection title="Šta brišemo na tvoj zahtjev">
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>Podatke o korišćenju</strong> vezane za taj ID uređaja kod
            našeg servisa za statistiku, uključujući snimke sesija.
          </li>
          <li>
            <strong>Izvještaje o greškama</strong> koji se mogu povezati sa tim
            ID-om.
          </li>
          <li>
            <strong>Zapis uređaja za obavještenja</strong> (token i
            podešavanja), ako si obavještenja uključio u Android aplikaciji.
          </li>
        </ul>
        <p>
          Brisanje radimo <strong>ručno</strong> — ne postoji dugme koje ga
          izvršava samo. Zahtjev obrađujemo{" "}
          <strong>najkasnije u roku od 30 dana</strong> i javljamo ti kad je
          gotovo.
        </p>
      </LegalSection>

      <LegalSection title="Prijava za obavještenje o budućoj igri">
        <p>
          Ako si ostavio e-adresu na stranici neke igre koja još nije dostupna,
          prijavu povlačiš porukom na <strong>{CONTACT_EMAIL}</strong> — navedi
          e-adresu koju si ostavio. ID uređaja tu nije potreban. Brišemo sve
          prijave te adrese, za sve igre, u istom roku od 30 dana.
        </p>
        <p>
          I bez zahtjeva prijavu brišemo kad pošaljemo obavještenje o toj igri
          ili odlučimo da je ne pravimo — a najkasnije{" "}
          <strong>24 mjeseca</strong> od prijave.
        </p>
      </LegalSection>

      <LegalSection title="Šta se briše samo, bez zahtjeva">
        <p>
          Partije i sobe na našem serveru brišu se automatski: soba sa završenom
          partijom nestaje <strong>sat vremena</strong> poslije kraja, a soba bez
          aktivnosti <strong>12 sati</strong> poslije posljednjeg poteza. Tu su i
          nadimci sa stola, pa poslije tog roka taj zapis kod nas više ne
          postoji.
        </p>
        <p>
          Zapis za obavještenja nestaje kad deinstaliraš aplikaciju (čim Google
          to javi), a najkasnije <strong>60 dana</strong> poslije posljednjeg
          otvaranja aplikacije.
        </p>
      </LegalSection>

      <LegalSection title="Šta brišeš sam, odmah">
        <p>
          Podaci koje aplikacija drži na tvom uređaju — ID uređaja, nadimak,
          pristup sobama i podešavanja zvuka — brišu se brisanjem podataka
          aplikacije, odnosno podataka sajta u pregledaču. To djeluje odmah i ne
          traži nas.
        </p>
        <p>
          Na Androidu: <em>Podešavanja → Aplikacije → Žandar → Memorija →
          Obriši podatke</em>. Time gubiš i pristup partijama koje su u toku.
        </p>
      </LegalSection>

      <LegalSection title="Šta zadržavamo">
        <p>
          Zapisnici servera mogu kraće vrijeme sadržati tehničke podatke, između
          ostalog IP adrese, jer su potrebni za bezbjednost i otkrivanje
          kvarova. Zadržavamo i zbirnu statistiku iz koje se ne može utvrditi ko
          si — na primjer ukupan broj odigranih partija.
        </p>
      </LegalSection>

      <LegalSection title="Više o podacima">
        <p>
          Potpun spisak onoga što prikupljamo i kome se prosljeđuje je u{" "}
          <Link href="/privacy" className="underline text-accent">
            politici privatnosti
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
