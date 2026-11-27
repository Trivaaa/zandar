# Kartaonica — business case (procjena potencijala)

> **Verzija 1.0, 22.11.2026.** Nastao iz razgovora vlasnika i Claudea, sa pogledom serijskog preduzetnika. Procjenjuje stvarni potencijal, a ne ambiciju.
> **Status:** mišljenje i okvir za odluke, ne plan. Brojke o tržištu i prihodu su procjene sa rasponom, a ne mjerenja. Osvježiti poslije PMF presude (faza 3 u `docs/PMF_PLAN.md`).
> **Povezano:** `docs/PMF_PLAN.md` (pragovi, faze, očitanja), `docs/KONKURENCIJA_MONETIZACIJA.md` (konkurencija, nacrt monetizacije).

---

## 0. Polazne činjenice (22.11.2026)

- Sve je napravio jedan čovjek: vlastito vrijeme, osnovna Claude pretplata i tri testne reklame (ukupno oko 52 €). Trošak je skoro nula i vlasnik tako može nastaviti neograničeno.
- Pravni oblik je samostalni preduzetnik (SP) u BiH, a Google Play nalog je otvoren na njega. **Kupovina u aplikaciji (IAP) iz BiH trenutno nije dostupna** (vidi §6).
- Igre na produkciji: Žandar, Raub, Poker i Bela (beta), uz lažna vrata za Tablić i Remi. Igra se na webu (kartaonica.com) i u Android aplikaciji.
- **Vlasnik je otvoren za prodaju žetona i VIP-a** (izjava od 22.11.2026). To je u sukobu sa HARD RULE 8 u `CLAUDE.md` i sa nacrtom u `KONKURENCIJA_MONETIZACIJA.md`, koji još nisu izmijenjeni (vidi §5 i §9).

---

## 1. Presuda

**Kartaonica može postati profitabilan nišni biznis**, ali ne firma za investitore (venture scale).

- Samo sa reklamama i kozmetikom, dobar ishod je **50–300 k€ godišnje dobiti** za 2–4 godine.
- Sa žetonima i VIP-om plafon raste na **~1–1,5 M$ prihoda godišnje** u odličnom scenariju.
- Očekivani ishod je danas manji od oba, jer **PMF još nije dokazan**: nijedna igra nema D7 na n ≥ 100.
- Najveća prednost je strukturalna: troškovi su skoro nula, pa vlasnik može čekati PMF koliko treba. Većina startupa propadne baš zato što to ne može.

---

## 2. Tržište

| | Procjena |
|---|---|
| Govornici jezika u regionu (BiH, RS, HR, ME i dijelom SI i MK) | ~16–18 M |
| Dijaspora (DACH, Skandinavija) | ~3–5 M |
| Plafon MAU uz dominaciju u svim igrama | 100–300 k |
| Realno dobar ishod | 30–80 k MAU, odnosno 6–15 k DAU |

**Uporedni slučajevi:**

