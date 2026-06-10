# Kartaonica — Design System v3.2

> **Naziv igre: Tablić - Žandar** (prvi game) · mobile-first + PWA · ijekavica
> Bazira se na: PRD v2.0 + PRD v3.2 (AI sloj / Brza partija + home/matching redizajn)
> Zamjenjuje: Design System v2.0

---

## Changelog (v2.0 → v3.1)

| Promjena | Opis |
|----------|------|
| Naziv igre | Igra se zove **Tablić - Žandar** (ranije referencirana samo kao "Žandar") |
| Home hijerarhija | "Igra – nađi sto" je sad **dominantni primarni** CTA; "Kreiraj svoj sto" je **jak sekundarni** (ne zakopan — viralni loop ostaje). "Pridruži se" tercijarni. Vidi §2, §9 C1 |
| Brza partija pojednostavljena | Korisnik upisuje **samo ime**; fiksno **4 igrača, target 21**. Izbor broja igrača / target score-a **uklonjen** iz Quick Play-a (ostaje samo u "Kreiraj svoj sto"). Vidi §7.3, §9 C2 |
| Matching ekran (pomireno) | Sjedišta se **popunjavaju imenima/avatarima** (živo), ALI **bez brojača "X/Y pronađeno" i bez "tražim igrače" framinga** — kao "sto se postavlja", ne kao pretraga. Vidi §7.3 |
| Remember name | Povratni korisnik preskače unos imena → "Nađi sto" je jedan tap. Vidi §7.3, §9 C2 |
| Single-player IZBAČEN | Bio Should-have; sada van scope-a (Quick Play sa lakim botovima je vježba). Vidi §8 |

> **Dvije svjesne tenzije pomirene u ovoj verziji** (originalni v2.0 ih je drugačije postavljao): (1) dominantni "Nađi sto" vs. zaštita viralnog create/invite loop-a; (2) živ matching ekran sa imenima vs. pravilo "ne odaj matchmaking brojačem". Vidi §2 i §7.3 za rezonovanje.

---

## Changelog (v3.1 → v3.2 — in-game raspored, posle playtesta na telefonu)

| Promjena | Opis |
|----------|------|
| **Full-felt raspored** umjesto boxed grid-a | Implementirano po referentnim card-game aplikacijama: **cijeli ekran je felt** (bez kutija), igrači plutaju po ivicama, centralna **play-zona** za odigrane karte, ruka kao **lepeza (fan)** na dnu. Zamjenjuje pozicijski *grid sa named-areas* (§1.1/§1.5). Orijentacija igrača (ti dole / partner gore / protivnici lijevo-desno) **ostaje** ista. Komp.: `GameScreen` + `SeatBubble` + `HandFan` + `TableArea bare`; matching već koristi isti felt jezik (`MatchingTable`). |
| **Poleđine karata se prikazuju** (revizija §1.4) | Protivnicima se broj karata prikazuje kao **lepeza poleđina** (generičke, bez info-leak-a) — kao u referencama. Ranije pravilo "NE renderovati poleđine" je **opozvano** (bila kozmetička odluka; backs su anonimne pa ne krše anti-leak). |
| **Tap-to-play** (dopuna §4.1) | 1. tap karte = selekcija/lift + highlight opcija; **2. tap iste karte = izvrši jednoznačan potez** (trail / jedan capture). Destinacijski tap na stolu i dalje radi; drugi-tap je pouzdan fallback (touch promašaji). Više opcija → tapni grupu na stolu. |
| **Turn timer = pilula iznad avatara** (revizija §4.3) | Horizontalna **pilula IZNAD ikonice** igrača (ne preko badge-a broja karata), fill se prazni; **3 stanja: zeleno 100→50%, narandžasto 50→20%, crveno <20%**. Prikazuje se SAMO iznad aktivnog igrača i prelazi na sljedećeg čim odigra. **Na SVAKOM igraču** (i botu): server šalje rok poteza za svaki potez (puni timeout; bot odigra brzo unutar toga → anti-leak konzistentno). Mijenjao prijašnji broj/traku pa luk. |
| **Desktop UX** (dopuna §1) | In-game se centrira u **felt-stage `max-w-[600px]`** s tamnom podlogom okolo; play-zona šira na `md:`. Sve preko `max-w`/`md:` → mobilni nepromijenjen. |
| **Faza C/D status** | C1/C2/C4 ✅ (anti-leak straža `lib/antiLeak.ts`); C3 (host bot-fill) preostaje. **Faza D ✅** (D1 PWA: manifest/ikone/SW-samo-statika/install; D2 reconnect: visibilitychange/online → re-subscribe). Persistence soba (file-snapshot; Postgres adapter kasnije). |

