# SPEC — Push v2: povratak neaktivnih igrača i uključivanje obavještenja · NACRT v1

> **Status:** odobreno 22.11.2026 (aplikacija je izuzetak; kontrolna grupa 50 % → 10 %; tap → početna sa igrom). F1 i F2 implementirani na `feat/push-v2` (changelog 211); A4 nije rađen.
> **Zamjenjuje:** PRD §51.5 (v2, podsjetnici na neaktivnost). PRD §51.1–51.4 (principi, v1 katalog, dozvola, arhitektura) i dalje važe.
> **Vezano:** SPEC_RANG §5.8 (tekstovi podsjetnika iz lige — uključuju se u isti mehanizam kad liga bude gotova), `docs/analytics.md`, memorija o PMF pragovima (D1 35 / D7 15 / D30 6).
> **Platforma:** samo Android aplikacija. Web push i iOS su van opsega.
> Datum: 2026-11-22.

---

## 0. Šta se mijenja u odnosu na §51.5 (sažetak revizije)

| § 51.5 je rekao | Ovaj spec kaže | Zašto |
|---|---|---|
| Podsjetnici idu svima kojima je dozvola data | **Prvo dosegnuti igrače** (dio A), pa tek onda slati podsjetnike (dio B) | Za 60 dana ponuda je prikazana ~35 ljudi, a dozvolu su dala 4. Ponuda nikad ne izlazi u Brzoj igri, gdje igra većina igrača aplikacije (54 od 80). Bez dosega podsjetnici nemaju koga da vrate |
| Prozor 18–21 h, nikad 22–09 | **Lični sat** (sat u kojem igrač obično igra), između 10 i 22 h; tiho 23–09 | Vrh igranja je 21–23 h (22 h je najjači sat, 45 igrača). Stari prozor promašuje baš najjači dio dana |
| Holdout 10 % | **50/50 dok svaka grupa ne dobije 100 igrača**, pa 10 % | Uz ~40 novih igrača aplikacije mjesečno, 10 % daje ~4 osobe mjesečno u kontrolnoj grupi i rezultat se ne bi mogao pročitati godinu dana |
| Tekst rotira | **Lista razloga po prioritetu, svaki sa uslovom.** Šalje se prvi razlog koji je tačan u trenutku slanja | Tačnost teksta se tako provjerava kodom. Liga (SPEC_RANG §5.8) se kasnije dodaje kao novi razlozi, bez novog mehanizma |
| Signal je zadnje otvaranje aplikacije | Zadnje otvaranje **po igraču** (svi uređaji naloga), uz podatke o zadnjoj partiji na zapisu uređaja | Igrač sa dva telefona ne smije dobiti podsjetnik na jednom dok igra na drugom. „Revanš?" traži da znamo ishod zadnje partije |
| — | Najava nove igre je zaseban razlog (npr. Bela) | To je najistinitiji razlog za povratak koji danas imamo |
| — | Posljednji podsjetnik kaže da je posljednji | Igrač zna da ga nećemo dalje zvati, pa je manje razloga da ugasi kanal |

---

## 1. Problem

Aplikacija dovodi igrače, ali ih slabo vraća. Kohorta aplikacije u zadnjih 60 dana: 80 prvih otvaranja, 54 igrača sa završenom partijom, D1 30 % (24/80). D7 se još ne može pouzdano pročitati (8 od 25 igrača dovoljno starih za D7 se vratilo između 6. i 8. dana; n = 25). Prag PMF-a je D1 35 % i D7 15 %.

Push je jedini kanal kojim igrača koji je otišao možemo pozvati nazad. Danas ga skoro niko nema uključenog: za 60 dana ponuda je prikazana 78 puta (~35 ljudi), prihvaćena 4 puta, a dozvola je data 4 puta. Ponuda postoji samo u lobiju privatnog stola, u Prijateljima i dok gost čeka odobrenje, dakle nikad u Brzoj igri. Ukupno je za 60 dana poslato 27 obavještenja.

Napomena: Android ispod verzije 13 daje dozvolu sam, bez pitanja, pa ti uređaji već jesu registrovani. Koliki je to udio, PostHog ne zna (nema verzije OS-a na događajima). Broj registrovanih uređaja daje server (log `🔔 Push: FCM <project> · N uređaja`).

## 2. Ciljevi

