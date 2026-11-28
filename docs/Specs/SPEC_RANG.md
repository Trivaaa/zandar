# SPEC — Liga (rang sistem za Žandar, Raub i Poker) · NACRT v1

> **Status: plan, čeka odobrenje vlasnika. Nijedan red koda nije napisan.**
> Datum: 2026-11-14. Grana: `claude/kartaonicu-rating-system-ye79j7`.
> Mjerenja i simulacija iz ovog dokumenta se mogu ponoviti: `docs/Specs/rang/mjerenje_tierova.ts` (pravi motor iz `game-core`) i `docs/Specs/rang/simulacija_ekonomije.py`.
> Gdje se ovaj tekst i kod razilaze, važi kod; razlike koje sam našao su u §2.
>
> **Dopuna 2026-11-27:**
> - Faza F0 (bilježenje ishoda) sada je zaseban spec `docs/Specs/SPEC_STATISTIKA.md`. Statistika (pobjede, porazi, napuštanja po igri) ide prije Lige, na istim zapisima u `results/`.
> - Bodovi Lige za Raub više nisu fiksna tabela iz §3.4, već „saldo" iz utiska igrača (odluka vlasnika, SPEC_STATISTIKA §9).
> - §2.1 je zastario: brza igra Žandra danas sjeda protivnike tier 3 i partnera tier 2 (`ZANDAR_BOT_TIERS`, changelog 216), a `versionCode` je na 16 (1.5.2).

---

## 1. Sažetak

1. **Klasičan rang po vještini nije pravi alat za ovu igru i ovu populaciju.** Izmjereno na pravom motoru: najjači bot (tier 3) pobjeđuje najslabijeg (tier 1) u samo 64 % mečeva do 21. Sreća je toliko jaka da se vještina ne može izmjeriti prije stotinjak partija, a 88 % igrača ih odigra manje od 15.
2. **Preporuka: „Liga" kao ljestvica napretka, ne kao mjera vještine.** Šest liga po kartama (Sedmica → Desetka → Žandar → Dama → Kralj → As), bodovi se skupljaju po završenoj partiji, liga se u toku sezone ne može izgubiti, sezona traje kalendarski mjesec.
3. **Vidljivi bodovi ne zavise od protivnika.** Tako po konstrukciji ne postoji razlika između partije sa botom i partije sa čovjekom, pa nema šta da procuri.
4. **Skriveni rejting postoji, ali samo kao instrument:** usidreni Elo, botovi su fiksna sidra (T1 1430, T2 1500, T3 1535). Služi za izbor protivnika (DDA) i za kasnije sparivanje ljudi. Igrač ga nikad ne vidi.
5. **Tabele su samo među prijateljima** dok nema dovoljno ljudi. U javnoj tabeli su samo nalozi; gost i bot i tu izgledaju isto (pravilo G3), pa bot ne može ni da se pojavi ni da „nestane".
6. **Povratak sutradan** nosi prva pobjeda dana i traka „još N bodova do lige"; **povratak za 7 dana** nose sedmični cilj (3 partije), tabela prijatelja i push podsjetnik sa istinitim razlogom (PRD §51.5).
7. **MVP ide samo na server i web** (stari APK ignoriše nova polja). Aplikacija dobija ligu sljedećim AAB-om; push podsjetnici traže AAB jer kanal mora postojati u paketu.
8. **Glavni rizik:** igrač nasluti da je „namješteno" (DDA) ili da tabela nije od pravih ljudi. Odgovor: DDA bira samo protivnike, miješanje ostaje kriptografsko, a javne tabele stranaca se ne uvode ispod ~500 aktivnih.
9. **Očekivani efekat je hipoteza, ne obećanje:** +10–20 % partija po igraču u prvoj sedmici, D1 +1–3 p.p., D7 +1–3 p.p. Najveći dio D7 efekta očekujem od push podsjetnika, ne od same lige.
10. **Sa sadašnjim prilivom igrača D7 se ne može statistički pročitati za 2–4 sedmice.** Zato su kriteriji uspjeha vodeći pokazatelji (druga sesija, partije po igraču), uz 50/50 kontrolnu grupu.

---

## 2. Šta sam našao u kodu

### 2.1 Gdje se tvoje tvrdnje razlikuju od koda

| Tvrdnja iz zadatka | Kod |
|---|---|
| Sljedeći `versionCode` je 4 | `apps/web/android/app/build.gradle` je već na `versionCode 8` / `1.4.1` (commit `69a61d6`, nije poslat na Play). Liga u aplikaciji bi bila 1.5.0 = `versionCode 9`, ili ulazi u 8 ako se čeka sa slanjem. |
| Botovi su tierovi 1–3 | Brza igra Žandara **uvijek** sjeda tier 2: `fillSeatsWithBots(room, 2)` u `apps/server/src/index.ts`. Tier 1 i 3 postoje u `game-core`, ali ih server ne bira. |
| DDA drži igrača oko 50 % | DDA i onboarding kriva **ne postoje u kodu**. Nema ni tipa `DDAConfig` koji CLAUDE.md pominje (`grep` po `packages/` i `apps/server/src` ne nalazi ništa). Danas igrač igra protiv tiera 2, tačka. |
| Brza igra većinom popunjava botovima | Za Žandar praktično uvijek: nova soba se u istom zahtjevu popuni botovima i odmah krene, pa grana „nađi javnu sobu koja čeka" skoro nikad nema šta da nađe. Poker i Raub imaju prozor od 2 s. |
| `match_ended` nedostaje na ~30 % mečeva | `docs/analytics.md`: popravljeno 1.11.2026 (sweeper i prekid šalju kraj). Sadašnju stopu nisam mogao provjeriti (nemam pristup PostHogu). Za ligu je svejedno: rang se računa iz stanja servera, ne iz analitike. |
| Žandar je 2P ili 4P | Server prima i 3 igrača (`QUICK_PLAY_PLAYER_COUNTS = [2, 3, 4]`). Plan pokriva 3P kao „svako za sebe". |
| Raub i Poker | Žive na stagingu; na produkciji iza `NEXT_PUBLIC_POKER=1` / `NEXT_PUBLIC_RAUB=1` (`lib/games.ts`). MVP lige zato praktično znači Žandar, ali šema nosi `game`. |

### 2.2 Na čemu se može graditi

- **Kraj meča ima jedno mjesto:** `emitMatchEnded(room, reason)` u `index.ts`, za sve tri igre, sa stražom „jednom po meču". Tu se već zove `recordCompletedMatch`.
- **Idempotentnost već postoji:** `results/{matchId__uid}` se piše sa `exists: false` u istom commitu sa brojačem (`profile/store.ts`). Dokument danas nosi samo `{uid, matchId, at}`: **nema ishoda**, a prekinuta partija ne piše ništa. Istorija pobjeda se zato ne može rekonstruisati; svi kreću od nule.
- **Namjeran izlazak se razlikuje od pada veze:** `Player.left = true` (QA B1, `room:leave`). Analitika to ne razlikuje, server da.
- **`toPublicPlayer` je whitelist** i već ima pravilo „gost i bot izgledaju isto" (`avatar`, `profileId` su `null` za oboje). Liga se naslanja na isto pravilo.
- **Gost ima `uid`** (anonimni Firebase nalog), registracija zadržava isti `uid`. Prijava na postojeći nalog (tok B4) odbacuje rezultate gosta; isto će važiti i za ligu.
- **Brisanje naloga** (`deleteUserData`) briše profil i rezultate, pa liga unutar dokumenta profila ne traži novu logiku brisanja.
- **Push:** uređaj ima `lastSeenAt` (`push/devices.ts`); kanali `sto` i `prijatelji` se prave na klijentu (`NativePush.tsx`), pa novi kanal `podsjetnici` traži AAB.
- **Coinsi ne postoje u kodu.** Plan ih ne uvodi.