> Napomena: §1.1 i §1.5 (grid sa named-areas) su **superseded** za in-game ekran full-felt pristupom; ostaju kao istorijska referenca. `GameTable`/`TableSeats` (grid) i dalje postoje za `/dev/table`, ali live igra koristi `GameScreen` felt-canvas.

---

## Dva noseća principa

1. **Struktura prije skina.** Gradiš UX sa neutralnim design tokenima. Ex-Yu UI dolazi kasnije kao zamjena vrijednosti tokena, ne strukture.
2. **Frontend je bot-agnostičan.** Klijent NIKAD ne zna ko je bot. Bot se renderuje identično kao čovjek — i to je upravo ono što čini iluziju. Nema "bot mode" u UI-ju. (Detalji: Sekcija 7.)

Alat ostaje: tvoj kod + ovaj spec su source of truth. Bez Figme/Lovable. Claude Design samo kao throwaway skica.

---

## 1. Layout sistem — pozicijski (mobile-first)

> ⚠️ **v3.2:** in-game ekran je implementiran kao **full-felt canvas** (cijeli ekran felt, igrači po ivicama, centralna play-zona, ruka-lepeza), NE kao grid sa named-areas. Vidi changelog v3.1→v3.2. Orijentacija igrača ispod (ti dole / partner gore / protivnici lijevo-desno) i dalje važi; mijenja se samo *kako* se renderuje (apsolutno pozicioniranje na feltu umjesto CSS grid kutija). §1.5 (grid) je superseded.

### 1.1 Tri zone + pozicije

Sto je uvijek **centar i heroj** ekrana. Ti si **uvijek dole**. Protivnici su raspoređeni oko stola po konvenciji koju igrači već znaju (kao za pravim stolom) — NE kao vertikalna lista panela (to je bug u trenutnom buildu).

```
4 igrača (2v2):              3 igrača:                  2 igrača:
   [   PARTNER   ]            [opp]      [opp]            [    opp    ]
[opp][  STO  ][opp]          [    STO    ]               [    STO    ]
   [  TVOJA RUKA ]           [ TVOJA RUKA ]              [ TVOJA RUKA]
```

| Igrača | Raspored protivnika |
|--------|---------------------|
| 2 | 1 protivnik gore-centar |
| 3 | 2 protivnika u gornjim uglovima (lijevo/desno) |
| 4 (2v2) | **partner gore-centar**, protivnici lijevo i desno (uz sto, gornja trećina ivice) |

Raspored prati clockwise red od tebe: partner je preko stola (gore), protivnici lijevo/desno po redoslijedu poteza. Partnerstvo se čita prostorno (centar/preko) + bojom tima.

### 1.2 Jedan model na svim veličinama

Nema dva odvojena layouta. Isti pozicijski grid; skaliraš veličinu čipova. Na širem ekranu (landscape/desktop) bočni protivnici i sto dobijaju više vazduha; raspored ostaje isti.

**Guardrail za uske telefone (≤360px):** bočni čipovi su kompaktni (avatar puck, ne panel). Ako sto zagrči, **karte na stolu se prelome u dva reda** — to rješava tjeskobu bez vraćanja na "sve gore". (Sto ionako naraste preko 4 karte kako igra teče.)

### 1.3 Overlay-i (ne troše layout prostor)

- **Score pill** — gornji ugao, kompaktan, tap otvara breakdown.
- **Reactions FAB** — donji desni ugao, tap širi 8 emojija.

### 1.4 Seat chip / Seat bubble (kompaktni igrač)

