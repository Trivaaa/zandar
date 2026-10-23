# SPEC — Početna (v1)

> Izvor dizajna: Claude Design platno „Kartaonica · identitet", tabla **UI · Početna — od jedne do tri igre** (H1–H6) i ekran V5 sa table *UI · Početna v2*.
> Slike ekrana: `docs/Specs/pocetna/*.png`. Oznake (H1, H4…) su iste kao na platnu.
> Važe sva globalna pravila iz `SPEC_IDENTITET.md` (G1–G8): ijekavica i „ti", mete ≥44 px, animacije samo transform/opacity, samo tokeni iz `globals.css`, nigdje „bot/AI/računar", bez novca i uloga.

## 1. Cilj

Početna vodi do partije **jednim dodirom** i spremna je za više igara (danas Žandar, sljedeće Poker pa Raub) bez promjene rasporeda.

## 2. Raspored

Odozgo nadolje, bez skrolovanja na 360×740 (sa trakom od 39 px za kameru i donjom navigacijom):

1. **Zaglavlje** — logo + „Kartaonica". **Bez zupčanika** (postavke su u Profilu, §6).
2. **Kartica glavne igre** — ilustracija, naziv igre (Archivo Black), red „2 ili 4 igrača · ~10 min", dugme **Igraj** (primarno), red podešavanja (§4), dugme **S prijateljima** (sekundarno).
3. **Još igara** — ostale dostupne igre kao redovi (§5). Nema ih dok postoji samo jedna igra.
4. **Uskoro** — jedan red za sve najavljene igre + dugme **Javi mi** (§7). Nema ga kad nijedna igra nije najavljena.
5. Donja navigacija (Igraj aktivan).

**Uklanja se sa početne:** 4 pločice budućih igara (`UpcomingGames`), red prodavnica (`StoreRow`), podnožje sa pravnim linkovima na Androidu.

Slike: H1 (jedna igra), H2 (dvije), H3 (tri).

## 3. Koja igra je glavna (velika kartica)

1. Zakačena igra (§5.2), ako postoji.
2. Inače zadnja igrana.
3. Inače (novi igrač) Žandar.

Ilustracija se smanjuje kad ima više igara, da sve stane bez skrolovanja. Kad bude 4+ igara, lista „Još igara" se skroluje, kartica ostaje ista.

## 4. Igraj = odmah za sto

- **Igraj** pokreće brzu igru za glavnu igru sa **zadnjim podešavanjima te igre**. Prvi put: 4 igrača · do 21 · Klasik.
- Nema forme prije partije. Današnja forma `/igraj` (`quickPlaySetupPath`) se više ne prikazuje prije svake igre.
- **Ime:** ako igrač nema sačuvano ime, prvi put se otvara list „Kako da te zovemo?" na samoj početnoj (jedno polje + **Nađi sto**), pa odmah dalje za sto. Poslije toga nikad više. *Odstupanje od prvobitnog `/ime`, odluka vlasnika 2026-10-23 — igrač ne napušta početnu; `/ime` ostaje za izmjenu imena iz Postavki.* Igrač s nalogom ide pod nadimkom, bez lista.
- **Red podešavanja** odmah ispod Igraj: `4 igrača · do 21 · Klasik ✎` (meta ≥44 px). Dodir otvara sheet **Brza igra · {igra}**: broj igrača, igra se do, izgled stola, pa **Igraj** i **Sačuvaj i zatvori** (slika V5). Isti izbori kao današnja forma, samo u sheetu.
- Sačuvana podešavanja važe po igri, lokalno na uređaju (kao danas).

## 5. Ostale igre

### 5.1 Red igre
Mala karta sa slovom i znakom, naziv, oznaka **NOVO**, red „broj igrača · trajanje", strelica. Cijeli red je jedno dugme (≥76 px).
Redoslijed: zakačene → po zadnjoj igri → neigrane.
**NOVO** stoji 7 dana od objave igre ili dok je igrač prvi put ne odigra.

Dodir na red **ne pokreće partiju** — otvara sheet igre (H4): naziv i opis, **Igraj**, **S prijateljima**, **Pravila**, **Zakači na vrh**, Zatvori.

### 5.2 Zakačena igra
- „Zakači na vrh" u sheetu igre → ta igra postaje glavna kartica sa oznakom **Zakačeno** (H5).
- Samo **jedna** zakačena igra. Novo kačenje zamjenjuje staro. Otkačinje se istim dugmetom u sheetu („Otkači").
- Čuva se lokalno (kao ostala podešavanja).

## 6. Postavke se sele u Profil

- Zupčanik sa početne se uklanja.
- Tab **Profil** dobija red **Postavke** — i za gosta i za igrača s nalogom (gost ga danas nema). Otvara postojeći `SettingsSheet` (H6).
- U `SettingsSheet` dolaze: zvuk, vibracija, **Preuzmi aplikaciju** (samo web, umjesto `StoreRow`), Pravila igara, Privatnost · Uslovi korišćenja · O nama.
- **Izuzetak, web:** početna na webu zadržava jedan tihi red „Privatnost · Uslovi · O nama" na dnu sadržaja (Google OAuth provjera traži link na politiku privatnosti sa početne). Na Androidu ga nema.

## 7. Uskoro

- Jedan red: „Uskoro: Poker i Raub" + „Javimo ti kad stigne." + **Javi mi** (zvono).
- Javi mi koristi postojeći tok prijave za buduće igre (`/igre/[slug]`, `SignupForm`, `_signups`). Ako najava ima više igara, jedna prijava (jedan e-mail) važi za sve navedene.
- Igra koja postane dostupna prelazi iz „Uskoro" u „Još igara" sa oznakom NOVO.

## 8. Podaci (bez servera za sada)

Lista igara je konfiguracija u kodu, npr. `lib/games.ts`:
`{ slug, name, letter, suit, players, duration, status: "live" | "upcoming", releasedAt }`.
Danas: `zandar` live; `poker`, `raub` upcoming. Dodavanje igre = novi red u konfiguraciji, raspored se ne dira.

## 9. Desktop

Ista kolona do 600 px, ilustracija do 220 px visine. (Dvije kolone iz v2 nisu dio ovog zadatka.)

## 10. Kriteriji prihvatanja

- [ ] Na 360×740 i 390×844 ništa ne izlazi iz ekrana, bez skrolovanja za 1, 2 i 3 igre.
- [ ] Novi igrač: Igraj → (`/ime` ako nema ime) → matching, bez forme podešavanja.
- [ ] Igrač s imenom: Igraj → matching jednim dodirom, sa zadnjim podešavanjima.
- [ ] Red podešavanja pokazuje stvarna podešavanja i otvara sheet; promjena se pamti.
- [ ] Sa konfiguracijom od 1 igre izgleda kao H1; dodavanjem `poker` kao live izgleda kao H2.
- [ ] Zakači/Otkači radi i preživljava restart aplikacije.
- [ ] Na početnoj nema zupčanika, `UpcomingGames` pločica ni `StoreRow`; Postavke se otvaraju iz Profila (gost i nalog).
- [ ] Web ima red pravnih linkova na dnu početne; APK nema.
- [ ] Analitika: postojeći događaji (`upcoming_games_viewed` itd.) i dalje se šalju sa novih elemenata.