### 2.3 Izmjereno: koliko vrijedi bot (3000 mečeva po redu, pravi `selectBotMove` + `applyMove`)

| Sto | do 11 | do 21 |
|---|---|---|
| 2P: T1 protiv T2 | 42,0 % | 39,8 % |
| 2P: T3 protiv T2 | 53,7 % | 55,1 % |
| 2P: T3 protiv T1 | 60,2 % | 63,9 % |
| 4P: T3+T2 protiv T2+T2 | 50,9 % | 53,1 % |
| 4P: T1+T2 protiv T2+T2 | 46,8 % | 45,2 % |
| 4P: T3+T3 protiv T1+T1 | 59,7 % | 63,2 % |
| Ruku po meču | 3,9 | 7,6 |

Preračunato u Elo (skala 400): **T1 ≈ −72, T2 = 0, T3 ≈ +36**. Cijeli raspon botova je oko 110 Elo poena. Meč do 11 nosi oko 75 % signala meča do 21.

Tri posljedice koje određuju cijeli plan:

1. **Vještina se jedva vidi u rezultatu.** Da razlikuješ igrača od 55 % od igrača od 50 % treba ti oko 380 partija.
2. **DDA ima malu polugu.** Šta god server izabrao, igrač iz raspona botova pobjeđuje između ~40 % i ~64 %. To je dobra vijest za rizik „namješteno".
3. **Onboarding kriva iz PRD §40.4 (60–65 % u prvih 5 partija) nije dostižna** sa sadašnjim parametrima: toliko dobija samo igrač jačine T3 protiv T1. Ako se ta kuka želi, treba slabiji „tier 0" u konfigu (van opsega ovog plana, ali treba znati).

---

## 3. Model i ekonomija

### 3.1 Dva sloja i kako su povezani

| | Skriveni rejting | Liga (vidljivo) |
|---|---|---|
| Čemu služi | izbor protivnika, kasnije sparivanje ljudi, provjera inflacije | motivacija i povratak |
| Šta mjeri | procjenu jačine u jedinicama botova | koliko igraš i koliko dobijaš ovog mjeseca |
| Zavisi od protivnika | da | **ne** |
| Po igri | posebno (Žandar, Poker, Raub) | **jedna liga za cijelu Kartaonicu** |
| Može pasti | da | bodovi da (gornje lige), liga u sezoni ne |
| Vidi ga | niko osim servera | igrač, prijatelji, igrači s nalogom |

**Veza je namjerno labava: skriveni rejting ne ulazi u bodove lige.** Razlog je tvrdo ograničenje 1. Čim bi bodovi zavisili od jačine protivnika, morao bih ili prikazati „težinu stola" (a bot nema ligu koju bih pokazao) ili sakriti razlog zašto je nekad +8, a nekad +12. Oba puta vode ka pitanju „ko mi sjedi preko puta".

**Koliko velikodušno, a da i dalje nešto znači?** Donje tri lige su velikodušne (poraz ne oduzima ništa) i znače „igram". Gornje tri oduzimaju za poraz i znače „igram mnogo i dobijam bar koliko gubim". Nijedna ne znači „bolji sam od tebe", jer to igra ne može pošteno izmjeriti na ovom obimu. Tako ću i pisati u interfejsu: nigdje riječ „rejting", „vještina" ni „rang lista najboljih".

### 3.2 Skriveni rejting: usidreni Elo

Izbor i obrazloženje:

- **Glicko-2** je pravljen za 1 na 1 i za periode ocjenjivanja sa više partija; timove 2 na 2 i plasmane (Poker, Raub) ne poznaje, a sa 3 partije sedmično period je prazan.
- **OpenSkill (Weng-Lin)** prirodno pokriva timove i plasmane, ali su mu podrazumijevani parametri za igre gdje vještina odlučuje. Ovdje je raspon cijele populacije botova 0,27 početne nesigurnosti; jedna pobjeda bi pomjerila igrača dalje od cijelog raspona. Morao bih ručno naštimati β i σ, dakle opet nagađam.
- **Biram treće: Elo sa fiksnim sidrima i rasporedom K.** Četrdesetak redova čistog TypeScripta u `game-core`, deterministično, lako za test. Kad signal po partiji nosi ovako malo informacije, finije modelovanje nesigurnosti ne kupuje ništa. Polja koja čuvam (`r`, `n`, `lastAt`) dovoljna su za kasniji prelazak na Glicko ako populacija poraste.

Formule (sve brojke su konfig, §3.9):

```
E      = 1 / (1 + 10^(−(Rmoj − Rprotivnik) · f / 400))      f = 1,0 (do 21) · 0,75 (do 11)
Rnovo  = Rstaro + K(n) · (S − E)                            S = 1 pobjeda, 0 poraz
K(n)   = 16 za n < 10 · 10 za n < 30 · 6 poslije
```

- **Botovi su sidra i ne pomjeraju se:** T1 = 1430, T2 = 1500, T3 = 1535 (iz §2.3). Zato rejting ne može inflirati protiv botova: ko dobija 50 % protiv T2, konvergira na 1500 i tu staje.
- **Tim (4P):** Rtim = prosjek dva člana (bot partner ulazi svojim sidrom). Oba člana dobijaju istu promjenu, svaki sa svojim K. Zasluge se ne dijele po potezima; to bi bilo nagađanje.
- **3P Žandar, Poker, Raub (plasman):** par po par protiv svakog protivnika, zbir podijeljen sa (broj protivnika).
- **Prekinuta partija ne mijenja skriveni rejting.** Prekid govori o strpljenju, ne o vještini; u simulaciji je brojanje prekida kao poraza pravilo sistematsku grešku od −28.
- **Novi igrač kreće sa 1470** (hipoteza: prosječan čovjek je malo ispod T2).
- **Neaktivnost:** rejting ne opada. Poslije 60 dana pauze K se vraća na 16 za sljedećih 10 partija.

Šta rejting stvarno zna (simulacija, §4): poslije manje od 15 partija greška procjene je ista kao da svima dodijelim prosjek (RMSE 47 prema rasipanju 48). Tek preko 150 partija postaje koristan (RMSE 20 prema 38). **Zato ga u MVP-u samo bilježimo.**

### 3.3 Botovi i DDA

- **Šta rejting mjeri ako DDA drži 50 %?** Elo uračunava jačinu protivnika: pobjeda nad T1 vrijedi manje od pobjede nad T3. DDA mijenja protivnika, ne skalu. Rejting i dalje mjeri isto, samo sporije uči kad su protivnici uvijek blizu.
- **DDA treba da čita skriveni rejting, ne prozor zadnjih N partija.** Prozor od 10 partija ima standardnu devijaciju 16 p.p.; DDA nad njim bi jurio sreću. Pravilo: izaberi sto čiji je očekivani ishod najbliži cilju iz onboarding krive.
- **Sažaljenje je jeftino i ljudsko:** poslije 3 poraza zaredom sljedeći sto je T1 (u 4P: jači partner). Jedan prag, u konfigu.
- **DDA nikad ne dira karte ni miješanje**, samo izbor tiera i partnera (HARD RULE 2 i 9).
- **Inflacija vidljivog sloja** ne dolazi od botova, jer bodovi ne zavise od protivnika. Ograničava je sezona (§3.6).
- **Redoslijed:** DDA je zasebna faza (§8, F4). Liga radi i sa današnjim „uvijek T2"; tada prosječan igrač dobija ~46 % (simulacija), što je još jedan razlog da donje lige ne kažnjavaju poraz.

