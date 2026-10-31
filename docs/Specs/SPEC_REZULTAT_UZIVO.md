# SPEC — Rezultat uživo na stolu (koncept B: „vijest u traci")

> Dizajn: Claude Design platno „Kartaonica · identitet", tabla **UI · Rezultat uživo — koncept B**. Slike: `docs/Specs/rezultat-b/` (`b-b1…b-b6` ekrani, `b-0…b-1700…` kadrovi animacije).
> **Poštuj postojeći UI.** Ovo nije novi izgled stola: zadrži sto, sjedišta, karte, `FeltHeader`, `TurnBanner`, `SeatCaption`, `ScorePill` razradu, boje i tokene kakvi su sad u kodu. Slike pokazuju *šta* i *gdje*; boje i veličine uzmi iz postojećih tokena (team-a / team-b / accent / surface), ne iz slika.
> Pravila iz CLAUDE.md i SPEC_IDENTITET G1–G8 važe: ijekavica, mete ≥44 px, animacije samo transform/opacity uz `prefers-reduced-motion`, nigdje „bot/AI".

## 1. Šta se mijenja

1. **Rezultat je stalno na stolu** — traka u `FeltHeader` umjesto današnjeg „Runda N" čipa.
2. **Mala (2♣) i velika (10♦)** — kad ih neko odnese, traka se na 1,5 s pretvori u kratku vijest u boji tima, pa se vrati rezultat sa **+1** uz taj tim.
3. **Kraj dijeljenja** — traka 1,5 s kaže „Kraj dijeljenja · Mi +3 · Oni +1", brojevi se promijene, pa ide postojeći `RoundEndOverlay`.
4. **Dodir na traku** — panel sa detaljima ispod trake; igra ne staje.
5. **Zvuk i vibracija** prelaze iz gornjeg desnog ugla (`FeedbackToggles` u `rightSlot`) dolje desno, iznad dugmeta za reakcije (slika `b-b1`).

## 2. Traka rezultata (slika `b-b1`, `b-b3`)

- Jedan red, visina 44 px, u `FeltHeader` između menija i desne ivice.
- Lijevo malo polje: „Runda 3" / „do 21". Blizu kraja (nekome fali ≤5): umjesto „do 21" piše „fali N" akcentom.
- Desno: `● Mi 7 : 12 Oni ●` — tačke u bojama timova (team-a = Mi, team-b = Oni). Broj onoga ko vodi je u akcent boji.
- **„Mi / Oni" iz ugla igrača** (u 4P), ne „Tim A / Tim B". 2P: „Ti 7 : 12 {ime}" (ime skraćeno sa „…"). 3P: tri polja „Ti 7 · Goga 12 · Rade 3", bez boja timova.
- **+N uz tim** (pilula u boji tima) = osigurano u ovom dijeljenju (mala/velika), u broj ulazi tek na kraju dijeljenja. Ukupni broj se usred dijeljenja ne mijenja.
- Cijela traka je jedno dugme → otvara detalje (§5). `aria-label`: „Rezultat: Mi 7, Oni 12. Dodirni za detalje."

## 3. Timovi

Samo **prsten oko avatara** u boji tima (plavo = Mi, roze = Oni; igrač na potezu zadržava svoj postojeći sjaj) + iste boje uz Mi/Oni u traci. **Bez** oznaka MI/ONI, bez brojača pokupljenih karata na stolu, bez tačaka uz sjedišta.

## 4. Vijest u traci (slike `b-b2`, `b-b4`, `b-b6` i kadrovi)

| Događaj | Naslov | Podnaslov | Desno | Boja | Vibracija |
|---|---|---|---|---|---|
| naš tim nosi 2♣ | **Mala je naša!** | `{ime} · na kraju dijeljenja` | `+1` | team-a | da, jedna laka |
| njihov tim nosi 2♣ | **Mala ide njima** | `{ime} · na kraju dijeljenja` | `+1` | team-b | ne |
| naš tim nosi 10♦ | **Velika je naša!** | isto | `+1` | team-a | da |
| njihov tim nosi 10♦ | **Velika ide njima** | isto | `+1` | team-b | ne |
| kraj dijeljenja | **Kraj dijeljenja** | `karte, trefovi, mala, velika` | `Mi +3` `Oni +1` | akcent | ne |