Renderuje se IDENTIČNO za čovjeka i bota. Dvije realizacije:
- **`SeatChip`** (pill, ~56px) — za grid layout / `/dev` previewe.
- **`SeatBubble`** (krug) — **in-game (full-felt) standard, v3.2**: kružni avatar + count badge + turn ring + timer + team-color border + connection status.

Sadrži:
- Avatar (krug; inicijal dok nema slike)
- Ime (truncate)
- **Broj karata** — count badge **+ lepeza poleđina** (v3.2; generičke, bez info-leak-a). *(Ranije pravilo "NE renderovati poleđine" je opozvano — vidi changelog.)*
- Brojač kupljenih karata (mali)
- Turn ring + **timer pilula iznad avatara** (3 stanja: zeleno/narandžasto/crveno na 50%/20%) kad je na potezu
- Connection status (`connected` / `reconnecting` / `auto-play`) — botovi su uvijek `connected`
- 4P: suptilni team-color border

Bočni protivnici (4P) su uža varijanta: avatar + count + turn ring, bez punog imena ako nema mjesta.

### 1.5 CSS Grid + safe areas

Koristi **CSS Grid sa named areas** (`partner`, `oppL`, `oppR`, `table`, `hand`), po broju igrača se mijenjaju areas. Glavni shell poštuje notch/home-indicator: `viewport-fit=cover` + `padding-top: var(--safe-top)` / `padding-bottom: var(--safe-bottom)`.

---

## 2. Information architecture — tri ulaza (nova hijerarhija)

Home ima tri puta, ali sa jasnom hijerarhijom (v3.1):

| Ulaz | Hijerarhija | Šta radi | Za koga |
|------|-------------|----------|---------|
| **Igra – nađi sto** | **Primarni (dominantni)** | Upišeš ime → odmah te stavi za sto (prazna mjesta = botovi), partija kreće bez čekanja. Fiksno 4 igrača / target 21 | Cold-start / kad nema prijatelja online — retention safety net |
| **Kreiraj svoj sto** | **Sekundarni (jak, vidljiv)** | Privatna soba + invite link (WhatsApp/Viber). Podtekst: *"Privatni sto samo za tebe i prijatelje."* Ovdje se bira broj igrača + target score | Viralni motor — friend-graph distribucija |
| **Pridruži se** | Tercijarni | Ulaz u privatnu sobu preko linka/koda (sa host approval) | Pozvani prijatelj |

**Strateška napomena (bitno — i tenzija koju namjerno balansiramo):** "Nađi sto" je dominantni CTA jer rješava cold-start i daje trenutni loop. ALI "Kreiraj svoj sto" je **tvoj viralni loop** (invite = friend-graph rast) i zato ostaje **jak, jasno vidljiv sekundarni** — vizuelno odmah ispod primarnog, NE zakopan u meni ili sitnim linkom. Ne dozvoli da dominantni "Nađi sto" sahrani create/invite tok. Korisnik koji dođe preko invite linka i dalje ide pravo u sobu (preskače home).

Rute:
- `/` — Home (tri ulaza, nova hijerarhija)
- `/zandar/brza` — Igra–nađi sto (matchmaking → redirect na sto)
- `/zandar/room/:id` — Lobby ili sto (privatna soba)
- `/rules` — Pravila

---

## 3. Component inventory

Neutralno stilizovano (tokeni), jasna stanja. Game-agnostic gdje može (kartaonica shell vs Žandar-specific).