### 3.4 Lige i bodovi

Šest liga, jedna traka napretka u svakoj (tri crte, bez imena divizija).

| Liga | Prag (bodovi) | Poraz do 21 / do 11 | Šta znači |
|---|---|---|---|
| Sedmica | 0 | +2 / +1 | odigrana prva partija |
| Desetka | 10 | +2 / +1 | prva pobjeda (ili 5 odigranih) |
| Žandar | 70 | 0 / 0 | ~8 partija |
| Dama | 170 | −3 / −2 | redovan igrač, ~3 partije sedmično |
| Kralj | 400 | −7 / −4 | igra skoro svaki dan |
| As | 700 | −10 / −6 | igra svaki dan i dobija više nego što gubi |

**Pobjeda: +10 (do 21), +6 (do 11)**, u svim ligama. 2P, 3P i 4P vrijede isto: ruka traje slično, a u 4P polovina rezultata je partnerova, što se poništava kroz mnogo partija.

Bonusi (svi pozitivni, nijedan ne kažnjava propušten dan):

| Bonus | Vrijednost | Pravilo |
|---|---|---|
| Prva pobjeda dana | +5 | jednom dnevno, dan po `Europe/Sarajevo` |
| Sedmični cilj | +10 | 3 završene partije od ponedjeljka do nedjelje |
| Povratak | +5 | prva završena partija poslije 3 ili više dana pauze |

**Dnevnih serija prijave nema, pa nema ni „zaštite serije".** Serija koja puca kad propustiš dan kažnjava tačno onog igrača kog pokušavamo vratiti. Bonus „Povratak" radi obrnuto: nagrađuje dolazak poslije pauze.

Poker i Raub (polazne vrijednosti, **hipoteza**; kalibrišu se po izmjerenom trajanju da bodovi po minuti budu slični Žandaru):

| Igra | 1. mjesto | 2. | 3. | 4. |
|---|---|---|---|---|
| Poker (4 igrača, ~15 min) | +16 | +8 | poraz ×1 | poraz ×1 |
| ~~Raub (2–4 igrača, ~35 min)~~ | ~~+30~~ | ~~+14 (od 3 igrača)~~ | ~~+6 (od 4 igrača)~~ | ~~poraz ×2~~ |

**Raub (zamijenjeno 2026-11-27):** pobjednik dobija zbir bodova koji je ostao ostalima, a ostali gube onoliko koliko im je ostalo. Faktor i granice su u `RankConfig.raub`, a pod lige iz §3.5 važi. Detalji: `docs/Specs/SPEC_STATISTIKA.md` §9.

### 3.5 Strah od gubitka

- **Liga se u sezoni ne gubi.** Bodovi mogu pasti samo do praga lige u kojoj si. U interfejsu piše: „Liga je sigurna do kraja sezone."
- **Ulazak u novu ligu** zato ne traži posebnu zaštitu: prag je pod.
- **Partija za određivanje lige nema.** Tri do pet partija ne mogu ništa izmjeriti (§2.3), pa bi „određivanje" bilo predstava. Umjesto toga prva pobjeda odmah daje ligu Desetka. U simulaciji 69 % svih igrača stigne do Desetke, medijan poslije prve partije.
- **Poraz oduzima tek od lige Dama**, dakle tek kad je igrač već uložen (medijan 17 partija).

### 3.6 Vrijeme: sezona, sedmica, dan

