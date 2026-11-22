# Konkurencija — monetizacija kartaških igara

> **Datum:** 22.11.2026. Ovakva analiza brzo zastari: cijene i paketi se mijenjaju, pa je treba osvježiti prije odluke o monetizaciji.
> **Svrha:** podloga za plan monetizacije Kartaonice. Plan još ne postoji. Do sada je zapisano samo „reklame + kozmetički novčići koji se ne mogu unovčiti" (CLAUDE.md, PRD §43, HARD RULE 8).
> **Izvori:** listinzi na Google Play i App Store-u, blogovi ad-tech firmi i jedan SEC izvještaj. Prihode konkurenata niko ne objavljuje, osim starih procjena za Zynga/Peak. Sve tvrdnje o tome kako regionalne aplikacije zarađuju potiču iz njihovih listinga, a nijednu nismo provjerili igranjem. Prije odluke instalirati 3–4 ključne aplikacije i proći ih rukom (vidi „Šta pratiti").

---

## 1. Ko je konkurencija

### Regionalni (ex-Yu, Bugarska, Rumunija)

| Aplikacija | Igra | Razvija | Model zarade (prema listingu) |
|---|---|---|---|
| **Bela Online — Belote & Friends** | Bela | Sombrerito (HR) | **Besplatno, bez reklama, bez pretplate.** Privatna soba preko linka, javne sobe, bot kad fali četvrti. Nije poznato kako zarađuje (moguće hobi projekat). |
| **Bela – Belote Online** | Bela | TPMobileApps (Split) | Kupovine u aplikaciji. Igra protiv ljudi i protiv računara. |
| **Tablić Masters** | Tablić | Danko Šaponjić (BG) | Reklame + **novčići za igranje** (besplatno u prosjeku ~45 min dnevno) + vremenske propusnice „Unlimited" (24 h za 0,99 €, 60 dana za 4,99 €) + paketi Gold novčića. Rangirana igra i tabele. Tvrdnja „ne prodajemo prednost". |
| **Tablić** | Tablić | Vanja Milivojević | Reklame + jednokratno **„Ukloni reklame" za 3,99 €**. Multiplayer i igra protiv računara. |
| **Tablic.io** | Tablić | (RS) | Web + aplikacije, besplatno, stolovi sa prijateljima preko koda. Model zarade nismo našli. |
| **Belot.BG / VIP Belote** | Belot (BG/FR) | Casualino (BG) | Žetoni + reklame. VIP status uklanja reklame i daje 15 % više žetona. Kad igraču nestane žetona, dočeka ga zid reklama, i na to se igrači najviše žale u recenzijama. Ima i VIP Spades i Hearts. |
| **Belotly** | Belot (BG) | — | Žetoni, dnevne i sedmične misije, **VIP pretplata** (15.000 žetona mjesečno) sa probnim periodom bez kartice. |
| **Remi / Rummy PRO (LalaPlay)** | Remi (RO) | LalaPlay | Žetoni + VIP, klasičan socijalni model. |

**Raub, Žandar i poker na našem jeziku** nemaju ozbiljnog konkurenta u regionu, koliko je pretraga pokazala. Za Belu, Tablić i Remi konkurencija postoji. Preferans u Srbiji nismo našli; za to treba posebna pretraga.

### Globalni

| Naslov | Model | Brojke (gdje postoje) |
|---|---|---|
| **Zynga Poker** | Socijalni kazino: kupovina žetona, VIP, događaji | Po blogovima > 70 % prihoda su žetoni, ~250 M $/god. Brojke se ne slažu među izvorima, uzeti oprezno. |
| **Okey Plus, Spades Plus, Gin Rummy Plus** (Zynga, ex-Peak) | Žetoni, karte za turnire, VIP | Q1–Q3 2017: 18 / 9 / 8 M $. Okey Plus u Turskoj 2023: ~30–90 k $ sedmično. Zynga tvrdi da **70–90 % prihoda daju VIP igrači**. |
| **Belote.com** (GameDuell) | Reklame + novčići. Igrači se žale da su dnevne nagrade male i da je cilj kupovina novčića. | — |
| **VIP Games / VIP Spades / Hearts** | Reklame na besplatnoj igri, VIP pretplata (bez reklama + kozmetika: podloge i karte), paketi žetona | Hearts VIP: ~1,99 $/mj, 5,99 $/6 mj, 9,99 $/god. VIP Spades ima oznaku 18+ zbog simuliranog kockanja. |
| **Trickster Cards** | Kratka reklama prije svake partije; plaćena „VIP propusnica" bez reklama | — |
| **DoubleDown (socijalni kazino, orijentir)** | Žetoni | ARPDAU 1,35 $ u Q4 2025 (SEC). To je gornja granica žanra i za nas nije dostižna. |

---

## 2. Poređenje modela

Ocjene: **Jako** = glavni izvor prihoda · **Ima** = postoji · **—** = nema.

| Mehanizam | Bela Online | Tablić Masters | Tablić (Milivojević) | Casualino (Belot.BG) | Zynga (+Plus serija) | VIP Games | **Kartaonica danas** |
|---|---|---|---|---|---|---|---|
| Reklame između partija | — | Ima | Ima | Jako | Ima | Ima | — |
| Reklame sa nagradom | — | Ima? | — | Jako (za žetone) | Ima | Ima | — |
| „Ukloni reklame", jednokratno | — | — | **Jako** (3,99 €) | — | — | Ima | — |
| VIP pretplata | — | Propusnice | — | Jako | **Jako** | Jako | — |
| Kupovina žetona/novčića | — | Jako | — | Jako | **Jako** | Ima | — |
| Ograničenje igranja (energija) | — | **Da** (~45 min/dan) | — | Da (bez žetona nema igre) | Da (bez žetona nema stola) | — | **Ne** |
| Kozmetika (podloga, karte, avatar) | — | — | — | Malo | Ima | Ima (uz VIP) | Podloge i avatari postoje, ali se ne prodaju |
| Rang i lige | — | Ima | — | Ima | Ima | Ima | U specu (SPEC_RANG) |
| Igra sa prijateljima preko linka | **Jako** | Ima | Ima | Ima | Ima | Ima | **Jako** (pozivnice, App Links) |
| Web bez instalacije | — | — | — | Ima (belot.bg) | Ima (FB) | Ima | **Jako** |

---

## 3. Pozicioniranje

| Ko | Kako se predstavlja |
|---|---|
| Bela Online | „Igraj belu sa prijateljima ili neprijateljima" — besplatno, bez reklama, društvo. **Najjasniji prijatelj-prvo regionalni proizvod.** |
| Tablić Masters | „Igra pamćenja i računanja", rangirana takmičarska igra, poštena (bez prodaje prednosti). |
| Casualino | Socijalni kazino oko jedne igre: žetoni, VIP, turniri. |
| Zynga / VIP Games | Globalni katalog klasika, milioni igrača, žetoni i VIP. |
| **Kartaonica** | Više domaćih igara na jednom mjestu, živ sto za par sekundi (botovi koji izgledaju kao ljudi), igra sa prijateljima preko linka, web i aplikacija, bez kockanja. |

**Prazna pozicija koju možemo zauzeti:** *domaća kafanska kartaonica*: više ex-Yu igara pod jednim nalogom, **pošteno i bez zida žetona**. Regionalni konkurenti nude po jednu igru. Globalni ne govore naš jezik i nemaju Raub, Žandar ni Tablić.

---

## 4. Snage i slabosti konkurenata

**Bela Online (Sombrerito)**
- Snaga: besplatno, bez reklama, privatna soba preko linka, bot za četvrtog. To je naš model igre sa prijateljima u Beli, a njihov je stigao prvi.
- Slabost: jedna igra. Kako zarađuje, nije poznato, pa je pitanje koliko dugo će se održavati.

**Tablić Masters**
- Snaga: rangirana igra, jasan i jeftin plaćeni sloj (0,99 € dnevna propusnica), poruka o poštenju.
- Slabost: ograničenje od 45 minuta dnevno udara baš po najvjernijim igračima i tjera ih ka konkurenciji bez ograničenja.

**Casualino (Belot.BG, VIP Belote)**
- Snaga: dokazan socijalni model u Bugarskoj, VIP uklanja reklame.
- Slabost: recenzije su pune žalbi na reklame kad nestane žetona. Model se graniči sa kockanjem (žetoni, oznaka 18+).

**Zynga / Peak**
- Snaga: VIP ekonomija (70–90 % prihoda), događaji, veliki katalog.
- Slabost: kazino ton, nema domaćih igara, nema lokalnog jezika.

---

## 5. Prilike

1. **Model bez zida žetona.** Igrači u regionu se najviše žale na reklame i žetone koji nestanu. Proizvod gdje se igra besplatno i bez ograničenja, a plaća samo udobnost i izgled, ima jasnu priču.
2. **Kozmetika koju već imamo.** Podloge stola (`TABLE_THEMES`) i avatari su već sistem. Podlogu bira onaj ko pravi sto i **vide je svi za stolom**, pa je to društveno vidljiva kozmetika, a takva se najbolje prodaje.
3. **„Bez reklama" kao jednokratna kupovina.** Regionalni orijentir je 3,99 € (Tablić). Za tržište sa niskom kupovnom moći jednokratna cijena je lakša od pretplate.
4. **Više igara pod jednim plaćanjem.** Jedna kupovina ili VIP važi za Žandar, Raub, Belu, poker i Tablić. Konkurenti sa jednom igrom to ne mogu ponuditi.
5. **Web.** Regionalni konkurenti su uglavnom samo aplikacije. Web reklame (AdSense i slično) su mogući prihod bez Play provizije, ali tek kad bude dovoljno saobraćaja.

## 6. Prijetnje

1. **Bela Online je besplatan i bez reklama.** Ako uvedemo reklame u Belu prije nego što imamo prednost (više igara, rang, živ sto), igrači Bele lako odu tamo.
2. **Niske cijene reklama u regionu.** Za Srbiju, BiH i Hrvatsku nismo našli eCPM po zemlji. Opšti orijentir za treći tier: reklama sa nagradom ~1,8 $, reklama između partija ~0,85 $ (za Hrvatsku vjerovatno nešto više). ARPDAU samo od reklama u ležernim igrama: 0,01–0,05 $.
   - **Računica:** 1.000 DAU × 0,01–0,05 $ × 30 dana ≈ **300–1.500 $ mjesečno**. Reklame same ne pokrivaju razvoj dok DAU ne bude u hiljadama.
3. **Poker i simulirano kockanje.** Prodaja žetona za poker vodi ka oznaci 18+, strožim Play pravilima i kockarskoj regulativi. U kombinaciji sa botovima to krši HARD RULE 8. **Žetoni za poker se nikad ne prodaju.**
4. **Reklame obaraju povratak igrača.** Nismo ni dostigli PMF pragove (D1 35 / D7 15 / D30 6). Reklama u ranoj fazi kvari baš ono što mjerimo.
5. **Zynga ili Casualino dodaju Belu/Tablić na lokalnom jeziku.** Malo vjerovatno (tržište je malo), ali Casualino je u susjedstvu i već radi Belot.

---

## 7. Šta ovo znači za Kartaonicu (preporuka)

**Redoslijed se ne mijenja:** prvo PMF, zatim GTM, pa monetizacija. Do PMF presude nema reklama u igri. Monetizacija se uvodi po igri i po platformi, uz kontrolnu grupu, tako da se vidi uticaj na D7.

**Predloženi model (nacrt, čeka odluku vlasnika):**

| Faza | Šta | Zašto |
|---|---|---|
| 0 — sada | Ništa u igri. Mjeriti volju za plaćanjem lažnim vratima (npr. „Bez reklama" ili „Paket podloga" bez prave naplate, po uzoru na lažna vrata Tablić/Remi). | Ne kvari povratak igrača, a daje podatke. |
| 1 — poslije PMF-a | **Reklama sa nagradom** samo za kozmetiku (npr. podloga ili poleđina na dan), nikad za pravo na igru. **Reklama između partija**, najviše jedna na N završenih partija, nikad usred partije, nikad prvog dana. | Najmanje smeta igri; prvi stvarni prihod. |
| 2 | **„Bez reklama" jednokratno** (~2,99–3,99 €, za sve igre) + **kozmetički paketi** (podloge, poleđine, avatari) za novčiće ili direktno. | Regionalni orijentir; vidljiva kozmetika već postoji u kodu. |
| 3 — opciono | **VIP pretplata** (bez reklama + mjesečna kozmetika + istaknut profil/rang) tek ako ima dovoljno vjernih igrača sa 10+ partija sedmično. | Kod Zynge VIP daje 70–90 % prihoda, ali traži veliku bazu. |

**Gdje se razlikujemo, a gdje se izjednačujemo**
- Razlikujemo se: bez ograničenja igranja, bez prodaje prednosti, bez prodaje žetona, više igara po jednoj kupovini.
- Izjednačujemo se: reklame između partija i reklame sa nagradom kakve igrači u žanru već očekuju; „bez reklama" po regionalnoj cijeni.

**Poruka:** „Igraj koliko hoćeš, besplatno. Platiš samo ako hoćeš ljepši sto."

**Čega se ne diramo (HARD RULES):** novčići se ne mogu unovčiti (8); ne prodaje se prednost u igri; žetoni za poker nikad za novac; težina botova ne zavisi od plaćanja (2, 7).

---

## 8. Šta pratiti

- [ ] Instalirati i proći rukom: Bela Online, Tablić Masters, Tablić (Milivojević), Belot.BG. Zapisati gdje i koliko često se javljaju reklame, šta je iza plaćanja i kakav je prvi dan.
- [ ] eCPM po zemlji (RS, BA, HR, ME, MK, SI): CAS.AI/Gamigion benchmark 2025 po zemljama ili TopOn izvještaj. Bez toga je računica iz §6 samo orijentir.
- [ ] Recenzije (1–2 zvjezdice) Bela Online i Tablić Masters: na šta se igrači žale.
- [ ] Preferans i Remi u Srbiji i BiH: posebna pretraga.
- [ ] Svaki kvartal: da li neko od velikih dodaje ex-Yu igre na lokalnom jeziku.

---

## Izvori

- Bela Online — [Google Play](https://play.google.com/store/apps/details?id=co.sombrerito.belaonline&hl=en_US), [App Store](https://apps.apple.com/sc/app/bela-online-belote-friends/id1539959038)
- Bela – Belote Online — [Google Play](https://play.google.com/store/apps/details?id=com.tp.belote&hl=en_US), [App Store](https://apps.apple.com/app/id6479204937)
- Tablić Masters — [Google Play](https://play.google.com/store/apps/details?id=com.gameslade.tablic&hl=en_US), [App Store](https://apps.apple.com/rs/app/tablic-masters/id6446068802)
- Tablić (Milivojević) — [App Store](https://apps.apple.com/rs/app/tabli%C4%87/id1559451253); Tablić (Smederevo) — [Google Play](https://play.google.com/store/apps/details?id=com.tablic.tablic_online); [tablic.io](https://tablic.io/)
- Casualino — [Belot.BG](https://play.google.com/store/apps/details?id=com.casualino.bgbelot&hl=en_US), [VIP Belote](https://play.google.com/store/apps/details?id=com.casualino.vipbelote&hl=en_US), [Belot.BG recenzije](https://apps.apple.com/us/app/belot-bg-%D0%B1%D0%B5%D0%BB%D0%BE%D1%82-%D1%81-%D0%BF%D1%80%D0%B8%D1%8F%D1%82%D0%B5%D0%BB%D0%B8/id961576733?see-all=reviews)
- Belotly — [Google Play](https://play.google.com/store/apps/details?id=com.belotly.app&hl=en_US)
- Rummy PRO — [Google Play](https://play.google.com/store/apps/details?id=air.com.lalaplay.rummypro&hl=en_US)
- Belote.com — [Google Play](https://play.google.com/store/apps/details?id=com.gameduell.mobile.belote&hl=en)
- VIP Games / VIP Spades — [App Store](https://apps.apple.com/us/app/vip-spades-online-card-game/id1119164669), [Hearts](https://apps.apple.com/us/app/hearts-card-game-classic/id1357131935); Trickster — [Free vs VIP](https://www.trickstercards.com/features/free-vs-vip/)
- Zynga / Peak — [GamesBeat 2017](https://gamesbeat.com/zynga-pays-100-million-for-peak-games-casual-card-game-studio/), [TechCrunch 2020](https://techcrunch.com/2020/06/01/zynga-acquires-turkeys-peak-games-for-1-8b-after-buying-its-card-games-studio-for-100m-in-2017/), [Sensor Tower TR Q1 2023](https://sensortower.com/blog/2023-q1-android-top-5-2d%20realistic%20games-revenue-tr-60222863241bc16eb83eea24), [Okey Plus](https://apps.apple.com/de/app/okey-plus/id480951901?l=en-GB), [Zynga VIP (stash.gg)](https://www.stash.gg/blog/zynga-store), [Zynga Poker (Wikipedia)](https://en.wikipedia.org/wiki/Zynga_Poker)
- DoubleDown ARPDAU — [SEC 6-K FY2025](https://www.sec.gov/Archives/edgar/data/1799567/000179956726000001/ddi-2026x02x11x6kxexx991.htm)
- Benchmarki reklama — [Playio ARPDAU](https://blog.playio.co/arpdau-benchmarks-mobile-games), [Playio rewarded 2026](https://blog.playio.co/rewarded-ad-benchmarks-2026), [AppAgent](https://appagent.com/blog/mobile-game-ad-monetization/), [Game Growth Advisor](https://gamegrowthadvisor.com/blog/2026-04-02-f2p-monetization-models-comparison-2026/), [appadrevenue (eCPM po tieru)](https://www.appadrevenue.com/guides/how-much-do-mobile-ads-pay), [Gamigion benchmark 2025](https://www.gamigion.com/ad-monetization-in-mobile-games-benchmark-report-2025/)
