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

## 7. Ritam čitanja

| Kad | Šta |
|---|---|
| Dnevno (dok kampanja radi) | Otvaranja, aktivacija i izbor igre po kampanji; DAU |
| Sedmično | Scorecard: aktivacija, D1, D7 po igri, platformi i izvoru, uz n; napušteni mečevi |
| Poslije svake kampanje | Pun pregled kohorte; presuda samo uz n ≥ 100 |
| Mjesečno | D30, oblik krive, DAU/MAU van kampanje, faza u kojoj smo i da li se prelazi u sljedeću |
