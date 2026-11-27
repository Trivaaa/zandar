# SPEC — Statistika igrača po igri · NACRT v0.1

> **Status: nacrt, čeka odobrenje vlasnika. Nijedan red koda nije napisan.**
> Datum: 2026-11-27. Grana: `docs/spec-statistika`.
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

Napuštanje je visoko (Raub 41 %, Žandar 38 %, `docs/PMF_PLAN.md`) i niko ga ne vidi. Igrač koji ode nema nikakvu posljedicu, a oni koji ostanu dobiju pokvarenu partiju.

**Cijena ako se ne uradi.** D1 je ispod praga u Žandru (21 %) i pokeru (16 %) (PMF_PLAN: prag 35 %). Igrač bez cilja preko jedne partije nema razlog za drugu sesiju.

## 2. Ciljevi

Sve su hipoteze. Čitaju se po pravilima iz `docs/PMF_PLAN.md` (po igri, platformi i izvoru, n ≥ 100).

| # | Cilj | Prag uspjeha | Rastegnuto | Kada |
|---|---|---|---|---|
| C1 | Igrači otvaraju statistiku | ≥ 30 % igrača sa 3+ završene partije otvori karticu u prvih 7 dana | ≥ 50 % | 2 sedmice poslije F1 |
| C2 | Partija se nastavlja | „Igraj ponovo" / „Revanš" sa kraja partije +5 p.p. prema 4 sedmice prije | +10 p.p. | 2 sedmice poslije F1 |
| C3 | Manje napuštanja | Raub 41 % → ≤ 35 %, Žandar 38 % → ≤ 33 % | ≤ 30 % | 4 sedmice poslije F2 |
| C4 | Povratak | D7 +2 p.p. po igri, na dvije uzastopne kohorte | +4 p.p. | 6–8 sedmica |

C1 i C2 su vodeći pokazatelji i pomjeraju se odmah. C3 je glavni efekat javnog procenta „Završava". C4 je zaostao pokazatelj i ne smije biti jedini kriterij, jer se sa sadašnjim prilivom ne može pročitati za manje od mjesec dana (isti zaključak kao SPEC_RANG §1.10).

## 3. Ne-ciljevi