- **Sezona je kalendarski mjesec** („Sezona decembar"). Razumije se bez objašnjenja.
- **Na početku sezone:** ko je u ligi Dama ili višoj kreće jednu ligu niže, sa praga te lige. **Sedmica, Desetka i Žandar ne gube ništa.** Tako preko 90 % igrača nikad ne doživi oduzimanje, a vrh se svaki mjesec ponovo osvaja.
- **Ostaje zauvijek:** najviša liga ikad, liga po završenim sezonama, broj pobjeda i partija.
- **Neaktivnost ne oduzima ništa** osim sezonskog pravila gore. Presjek se radi lijeno: prvi put kad se profil čita ili piše u novoj sezoni (čista funkcija, bez crona).
- **Sedmica** (ponedjeljak 00:00 – nedjelja, `Europe/Sarajevo`) nosi sedmični cilj i tabelu prijatelja; sedmični bodovi se resetuju, liga ne.

### 3.7 Šta se broji

| Pitanje | Odluka | Zašto |
|---|---|---|
| Brza igra ili i privatni sto | **Oba** | Igra s prijateljima je najjači razlog povratka; ne smije biti „manje vrijedna". |
| 11 ili 21 | Oba, 11 vrijedi 60 % | Pola ruku, manje signala. |
| 2P, 3P, 4P | Isto | §3.4. |
| Po igri ili zajedno | Liga zajednička, skriveni rejting po igri | Tri ljestvice za desetine igrača znače tri prazne ljestvice. |
| Gost ili samo nalog | **Oba** | Gost ima `uid`. Registracija postaje „Sačuvaj svoju ligu". |
| Revanš | Broji se kao svaka partija | Novi `matchId` već postoji. |

### 3.8 Varanje i trikovi

| Trik | Pravilo | Napomena |
|---|---|---|
| Dva prijatelja puštaju pobjede | U privatnoj sobi isti sastav ljudi daje najviše **3 bodovane pobjede dnevno**. Dalje su partije „prijateljske": 0 bodova, ali se broje za sedmični cilj. | Naizmjenično puštanje ionako daje isto što i poštena igra (6 bodova po partiji u prosjeku). Opasno je samo jednostrano hranjenje. |
| Brza predaja da drugi dobije pobjedu | **Pobjeda se piše samo za meč odigran do cilja.** Prekinut meč nikome ne donosi pobjedu. | Zatvara farmu „uđi, izađi, ponovi". |
| Napuštanje da se izbjegne poraz | Ko ode (`left`) ili ostane bez veze do prekida dobija **ishod „prekid"**: bodovi kao poraz u toj ligi, bez +2 za odigrano. | Pad veze i namjeran izlazak se ne razlikuju namjerno; povratak u roku čuva partiju. |
| Ko ostane u 4P kad saigrač ode | Ako se meč prekine: **bez promjene**. Ako se odigra do kraja: normalan ishod. | Ne kažnjavamo onog ko je ostao. |
| AFK i auto-play | Ako je više od pola igračevih poteza odigrao auto-play, ishod je „prekid". | Traži brojač auto-poteza po igraču (server, opciono polje). |
| Novi gost za svjež početak | Ništa ne treba. Početak je dno ljestvice. | Jedina „korist" je lakši onboarding sto, a bodovi kreću od nule. |
| Revanš u krug | Protiv botova bezopasan; protiv ljudi važi dnevna granica istog sastava. | |
| Ista osoba na webu i u aplikaciji | Dva gosta, dvije lige, dok se ne registruje. | Tekst na profilu gosta to kaže kao korist naloga. |

Granica od 3 pobjede važi **samo u privatnim sobama**. U brzoj igri ne smije postojati nikakvo pravilo koje se ponaša drugačije kad je preko puta čovjek.

### 3.9 Konfig (jedan objekat, `RankConfig` u `shared-types`)

| Ključ | Polazna vrijednost |
|---|---|
| `leagues[].id` / `floor` | `sedmica` 0 · `desetka` 10 · `zandar` 70 · `dama` 170 · `kralj` 400 · `as` 700 |
| `points.win` | `{21: 10, 11: 6}` |
| `points.loss[liga]` | do 21: `[2, 2, 0, −3, −7, −10]` · do 11: `[1, 1, 0, −2, −4, −6]` |
| `points.abandon[liga]` | `[0, 0, 0, −3, −7, −10]` |
| `points.placement` | Poker `[16, 8, L, L]` · Raub `[30, 14, 6, 2L]` |
| `bonus.firstWinOfDay` | 5 |
| `bonus.weeklyGoal` | `{matches: 3, points: 10}` |
| `bonus.comeback` | `{days: 3, points: 5}` |
| `season.kind` / `compressFrom` / `timezone` | `month` · `dama` · `Europe/Sarajevo` |
| `private.sameGroupWinsPerDay` | 3 |
| `afk.maxAutoPlayShare` | 0,5 |
| `rating.start` / `anchors` | 1470 · `{1: 1430, 2: 1500, 3: 1535}` |
| `rating.k` / `formatFactor` | `[[10, 16], [30, 10], [∞, 6]]` · `{21: 1, 11: 0.75}` |
| `rating.rustDays` | 60 |
| `dda.onboarding` | partije 1–5: T1 · 6–15: T1 ili T2 · dalje po rejtingu |
| `dda.pityAfterLosses` | 3 |
| `visiblePercent` | 50 (kontrolna grupa, §7) |
| `groups.minPlayers` | 30 (ispod toga nema tabele stranaca) |

---

## 4. Simulacija

### 4.1 Specifikacija

- **1000 igrača**, svi počinju nultog dana, 84 dana (tri sezone po 28 dana).
- **Klase aktivnosti** (daju D1 30 %, D7 12 %, D30 5 %):

| Klasa | Udio | Ponašanje |
|---|---|---|
| A | 70 % | samo prvi dan, 1–6 partija (medijan 1) |
| B | 18 % | prva sedmica, 3–4 sesije, ~7 partija |
| C | 7 % | četiri sedmice, 3–5 partija sedmično |
| D | 4 % | 12 sedmica, 3 partije sedmično |
| E | 1 % | „kitovi", 30–60 partija sedmično |

- **Vještina:** N(−30, 50) Elo prema T2 = 0 (**hipoteza**). Ishod meča po formuli iz §3.2 i izmjerenim sidrima.
- **Protivnici:** 90 % botovi, 10 % ljudi (privatne sobe). DDA po §3.3.
- **Format:** 70 % do 21, 30 % do 11.
- **Prekidi:** 25 % (A), 18 % (B), 12 % (C), 8 % (D), 6 % (E) (**hipoteza**).
- Bodovi, bonusi, pod lige i sezonski presjek po §3.4–3.6.

### 4.2 Rezultati (sjeme 1; kitovi provjereni na još 5 sjemena)

**Raspodjela po ligama, svi igrači (%)**

| | Sedmica | Desetka | Žandar | Dama | Kralj | As |
|---|---|---|---|---|---|---|
| 1 sedmica | 31,2 | 63,0 | 4,8 | 1,0 | 0 | 0 |
| 4 sedmice | 31,1 | 52,9 | 11,5 | 3,5 | 1,0 | 0 |
| 12 sedmica | 31,1 | 52,9 | 9,3 | 5,7 | 1,0 | 0 |

**Samo igrači aktivni te sedmice (%)**

| | Žandar | Dama | Kralj | As |
|---|---|---|---|---|
| 4. sedmica (120 igrača) | 62,5 | 29,2 | 8,3 | 0 |
| 12. sedmica (50 igrača) | 24,0 | 56,0 | 20,0 | 0 |

**Partija do lige** (medijan, p25–p75): Desetka 1 (1–2) · Žandar 8 (7–9) · Dama 17 (16–21) · Kralj 89 (79–99) · As: u tri sezone stigne 0–4 od 10 kitova, zavisno od sjemena.

**Igrač sa 3 partije sedmično (klasa D), medijan bodova po sedmici:**

| Sedmica | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bodovi | 50 | 86 | 115 | 143 | 162 | 194 | 224 | 251 | 105 | 131 | 161 | 188 |
| Liga | Desetka | Žandar | Žandar | Žandar | Žandar/Dama | Dama | Dama | Dama | Žandar | Žandar | Žandar/Dama | Dama |

Čita se ovako: Desetka prvog dana, Žandar druge sedmice, Dama oko šeste. Presjek sezone ga vraća u Žandar, a Dama je opet dostižna tačno do kraja mjeseca (28–35 od 40 takvih igrača je vrati). To je namjerno: **prag lige Dama je mjesečni cilj redovnog igrača.**

**Inflacija po sezoni:**

- Klasa D na kraju sezona 1 / 2 / 3: u ligi Dama 15 % → 98 % → 70 %. Prva sezona je niža jer se kreće od nule; poslije se ustali oko 70–85 %.
- Kitovi: svi u ligi Kralj; u ligi As 0–20 % na kraju prve sezone, 0–30 % druge, 0–40 % treće. Rast se zaustavlja jer As svakog mjeseca kreće sa praga lige Kralj.
- Unapređenja po sezoni za klasu D: 2,2 → 1,0 → 0,7. **Slabost:** redovan igrač u ustaljenom stanju ima manje od jednog unapređenja mjesečno. Zato traka ima tri crte, a sedmični cilj je postavljen na njegov ritam (3 partije).

**Stopa pobjeda:** sa DDA-om 52–56 % (najviše klasa A zbog onboardinga). Sa današnjim „uvijek T2" oko 46 %.

**Skriveni rejting:** prosječna greška bez sistematskog pomaka (−7 do +2). RMSE po broju partija: 1–4 → 50 · 5–14 → 47 · 15–39 → 44 · 150+ → 20 (rasipanje stvarne vještine 38–53).

### 4.3 Šta simulacija ne zna

- Raspodjelu ljudske vještine i stopu prekida sam pretpostavio. Prvo pravo mjerenje daje faza F0 (bilježenje bez prikaza).
- Simulira samo 2P Žandar. 4P ima manji signal (§2.3), pa ništa od zaključaka ne postaje bolje.
- Ne modeluje da liga mijenja ponašanje. To je ono što eksperiment treba da pokaže.

---

## 5. Zadržavanje i UX po ekranima

### 5.1 Petlja

| Kad | Šta igrač vidi | Šta ga vraća |
|---|---|---|
| Kraj partije | traka lige sa „+10", crta ili nova liga | „još 12 do lige Dama" je nedovršen posao |
| Sutra | „Prva pobjeda danas: +5" (na kraju prve partije dana) | mali, siguran dobitak |
| Za 7 dana | sedmični cilj 2/3, tabela prijatelja koja se u ponedjeljak briše | cilj koji je skoro gotov; prijatelj koji vodi |
| Za mjesec | nova sezona, vrh kreće ligu niže | „vrati Damu" |

**Znamo:** trake napretka i sedmični ciljevi rade u kežual igrama uopšte. **Hipoteza:** da rade za našu publiku, sa ovako malo ljudi i bez pravih protivnika u tabeli. **Hipoteza:** da gost registruje nalog da sačuva ligu.

### 5.2 Kraj meča (`RoundEndOverlay`, `phase="match_finished"`; isto u Poker i Raub završnom ekranu)

Nova komponenta `LeagueStrip`, odmah ispod naslova, iznad tabele rezultata. Visina 64 px; na 360×640 tabela rezultata već skroluje (`.roundend__scroll`), pa traka ne gura dugmad.

```
┌──────────────────────────────────┐
│                               ✕  │
│        Pobjeda: Ti i Mira        │
│ ┌──────────────────────────────┐ │
│ │ [J♠] Liga Žandar        +15  │ │
│ │ ▓▓▓▓▓▓▓▓▓│▓▓▓▓░░░░│░░░░░░░░  │ │
│ │ Još 43 boda do lige Dama     │ │
│ │ Pobjeda +10 · Prva danas +5  │ │
│ └──────────────────────────────┘ │
│  Mi   21      Oni   14           │
│  ...                             │
│ [        Revanš        ]         │
│ [       Novi sto       ]         │
└──────────────────────────────────┘
```

| Stanje | Tekst |
|---|---|
| Pobjeda | „Pobjeda +10" (+ „Prva danas +5", „Sedmični cilj +10", „Povratak +5" kad važe) |
| Poraz, donje lige | „Odigrano +2" |
| Poraz, liga Žandar | „Bez promjene" |
| Poraz, gornje lige | „Poraz −3" · na podu: „Liga je sigurna do kraja sezone." |
| Nova crta | traka se popuni do crte, kratak sjaj (samo `opacity`) |
| **Nova liga** | naslov trake „Nova liga: Dama", ikona karte uđe (`transform`), zvuk i vibracija kao za veliku vijest (`useScoreNews`) |
| Prva završena partija | „Liga Sedmica. Prva pobjeda vodi u Desetku." |
| Prijateljska (granica §3.8) | „Prijateljska partija · bez bodova danas" |
| Učitavanje | skelet trake; bodovi stižu događajem `rank:update` |
| Greška ili 5 s bez odgovora | „Bodovi stižu malo kasnije." Dugmad rade odmah. |
| Kontrolna grupa, stari server | traka se ne crta |
| Gost, od druge završene partije | ispod trake tih red: „Liga se čuva samo na ovom uređaju. **Sačuvaj je**" → list A3. Nikad se ne otvara sam (G1). |