- 2P/3P: „Mala je tvoja!" / „Mala ide {ime}" (bez roda).
- Lijevo sličica karte (postojeća slika karte), lijevi rub trake 4 px u boji tima, ispod trake linija 3 px u boji tima koja se prazni za 1,5 s.
- Na stolu: samo sjaj karte koja je odnesena (postojeći capture flash), ništa ne leti.
- **Vremenska linija:** 0 ms događaj → 0–200 ms crossfade rezultat→vijest (opacity + pomak teksta 6 px) → 200–1700 ms vijest stoji, linija `scaleX 1→0` → 1700–1900 ms crossfade nazad, +1 ostaje.
- Dva događaja zaredom: red čekanja, jedan za drugim (nikad dva istovremeno).
- `prefers-reduced-motion`: bez pomaka i linije, vijest samo zamijeni rezultat na 1,5 s.
- Vijest je `aria-live="polite"`. Zvuk (ako je uključen): jedan tihi zvuk samo za naš tim.
- Žandar (J nosi sve) nije bodovni događaj: bez vijesti (postojeći „sweep" efekat ostaje).

## 5. Detalji na dodir (slika `b-b5`)

- Panel se spušta **ispod trake**, pokriva samo gornji dio stola; ruka, `TurnBanner` i dugmad ostaju dostupni. Igra ne staje.
- Sadržaj: naslov „Rezultat"; ukupno `● Mi 7` · „igra se do 21 / runda 3" · `Oni 12 ●`; zatim „Ovo dijeljenje" sa kolonama Mi / Oni:
  - Najviše karata (2 poena) — `14 · 9`, ko vodi u pilu boje tima
  - Mak — najviše trefova (1 poen) — `5 · 3`
  - Mala (2 tref) (1 poen) — `+1 · —`
  - Velika (10 karo) (1 poen) — `— · +1`
- Natpisi su **isti kao u `sr.score`** (`mostCards`, `mostClubs`, `twoOfClubs`, `tenOfDiamonds`) — jedan izvor.
- Zatvara se: ×, dodir van panela, ili kad igrač odigra kartu. Android „nazad" zatvara panel (`useBackHandler`).
- „Rezultat" stavka u `GameMenuSheet` više ne treba (traka je ulaz).

## 6. Podaci

- `GameEvent` `capture` već postoji (`playerId`, `jackSweep`). Dodaj koja bodovna karta je odnesena, npr. `scoring?: "twoOfClubs" | "tenOfDiamonds"` (izvesti u `deriveGameEvents` iz razlike `captured` između snimaka).
- Za +N i detalje klijent treba po pile-u: broj karata (postoji: `capturedCounts`), **broj trefova** i **ko ima 2♣ / 10♦**. To je javna informacija (svi vide šta je odneseno), ali danas je možda nema u `PublicPlayer`/stanju — provjeri i dodaj minimalno, bez otkrivanja karata u ruci.
- Tim pile: postojeći `pileIdOf` / `pilesOf` (`team-0` / `team-1`); „Mi" = pile igrača.

## 7. Tekstovi (`sr.ts`)

| Ključ | Tekst |
|---|---|
| `score.barRound` | `Runda {n}` |
| `score.barTarget` | `do {cilj}` |
| `score.barNear` | `fali {n}` |
| `score.we` / `score.they` | `Mi` / `Oni` |
| `score.newsOursSmall` | `Mala je naša!` |
| `score.newsTheirsSmall` | `Mala ide njima` |
| `score.newsOursBig` | `Velika je naša!` |
| `score.newsTheirsBig` | `Velika ide njima` |
| `score.newsSub` | `{ime} · na kraju dijeljenja` |
| `score.newsHandEnd` | `Kraj dijeljenja` |
| `score.newsHandEndSub` | `karte, trefovi, mala, velika` |
| `score.detailsTitle` | `Rezultat` |
| `score.thisHand` | `Ovo dijeljenje` |
| `score.barAria` | `Rezultat: Mi {a}, Oni {b}. Dodirni za detalje.` |

## 8. Kriteriji prihvatanja

- [ ] Na 360×740 i 390×844 traka staje u jedan red (i sa +1 kod oba tima), zaglavlje nije više nego danas.
- [ ] Odnesena 2♣ / 10♦ → vijest 1,5 s u boji tima, pa +1 ostaje; ukupni broj se mijenja tek na kraju dijeljenja.
- [ ] Vibracija samo za naš tim; ništa za protivnike; ništa za J sweep.
- [ ] Dodir na traku otvara detalje dok je igrač na potezu, i može odigrati kartu bez zatvaranja.
- [ ] Na stolu nema MI/ONI oznaka, brojača ni tačaka; timovi se razlikuju po prstenu.
- [ ] `prefers-reduced-motion` poštovan; vijest čitaju čitači ekrana.
- [ ] Postojeći `RoundEndOverlay` i razrada rade kao do sada.