| Komponenta | Tip | Stanja / napomena |
|------------|-----|-------------------|
| `Home` | shell | tri CTA sa hijerarhijom: **Igra–nađi sto (primary, dominantno)**, Kreiraj svoj sto (jak sekundarni), Pridruži se (tercijarni) |
| `QuickMatchScreen` | shell | samo unos imena (ili preskoči ako zapamćeno) → matching tranzicija u kojoj se sjedišta popunjavaju → drop u sto (vidi 7.3) |
| `GameTable` | shell+žandar | phase: playing / paused / scoring / finished |
| `SeatChip` | shell | idle / active / reconnecting / auto-play / disconnected; team A/B. **Bot-agnostičan.** Glatka zamjena identiteta na granici ruke (bot→čovjek, vidi 7.5) |
| `TableArea` (Sto) | žandar | normal / capture-highlight; karte se prelamaju u 2 reda po potrebi |
| `HandArea` | žandar | not-your-turn (dim) / your-turn (glow) / card-selected |
| `Card` | žandar | face / back / selectable / selected / captured |
| `ScorePill` | shell | collapsed / expanded breakdown |
| `TurnTimer` | shell | živi NA aktivnom čipu/ruci |
| `ReactionFab` | shell | collapsed / expanded (8 emojija) / cooldown |
| `CaptureSelector` | žandar | single (auto na destinacijski tap) / multi (tap target grupu) |
| `Lobby` (host) | shell | player list, pending requests, kick, **toggle "Popuni botovima"** (7.4) |
| `Lobby` (joiner) | shell | čeka odobrenje / čeka start |
| Modali | shell | join, abandon-vote, end-hand, end-match |

**Game-agnostic (reuse za sljedeći game):** `Home`, `QuickMatchScreen`, `SeatChip`, `ScorePill`, `TurnTimer`, `ReactionFab`, `Lobby`, modal shell.
**Žandar-specific:** `Card`, `TableArea`, `HandArea`, `CaptureSelector`. Ne apstrahuj dublje dok ne kreneš drugi game.

---

## 4. Interakcijski patterni (standardi, ne izmišljanje)

1. **Fluid tap, NE drag, NE confirm dugme.** Tap karte u ruci = selekcija/lift. **Potvrda poteza (v3.2 — dva pouzdana puta):**
   - **Drugi tap iste karte** = izvrši jednoznačan potez (trail / jedan capture). Pouzdan na touchu.
   - **Destinacijski tap** na stolu: trail = tap prazan/sto; jednoznačan capture = tap grupu; više opcija = svaka grupa zasebno tapabilna.
   - Force capture: trail blokiran kad postoji obavezan capture (inline poruka).
   - Undo se **ne gradi** (multiplayer trošak); potvrda tapom je dovoljna zaštita. Revidiraj samo ako playtest pokaže J-misklik rage.
2. **Capture highlight.** Selektovana karta → validne grupe na stolu zasvijetle prije nego potvrdiš.
3. **Turn clarity.** Aktivni igrač = turn ring + **timer pilula iznad avatara** (zeleno 100→50% / narandžasto 50→20% / crveno <20%), prikazana SAMO na onom ko je na potezu (i na botovima). Tvoja ruka glow kad je tvoj red, dim kad nije.
4. **Reactions kao FAB.** Floating dole-desno, ne stalna traka.
5. **Score kao pill.** Gornji ugao, tap širi breakdown.
6. **Touch feedback preko `active:`, ne `hover:`** (hover se zaglavi na touchu; `hover:` samo iza `@media (hover: hover)`).

---

## 5. Stanja i edge-ovi (mapirano na PRD)

- **Grace (0–30s):** indikator na čipu, partija teče, auto-play ako istekne timer.
- **Auto-play:** čip `1/3`, `2/3`; potez "(auto)" u logu. **Botovi NIKAD ne okidaju auto-play** (server-driven, uvijek odigraju).
- **Pauza (30s–2min):** banner "⏸ Čeka se [ime] 1:23" + "Sačekaj još". Reactions onemogućene.
- **Abandon vote (2min+):** modal "Sačekaj još 5 min" / "Završi meč".
- **Povratak iz pozadine (kritično za WhatsApp/Viber):** na fokus → re-subscribe socket + fetch svjež state. Ako je auto-play odigrao dok te nije bilo → jasno "(auto) odigrano dok te nije bilo".
- **Brza partija — čovjek ode iz stola sa botovima:** sto se raspušta bez glasanja (nema koga čekati; PRD v3 open Q5 default).

---

## 6. Design tokens (seam za UI kasnije)