Prikazuju se **samo tvoji bodovi**. Bodovi drugih igrača se ne prikazuju nikad: bot ih nema.

### 5.3 Profil (`AccountProfile`, `GuestCard`)

Kartica lige ispod nadimka; red „N završenih partija" ostaje i dobija pobjede.

```
┌──────────────────────────────────┐
│             Profil               │
│            ( avatar )            │
│             Zvonko               │
│ ┌──────────────────────────────┐ │
│ │ [Q♥] Liga Dama            ›  │ │
│ │ ▓▓▓▓▓▓▓▓▓│▓▓▓░░░░░│░░░░░░░░  │ │
│ │ 212 bodova · još 188 do      │ │
│ │ lige Kralj                   │ │
│ │ Sezona novembar · još 16 dana│ │
│ │ Sedmični cilj  ● ● ○   2/3   │ │
│ └──────────────────────────────┘ │
│ 34 pobjede · 61 završena partija │
│ Najviša liga: Dama               │
│ Nadimak               Promijeni  │
│ Avatar                Promijeni  │
│ Postavke                         │
└──────────────────────────────────┘
```

| Stanje | Ponašanje |
|---|---|
| Bez završene partije | „Još nemaš ligu. Odigraj partiju do kraja." + dugme **Igraj** |
| Učitavanje (P7) | skelet kartice |
| Greška (P8, G2) | „Liga se nije učitala." · **Pokušaj ponovo**; ostatak profila radi |
| Gost | ista kartica; u listi „Uz nalog:" nova prva stavka „Liga ostaje sačuvana" |
| Nova sezona, prvi ulazak | list: „Sezona decembar je počela" · „Krećeš iz lige Žandar. Prošle sezone: Dama." · U redu |
| B4 upozorenje | dopuna: „…gubiš rezultate odigrane kao gost: 12 završenih partija **i ligu Žandar**." |

Dodir na karticu otvara **list „Lige"** (odozdo, G8): šest redova sa kartom, imenom i pragom, tvoj red označen, ispod četiri rečenice:

> Bodove dobijaš za svaku partiju odigranu do kraja. · Pobjeda nosi najviše. · Liga se ne može izgubiti do kraja sezone. · Nova sezona počinje prvog u mjesecu; lige Dama, Kralj i As tada kreću jednu ligu niže.

### 5.4 Početna

**Smije li sto pokazati ligu bez probijanja budžeta visine? Da, ali ne na stolu.** Red marke (30 px) je od uklanjanja zupčanika prazan sa desne strane. Tu ide značka lige: mala karta i ime, vizuelno 26 px, meta 44 px (proširena `padding`-om, bez promjene visine reda). Nula dodatnih piksela.

```
┌──────────────────────────────────┐
│ ◆ Kartaonica          [Q♥] Dama  │  ← 30 px, kao danas
│ ╭──────────────────────────────╮ │
│ │         J♠  Q♥  K♦           │ │
│ │ ŽANDAR                       │ │
│ │ 2 ili 4 igrača · ~10 min     │ │
│ ╰──────────────────────────────╯ │
│ [ Igraj                      → ] │
│ [ Napravi sto                  ] │
│ ...                              │
└──────────────────────────────────┘
```

Dodir vodi na tab Profil. Bez završene partije značke nema. Kriterij prihvatanja je CDP mjerenje na 360×740 i 390×844 sa 1, 2 i 3 igre.

### 5.5 Tuđi profil i sjedište (T1–T5)

- **T1/T2 (igrač s nalogom):** ispod nadimka red „Liga Dama · najviša: Kralj". Bez bodova.
- **T3 (igrač bez naloga):** ništa novo. Gost i bot ostaju slovo i nadimak. Pravi gost ima ligu, ali je drugi ne vide, isto kao što nema avatar.
- **Sjedište za stolom:** u MVP-u bez značke. Budžet visine sjedišta je izmjeren i svaki piksel se oduzima stolu.
- **Lobi (red igrača):** za nalog, sitan tekst „Liga Dama" pored nadimka.

Bot se ovim ne odaje: sve što je novo vidi se samo kod naloga, a to pravilo već važi za avatar.

### 5.6 Prijatelji

Iznad liste jedna kartica; dodir otvara list „Tabela prijatelja".

```
┌──────────────────────────────────┐
│ Prijatelji                Dodaj  │
│ ┌──────────────────────────────┐ │
│ │ Ove sedmice: 2. od 5      ›  │ │
│ │ Mira vodi sa 46 bodova       │ │
│ └──────────────────────────────┘ │
│ Prijatelji (4)                   │
│ (o) Mira                         │
│     Liga Dama            Pozovi  │
│ (o) Zvonko                       │
│     Liga Žandar          Pozovi  │
└──────────────────────────────────┘

List „Tabela prijatelja · ova sedmica"
│ 1. Mira        [Q♥]   46  Pozovi │
│ 2. Ti          [J♠]   31         │
│ 3. Zvonko      [J♠]   12  Pozovi │
│ 4. Sanja       [10♦]   0  Pozovi │
│ Tabela se briše u ponedjeljak.   │
```

