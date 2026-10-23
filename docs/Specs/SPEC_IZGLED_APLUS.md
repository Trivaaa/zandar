# SPEC — Izgled aplikacije, pravac A+ (v1)

> Izvor dizajna: Claude Design platno „Kartaonica · identitet" (https://claude.ai/artifact/1DkTrJNEv2148shhQUC3de), tabla **Pravac A+ · Kafanski sto, čitljivo** (`PravacAplus.dc.html`, tri ekrana: Početna, Moj profil, Sto za 4 igrača). Table pod naslovom „Faza 2 — dizajn (pravac A+)" (`UI_*`) su isti pravac primijenjen na tokove iz SPEC_IDENTITET.
> Odnos prema drugim specovima: **SPEC_POCETNA važi za raspored početne** (šta je na njoj), ovaj spec za **izgled** (boje, veličine, dugmad, traka). Gdje se tabla A+ i SPEC_POCETNA razilaze (zupčanik na početnoj), važi SPEC_POCETNA.
> Važe globalna pravila G1–G8 iz `SPEC_IDENTITET.md`: ijekavica i „ti", mete ≥44 px, animacije samo transform/opacity, samo tokeni iz `globals.css`, nigdje „bot/AI/računar".

## 1. Šta je A+

„Toplina pravca A, čitljivost pravca B." Isti kafanski izgled koji aplikacija već ima (felt zelena, mesing, Archivo Black + IBM Plex Sans), uz četiri promjene:

1. **Krupnije** — dugmad, tekst u listama i donja traka rastu za 2–4 px.
2. **Jači kontrast sekundarnog teksta** — umjesto zelenkaste `--text-muted` ide krem `--text` sa providnošću (85 % / 75 %).
3. **Jedan ukras manje** — nema ornamentalne linije ispod naslova, podnaslov nije kurziv.
4. **Jasna traka poteza** za stolom — puna mesing traka „Ti si na potezu · 23" iznad ruke.

Paleta i fontovi se **ne mijenjaju** — sve boje sa table već postoje kao tokeni (vidi §2). Ovo je izmjena veličina i nekoliko komponenti, ne novi design system.

## 2. Tokeni

### 2.1 Boje — postojeće, mapiranje sa table

| Hex na tabli | Token |
|---|---|
| `#131e1b` | `--surface` |
| `#1b3a34` | `--felt` |
| `#245046` | `--surface-raised` |
| `#10302a` | `--card-back` (traka, obod stola) |
| `#f2efe6` | `--text` |
| `#f7f3e8` | `--card-face` (naslovi u Archivo Black) |
| `#c9a227` | `--accent` |
| `#e0b93a` | `--turn-active` (akcija u redu, sat poteza) |
| `#16221f` | `--accent-contrast` / `--card-ink` |
| `#e4714a` | `--danger-signal` |
| `#5a9bd3` / `#cc6b92` | `--team-a` / `--team-b` |

### 2.2 Novi tokeni (`globals.css`, `:root`)

```css
/* Sekundarni tekst A+: krem sa providnošću, ne zelenkasta muted. */
--text-soft:  color-mix(in oklab, var(--text) 85%, transparent); /* podnaslovi, napomene */
--text-faint: color-mix(in oklab, var(--text) 75%, transparent); /* labele u redu („Nadimak") */
/* Mesing obrub — kartice i traka. */
--accent-line: color-mix(in oklab, var(--accent) 35%, transparent);
```

Uz mapiranje u `@theme inline` (`--color-soft`, `--color-faint` → utility `text-soft`, `text-faint`, po uzoru na `--color-muted`). `--text-muted` ostaje za mjesta koja ovaj spec ne dira (tajmer, legal red, skeleton).

Izmjereni kontrasti (WCAG): `--text-soft` na feltu 8.2:1, `--text-faint` na redu liste 5.5:1, `--turn-active` na redu 5.1:1, tamni tekst na mesingu 6.8:1. **`--danger-signal` na `--felt` je 4.0:1 — ispod 4.5**; „Obriši nalog" zato stoji samo na donjem, tamnijem dijelu ekrana (`--surface`, 5.5:1), nikad na feltu.

### 2.3 Pozadina ekrana

Svi ekrani van stola (početna, profil, prijatelji, listovi preko punog ekrana) dobijaju istu pozadinu:

```css
background: radial-gradient(ellipse 110% 70% at 50% 30%,
  var(--surface-raised) 0%, var(--felt) 45%, var(--surface) 100%);
```

Zamjenjuje sadašnji `background-image` u `.home` (`home.css`) i ide i na `.profile` (profil i prijatelji). Jedno pravilo `.screen.home, .screen.profile` u `funnel.css` — bez izmjene TSX-a; novi ekran sa donjom navigacijom se dodaje u taj selektor.

## 3. Komponente

Vrijednosti su sa table (360×740). U kodu rem (`px / 16`).

