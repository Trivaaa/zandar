# SPEC — Profil i Postavke (v0.2, 22.11.2026)

> Izvor dizajna: platno „Kartaonica · identitet", table **„UI · Profil i Postavke — da se ljudi snađu"** (A1, A2, A3; preporuka A) i **„UI · Podešavanja igara"** (G1, G2 — list po igri). Oznake ekrana su iste kao na tablama.
> Status: dogovoreno sa vlasnikom u komentarima na tabli i u razgovoru 22.11.2026 (D1–D9). Kod nije započet.

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
| D6 | **Rezervna varijanta:** ako test (§8) pokaže da ljudi ne nalaze Postavke, ekran Profil dobija prekidač na vrhu „Profil \| Postavke" (dva taba unutar ekrana). Donja traka se ni tada ne mijenja. |
| D7 | **Web i Android.** Izuzetak od pravila „UI samo za web" (odluka vlasnika 22.11.2026), kao „Vrati se za sto" i meni za stolom. Aplikacija dobija izmjenu tek sljedećim paketom. |
| D8 | **Brojač partija po igri** se dodaje na server (pločica „najviše igraš"). |
| D9 | **Analitika** otvaranja Postavki i listova igara i promjena izbora (§7). |

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
| „Najviše igraš" | **Dodaje se (D8).** Server: `completedMatchesByGame` na profilu (`Partial<Record<GameId, number>>`), uvećava se na istom mjestu kao `completedMatches`, za sve četiri igre. Back-compat: profil bez polja = prazno; stare partije se ne broje unazad. `/api/me` (i javni profil, ako ga pokazuje) vraća polje. Pločica: igra sa najviše partija; nerješeno → zadnja igrana; bez ijedne partije → „—". Isti brojač daje redoslijed redova u „Moje igre". |
| Broj prijatelja | Postoji za nalog (lista prijatelja). Gost: „—". |
| „Igraš od / nalog od {mjesec}" | Provjeriti: vrijeme nastanka profila u Firestoreu / Firebase Auth `createdAt`. |
| Izbor po igri | `quickPlayPrefs` (po igri) + `tableTheme` (po igri) + `zandar:raub:deck`. |
| Postojeće komponente | `components/profile/ProfileScreen.tsx`, `GuestProfile.tsx`, `AccountProfile.tsx`, `GuestCard.tsx`; `components/home/SettingsSheet.tsx` (danas sheet, postaje ekran A3); `QuickPlaySettingsSheet` (osnova za list igre). |

## 7. Analitika (D9)

Šalje samo produkcija (isti gate kao ostali događaji, `docs/analytics.md`); tipovi idu u `AnalyticsEvents` u `shared-types`.

| Događaj | Kada | Svojstva |
|---|---|---|
| `settings_opened` | Otvoren ekran Postavke | `from`: `profile_pill` (ili `profile_tab` ako se pređe na rezervnu varijantu) |
| `game_settings_opened` | Otvoren list igre | `game`, `from`: `profile` |
| `game_setting_changed` | Dodir na izbor koji mijenja vrijednost | `game`, `setting` (`players`, `target`, `start_score`, `deck`, `table`), `value` |

Pitanja koja ovo odgovara: koliko ljudi uopšte nađe Postavke (uz test iz §8), koliko Raub igrača bira 11 umjesto 21, da li iko mijenja izgled stola. `play_requested` već nosi igru; za Raub dodati `start_score`.

## 8. Test (odluka D6)

- 4–5 ljudi koji ne znaju aplikaciju, telefon u ruci, bez objašnjenja.
- Zadaci: „Isključi zvuk." · „Namjesti da Raub kreće od 11." · „Nađi pravila Bele." · (gost) „Sačuvaj svoj napredak."
- **Kriterijum:** ako bar jedan ne nađe Postavke bez pomoći (zadatak „Isključi zvuk"), prelazi se na rezervnu varijantu — prekidač „Profil | Postavke" na vrhu ekrana Profil.
- Bilježi se: gdje je prvo tapnuo, koliko sekundi do cilja.

## 9. Van opsega

- Novi tab u donjoj traci, tema, veličina teksta, jezik, muzika — ništa od toga aplikacija nema i ne uvodi se ovdje.
- Varijanta B („Ja" kao jedan spisak) — odbijena u korist A.
- Sažetak podešavanja na kartici igre na početnoj — vlasnik odbio („ne treba, neću da komplikujem").

## 10. Redoslijed rada (prijedlog)

1. **Server:** `completedMatchesByGame` (store, rute, testovi, back-compat). Ide na deploy prvi.
2. **Web + aplikacija:** Profil A1/A2, Postavke A3 kao ekran, list igre (G1/G2 + Poker/Bela sa samo stolom), analitika.
3. **Provjera:** testovi, CDP 360×740 / 390×844, Android nazad (Postavke → Profil, list → Profil).
4. **Test sa ljudima (§8)** na stagingu, prije produkcije.
5. Aplikacija: sljedeći paket.