| Stanje | Ponašanje |
|---|---|
| 0 prijatelja | kartice nema (ostaje D1) |
| 1–2 prijatelja | kartica: „Dodaj još prijatelja da tabela bude zanimljivija." |
| Niko nije igrao ove sedmice | „Ove sedmice još niko nije igrao. Pozovi nekoga." |
| Gost (F1) | u tekst F1 dodati: „…i vidi ko vodi ove sedmice." |
| Učitavanje, greška | kao F8 i F9 |

„Pozovi" u tabeli je razlog za poziv: partija s prijateljem nosi bodove obojici.

### 5.7 Tabele po veličini populacije

| Aktivnih sedmično | Šta se vidi | Zašto |
|---|---|---|
| ~50 | lična ljestvica + tabela prijatelja | Tabela od 40 stranaca je prazna. Uz to: kad bi svi pravi igrači bili u jednoj tabeli, igrač bi primijetio da protivnika iz brze igre nikad nema u njoj. |
| ~500 | + **sedmična grupa od 20 naloga iz iste lige**; prvih 5 dobija +15 bodova na kraju sedmice | Grupa je mali isječak, pa je normalno da protivnika nema u njoj. |
| ~5000 | + mjesečna lista 100 najboljih u ligi As | Tek tada vrh ima publiku. |

Pravilo za sve veličine: **u tabeli su samo nalozi sa nadimkom.** Gost vidi sebe kao „Ti" u svojoj grupi, drugi ga ne vide. Prag `groups.minPlayers` u konfigu pali grupe sam.

### 5.8 Push v2 (PRD §51.5)

Liga daje podsjetnicima istinit razlog. Svi tekstovi se šalju samo ako su tačni u trenutku slanja.

| Kad | Naslov / tekst | Uslov |
|---|---|---|
| D1 | **Blizu si** / „Do lige Dama ti fali 12 bodova. Jedna pobjeda je dovoljna." | fali najviše 15 bodova |
| D1 (inače) | **Prva pobjeda danas vrijedi više** / „Danas te čeka +5 bodova za prvu pobjedu." | ima bar jednu završenu partiju |
| D3 | **Sedmični cilj** / „Još jedna partija do sedmičnog cilja." | fali 1 partija, sedmica još traje |
| D7 | **Tabela prijatelja** / „{nadimak} sada vodi u tabeli prijatelja." | prijatelj ga je pretekao ove sedmice |
| 1. u mjesecu | **Nova sezona** / „Sezona decembar je počela. Krećeš iz lige Žandar." | igrao prošle sezone |

Ritam, prozor 18–21 h, najviše 1 dnevno i **holdout 10 %** ostaju kao u §51.5. Kanal `podsjetnici` i preklopka traže novi AAB.

### 5.9 Nazivi liga

| Set | Lige | Za | Protiv |
|---|---|---|---|
| **A · Karte (preporuka)** | Sedmica · Desetka · Žandar · Dama · Kralj · As | redoslijed zna svako ko je držao karte; ikona je prava karta iz `public/cards/`; važi za sve tri igre | manje „kafanski" |
| B · Majstorska | Kibicer · Šegrt · Kalfa · Majstor · Stari majstor · Kafanski as | toplo i domaće; šegrt–kalfa–majstor je poznat red | traži šest novih crteža; „Kibicer" može zvučati podsmješljivo |
| C · Stolovi u kafani | Sto do vrata · Sto kod prozora · Sto kod šanka · Stalni sto · Majstorski sto · Glavni sto | najviše atmosfere | duga imena ne staju u značku od 26 px; redoslijed nije očigledan |

Set A prolazi test „3 sekunde bez objašnjenja" jedini bez ijedne riječi uputstva.

### 5.10 Šta je namjerno sakriveno

- **Skriveni rejting i svaka brojka iz njega.** Šuman je; igrač bi gledao kako pada poslije partije koju je izgubio na sreću.
- **Jačina stola, tier, DDA.** Otkrivaju bota.
- **Tuđi bodovi poslije partije.** Bot ih nema.
- **Procenat pobjeda kao broj.** Pišemo „34 pobjede · 61 partija"; procenat blizu 50 % obeshrabruje, a kod DDA-a tako mora biti.
- **Granica prijateljskih partija** se vidi tek kad se dostigne.

---

## 6. Podaci i server

### 6.1 Firestore

`profiles/{uid}` dobija opciono polje `rank`. Dokument bez njega se čita kao podrazumijevano stanje (stari profili, stari server).

```ts
rank?: {
  v: 1;
  season: string;          // "2026-12"; drugačija od tekuće → lijeni presjek pri čitanju
  points: number;
  league: LeagueId;        // najviša dostignuta u ovoj sezoni (pod)
  bestLeague: LeagueId;    // ikad
  seasons?: Record<string, LeagueId>;   // završene sezone, najviše 24
  wins: number; losses: number; abandons: number;
  week: string;            // "2026-W47"
  weekPoints: number; weekMatches: number; weekGoalDone: boolean;
  lastWinDay?: string;     // "2026-11-14"
  lastMatchAt?: number;
  ratings?: Partial<Record<GameId, { r: number; n: number; lastAt: number }>>;
}
```

`results/{matchId__uid}` (postojeći) dobija opciona polja: `game`, `mode`, `outcome` (`win` | `loss` | `abandon` | `friendly` | `void`), `place?`, `target?`, `delta`, `bonuses?`. Stari dokumenti ostaju važeći.

Dnevna granica istog sastava (§3.8): `rankGroups/{dan__hashSastava}` sa brojačem, briše se poslije 2 dana.

Nove kolekcije za grupe (`leagueGroups`) dolaze tek u fazi F5.

### 6.2 Upis i idempotentnost

1. `emitMatchEnded` (jedino mjesto) zove čistu funkciju `matchOutcomes(room, reason)` → po `uid`-u: ishod, plasman, format.
2. Za svakog čovjeka sa `uid`-om: čitanje profila → čista `applyResult(rank, outcome, config, now)` → **jedan commit**: `results/{matchId__uid}` sa `exists: false` + profil sa preduslovom `updateTime`. Sukob na rezultatu znači „već upisano" (kao danas). Sukob na profilu: do 3 ponavljanja.
3. `completedMatches` ostaje kako jeste (samo završene partije). Ishod „prekid" piše rezultat, ali ne diže taj brojač.
4. Upis se nikad ne čeka i nikad ne baca (isto pravilo kao `recordCompletedMatch`): Firestore u kvaru ne smije zadržati kraj partije.
5. Poslije uspješnog upisa server šalje **samo tom igraču** događaj `rank:update` (`matchId`, stanje prije i poslije, razlaganje bodova). Stari klijent nepoznat događaj ignoriše.
6. Bez servisnog ključa (lokalni dev) radi memorijska izvedba, kao danas.

Restart usred partije: soba se hidrira, kraj se desi kasnije i upiše se jednom. Soba koju sweeper zatekne otvorenu daje „prekid" igračima koji su otišli; ako je soba izgubljena, nema upisa i nema promjene.

### 6.3 Back-compat