| Ne radi se | Zašto |
|---|---|
| Javna globalna rang lista | Populacija je premala, pa bi tabela bila prazna ili puna nepoznatih imena. Javna tabela stranaca bi uz to otkrila koliko je stvarnih ljudi (HARD RULE 3, SPEC_RANG §5.7). Rang je Liga, kasnije. |
| Rejting vještine (Elo) prikazan igraču | Sreća je prejaka za mjerenje vještine prije ~100 partija (SPEC_RANG §2.3). |
| Istorija partija red po red | Niko je nije tražio, a server čuva samo zbirove. Ako se kasnije zatraži, `results/` već ima osnovu. |
| Statistika poteza (štihovi po ruci, poker VPIP, broj bela) | Druga vrsta igrača i drugi ekran. Ne pomaže prvim sesijama. |
| Brojke za partije prije uvođenja | Pobjede i napuštanja se nigdje nisu čuvali po `uid`-u. Izmišljeni zbirovi bi bili gori od praznih. |
| Podjela po protivniku („protiv ljudi / botova") | HARD RULE 3 i 5: bilo kakva takva podjela je curenje. |

## 4. Korisničke priče

**Igrač koji ima omiljenu igru (najčešći)**
- Kao igrač Rauba, hoću da vidim koliko sam partija dobio i koliki mi je procenat pobjeda u Raubu, da znam da li sam bolji nego prošlog mjeseca.
- Kao igrač, hoću da mi profil prvo pokaže moju igru, bez traženja.
- Kao igrač, hoću poslije partije da vidim da se nešto pomjerilo (broj pobjeda, niz), da imam razlog za još jednu.

**Igrač koji igra više igara**
- Kao igrač koji igra i Žandar i Belu, hoću da prebacujem između igara, da brojke iz jedne ne miješam sa drugom.

**Igrač koji gleda drugog igrača (tuđi profil, sjedište u lobiju)**
- Kao igrač u lobiju, hoću da vidim da li drugi obično završava partije, da znam da li vrijedi sjesti.
- Kao igrač, hoću da vidim šta drugi najviše igra i koliko dobija.

**Gost**
- Kao gost, hoću da mi se brojke čuvaju i bez naloga, a uz nalog da se prenesu na drugi uređaj.

**Ivični slučajevi**
- Kao igrač čiji je protivnik otišao, ne želim da mi se to računa kao poraz ni kao napuštanje.
- Kao novi igrač sa jednom partijom, ne želim veliki „0 %" ili „100 %" koji ništa ne znači.
- Kao igrač kome se izgubila veza na minut pa se vratio, ne želim da mi se upiše odustajanje.

## 5. Definicije (jedno pravilo za sve igre)

Standard je isti kao u većini kartaških aplikacija: pobjeda, poraz, procenat pobjeda i stopa završenih partija. Napuštanje se ne kažnjava, ali se vidi.

### 5.1 Ishod partije po igraču

| Igra | Pobjeda | Poraz | Napuštena |
|---|---|---|---|
| Žandar 2P i 3P | najviše bodova (`isMatchWinner`, `apps/server/src/analytics.ts`) | svi ostali | igrač ima `left: true` ili `connectionStatus === "abandoned"` (`apps/server/src/index.ts`, `leaveSeat` i istek veze) |
| Žandar 4P | pobjeda tima: oba partnera | tim izgubio | isto, samo za tog igrača |
| Bela (2 na 2) | tim na 1. mjestu (`belaMatchLike`) | tim na 2. mjestu | `left: true` |
| Raub (2–4) | 1. mjesto; **dijeljeno 1. mjesto = pobjeda za sve na njemu** (`raubPlacements`) | ostala mjesta | `left: true` |
| Poker (2–4) | 1. mjesto | ostala mjesta | `left: true` |

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
| **Završava %** | završene / (završene + napuštene) | vlasniku od prve partije; **drugima od 10 započetih** (u svim igrama zajedno) |
| Niz pobjeda | uzastopne pobjede u toj igri; poraz ga prekida, napuštanje takođe | kad je ≥ 2 |
| Najduži niz | najveći niz ikad u toj igri | kad je ≥ 2 |
| 1. mjesto | broj prvih mjesta | samo poker i Raub sa 3–4 igrača |

Za poker i Raub sa više igrača pobjeda ne može biti „50 % = prosjek", jer je prosjek za 4 igrača 25 %. Zato se tamo uz procenat piše „1. mjesto" i ne uvodi se nikakva ocjena („dobar", „loš").

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

**P0-4 · Red na kraju partije (S3, web)**
- Ispod rezultata stoji jedan red sa brojkom koja se upravo promijenila.
- Server poslije uspješnog upisa šalje događaj `stats:update` samo tom igraču, sa stanjem prije i poslije za tu igru. Stari klijent ga ignoriše.

Prihvatanje:
- [ ] Red se pojavi najkasnije 1,5 s poslije ekrana kraja. Ako `stats:update` ne stigne za 3 s, reda nema (bez praznog mjesta i bez spinera).
- [ ] Oblik i vrijeme događaja su isti bez obzira na to ko je sjedio za stolom (HARD RULE 3).

**P0-5 · Tuđi profil i sjedište (S4, web)**
- Vidi se omiljena igra, pobjede % u njoj i „Završava N %", samo za naloge (isti `account` uslov kao avatar).
- `/api/profiles/:id` dobija sažetak, ne cijeli `stats`.

Prihvatanje:
- [ ] Gost i bot izgledaju isto: nema reda statistike.
- [ ] Ispod 10 započetih partija nema „Završava".
- [ ] Odgovor ne nosi `uid`, tačan broj napuštanja ni brojke po drugim igrama.

**P0-6 · Analitika**: §10.

### P1 — odmah poslije

- **P1-1 · Moje igre (S2):** red igre dobija drugu liniju „40 partija · 60 % pobjeda".
- **P1-2 · „Pouzdan igrač":** mala oznaka na tuđem profilu za Završava ≥ 95 % i ≥ 20 započetih. Samo pozitivna, nikad ne postoji „nepouzdan".
- **P1-3 · Raub saldo:** zbir bodova Lige za Raub (§9) prikazan u Raub kartici kao „Saldo +34". Ima smisla tek kad Liga postoji ili kad vlasnik odluči da saldo ide prije nje.
- **P1-4 · Prijatelji:** na listi prijatelja ispod imena omiljena igra i pobjede %.
- **P1-5 · Aplikacija:** isti ekrani u APK-u (vidi otvoreno pitanje O1).

### P2 — ne sada, ali se dizajn ne smije zatvoriti

- **Liga** (SPEC_RANG): bodovi, lige, sezone. Zato `results/` već sada nosi plasman i Raub bodove (§7).
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
    firsts?: number;                   // 1. mjesta, poker i Raub 3–4P
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
```

- `completedMatches` i `completedMatchesByGame` ostaju kakvi jesu, uz ispravku iz §5.1: ko je napustio partiju ne dobija +1.
- Sve se uvećava u **istom commitu** u kom nastaje `results/…` (`FieldValue.increment`, kao danas u `apps/server/src/profile/store.ts`). Niz pobjeda traži čitanje prije pisanja, pa se profil piše sa preduslovom `updateTime` i do 3 ponavljanja (isti obrazac kao SPEC_RANG §6.2).
- Bez servisnog ključa (lokalni dev) radi postojeća memorijska izvedba.

### 7.2 Back-compat

- Snapshot sobe se ne mijenja: `left` i `connectionStatus` već postoje u sve četiri igre.
- `/api/me` i `/api/profiles/:id` dobijaju samo nova opciona polja. APK do 1.5.2 ih ne čita.
- Tijela zahtjeva se ne mijenjaju i klijent ne šalje ništa novo.
- Hidrirana soba čija se partija završi poslije restarta upiše se jednom, kao danas.

### 7.3 Šta nikad ne ide klijentu

`isBot`, tier, sastav stola, tuđi tačan broj napuštanja, tuđe brojke po igrama osim omiljene i `uid`. `lib/antiLeak.ts` ostaje kakav jeste: nova polja ne nose ništa o botu.

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
│        │ 58 % │  pobjeda         │  ← krug u boji igre
│        ╰──────╯                  │
│   24 pobjede · 17 poraza         │
│   1. mjesto 14×                  │  ← samo Raub/poker 3–4P
│   Niz 3 · najduži 5              │
│   Završava 94 % partija          │
│                                  │
│   Broji se od 1.12.2026. · ⓘ     │  ← otvara S6
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

### 8.4 S4 · Tuđi profil i sjedište

U `OtherProfileSheet` ispod nadimka:

```
Najviše igra Raub · 58 % pobjeda
Završava 92 % partija
```

U lobiju, na dodir sjedišta, isti red. Sam sto ostaje netaknut, jer bi pozornica izgubila visinu.

### 8.5 S5 · Gost i brisanje

- „Uz nalog:" → prva nova stavka „Statistika ostaje sačuvana".
- Upozorenje B4 dopunjeno: „…gubiš rezultate odigrane kao gost: 12 partija i statistiku."

### 8.6 S6 · „Kako se broji" (list odozdo)

> Broji se svaka partija odigrana do kraja. · Ako izađeš prije kraja, partija se broji kao napuštena. · Ako drugi igrač ode, tebi se ne broji ništa. · Ostali vide samo tvoju omiljenu igru i koliko partija završavaš.

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
| `stats_viewed` | `game`, `source: profile \| other_profile \| seat`, `matches` (u toj igri) | C1 |
| `stats_game_switched` | `from`, `to` | da li igrači gledaju više igara |
| `match_end_stats_shown` | `game`, `outcome`, `streak` | C2: veza sa „Igraj ponovo" |
| `match_ended` (postojeći) | + `stats_matches_before` | čitanje po broju odigranih |

- C2: odnos `match_end_stats_shown` → sljedeći `play_requested` / revanš u istoj sesiji, prema 4 sedmice prije F1.
- C3: `match_ended` sa `end_reason: abandoned` i `left: true`, po igri, sedmično.
- Kontrolne grupe nema: statistika je osnovna funkcija, a uzorak je premali za podjelu 50/50. Čita se kohorta prije i poslije, po pravilima PMF_PLAN-a (vidi O5).

## 11. Faze

| Faza | Šta | Gdje | Uslov |
|---|---|---|---|
| **F0** | P0-1, P0-2: server bilježi ishode, bez prikaza; ispravka brojanja onoga ko je izašao | server, 1 deploy | back-compat provjeren restartom sa starim snapshotom |
| **F1** | P0-3, P0-4, P0-6 | web (`isNative` grana) | F0 živ bar par dana, da kartica ima brojke |
| **F2** | P0-5: tuđi profil i „Završava" | server + web | pravni pregled (O4) |
| **F3** | sve iz F1–F2 u aplikaciji | AAB (vc 17; vc 16 je 1.5.2) | odluka O1 |
| poslije | P1, zatim Liga (SPEC_RANG) | | |

Statistika kreće od dana F0. Kartica zato nosi „Broji se od {datum}", da niko ne misli da su mu partije nestale.

Rokova spolja nema. Jedini datum koji se dodiruje je `railway.json` 1.12.2026: F0 je deploy servera i ne smije pasti dok se postavke prenose u dashboard.

## 12. Otvorena pitanja

| # | Pitanje | Ko | Blokira | Preporuka |
|---|---|---|---|---|
| O1 | Da li aplikacija dobija statistiku odmah (F1), kao izuzetak od „samo web", ili tek F3? | vlasnik | F3 | Kao Profil v0.3: web i aplikacija, jer je profil isti ekran. Aplikacija ionako čeka sljedeći AAB. |
| O2 | Prag 10 započetih partija za javno „Završava %" | vlasnik | F2 | 10; ispod toga jedna napuštena partija daje 80 % i stigmu bez osnova. |
| O3 | ~~Žandar: igrač kome istekne rok za povratak — napuštena partija?~~ | — | — | **Riješeno 27.11.2026:** da. Uz to se kao napuštena računa i partija u kojoj je igrač odigrao manje od 50 % poteza (AFK). |
| O4 | Politika privatnosti: statistika vidljiva drugim igračima | pravno | F2 | Dopuniti `/privatnost`; podaci su već na profilu, nova je samo vidljivost. |
| O5 | Kontrolna grupa ili kohorta prije i poslije | data | ne | Kohorta (§10). |
| O6 | Raub saldo (§9) prikazati prije Lige? | vlasnik | ne | Ne. Bez lige i poda saldo samo pada za većinu igrača. |
