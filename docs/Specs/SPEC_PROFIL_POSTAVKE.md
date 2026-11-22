# SPEC — Profil i Postavke (v0.1, 22.11.2026)

> Izvor dizajna: platno „Kartaonica · identitet", table **„UI · Profil i Postavke — da se ljudi snađu"** (A1, A2, A3; preporuka A) i **„UI · Podešavanja igara"** (G1, G2 — list po igri). Oznake ekrana su iste kao na tablama.
> Status: dogovoreno sa vlasnikom u komentarima na tabli 22.11.2026. Kod nije započet.

## 1. Povod

- Igrač je prijavio: „u podešavanjima je 21, a Raub kreće od 11". Podešavanje igre je postojalo samo za Žandar (Postavke → Brza igra), a list Rauba je nudio izbor koji server nije slušao (popravljeno serverom, changelog 218, odluka 35 u `docs/raub-spec.md`).
- Današnji Profil (P0) je reklama za nalog: dva velika dugmeta i spisak prednosti zauzimaju pola ekrana, Postavke su jedan red u sredini, o igraču piše samo „3 završene partije", a „Nazad na igru" duplira donju traku.

## 2. Odluke

| # | Odluka |
|---|---|
| D1 | Donja traka ostaje sa **tri taba**: Igraj, Prijatelji, Profil. Postavke **nisu** zaseban tab — otvaraju se rijetko, a mjesto u traci čuvamo za nešto što se koristi stalno. |
| D2 | **Profil = ko si, šta igraš i kako.** Postavke = kako radi aplikacija. |
| D3 | Ulaz u Postavke je **dugme-pilula gore desno** na ekranu Profil: ikonica zupčanika + riječ „Postavke". Bez natpisa ljudi pogađaju šta je ikonica. |
| D4 | Podešavanja igara žive **samo u Profilu** (grupa „Moje igre · kako igraš"), ne i u Postavkama — jedno mjesto, jedan izvor. |
| D5 | Gost i igrač sa nalogom imaju **isti raspored** Profila; gost ima još i karticu „Sačuvaj napredak". |
| D6 | **Rezervna varijanta:** ako test (§7) pokaže da ljudi ne nalaze Postavke, ekran Profil dobija prekidač na vrhu „Profil \| Postavke" (dva taba unutar ekrana). Donja traka se ni tada ne mijenja. |

## 3. Profil — A1 (gost) i A2 (nalog)

Redom odozgo:

1. **Zaglavlje:** naslov „Profil" lijevo, pilula „Postavke" desno (D3) → otvara A3.
2. **Identitet:** avatar, ime, olovka (mijenja ime / nadimak i avatar — postojeći tokovi). Ispod imena jedan red:
   - gost: oznaka „Gost" uz ime, red „N partija · igraš od {mjesec}";
   - nalog: e-mail skraćen („jaca@…") · „nalog od {mjesec}".
3. **Statistika — tri pločice:** broj partija · igra koju najviše igraš („najviše igraš") · broj prijatelja (gost: „—").
4. **„Moje igre · kako igraš"** — po jedan red za svaku živu igru, redom koliko je igrač igra (najviše igrana prva; bez podataka — redoslijed iz `GAMES`). Red = oznaka igre u njenoj boji, ime, ispod trenutni izbor; dodir otvara **list te igre** (§5). Primjeri teksta:
   - Žandar: „4 igrača · do 21 · Klasik"
   - Raub: „Od 21 · mađarice · Klasik"
   - Poker: „Sto: Drvo"
   - Bela: „2 na 2 · do 501 · Kafana"
5. **Samo gost — kartica „Sačuvaj napredak":** naslov, jedna rečenica („Rezultati, nadimak i prijatelji ostaju i na drugom telefonu."), žuto dugme „Napravi nalog", ispod tekst-link „Već imaš nalog? Prijavi se".

Uklanja se: spisak „Uz nalog:", dugmad „Registruj se" / „Prijavi se" kao dva velika dugmeta, red „Postavke" u sredini, „Nazad na igru".

## 4. Postavke — A3

Poseban ekran sa strelicom „‹ Profil" (nazad i Android nazad vode na Profil). Grupe:

| Grupa | Redovi |
|---|---|
| Za stolom | Zvuk (prekidač), Vibracija (prekidač) |
| Obavještenja | Sto i prijatelji (prekidač, „Neko kuca, poziv, partija počinje"); Podsjetnici kad stignu (SPEC_PUSH_V2) |
| Pomoć | Pravila igara, Pošalji utisak („Greška, prijedlog ili pohvala"); na webu i „Preuzmi aplikaciju" |
| Nalog | Nadimak i avatar; Privatnost i podaci (Mjerenje reklama, Brisanje podataka, Politika privatnosti); Odjava — samo sa nalogom |

Svi redovi već postoje u današnjem `SettingsSheet` ili profilu — ovo je preslaganje, ne nova funkcija. „Ime za stolom" za gosta ide preko olovke na Profilu. **Nema** grupe „Igre" i nema „Brze igre" (D4). Dugme „Zatvori" otpada.

## 5. List igre — G1 (Raub), G2 (Žandar)

Isti list za svaku igru, naslov „{Igra} · kako igraš", X za zatvaranje. Samo opcije koje stvarno mijenjaju igru:

| Igra | Opcije |
|---|---|
| Žandar | Igrača 2 / 4 · Igra se do 11 / 21 · Sto |
| Raub | Kreće se od 11 / 21 (podrazumijevano **21**, odluka 35) · Karte mađarice / francuske · Sto. **Bez** 2 / 4 — brza igra je uvijek 4. |
| Poker | Sto |
| Bela | Sto (brza igra je uvijek 2 na 2 do 501) |

Pravila:
- **Čuva se odmah** — dodir na izbor je upis. Nema „Sačuvaj i zatvori", a zatvaranje lista ne upisuje ništa samo od sebe (tako je nastao lažni „21" kod Rauba).
- Dugme na dnu: „Igraj" sa izborom u sebi („od 21 →", „4 igrača · do 21 →") — pravo za sto.
- Opis ispod igre na Profilu pravi se iz istog izbora koji se šalje serveru; nevažeći zapis → podrazumijevano, nikad prazno.
- Raub šalje izbor kao `startScore` na `/api/quickplay` (već na serveru od `7544a73`). Karte Rauba su postojeći `zandar:raub:deck`.

## 6. Šta postoji, a šta fali (za implementaciju)

| Podatak | Stanje |
|---|---|
| Broj partija | Postoji: `completedMatches` po `uid`-u (gost je anonimni Firebase nalog, isti brojač). |
| „Najviše igraš" | **Ne postoji** — brojač nije po igri. Treba `completedMatchesByGame` na profilu (server, back-compat: bez polja = prazno) ili pločicu izostaviti dok ga nema. |
| Broj prijatelja | Postoji za nalog (lista prijatelja). Gost: „—". |
| „Igraš od / nalog od {mjesec}" | Provjeriti: vrijeme nastanka profila u Firestoreu / Firebase Auth `createdAt`. |
| Izbor po igri | `quickPlayPrefs` (po igri) + `tableTheme` (po igri) + `zandar:raub:deck`. |
| Postojeće komponente | `components/profile/ProfileScreen.tsx`, `GuestProfile.tsx`, `AccountProfile.tsx`, `GuestCard.tsx`; `components/home/SettingsSheet.tsx` (danas sheet, postaje ekran A3); `QuickPlaySettingsSheet` (osnova za list igre). |

## 7. Test (odluka D6)

- 4–5 ljudi koji ne znaju aplikaciju, telefon u ruci, bez objašnjenja.
- Zadaci: „Isključi zvuk." · „Namjesti da Raub kreće od 11." · „Nađi pravila Bele." · (gost) „Sačuvaj svoj napredak."
- **Kriterijum:** ako bar jedan ne nađe Postavke bez pomoći (zadatak „Isključi zvuk"), prelazi se na rezervnu varijantu — prekidač „Profil | Postavke" na vrhu ekrana Profil.
- Bilježi se: gdje je prvo tapnuo, koliko sekundi do cilja.

## 8. Van opsega

- Novi tab u donjoj traci, tema, veličina teksta, jezik, muzika — ništa od toga aplikacija nema i ne uvodi se ovdje.
- Varijanta B („Ja" kao jedan spisak) — odbijena u korist A.
- Sažetak podešavanja na kartici igre na početnoj — vlasnik odbio („ne treba, neću da komplikujem").

## 9. Otvorena pitanja

1. **Web ili i aplikacija?** Od 15.11.2026 UI rad je samo za web (razlika kroz `isNative`). Profil je i u aplikaciji — vlasnik odlučuje da li ide i u sljedeći paket (kao izuzetak, kao `ResumeBar` i meni za stolom).
2. „Najviše igraš": dodati brojač po igri na server, ili pločicu zamijeniti nečim što već postoji?
3. Analitika: da li mjeriti `settings_opened` (`from: profile_pill`) i `game_settings_opened` (`game`) da se uz test vidi i stvarno korišćenje?
