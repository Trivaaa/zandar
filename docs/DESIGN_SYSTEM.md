# Kartaonica — Design System v2.0

> Žandar (prvi game) · mobile-first + PWA · ijekavica
> Bazira se na: PRD v2.0 + PRD v3.0 (AI sloj / Brza partija)
> Zamjenjuje: UX plan v1.1

## Dva noseća principa

1. **Struktura prije skina.** Gradiš UX sa neutralnim design tokenima. Ex-Yu UI dolazi kasnije kao zamjena vrijednosti tokena, ne strukture.
2. **Frontend je bot-agnostičan.** Klijent NIKAD ne zna ko je bot. Bot se renderuje identično kao čovjek — i to je upravo ono što čini iluziju. Nema "bot mode" u UI-ju. (Detalji: Sekcija 7.)

Alat ostaje: tvoj kod + ovaj spec su source of truth. Bez Figme/Lovable. Claude Design samo kao throwaway skica.

---

## 1. Layout sistem — pozicijski (mobile-first)

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

### 1.4 Seat chip (kompaktni igrač)

Zamjena za trenutne velike panele. Visina ~56px umjesto ~150px. Renderuje se IDENTIČNO za čovjeka i bota. Sadrži:
- Avatar (krug)
- Ime (truncate)
- Badge broja karata u ruci (npr. `4`) — NE renderovati 4 velike poleđine
- Brojač kupljenih karata (mali)
- Turn ring + timer kad je na potezu
- Connection status (`connected` / `reconnecting` / `auto-play`) — botovi su uvijek `connected`
- 4P: suptilni team-color border

Bočni protivnici (4P) su uža varijanta: avatar + count badge + turn ring, bez punog imena ako nema mjesta (ime u tooltip/expand).

### 1.5 CSS Grid + safe areas

Koristi **CSS Grid sa named areas** (`partner`, `oppL`, `oppR`, `table`, `hand`), po broju igrača se mijenjaju areas. Glavni shell poštuje notch/home-indicator: `viewport-fit=cover` + `padding-top: var(--safe-top)` / `padding-bottom: var(--safe-bottom)`.

---

## 2. Information architecture — tri ulaza

Home sad ima tri puta (PRD v3 uvodi Brzu partiju):

| Ulaz | Šta radi | Za koga |
|------|----------|---------|
| **Brza partija** | Odmah te stavi za sto (prazna mjesta = botovi), partija kreće bez čekanja | Cold-start / kad nema prijatelja online — retention safety net |
| **Kreiraj sobu** | Privatna soba + invite link (WhatsApp/Viber) | Viralni motor — friend-graph distribucija |
| **Pridruži se** | Ulaz u privatnu sobu preko linka/koda (sa host approval) | Pozvani prijatelj |

**Strateška napomena (bitno):** Brza partija je mreža za hvatanje (igraj odmah, bez praznog stola), ali **Kreiraj sobu je tvoj viralni loop**. Ne dozvoli da Brza partija sahrani create/invite tok. Oba ostaju vizuelno jaka na home-u. Korisnik koji dođe preko invite linka i dalje ide pravo u sobu (preskače home).

Rute:
- `/` — Home (tri ulaza)
- `/zandar/brza` — Brza partija (matchmaking → redirect na sto)
- `/zandar/room/:id` — Lobby ili sto (privatna soba)
- `/rules` — Pravila

---

## 3. Component inventory

Neutralno stilizovano (tokeni), jasna stanja. Game-agnostic gdje može (kartaonica shell vs Žandar-specific).

| Komponenta | Tip | Stanja / napomena |
|------------|-----|-------------------|
| `Home` | shell | tri CTA: Brza partija (primary), Kreiraj sobu, Pridruži se |
| `QuickMatchScreen` | shell | tranzicija <2s, neutralna, drop u sto (vidi 7.3) |
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

1. **Fluid tap, NE drag, NE confirm dugme.** Tap karte u ruci = selekcija/lift. **Destinacijski tap je potvrda:**
   - Trail: tap kartu → tap prazan dio stola.
   - Jednoznačan capture: tap kartu → tap grupu/sto → izvrši odmah.
   - Više opcija: svaka validna grupa je zasebno tapabilna; tap grupe = izvrši taj capture.
   - Force capture: trail blokiran kad postoji obavezan capture (inline poruka).
   - Undo se **ne gradi** (multiplayer trošak); destinacijski tap je dovoljna zaštita. Revidiraj samo ako playtest pokaže J-misklik rage.
2. **Capture highlight.** Selektovana karta → validne grupe na stolu zasvijetle prije nego potvrdiš.
3. **Turn clarity.** Aktivni čip = turn ring + timer NA čipu. Tvoja ruka glow kad je tvoj red, dim kad nije.
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

Samo četiri stvari: home ulaz, quick-match tranzicija, host toggle u privatnom lobby-ju, i glatka zamjena identiteta na sjedištu. Sve ostalo je server.

### 7.3 QuickMatchScreen (tranzicija, <2s)