```css
:root {
  --surface:#18181b; --surface-raised:#232327; --felt:#1f3a2e;
  --text:#f4f4f5; --text-muted:#a1a1aa;
  --accent:#e0a92e; --accent-contrast:#1a1a1a;
  --team-a:#3b9e75; --team-b:#c2603a;
  --turn-ring:var(--accent); --danger:#d24b4b; --success:#3b9e75; --warn:#e0a92e;
  --radius-sm:6px; --radius-md:10px; --radius-lg:14px;
  --safe-top:env(safe-area-inset-top,0px);
  --safe-bottom:env(safe-area-inset-bottom,0px);
}
```

Pravilo bez izuzetka: **nijedna komponenta nema hardkodiranu hex vrijednost.** Sve preko tokena → Ex-Yu UI dolazi kao swap, ne rewrite. Mapiraj u Tailwind (`bg-surface`, `text-muted`, `bg-accent`, `ring-turn`, `bg-team-a/b`, `pt-safe-top`, `pb-safe-bottom`). Viewport: `viewport-fit=cover`.

---

## 7. Brza partija + bot sloj (UX)

Ovo je novi sloj iz PRD v3. Pravac razmišljanja: **gotovo sve je server concern.** Frontend mijenja iznenađujuće malo, jer botovi prolaze kroz isti public-state pipeline kao ljudi.

### 7.1 Zlatno pravilo: frontend nikad ne zna za bota

- `PublicPlayer` NE SADRŽI `isBot` ni `botProfile`. Bot stiže klijentu identično kao čovjek (`displayName`, `avatar`, `seatIndex`, score, `handCounts`).
- Zato `SeatChip`, imena, avatari, timing i reactions renderuju bota IDENTIČNO — bez ijedne grane `if (isBot)`.
- **Bilo koji frontend kod koji pokušava da detektuje/grana po botu je bug I leak vektor.** Bot-leak je isto curenje skrivene informacije kao tuđa ruka.
- Posljedica: ~90% komponenti iz Sekcije 3 se NE mijenja za botove. To je dobra vijest.

### 7.2 Šta se zapravo mijenja na frontendu

Samo četiri stvari: home ulaz (nova hijerarhija), quick-match tranzicija (samo ime → matching populate), host toggle u privatnom lobby-ju, i glatka zamjena identiteta na sjedištu. Sve ostalo je server.

### 7.3 QuickMatchScreen (samo ime → matching, <2–3s)

Tok (v3.1):
1. Korisnik upisuje **samo ime** (povratni korisnik preskače — ime zapamćeno na uređaju → jedan tap).
2. **Bez izbora konfiguracije** — fiksno 4 igrača, target 21.
3. Matching tranzicija → padneš u partiju koja kreće.

**Kako izgleda matching (pomireno pravilo):** pošto se prazna mjesta pune botovima, nema pravog čekanja, ali sto se prikazuje kako se **postavlja i popunjava**:
- Sjedišta se popunjavaju imenima/avatarima jedan po jedan (iz generatora §39 PRD-a) — daje osjećaj žive, pune sobe.
- **Copy je "Pripremamo sto…" / "Igrači sjedaju…"**, NE "Tražimo igrače".
- **NEMA brojača "X/Y pronađeno"** i NEMA framinga human-matchmakinga.
  - Zašto: brojač "našao 3 igrača za 1.5s" je sumnjivo brzo i odaje fake matchmaking; takođe postavlja pogrešno očekivanje (da čekaš ljude).
- Stagger je blag i kratak, ali **ne instant** — mikro-ritam "sjedanja" pojačava osjećaj pravog stola. Drži ispod praga gdje korisnik počne brojati sekunde.

> Suština pomirenja: **živost (imena se pojavljuju) DA, "pretraga igrača" (brojač/search copy) NE.** Razlika je u framingu — "sto se postavlja", ne "tražim ti protivnike".

**Nove design-system komponente za matching:**
- Matching layout sa 4 seat placeholdera koji se popunjavaju.
- "Seat fill" animacija (avatar + ime, staggered, mek fade-in).
- Neutralni progress/skeleton stola u stilu brenda.

### 7.4 Host toggle u privatnoj sobi

- U `Lobby` (host view): switch **"Popuni prazna mjesta botovima"**.
- Rješava "imamo 3 od 4, Marko ne dolazi" — host popuni sjedište botom umjesto da otkaže veče.
- Host-facing kontrola. Popunjeno sjedište se renderuje kao normalan igrač (random ime/avatar iz generatora).
- Default: OFF (privatne sobe ostaju friends-only dok host ne uključi).