- Sva nova polja u snapshotu sobe su opciona: `Player.autoPlayedMoves?`, `Player.moves?`. Hidracija starog snapshota = 0 / nedostaje → pravilo za AFK se preskače.
- `/api/me` i `/api/profiles/:id` dobijaju opciono `rank`. APK 1.0.0–1.4.x ih ne čita i radi kao prije.
- Tijela zahtjeva se ne mijenjaju; nema nove obavezne vrijednosti od klijenta.
- Promjena `RankConfig` ne smije preračunavati istoriju: važi od sljedeće partije.

### 6.4 `PublicPlayer` i odgovori

| Ide | Gdje | Uslov |
|---|---|---|
| `league?: LeagueId \| null` | `PublicPlayer` (lobi), `/api/profiles/:id` | **samo nalog**, kroz isti `account` uslov kao `avatar`; gost i bot `null` |
| `bestLeague` | `/api/profiles/:id` | samo nalog |
| `rank` (cijeli, bez `ratings`) | `/api/me`, `rank:update` | samo vlasnik |
| sedmični bodovi prijatelja | `/api/friends` | samo prijatelji, samo nalozi |

**Nikad ne ide klijentu:** `ratings`, sidra, tier, stanje DDA-a, tuđi `delta`, `uid`, sastav stola, `isBot`. Oblik i vrijeme `rank:update` su isti bez obzira na to ko je sjedio za stolom. `lib/antiLeak.ts` dobija nove zabranjene ključeve (`rating`, `tier`, `anchor`).

### 6.5 Privatnost

Politika privatnosti i `/delete-account` dobijaju rečenicu o rezultatima i ligi (čuvaju se uz profil, brišu se s nalogom). Liga je u dokumentu profila, pa postojeće brisanje pokriva sve.

---

## 7. Mjerenje i eksperiment

### 7.1 Događaji (`AnalyticsEvents`, `docs/analytics.md`)

| Događaj | Gdje | Parametri |
|---|---|---|
| `match_ended` (dopuna) | server | `league`, `league_delta`, `outcome`, `rank_visible` |
| `league_promoted` | server | `from`, `to`, `matches_total`, `days_since_first` |
| `weekly_goal_completed` | server | `week`, `league` |
| `season_rolled` | server | `season`, `league_end`, `league_start` |
| `league_viewed` | klijent | `surface` (`match_end` · `profile` · `home` · `ladder` · `friends_table`) |
| `account_registered` (dopuna) | klijent | `source: "league"` kad dolazi iz reda „Sačuvaj je" |
| `push_sent` / `push_opened` (dopuna) | server / klijent | `type` = vrsta podsjetnika iz §5.8 |

Osobina osobe: `rank_visible` (true/false), `league`.

### 7.2 Kontrolna grupa

- **50 / 50 po `uid`-u** (`hash(uid) % 100 < visiblePercent`), samo za igrače čija je prva partija poslije objave. Kontrolna grupa skuplja bodove nevidljivo, pa kasnije uključenje ne kreće od nule.
- Kontrolna grupa ne vidi ništa; njihova liga se ne prikazuje ni drugima.
- Push podsjetnici imaju svoj holdout 10 % (§51.5), ukršten sa ovim.

### 7.3 Šta se može pročitati i kada

Poštena računica: da se D7 od 12 % razlikuje od 16 % sa 80 % snage treba oko 1100 igrača po grupi. D1 30 % prema 36 %: oko 950 po grupi. `docs/analytics.md` već kaže da se kohorta ispod 100 novih sedmično ne čita kao broj.

| Novih igrača sedmično | Šta znamo za 4 sedmice |
|---|---|
| < 150 | samo vodeće pokazatelje; D7 ostaje nečitljiv |
| ~300 | D1 sa razumnom sigurnošću za 6 sedmica; D7 samo veliki efekat |
| 1000+ | D1 i D7 za 2–3 sedmice |

**Kriteriji (zapisani prije podataka), vidljiva grupa prema kontrolnoj, igrači sa bar jednom završenom partijom:**

| Pokazatelj | Radi | Ne radi |
|---|---|---|
| Druga sesija u 48 h | +4 p.p. ili više | ispod +1 p.p. |
| Partija po igraču u prvih 7 dana | +15 % ili više | ispod +5 % |
| Povratak sutradan poslije unapređenja prema povratku bez njega | jasno viši | isti |
| Stopa prekida | ne raste | raste za 3 p.p. ili više |
| Registracija iz reda „Sačuvaj je" | bar 3 % gostiju koji ga vide | ispod 1 % |

Ako poslije 4 sedmice vodeći pokazatelji stoje u koloni „Ne radi", ne gradimo F2–F5 nego gasimo prikaz (`visiblePercent: 0`) i ulažemo u prvu sesiju i push.

---

## 8. Faze po izdanjima

### F0 · Bilježenje bez prikaza (samo server, 1 deploy)

Cilj: prava raspodjela ishoda i prekida prije nego što igrač išta vidi.

- **Novo:** `packages/shared-types/src/rank.ts` (`LeagueId`, `RankConfig`, `DEFAULT_RANK_CONFIG`, `StoredRank`) · `packages/game-core/src/rank/` (`elo.ts`, `points.ts`, `season.ts`, `applyResult.ts`, testovi) · `packages/game-core/scripts/simulate-rank.ts` (prenos Python simulacije, `pnpm --filter @zandar/game-core simulate:rank`) · `apps/server/src/rank/outcome.ts` (+ test) · `apps/server/src/rank/record.ts` (+ test).
- **Mijenja:** `apps/server/src/profile/store.ts` (`recordMatchResult`, obje izvedbe) · `apps/server/src/google/firestore.ts` (preduslov `updateTime`, ako ga nema) · `apps/server/src/index.ts` (`emitMatchEnded`; brojač auto-poteza) · `packages/shared-types/src/index.ts` (opciona polja na `Player`).
- **Testovi:** tabela ishoda za 2P/3P/4P/Poker/Raub; prekid u 4P (ko ostaje, ko odlazi); idempotentnost (dupli poziv, restart); stari profil bez `rank`; presjek sezone na granici mjeseca i sedmice u `Europe/Sarajevo`; pod lige; hidracija starog snapshota; bot nikad ne dobija upis.
- **Prihvatanje:** poslije 2 sedmice produkcije iz Firestorea se čita stvarna stopa pobjeda, prekida i partija po igraču; simulacija ponovljena sa tim brojkama; nijedno novo polje ne izlazi u `game:state` ni REST (sonda kao za analitiku).

### F1 · Liga vidljiva na webu (server + web)