- Cilj iz PRD-a: za sto za < 2s. Pošto se prazna mjesta pune botovima, **NEMA pravog čekanja**.
- **NE prikazuj "tražim igrače (2/4 pronađeno)"** — to (a) postavlja očekivanje human matchmakinga i (b) "našao 3 igrača za 1.5s" je sumnjivo brzo i potkopava iluziju.
- Umjesto toga: neutralna kratka tranzicija — "Pripremamo sto…" + suptilna animacija / skeleton stola → padneš u partiju. Drži pod pragom gdje korisnik počne brojati sekunde.

### 7.4 Host toggle u privatnoj sobi

- U `Lobby` (host view): switch **"Popuni prazna mjesta botovima"**.
- Rješava "imamo 3 od 4, Marko ne dolazi" — host popuni sjedište botom umjesto da otkaže veče.
- Host-facing kontrola. Popunjeno sjedište se renderuje kao normalan igrač (random ime/avatar iz generatora).
- Default: OFF (privatne sobe ostaju friends-only dok host ne uključi).

### 7.5 Tiha zamjena identiteta (bot → čovjek)

- Kad realan igrač uskoči na bot sjedište (na granici ruke), `SeatChip` na tom sjedištu **glatko promijeni identitet** (ime + avatar), bez najave. (PRD v3 open Q4 default = tiha zamjena.)
- Frontend NE zna da je "bilo bot" — samo prima novi `PublicPlayer` za to sjedište. Tranzicija treba biti vizuelno meka (fade imena/avatara), ne hard cut, da ne zazvuči kao bug.

### 7.6 Bot reactions i timing

- Botovi šalju reactions kroz **postojeći** `game:reaction` kanal i `ReactionFab` sistem — frontend ih prikazuje identično ljudskim. Nema frontend promjene.
- Bot delay/timing je server-side (1.2–5.5s). Frontend samo prikazuje turn ring/timer kao i za čovjeka. Botovi nikad ne padaju na timer.

### 7.7 Coins / ekonomija

Van opsega ovog UX prolaza. PRD ih spominje samo kao etičku granicu (kozmetika, neunovčivo). Ne gradimo coins UI sad.

---

## 8. Što NE gradimo sad

- Ex-Yu vizuelni identitet (Faza 2).
- Coins / ekonomija UI.
- Eksplicitni single-player ("igraj protiv računara") ekran — Should-have, jeftin kad bot engine postoji, ali ne sad.
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
Grace indikator na čipu (0–30s), pause banner + "Sačekaj još" (30s–2min), abandon-vote modal (2min+). Poveži sa phase i abandonVotes.
Acceptance: tri stanja jasna; tokom pauze gameplay blokiran, reactions off.
```

### Faza C — Brza partija + bot sloj

**C1. Home — tri ulaza.**
```
Redizajniraj Home na tri CTA: "Brza partija" (primary, vodi na /zandar/brza), "Kreiraj sobu" (privatna soba + invite link), "Pridruži se" (ulaz preko koda/linka). Brza partija i Kreiraj sobu su oba vizuelno jaka (ne sahranjuj create/invite tok). Tokeni, bez UI eksperimenata.
Acceptance: tri jasna ulaza; primary je Brza partija; create/invite ostaje prominentan.
```

**C2. QuickMatchScreen.**
```
Napravi tranziciju za /zandar/brza: korisnik bira broj igrača (2/3/4) i opciono target score, klikne Igraj → neutralna kratka tranzicija "Pripremamo sto…" (skeleton stola) → redirect na sto kad backend vrati room. NE prikazuj "tražim igrače (X/Y)" ni broj pronađenih — neutralno, brzo.
Acceptance: nema human-matchmaking copy; tranzicija kratka; padne u partiju koja kreće odmah.
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

Mijenjaš samo vrijednosti tokena. Smjer: kafana/felt sto (topliji zeleni, suptilna tekstura, drvo + zlato akcenti — žuti CTA već nagovještava), klasične čitke karte (regionalni špil, autentičnost kasnije), folk motivi štedljivo, topla čitka tipografija sa karakternim display fontom za brand. Ton: "klasična kartaška sa rajom — sad i online" — toplo, prijateljski, nostalgično. Bot iluzija pomaže ovom tonu: stolovi uvijek "živi", imena domaća.

---

## 11. Redoslijed (TL;DR)

1. Faza A (tokeni + pozicijski grid) → temelj.
2. Faza B, prvo B1–B2 (SeatChip + pozicije) → **rješava 4P responsive bug.** Stani, provjeri na pravom telefonu.
3. Ostatak Faze B (interakcija, timer, score, reactions, edge-ovi) → core loop.
4. Faza C (Brza partija + bot sloj) → cold-start rješenje; mali frontend posao jer je bot server concern.
5. Faza D (PWA + reconnect) → prije Faze 1 playtesta.
6. Faza 2 UI → tek kad UX prođe Fazu 2 playtest (human-only metrici, ne bot-padded).

> Pažnja iz PRD v3: go/no-go za mobile se računa na **human-only** brojkama. Botovi čine loop testabilnim na nuli, ali bot-padded engagement nije PMF.