### 7.5 Tiha zamjena identiteta (bot → čovjek)

- Kad realan igrač uskoči na bot sjedište (na granici ruke), `SeatChip` na tom sjedištu **glatko promijeni identitet** (ime + avatar), bez najave. Copy nigdje ne kaže "bot" — vidi i PRD §38.4 ("[nickname] je otišao").
- Frontend NE zna da je "bilo bot" — samo prima novi `PublicPlayer` za to sjedište. Tranzicija treba biti vizuelno meka (fade imena/avatara), ne hard cut, da ne zazvuči kao bug.

### 7.6 Bot reactions i timing

- Botovi šalju reactions kroz **postojeći** `game:reaction` kanal i `ReactionFab` sistem — frontend ih prikazuje identično ljudskim. Nema frontend promjene.
- Bot delay/timing je server-side, bend po situaciji (prvi potez 3–5s / normalno 2.5–7s / zadnja karta 1.5–2.5s; vidi PRD §41.1). Frontend samo prikazuje turn ring/timer kao i za čovjeka. Botovi nikad ne padaju na timer.

### 7.7 Coins / ekonomija

Van opsega ovog UX prolaza. PRD ih spominje samo kao etičku granicu (kozmetika, neunovčivo). Ne gradimo coins UI sad.

---

## 8. Što NE gradimo sad

- Ex-Yu vizuelni identitet (Faza 2).
- Coins / ekonomija UI.
- **Eksplicitni single-player ("igraj protiv računara") ekran — IZBAČEN (PRD v3.2).** Ne gradi. Quick Play sa lakim onboarding botovima već služi kao vježba.
- "Regulari" persona pool (post-MVP polish).
- Suspected-bot report dugme (Could-have).
- Drag-and-drop sjedišta, named slots (post-MVP).
- Drugi game (shell spreman, ne apstrahuj dublje).

---

## 9. Claude Code — build sekvenca

Radi redom, verifikuj acceptance prije sljedećeg. Radimo UX, NE UI — samo tokeni, bez hardkodiranih boja. Ne diraj backend/socket osim gdje je traženo. Prilagodi putanje (`apps/web/...`).

### Faza A — Temelj

**A1. Tokeni + Tailwind + safe-area + hover.**
```
Dodaj globalni token sloj (CSS varijable iz Sekcije 6, uključujući safe-area). Mapiraj u Tailwind (bg-surface, text-muted, bg-accent, ring-turn, bg-team-a/b, pt-safe-top, pb-safe-bottom). Postavi viewport-fit=cover u root layout. Uključi hover-only-when-supported (Tailwind v3 future flag; v4 default). Ne mijenjaj logiku komponenti.
Acceptance: promjena --accent mijenja sve accent elemente; nema hex u novom kodu; hover se ne lijepi na touchu.
```

**A2. Pozicijski grid shell.**
```
Refaktoriši GameTable na CSS Grid sa named areas (partner, oppL, oppR, table, hand). Po broju igrača mijenjaj grid-template-areas: 2P (opp gore-centar), 3P (oppL/oppR gornji uglovi), 4P (partner gore-centar, oppL/oppR uz sto). Isti grid skalira na svim veličinama. table karte se prelamaju u 2 reda po potrebi. Shell poštuje safe-area padding. Zasad placeholder blokovi.
Acceptance: 2P/3P/4P imaju tačan raspored; na 375px sve staje bez scrolla, sto centriran; na ≤360px karte se prelamaju umjesto da prelivaju.
```

### Faza B — Sto i interakcija

**B1. SeatChip (bot-agnostičan).**
```
Napravi SeatChip ~56px. Props: displayName, avatar, cardCount, capturedCount, isCurrentTurn, connectionStatus, teamId?, missedTurns. Turn ring + timer slot kad je aktivan. Team-color border u 4P. NE renderuj poleđine karata. VAŽNO: komponenta NE zna i NE prima isBot — renderuje svaki igrač identično. Podrži glatku promjenu displayName/avatar (fade) ako se identitet sjedišta promijeni.
Acceptance: čip ~56px; sva stanja se razlikuju; promjena imena/avatara je meka, ne hard cut; nigdje grananje po botu.
```