1. **Doseg:** udio aktivnih igrača aplikacije (30 dana) koji imaju registrovan uređaj sa dozvolom raste na ≥ 50 % (danas nepoznato, procjena ispod 20 %).
2. **Uključivanje:** među igračima kojima je ponuda pokazana na kraju prve partije, ≥ 35 % daje dozvolu (danas, u svim kontekstima, ~11 %: 4/35).
3. **Povratak:** igrači koji dobijaju podsjetnike imaju D7 bar 3 p.p. veći od kontrolne grupe (hipoteza, presuda tek sa n ≥ 100 po grupi).
4. **Bez štete:** podsjetnici ne obaraju doseg. Gašenje kanala ili preklopke ostaje ispod 5 % po poslatom podsjetniku.

## 3. Van opsega

- **Web push i iOS.** Web nema push infrastrukturu, a iOS aplikacija ne postoji. Isti mehanizam se kasnije može proširiti.
- **Tekstovi iz lige (SPEC_RANG §5.8).** Liga nije odobrena. Mehanizam je spreman za njih, ali v2 ide bez lige.
- **Obavještenja o prisutnosti prijatelja** („{nadimak} je sad za stolom"). Otkriva tuđu aktivnost, traži odluku o privatnosti. Zasebna stavka.
- **E-mail i SMS podsjetnici.** Drugi kanal, druga saglasnost.
- **Personalizacija mašinskim učenjem.** Uz ove brojeve nema podataka za to. Pravila i konfiguracija su dovoljni.
- **Nagrade za povratak (novčići, bonusi).** Novčići još ne postoje (HARD RULE 8 važi i kad dođu).

## 4. Korisničke priče

**Igrač aplikacije koji je odigrao prvu partiju**
- Kao igrač koji je upravo završio prvu partiju, želim da tačno znam šta dobijam ako uključim obavještenja, da bih odlučio bez osjećaja da me neko vara.
- Kao igrač koji je rekao „Ne sada", ne želim da me aplikacija pita svaki put, da mi ne smeta.
- Kao igrač koji je ranije odbio dozvolu, želim u Postavkama da vidim da su obavještenja ugašena i da jednim dodirom stignem do sistemskih podešavanja, da ih mogu uključiti kad se predomislim.

**Igrač koji je prestao dolaziti**
- Kao igrač koji nije otvorio aplikaciju dva dana, želim podsjetnik sa razlogom koji je istinit za mene (revanš poslije poraza, nova igra), da imam zašto da se vratim.
- Kao igrač koji obično igra uveče, želim da podsjetnik stigne kad inače igram, a ne usred posla ili noću.
- Kao igrač koji ne želi podsjetnike, želim da ih ugasim bez gašenja poziva od prijatelja i „neko kuca", da ne propustim ono što mi treba.
- Kao igrač sa dva telefona, ne želim podsjetnik na jednom dok igram na drugom.

**Rubni slučajevi**
- Igrač koji nikad nije završio partiju dobija najviše jedan podsjetnik.
- Igrač koji se vrati usred niza podsjetnika ne dobija ostatak niza; novi niz počinje tek kad ponovo nestane.
- Telefon u drugoj vremenskoj zoni dobija podsjetnik po svom lokalnom vremenu.
- Ako server ne zna vremensku zonu uređaja, koristi `Europe/Sarajevo`.

**Vlasnik**
- Kao vlasnik, želim da podsjetnike ugasim jednom varijablom na serveru, bez novog paketa, ako nešto krene po zlu.
- Kao vlasnik, želim da u PostHogu vidim koliko je igrača uključilo obavještenja, gdje, i da li podsjetnici vraćaju ljude u odnosu na kontrolnu grupu.

---

## 5. Zahtjevi

### Dio A — uključivanje obavještenja

#### A1 (P0) Ponuda na kraju partije
Nova ponuda (`context: "match_end"`) na ekranu kraja meča, u svakoj igri, poslije **prve završene partije** na uređaju.

- Pokazuje se samo kad je sistemska dozvola u stanju `prompt` i ponuda nije odgođena („Ne sada" = 7 dana, postojeći ključ `zandar:push:snoozeUntil`, isti za sve kontekste).
- Tekst kaže sve tri stvari koje igrač dobija, uključujući podsjetnike. Nacrt:
  **Da ti javimo?** / „Kad te prijatelj pozove ili neko pokuca na tvoj sto. Ponekad i podsjetnik na partiju, koji gasiš u Postavkama."
  Dugmad: **Uključi** · **Ne sada**.
- Sistemski dijalog pokreće samo dugme Uključi (princip §51.1-2, ostaje).
- Ne prekriva rezultat ni dugmad Revanš / Igraj ponovo; stoji ispod njih.

Prihvatanje:
- [ ] Given dozvola je `prompt` i igrač je završio prvu partiju, When se otvori kraj meča, Then ponuda se vidi i šalje se `push_prompt_shown { context: "match_end" }`.
- [ ] Given igrač je dao dozvolu ranije ili je odbio, Then ponude nema.
- [ ] Given igrač je dodirnuo „Ne sada", Then ponude nema nigdje 7 dana.
- [ ] Ponuda se ne vidi na webu (`pushEnabled === false`).

#### A2 (P0) Gornja granica pitanja
Poslije **3 „Ne sada"** ukupno (svi konteksti zajedno) ponuda se više ne pokazuje nigdje osim u Postavkama (A3). Brojač je lokalni (`zandar:push:dismissCount`).

#### A3 (P0) Red „Obavještenja" u Postavkama
U Profil → Postavke, uvijek vidljiv u aplikaciji. Tri stanja:

| Stanje dozvole | Prikaz | Dodir |
|---|---|---|
| `granted` | Uključena · dvije preklopke: **Sto i prijatelji** (postojeća `prefs.table`) i **Podsjetnici** (nova `prefs.reminders`) | preklopke |
| `prompt` | Isključena · dugme **Uključi** | sistemski dijalog |
| `denied` | Isključena u podešavanjima telefona · dugme **Otvori podešavanja** | sistemska podešavanja obavještenja aplikacije |

Zahtijeva mali native dodatak koji otvara `Settings.ACTION_APP_NOTIFICATION_SETTINGS` (isti obrazac kao `InstallReferrerPlugin.java`, prijavljen u `MainActivity` prije `super.onCreate`). Na povratku u prvi plan stanje se ponovo čita, pa red odmah pokazuje novu dozvolu i registracija kreće sama (postojeće `retryRegistrationOnResume`).

#### A4 (P1) Ponuda na povratku
Igrač koji otvori aplikaciju **drugog različitog dana** (ima istoriju, a nema dozvolu) vidi ponudu na početnoj (`context: "home_return"`), jednom. Tada je već pokazao da se vraća, pa je vjerovatnije da prihvati. Isti tekst i pravila kao A1.

#### A5 (P0) Analitika dosega
- Postojeći događaji ostaju (`push_prompt_shown/accepted/dismissed`, `push_permission_result`), sa novim kontekstima.
- Novo: `push_state` jednom po pokretanju aplikacije: `{ permission: granted|denied|prompt, reminders: bool, table: bool }`. Iz njega se računa doseg (cilj 1) bez pristupa serveru.

### Dio B — podsjetnici neaktivnim igračima

#### B1 (P0) Kanal i preklopka
- Android kanal `podsjetnici` („Podsjetnici", važnost 3: bez iskakanja preko ekrana, sa zvukom po podešavanju telefona). Pravi se u `NativePush.tsx` uz `sto` i `prijatelji`. **Traži novi AAB.**
- Preklopka `prefs.reminders` na zapisu uređaja (opciono polje; bez njega = uključeno). Šalje se pri registraciji i iz Postavki, kao `table`.
- `prefs.table` ne gasi podsjetnike i obrnuto.

#### B2 (P0) Podaci o igraču na zapisu uređaja
Server na kraju svakog meča upisuje na uređaj(e) tog sjedišta (veza `room.pushIds`, a za prijavljene i svi uređaji `uid`-a):

```ts
// DeviceRecord — sva polja opciona (back-compat za hidraciju)
play?: {
  matchesFinished: number;
  lastMatchEndedAt: number;
  lastGame: GameId;             // zandar | poker | raub | bela
  lastResult: "won" | "lost" | "other";
  hourCounts: number[];         // 24 brojača lokalnih sati početka partije, po tz uređaja
};
reminders?: {
  streakStartedAt: number;      // početak trenutnog perioda neaktivnosti
  sentSteps: ("d1" | "d3" | "d7")[];
  lastSentAt: number;
  arm: "treatment" | "holdout"; // dodjela jednom, zauvijek za taj uređaj
};
```

- Ovo kreće sa prvim deployem servera, prije AAB-a i prije slanja, da podaci postoje kad se podsjetnici uključe.
- Prisutnost igrača se računa po igraču: za uređaj sa `uid`-om, „zadnje viđen" je najnoviji `lastSeenAt` među svim uređajima tog `uid`-a.

#### B3 (P0) Ritam (CONFIG, HARD RULE 7)
Sve vrijednosti su u jednom objektu konfiguracije (`DEFAULT_REMINDER_CONFIG`), ne u kodu:

| Korak | Kad (od zadnjeg viđenja) | Kome |
|---|---|---|
| `d1` | 20–44 h | svima sa dozvolom i uključenom preklopkom |
| `d3` | 3. dan | samo sa ≥ 1 završenom partijom |
| `d7` | 7. dan | samo sa ≥ 1 završenom partijom |

- Poslije `d7` niz staje. Novi niz počinje tek kad igrač otvori aplikaciju pa ponovo nestane.
- Najviše 1 podsjetnik dnevno po igraču (svi uređaji zajedno), najviše 3 po periodu neaktivnosti.
- Obavještenja iz v1 (pozivi, kucanje) se ne broje u ovu granicu i ne prekidaju niz.

#### B4 (P0) Kada u danu
- **Lični sat:** sat sa najviše početaka partija u `hourCounts`, ograničen na 10–22 h.
- Bez istorije: 20 h.
- Tiho: 23–09 h po vremenskoj zoni uređaja (`tz`). Ako sat pada u tiho vrijeme, ide sljedećeg dana u lični sat.
- Planer na serveru provjerava uređaje svakih 15 minuta. Stanje je na zapisu uređaja, pa restart (deploy) ne šalje dvaput i ne preskače korak.

#### B5 (P0) Šta piše — razlozi po prioritetu
Za svaki korak planer prolazi listu odozgo i šalje **prvi razlog čiji je uslov tačan u trenutku slanja**. Tekst je rodno neutralan, ne deklinira nadimke, ne pominje broj ljudi ni botove i ne kaže da neko čeka (§51.1-3, HARD RULE 5). Imena igara su u fiksnoj tabeli padeža (`sr.push.gameGen`: Žandara, Pokera, Rauba, Bele).

| Id | Koraci | Uslov | Naslov / tekst |
|---|---|---|---|
| `new_game` | d3, d7 | igra je izašla na produkciji poslije zadnjeg viđenja i igrač je nije igrao | **Stigla je {igra}** / „Nova igra u Kartaonici. Sto se postavlja za par sekundi." |
| `rematch` | d1, d3 | zadnja partija je izgubljena | **Revanš?** / „Zadnja partija {igre} nije išla tvojim putem. Nova kreće za par sekundi." |
| `win_again` | d1, d3 | zadnja partija je dobijena | **Još jedna?** / „Zadnja partija {igre} je bila tvoja." |
| `first_match` | d1 | nema završene partije | **Probaj jednu partiju** / „Pravila su u igri, a sto se postavlja za par sekundi." |
| `default` | d1, d3 | uvijek | **Partija {igre}?** / „Sto se postavlja za par sekundi." |
| `last_call` | d7 | uvijek | **Karte su tu kad poželiš** / „Ovo je posljednji podsjetnik. Možeš ih ugasiti u Postavkama." |

- „Za par sekundi" je istina za Brzu igru (sto se popunjava odmah). Tekst je vezan za to, pa se mora provjeriti ako se Brza igra ikad promijeni.
- Liga (SPEC_RANG §5.8) se kasnije dodaje kao novi redovi iznad ovih, bez promjene mehanizma.
- Tekstovi su nacrt; konačne riječi odobrava vlasnik.

#### B6 (P0) Tap
Podsjetnik otvara aplikaciju na početnoj **sa izabranom igrom iz razloga** (zadnja igrana, ili nova igra za `new_game`). Ne pokreće partiju sam. `push_opened { type, step, reason }`.

#### B7 (P0) Kontrolna grupa
- Svaki uređaj (za prijavljene: svaki `uid`) dobija grupu jednom, nasumično, i zauvijek. Kontrolna grupa prolazi isti planer, ali umjesto slanja bilježi `reminder_would_send`, da bi se grupe poredile na istom skupu igrača.
- Udio kontrolne grupe je konfiguracija: **0,5 dok svaka grupa nema 100 igrača kojima je bar jedan podsjetnik bio na redu, zatim 0,1.**
- Kontrolna grupa i dalje dobija sve iz v1 (pozive, kucanje).

#### B8 (P0) Prekidač i sigurnost
- `PUSH_REMINDERS=1` na Railway servisu uključuje slanje. Bez varijable planer radi, upisuje stanje i bilježi `reminder_would_send` za sve, a ne šalje ništa. Tako se mehanizam može provjeriti na produkciji prije prvog pravog slanja.
- Staging šalje samo uređajima sa dozvolom i ima ubrzan ritam preko konfiguracije (minute umjesto dana), za provjeru na S10e.
- Slanje i dalje ide kroz `notifyDevices` (preklopka, deduplikacija, `.catch`, brisanje `UNREGISTERED` tokena).

#### B9 (P0) Analitika
| Događaj | Gdje | Svojstva |
|---|---|---|
| `push_sent` (postojeći) | server | `type: "reminder"`, `step`, `reason`, `arm` |
| `reminder_would_send` | server | isto, za kontrolnu grupu i dok je `PUSH_REMINDERS` isključen |
| `push_opened` (postojeći) | klijent | `type`, `step`, `reason` |
| `push_state` (A5) | klijent | stanje dozvole i preklopki |

Povratak se pripisuje podsjetniku ako igrač otvori aplikaciju u roku od 24 h od slanja.

#### P1 — poslije prve verzije
- **A4** ponuda na povratku (gore).
- **Najava nove igre i onima koji nisu neaktivni** (jedno obavještenje po izlasku igre, svima sa uključenim podsjetnicima). Traži odluku o učestalosti.
- **Stanje kanala na uređaju:** `push_state` dopuniti sa važnošću kanala `podsjetnici` (Capacitor `listChannels`), da se vidi i gašenje kanala iz sistema, ne samo naša preklopka.

#### P2 — dizajnirati tako da kasnije bude moguće
- Razlozi iz lige (SPEC_RANG §5.8): lista razloga je proširiva, uslovi primaju stanje igrača.
- Web push za PWA: planer ne zna za platformu, slanje je iza `notifyDevices`.
- Duži niz (D14, D30) za igrače sa mnogo partija: koraci su konfiguracija.

---

## 6. Mjerenje uspjeha

Sve se čita odvojeno po igri i samo za aplikaciju, uz n pored svakog procenta (memorija o PMF pragovima). Rupa u podacima aplikacije 1.4.5 (18.–20.11.2026) se ne broji.

**Vodeći (1–3 sedmice poslije izdanja)**

| Metrika | Danas | Uspjeh | Odlično | Kako |
|---|---|---|---|---|
| Prihvatanje ponude na kraju meča (`accepted / shown`, `match_end`) | — | 35 % | 50 % | PostHog, po kontekstu |
| Dozvola poslije prihvatanja (`granted / accepted`) | 4/4 | 80 % | 90 % | `push_permission_result` |
| Doseg: aktivni igrači aplikacije (30 d) sa `permission = granted` | nepoznato | 50 % | 65 % | `push_state` |
| Otvaranje podsjetnika (`push_opened / push_sent`, reminder) | — | 8 % | 15 % | po koraku i razlogu |
| Gašenje preklopke ili kanala po poslatom podsjetniku | — | < 5 % | < 2 % | `push_state` prije/poslije |

**Zaostali (4+ sedmica, kad svaka grupa ima n ≥ 100)**

| Metrika | Uspjeh |
|---|---|
| D7 aplikacije, slanje naspram kontrolne grupe | +3 p.p. |
| D30 aplikacije, slanje naspram kontrolne grupe | +2 p.p. |
| Udio `UNREGISTERED` tokena (proxy deinstalacija), slanje naspram kontrolne | bez rasta |

Prva provjera 2 sedmice poslije izdanja (vodeći), presuda o D7 tek kad su obje grupe ≥ 100.

## 7. Otvorena pitanja

| # | Pitanje | Ko | Blokira? |
|---|---|---|---|
| 1 | Aplikacija je zamrznuta za UI rad od 15.11.2026. Ovaj spec traži novi AAB (kanal, ponuda na kraju meča, red u Postavkama). Da li je ovo izuzetak, kao prevlačenje karata i „Vrati se za sto"? | vlasnik | **da** |
| 2 | Kontrolna grupa 50 % na početku (preporuka) ili 10 % kao u §51.5? 50 % znači da pola igrača ne dobija podsjetnike dok se ne skupi 100 po grupi. | vlasnik | da (prije uključivanja `PUSH_REMINDERS`) |
| 3 | Uređaji na Androidu ispod 13 imaju dozvolu bez pitanja. Da li i oni dobijaju podsjetnike odmah (preporuka: da; kanal i preklopka su tu, a posljednji podsjetnik kaže kako se gase)? | vlasnik / pravno | ne |
| 4 | Politika privatnosti: dopuniti da server za podsjetnike čuva zadnju igru, ishod, broj partija i uobičajeni sat igranja uz zapis uređaja, i rok čuvanja (60 dana neaktivnosti, kao uređaj). Data safety: novi tipovi podataka se ne uvode (provjeriti). | pravno | da (prije uključivanja `PUSH_REMINDERS` na produkciji) |
| 5 | Konačni tekstovi iz B5 i A1. | vlasnik | ne |
| 6 | Koliko je danas registrovanih produkcijskih uređaja (polazna tačka za doseg)? Broj je u Railway logu. | inženjering | ne |
| 7 | Tap na podsjetnik: samo izabrana igra na početnoj (preporuka) ili pravo u Brzu igru? Pravo u igru je brže, ali pokreće partiju bez izbora. | vlasnik / dizajn | ne |
| 8 | Za `new_game` treba datum izlaska igre na produkciji. Gdje ga čuvamo: u `GAMES` konfiguraciji (preporuka) ili kao env na serveru? | inženjering | ne |

## 8. Vremenski plan i faze

Ograničenja:
- Kanal `podsjetnici` mora postojati u paketu prije prvog slanja, inače poruka pada na podrazumijevani kanal. Zato sve klijentsko ide u **jedan AAB (`versionCode 14`)**.
- Server se objavljuje nezavisno; deploy = restart = hidracija, pa nova polja moraju biti opciona.
- Uređaji sa starim paketom ne smiju dobiti podsjetnik: server šalje samo uređajima koji su pri registraciji javili podršku (`caps: ["reminders"]`).

| Faza | Šta | Gdje | Uslov za sljedeću |
|---|---|---|---|
| **F1 — podaci** | B2 (statistika na uređaju), B8 planer bez slanja (`reminder_would_send`) | server, `main` → produkcija | planer na produkciji bilježi korake koji odgovaraju očekivanom ritmu |
| **F2 — paket** | A1, A2, A3, A5, B1, B6, `caps` pri registraciji | AAB 14 | odobren na Play-u; na S10e: ponuda, Postavke u sva 3 stanja, kanal postoji |
| **F3 — slanje** | `PUSH_REMINDERS=1` na stagingu (ubrzani ritam), pa na produkciji | server env | otvorena pitanja 2 i 4 riješena |
| **F4 — čitanje** | vodeći pokazatelji poslije 2 sedmice; D7 kad je n ≥ 100 po grupi; kontrolna grupa → 10 % | PostHog | — |
| **F5 (P1)** | A4, najava igre svima, stanje kanala | AAB 15 | presuda iz F4 |

Ako ponuda na kraju meča ne dostigne 20 % prihvatanja u prve 2 sedmice, prvo se mijenja tekst i mjesto ponude, a tek onda se gleda efekat podsjetnika, jer bez dosega se efekat ne može izmjeriti.

---

## Prilog — podaci korišteni u specu (PostHog, produkcija, 60 dana do 22.11.2026)

- Prva otvaranja: web 1087, aplikacija 80. Od 80 igrača aplikacije, 54 je završilo bar jednu partiju; 31 se vratio bar jednom poslije prvog dana; D1 24/80.
- Ponuda obavještenja (prikaz → prihvatanje): prijatelji 40 prikaza / 21 osoba → 3; host 27 / 9 → 1; čekanje početka 6 / 4 → 0; gost 5 / 3 → 0. Dozvola: 4 × `granted`, nijedan `denied` zabilježen.
- Poslata obavještenja: 27 (poziv 14, početak partije 4, kucanje 4, odobrenje 3, zahtjev za prijateljstvo 2). Otvorena: 4.
- Počeci partija po satu (Sarajevo, broj igrača): vrh 17–23 h (38, 38, 35, 36, 37, 45, 32), ponoć 23; najslabije 4–6 h.