- **Novo:** `apps/web/components/league/LeagueStrip.tsx`, `LeagueCard.tsx`, `LeagueLadderSheet.tsx`, `LeagueBadge.tsx` · `apps/web/lib/league.ts` (čist prikaz, testiran) · stilovi na kraju `app/felt.css` i u postojećem sloju profila (`layer(components)`).
- **Mijenja:** `RoundEndOverlay.tsx` (+ Poker i Raub završni ekran) · `AccountProfile.tsx`, `GuestCard.tsx`, `GuestProfile.tsx`, `ProfileSheets.tsx` (B4 tekst) · početna (red marke) · `lib/sr.ts` · `apps/server/src/profile/routes.ts` (`/api/me`) · `index.ts` (`rank:update`, `visiblePercent`) · `shared-types` (`AnalyticsEvents`) · `docs/analytics.md` · politika privatnosti.
- **Testovi:** `lib/league.test.ts` (tekst po stanju, množina „bod / boda / bodova", napredak trake); server test da kontrolna grupa dobija `rank: null`; anti-leak sonda.
- **Prihvatanje:** CDP snimci 360×740, 360×640, 390×844 (kraj meča 2P i 4P, profil, početna sa 1–3 igre, bez skrola na početnoj); E2E u pregledaču: gost odigra partiju → traka → profil pokazuje isto → registracija zadržava ligu; stari APK protiv novog servera radi bez razlike; lint na osnovici; rodno neutralan tekst pregledan.

### F2 · Prijatelji i tuđi profil (server + web)

- **Mijenja:** `friendRoutes.ts` (sedmični bodovi), `publicPlayer.ts` (`league` samo za nalog), `OtherProfileSheet.tsx`, `FriendsList.tsx`, novi `FriendsTableSheet.tsx`, lobi.
- **Testovi:** `publicPlayer.test` (gost i bot daju identičan oblik); tabela sa 0, 1 i 5 prijatelja; reset u ponedjeljak.
- **Prihvatanje:** sonda potvrđuje da se objekat bota i objekat gosta ne razlikuju ni u jednom ključu.

### F3 · Aplikacija (AAB 1.5.0, `versionCode 9`, ili 8 ako 1.4.1 još nije poslat)

- Isti web kod u paketu; provjera na S10e (immersive, rupa kamere 39 px, Android nazad zatvara list „Lige").
- **Push v2 sa tekstovima iz §5.8:** `apps/server/src/push/reminders.ts` (+ test, čiste odluke), `messages.ts`, `NativePush.tsx` (kanal `podsjetnici`), preklopka u Postavkama, holdout 10 %.
- **Prihvatanje:** na uređaju sva stanja trake; podsjetnik stiže samo kad mu je uslov tačan; gašenje preklopke ga zaustavlja; Play Data safety bez novih tipova podataka (provjeriti).

### F4 · DDA i onboarding (samo server)

- `apps/server/src/bots/selectTable.ts` (čisto: rejting + konfig → tierovi i partner), zamjena za `fillSeatsWithBots(room, 2)`.
- **Testovi:** stari snapshot sa botom bez novih polja; raspodjela tierova po fazi onboardinga; sažaljenje poslije 3 poraza.
- **Prihvatanje:** stopa pobjeda novih igrača u prve 3 partije raste prema kontrolnoj grupi; stopa prekida ne raste. Može ići i prije F1; nezavisna je.

### F5 · Kad populacija poraste

Sedmične grupe (od `groups.minPlayers`), lista lige As, kozmetičke nagrade sezone (§10, pitanje 5).

---

## 9. Rizici

| Rizik | Koliko je realan | Odgovor |
|---|---|---|
| **Odavanje bota** kroz ligu | nizak po konstrukciji | Bodovi ne zavise od protivnika; sve novo se vidi samo kod naloga; tuđi bodovi se ne prikazuju; granica prijateljskih partija samo u privatnim sobama; sonda u testovima poredi oblik bota i gosta. |
| Odavanje bota kroz **tabelu** | visok ako bi se uvela tabela svih igrača na 50 ljudi | Tabele stranaca ne postoje ispod praga; u tabelama su samo nalozi. |
| **„Namješteno je"** (DDA) | srednji | Poluga DDA-a je izmjereno mala; bira samo protivnike; miješanje ostaje kriptografsko; ToS već govori o AI igračima. Ne prikazivati procenat pobjeda. |
| **Liga ne znači ništa** („svi su Dama") | srednji | Gornje lige oduzimaju za poraz; mjesečni presjek vrha; As ostaje rijedak (0–4 od 10 kitova u simulaciji). U tekstu nikad ne tvrdimo da liga mjeri vještinu. |
| **Traka trčanja** (redovan igrač svaki mjesec vraća istu ligu) | srednji | Tri crte u traci, sedmični cilj, tabela prijatelja. Ako se u podacima vidi zamor, presjek pomjeriti na ligu Kralj (konfig). |
| **Prazna tabela prijatelja** | visok (malo ko ima prijatelje) | Kartica se ne crta bez prijatelja; liga radi i sama. |
| **Varanje u privatnim sobama** | nizak, mala dobit | Dnevna granica istog sastava; pobjeda samo za odigran meč. |
| **Kazna za pad veze** | srednji | U donje tri lige prekid ne oduzima ništa; povratak u roku čuva partiju. Pratiti stopu prekida po ligi. |
| **Firestore preko Atlantika** (server `iad`, baza `eur3`) | poznato | Upis se ne čeka; traka ima skelet i rezervni tekst. |
| **Efekat se ne može izmjeriti** | visok sa sadašnjim prilivom | Vodeći pokazatelji i unaprijed zapisani pragovi (§7.3); F0 i F1 su mali. |
| Liga postaje **pritisak** umjesto zabave | nizak do srednji | Nema serija koje pucaju, nema gubitka lige u sezoni, donje lige nikad ne oduzimaju. |

---

## 10. Otvorena pitanja (sa preporukom)

1. **Jedna liga za sve igre ili po igri?** Preporuka: **jedna.** Sa tri ljestvice igrač od 3 partije sedmično ne napreduje nigdje. Skriveni rejting je ionako po igri.
2. **Nazivi liga.** Preporuka: **set A (karte)**; ne traži crtanje i čita se bez objašnjenja.
3. **Sezona: mjesec ili duže?** Preporuka: **kalendarski mjesec.** Prag lige Dama je naštiman na mjesečni obim redovnog igrača.
4. **Da li poraz ikad oduzima bodove?** Preporuka: **da, od lige Dama.** Bez toga je As samo brojač partija. Ako ti je to previše strogo za početak, prva sezona može ići sa blažim vrijednostima (−2 / −4 / −6); to je promjena konfiga.
5. **Kozmetička nagrada za sezonu?** Preporuka: **u MVP-u samo trajna oznaka na profilu** („Sezona novembar: Dama"). Nova podloga stola za ligu Dama je dobra druga faza, ali postojeće tri podloge ne zaključavati.
6. **Privatne sobe nose bodove?** Preporuka: **da, uz granicu 3 pobjede dnevno po sastavu.** Igra s prijateljima je ono što najviše želimo.
7. **Prekid zbog pada veze = poraz?** Preporuka: **da**, jer se namjeran izlazak ne može pouzdano razlikovati, a donje lige ionako ne oduzimaju.
8. **Kontrolna grupa 50 %?** Preporuka: **da, 4–6 sedmica.** Bez nje nećemo znati ništa. Ako ti smeta da pola novih igrača ne vidi ligu, 80/20 je moguće, ali tada ni vodeći pokazatelji neće biti čitljivi.
9. **Značka lige na početnoj (red marke)?** Preporuka: **da**, uz CDP mjerenje. Ne košta visinu.
10. **DDA (F4) prije ili poslije lige?** Preporuka: **odmah poslije F0**, nezavisno od prikaza. Danas svi igraju protiv T2 i prosječan igrač vjerovatno dobija ispod 50 %; to je možda veći problem zadržavanja od nedostatka lige. F0 će pokazati stvarnu brojku.
11. **Slabiji „tier 0" za prve partije?** Preporuka: **odlučiti poslije F0.** Ako novi igrači dobijaju ispod 45 % u prve 3 partije, treba ga dodati u konfig botova.
12. **Koliko novih igrača sedmično stvarno imamo?** Od toga zavisi šta eksperiment može reći (§7.3). Molim brojku iz PostHoga prije F1.
