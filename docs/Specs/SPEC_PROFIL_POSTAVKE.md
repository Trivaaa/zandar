# SPEC — Profil i Postavke (v0.3, 24.11.2026)

> Izvor dizajna: platno „Kartaonica · identitet", table **„UI · Profil i Postavke — da se ljudi snađu"** (A1, A2, A3; preporuka A) i **„UI · Podešavanja igara"** (G1, G2 — list po igri). Oznake ekrana su iste kao na tablama. **G3 sa table „Podešavanja igara" je zamijenjen ekranom A3** (još ima sekciju „Igre" i „Ime za stolom" u Postavkama, što D4 ukida) — ne koristiti ga kao izvor.
> Status: v0.2 dogovorena sa vlasnikom 22.11.2026 (D1–D9). v0.3 (24.11.2026) dodaje D10–D14 iz analize table — **prihvaćeno** („ovo sad može da se pravi", 24.11.2026); gdje se v0.3 i tabla razlikuju, važi v0.3. **Kod:** grana `feat/profile-settings` (worktree `zandar-profile`), changelog 225; brojač po igri (D8) je od ranije (changelog 219).

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
| D10 | *(v0.3)* **Web početna poštuje zapamćen izbor kad postoji.** Bez zapisa ostaje današnji jedan dodir (Žandar 4 · 11, Raub od 21 — odluka 35, podloga nasumična). Zapamćen izbor i zapamćen sto važe svaki za sebe; čim je igrač u Profilu nešto izabrao, „Igraj" na web početnoj kreće s tim. Inače se na webu vraća isti bug kao povod (§1), samo obrnut: Profil kaže „od 11", sto kreće od 21. |
| D11 | *(v0.3)* **Gost vidi „Sačuvaj napredak" bez skrola.** Kod gosta kartica stoji odmah ispod pločica, iznad „Moje igre" (procjena za A1 na 360×740: ~690 px sadržaja na ~629 px ekrana — na kraju bi pala ispod ekrana, a to je jedini poziv na nalog kad nestanu velika dugmad). |
| D12 | *(v0.3)* **„Moje igre" idu istim redom kao na početnoj** (zakačena → zadnja igrana → redoslijed iz `GAMES` / `webHomeOrder`), ne po broju partija. Jedan poredak u cijelom proizvodu, bez druge logike. Brojač po igri služi samo pločici „najviše igraš". |
| D13 | *(v0.3)* **Red „igraš od / nalog od {mjesec}" ne ide u prvu verziju.** `/api/me` nema datum nastanka; vraća se kad server doda polje (§6). Do tada ispod imena: gost „Gost · N partija", nalog skraćen e-mail. |
| D14 | *(v0.3)* **Mjeri se da li je palo broj registracija** posle uklanjanja velikih „Registruj se" / „Prijavi se" (§7). |

## 3. Profil — A1 (gost) i A2 (nalog)

Redom odozgo:

1. **Zaglavlje:** naslov „Profil" lijevo, pilula „Postavke" desno (D3) → otvara A3.
2. **Identitet:** avatar, ime, olovka (mijenja ime / nadimak i avatar — postojeći tokovi). **Cijela kartica je jedna tapabilna zona** (odluka vlasnika 24.11.2026, komentar na tabli): avatar, ime i red ispod rade isto što i olovka, sa stanjem pritiska (i hover na webu) na cijeloj površini. Olovka desno ostaje kao znak da se mijenja (umjesto chevrona — dodir otvara izmjenu, ne novi ekran). U kodu je to jedan `<button>` sa `aria-label` „Promijeni ime i avatar". Lista odigranih partija iza dodira NIJE u v1 — server čuva samo brojače, ne istoriju partija. Ispod imena jedan red (D13 — bez „igraš od / nalog od" dok server ne da datum):
   - gost: oznaka „Gost" uz ime, red „N partija";
   - nalog: e-mail skraćen („jaca@…").
3. **Statistika — tri pločice:** broj partija · igra koju najviše igraš („najviše igraš") · broj prijatelja (gost: „—").
4. **Samo gost — kartica „Sačuvaj napredak"** (D11 — ovdje, iznad igara, ne na dnu): naslov, jedna rečenica („Rezultati, nadimak i prijatelji ostaju i na drugom telefonu."), žuto dugme „Napravi nalog", ispod tekst-link „Već imaš nalog? Prijavi se".
5. **„Moje igre · kako igraš"** — po jedan red za svaku živu igru, istim redom kao na početnoj (D12). Red = oznaka igre u njenoj boji (kao „dot" sa G3, ne ista ikonica karte za sve), ime, ispod trenutni izbor — samo ono što se bira; dodir otvara **list te igre** (§5). Primjeri teksta:
   - Žandar: „4 igrača · do 21 · Klasik"
   - Raub: „Od 21 · mađarice · Klasik"
   - Poker: „Sto: Drvo"
   - Bela: „Sto: Kafana" (2 na 2 i 501 su fiksni, ne pišu se)