**B2. Popuni pozicije SeatChip-ovima.**
```
Renderuj SeatChip u oppL/oppR/partner area prema broju igrača (1/2/3 protivnika; partner u centru u 4P, team-color). Bočni čipovi su uža varijanta. Poveži sa public game state-om (ime, avatar, count, čiji red, connection, teamId).
Acceptance: raspored tačan po broju igrača; aktivni ima turn ring; partner odvojen bojom tima.
```

**B3. HandArea + Card (fluid tap).**
```
HandArea (dole) + Card. Tap = selekcija/lift; potez se NE izvršava dok ne dođe destinacijski tap. Stanja: not-your-turn (dim) / your-turn (glow) / selected. Card: face/back/selectable/selected. Touch feedback active:, ne hover:. Tap karte zove getPossibleMoves i pali highlight na stolu.
Acceptance: tap pouzdan, nema drag, nema stuck hover; selekcija ne izvršava potez sama.
```

**B4. Capture/trail bez confirm dugmeta.**
```
Highlight validnih grupa na stolu. Trail = tap prazan sto. Jednoznačan capture = tap grupu → izvrši. Više opcija = svaka grupa zasebno tapabilna → tap izvrši taj capture. Force capture: blokiraj trail kad capture postoji (inline poruka). NE gradi undo.
Acceptance: nijedan potez ne traži zaseban confirm/"Odigraj"; destinacijski tap je potvrda; trail blokiran kad treba.
```

**B5. TurnTimer na čipu.**
```
TurnTimer unutar aktivnog SeatChip-a i u hand zoni kad je tvoj red. Countdown + promjena boje. Poveži sa turn/auto-play state-om.
Acceptance: timer samo na aktivnom; boja se mijenja pred istek.
```

**B6. ScorePill.**
```
Overlay u gornjem uglu. Collapsed pill; tap → breakdown (najviše karata, trefovi, 2♣, 10♦). Po igraču (2P/3P) ili po timu (4P).
Acceptance: ne troši layout; tap toggluje; radi za sve player count-ove.
```

**B7. ReactionFab.**
```
Floating dole-desno, zamijeni stalnu traku. Tap → 8 emojija → emit game:react. Cooldown 2s (disabled + countdown). Onemogući tokom pause/abandon. (Bot reactions stižu kroz isti game:reaction event i prikazuju se identično — ne radi ništa posebno za njih.)
Acceptance: ne troši stalni prostor; cooldown vidljiv; onemogućen u pauzi.
```

**B8. Pause/abandon overlay.**
```
Grace indikator na čipu (0–30s), pause banner + "Sačekaj još" (30s–2min), abandon-vote modal (2min+). Poveži sa phase i abandonVotes. (Napomena: za turn-based, hard pause i vote su minimalni; obavezni dio je da klijent renderuje abandoned stanje + offline indikator — ne ostavljaj prazno.)
Acceptance: tri stanja jasna; tokom pauze gameplay blokiran, reactions off; abandoned stanje se vidi (ne prazan ekran).
```

### Faza C — Brza partija + bot sloj

**C1. Home — tri ulaza, nova hijerarhija.**
```
Redizajniraj Home na tri CTA sa hijerarhijom: "Igra – nađi sto" (PRIMARNI, dominantni, vodi na /zandar/brza), "Kreiraj svoj sto" (JAK SEKUNDARNI, vidljiv odmah ispod primarnog, podtekst "Privatni sto samo za tebe i prijatelje", vodi na privatnu sobu + invite link), "Pridruži se" (tercijarni, ulaz preko koda/linka). Dominantni je vizuelno najjači, ali sekundarni NE smije biti zakopan (viralni loop). Tokeni, bez UI eksperimenata.
Acceptance: "Nađi sto" je vizuelno dominantan; "Kreiraj svoj sto" je jasno vidljiv jak sekundarni (ne sitni link); tri jasna nivoa.
```