### 3.1 Primarno dugme — `.home__cta` i svako „Igraj"

| | Sada | A+ |
|---|---|---|
| min. visina | 3.5rem (56) | **4.125rem (66)** |
| font | 700 `--type-xl` (20) | **700 1.4375rem (23)** |
| radijus | `--radius-lg` (14) | isto |
| pozadina | `--accent` | isto (bez gradijenta) |
| sjenka | — | `inset 0 -3px 0 rgb(22 34 31 / .25), 0 6px 16px rgb(0 0 0 / .35)` |
| strelica | 1.4rem | 1.5rem, potez 2.4 |

### 3.2 Sekundarno dugme — `.home__friends` i svako „S prijateljima"

| | Sada | A+ |
|---|---|---|
| min. visina | 3.5rem | **4rem (64)** |
| obrub | 1.5px, krem 55 % | **2px `--accent`** |
| pozadina | `--surface` 50 % | `--surface` 60 % |
| font | 700 `--type-lg` (18) | **700 `--type-xl` (20)** |

### 3.3 Napomena ispod dugmeta — `.home__note`

`400 1rem/1.35`, boja **`--text-soft`** (bilo `--text-muted`), margina gore −6px (napomena „pripada" dugmetu iznad).

### 3.4 Naslov igre i podnaslov — `.home__title`, `.home__tagline`

- Naslov: ostaje Archivo Black, verzal, boja `--card-face`, sjenka `0 2px 0 var(--card-back), 0 6px 18px rgb(0 0 0 / .5)`. Na tabli 54px; kod već ima `clamp(2.75rem, 14vw, 4.25rem)` — zadržati.
- Podnaslov: `400 1.1875rem/1.3` (19), **nije kurziv**, boja `--text`.
- Nema ornamentalne linije (`.orn` iz pravca A) — ako postoji u kodu, ukloniti.

### 3.5 Zaglavlje — `.brand`

Logo (mesing romb 22px) + „Kartaonica" Archivo Black 1.3125rem (21). Ikonična dugmad u zaglavlju (ako ih ekran ima): 52×52, radijus 8, obrub 1.5px `--accent`, ikona `--turn-active`. **Na početnoj nema zupčanika** (SPEC_POCETNA §6).

### 3.6 Donja navigacija — `.tabbar` (`profile.css`)

Najvidljivija promjena: aktivna stavka je **puna mesing pločica**, ne samo mesing tekst.

| | Sada | A+ |
|---|---|---|
| `--tabbar-h` | 4rem (64) | **4.5rem (72)** |
| pozadina | `--surface` | **`--card-back`** |
| gornja ivica | 1px muted 25 % | `box-shadow: inset 0 1px 0` mesing 45 % |
| neaktivna | `--text-muted`, 500 13px | **`--text` uz `opacity: .8`, 400 0.9375rem (15)** |
| aktivna | `--accent` tekst, 700 | **pozadina `--accent`, tekst `--accent-contrast`, 700, `margin: 8px 6px`, radijus 12px** |
| ikona | 1.6rem | 1.5rem (24), potez 1.75 |

Bedž (`.tabbar__badge`) na aktivnoj pločici: zamijeniti boje (`--accent-contrast` pozadina, `--accent` tekst), inače nestaje u mesingu. Fokus prsten aktivne stavke: `--text`, ne `--accent`.

Pazi: visina trake je dio budžeta visine početne (SPEC_POCETNA §2 — bez skrolovanja na 360×740). Krupnija dugmad (+18 px) i traka (+8 px) plaća **gustina 3** kartice igre: ilustracija `clamp(2.25rem, 5dvh, 5rem)` i tješnji razmaci u kartici; dugmad ostaju pune visine. Izmjereno (changelog 94): sav sadržaj iznad trake u 12/12 slučajeva.

### 3.7 Kartica identiteta — `.profile__card`

*Važi za karticu gosta.* Moj profil sa nalogom zadržava centrirani raspored sa table `UI_MojProfil` (avatar 120 px iznad imena) — od A+ uzima samo tipografiju imena i podnaslova.

Red: avatar 96px + nadimak (Archivo Black 1.625rem / 26, `--card-face`) + podnaslov („12 završenih partija", 400 1.0625rem / 17, `--text-soft`). Kartica: padding 14, radijus 14, pozadina `--card-back` 70 %, `box-shadow: inset 0 0 0 1px var(--accent-line)`.

### 3.8 Red liste — profil, postavke, prijatelji

| | A+ |
|---|---|
| min. visina | **4rem (64)** |
| razmak između redova | 8px (odvojene pločice, ne spojena lista) |
| padding | 6px 14px |
| radijus | 12px |
| pozadina | `--surface-raised` 85 % |
| labela („Nadimak") | 400 0.875rem (14), `--text-faint` |
| vrijednost („Zvonko") | 600 1.125rem (18), `--text` |
| akcija desno („Promijeni ›") | 700 1.0625rem (17), `--turn-active`, strelica 20px — *u kodu bez strelice, zadržano podvlačenje* (dugme nema ikonu u JSX-u; bez podvlačenja ne bi izgledalo kao akcija) |
| red sa ikonom (Postavke, Odjavi se) | ikona 24px lijevo, tekst kao vrijednost, strelica 22px desno |

Cijeli red je jedno dugme / link (`<button>` ili `<a>`), ne div.

### 3.9 Opasna akcija — „Obriši nalog"

Tekst-dugme na dnu (`margin-top: auto`), centrirano, min. visina 3.25rem (52), padding 0 16, 700 1.0625rem (17), `--danger-signal`, podvučeno (`text-underline-offset: .2em`). Vidi §2.2 za pozadinu.

### 3.10 Sto (`GameScreen`, `felt.css`)

Felt slike (`TABLE_THEMES`) i raspored sjedišta se **ne mijenjaju** — gradijent na tabli je samo zamjena za sliku klasičnog stola.

| Element | A+ |
|---|---|
| Ikonična dugmad zaglavlja (meni, reakcije) | krug 48px, pozadina `--surface` 70 %, ikona `--text` |
| Rezultat u zaglavlju („Runda 3 · 14:9") | pilula, 700 1rem, pozadina `--surface` 90 %, `inset 0 0 0 1px` mesing 50 %, tekst `--text` |
| Ime ispod avatara (`.seat__name`) | pilula `--surface` (puna, ne providna), **600 0.9375rem (15)**, `--text`, maks. 96px, trotačka |
| Prsten avatara | 52px (moj 56px), pozadina `--surface`, `inset 0 0 0 1px var(--accent-line)`; tim: `inset 0 0 0 3px` `--team-a`/`--team-b` 85 % |
| Igrač na potezu | prsten `inset 0 0 0 3px var(--turn-active)` + sjaj `0 0 18px 6px` `--turn-active` 55 % |
| **Traka poteza** (novo) | između mog sjedišta i ruke, centrirana; visina 2.875rem (46), pilula, pozadina `--accent`, tekst `--accent-contrast` 700 1.1875rem (19) „Ti si na potezu", desno broj sekundi 700 1.25rem; sjenka `0 6px 16px rgb(0 0 0 / .35)` |

**Otvoreno pitanje — traka poteza vs. pilula tajmera.** Danas tajmer je pilula iznad avatara onoga ko je na potezu (CLAUDE.md, „Timer = pilula iznad avatara"). Tabla A+ pokazuje traku samo za tebe. Prijedlog: kad si **ti** na potezu, traka zamjenjuje pilulu iznad tvog avatara (broj sekundi je u traci, boja trake ide zeleno → narandžasto → crveno kao pilula danas); kad je na potezu neko drugi, ostaje pilula iznad njegovog avatara. Traka zauzima visinu, pa ide uz mjerenje budžeta `--stage-*`. **Treba odluka vlasnika prije koraka 4.**

## 4. Redoslijed implementacije

Svaki korak je zaseban commit i ne lomi ostale ekrane.

1. **Tokeni + pozadina** — §2.2, §2.3 (`globals.css`, `funnel.css`, `home.css`, `profile.css`).
2. **Dugmad i početna** — §3.1–3.5 (`home.css`, `HomeHero`, `GameCard`, `GameSheet`, `QuickPlaySheets`). Isti stil dugmadi i u listovima („Igraj" u sheetu igre i u V5).
3. **Donja traka + profil** — §3.6–3.9 (`profile.css`, `TabBar`, `ProfileScreen`, `AccountProfile`, `GuestProfile`, `SettingsSheet`, prijatelji). Ekrani iza `identityUi` dobijaju isto.
4. **Sto** — §3.10 (`felt.css`, `GameScreen`, `TurnTimer`), poslije odluke iz §3.10.

Ručni CSS ostaje u `layer(components)`; JSX ne nosi konkurentne `text-*`/`bg-*` utility klase na elementima čiju boju drži CSS.

## 5. Kriterijumi prihvatanja

- Nijedan novi hex u komponentama; svi novi tokeni iz §2.2 mapirani u `@theme`.
- Mete ≥44 px; dugmad i redovi u visinama iz tabela.
- Kontrast teksta ≥4.5:1 (mjereno, ne procijenjeno), uključujući bedž na aktivnoj stavci trake.
- Početna H1–H3 i dalje bez skrolovanja na 360×740 sa trakom 39 px i trakom od 72 px (CDP mjerenje).
- Sto: nijedan piksel `--stage-*` budžeta ne prelazi izmjerenu vrijednost; obod podloge i dalje pada kroz avatare (8 slučajeva kao u changelogu 87–88).
- `prefers-reduced-motion`: ništa novo ne animira van `--t-*` tokena.
- Typecheck, lint = osnovica, web testovi zeleni; na kraju S10e (`dev:android`) — ocjena okom, uporedo sa tablom.