**Gotovo kad (360×740):** bez skrola se vide dugme Postavke, kartica igrača, pločice i — kod gosta — kartica „Sačuvaj napredak"; kod naloga bar tri igre. Mjeri se CDP-om, ne procjenom.

Uklanja se: red Privatnost · Uslovi · O nama sa dna Profila (stoji na dnu Postavki — odluka vlasnika 24.11.2026); spisak „Uz nalog:", dugmad „Registruj se" / „Prijavi se" kao dva velika dugmeta, red „Postavke" u sredini, „Nazad na igru".

## 4. Postavke — A3

Poseban ekran sa strelicom „‹ Profil" (nazad i Android nazad vode na Profil). Grupe:

| Grupa | Redovi | Gost |
|---|---|---|
| Za stolom | Zvuk (prekidač), Vibracija (prekidač) | isto |
| Obavještenja | Sto i prijatelji (prekidač, „Neko kuca, poziv, partija počinje"). **Bez zasebnog reda „Podsjetnici"** (odluka vlasnika 24.11.2026, komentar na tabli). Samo u aplikaciji sa push-om. | isto |
| Pomoć | Pravila igara, Pošalji utisak („Greška, prijedlog ili pohvala"); na webu i „Preuzmi aplikaciju" | isto |
| Privatnost | Mjerenje reklama (`MetaConsentRow`, gdje se danas prikazuje), Brisanje podataka (`/delete-account`) | **isto — gost mora doći do brisanja podataka** (Play, politika) |
| Nalog | Odjava; Obriši nalog (crveno, zadnje). Nadimak i avatar NISU ovdje — mijenjaju se samo olovkom na Profilu (odluka vlasnika 24.11.2026). | **nema grupe** |
| Dno | Pravni red (Politika privatnosti · Uslovi), verzija | isto |

Crtež A3 na tabli pokazuje samo dio ovoga (nema Podsjetnika, Odjave, Obriši nalog, Mjerenja reklama, Preuzmi aplikaciju, pravnog reda, ni varijante za gosta) — važi ova tabela.

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
- Raub šalje izbor kao `startScore` na `/api/quickplay` (već na serveru od `7544a73`; klijent ga uzima iz `quickPlayPrefs.targetScore`, `lib/startQuickPlay.ts`). Karte Rauba su postojeći `zandar:raub:deck`.
- Isti izbor čita i web početna kad postoji zapis (D10).
- Trajanja ispod 11 / 21 u G1 („≈ 15 / ≈ 35 min") se ne objavljuju neprovjerena — model iz simulacije daje ~20 min za 4P Raub od 21 (CLAUDE.md, Raub). Bez provjerenog broja ide samo „kraća / duža".

## 6. Šta postoji, a šta fali (za implementaciju)

| Podatak | Stanje |
|---|---|
| Broj partija | Postoji: `completedMatches` po `uid`-u (gost je anonimni Firebase nalog, isti brojač). |
| „Najviše igraš" | **Urađeno (D8, changelog 219, na produkciji od `884ad47`).** Stare partije nisu brojane unazad, pa igrač sa istorijom neko vrijeme vidi igru iz malog uzorka — prihvaćeno. Prvobitni opis: Server: `completedMatchesByGame` na profilu (`Partial<Record<GameId, number>>`), uvećava se na istom mjestu kao `completedMatches`, za sve četiri igre. Back-compat: profil bez polja = prazno; stare partije se ne broje unazad. `/api/me` (i javni profil, ako ga pokazuje) vraća polje. Pločica: igra sa najviše partija; nerješeno → zadnja igrana; bez ijedne partije → „—". (Redoslijed redova u „Moje igre" ga više ne koristi — D12.) |
| Broj prijatelja | Postoji za nalog (lista prijatelja). Gost: „—". |
| „Igraš od / nalog od {mjesec}" | **Ne postoji** — `/api/me` ne vraća datum nastanka (`apps/web/lib/profile.ts`). Van prve verzije (D13). Kad se radi: Firebase Auth `accounts:lookup` → `createdAt` (važi i za stare naloge), ne novo Firestore polje (stari profili ga ne bi imali). |
| Izbor po igri | `quickPlayPrefs` (po igri) + `tableTheme` (po igri) + `zandar:raub:deck`. |
| Postojeće komponente | `components/profile/ProfileScreen.tsx`, `GuestProfile.tsx`, `AccountProfile.tsx`, `GuestCard.tsx`; `components/home/SettingsSheet.tsx` (danas sheet, postaje ekran A3); `QuickPlaySettingsSheet` (osnova za list igre). |

## 7. Analitika (D9)

Šalje samo produkcija (isti gate kao ostali događaji, `docs/analytics.md`); tipovi idu u `AnalyticsEvents` u `shared-types`.

| Događaj | Kada | Svojstva |
|---|---|---|
| `settings_opened` | Otvoren ekran Postavke | `from`: `profile_pill` (ili `profile_tab` ako se pređe na rezervnu varijantu) |
| `game_settings_opened` | Otvoren list igre | `game`, `from`: `profile` |
| `game_setting_changed` | Dodir na izbor koji mijenja vrijednost | `game`, `setting` (`players`, `target`, `start_score`, `deck`, `table`), `value` |

| `account_cta_tapped` *(v0.3, D14)* | Dodir na „Napravi nalog" ili „Prijavi se" | `action`: `register` \| `login`, `from`: `profile_card` |

Pitanja koja ovo odgovara: koliko ljudi uopšte nađe Postavke (uz test iz §8), koliko Raub igrača bira 11 umjesto 21, da li iko mijenja izgled stola, i da li je novi Profil smanjio registracije (udio gostiju sa `account_registered` sedmicu prije i poslije objave, uz `account_cta_tapped` za lijevak). `play_requested` već nosi igru; za Raub dodati `start_score`.

## 8. Test (odluka D6)

- 4–5 ljudi koji ne znaju aplikaciju, telefon u ruci, bez objašnjenja.
- Zadaci: „Isključi zvuk." · „Namjesti da Raub kreće od 11." · „Nađi pravila Bele." · (gost) „Sačuvaj svoj napredak." · „Gdje bi namjestio da partija Žandara bude kraća?" (da li podešavanje igre traže u Profilu ili u Postavkama).
- **Kriterijum:** ako bar jedan ne nađe Postavke bez pomoći (zadatak „Isključi zvuk"), prelazi se na rezervnu varijantu — prekidač „Profil | Postavke" na vrhu ekrana Profil.
- Bilježi se: gdje je prvo tapnuo, koliko sekundi do cilja.

## 9. Van opsega

- Novi tab u donjoj traci, tema, veličina teksta, jezik, muzika — ništa od toga aplikacija nema i ne uvodi se ovdje.
- Varijanta B („Ja" kao jedan spisak) — odbijena u korist A.
- Sažetak podešavanja na kartici igre na početnoj — vlasnik odbio („ne treba, neću da komplikujem").

## 10. Redoslijed rada (prijedlog)

1. ~~**Server:** `completedMatchesByGame`~~ — urađeno (changelog 219).
2. **Web + aplikacija:** Profil A1/A2 (D11–D13), Postavke A3 kao ekran (puna tabela §4, i gost), list igre (G1/G2 + Poker/Bela sa samo stolom), web početna čita izbor (D10), analitika (uklj. D14).
3. **Provjera:** testovi, CDP 360×740 / 390×844, Android nazad (Postavke → Profil, list → Profil).
4. **Test sa ljudima (§8)** na stagingu, prije produkcije.
5. Aplikacija: sljedeći paket.