**C2. QuickMatchScreen — samo ime → matching populate.**
```
Napravi tok za /zandar/brza: korisnik upisuje SAMO ime (ili preskoči ako je ime zapamćeno na uređaju → jedan tap) → klikne "Igra – nađi sto". BEZ izbora broja igrača i target score-a (fiksno 4 igrača, target 21). Zatim matching tranzicija u kojoj se sjedišta popunjavaju imenima/avatarima jedan po jedan (mek fade, blag stagger), copy "Pripremamo sto…" / "Igrači sjedaju…". NE prikazuj brojač "X/Y pronađeno" ni "tražim igrače" — frame je "sto se postavlja", ne pretraga. Redirect na sto kad backend vrati room. Persistuj ime lokalno.
Acceptance: nema izbora konfiguracije; nema human-matchmaking copy ni brojača; sjedišta se popunjavaju (živo) bez search framinga; povratni korisnik preskače unos imena; padne u partiju koja kreće.
```

**C3. Host bot-fill toggle.**
```
U Lobby (host view) dodaj switch "Popuni prazna mjesta botovima", default OFF. Kad je ON, prazna sjedišta se popune (backend vraća igrače sa imenom/avatarom — frontend ih tretira kao obične igrače). Host može pokrenuti partiju i sa popunjenim mjestima.
Acceptance: toggle radi; popunjeno sjedište se renderuje kao normalan igrač; start dozvoljen kad je sto pun (ljudi + botovi).
```

**C4. Anti-leak verifikacija.**
```
Provjeri i osiguraj da frontend NIGDJE ne čita ni očekuje isBot/botProfile. Dodaj dev assert/test: primljeni PublicPlayer payload ne sadrži isBot/botProfile. Ukloni svaku eventualnu granu koja bi tretirala bota drugačije.
Acceptance: nema reference na isBot u web kodu; test pada ako payload procuri bot polje.
```

### Faza D — PWA + reconnect

**D1. PWA minimal.**
```
Manifest (kartaonica.com), ikone, service worker SAMO za statiku (nikad API/state), install/update prompt.
Acceptance: instalabilno; SW kešira samo statiku.
```

**D2. Page-lifecycle reconnect.**
```
Slušaj visibilitychange (visible), pagehide/pageshow, online/offline. Na povratak: debounce ~500ms, re-subscribe socket, fetch svjež private state (server authoritative). Auto-play tokom odsustva jasno označi na povratku.
Acceptance: background→foreground vraća živu konekciju i state bez ručnog refresha; nema duplog reconnecta.
```

---

## 10. UI smjer za Fazu 2 (Ex-Yu) — orijentacija, ne gradi sad

Mijenjaš samo vrijednosti tokena. Smjer: kafana/felt sto (topliji zeleni, suptilna tekstura, drvo + zlato akcenti — žuti CTA već nagovještava), klasične čitke karte (regionalni špil, autentičnost kasnije), folk motivi štedljivo, topla čitka tipografija sa karakternim display fontom za brand. Ton: "klasična kartaška sa rajom — sad i online" — toplo, prijateljski, nostalgično. Bot iluzija pomaže ovom tonu: stolovi uvijek "živi", imena domaća, sjedišta se popunjavaju pred tobom.

---

## 11. Redoslijed (TL;DR)

1. Faza A (tokeni + pozicijski grid) → temelj.
2. Faza B, prvo B1–B2 (SeatChip + pozicije) → **rješava 4P responsive bug.** Stani, provjeri na pravom telefonu.
3. Ostatak Faze B (interakcija, timer, score, reactions, edge-ovi) → core loop.
4. Faza C (Brza partija + bot sloj + nova home hijerarhija + matching populate) → cold-start rješenje; mali frontend posao jer je bot server concern.
5. Faza D (PWA + reconnect) → prije Faze 1 playtesta.
6. Faza 2 UI → tek kad UX prođe Fazu 2 playtest (human-only metrici, ne bot-padded).

> Pažnja iz PRD v3: go/no-go za mobile se računa na **human-only** brojkama. Botovi čine loop testabilnim na nuli, ali bot-padded engagement nije PMF.
