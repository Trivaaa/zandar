# SPEC — Statistika igrača po igri · NACRT v0.3

> **Status: nacrt, čeka odobrenje vlasnika. Nijedan red koda nije napisan.**
> Datum: 2026-11-27, v0.2 2026-11-28. Grana: `docs/spec-statistika`.
> **Obim v1 (odluka vlasnika 28.11.2026): igrač vidi samo SVOJU statistiku.** Tuđi profil, sjedište u lobiju i javno „Završava %" su P2 (§6, §13). Razlog: ~94 % partija je brza igra, skoro uvijek protiv botova (§13), pa tuđi procenat ne govori ništa o igraču.
> Dizajn: tabla `UI_Statistika` na platnu „Kartaonica · identitet".
> **v0.3 (odluka vlasnika 28.11.2026): tuđu statistiku vide prijatelji i igrači za istim PRIVATNIM stolom** — ista kartica kao na vlastitom profilu, samo za čitanje (§14). Brza igra bez prijateljstva i dalje ne vidi ništa.
> Odnos prema `docs/Specs/SPEC_RANG.md` („Liga"): ovaj spec je **faza F0 Lige**. Liga gradi na istim zapisima ishoda, a dok se ne odobri, statistika stoji sama.
> Gdje se ovaj tekst i kod razilaze, važi kod.

---

## 1. Problem

Igrač poslije partije nema šta da ponese. Nigdje ne vidi da napreduje i nema se s čim porediti. Profil danas pokazuje tri pločice: broj završenih partija, „najviše igraš" i broj prijatelja (`StatTiles`, `apps/web/components/profile/ProfileParts.tsx:97`). Pobjede, porazi i napuštene partije postoje samo u analitici (`match_ended`), a igraču se ne prikazuju.

Tri nezavisna utiska igrača traže iste brojke:

1. „Napravite za Raub neku rang listu. Kad neko izađe, zbroje se štihovi od svih ostalih i on napreduje na rang listi; kad ne izađe, oduzimaju mu se štihovi sa koliko je završio partiju."
2. „Treba napraviti omjer pobjeda i poraza."
3. „Koliko si partija odigrao, omjer pobjeda i poraza, kao i odustajanja."

Igrači uglavnom imaju svoju omiljenu igru, pa statistika mora biti **po igri**, a ne jedan zbir.

Napuštanje je visoko (Raub 41 %, Žandar 38 %, `docs/PMF_PLAN.md`). U v1 ga igrač vidi samo kod sebe („Završava %"); javni procenat čeka partije među ljudima (§13).

**Cijena ako se ne uradi.** D1 je ispod praga u Žandru (21 %) i pokeru (16 %) (PMF_PLAN: prag 35 %). Igrač bez cilja preko jedne partije nema razlog za drugu sesiju.

## 2. Ciljevi

Sve su hipoteze. Čitaju se po pravilima iz `docs/PMF_PLAN.md` (po igri, platformi i izvoru, n ≥ 100).

| # | Cilj | Prag uspjeha | Rastegnuto | Kada |
|---|---|---|---|---|
| C1 | Igrači otvaraju statistiku | ≥ 30 % igrača sa 3+ završene partije otvori karticu u prvih 7 dana | ≥ 50 % | 2 sedmice poslije F1 |
| C2 | Partija se nastavlja | „Igraj ponovo" / „Revanš" sa kraja partije +5 p.p. prema 4 sedmice prije | +10 p.p. | 2 sedmice poslije F1 |
| C3 | Manje napuštanja | Raub 41 % → ≤ 38 %, Žandar 38 % → ≤ 35 % (samo vlastiti procenat; javni bi djelovao jače, P2) | ≤ 33 % | 4 sedmice poslije F1 |
| C4 | Povratak | D7 +2 p.p. po igri, na dvije uzastopne kohorte | +4 p.p. | 6–8 sedmica |

C1 i C2 su vodeći pokazatelji i pomjeraju se odmah. C3 je u v1 slab, jer „Završava" vidi samo igrač; javni procenat (P2) je glavni pokretač za napuštanje. C4 je zaostao pokazatelj i ne smije biti jedini kriterij, jer se sa sadašnjim prilivom ne može pročitati za manje od mjesec dana (isti zaključak kao SPEC_RANG §1.10).

## 3. Ne-ciljevi

| Ne radi se | Zašto |
|---|---|
| Javna globalna rang lista | Populacija je premala, pa bi tabela bila prazna ili puna nepoznatih imena. Javna tabela stranaca bi uz to otkrila koliko je stvarnih ljudi (HARD RULE 3, SPEC_RANG §5.7). Rang je Liga, kasnije. |
| Rejting vještine (Elo) prikazan igraču | Sreća je prejaka za mjerenje vještine prije ~100 partija (SPEC_RANG §2.3). |
| Istorija partija red po red | Niko je nije tražio, a server čuva samo zbirove. Ako se kasnije zatraži, `results/` već ima osnovu. |
| Statistika poteza (štihovi po ruci, poker VPIP, broj bela) | Druga vrsta igrača i drugi ekran. Ne pomaže prvim sesijama. |
| Brojke za partije prije uvođenja | Pobjede i napuštanja se nigdje nisu čuvali po `uid`-u. Izmišljeni zbirovi bi bili gori od praznih. |
| Podjela po protivniku („protiv ljudi / botova") | HARD RULE 3 i 5: bilo kakva takva podjela je curenje. |
| Tuđa statistika (tuđi profil, sjedište, javno „Završava %") | Odluka 28.11.2026: brojke skupljene protiv botova ne govore ništa o drugom igraču. P2, kad bude više partija među ljudima (§13). |

## 4. Korisničke priče

**Igrač koji ima omiljenu igru (najčešći)**
- Kao igrač Rauba, hoću da vidim koliko sam partija dobio i koliki mi je procenat pobjeda u Raubu, da znam da li sam bolji nego prošlog mjeseca.
- Kao igrač, hoću da mi profil prvo pokaže moju igru, bez traženja.
- Kao igrač, hoću poslije partije da vidim da se nešto pomjerilo (broj pobjeda, niz), da imam razlog za još jednu.

**Igrač koji igra više igara**
- Kao igrač koji igra i Žandar i Belu, hoću da prebacujem između igara, da brojke iz jedne ne miješam sa drugom.

**Igrač koji gleda drugog igrača (P2, ne v1)**
- Kao igrač u lobiju, hoću da vidim da li drugi obično završava partije, da znam da li vrijedi sjesti.

**Gost**
- Kao gost, hoću da mi se brojke čuvaju i bez naloga, a uz nalog da se prenesu na drugi uređaj.

**Ivični slučajevi**
- Kao igrač čiji je protivnik otišao, ne želim da mi se to računa kao poraz ni kao napuštanje.
- Kao novi igrač sa jednom partijom, ne želim veliki „0 %" ili „100 %" koji ništa ne znači.
- Kao igrač pokera za stolom od 4, ne želim da mi „23 %" izgleda kao loš rezultat kad je to prosjek stola.
- Kao igrač kome se izgubila veza na minut pa se vratio, ne želim da mi se upiše odustajanje.

## 5. Definicije (jedno pravilo za sve igre)

Standard je isti kao u većini kartaških aplikacija: pobjeda, poraz, procenat pobjeda i stopa završenih partija. Napuštanje se ne kažnjava, ali se vidi.

### 5.1 Ishod partije po igraču

| Igra | Pobjeda | Poraz | Napuštena |
|---|---|---|---|
| Žandar 2P i 3P | najviše bodova (`isMatchWinner`, `apps/server/src/analytics.ts`) | svi ostali | igrač ima `left: true` ili `connectionStatus === "abandoned"` (`apps/server/src/index.ts`, `leaveSeat` i istek veze) |
| Žandar 4P | pobjeda tima: oba partnera | tim izgubio | isto, samo za tog igrača |
| Bela (2 na 2) | tim na 1. mjestu (`belaMatchLike`) | tim na 2. mjestu | `left: true` |
| Raub (2–4) | **samo 1. mjesto**; jednaki bodovi dijele mjesto, pa je dijeljeno 1. mjesto pobjeda za sve na njemu (`raubPlacements`) | ostala mjesta | `left: true` |
| Poker (2–4) | **samo 1. mjesto** (zadnji sa žetonima) | ostala mjesta; dvojica ispala u istoj ruci: bolje mjesto ima onaj ko je u ruku ušao sa više žetona | `left: true` |

**Pobjeda je u svakoj igri samo 1. mjesto (odluka 28.11.2026).** „Gornja polovina" se ne broji kao pobjeda, da riječ znači isto u svim igrama. Mjesto (`place`) se ipak čuva u `results/` za Ligu (§7.1).

Pravila oko kraja:

- **Prekinuta partija** (glasanje o prekidu, odlazak drugog igrača, sweeper) se igraču koji je ostao ne broji ni kao poraz ni kao napuštena.
- **Napuštena** se broji samo onome ko je otišao (dugme „Napusti partiju", `room:leave`, `POST /api/rooms/:id/leave`) ili kome je istekao rok za povratak.
- **Prekid veze unutar roka za povratak** se ne broji: igrač se vratio i partija ide dalje.
- **Server igrao umjesto igrača (AFK, odluka 27.11.2026):** ako je igrač sam odigrao manje od 50 % svojih poteza, a ostale je odigrao server kad mu je istekao sat, partija je za njega **napuštena**, iako je meč stigao do kraja.
- **Čovjek koji igra sam protiv botova nije pritisnuo „Sljedeća ruka" 10 min:** partija se zatvara kao prekinuta (`stalled`). Za stolom sa dva ili više ljudi roka nema, sljedeću ruku kontroliše host. To je prekid za sve za stolom. Ko je pritisak propustio nije razlikovan, jer dugme ima samo host.
- **Ispravka postojećeg brojanja (urađeno, changelog 234, `fix/afk-match-end`).** Igrač koji izađe iz pokera dobijao je +1 `completedMatches` kad se meč završi za ostale. Raub i Bela to nemaju, jer se meč tamo bez igrača koji je izašao ne nastavlja. Ista grana uvodi AFK pravilo i rok iznad. Profil i analitika sada broje istom funkcijom (`completedHumans`), pa F0 na tome samo gradi ishode `win`/`loss`/`abandon`.
- Bot se nikad ne broji (postojeće `completedMatchUids`).

### 5.2 Prikazane brojke

| Brojka | Formula | Kad se pokazuje |
|---|---|---|
| Partije | završene + napuštene | uvijek |
| Pobjede / porazi | brojači | uvijek |
| **Pobjede %** | pobjede / (pobjede + porazi), zaokruženo na cijeli broj | od **5** završenih partija u toj igri; prije toga „3 pobjede od 4" |
| **Završava %** | završene / (završene + napuštene) | samo vlasniku, od prve partije (drugima: P2) |
| Niz pobjeda | uzastopne pobjede u toj igri; poraz ga prekida, napuštanje takođe | kad je ≥ 2 |
| Najduži niz | najveći niz ikad u toj igri | kad je ≥ 2 |
| Kontekst stola | „Za stolom od 4 pobjeđuje 1 od 4" (najčešći broj igrača u toj igri) | samo poker i Raub, kad je najčešći sto 3 ili 4 igrača |

Za poker i Raub sa više igrača pobjeda ne može biti „50 % = prosjek", jer je prosjek za 4 igrača 25 %. Zato se tamo ispod kruga piše kontekst stola, a ne uvodi se nikakva ocjena („dobar", „loš"). Poseban red „1. mjesto" ne postoji, jer je pobjeda već 1. mjesto.

Statistika se ne dijeli na brzu igru i privatni sto, ni na 11 i 21, ni po broju igrača. Jedan broj po igri je razumljiv. Podjela bi i dala tri prazne ćelije umjesto jedne pune.

## 6. Zahtjevi

### P0 — bez ovoga se ne objavljuje

**P0-1 · Upis ishoda po igraču (server)**
- Na kraju svake partije, za svakog čovjeka sa `uid`-om, upiše se tačno jedan ishod: `win` | `loss` | `abandon`. Prekinuta partija za onoga ko je ostao se ne upisuje.
- Ishodi se računaju u čistoj funkciji `matchOutcomes(room, reason)` (`apps/server/src/profile/outcomes.ts`). Ona koristi ista pravila kao analitika (`matchEndedEvents`, `pokerMatchEndedEvents`) i ima test po igri.
- Upis ostaje na jednom mjestu: `emitMatchEnded` → `recordCompletedMatch`, proširen na ishod. Ostaju isti Firestore commit i isti `exists: false` preduslov na `results/{matchId__uid}`. Upis nikad ne baca i ne čeka se.

Prihvatanje:
- [ ] Žandar 4P, tim A pobijedi: oba igrača tima A `win`, oba iz tima B `loss`.
- [ ] Raub 3P, igrač izađe usred partije, ostali završe: on `abandon` bez +1 `completedMatches`, ostali `win`/`loss`.
- [ ] Žandar, protivnik ode i partija se prekine: preostali igrač nema upisa i brojke mu se ne mijenjaju.
- [ ] Ista partija javljena dvaput (restart, ponovni `emitMatchEnded`): jedan upis.
- [ ] Firestore nedostupan: partija se završi normalno, u logu je `[profile] rezultat nije upisan`.
- [ ] Bot nema upisa. Čovjek bez `uid`-a nema upisa.

**P0-2 · Podaci na profilu**
- `profiles/{uid}` dobija opciono polje `stats` (§7). Profil bez polja se čita kao prazna statistika.
- `/api/me` vraća puno `stats`.

Prihvatanje:
- [ ] Stari profil bez `stats` → `/api/me` vraća prazne brojače, bez greške.
- [ ] Registracija gosta (isti `uid`) zadržava brojke.
- [ ] Brisanje naloga briše i `stats` (dopuna toka c u SPEC_IDENTITET).

**P0-3 · Kartica „Statistika" na profilu (S1, web)**: §8.1.

Prihvatanje:
- [ ] Otvara se na igri sa najviše partija (postojeće `mostPlayedGame`, `apps/web/lib/profileView.ts`); nerješeno → zadnja igrana.
- [ ] Sa manje od 5 završenih u igri nema procenta, već „3 pobjede od 4".
- [ ] Bez ijedne partije: tekst i dugme **Igraj** za tu igru.
- [ ] Greška pri učitavanju ne ruši ostatak profila (kao P8).
- [ ] 360×640: kartica stane bez horizontalnog skrola, krug je ≥ 96 px.
- [ ] Poker i Raub (najčešći sto 3–4 igrača): ispod kruga je red konteksta „Za stolom od 4 pobjeđuje 1 od 4"; Žandar i Bela ga nemaju.
- [ ] Nema reda „1. mjesto" ni dugmeta ⓘ; „Kako se broji" je link na dnu kartice.

**P0-4 · Red na kraju partije (S3, web)**
- Ispod rezultata stoji jedan red sa brojkom koja se upravo promijenila.
- Server poslije uspješnog upisa šalje događaj `stats:update` samo tom igraču, sa stanjem prije i poslije za tu igru. Stari klijent ga ignoriše.

Prihvatanje:
- [ ] Red se pojavi najkasnije 1,5 s poslije ekrana kraja. Ako `stats:update` ne stigne za 3 s, reda nema (bez praznog mjesta i bez spinera).
- [ ] Oblik i vrijeme događaja su isti bez obzira na to ko je sjedio za stolom (HARD RULE 3).

**P0-5 · ~~Tuđi profil i sjedište (S4)~~** — premješteno u P2 (odluka 28.11.2026).

**P0-6 · Analitika**: §10.

### P1 — odmah poslije

- **P1-1 · Moje igre (S2):** red igre dobija drugu liniju „40 partija · 60 % pobjeda".
- **P1-3 · Raub saldo:** zbir bodova Lige za Raub (§9) prikazan u Raub kartici kao „Saldo +34". Ima smisla tek kad Liga postoji ili kad vlasnik odluči da saldo ide prije nje.
- **P1-5 · Aplikacija:** isti ekrani u APK-u (vidi otvoreno pitanje O1).

### P2 — ne sada, ali se dizajn ne smije zatvoriti

- **Tuđa statistika (ex P0-5, S4):** na tuđem profilu i na dodir sjedišta u lobiju omiljena igra, pobjede % u njoj i „Završava N %" (od 10 započetih), samo za naloge; `/api/profiles/:id` dobija sažetak, nikad `uid`, tačan broj napuštanja ni brojke po drugim igrama. Uslov: dovoljno partija među ljudima (§13) i pravni pregled vidljivosti u `/privatnost`.
- **„Pouzdan igrač":** mala oznaka na tuđem profilu za Završava ≥ 95 % i ≥ 20 započetih. Samo pozitivna, nikad „nepouzdan".
- **Prijatelji:** na listi prijatelja ispod imena omiljena igra i pobjede %.
- **Liga i rang** (SPEC_RANG): bodovi, lige, sezone, a kasnije i rang po jačini protivnika. Zato `results/` već sada nosi sve što se unazad ne može dopuniti (§7.1).
- Mjesečni presjek („Ovaj mjesec: 8 pobjeda").
- Javne tabele, kad bude ~500 aktivnih (SPEC_RANG §5.7).
- Postignuća („Prva bela", „Va-bank i pobjeda").

## 7. Podaci i server

### 7.1 Firestore

```ts
// profiles/{uid} — opciono, profil bez njega = prazna statistika
stats?: {
  v: 1;
  since: number;                       // ms, prvi upis (datum F0 za postojeće igrače)
  byGame: Partial<Record<GameId, {
    won: number;
    lost: number;
    abandoned: number;
    streak: number;                    // tekući niz pobjeda
    bestStreak: number;
    lastAt: number;
  }>>;
};

// results/{matchId__uid} — postojeći dokument, nova polja opciona
outcome?: "win" | "loss" | "abandon";
place?: number;          // poker, Raub, Bela (timski)
players?: number;
target?: number;         // 11 / 21 / 501 …
raub?: { finalScore: number; othersRemaining: number[] };   // za Ligu (§9)
// za Ligu i rang (P2) — samo server, nikad klijentu
mode?: "quick_play" | "private_room";
opponents?: string[];    // uid, "bot:<tier>" ili "human" (čovjek bez naloga); bot nikad ne ide klijentu (HARD RULE 3)
partner?: string;        // timske igre (Bela, Žandar 4P), isti oblik
afk?: boolean;           // fix/afk-match-end
left?: boolean;
durationMs?: number;
hands?: number;
```

**Liga i rang se računaju iz `results/`.** Promjena formule ne traži novo bilježenje, samo novi obračun od dana F0. Liga na bodove (SPEC_RANG §3, Raub saldo §9) treba `outcome`, `place`, `players`, `target` i `raub`. Rang po jačini protivnika (Elo/MMR) treba i `opponents`: bot dobija stalan rejting po tieru, a čovjek svoj. Bez `opponents` od prvog dana rang se kasnije ne bi mogao izračunati unazad.

- `completedMatches` i `completedMatchesByGame` ostaju kakvi jesu, uz ispravku iz §5.1: ko je napustio partiju ne dobija +1.
- Sve se uvećava u **istom commitu** u kom nastaje `results/…` (`FieldValue.increment`, kao danas u `apps/server/src/profile/store.ts`). Niz pobjeda traži čitanje prije pisanja, pa se profil piše sa preduslovom `updateTime` i do 3 ponavljanja (isti obrazac kao SPEC_RANG §6.2).
- Bez servisnog ključa (lokalni dev) radi postojeća memorijska izvedba.

### 7.2 Back-compat

- Snapshot sobe se ne mijenja: `left` i `connectionStatus` već postoje u sve četiri igre.
- `/api/me` dobija samo novo opciono polje `stats`; `/api/profiles/:id` se u v1 ne mijenja. APK do 1.5.2 ga ne čita.
- Tijela zahtjeva se ne mijenjaju i klijent ne šalje ništa novo.
- Hidrirana soba čija se partija završi poslije restarta upiše se jednom, kao danas.

### 7.3 Šta nikad ne ide klijentu

`isBot`, tier, sastav stola, `opponents`, `mode` i sve tuđe brojke (v1 ne prikazuje tuđu statistiku). `lib/antiLeak.ts` ostaje kakav jeste: nova polja ne nose ništa o botu.

## 8. UX i UI

Prije koda ide tabla **„UI · Statistika"** (S1–S6) na Claude Design platnu „Kartaonica · identitet", u stilu A+ (SPEC_IZGLED_APLUS). Skice ispod su raspored, ne izgled.

Načela:
- Jedna velika brojka po ekranu: pobjede % u igri koju igrač gleda. Sve ostalo je sitnije.
- Boja igre (ista kao pločice na početnoj) nosi krug, a ostalo su postojeći tokeni (`--text-soft`, `--text-faint`, `--accent-line`). Novih boja nema.
- Kretanje samo kroz `transform` i `opacity`, sa trajanjima iz tokena `--t-*`, pa se pod reduced-motion kolapsira.
- Nikad se ne pokazuje „0 %" niti ocjena igrača. Mali uzorak se piše riječima.

### 8.1 S1 · Profil → kartica „Statistika"

```
┌──────────────────────────────────┐
│  Statistika                      │
│  (Raub)  Žandar   Bela   Poker   │  ← čipovi, redom po broju partija
│                                  │
│        ╭──────╮                  │
│        │ 34 % │  pobjeda         │  ← krug u boji igre
│        ╰──────╯                  │
│   14 pobjeda · 27 poraza         │
│   Za stolom od 4 pobjeđuje 1 od 4│  ← samo poker i Raub 3–4P
│   Niz 3 · najduži 5              │
│   Završava 94 % partija          │
│                                  │
│   Broji se od 1.12.2026.         │
│   Kako se broji                  │  ← link, otvara S6 (bez ⓘ)
└──────────────────────────────────┘
```

- Stoji ispod kartice igrača, iznad „Moje igre". Postojeće tri pločice ostaju (pločica partija prikazuje zbir).
- Čipovi pokazuju samo igre sa bar jednom partijom. Kad je takva igra samo jedna, čipova nema.
- Promjena igre: krug se pretapa (`opacity`), brojka se ne „vrti".

| Stanje | Ponašanje |
|---|---|
| Bez partija | „Još nema partija. Odigraj jednu do kraja." + **Igraj** (zadnja izabrana igra) |
| Manje od 5 završenih | krug bez procenta, u sredini „3 od 4", ispod „pobjede" |
| Učitavanje | skelet kartice (kao P7) |
| Greška | „Statistika se nije učitala." · **Pokušaj ponovo**; ostatak profila radi |
| Gost | ista kartica; u listi „Uz nalog:" nova stavka „Statistika ostaje sačuvana" |

### 8.2 S2 · Moje igre (P1)

Red igre: „Raub" / druga linija „41 partija · 58 % pobjeda", ispod postojećeg sažetka podešavanja.

### 8.3 S3 · Kraj partije

Jedan red u postojećem završnom ekranu svake igre, ispod rezultata, iznad dugmadi:

| Ishod | Tekst |
|---|---|
| Pobjeda, niz ≥ 2 | „Pobjeda 25 · niz 3 🔥" |
| Pobjeda | „Pobjeda 25 u Raubu" |
| Poraz | „Partija 41 · 58 % pobjeda" (ispod 5: „Partija 4") |
| Pobjeda koja je oborila najduži niz | „Novi rekord: 6 zaredom" |

Broj se podigne jednom za jedan (≈ 400 ms, `transform`). Zvuka nema. Ako `stats:update` ne stigne, reda nema.

### 8.4 S4 · Tuđi profil i sjedište — P2

Nije u v1 (odluka 28.11.2026). Kad dođe: ispod nadimka u `OtherProfileSheet` „Najviše igra Raub · 34 % pobjeda" i „Završava 92 % partija"; isti red na dodir sjedišta u lobiju, sam sto ostaje netaknut.

### 8.5 S5 · Gost i brisanje

- „Uz nalog:" → prva nova stavka „Statistika ostaje sačuvana".
- Upozorenje B4 dopunjeno: „…gubiš rezultate odigrane kao gost: 12 partija i statistiku."

### 8.6 S6 · „Kako se broji" (list odozdo)

> Broji se svaka partija odigrana do kraja. · Ako izađeš prije kraja, partija se broji kao napuštena. · Ako drugi igrač ode, tebi se ne broji ništa. · Statistiku vidiš samo ti.

## 9. Raub bodovi za Ligu (odluka vlasnika 27.11.2026, dopuna SPEC_RANG §3.4)

Formula iz utiska igrača postaje način bodovanja Lige za Raub, umjesto fiksne tabele +30/+14/+6. Raubaši je razumiju bez objašnjenja, jer liči na obračun za stvarnim stolom.

- **Pobjednik** (1. mjesto) dobija zbir bodova koji je ostalo ostalim igračima. Negativan ostatak se računa kao 0.
- **Ostali** gube onoliko bodova koliko im je ostalo na kraju.
- **Dijeljeno 1. mjesto** dijeli zbir na jednake dijelove.
- **Napustio partiju:** gubi više od ovo dvoje: bodove koji su mu ostali ili polaznu vrijednost (od 21 → najmanje −21). Tako odlazak nikad nije bolji od igranja do kraja.
- **Faktor i granice su konfiguracija** (`RankConfig.raub`, HARD RULE 7): `factor`, `winCap`, `lossCap`, a za igru do 11 `target11Factor`. Polazne vrijednosti se kalibrišu kroz `pnpm --filter @zandar/game-core simulate:raub`, tako da bodovi po minuti budu bliski Žandaru (SPEC_RANG §3.4).
- **Pod lige** iz SPEC_RANG §3.5 ostaje: oduzimanje važi tek od lige Dama, a liga se u sezoni ne gubi. Početnik koji izgubi sa 15 preostalih ne propada.

Primjer (do 21, 3 igrača, faktor 1, bez granica): A završi na −1, B ima 6, C ima 13. A dobija +19, B −6, C −13.

Formula ne otkriva bota: bodovi zavise samo od rezultata za stolom, a oblik obračuna je isti za svaki sto. F0 zato u `results/` čuva `raub.finalScore` i `raub.othersRemaining`, pa se Liga kasnije može izračunati unazad, od dana F0.

## 10. Mjerenje

Događaji idu kroz `AnalyticsEvents` u `shared-types` i šalje ih samo produkcija (`docs/analytics.md`):

| Događaj | Svojstva | Za |
|---|---|---|
| `stats_viewed` | `game`, `source: profile`, `matches` (u toj igri) | C1 |
| `stats_game_switched` | `from`, `to` | da li igrači gledaju više igara |
| `match_end_stats_shown` | `game`, `outcome`, `streak` | C2: veza sa „Igraj ponovo" |
| `match_ended` (postojeći) | + `stats_matches_before` | čitanje po broju odigranih |

- C2: odnos `match_end_stats_shown` → sljedeći `play_requested` / revanš u istoj sesiji, prema 4 sedmice prije F1.
- C3: `match_ended` sa `end_reason: abandoned` i `left: true` ili `afk: true`, po igri, sedmično.
- Kontrolne grupe nema: statistika je osnovna funkcija, a uzorak je premali za podjelu 50/50. Čita se kohorta prije i poslije, po pravilima PMF_PLAN-a (vidi O5).

## 11. Faze

| Faza | Šta | Gdje | Uslov |
|---|---|---|---|
| **F0** | P0-1, P0-2: server bilježi ishode, bez prikaza; ispravka brojanja onoga ko je izašao | server, 1 deploy | back-compat provjeren restartom sa starim snapshotom |
| **F1** | P0-3, P0-4, P0-6 | web (`isNative` grana) | F0 živ bar par dana, da kartica ima brojke |
| **F3** | sve iz F1 u aplikaciji | AAB (vc 17; vc 16 je 1.5.2) | odluka O1 |
| poslije | P1; P2 (tuđa statistika, Liga i rang iz `results/`) | | |

Statistika kreće od dana F0. Kartica zato nosi „Broji se od {datum}", da niko ne misli da su mu partije nestale.

Rokova spolja nema. Jedini datum koji se dodiruje je `railway.json` 1.12.2026: F0 je deploy servera i ne smije pasti dok se postavke prenose u dashboard.

## 12. Otvorena pitanja

| # | Pitanje | Ko | Blokira | Preporuka |
|---|---|---|---|---|
| O1 | Da li aplikacija dobija statistiku odmah (F1), kao izuzetak od „samo web", ili tek F3? | vlasnik | F3 | Kao Profil v0.3: web i aplikacija, jer je profil isti ekran. Aplikacija ionako čeka sljedeći AAB. |
| O2 | ~~Prag za javno „Završava %"~~ | — | — | Nije potrebno za v1 (javnog procenta nema). Kad dođe P2: 10 započetih. |
| O3 | ~~Žandar: igrač kome istekne rok za povratak — napuštena partija?~~ | — | — | **Riješeno 27.11.2026:** da. Uz to se kao napuštena računa i partija u kojoj je igrač odigrao manje od 50 % poteza (AFK). |
| O4 | ~~Politika privatnosti: statistika vidljiva drugim igračima~~ | — | — | Nije potrebno za v1. Uslov za P2. |
| O5 | Kontrolna grupa ili kohorta prije i poslije | data | ne | Kohorta (§10). |
| O6 | Raub saldo (§9) prikazati prije Lige? | vlasnik | ne | Ne. Bez lige i poda saldo samo pada za većinu igrača. |

## 13. Botovi (dopuna v0.2, 28.11.2026)

**Izmjereno** (PostHog, 14 dana do 28.11.2026, završene partije, `match_ended`):

| Igra | Brza igra | Privatni sto | Pobjede %, brza igra |
|---|---|---|---|
| Raub | 2.470 | 195 | 41,6 % |
| Bela | 1.683 | 37 | 57,6 % |
| Poker | 1.006 | 75 | 22,9 % |
| Žandar | 337 | 41 | 62,9 % |

Oko 94 % završenih partija je brza igra, a to je skoro uvijek sto sa botovima. Statistika je zato u praksi „ja protiv botova".

- **Za vlastiti profil to je u redu:** igrač se poredi sam sa sobom kroz vrijeme.
- **Za tuđi profil nije:** procenat skupljen protiv botova ne govori ništa o drugom igraču. Zato je tuđa statistika P2.
- **Broji se isto za svaki sto.** Nema podjele „protiv ljudi / protiv botova", nema nagovještaja sastava stola, a kartica i red na kraju partije izgledaju isto (HARD RULE 3 i 5). Bot nema profil ni statistiku.
- **Polazište zavisi od broja igrača.** Za stolom od 4 prosjek je 25 %, pa poker pokazuje oko 23 % i kod prosječnog igrača. Zato poker i Raub dobijaju red konteksta stola (§5.2), a Žandar i Bela ne, jer im je polazište 50 %.
- **Težina bota utiče na procenat.** Promjena `ZANDAR_BOT_TIERS` ili poker bota pomjera svima procenat. Takvu promjenu treba zabilježiti u changelogu sa datumom, da se skok u statistici ne čita kao promjena igrača. DDA i krivulja pobjeda za nove igrače (HARD RULE 7) moraju ostati konfiguracija.
- **Kad tuđa statistika dolazi:** kad udio partija među ljudima bude dovoljno velik da procenat govori o igraču. Mjeri se iz `results/.opponents` (§7.1), a ne pogađa.

## 14. Prijatelji i privatni sto (dopuna v0.3, 28.11.2026)

Odluke vlasnika:
- **Ko vidi:** prijatelj (`relation: friends`) i igrač koji sjedi za istim privatnim stolom (`!isPublic`, oba `uid`-a u sobi, nije izašao). Brza igra bez prijateljstva ne daje pravo, jer se tamo uglavnom igra protiv botova (§13).
- **Šta vidi:** istu karticu kao na vlastitom profilu (`StatsCard variant="other"`): čipove igara, krug, pobjede i poraze, kontekst stola i niz. Dugmeta „Igraj" nema, a bez partija se kartica ne crta.
- **„Završava %":** drugi ga vide tek kad vlasnik ima 10 ili više započetih partija, u svim igrama zajedno (`showCompletes`). Do tada server šalje `abandoned: 0`.
- **Privatnost:** prekidač u Postavkama → Privatnost, „Statistiku vide prijatelji i igrači za privatnim stolom". Podrazumijevano je uključen (`profiles.statsHidden`, bez polja = vidljivo). Blokada u bilo kom smjeru sakriva statistiku. Sebi se ne šalje, jer svoju igrač vidi na profilu.

Server:
- `GET /api/profiles/:id?room=<roomId>`; sobu provjerava server (`sharesPrivateTable`), pa se tuđa soba ne može podmetnuti;
- odgovor nosi `stats` (`SharedStats`) samo kad `canSeeStats` dozvoli;
- nikad `lastAt`, protivnici ni oznaka bota.

Botovi (HARD RULE 3): dodir na sjedište otvara profil samo za nalog (`profileId`). Gost i bot već izgledaju isto (oblačić bez profila), pa statistika ne otkriva bota.

O2 je zatvoreno pragom 10. **O4 (pravni pregled vidljivosti) je uslov za produkciju**: `/privatnost` je dopunjena odlomkom „Statistika po igri".

