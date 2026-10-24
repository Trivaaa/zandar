# SPEC — Početna v3 · A „Kafanski sto"

> Dopuna `SPEC_POCETNA.md`: **tok, radnje i logika ostaju isti** (Igraj = odmah za sto, red podešavanja + sheet, lista igara iz `lib/games.ts`, zakačena igra, Uskoro/Javi mi, postavke u Profilu). Mijenja se **izgled** početne.
> Slike: `docs/Specs/pocetna-v3/` — `00` je današnji staging, `A1` jedna igra (danas), `A3` tri igre (kad stignu Poker i Raub).
> Referentne vrijednosti: `docs/Specs/pocetna-v3/referenca-dizajna.css` (CSS makete — prevedi na tokene i komponente, ne kopiraj klase).
> Gdje se ovo kosi sa `SPEC_IZGLED_APLUS.md`, **važi ova specifikacija**, ali samo za početnu i donju navigaciju.

## 1. Zašto

Staging početna je „velika i jednobrazna": sve je isti zeleni ton, svaka stvar je kutija sa istim mesinganim obrubom, ilustracija je tanka traka, a donja trećina ekrana je prazna. v3 uvodi **tri materijala** (drvo, sukno, karte), **jednu glasnu radnju** i **svoju boju po igri**.

## 2. Materijali (svi već postoje u `public/`)

| Šta | Asset | Kako |
|---|---|---|
| Pozadina ekrana | `tables/wood.webp` | `cover`, preko nje gradijent `rgba(18,13,9,.55)` → `rgba(18,13,9,.85)` (70 %) da tekst ostane čitljiv |
| Kartica igre (sto) | `felt-bg.webp` | `cover`, pozicija `center 30%` |
| Karte u lepezi i na pločicama | `cards/*.webp` | prave karte, ne crtež |

## 3. Raspored (360×740, bez skrolovanja)

Odozgo:

1. **Marka** — mali logo (24 px, rotiran −8°) + „Kartaonica" 15 px Archivo Black, `--card-face` 85 %. Visina 30 px. Nema zupčanika.
2. **Sto igre** (glavna igra)
   - radius 26 px; okvir: `0 0 0 3px` tamno drvo (`#3a2414`) + `0 0 0 5px` `--accent` 55 % + sjena `0 14px 30px rgba(0,0,0,.6)`.
   - unutra: toplo svjetlo (radijalni gradijent `rgba(255,230,160,.16)`) i tamnjenje dna (`→ rgba(8,20,16,.75)`).
   - **lepeza 3 prave karte** (Žandar: J♠ Q♥ K♦), širina karte 84 px (A1) / 66 px (A3), rotacija ±16°, sjena.
   - naslov igre dolje lijevo: 38 px Archivo Black, velika slova, `--card-face`, sjena; ispod meta 14 px („2 ili 4 igrača · ~10 min").
   - Zakačena igra: mala pilula „Zakačeno" dolje desno na stolu.
   - Visina: **≈268 px** kad je jedna igra, **≈196 px** kad ima „Još igara".
3. **Igraj** — jedina glasna radnja: 56 px, radius 14 px, mesingani gradijent (`--accent` svjetliji gore, tamniji dolje), tekst 20 px 700 `--accent-contrast`, strelica.
4. **Red tihih radnji** — dva dugmeta jedno do drugog, po 44 px, radius 12 px, pozadina `--card-face` 8 %, bez obruba:
   - lijevo **S prijateljima** (ikona `--turn-active`, tekst 15 px 700);
   - desno **podešavanja** u kratkom obliku „2 · 11 · Drvo ✎" (14 px 600). `aria-label` nosi puni tekst („2 igrača, do 11, sto Drvo, promijeni").
5. **Naslov sekcije** — „USKORO · DODIRNI ZVONO DA TI JAVIMO" ili „JOŠ IGARA": 12 px 700, razmak slova .12em, `--turn-active` 85 %.
6. **Pločice igara** — dvije u redu (grid 1fr 1fr, razmak 10 px), radius 16 px:
   - svaka igra ima svoju boju: **Poker** bordo, **Raub** tamnoplava, **Žandar** sukno (kad nije glavna);
   - gore desno 2 male prave karte (38 px), dolje lijevo ime (20 px Archivo Black, velika slova) i meta (12 px);
   - **NOVO**: pilula gore lijevo, `--danger-signal` pozadina;
   - **Uskoro**: ista pločica, zasićenost 55 %, karte 55 % providne, bez mete; dolje desno okruglo dugme sa zvonom 44 px = Javi mi.
   - Visina 112 px (dostupne) / 96 px (uskoro). Od 4. igre novi red i skrol liste ispod stola.
7. **Donja navigacija** — 64 px, pozadina tamno drvo (`#100b08`), gornja linija `--accent` 22 %. Neaktivan tab `--card-face` 62 %. **Aktivan tab: samo mesingan tekst i ikona + crtica gore** (bez pilule iz A+).

## 4. Novi tokeni

```
--wood-ink:     #120d09;  /* tamno drvo: pozadina iza teksture, traka */
--wood-rim:     #3a2414;  /* okvir stola */
--game-poker-1: #7a2a20;  --game-poker-2: #3e1611;   /* iz --card-ink-red, tamnije */
--game-raub-1:  #2a5276;  --game-raub-2:  #14283c;   /* iz --team-a, tamnije */
--game-zandar-1:#2c6152;  --game-zandar-2:#10302a;   /* sukno */
```
Boja igre ide u `lib/games.ts` kao ključ (`tint: "poker"`), ne kao heks u komponenti.

## 5. Šta se ne mijenja

- Ponašanje svih dugmadi, sheet podešavanja, sheet igre, Zakači, Javi mi, analitika.
- Mete ≥44 px; animacije samo transform/opacity (lepeza može blago „disati" ±1°, isključeno uz `prefers-reduced-motion`).
- Web zadržava tihi red „Privatnost · Uslovi · O nama" na dnu (Google), APK ne.

## 6. Kriteriji prihvatanja

- [ ] Snimak na 360×740 odgovara slici `A1`, a sa `poker` i `raub` kao live u `lib/games.ts` odgovara slici `A3`.
- [ ] Ništa ne izlazi iz ekrana i nema skrola na 360×740 i 390×844 (1, 2 i 3 igre).
- [ ] Nema novih heks boja van tokena iz §4.
- [ ] Teksture se učitavaju bez skoka rasporeda (rezervisana visina; `wood.webp` i `felt-bg.webp` mogu `preload` na početnoj).
- [ ] Tekst na drvetu ima kontrast ≥4.5:1.
- [ ] Donja navigacija izgleda isto na Igraj, Prijatelji i Profil.
