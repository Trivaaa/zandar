# Kartaonica — plan: PMF → GTM → business case

> **Verzija 1.0, 22.11.2026.** Pragovi su odluka vlasnika od 21.11.2026, donesena poslije poređenja sa industrijom. Ovaj dokument je izvor istine za ciljeve i za čitanje metrika. `docs/analytics.md` opisuje događaje i upite, a `docs/KONKURENCIJA_MONETIZACIJA.md` podlogu za monetizaciju.
> Mijenja stare orijentire u `analytics.md` (D1 30–35 / D7 12–15) i kriterij u PRD §46.3 (`human_only D7 ≥ 20 %`).

---

## 1. Ciljevi i redoslijed

| # | Cilj | Pitanje | Čime se mjeri |
|---|---|---|---|
| 1 | **Prove PMF** | Da li se ljudi koji zaigraju vraćaju? | Aktivacija i povratak (retention) |
| 2 | **Prove GTM** | Može li se do takvih igrača doći po cijeni koja ima smisla, i to više puta? | Cijena po aktiviranom igraču, rast |
| 3 | **Prove business case** | Da li igrač donese više nego što košta? | Prihod po igraču naspram cijene sticanja |

**Redoslijed je obavezan.** Nema skaliranja kampanja prije PMF-a (plaćamo za curenje). Nema monetizacije u igri prije PMF-a (reklama kvari baš povratak koji mjerimo).

---

## 2. Prove PMF

### 2.1 Pragovi

| Metrika | Prag | Napomena |
|---|---|---|
| **D1** | **≥ 35 %** | Industrija: medijan ~22 %, top 10 % ~40 % |
| **D7** | **≥ 15 %** | Medijan ~4 %, top 10 % 11–12 %. Kartaške igre i igre na tabli drže najbolje od svih žanrova (GameAnalytics 2025) |
| **D30** | **≥ 6 %** | Medijan < 1 % |
| Oblik krive | D30/D7 ≥ 0,5 | Kriva se mora izravnati, a ne padati ka nuli |
| DAU/MAU | ≥ 20 % | Mjeri se van perioda kampanje, jer nalet napumpa MAU |
| Sean Ellis | ≥ 40 % „jako razočaran" | Pitaju se samo igrači sa 10+ mečeva |

#### Podloga za pragove (istraživanje 23.11.2026)

Brojke posebno za kartaške igre niko ne objavljuje. GameAnalytics samo rangira kartaške, društvene i kazino igre kao najbolje po srednjem i dugom povratku, bez procenata. Za konkurente (Bela Online, Belot.BG, Tablić) javnih podataka nema; imaju ih samo plaćeni Sensor Tower i AppMagic. Sve brojke ispod su klasičan povratak (tačno N-ti dan), računat **od instalacije**.

| Izvor (godina podataka) | D1 | D7 | D30 |
|---|---|---|---|
| GameAnalytics, medijan (2025, ~16.000 igara) | ~22 % | ~4 % | 0,7–0,8 % |
| GameAnalytics, Evropa medijan | 22,2 % | 4,1 % | 0,9 % |
| GameAnalytics, gornjih 25 % | ~30 % | 6–7 % | 1,6–1,8 % |
| GameAnalytics, gornjih 10 % | ~40 % | 11–12 % | 2,5–5 % po regiji |
| GameAnalytics, gornji 1 % | 64–68 % | 25 %+ | 13–15 % |
| GameAnalytics, gornjih 25 % po platformi (2024) | Android 25–27 %, iOS 31–33 % | — | — |
| Sensor Tower, top 25 casual (2025) | 31 % | 15,2 % | 7,5 % |
| Sensor Tower, top 25 midcore (2025) | 42 % | 21 % | 11,5 % |
| AppsFlyer, društvene igre, SAD (2023–24) | — | — | iOS 8,1 %, Android 5,1 % |
| Adjust, sve igre (2025) | 27 % | 13 % | 5 % |
| Igre u pregledaču (anegdota, bez skupa podataka) | 10–20 % | — | — |

Procjene za kartaške igre koje kruže po blogovima (D1 28–35 / D7 8–12 / D30 4–8 %) su procjena jednog studija, ne mjerenje.

**Gdje su naši pragovi:** D1 35 % je između gornjih 25 % i 10 %; D7 15 % je iznad gornjih 10 %, nivo top 25 casual igara; D30 6 % je oko gornjih 10 % i malo iznad društvenih igara na Androidu; D30/D7 0,5 odgovara top casual (0,49) i midcore (0,55) igrama. Pragovi su, dakle, nivo **gornjih 10 % igara**.

**⚠ Baza nije ista.** Industrija računa od instalacije, a naša PMF presuda od onih koji su zaigrali, što je lakše. Za poređenje sa industrijom uz svako očitanje se navodi i povratak od `first_open`, **po danima**. PostHog Retention po sedmicama nije uporediv: kohorte su kalendarske sedmice, pa Week 1 hvata povratak od 1. do 13. dana. Izmjereno 23.11. (tačan dan, od prvog `first_open` od 1.11., vlasnik izdvojen):