- **Bugarska, Belot.bg (Casualino):** najbliži uzor. Jedna nacionalna igra u zemlji od 6,5 M ljudi postala je održiva firma koju je [kupila 52 Entertainment](https://intellinews.com/france-s-52-entertainment-buys-bulgarian-gaming-developer-casualino-256821). To dokazuje da lokalna kartaška platforma može postati biznis koji neko kupi. Iznos prodaje nije javan.
- **Turska, Okey Plus (Peak Games):** ambiciozni scenarij. U prvih 9 mjeseci 2017. prihod je bio oko 18 M $, a Zynga je kartaške igre kupila za [100 M $](https://gamesbeat.com/zynga-pays-100-million-for-peak-games-casual-card-game-studio/). Tamo su drugačiji uslovi: 85 M ljudi, okej je nacionalna razbibriga, studio je imao finansiranje, a prihod su davali žetoni i VIP.

**Zaključak:** tržište je malo, ali stvarno. Za Raub i Žandar ozbiljne konkurencije nema, a za Belu i Tablić ima (Bela Online je besplatna i bez reklama).

---

## 3. Šta brojke govore (22.11.2026)

Izvor je `docs/PMF_PLAN.md` §6. Gotovo svi uzorci su ispod n = 100, pa se čitaju kao trend, a ne kao rezultat.

**Jak signal: pažnja je jeftina.**
- Na Raub oglasu („Konačno, Raub online!") jedan igrač koji je zaigrao koštao je **≈ 0,04 €**. „Ajmo jednu?" je dao ≤ 0,31 €, a „Ko dijeli?" 4,15 €.
- Klik je u sva tri oglasa koštao isto (0,03–0,05 €), a razliku pravi poruka. To znači da postoji stvarna nostalgična potražnja za domaćim igrama koje niko nije prenio online.

**Signali za oprez:**

| Signal | Vrijednost | Zašto je bitno |
|---|---|---|
| D7 | 0/23 | Premali uzorak, ali još nema dokaza o povratku. Jeftina pažnja bez povratka je jeftino curenje. |
| Napušteni mečevi | Raub 41 %, Žandar 38 % | Kod kartaških igara je to obično problem proizvoda (dužina partije, botovi, nejasnoća), a ne šum u mjerenju. |
| Pozivnice sa oglasa | 0 | **Najveća briga.** Kartaške igre zadržavaju ljude preko društva. Botovi pomažu prvi dan, ali nikog ne drže godinama. |
| D1 Raub | 38 % (17/45) | Zanimljivo, ali interval je ~24–52 %. |

### 3.1 Dopuna 23.11.2026: cijena aktivnog igrača potvrđena

Raub oglas, prvih 17 sati: **4,59 €** potrošeno, 117 ljudi zaigralo (**0,039 €** po igraču), 57 završilo bar jedan meč (**0,081 €**), 31 odigralo 3+ meča (0,15 €). CTR je 6,2 %, a za igre na Meti je uobičajeno 1–2 %. Oglas je daleko od zasićenja (frekvencija 1,2). Publika: ~87 % muškarci 35+. Detalji su u `docs/PMF_PLAN.md` §6, očitanje od 23.11.2026.

**Šta to znači za business case:** ako se aktivni igrač dobija za ~0,08 €, računica se zatvara i pri vrlo malom prihodu. Na primjer, igrač sa 10 aktivnih dana i 0,02 € reklama dnevno donese 0,20 €, oko 2,5× više nego što košta, i to bez žetona. **GTM vjerovatno neće biti usko grlo; usko grlo je PMF (povratak).**

Ograde:
- Ova cijena važi za mali budžet. Na 50–100 € dnevno cijena prikaza raste, a efekat novine („Konačno, Raub online!") se troši.
- Povratak još nije izmjeren.
- Ista poruka ne mora raditi i za druge igre. Kampanja 1 („Ko dijeli?") je za sličan klik dala 4,15 € po igraču.

---

## 4. Prednost koju je teško kopirati

Kod nije prednost. Sa AI alatima neko drugi može za par mjeseci napraviti istu igru. Trošak izrade pada za sve, i za konkurente. Prednost može dati samo:

1. **Mreža ljudi:** živi stolovi, prijatelji, rang, osjećaj „moja ekipa je ovdje".
2. **Brend:** Kartaonica kao mjesto gdje su sve domaće igre.
3. **Prednost prvog:** postoji na Raubu i Žandaru, a ne postoji na Beli i Tabliću.

---

## 5. Model zarade i plafon prihoda

U žanru **70–90 % prihoda daju žetoni i VIP** (Zynga, Peak, Casualino). Bez njih ARPDAU pada 3–10×.

### 5.1 Samo reklame + „bez reklama" + kozmetika (današnji nacrt)

| Scenarij | DAU | ARPDAU | Godišnje |
|---|---|---|---|
| Hobi | 500 | 0,02 $ | ~4 k$ |
| Dobar | 5.000 | 0,04 $ | ~70 k$ |
| Odličan | 15.000 | 0,06 $ | ~330 k$ |

### 5.2 Uz žetone i VIP (vlasnik otvoren, 22.11.2026)

Realan ARPDAU za kartaške igre na ovakvim tržištima je 0,10–0,30 $. Mnogo više od toga imaju samo socijalni kazini (DoubleDown 1,35 $ je gornja granica i za nas nije dostižna).

| Scenarij | DAU | ARPDAU | Godišnje |
|---|---|---|---|
| Dobar | 5.000 | 0,12 $ | ~220 k$ |
| Odličan | 15.000 | 0,25 $ | ~1,4 M$ |

### 5.3 Dijaspora kao poluga

Reklama prikazana u DE, AT, CH i SE plaća se 5–10× više nego u BiH, a dijaspora lakše plati „bez reklama" ili VIP. Kampanje za dijasporu (npr. Bela za DE/AT/CH/SE) su zato važnije zbog vrijednosti po igraču nego zbog broja igrača.

### 5.4 Primjer: žetoni i VIP na 500 DAU

**Pretpostavke:** 500 DAU ≈ 2.000 MAU (DAU/MAU 25 %). Prihod se računa iz udjela igrača koji plaćaju, jer se tako vidi odakle dolazi novac. Play uzima 15 % od kupovina, a reklame su računate neto. Za 500 MAU (≈ 100 DAU) iznose treba podijeliti sa 4. Poređenja radi: 22.11.2026 je bilo 39 DAU i 204 MAU.

| | Skeptičan | Realan | Optimističan |
|---|---|---|---|
| Plati bar jednom mjesečno (od MAU) | 1 % → 20 ljudi | 2,5 % → 50 | 4 % → 80 |
| Prosječno po platiši mjesečno | 5 € | 10 € | 20 € |
| Žetoni i VIP, bruto | 100 € | 500 € | 1.600 € |
| Reklame (po DAU dnevno) | 0,01 € → 150 € | 0,02 € → 300 € | 0,04 € → 600 € |
| **Neto mjesečno** | **~235 €** | **~725 €** | **~1.960 €** |
| **Neto godišnje** | **~2,8 k€** | **~8,7 k€** | **~23,5 k€** |

**Kako čitati:**
- **Skeptičan scenarij** je realan za prve mjesece poslije uvođenja žetona, dok je ekonomija tanka: nema turnira ni događaja, a VIP nema šta posebno ponuditi. Trošak firme (knjigovođa i banka za d.o.o., oko 50–100 € mjesečno) plus veći serveri pojedu skoro cijeli prihod.
- **Realan scenarij** pretpostavlja da žetoni imaju smisla: stolovi sa ulogom gdje igraju ljudi, dnevne nagrade, VIP bez reklama. Ishod je džeparac, a ne plata.
- **Optimističan scenarij** zavisi od nekoliko igrača koji puno troše. Na 2.000 MAU dva ili tri takva igrača od 100–200 € mjesečno prave cijelu razliku između realnog i optimističnog. Ako jedan ode, prihod padne za trećinu.

**Zašto je ARPDAU ovdje (≈ 0,02 / 0,05 / 0,13 €) ispod raspona iz §5.2:** raspon od 0,10–0,30 $ važi tek za zrelu ekonomiju. Ona traži tri uslova: dovoljno ljudi da stolovi sa ulogom budu puni ljudima, a ne botovima (§6.1); događaje, turnire i rang zbog kojih žetoni nešto znače; i vjerne igrače koji igraju mjesecima. Na 500 DAU ništa od toga još ne postoji.

**Zaključak:** na 500 DAU žetoni nisu izvor prihoda, nego **test ekonomije**: pokazuju da li ljudi plaćaju, koliko i za šta. Prihod koji nešto znači počinje od **3–5 k DAU**. Na 5.000 DAU realan scenarij daje oko 7–10 k€ mjesečno.

### 5.5 Koliko MAU treba za 500 KM neto mjesečno

**Cilj:** 500 KM ≈ 256 € neto mjesečno, poslije troškova firme (knjigovođa i banka, ~50–100 €). Prihod zato mora biti **~310–360 € mjesečno**. Pretpostavke su iste kao u §5.4 (DAU/MAU 25 %, Play 15 %, reklame neto), a prihod raste linearno sa brojem igrača.

| | Skeptičan | Realan | Optimističan |
|---|---|---|---|
| Neto na 1.000 MAU (žetoni, VIP i reklame) | ~118 € | ~363 € | ~980 € |
| **MAU za cilj (žetoni, VIP i reklame)** | **~2.600–3.000** (≈ 650–750 DAU) | **~850–1.000** (≈ 210–250 DAU) | ~300–350 |
| **MAU za cilj (samo reklame)** | ~4.100–4.800 | ~2.000–2.400 | ~1.000–1.200 |

**Kako čitati:**
- Prvih mjeseci poslije uvođenja žetona važi skeptičan scenarij (vidi §5.4). Za plan treba zato računati na **~3.000 MAU (≈ 750 DAU)** uz žetone i VIP, ili oko 4.500 MAU ako ostanu samo reklame.
- Realan scenarij (~1.000 MAU) traži zrelu ekonomiju žetona: stolove sa ulogom samo za ljude, dnevne nagrade i VIP. To dolazi tek poslije uslova iz §6.
- Veći serveri i trošak sticanja igrača nisu uračunati. Plaćena kampanja koja drži MAU pomjera prag naviše.
- Poređenja radi: 23.11.2026 je bilo 454 MAU i prosječno 83 DAU, napumpano kampanjom. Do cilja treba otprilike 6× više igrača i uvedena monetizacija.

---

## 6. Uslovi prije prvog prodatog žetona

### 6.1 Plaćeni žetoni i botovi koji izgledaju kao ljudi

**Najozbiljniji rizik.** HARD RULE 5 kaže da se botovi u igri nikad ne otkrivaju. Ako čovjek kupi žetone i izgubi ih protiv bota za kojeg misli da je čovjek, to je obmana: rizik po zaštiti potrošača, rizik od kazne na Play-u i reputacijski rizik. Moguća rješenja:

| Opcija | Opis | Napomena |
|---|---|---|
| A | Stolovi sa ulogom u žetonima samo za ljude; stolovi sa botovima bez uloga | Traži dovoljno igrača da se stolovi brzo pune, pa je faza poslije PMF-a |
| B | Botovi jasno označeni tamo gdje se igra za žetone | U sukobu sa HARD RULE 5 samo na tim stolovima |
| C | Žetoni ne ulaze u ishod partije: VIP, kozmetika, turniri, rang | Najmirnija varijanta |

### 6.2 Poker

Poker sa kupljenim žetonima znači simulirano kockanje, uzrast 18+, stroža Play pravila i u nekim zemljama regulatore (Belgija i Holandija, a u EU raste pritisak). **Ako se prodaju žetoni, kreće se od Rauba, Bele i Žandara, a ne od pokera.**

### 6.3 Kupovina u aplikaciji iz BiH

**Provjereno 24.11.2026** na [Play Console Help — Supported locations](https://support.google.com/googleplay/android-developer/answer/9306917): Bosna i Hercegovina podržava registraciju developera, ali **ne i merchant registraciju** (isto Crna Gora). Merchant je podržan u Srbiji, Hrvatskoj, Sloveniji i Sjevernoj Makedoniji. Prepreka je, dakle, **država**, a ne pravni oblik: stranica ne traži firmu, pa i fizičko lice iz podržane zemlje može prodavati (tako rade regionalni konkurenti koji objavljuju pod ličnim imenom). Uobičajena rješenja:

- **d.o.o. u Hrvatskoj ili Sloveniji** (EU: Play merchant, Stripe i Paddle za web) ili u Srbiji. Aplikacija se može prebaciti na novi developer nalog bez gubitka instalacija i recenzija.
- **Plaćanje na webu preko posrednika koji je zvanični prodavac** (Paddle i slični), koji rješava i PDV. Na webu nema Play provizije od 15 %.
- **Estonska e-rezidencija** kao lakši put do EU firme.

**Traje mjesecima** (firma, banka, prebacivanje aplikacije, porezi SP-a u odnosu na d.o.o.), pa treba **početi sada**, paralelno sa PMF fazom. To ne kvari mjerenje, a skida blokadu kad dođe vrijeme. Poreze i iznošenje dobiti dogovoriti sa knjigovođom.

---

## 7. Prodaja firme

| | Bez žetona | Sa žetonima i VIP-om |
|---|---|---|
| Množilac (male igre) | 1–3× godišnjeg prihoda | 2–3× (profitabilna IAP igra se lakše prodaje) |
| Odličan scenarij | 0,3–1 M€ | 2–4 M€ |
| Dobar scenarij | nema kupca, ima prihod | moguć manji kupac |

**Mogući kupci:** studiji koji skupljaju lokalne kartaške igre (52 Entertainment je primjer) i regionalne medijske ili telekom grupe. Kladionicama bi publika bila zanimljiva, ali to se kosi sa pozicioniranjem.

**Mišljenje:** u osnovnom obliku ovo je projekat za prihod, a ne za prodaju. Prodaja postaje realna tek ako se recept proširi (§8).

---

## 8. Stvarni veći potencijal: recept, a ne aplikacija

Najvrjedniji dio nije Kartaonica kao ex-Yu aplikacija, nego **recept**: jedan čovjek uz AI za par sedmica napravi autentičnu lokalnu kartašku igru, sa stolom punim od prve sekunde (botovi), na webu i u aplikaciji, uz igrača za par centi.

Svaka zemlja ima igre koje globalni igrači ne rade kako treba: belot u Bugarskoj, šnaps i tarok u Austriji i Sloveniji, briškula i treseta u Italiji i Dalmaciji, preferans u istočnoj Evropi. **Širenje je jedini put do veće firme, i to tek kad se recept dokaže na jednoj igri.**

---

## 9. Vjerovatnoća ishoda (horizont 2–3 godine)

| Ishod | Samo reklame i kozmetika | Uz žetone i VIP |
|---|---|---|
| Hobi (< 10 k€/god) | ~50 % | ~45 % |
| Sporedni prihod (10–100 k€) | ~35 % | ~30 % |
| Solidan mali biznis (100–500 k€) | ~12 % | ~19 % |
| Veće od toga (više tržišta) | ~3 % | ~6 % |

Ove procjene su subjektivne. Služe da odluke ostanu realne, a ne kao prognoza.

---

## 10. Preporuke

1. **Ne dodavati nove igre** dok jedna ne dokaže povratak (D7 ≥ 15 % na n ≥ 100). Četiri igre plus lažna vrata razvodnjavaju i kod i podatke.
2. **Sve uložiti u glavnu igru**, a to je vjerovatno Raub ako ga potvrdi kohorta od 29.11.2026. Napuštene mečeve spustiti sa 41 % ispod 25 % (dužina partije, prvi dan koji vodi igrača za ruku).
3. **Ljudi za istim stolom kao glavna metrika**, a ne instalacije: pozivnice po aktivnom igraču i udio mečeva sa 2+ ljudi. Ekonomija žetona i VIP-a zavisi baš od toga.
4. **Ne uzimati novac i ne zapošljavati** prije PMF-a. Mogućnost čekanja je najveća prednost.
5. **Dijaspora kao drugi kanal**, zbog vrijednosti po igraču.
6. **Početi sada pravne korake za IAP** (§6.3), paralelno sa PMF fazom.
7. **Redoslijed ostaje PMF → GTM → monetizacija.** Žetoni podižu prihod po igraču, ali ne rješavaju povratak.

---

## 11. Šta mijenja procjenu

**Nagore:**
- Raub (ili druga igra) sa D1 ≥ 35 % i D7 ≥ 15 % na dvije uzastopne kohorte sa n ≥ 100. Tada „dobar" scenarij postaje očekivani.
- Igrači sami dovode prijatelje: pozivnice rastu i bez kampanje, a organski izvor i pozivnice daju ≥ 30 % novih.
- Recept prenesen na drugo tržište sa sličnim brojkama.

**Nadolje:**
- D7 ostaje ispod 10 % i poslije dvije iteracije faze 2.
- Cijena po igraču raste brže od budžeta, pa se oglas „istroši".
- Konkurent sa finansiranjem ili Casualino lansira Raub ili Žandar na lokalnom jeziku.

---

## 12. Otvorene odluke

| Odluka | Ko | Napomena |
|---|---|---|
| Izmjena HARD RULE 8 (žetoni/VIP) u `CLAUDE.md` | vlasnik | Dok se ne izmijeni, kod se drži postojećeg pravila |
| Žetoni i botovi: opcija A, B ili C (§6.1) | vlasnik | Uz to, mjesto HARD RULE 5 na stolovima sa ulogom |
| Pravni oblik za IAP (§6.3) | vlasnik + knjigovođa | Početi sada |
| Ažurirati `KONKURENCIJA_MONETIZACIJA.md` §7 | poslije odluke o HARD RULE 8 | Nacrt danas isključuje žetone |

---

## Izvori

- [GamesBeat — Zynga kupuje kartaške igre Peak Games](https://gamesbeat.com/zynga-pays-100-million-for-peak-games-casual-card-game-studio/)
- [TechCrunch — Zynga kupuje Peak Games](https://techcrunch.com/2020/06/01/zynga-acquires-turkeys-peak-games-for-1-8b-after-buying-its-card-games-studio-for-100m-in-2017)
- [intellinews — 52 Entertainment kupuje Casualino](https://intellinews.com/france-s-52-entertainment-buys-bulgarian-gaming-developer-casualino-256821)
- [Belot.BG — App Store](https://apps.apple.com/app/id961576733)
- Benchmarki reklama i ARPDAU: izvori u `docs/KONKURENCIJA_MONETIZACIJA.md`
- Brojke Kartaonice: `docs/PMF_PLAN.md` §6 (očitanje 22.11.2026)
