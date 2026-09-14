import Link from "next/link";

import { LegalSection } from "@/components/legal/LegalPage";
import {
  ADDRESS_LINE,
  CONTACT_EMAIL,
  LEGAL_NAME,
  PUBLISHER,
} from "@/lib/contact";

/**
 * Tijelo politike privatnosti — dijele ga `/privatnost` (bosanski URL, vec
 * deployovan i linkovan) i `/privacy` (URL koji ide u Play Console).
 *
 * Jedan izvor, dvije rute: alias preko `redirects()` ne bi radio, jer je
 * `redirects()` no-op u `output: "export"` buildu, pa bi APK dobio mrtav link
 * BEZ greske pri buildu. Klijentski redirect bi Play recenzentu i botovima
 * servirao prazan dokument.
 *
 * NACRT — nije pravni savjet. Sadrzaj opisuje ono sto je procitano IZ KODA
 * (vidi reference u komentarima ispod); ako se kod promijeni, mijenja se i ovo.
 */
export const PRIVACY_UPDATED = "14. septembar 2026.";

export function PrivacyPolicyBody() {
  return (
    <>
      <p>
        {PUBLISHER} ({LEGAL_NAME}) upravlja Kartaonicom i igrom Žandar
        (kartaonica.com i Android aplikacija). Ovdje piše koje podatke
        prikupljamo, zašto, kome ih prosljeđujemo i kako tražiš brisanje.
      </p>

      <LegalSection title="Igra nema naloge">
        <p>
          Ne postoji registracija ni prijavljivanje na nalog. Za igru ne tražimo
          e-mail adresu, broj telefona ni lozinku, i ne naplaćujemo ništa —
          dovoljan je nadimak koji sam upišeš. E-adresu uzimamo samo ako se sam
          prijaviš za obavještenje o nekoj budućoj igri (vidi ispod).
        </p>
        <p>
          To ne znači da ne prikupljamo podatke. Prikupljamo ih — spisak je
          ispod.
        </p>
      </LegalSection>

      <LegalSection title="Šta prikupljamo">
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>Nadimak</strong> koji sam upišeš prije igre. Vidljiv je
            ostalim igračima za stolom i zapisuje se u našim serverskim
            zapisnicima. Ne provjeravamo da li je pravo ime i savjetujemo da to
            i ne bude.
          </li>
          <li>
            <strong>Nasumični identifikator uređaja</strong> (&bdquo;ID
            uređaja&ldquo;). Generiše ga tvoj uređaj pri prvom otvaranju, nije
            izveden iz tvog imena, e-maila ni hardvera, i služi da te vratimo za
            tvoj sto poslije prekida veze. Isti broj je oznaka pod kojom se vode
            podaci u analitici.
          </li>
          <li>
            <strong>Tok partije</strong> — odigrani potezi, rezultat, sjedište,
            tim i trajanje. Bez ovoga igra ne bi mogla da radi.
          </li>
          <li>
            <strong>Reakcije</strong> — emoji sa unaprijed zadatog spiska.
            Aplikacija nema pisani razgovor (chat), pa slobodnog teksta između
            igrača nema.
          </li>
          <li>
            <strong>E-adresa za obavještenje o budućoj igri</strong> — samo ako
            je sam upišeš na stranici igre koja još nije dostupna (npr. Poker) i
            označiš saglasnost. Uz adresu čuvamo koju igru si izabrao, vrijeme
            prijave i koji tekst saglasnosti si prihvatio. Adresu ne šaljemo u
            statistiku korišćenja i ne koristimo je ni za šta osim tog
            obavještenja.
          </li>
          <li>
            <strong>Podaci za obavještenja</strong> — samo u Android aplikaciji
            i samo ako ih uključiš. Čuvamo registracioni token koji telefonu
            dodijeli Google (Firebase Cloud Messaging), vremensku zonu uređaja,
            vrijeme posljednjeg otvaranja aplikacije, da li su obavještenja o
            stolu uključena i ID uređaja, da bismo zapis mogli obrisati na
            zahtjev. Token ne otkriva ko si — služi samo da poruka stigne na
            taj telefon.
          </li>
          <li>
            <strong>Tehnički podaci</strong> koje šalje svaki uređaj: IP adresa,
            tip uređaja i pregledača, verzija aplikacije. IP adresa se pojavljuje
            u zapisnicima našeg servera i kod servisa navedenih ispod.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Zašto to radimo">
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>Da igra radi</strong> — spajanje igrača za sto, provjera
            poteza, vraćanje u partiju poslije prekida veze.
          </li>
          <li>
            <strong>Da popravimo greške</strong> — kad aplikacija pukne,
            dobijemo izvještaj sa podacima o tome šta se desilo.
          </li>
          <li>
            <strong>Da ti javimo za igru koju si izabrao</strong> — i da po broju
            prijava odlučimo koju igru pravimo sljedeću. Ovo radimo samo uz
            saglasnost koju daješ u formi.
          </li>
          <li>
            <strong>Da razumijemo kako se igra koristi</strong> — koliko partija
            se odigra, gdje ljudi odustaju, koliko se čeka na sto.
          </li>
        </ul>
        <p>
          Ne prodajemo podatke, ne dijelimo ih sa oglašivačima i ne koristimo ih
          za profilisanje izvan gore navedenog. Aplikacija <strong>nema</strong>{" "}
          oglase ni kupovine u aplikaciji.
        </p>
      </LegalSection>

      <LegalSection title="Kome se podaci prosljeđuju">
        <p>
          Koristimo četiri vanjska servisa. Svaki od njih obrađuje podatke na
          svojim serverima:
        </p>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>Railway</strong> (Sjedinjene Američke Države) — serveri same
            igre. Tu se vode partije, privremeno se čuvaju sobe i čuvaju se
            prijave za obavještenje o budućim igrama.
          </li>
          <li>
            <strong>PostHog</strong> (Evropska unija) — statistika korišćenja,
            vezana za ID uređaja. Osim događaja koje sami šaljemo, PostHog
            automatski bilježi otvaranja ekrana i dodire po elementima, adresu sa
            koje si došao na sajt, IP adresu i približnu lokaciju izvedenu iz
            nje. <strong>Uključeno je i snimanje sesija</strong> — to znači da se
            snima kako se krećeš kroz aplikaciju, uključujući dodire i unos.
            Nadimak koji upišeš može se naći u takvom snimku.
          </li>
          <li>
            <strong>Sentry</strong> (Evropska unija, Njemačka) — izvještaji o
            greškama i mjerenje performansi za web verziju. Izvještaj sadrži IP
            adresu, podatke o uređaju i pregledaču, adrese stranica i zahtjeva, a
            na serverskoj strani i zaglavlja zahtjeva.
          </li>
          <li>
            <strong>Google Firebase Cloud Messaging</strong> (Sjedinjene
            Američke Države) — isporuka obavještenja na Android telefon, samo
            ako si ih uključio. Google dobija token uređaja i tekst
            obavještenja, na primjer nadimak igrača koji traži mjesto za tvojim
            stolom.
          </li>
        </ul>
        <p>
          Web verziju hostuje <strong>Vercel</strong>. Pisma koja nam pošalješ
          stižu na e-mail adresu navedenu na dnu ove stranice.
        </p>
      </LegalSection>

      <LegalSection title="Koliko dugo čuvamo">
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>Sobe i partije na našem serveru</strong> brišu se
            automatski: soba u kojoj je partija završena nestaje{" "}
            <strong>sat vremena</strong> poslije kraja, a soba bez ikakve
            aktivnosti <strong>12 sati</strong> poslije posljednjeg poteza.
            Provjera ide svakih deset minuta. Poslije toga zapis o partiji,
            zajedno sa nadimcima, više ne postoji kod nas.
          </li>
          <li>
            <strong>Prijave za obavještenje</strong> brišemo kad pošaljemo
            obavještenje o toj igri ili odlučimo da je ne pravimo — a najkasnije{" "}
            <strong>24 mjeseca</strong> od prijave. Ranije na zahtjev, vidi ispod.
          </li>
          <li>
            <strong>Podaci u PostHogu i Sentryju</strong> ostaju onoliko koliko
            traje rok čuvanja podešen kod tih servisa. Na zahtjev ih brišemo
            ranije — vidi ispod.
          </li>
          <li>
            <strong>Zapisnici servera</strong> (uključujući IP adrese) čuvaju se
            onoliko koliko ih Railway drži u svom sistemu zapisnika.
          </li>
          <li>
            <strong>Podaci za obavještenja</strong> brišu se automatski kad
            Google javi da aplikacija više nije instalirana, a najkasnije{" "}
            <strong>60 dana</strong> poslije posljednjeg otvaranja aplikacije.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Šta stoji na tvom uređaju">
        <p>
          U lokalnom skladištu pregledača, odnosno aplikacije, čuvamo ovo: ID
          uređaja (<code>kartaonica_guest_id</code>), tvoj nadimak
          (<code>zandar_name</code>), pristup sobama u kojima igraš
          (<code>zandar:session:*</code>, <code>zandar:join:*</code>) i
          podešavanja zvuka i vibracije (<code>zandar:sound</code>,
          <code> zandar:haptics</code>), a u Android aplikaciji i oznaku
          uređaja za obavještenja sa njihovim podešavanjima
          (<code>zandar:pushId</code>, <code>zandar:push:*</code>).
        </p>
        <p>
          Pored toga, <strong>PostHog upisuje svoj kolačić i svoj zapis</strong>{" "}
          u lokalno skladište (imena počinju sa <code>ph_</code>), sa rokom od
          godinu dana. Osim tog kolačića, sami ne postavljamo kolačiće i nemamo
          kolačiće za oglašavanje.
        </p>
        <p>
          Sve to obrišeš brisanjem podataka aplikacije, odnosno podataka sajta u
          pregledaču. Time gubiš i pristup partijama koje su u toku.
        </p>
      </LegalSection>

      <LegalSection title="Razlike između web i Android verzije">
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>Android aplikacija</strong> traži samo tri dozvole: pristup
            internetu, vibraciju i obavještenja. Za obavještenja te Android 13 i
            noviji pita izričito — i to tek kad u aplikaciji dodirneš
            &bdquo;Uključi obavještenja&ldquo;. Nema pristup lokaciji, kameri,
            mikrofonu, kontaktima, fotografijama ni datotekama, i ne koristi
            reklamni identifikator.
          </li>
          <li>
            <strong>Android rezervne kopije.</strong> Aplikacija dozvoljava
            sistemsku rezervnu kopiju, pa Android može kopirati podatke
            aplikacije — uključujući ID uređaja i nadimak — na tvoj Google Drive.
            Tu kopiju drži Google prema svojim pravilima, a možeš je isključiti u
            podešavanjima telefona.
          </li>
          <li>
            <strong>Sentry</strong> je uključen u web verziji. Aplikacija
            instalirana sa Play prodavnice koristi isti web sadržaj, pa se to
            odnosi i na nju.
          </li>
          <li>
            Web verzija se otvara u pregledaču, pa se na nju primjenjuju i
            postavke kolačića i praćenja koje si podesio u samom pregledaču.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Djeca">
        <p>
          Igra nije namijenjena djeci mlađoj od 13 godina i ne prikupljamo
          svjesno njihove podatke. Ako smatraš da nam je dijete poslalo podatke,
          javi se na adresu ispod i obrisaćemo ih.
        </p>
      </LegalSection>

      <LegalSection title="Tvoja prava i brisanje">
        <p>
          Prijavu za obavještenje možeš povući u bilo kom trenutku: piši na
          adresu ispod i navedi e-adresu koju si ostavio. Brišemo je za sve
          igre za koje si se prijavio.
        </p>
        <p>
          Možeš tražiti uvid u podatke koje vodimo pod tvojim ID-om uređaja,
          njihov ispravak ili brisanje. Kako se to radi i šta tačno brišemo piše
          na stranici{" "}
          <Link href="/delete-account" className="underline text-accent">
            Brisanje podataka
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Izmjene">
        <p>
          Ovu politiku možemo izmijeniti; datum posljednje izmjene stoji na vrhu
          stranice. Bitne izmjene najavićemo u samoj aplikaciji.
        </p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>
          Za pitanja o privatnosti i za zahtjeve za brisanje piši na{" "}
          <strong>{CONTACT_EMAIL}</strong>.
        </p>
        <p>
          {LEGAL_NAME}
          <br />
          {ADDRESS_LINE}
        </p>
      </LegalSection>
    </>
  );
}