| | D1 (kohorte 1.–21.11.) | D7 (kohorte 1.–16.11.) | D1 kohorte 22.11. |
|---|---|---|---|
| Android | 29 % (20/68) — iznad gornjih 25 % za Android | 16 % (5/31) — nivo gornjih 10 % | 46 % (12/26) |
| Web, regija i dijaspora | 2,1 % (20/945) | 0,6 % (4/649) | 14 % (26/181) |

Android je potcijenjen: igrači iz rupe 1.4.5 nemaju `first_open`. Na webu je zaigralo samo 11 % otvaranja (107/945) od 1.–21.11., pa povratak od otvaranja ovdje mjeri kvalitet saobraćaja, ne igru. Web nema uporediv benchmark; poredi se sam sa sobom kroz kohorte. Otvaranja van regije i dijaspore (42, Metini pregledi) se izbacuju.

Izvori: [GameAnalytics 2025](https://www.gameanalytics.com/reports/2025-mobile-gaming-benchmarks), [GameAnalytics 2026](https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks), [GameDev Reports](https://gamedevreports.substack.com/p/gameanalytics-mobile-and-pc-game), [Innovecs](https://www.innovecsgames.com/blog/mobile-game-retention-benchmarks/) (prenosi Sensor Tower, AppsFlyer/Mistplay, Adjust), [Playio](https://blog.playio.co/d1-d7-d30-retention-benchmarks-2026), [Elite Game Developers](https://elitegamedevelopers.substack.com/p/entering-the-golden-age-of-mobile). Sekundarni izvori nisu provjereni prema originalima.

**Aktivacija nema unaprijed zadan prag.** Izvodi se iz podataka: koji broj završenih mečeva prvog dana (ili 2 aktivna dana) najbolje predviđa D7. Taj događaj tada postaje definicija aktiviranog igrača i ulazi u GTM (cijena po aktiviranom). Do tada se kao privremena aktivacija koristi „bar jedan `match_started`".

Prateće metrike (bez praga, prate se): mečevi po aktivnom danu, udio završenih mečeva (≥ 70 %), udio mečeva sa 2+ prava čovjeka i da li takvi igrači drže bolje (hipoteza B).

### 2.2 Kako se računa i čita

- **Povratak se računa klasično:** igrač se broji samo ako je odigrao (`match_started`) **tačno** N-ti dan poslije prvog dana, ne „N-ti dan ili kasnije". Dan je po `Europe/Sarajevo`.
- **Početak kohorte** je `first_open`. Povratak se računa i na bazi svih koji su otvorili (to je mjera za GTM) i na bazi onih koji su zaigrali (to je mjera za PMF). Za PMF presudu važi druga.
- **Uvijek odvojeno** po prvoj igri (Raub / Žandar / Poker / Bela), platformi (web / Android) i izvoru (plaćeno po kampanji / organsko / pozivnica).
- **Presuda tek sa n ≥ 100** stvarnih igrača u grupi. Uz svaki procenat ide n. Sa 30–40 igrača interval je ±15 p.p., pa se takav broj čita kao trend, ne kao rezultat.
- **PMF je potvrđen** kad bar jedna igra na jednoj platformi pređe D1, D7 i D30 na n ≥ 100, i to na **dvije uzastopne kohorte** (da nije slučaj), uz Sean Ellis ≥ 40 %.

### 2.3 Šta se isključuje (čistoća podataka)

- Metin automatski pregled oglasa: `first_open` iz US/IE/SE u naletima bez igranja.
- Play pre-launch roboti (npr. 9.10.2026 oko 09:07–09:13, PH/BR/IN/VN).
- Lokalni razvoj: `$host = localhost` bez `platform`. **Kohorta `$internal_or_test_user` (137009) NIJE filter za testere:** dobija je svaki Android igrač.
- Vlasnikovi uređaji i testni nalozi, kad budu izdvojeni.
- Serverski događaji nemaju zemlju, pa se geografski filter primjenjuje samo na `first_open`.

### 2.4 Poznate rupe u podacima

| Period | Rupa | Posljedica |
|---|---|---|
| do 1.11.2026 | `match_ended` nedostaje na ~31 % mečeva | Meč bez kraja se računa kao nezavršen |
| ~18.11 noć – 20/21.11.2026 | APK 1.4.5 ne šalje klijentske događaje | Android `first_open` i pripisivanje nedostaju (19.–20.11: 11 igrača bez `first_open`). Aktivacija i D1 kampanje 2 su **donja granica** |
| do 22.11.2026 | Izlazak iz pokera, Rauba i Bele brojao se kao `completed` | Završetak pokera prije 22.11 nije pouzdan (changelog 214) |
| uvijek | Isti čovjek na webu i u aplikaciji ima dva ID-a | „Nije se vratio" na webu može značiti „prešao u aplikaciju" |

---

## 3. Prove GTM

| Metrika | Definicija | Prag |
|---|---|---|
| **Cijena po aktiviranom igraču** | Potrošnja kampanje ÷ broj aktiviranih (§2.1) iz te kampanje | Određuje se u fazi 4, iz očekivanog prihoda po igraču (LTV) |
| Cijena po otvaranju / instalaciji | Potrošnja ÷ `first_open` | Samo dijagnostika, nikad cilj |
| Aktivacija po kampanji | Aktivirani ÷ `first_open` iste kampanje | Orijentir 50–60 % |
| Rast | Novi aktivirani sedmično: plaćeni, organski i preko pozivnica, odvojeno | Organski i pozivnice moraju rasti i kad je kampanja ugašena |
| Viralnost | Udio igrača koji šalju pozivnice, otvaranja po pozivnici, D7 igrača iz pozivnice naspram ostalih | — |

Kampanja se čita iz `utm_campaign`/`utm_content` na `first_open`, nikad iz osobina osobe (`$initial_utm_*` je prazan). Za Android se pripisivanje čita iz `app_install_attributed`.

---

## 4. Prove business case

Ide tek poslije PMF presude. Model je u `docs/KONKURENCIJA_MONETIZACIJA.md` (nacrt): prvo lažna vrata za plaćanje, pa reklame sa nagradom samo za kozmetiku i rijetka reklama između partija, zatim „Bez reklama" i kozmetika, a VIP tek uz veliku bazu. HARD RULE 8 važi uvijek.

| Metrika | Definicija |
|---|---|
| ARPDAU | Prihod ÷ DAU, po platformi |
| LTV (180 dana) | ARPDAU × očekivani broj aktivnih dana iz krive povratka |
| **Business case** | **LTV > cijena po aktiviranom igraču** (§3), sa rezervom za Play proviziju i porez |
| Zaštita | D7 grupe sa reklamama naspram kontrolne grupe: pad ne smije biti veći od 2 p.p. |

---

## 5. Kako — faze

Svaka faza ima ulazni uslov, rad i izlaz. Iznose budžeta određuje vlasnik; ovdje stoji samo koliko podataka treba.

### Faza 0 — čisti podaci (sada)
- [x] 1.4.6 šalje klijentske događaje (od 20.11.2026).
- [x] `/?igra=<slug>` stavlja igru na vrh web početne (Push v2, produkcija 22.11.2026).
- [ ] Svaka kampanja po igri vodi na `https://kartaonica.com/?igra=<slug>`.
- [ ] Izdvojiti vlasnikove uređaje i testne naloge (spisak ID-eva u `analytics.md`).
- [ ] Sačuvan upit „kohorta po kampanji": aktivacija, D1, D7 i izbor igre.

### Faza 1 — koja igra nosi (ulaz: Faza 0)
- Odvojena kampanja po igri (Raub, Žandar, Poker, Bela), isti format oglasa, link sa `?igra=`.
- Svaka igra se vrti dok **n ≥ 100 igrača** nije zaigralo tu igru kao prvu i dok nije prošlo 7 dana od najmlađeg.
- **Izlaz:** D1 i D7 po igri, aktivacija i cijena po zaigranom igraču po igri. Igra koja jedina ili najbliže prelazi pragove postaje **glavna igra** kampanja i početne.
- Stanje 22.11.2026 (n < 100, orijentir): D1 među igračima Raub 38 % (17/45), Žandar 21 % (12/57), Poker 16 % (8/50).

### Faza 2 — povratak na glavnoj igri (ulaz: izabrana glavna igra)
- Iz podataka izvesti prag aktivacije (§2.1).
- Smanjiti napuštene mečeve (22.11.2026: Raub 41 %, Žandar 38 %). Razložiti ih na izlazak, vezu i tajmer.
- Push v2 podsjetnici (`PUSH_REMINDERS=1`) sa kontrolnom grupom, presuda o D7 sa n ≥ 100 po grupi (SPEC_PUSH_V2).
- Prvi dan igrača: tempo botova i težina za nove igrače (DDA i kriva pobjeda su u PRD-u, nisu urađene).
- **Izlaz:** D1 ≥ 35 % i D7 ≥ 15 % na glavnoj igri, n ≥ 100.

### Faza 3 — PMF presuda (ulaz: Faza 2 ispunjena)
- Druga uzastopna kohorta potvrdi D1 i D7. D30 ≥ 6 % i D30/D7 ≥ 0,5.
- Sean Ellis anketa igračima sa 10+ mečeva (PostHog survey), uz 5–10 razgovora.
- **Ako PMF nije potvrđen** posle dvije iteracije faze 2: preispitati glavnu igru (vratiti se na fazu 1 sa drugom igrom) ili proizvod (npr. živi stolovi sa ljudima umjesto botova). Ne skalirati.

### Faza 4 — GTM (ulaz: PMF potvrđen)
- Kanali: Meta po igri, Play (ASO, listing po igri), pozivnice (lijevak pozivnice), e-mail baza (prijave za buduće igre).
- Postepeno povećavati budžet i pratiti da cijena po aktiviranom ne raste brže od budžeta.
- **Izlaz:** stabilna cijena po aktiviranom igraču na rastućem budžetu, organski i pozivnice ≥ 30 % novih aktiviranih.

### Faza 5 — business case (ulaz: Faza 4 daje cijenu po aktiviranom)
- Monetizacija po fazama iz `KONKURENCIJA_MONETIZACIJA.md` §7, svaka uz kontrolnu grupu.
- **Izlaz:** LTV > cijena po aktiviranom igraču.

---

## 6. Očitanja (dnevnik)

Svako čitanje se dodaje kao novi red ili blok, a stara se ne brišu. Baza za povratak su igrači sa bar jednim `match_started`, povratak se broji tačno N-ti dan, uz n. Vizualizacija plana sa zadnjim očitanjem: https://claude.ai/artifact/Thf4yQbSPrcohoeZe8bNtK (privatna). Izvor je `docs/vizualizacije/pmf-plan.html`. Osvježavanje: izmijeniti brojke i datum „osvježeno" u tom fajlu, pa ga objaviti Artifact alatom na isti URL (`url` = link iznad), uz prethodno čitanje artefakta. Bez `url` nastaje novi link.

### 22.11.2026. u 15:46 — faza 0 → 1

| Metrika | Vrijednost | n | Prag | Status |
|---|---|---|---|---|
| D1, prva igra Raub | 38 % | 17/45 | 35 % | iznad, n < 100 |
| D1, prva igra Žandar | 21 % | 12/57 | 35 % | ispod |
| D1, prva igra Poker | 16 % | 8/50 | 35 % | ispod |
| D1, Android (organsko) | 43 % | 18/42 | 35 % | iznad, n < 100 |
| D1, kampanja 2 (web) | 16 % | 13/79 | 35 % | ispod, donja granica (rupa 1.4.5) |
| D7 tačno 7. dan | 0 % | 0/14 Android, 0/9 web | 15 % | nečitljivo |
| Aktivacija, Android | 69 % | 45/65 | 50–60 % | iznad |
| Aktivacija, organski web | 49 % | 31/63 | 50–60 % | blizu |
| Aktivacija, kampanja 2 | ≥ 18 % | 80/446 | 50–60 % | ispod, donja granica |
| Aktivacija, Raub oglas (IG, 22.11. od 14:31, 5 €) | 41 % | 9/22 | 50–60 % | prvi sat; prva igra Raub 4, Bela 3, Poker 2 |
| DAU/MAU | 19 % | DAU 39 (15.–21.11.) / MAU 204 | 20 % | na pragu, napumpano kampanjom |
| Završeni mečevi, Raub | 58 % | 245/421 (od 8.11.) | 70 % | ispod |
| Završeni mečevi, Žandar | 61 % | 164/268 (od 8.11.) | 70 % | ispod |

Zaključak: Raub je jedini kandidat za glavnu igru, ali bez n ≥ 100. Sljedeće čitanje 29.11.2026 (prve D7 kohorte kampanje 2). Raub oglas treba da vodi na `/?igra=raub`.

### 22.11.2026. — start faze 1 (period mjerenja)

**Zamrzavanje (od 22.11. do presude, ~10–14 dana):** na produkciji se ne mijenja ništa što vidi nov igrač: početna, prvi sto, botovi, dužina partije, pravila Rauba i Bele. Dozvoljeno: popravke pravih grešaka (uz datum u ovom dnevniku, da se zna od kad kohorta važi), popravke mjerenja, rad na granama i stagingu, izmjene koje nov igrač ne vidi.

**Kampanje:**

| Oglas | Link | Cilj | Mjeri se |
|---|---|---|---|
| Raub („Konačno, Raub online!", kampanja `52534136443729`, start 22.11. u 14:31) | danas `kartaonica.com/`, sljedeći oglas `?igra=raub` | ~250 aktiviranih | aktivacija, D1, D7 |
| Bela za ekipu (DE/AT/CH/SE) | `?igra=bela` | ~250 aktiviranih | D1, D7, pozivnice po aktiviranom igraču |

**Veličina uzorka:** cilj je 150–200 igrača po igri koja je kandidat (D1 ±7 p.p., D7 ±5 p.p., razlika među igrama od 15 p.p. vidljiva). Stanje 22.11.: Raub ~65, Bela ~20.

**Prva 4 sata Raub oglasa:** 72 otvaranja na webu, 39 je zaigralo (54 %), 5 Android instalacija pripisano oglasu. Prva igra: Raub 17, Bela 12, Poker 6, Žandar 4. 0 pozivnica. Raub napušten 13 od 22 započeta meča, uzrok se čita iz `left` od 23.11.

**Cijena po igraču (22.11. u 18:57, Meta „Today"):** Raub oglas 2,29 €, 1.975 prikaza, 87 posjeta stranici (0,03 €) → 95 otvaranja, 8 instalacija, **62 zaigralo (≈ 0,04 € po igraču)**, 28 završilo bar jedan meč (≈ 0,08 €). Poređenje: „Ajmo jednu?" (kampanja 2) 24,98 € / ≥ 80 igrača = ≤ 0,31 €; „Ko dijeli?" (kampanja 1) 24,92 € / 6 igrača = 4,15 €. Cijena klika je ista (0,03–0,05 €) u sve tri; razliku pravi poruka.

### 23.11.2026. u 7:42 — Raub oglas, prvih 17 sati (Meta + PostHog)

Kampanja `52534136443729` (`utm_content=52534136459329`), od 22.11. u 14:31. Meta Lifetime: **4,59 €**, 4.377 prikaza, 3.599 ljudi (frekvencija 1,2), 272 klika na link (CTR 6,2 %), 227 učitanih stranica (0,02 €). Ciljanje: BiH, HR, RS, muškarci 18+, Advantage+ uključen. Web (`first_open` sa `utm_campaign`) i Android (`app_install_attributed`) se broje odvojeno; isti čovjek ima dva ID-a.

| Korak | Broj | Cijena |
|---|---|---|
| Otvorili (web 180 + Android 16) | 196 | 0,023 € |
| **Zaigrali** (web 102 + Android 15) | **117** | **0,039 €** |
| Završili bar jedan meč (49 + 8) | 57 | 0,081 € |
| 3+ meča (26 + 5) | 31 | 0,15 € |
| Android instalacija | 16 | 0,29 € |

Aktivacija na webu: 57 % (102/180), u rasponu 50–60 %. Kampanja 2 je imala ≥ 18 %.

**Po prvoj igri (web, kohorta 22.11.):**

| Prva igra | n | Završili meč | 3+ meča | Završeno od započetih |
|---|---|---|---|---|
| Raub | 46 | 18 (39 %) | 9 | 39/88 (44 %) |
| Bela | 28 | 18 (64 %) | 8 | 49/72 (68 %) |
| Poker | 12 | 8 | 4 | 35/43 (81 %) |
| Žandar | 11 | 3 | 3 | 6/28 (21 %) |

Android, Raub: n = 8, 5 završilo meč, 21/25 mečeva završeno (84 %).

**Publika (Meta):** ~87 % muškarci 35+ (45–54 ~29 %, 55–64 ~23 %, 35–44 ~21 %, 65+ ~13 %). 98 % muškaraca je posljedica ciljanja, a ne nalaz: žene nisu testirane. Prikazi: Facebook ~80 % (Reels i feed). Domet: BiH ~68 %, RS ~20 %, HR ~11 %. Otvaranja po dometu: HR ~8,5 %, BiH ~5,5 %, RS ~4,6 % (mali n).

**Društvo (svi igrači od 22.11. u 14 h):** 2 pozivnice, 0 poziva prijateljima, oko 4 igrača po igri za stolom sa drugim čovjekom.

**D1:** nečitljivo. Do 7:42 se od 97 sa weba koji su zaigrali 22.11. vratilo 7, a sa Androida 2 od 15. To je donja granica, jer se igra uglavnom popodne i uveče. Čitanje 24.11. ujutro.

Zaključak:
- Dolazak radi i jeftin je, a oglas nije zasićen.
- Raub na webu gubi ljude usred partije: prekinuto 49 od 88, a na Androidu 4 od 25. Dio prekida su prelasci u aplikaciju (23 klika na ponudu, 16 instalacija). Uzrok se čita iz `left` i snimaka sesija.
- Bela, koja nije reklamirana, drži bolje od Rauba (n mali). Kandidat za glavnu igru više nije samo Raub.
- Žandar sa weba: 22 od 28 mečeva prekinuto.
- Oglas vodi na `/`, pa je pola igrača otišlo na druge igre. Sljedeći Raub oglas neka vodi na `?igra=raub`.
- Budžet ostaje 5–10 € dnevno, a ciljanje se ne mijenja do presude.

### 23.11.2026. u 9:03 — prvi D7 signal

Baza: igrači sa bar jednim `match_started` od 1.11.; prvi dan i prva igra su dan i igra prvog meča (ne `first_open`, pa brojke nisu sasvim uporedive sa očitanjem od 22.11.). Vlasnikovi uređaji nisu izdvojeni.

| Metrika | Vrijednost | n | Prag | Status |
|---|---|---|---|---|
| D1, prva igra Raub (kohorte 1.–21.11.) | 39 % | 23/59 | 35 % | iznad, n < 100 |
| D1, Žandar | 23 % | 14/62 | 35 % | ispod |
| D1, Poker | 22 % | 13/59 | 35 % | ispod |
| D1, Android | 44 % | 26/59 | 35 % | iznad, n < 100 |
| D1, web | 20 % | 24/121 | 35 % | ispod |
| D7 tačno 7. dan, svi (kohorte 1.–15.11.) | 14 % | 6/44 | 15 % | blizu, nečitljivo |
| D7, Raub | 42 % | 5/12 | 15 % | trend, n premalo |
| D7, web / Android | 16 % / 11 % | 4/25, 2/19 | 15 % | nečitljivo |
| D1 kohorte 22.11. (Raub oglas) do 9:03 | Raub 6/63, Bela 3/37 | — | — | donja granica, čitanje 24.11. |
| DAU/MAU | 18 % | DAU 59 (16.–22.11.) / MAU 332 | 20 % | napumpano kampanjom |
| Završeni mečevi od 8.11. | Raub 59 %, Žandar 61 %, Bela 63 %, Poker 92 % | 346/589, 190/310, 85/135, 368/400 | 70 % | ispod; poker prije 22.11. nepouzdan |

Zaključak: prvi D7 signal ide u prilog Raubu, ali na 12 igrača. Odluka ostaje za 29.11.

### 23.11.2026. u 20:17 — D1 kohorte 22.11. i uzrok prekida

Baza kao u očitanju od 9:03 (prvi `match_started` od 1.11., povratak tačno N-ti dan); vlasnikov S10e izdvojen. Dan 23.11. još traje, pa je D1 kohorte 22.11. donja granica.

| Metrika | Vrijednost | n | Prag | Status |
|---|---|---|---|---|
| D1 kohorte 22.11., svi | 23 % | 30/132 | 35 % | ispod, dan nije gotov |
| D1 22.11., Raub web / Android | 20 % / 58 % | 10/51, 7/12 | 35 % | web ispod |
| D1 22.11., Bela web / Android | 13 % / 2 od 6 | 4/31, 2/6 | 35 % | ispod |
| D1 22.11., web / Android | 18 % / 46 % | 19/108, 11/24 | 35 % | razlika platforme veća od razlike igara |
| D7 tačno 7. dan, Raub (kohorte 1.–16.11.) | 32 % | 7/22 | 15 % | iznad, n premalo |
| D7, Poker | 18 % | 4/22 | 15 % | iznad, n premalo |
| D7, Žandar | 0 % | 0/32 | 15 % | ispod, i na webu i na Androidu |
| Završeni (po čovjeku) od 22.11. 14:31, Raub web / Android | 51 % / 68 % | 96/187, 104/154 | 70 % | ispod |
| Završeni, Bela web / Poker web / Žandar web | 73 % / 70 % / 45 % | 135/185, 73/104, 15/33 | 70 % | Žandar ispod |
| DAU | 160 (22.11.), 145 (23.11. do 20 h) | — | — | prije oglasa ~42 (16.–21.11.); Android 59 = najviše do sada |

**Raub oglas, web (`first_open` sa `utm_content`):** 22.11. 168 otvorilo → 98 zaigralo (58 %) → 50 završilo meč → 21 sa 3+; 23.11. do 20 h 86 → 44 (51 %) → 17 → 4. Prva igra Raub: 47 % prvog dana, 75 % drugog.

**Uzrok prekida Rauba na webu:** od 91 prekida samo 7 nosi `left` (dugme „Napusti", medijan 2 ruke). Ostalih 84 (68 ljudi) je zatvoren tab ili pad veze: medijan 6 ruka, polovina posle 6+ ruka, samo 3 su kliknula ponudu aplikacije, 31 se kasnije vratio. Završen Raub traje medijan 22 ruke / 26,5 min na webu (Android 20 / 23 min). Trajanje prekida nosi i čekanje 30 s + 10 min, pa minute prekida nisu vrijeme igre. Žandar ne šalje `left`.

Zaključak:
- Web je slaba karika, ne samo igra: Raub D1 20 % na webu naspram 58 % na Androidu. Dio „nepovratka" na webu je prelazak u aplikaciju (dva ID-a).
- Raub na webu se ne napušta dugmetom nego tabom, oko četvrtine partije. Kandidat-uzrok: dužina partije (~25 min) za igrača iz oglasa. Ovo se ne mijenja u zamrzavanju; mjeri se dalje.
- Žandar: D7 0/32 i 45 % završenih na webu — kandidat za izlazak iz izbora glavne igre.
- Sljedeće čitanje 24.11. ujutro (konačan D1 kohorte 22.11.), presuda ostaje 29.11.

### 24.11.2026. ujutro — konačan D1 kohorte 22.11.

Baza kao u očitanju od 23.11. (prvi `match_started` od 1.11., povratak tačno N-ti dan, `Europe/Sarajevo`); vlasnikov S10e izdvojen. Igra i platforma su igra i platforma prvog meča.

| Metrika | Vrijednost | n | Prag | Status |
|---|---|---|---|---|
| **D1 kohorte 22.11., svi (konačno)** | 26 % | 34/131 | 35 % | ispod |
| D1 22.11., web / Android | 21 % / 46 % | 23/107, 11/24 | 35 % | Android iznad, web ispod |
| D1 22.11., Raub web / Android | 24 % / 58 % | 12/51, 7/12 | 35 % | web ispod |
| D1 22.11., Bela web / Poker web / Žandar web | 20 % / 27 % / 1 od 11 | 6/30, 4/15 | 35 % | ispod |
| **D1, prva igra Raub na webu, kohorte 1.–22.11.** | **28 %** | **27/97** | 35 % | **ispod, n ≈ 100 — prvo čitanje blizu presude** |
| D1, prva igra Raub na Androidu, kohorte 1.–22.11. | 63 % | 15/24 | 35 % | iznad, n premalo |
| D1 kohorte 1.–21.11. po igri: Raub / Poker / Žandar | 40 % / 23 % / 20 % | 23/58, 13/57, 12/59 | 35 % | samo Raub iznad |
| D7 tačno 7. dan (kohorte 1.–16.11.): Raub / Poker / Žandar | 29 % / 14 % / 0 % | 6/21, 3/21, 0/29 | 15 % | Raub iznad, n premalo |
| D7, Android / web | 19 % / 9 % | 5/27, 4/44 | 15 % | — |
| DAU | 160 (22.11.), **207 (23.11., rekord; Android 80)** | — | — | prije oglasa ~42 (16.–21.11.) |
| DAU/MAU | 18 % | prosjek DAU 83 (17.–23.11.) / MAU 454 | 20 % | napumpano kampanjom |
| Završeni (po čovjeku, od 22.11. 14:31), Raub web / Android | 56 % / 70 % | 145/260, 165/235 | 70 % | web ispod; od 111 prekida na webu samo 11 dugmetom |
| Završeni, Bela web / Poker web / Žandar web | 75 % / 67 % / 49 % | 198/264, 84/125, 21/43 | 70 % | Žandar ispod |

**Raub oglas, web (`first_open` sa `utm_content`):** 22.11. 168 → 98 zaigralo (58 %) → 51 završilo meč → 23 sa 3+; 23.11. 135 → 70 (52 %) → 39 → 14. Aktivacija drži u rasponu 50–60 %, završetak prvog meča ~30 % otvaranja oba dana. Potrošnja posle 23.11. 7:42 nije pročitana (Meta nije povezana).

Zaključak:
- Platforma razdvaja više od igre: ista igra (Raub) ima D1 24 % na webu i 58 % na Androidu. Raub na webu, n = 97, je 28 % — ispod praga, i to se sa kohortom 23.11. (60 igrača) neće popraviti na 35 %.
- Prelazak web → aplikacija (izmjereno istog jutra): od 83 Android instalacije 22.–24.11. njih 46 nosi `utm_content` Raub oglasa (fb 31, ig 15) — a oglas vodi na web, pa su sve prošle kroz ponudu aplikacije; još 2 `home_strip`, 20 organski Play, 15 bez referrera. Web igrači kohorti 22. i 23.11. koji su kliknuli ponudu: 15, od njih 0 vraćenih na webu (prešli su). Većina je kliknula prije prvog meča na webu, pa web D1 ispravljen za prelazak ide najviše na 28 % (23+7)/107, odnosno 23 % bez njih u bazi. Web je i dalje ispod praga; Android D1 46 % je uglavnom ISTA publika iz oglasa, ne organski lojalni igrači.
- Raub ostaje jedini kandidat po D1 i D7; Žandar je ispod na svemu (D7 0/29) — predlog: izbaciti ga iz izbora glavne igre na presudi 29.11.
- Kandidat za presudu 29.11.: „Raub na Androidu" umjesto „Raub" — tada oglas treba voditi na Play, a ne na web.

### 27.11.2026. uveče — Raub na Androidu prelazi D1 na n ≥ 100

Baza kao u očitanju od 24.11. (prvi `match_started` od 1.11., povratak tačno N-ti dan, `Europe/Sarajevo`, `app_env = production`); vlasnikov S10e izdvojen. Igra i platforma su igra i platforma prvog meča. D1 do kohorte 25.11. (zaključno), D7 do kohorte 19.11.

| Metrika | Vrijednost | n | Prag | Status |
|---|---|---|---|---|
| **D1, prva igra Raub na Androidu, kohorte 1.–25.11.** | **71 %** | **91/129** | 35 % | **iznad, n ≥ 100; kohorte 22.–23. 64 % (25/39), 24.–25. 75 % (58/77)** |
| **D1, prva igra Raub na webu, kohorte 1.–25.11.** | **34 %** | **127/376** | 35 % | **tik ispod; kohorte 22.–23. 31 % (34/111), 24.–25. 36 % (78/219)** |
| D1 Bela, Android / web (22.–25.11.) | 57 % / 25 % | 30/53, 31/123 | 35 % | Android iznad, n < 100 |
| D1 Poker, Android / web | 43 % / 18 % | 18/42, 15/84 | 35 % | web ispod |
| D1 Žandar, Android / web | 41 % / 10 % | 18/44, 5/52 | 35 % | web jako ispod |
| D1 po dnevnoj kohorti, web | 21 / 31 / 35 / 31 % | 22., 23., 24., 25.11. (n 108, 93, 122, 191) | 35 % | raste, ispod |
| D1 po dnevnoj kohorti, Android | 46 / 54 / 61 / 71 % | 22., 23., 24., 25.11. (n 24, 48, 44, 94) | 35 % | raste |
| Provjera D1 bez igre preko ponoći (povratak tek poslije 6 h), kohorte 24.–25. | Raub Android 71 % / web 34 % | 55/77, 74/219 | — | povratak je stvaran |
| D7 tačno 7. dan, svi (kohorte 1.–19.11.) | 15 % | 23/158 | 15 % | na pragu |
| D7 Raub / Poker / Žandar | 24 % / 15 % / 5 % | 12/50, 8/53, 3/55 | 15 % | Raub iznad, n < 100 |
| DAU | 282 / 436 / 445 / 478 (24.–27.11.) | — | — | prije oglasa ~42; 27.11. web 296, Android 182 |
| DAU/MAU | 22 % | prosjek DAU 292 (21.–27.11.) / MAU 1.321 | 20 % | napumpano kampanjom, ne broji se |
| Završeni (po čovjeku, od 24.11.), Raub web / Android | 55 % / 68 % | 898/1.621, 1.019/1.503 | 70 % | web ispod |
| Završeni, Bela web / Android | 76 % / 79 % | 857/1.133, 429/544 | 70 % | iznad |
| Završeni, Poker web / Android | 72 % / 78 % | 344/475, 261/336 | 70 % | iznad |
| Završeni, Žandar web / Android | 44 % / 52 % | 68/154, 78/150 | 70 % | ispod |

**Oglasi, web (`first_open` sa `utm_content`, od 22.11.):**

| Oglas | Otvorili | Zaigrali | Prva igra (Raub / Bela / Poker / Žandar) | D1 (kohorte do 25.11.) |
|---|---|---|---|---|
| `52534743438329` (od 24.11.) | 665 | 396 (60 %) | 271 / 102 / 20 / 3 | 33 % (73/224) |
| `52534136459329` (prvi Raub oglas, 22.11.) | 350 | 201 (57 %) | 111 / 57 / 19 / 14 | 26 % (51/197) |
| bez `utm_content` | 167 | 101 (60 %) | 52 / 32 / 14 / 3 | 36 % (20/56) |
| `52535479664929` (od 26.11.) | 116 | 52 (45 %) | 14 / 33 / 5 / 0 | nečitljivo |

Sadržaj oglasa `…743438329` i `…479664929` nije provjeren; po izboru prve igre drugi je vjerovatno Bela. Potrošnja nije pročitana (Meta nije povezana), pa nema cijene po igraču.

**Android instalacije (`app_install_attributed`, 22.–27.11.):** oglas `…743438329` 12 / 47 / 29 / 28 (24.–27.11.); organski Play 7 / 11 / 13 / 25 / 14 / 24 (22.–27.11.) — raste, dio je vjerovatno ljudi koji su vidjeli oglas pa potražili aplikaciju.

**Push v2:** `push_sent` 46, `push_opened` 3, `reminder_would_send` 21 (od 22.11.) — nečitljivo.

Zaključak:
- Raub na Androidu je prva kombinacija igre i platforme koja prelazi D1 na n ≥ 100, na dvije uzastopne kohorte. D7 te publike stiže od 29.11.
- Android kohorta je samoizabrana: dobar dio su igrači iz web oglasa koji su prešli u aplikaciju (dva ID-a). „Raub na Androidu" zato još nije dokazan kao kanal — treba oglas koji vodi pravo na Play.
- Platforma razdvaja više od igre: sve četiri igre na Androidu imaju D1 41–71 %, na webu 10–34 %.
- Raub na webu i dalje gubi 45 % mečeva (uglavnom zatvoren tab, vidi 23.11.). Bela i Poker su iznad 70 % završenih.
- Oglas `…743438329` dovodi bolje igrače od prvog Raub oglasa (aktivacija 60 % naspram 57 %, D1 33 % naspram 26 %).
- Dva nova oglasa (24. i 26.11.) mijenjaju sastav kohorti u zamrzavanju; za presudu se čita po oglasu.
- Sljedeće: 29.11. D7 kohorte 22.11., posebno Raub na Androidu; Raub oglas direktno na Play; snimci prekinutih Raub partija na webu; upisati potrošnju sva tri oglasa; Žandar izbaciti iz izbora glavne igre.

**Dopuna 27.11. — „Vrati se za sto":** `table_resume_click` je na produkciji od 22.11.: 6 → 18 → 25 → 33 → 35 → 33 klikova dnevno, 31 osoba 27.11. Za sljedeće čitanje: koliko tih povrataka završi partiju.

**⚠ Lom serije „završeno" (grana `fix/afk-match-end`, changelog 234):** od deploya te grane `match_ended` računa partiju kao završenu samo ako je igrač sam odigrao bar 50 % poteza (ostalo `abandoned` + `afk`), sto koji 10 min čeka „Sljedeća ruka" protiv botova je `abandoned` + `stalled`, a Žandar sada šalje `left` kao ostale igre. Udio završenih i broj završenih na profilu zato **padaju poslije deploya bez promjene igre** — najviše Žandar na webu. Serije završenih mečeva se ne porede preko tog datuma; za poređenje unazad isključiti `afk`/`stalled` ili čitati odvojeno. Na produkciji najkasnije od **28.11.2026. u 9:11** (tip `b6867b3`); tačan trenutak prvog deploya je u Railway Deployments — za poređenje uzimati od 28.11. D1/D7 se ne mijenjaju (baza je `match_started`).

## 7. Ritam čitanja

| Kad | Šta |
|---|---|
| Dnevno (dok kampanja radi) | Otvaranja, aktivacija i izbor igre po kampanji; DAU |
| Sedmično | Scorecard: aktivacija, D1, D7 po igri, platformi i izvoru, uz n; napušteni mečevi |
| Poslije svake kampanje | Pun pregled kohorte; presuda samo uz n ≥ 100 |
| Mjesečno | D30, oblik krive, DAU/MAU van kampanje, faza u kojoj smo i da li se prelazi u sljedeću |
