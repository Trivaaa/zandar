# SPEC — Početna v3 · K1 „Tamno toplo"

> Izvor istine za izgled: tabla **„UI · Početna v3 — čista pozadina"** (`project/UI_PocetnaV3b.dc.html`, varijanta **K1**) na Claude Design platnu „Kartaonica · identitet" (https://claude.ai/artifact/1DkTrJNEv2148shhQUC3de). Gdje se ovaj tekst i tabla razilaze, važi tabla.
> Dopuna `SPEC_POCETNA.md`: lista igara iz `lib/games.ts`, zakačena igra, list igre, Uskoro/Javi mi i postavke u Profilu ostaju isti.
> Prva verzija ovog speca (v3 · A, drvo i slika sukna) je u istoriji gita; slike `docs/Specs/pocetna-v3/` (`A1`, `A3`) i `referenca-dizajna.css` opisuju TU verziju — raspored pločica i dalje važi, materijali ne.
> Gdje se ovo kosi sa `SPEC_IZGLED_APLUS.md`, **važi ova specifikacija**, ali samo za početnu i donju navigaciju.

## 1. Zašto

Staging početna je bila „velika i jednobrazna": sve isti zeleni ton, svaka stvar kutija sa istim mesinganim obrubom, tanka ilustracija i prazna donja trećina. v3 uvodi **sto kao glavnu igru**, **jednu glasnu radnju** i **svoju boju po igri**. K1 je najmirnija varijanta: pozadina je jedna topla tamna boja, sto je čisto sukno, a detalj nose samo karte i pločice.

## 2. Materijali

| Šta | Kako |
|---|---|
| Pozadina ekrana | bez slike: gradijent odozgo nadolje `--bg-top` → `--bg-mid` (55 %) → `--bg-bottom` |
| Sto glavne igre | bez slike i bez drvenog oboda: radijalni gradijent `ellipse 85% 75% at 50% 35%`, `--sukno-1` → `--sukno-2` (55 %) → `--sukno-3` |
| Karte u lepezi i na pločicama | `public/cards/*.webp` — prave karte, ne crtež |

## 3. Raspored (360×740, bez skrolovanja)

Odozgo:

1. **Marka** — mali logo (24 px, rotiran −8°) + „Kartaonica" 15 px Archivo Black, `--card-face` 85 %. Visina 30 px. Nema zupčanika.
2. **Sto igre** (glavna igra)
   - radius 26 px; tanak mesingan obrub `0 0 0 1.5px` `--accent` 55 % + sjena `0 16px 34px` crno 55 %.
   - unutra samo tamnije dno: `transparent 50%` → `--surface` 55 %.
   - **lepeza 3 prave karte** (Žandar: J♠ Q♥ K♦), širina karte **84 px** (jedna igra) / **64 px** (ima „Još igara"), rotacija ±16°, sjena; lepeza blago „diše" ±1° (isključeno uz `prefers-reduced-motion`).
   - naslov igre dolje lijevo: 38 px Archivo Black, velika slova, `--card-face`, sjena; ispod meta 14 px („2 ili 4 igrača · ~10 min"). Greška traženja stola stoji na mjestu mete.
   - Zakačena igra: pilula „Zakačeno" dolje desno na stolu.
   - **Na stolu nema podešavanja.**
   - Visina: **258 px** kad je jedna igra, **186 px** kad ima „Još igara"; na nižem ekranu sto se smanjuje (dugmad i pločice nikad).
3. **Igraj** — jedina glasna radnja, 60 px, radius 14 px, mesingani gradijent; lijevo „**Igraj**" 20 px 700 i ispod „protiv drugih igrača" 12 px 600 (75 %), desno strelica. Otvara **izbor stola** (§5), pa za sto.
4. **Napravi sto** — druga radnja, 56 px, radius 14 px, pozadina `--card-face` 4 %, unutrašnji obrub `--turn-active` 55 %; lijevo ikona prijatelja (`--turn-active`), pa „**Napravi sto**" 17 px 700 i „i pozovi prijatelje" 12 px (75 %). Vodi na `/create`.
5. **Naslov sekcije** — „USKORO · DODIRNI ZVONO DA TI JAVIMO" ili „JOŠ IGARA": 12 px 700, razmak slova .12em, `--turn-active` 85 %.
6. **Pločice igara** — dvije u redu (grid 1fr 1fr, razmak 10 px), radius 16 px:
   - svaka igra ima svoju boju: **Poker** bordo, **Raub** tamnoplava, **Žandar** sukno (kad nije glavna);
   - gore desno 2 male prave karte (38 px), dolje lijevo ime (20 px Archivo Black, velika slova) i meta (12 px);
   - **NOVO**: pilula gore lijevo, `--danger-signal` pozadina;
   - **Uskoro**: ista pločica, zasićenost 55 %, karte 55 % providne, bez mete; dolje desno zvono 44 px. Cijela pločica je „Javi mi" (jedna prijava za sve najavljene).
   - Visina 112 px (dostupne) / 96 px (uskoro). Od 4. igre novi red i skrol liste ispod stola.
7. **Donja navigacija** — 64 px, pozadina `--nav-bg`, gornja linija `--card-face` 8 %. Neaktivan tab `--card-face` 62 %, 13 px. **Aktivan tab: samo mesingan tekst i ikona (`--turn-active`) + crtica gore**, bez pilule.

## 4. Tokeni

```
--bg-top:    #1b1713;   --bg-mid: #14110e;   --bg-bottom: #100d0b;   /* pozadina ekrana */
--sukno-1:   #2f6b59;   --sukno-2: #1d4a3e;  --sukno-3:   #14352c;   /* sto: centar, sredina, ivica */
--nav-bg:    #0f0c0a;                                                 /* donja navigacija */
--game-poker-1: #7a2a20;  --game-poker-2: #3e1611;   /* iz --card-ink-red, tamnije */
--game-raub-1:  #2a5276;  --game-raub-2:  #14283c;   /* iz --team-a, tamnije */
--game-zandar-1:#2c6152;  --game-zandar-2:#10302a;   /* sukno */
```

- Boja igre ide u `lib/games.ts` kao ključ (`tint: "poker"`), ne kao heks u komponenti.
- Sukno se zove `--sukno-*`, ne `--felt-*`: ne miješa se sa postojećim `--felt` (pozadina igre) i `felt.css`.

## 5. Brza igra — izbor stola

- **Igraj otvara list „Brza igra · Žandar"**: broj igrača (2 / 4), do koliko se igra (11 / 21), izgled stola — zadnji izbor je označen (prvi put **4 · 21 · Klasik**). „Igraj" u listu sačuva izbor i kreće za sto; „Sačuvaj i zatvori" (i zatvaranje) samo čuva. Odluka vlasnika 2026-10-24, poslije K1: izbor mora biti pri ruci kad se igra protiv drugih igrača.
- Isti izbor se mijenja i u **Postavke → „Brza igra"** (`SettingsSheet`, otvara se iz Profila): ista polja, svaka promjena se čuva odmah.
- Ime se i dalje traži samo prvi put (list sa imenom), nalog sa nadimkom ide pod nadimkom.
- Na stolu i na početnoj nema reda podešavanja — izbor živi u listu iza Igraj.

## 6. Šta se ne mijenja

- List igre, Zakači, Javi mi, analitika (`upcoming_games_viewed`), `homeLayout`.
- Mete ≥44 px; animacije samo transform/opacity.
- Web zadržava tihi red „Privatnost · Uslovi · O nama" na dnu (Google), APK ne.

## 7. Kriteriji prihvatanja

- [x] Snimak na 360×740 odgovara tabli K1 sa jednom i sa tri igre.
- [x] Ništa ne izlazi iz ekrana i nema skrola na 360×740 i 390×844 (1, 2 i 3 igre, web i APK).
- [x] Nema novih heks boja van tokena iz §4.
- [x] Tekst ima kontrast ≥4.5:1 (marka 11.8, naslov sekcije 7.5, pravni red 10.8, meta na stolu 10.1, greška 5.0, traka 7.1 / 10.4).
- [x] Donja navigacija izgleda isto na Igraj, Prijatelji i Profil.
- [x] Igraj otvara izbor (2/4, 11/21, sto) sa zadnjim izborom označenim; isti izbor u Postavkama → Brza igra.
- [x] Dug list (Postavke) ostaje u ekranu: naslov gore, Zatvori dolje, sredina skroluje.
- [ ] Provjereno na uređaju.
