# Žandar Multiplayer Web MVP — PRD v2

> **Verzija:** 2.0
> **Status:** Spremno za razvoj (Section 30 zatvorena)
> **Datum:** 2026-05-16
> **Jezik:** ijekavica

---

## Changelog (v1 → v2)

| Sekcija | Promjena |
|---------|----------|
| 3 MVP Scope | 2 igrača → **2–4 igrača**; dodate reactions |
| 6 Pravila igre | Sekcija 30 zatvorena; svi defaulti potvrđeni |
| 6.12 | Target score **11 → 21** |
| 6.13 | Nova podsekcija: tim setup za 4 igrača (2v2) |
| 7 Core flows | Update invite flow (host approval); dodat reactions flow |
| 8 FR | Dodati FR-015 (reactions), FR-016 (abandon), FR-017 (host approval) |
| 9 UX | Update lobby (pending approvals); reactions panel u game table |
| 12 State model | Dodati `teamId`, `pendingJoinRequests`, `reactions` |
| 18 Scoring | Update za tim scoring u 4-player |
| 19 API | Dodati join-request / approve / reject / react endpoints |
| 23 Errors | Novi error codes (JOIN_PENDING, NOT_APPROVED, ABANDONED) |
| 28 Backlog | Reactions iz Could-have u **Must-have**; turn timer auto-play |
| 30 Open questions | **Sve zatvoreno** sa odlukama |
| **32 NOVO** | Disconnect & abandon policy |
| **33 NOVO** | Invite UX flow sa host approval |
| **34 NOVO** | Reactions system |
| **35 NOVO** | Playtest validation plan |

---

## Sadržaj

1. [Sažetak](#1-sažetak)
2. [Product vision](#2-product-vision)
3. [MVP scope](#3-mvp-scope)
4. [Ciljna publika](#4-ciljna-publika)
5. [Success criteria za MVP](#5-success-criteria-za-mvp)
6. [Pravila igre za MVP](#6-pravila-igre-za-mvp)
7. [Core user flows](#7-core-user-flows)
8. [Functional requirements](#8-functional-requirements)
9. [UX / UI screens](#9-ux--ui-screens)
10. [Information architecture](#10-information-architecture)
11. [Technical architecture](#11-technical-architecture)
12. [Game state model](#12-game-state-model)
13. [Public vs private state](#13-public-vs-private-state)
14. [Move model](#14-move-model)
15. [Capture logic](#15-capture-logic)
16. [applyMove logic](#16-applymove-logic)
17. [Phase transition logic](#17-phase-transition-logic)
18. [Scoring logic](#18-scoring-logic)
19. [API specification](#19-api-specification)
20. [Database schema](#20-database-schema)
21. [State versioning and concurrency](#21-state-versioning-and-concurrency)
22. [Security and anti-cheat](#22-security-and-anti-cheat)
23. [Error handling](#23-error-handling)
24. [Testing strategy](#24-testing-strategy)
25. [Analytics events](#25-analytics-events)
26. [Non-functional requirements](#26-non-functional-requirements)
27. [Development milestones](#27-development-milestones)
28. [MVP backlog](#28-mvp-backlog)
29. [Biggest technical risks](#29-biggest-technical-risks)
30. [Open questions — ZATVORENO](#30-open-questions--zatvoreno)
31. [Recommendation](#31-recommendation)
32. [Disconnect & abandon policy 🆕](#32-disconnect--abandon-policy)
33. [Invite UX flow 🆕](#33-invite-ux-flow)
34. [Reactions system 🆕](#34-reactions-system)
35. [Playtest validation plan 🆕](#35-playtest-validation-plan)

---

## 1. Sažetak

Cilj je napraviti web multiplayer prototip igre Žandar koji omogućava pravim ljudima da odigraju kompletnu partiju u browseru preko invite linka.

Prvi proizvod ne treba biti kompletna mobilna aplikacija, nego stabilan i tačan web MVP koji dokazuje tri stvari:

1. Igra se može odigrati od početka do kraja bez moderatora.
2. Server tačno validira poteze i računa bodove.
3. Igrači razumiju šta se dešava i mogu igrati bez objašnjavanja uživo.

Nakon web MVP-a, ista game logika treba biti iskorištena za mobilnu aplikaciju.

---

## 2. Product vision

Napraviti jednostavnu, brzu i pouzdanu digitalnu verziju tradicionalne kartaške igre Žandar za igranje sa prijateljima i porodicom.

Prva verzija je fokusirana na privatne sobe i igranje sa poznatim ljudima, ne na javni matchmaking.

### Product principles

- **Pravila su važnija od animacije.** Prvo mora biti tačno, tek onda lijepo.
- **Server je sudija.** Klijent nikada ne odlučuje šta je validan potez.
- **Igra mora preživjeti refresh.** Reconnect je osnovni requirement, ne polish.
- **MVP mora biti mali.** Nema profila, shopa, rankinga i monetizacije u prvoj verziji.
- **Lokalne varijante moraju biti konfigurabilne.** Žandar ima varijante, zato se pravila ne smiju hardkodirati bez mogućnosti promjene.
- **🆕 Socijalni sloj je dio igre.** Žandar je igra zafrkavanja. Reactions su Must-have, ne nice-to-have.

---

## 3. MVP scope

### In scope za MVP

- Web aplikacija dostupna preko browsera.
- Kreiranje privatne sobe.
- Ulazak u sobu preko invite linka **sa host approval flow-om**.
- Igranje sa pravim ljudima.
- **Podrška za 2, 3, i 4 igrača u prvoj verziji** (4-player kao 2v2 partnerstvo).
- Standardni špil od 52 karte.
- Deal, play, capture, scoring i kraj partije.
- Automatska validacija poteza.
- Automatsko računanje bodova.
- Reconnect nakon refresh-a.
- **Turn timer sa auto-play na isteku.**
- **Disconnect & abandon policy.**
- **8 fiksnih reactions tokom igre.**
- Game log.
- Nova runda nakon završetka ruke.
- Završetak meča kada igrač/tim dođe do ciljnog broja poena.

### Out of scope za MVP

- Login / registracija.
- Public matchmaking.
- Botovi / AI igrači (osim auto-play na timer expiration).
- Ranking / leaderboard.
- Monetizacija.
- Friend list.
- Slobodan chat.
- Native mobilna aplikacija.
- Push notifikacije.
- Kompleksne animacije.
- Sve lokalne varijante pravila (samo MVP varijanta + RulesConfig spreman za buduće).
- Spectator mode.

---

## 4. Ciljna publika

### Primarni korisnici

Ljudi koji već znaju igrati Žandara i žele brzo odigrati online sa poznatim osobama. Tipično 4 prijatelja/članova porodice koji se ne nalaze fizički u istom mjestu.

### Sekundarni korisnici

Ljudi koji su čuli za igru, ali ne znaju sva pravila. Za njih je potreban jasan UI koji objašnjava moguće poteze (highlighting validnih capture opcija).

---

## 5. Success criteria za MVP

MVP je uspješan ako:

1. 2–4 igrača mogu ući u sobu preko linka.
2. Igrači mogu završiti kompletnu ruku bez ručne intervencije.
3. Server ne dozvoljava nelegalne poteze.
4. Bodovanje je tačno za testirane scenarije (single-player i 2v2 tim scenariji).
5. Refresh browsera ne izbacuje igrača iz partije.
6. Igrači u testiranju razumiju čiji je potez i šta mogu da urade.
7. Jedna partija može trajati više rundi do ciljnog broja poena.
8. **Igrači aktivno koriste reactions sistem** (signal da je socijalni sloj funkcionalan).
9. **Abandon flow funkcioniše bez zaglavljivanja partije** kada se neko ne vrati.

Detaljni kvantitativni i kvalitativni kriterijumi: vidi [Sekciju 35 — Playtest Validation Plan](#35-playtest-validation-plan).

---

## 6. Pravila igre za MVP

> **Status pravila: ZAKLJUČANO** (vidi [Sekciju 30](#30-open-questions--zatvoreno) za odluke i obrazloženje).

### 6.1 Broj igrača

MVP v1 podržava:

- **2 igrača** (svaki za sebe)
- **3 igrača** (svaki za sebe)
- **4 igrača** (2v2 partnerstvo — sjedišta 0 i 2 jedan tim, 1 i 3 drugi tim)

### 6.2 Špil

Standardni špil od 52 karte:

- 4 znaka: tref, karo, herc, pik
- 13 rankova: A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K

### 6.3 Vrijednosti karata za hvatanje

- **A = 1** (fiksno, bez 1/11 izbora)
- 2–10 = nominalna vrijednost
- Q nema numeričku vrijednost (kupi samo Q)
- K nema numeričku vrijednost (kupi samo K)
- J je specijalna karta koja kupi sve karte sa stola

### 6.4 Početak ruke

Default real-world pravilo:

1. Dealer miješa špil.
2. Igrač desno od dealera (cutter) siječe špil.
3. Na sto se otvaraju 4 karte.
4. **Ako među početne 4 karte izađe J, cutter ga dobija kao captured kartu**, a J se zamjenjuje novom kartom iz špila.
5. Svaki igrač dobija po 4 karte.
6. Igra se nastavlja u smjeru kazaljke na satu, počevši od igrača lijevo od dealera.
7. Kada svi odigraju po 4 karte, dijele se nove 4 karte svakom igraču.
8. Karte koje ostanu na stolu između dealova ostaju na stolu.

### 6.5 Simplifikacija za MVP

Server automatski izvodi shuffle i "sječenje" špila. J behavior na početku je konfigurabilan kroz `RulesConfig.jackOnInitialTableBehavior`, default je `"award_to_cutter"`.

### 6.6 Tok poteza

Na svom potezu igrač igra jednu kartu iz ruke. Mogući ishodi:

- Karta kupi jednu kartu istog ranka sa stola.
- Numerička karta kupi jednu kombinaciju od dvije ili više numeričkih karata čiji zbir odgovara vrijednosti odigrane karte.
- Q kupi Q.
- K kupi K.
- J kupi sve karte sa stola.

Ako karta ne može ništa kupiti, ostaje na stolu (trail).

### 6.7 Obavezno kupljenje (Force Capture)

**Ako igrač može kupiti nešto sa stola, MORA kupiti.** Ako postoji više validnih opcija, igrač bira jednu od njih.

Primjer:
- Sto: 9, A, A
- Igrač igra 10
- Može uzeti `9 + A` (jedan as)
- Ne može uzeti `9 + A + A` jer zbir nije 10
- Bira jednu od dvije validne kombinacije (`9 + A_pik` ili `9 + A_herc`)

### 6.8 Pravilo za više istih karata

Ako igrač igra kartu koja rankom odgovara više karata na stolu, uzima samo jednu od njih, ne sve.

Primjer:
- Sto: 7, 7, 3
- Igrač igra 7 — može uzeti samo jednu sedmicu

### 6.9 Disjoint kombinacije

**MVP NE DOZVOLJAVA** više disjoint kombinacija odjednom. `allowMultipleDisjointCaptures: false`. Igrač u jednom potezu hvata maksimalno jednu kombinaciju.

### 6.10 J na prazan sto

Ako igrač igra J dok je sto prazan:

- J ostaje na stolu.
- Ne kupi ništa.
- Kasnije ga može pokupiti drugi J (zajedno sa svim kartama na stolu).

### 6.11 Kraj ruke

Kada je špil prazan i svi igrači odigraju sve karte iz ruke:

- Igrač/tim koji je posljednji kupio karte dobija sve preostale karte sa stola.
- **Edge case:** Ako u toku cijele ruke niko nije kupio (teoretski moguće u 2-player sa lošim dealom), preostale karte idu **dealeru** (fallback pravilo).
- Zatim se računa score za ruku.

### 6.12 Bodovanje

Po ruci se dodjeljuje ukupno **5 poena**:

| Bodovanje | Poeni |
|-----------|-------|
| Najviše ukupno kupljenih karata | 2 |
| Najviše trefova | 1 |
| 2 tref | 1 |
| 10 karo | 1 |

- Ako je neriješeno za "najviše karata" → niko ne dobija ta 2 poena.
- Ako je neriješeno za "najviše trefova" → niko ne dobija taj 1 poen.
- 2 tref i 10 karo idu onom ko ih je pokupio (ne mogu biti tied).

**U 4-player partnerstvu:** karte oba partnera se zbrajaju za scoring, poeni idu timu.

### 6.13 Tim setup za 4 igrača 🆕

- Sjedišta numerisana 0, 1, 2, 3 (clockwise od dealera).
- Tim A: sjedišta 0 i 2.
- Tim B: sjedišta 1 i 3.
- Partneri sjede dijagonalno (preko stola).
- Captured cards se zbrajaju po timu.
- Match score se vodi po timu.
- "Posljednji kupio" znači "tim posljednjeg igrača koji je kupio".

### 6.14 Kraj meča

**Default MVP cilj: prvi igrač/tim do 21 poena pobjeđuje.**

Konfigurabilno kasnije:
- 11 (kratka partija)
- 21 (MVP default)
- 51 / 101 (tradicionalno)
- custom target score

---

## 7. Core user flows

### 7.1 Create room

1. Korisnik otvara web app.
2. Klikne "Kreiraj sobu".
3. Unese display name.
4. Izabere opcije:
   - broj igrača: 2 / 3 / 4
   - target score: 21 default
5. Sistem kreira room.
6. Korisnik dobija invite link.
7. Korisnik (host) čeka u lobby-ju.

### 7.2 Join room sa host approval 🆕

1. Korisnik otvara invite link.
2. Unese display name.
3. Klikne "Pridruži se".
4. Vidi ekran "Čeka se odobrenje od hosta..." (timer 2 minuta).
5. Host dobija notifikaciju u lobby-ju: "Marko želi da uđe — [Odobri] [Odbij]".
6. Po odobrenju, joiner ulazi u lobby kao igrač.
7. Po odbijanju ili timeout-u, joiner vidi poruku i može probati ponovo.

Detaljno: vidi [Sekciju 33 — Invite UX Flow](#33-invite-ux-flow).

### 7.3 Start game

1. Host klikne "Pokreni igru" kada je tačan broj igrača prisutan.
2. Server kreira match.
3. Server shuffluje špil.
4. Server "siječe" špil (simplifikacija).
5. Server otvara 4 karte na sto (uz J replacement ako je potrebno).
6. Server dijeli po 4 karte svakom igraču.
7. Server šalje svakom igraču samo njegove karte.
8. Server šalje public game state svima.
9. Prvi igrač (lijevo od dealera) dobija oznaku "Vaš potez".

### 7.4 Play turn

1. Igrač vidi svoje karte.
2. Klikne kartu koju želi odigrati.
3. Ako karta ima samo jednu validnu capture opciju, sistem može odmah izvršiti potez (sa kratkim potvrdnim UI feedback-om).
4. Ako karta ima više validnih capture opcija, UI traži da igrač odabere kombinaciju.
5. Klijent šalje move request serveru sa `clientMoveId`.
6. Server validira potez.
7. Server ažurira state, povećava `stateVersion`.
8. Svi igrači dobijaju novi public state.
9. Sljedeći igrač je na potezu.

### 7.5 Reactions tokom igre 🆕

1. Igrač u bilo kom trenutku može kliknuti reaction dugme.
2. Reaction se šalje serveru.
3. Server broadcastuje svim igračima u sobi.
4. UI svih igrača prikazuje animaciju (avatar pošiljaoca + emoji + opcionalno zvuk).
5. Cooldown: 2 sekunde između reactions istog igrača (anti-spam).

Detaljno: vidi [Sekciju 34 — Reactions system](#34-reactions-system).

### 7.6 End hand / scoring

1. Kada je špil prazan i nema karata u rukama, server završava ruku.
2. Server dodjeljuje preostale karte na stolu posljednjem igraču/timu koji je kupio (ili dealeru ako niko nije kupio).
3. Server računa bodove.
4. UI prikazuje score breakdown sa animacijom.
5. Igrači mogu kliknuti "Sljedeća ruka".

### 7.7 End match

1. Ako nakon scoringa neki igrač/tim ima ≥ target score, server završava meč.
2. UI prikazuje pobjednika sa celebration animacijom.
3. Igrači mogu pokrenuti rematch.

### 7.8 Reconnect

1. Igrač refreshuje browser ili izgubi konekciju.
2. Klijent pokušava reconnect preko `roomId` + `playerSessionToken` iz localStorage.
3. Server validira token.
4. Server vraća privatni state za tog igrača.
5. Igrač nastavlja gdje je stao.

### 7.9 Abandon flow 🆕

Vidi [Sekciju 32 — Disconnect & abandon policy](#32-disconnect--abandon-policy) za kompletan tok.

---

## 8. Functional requirements

### FR-001: Room creation

Korisnik mora moći kreirati privatnu sobu.

**Acceptance criteria:**
- Sistem generiše jedinstven `roomId`.
- Sistem generiše invite link.
- Host ulazi u sobu kao prvi igrač.
- Room je u statusu `waiting`.
- Host bira broj igrača (2/3/4) i target score (default 21).

### FR-002: Join request (umjesto direct join) 🆕

Drugi korisnik šalje **zahtjev** za ulazak preko invite linka, host odobrava.

**Acceptance criteria:**
- Korisnik unosi display name prije slanja zahtjeva.
- Zahtjev se ne automatski odobrava.
- Host vidi listu pending zahtjeva.
- Sistem ne dozvoljava više pending zahtjeva nego što ima slobodnih mjesta.
- Zahtjev ističe nakon 2 minute bez akcije hosta.

### FR-003: Host approval / rejection 🆕

Host može odobriti ili odbiti zahtjev za ulazak.

**Acceptance criteria:**
- Host vidi sva pending join requests sa display name.
- Klik "Odobri" → joiner postaje igrač u sobi.
- Klik "Odbij" → joiner dobija notifikaciju, može pokušati ponovo nakon 30s cooldown-a.
- Host može kick-ovati već prihvaćenog igrača **samo prije start-a igre**.

### FR-004: Start game

Host mora moći pokrenuti igru kada je tačan broj igrača u sobi.

**Acceptance criteria:**
- Za 2-player: tačno 2 igrača.
- Za 3-player: tačno 3 igrača.
- Za 4-player: tačno 4 igrača sa team assignment-om (sjedišta 0+2 vs 1+3).
- Server inicijalizuje match state.
- Svaki igrač dobija 4 karte.
- Na sto se postavljaju 4 validne početne karte.

### FR-005: Private hand visibility

Igrač smije vidjeti samo svoje karte.

**Acceptance criteria:**
- Player A ne dobija hand Playera B u network payload-u.
- Public state ne sadrži skrivene karte.
- Server šalje player-specific state.
- **U 4-player tim modu:** igrač NE vidi karte partnera.

### FR-006: Turn order

Sistem mora tačno pratiti red poteza.

**Acceptance criteria:**
- Samo current player može odigrati potez.
- Ako drugi igrač pokuša potez, server odbija request.
- Nakon validnog poteza, currentPlayer se mijenja po clockwise pravilu.

### FR-007: Move validation

Server mora validirati svaki potez.

**Acceptance criteria:**
- Igrač ne može odigrati kartu koju nema.
- Igrač ne može odabrati nevalidnu capture kombinaciju.
- Ako karta može kupiti, igrač ne može samo ostaviti kartu na sto (force capture).
- Ako karta ne može kupiti, ona ostaje na stolu.

### FR-008: Capture selection

Ako karta ima više legalnih capture opcija, UI mora omogućiti izbor.

**Acceptance criteria:**
- UI highlightuje validne kombinacije.
- Igrač bira jednu kombinaciju.
- Server potvrđuje da je kombinacija validna.

### FR-009: Jack behavior

J mora kupiti sve karte sa stola.

**Acceptance criteria:**
- Ako sto nije prazan, J + sve karte sa stola idu u captured pile igrača/tima.
- Ako je sto prazan, J ostaje na stolu.
- Ako je J na stolu, drugi J ga može pokupiti zajedno sa svim kartama na stolu.

### FR-010: Deal next batch

Kada svi igrači potroše 4 karte, server mora podijeliti nove karte ako špil nije prazan.

**Acceptance criteria:**
- Sto ostaje kakav jeste.
- Svaki igrač dobija do 4 nove karte, zavisno od preostalog špila.
- Turn se nastavlja pravilnim redom.

### FR-011: End hand

Server mora završiti ruku kada je špil prazan i svi igrači nemaju karata u ruci.

**Acceptance criteria:**
- Preostale karte sa stola dobija posljednji igrač/tim koji je kupio.
- **Ako niko nije kupio u toku ruke, preostale karte idu dealeru.**
- Server računa score.
- UI prikazuje score breakdown.

### FR-012: Match score

Sistem mora čuvati ukupni score kroz više rundi.

**Acceptance criteria:**
- Poeni iz svake ruke se dodaju na match score.
- Score je vidljiv svim igračima.
- Match završava kada igrač/tim dostigne target score.
- **U 4-player modu, score se vodi po timu, ne po individualnom igraču.**

### FR-013: Game log

Sistem mora prikazivati osnovni log partije.

**Acceptance criteria:**
- Log prikazuje: ko je odigrao koju kartu.
- Log prikazuje: šta je igrač kupio.
- Log prikazuje: scoring breakdown na kraju ruke.
- Log prikazuje: reactions sa timestamp-om.

### FR-014: Reconnect

Igrač mora moći nastaviti partiju nakon refresh-a.

**Acceptance criteria:**
- Session token se čuva u localStorage.
- Nakon reconnect-a, server vraća isti player identity.
- Igrač dobija svoje karte i trenutni state.
- Reconnect ne zahtjeva ponovni host approval.

### FR-015: Turn timer sa auto-play 🆕

Sistem mora prikazivati timer za potez i automatski odigrati po isteku.

**Acceptance criteria:**
- Timer: 30 sekundi po potezu (default, konfigurabilno).
- Vizuelni indikator (countdown + boja).
- Po isteku, server **automatski izvršava sigurni potez**:
  - Ako postoji capture opcija → prva validna capture sa najnižom ukupnom vrijednošću karata.
  - Ako nema capture → odigraj najnižu numeričku kartu (ili prvu po redu ako nema numeričkih).
- Auto-play se logira u game log sa oznakom "(auto)".
- Nakon 3 uzastopna auto-play poteza za istog igrača, tretira se kao disconnect (vidi Sekciju 32).

### FR-016: Disconnect & abandon handling 🆕

Sistem mora rukovati prekidima konekcije bez zaglavljivanja partije.

**Acceptance criteria:**
- Grace period 30s: bez pauze partije.
- 30s–2min: partija se pauzira, prikazuje "Čeka se [ime]".
- 2min+: glasanje o završetku ili produženju.
- Detaljno: [Sekcija 32](#32-disconnect--abandon-policy).

### FR-017: Reactions 🆕

Igrači mogu slati 8 fiksnih reactions tokom partije.

**Acceptance criteria:**
- 8 predefinisanih reactions (vidi Sekciju 34).
- Cooldown 2 sekunde između reactions istog igrača.
- Svi igrači vide reaction u real-time-u.
- Reactions su vidljive u game log-u.
- Reactions dostupne i tokom oponentovog poteza (igrač ne mora čekati svoj red).

---

## 9. UX / UI screens

### 9.1 Home screen

Elementi:
- Logo / naziv igre
- "Kreiraj sobu"
- "Pridruži se sobi preko koda"
- Kratko objašnjenje igre
- Link na pravila

### 9.2 Create room screen

Elementi:
- Display name input
- Selector za broj igrača (2/3/4)
- Target score selector (21 default, 11/21/51/101)
- "Kreiraj" button

### 9.3 Lobby screen — host 🆕

Elementi:
- Room code
- Invite link sa "Kopiraj" button-om
- Player list sa pripadnošću timu (ako 4-player)
- **Pending join requests sa "Odobri" / "Odbij" dugmadima**
- "Pokreni igru" button (disabled dok ne bude tačan broj igrača)
- Kick button pored svakog igrača (osim hosta)

### 9.4 Lobby screen — joiner

Elementi:
- "Čeka se odobrenje od hosta..." sa timer-om (2 minute)
- Display name preview
- Cancel button (povratak na home)

Nakon odobrenja:
- Player list sa team info
- "Spreman" indicator
- Čeka se da host pokrene igru

### 9.5 Game table screen

Elementi:
- Sto sa otvorenim kartama (centar)
- Moja ruka (donji dio)
- Opponent area-e (gornji/bočni dijelovi, broj zavisi od player count)
- Scoreboard (sa team scores ako 4-player)
- Turn indicator (jasno prikazan)
- Timer
- Game log (collapsible panel)
- **Reactions panel (8 fiksnih dugmadi)**
- Dugme za pravila

### 9.6 Capture selection modal

Prikazuje se kada karta ima više legalnih capture opcija.

Elementi:
- Odigrana karta
- Lista mogućih kombinacija (vizuelno highlighted)
- "Potvrdi" / "Otkaži" buttons

### 9.7 End hand screen

Elementi:
- Poeni u ovoj ruci
- Ukupni score
- Breakdown:
  - najviše karata (sa brojevima po igraču/timu)
  - najviše trefova
  - 2 tref
  - 10 karo
- "Sljedeća ruka" button

### 9.8 End match screen

Elementi:
- Winner (igrač ili tim)
- Final score
- "Reanš" button
- "Napusti sobu" button

### 9.9 Reconnect screen 🆕

Prikazuje se kada se igrač vraća.

Elementi:
- "Vraćate se u partiju..."
- Loading spinner
- Fallback poruka ako reconnect ne uspije (sa "Pokušaj ponovo")

### 9.10 Abandon vote modal 🆕

Prikazuje se ostalim igračima nakon 2 minute disconnect-a.

Elementi:
- "[Ime] se nije vratio 2 minute. Šta želite?"
- "Sačekaj još 5 minuta" button
- "Završi meč" button
- Prikaz ko je glasao šta

---

## 10. Information architecture

### Main navigation for MVP

MVP nema kompleksnu navigaciju.

**Routes:**
- `/` — Home
- `/room/:roomId` — Lobby ili active game (state se rješava na osnovu room status-a)
- `/rules` — Rules page

---

## 11. Technical architecture

### 11.1 Recommended stack

**Frontend:**
- React + Next.js
- TypeScript
- Zustand za client state
- Tailwind CSS + shadcn/ui

**Backend:**
- Node.js
- TypeScript
- Socket.IO za WebSocket
- Fastify za REST endpoints

**Database:**
- PostgreSQL za persistent data
- Redis kasnije za room state i scaling

**Deployment:**
- Frontend: Vercel
- Backend: Railway, Fly.io, ili Render
- Database: Supabase / Neon / managed PostgreSQL

### 11.2 Monorepo struktura

```
/apps
  /web         — Next.js frontend
  /server      — Node.js backend
/packages
  /game-core   — Pure TypeScript game engine (no UI, no network)
  /shared-types — TS types deljeni između web i server
```

### 11.3 Zašto game-core package

Game rules moraju biti izdvojene iz UI-a i servera.

`game-core` treba sadržavati:
- deck generation
- shuffle
- deal
- move validation
- capture calculation
- state transitions
- scoring
- team logic (4-player)
- test fixtures

**Prednost:**
- Ista logika se kasnije koristi za mobilnu aplikaciju (React Native ili native iOS/Android sa pure TS engine-om kroz JS bridge).
- Lakše testiranje (pure functions, deterministic).
- Manje bugova.
- Server ostaje authoritative.

---

## 12. Game state model

### 12.1 Card

```typescript
type Suit = "clubs" | "diamonds" | "hearts" | "spades";
type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K";

type Card = {
  id: string; // unique per deck, e.g. "clubs-2"
  suit: Suit;
  rank: Rank;
};
```

### 12.2 Player

```typescript
type Player = {
  id: string;
  displayName: string;
  seatIndex: number;
  teamId?: number;        // 🆕 samo u 4-player modu (0 ili 1)
  connectionStatus: "connected" | "reconnecting" | "abandoned"; // 🆕 prošireno
  isHost: boolean;
  consecutiveAutoPlays: number; // 🆕 za abandon detection
};
```

### 12.3 GameState

```typescript
type GamePhase =
  | "waiting"
  | "lobby_with_pending"  // 🆕
  | "dealing"
  | "playing"
  | "paused_for_reconnect" // 🆕
  | "abandon_vote"         // 🆕
  | "scoring"
  | "hand_finished"
  | "match_finished"
  | "abandoned";           // 🆕

type GameState = {
  roomId: string;
  matchId: string;
  phase: GamePhase;
  players: Player[];
  pendingJoinRequests: JoinRequest[]; // 🆕
  reactions: ReactionEvent[];         // 🆕 (poslednjih N)
  dealerPlayerId: string;
  currentPlayerId: string;
  deck: Card[];
  table: Card[];
  hands: Record<string, Card[]>;
  captured: Record<string, Card[]>;        // playerId u 2/3P, teamId u 4P
  lastCapturePlayerId?: string;            // ili teamId u 4P
  handNumber: number;
  handScores: HandScore[];
  matchScore: Record<string, number>;      // playerId u 2/3P, teamId u 4P
  targetScore: number;
  moveHistory: MoveHistoryItem[];
  rulesConfig: RulesConfig;
  stateVersion: number;
  pauseStartedAt?: number;     // 🆕 timestamp za reconnect/abandon
  abandonVotes?: Record<string, "wait" | "end">; // 🆕
};
```

### 12.4 RulesConfig

```typescript
type RulesConfig = {
  targetScore: number;
  playerCount: 2 | 3 | 4;
  initialTableCards: number;
  cardsPerDeal: number;
  jackOnInitialTableBehavior: "award_to_cutter" | "replace_without_award" | "allow_on_table";
  aceValue: 1 | 11 | "player_choice";
  allowMultipleDisjointCaptures: boolean;
  forceCapture: boolean;
  teamPlay: boolean;                        // 🆕 true samo za 4-player
  turnTimeoutSeconds: number;               // 🆕
  reconnectGracePeriodSeconds: number;      // 🆕
  pauseMaxDurationSeconds: number;          // 🆕
  consecutiveAutoPlaysForAbandon: number;   // 🆕
};
```

**MVP default:**

```typescript
const defaultRulesConfig: RulesConfig = {
  targetScore: 21,                  // promjena: 11 → 21
  playerCount: 2,                   // postavlja se pri create room
  initialTableCards: 4,
  cardsPerDeal: 4,
  jackOnInitialTableBehavior: "award_to_cutter",
  aceValue: 1,
  allowMultipleDisjointCaptures: false,
  forceCapture: true,
  teamPlay: false,                  // true automatski ako playerCount === 4
  turnTimeoutSeconds: 30,
  reconnectGracePeriodSeconds: 30,
  pauseMaxDurationSeconds: 120,
  consecutiveAutoPlaysForAbandon: 3,
};
```

### 12.5 Novi tipovi 🆕

```typescript
type JoinRequest = {
  requestId: string;
  displayName: string;
  requestedAt: number;
  expiresAt: number;
};

type ReactionEvent = {
  reactionId: string;
  playerId: string;
  type: ReactionType;
  timestamp: number;
};

type ReactionType =
  | "laugh"
  | "wow"
  | "fire"
  | "clap"
  | "cry"
  | "angry"
  | "thinking"
  | "respect";
```

---

## 13. Public vs private state

Server ne smije slati kompletan `GameState` svakom klijentu.

### 13.1 Public state

Vidljivo svim igračima:

```typescript
type PublicGameState = {
  roomId: string;
  phase: GamePhase;
  players: PublicPlayer[];
  pendingJoinRequests: PublicJoinRequest[]; // samo za hosta
  reactions: ReactionEvent[];
  table: Card[];
  currentPlayerId: string;
  dealerPlayerId: string;
  deckCount: number;
  handCounts: Record<string, number>;
  capturedCounts: Record<string, number>;
  matchScore: Record<string, number>;
  targetScore: number;
  moveHistory: MoveHistoryItem[];
  stateVersion: number;
};
```

### 13.2 Private player state

Vidljivo samo konkretnom igraču:

```typescript
type PrivatePlayerState = PublicGameState & {
  myPlayerId: string;
  myHand: Card[];
  possibleMoves?: PossibleMove[];
  myTeamId?: number;
};
```

**Napomena za 4-player:** Igrač NE vidi ruku partnera. Samo `handCounts` (broj karata).

---

## 14. Move model

### 14.1 Client move request

```typescript
type PlayCardRequest = {
  roomId: string;
  playerId: string;
  cardId: string;
  selectedCaptureCardIds: string[];
  clientMoveId: string;
  clientKnownStateVersion: number; // 🆕
};
```

### 14.2 Possible move

```typescript
type PossibleMove = {
  playedCardId: string;
  type: "capture" | "trail";
  captureOptions: CaptureOption[];
};

type CaptureOption = {
  optionId: string;
  cardIds: string[];
  reason: "rank_match" | "sum_match" | "jack_clear";
};
```

### 14.3 Move result

```typescript
type MoveResult = {
  success: boolean;
  errorCode?: GameErrorCode;
  newState?: PrivatePlayerState;
};
```

---

## 15. Capture logic

### 15.1 Helper: card numeric value

```typescript
function getNumericValue(card: Card, rules: RulesConfig): number | null {
  if (card.rank === "A") return 1;
  if (["2","3","4","5","6","7","8","9","10"].includes(card.rank)) {
    return Number(card.rank);
  }
  return null;
}
```

### 15.2 getCaptureOptions

```typescript
function getCaptureOptions(playedCard: Card, table: Card[], rules: RulesConfig): CaptureOption[] {
  if (playedCard.rank === "J") {
    if (table.length === 0) return [];
    return [{
      optionId: "jack-clear",
      cardIds: table.map(c => c.id),
      reason: "jack_clear"
    }];
  }

  const options: CaptureOption[] = [];

  // Rank match (uvijek po jednu kartu)
  const rankMatches = table.filter(c => c.rank === playedCard.rank);
  for (const match of rankMatches) {
    options.push({
      optionId: `rank-${match.id}`,
      cardIds: [match.id],
      reason: "rank_match"
    });
  }

  // Sum capture samo za numeričke karte
  const playedValue = getNumericValue(playedCard, rules);
  if (playedValue !== null) {
    const numericTableCards = table.filter(c => getNumericValue(c, rules) !== null);
    const combinations = findCombinationsThatSumTo(numericTableCards, playedValue, rules);
    for (const combo of combinations) {
      if (combo.length >= 2) {
        options.push({
          optionId: `sum-${combo.map(c => c.id).join("-")}`,
          cardIds: combo.map(c => c.id),
          reason: "sum_match"
        });
      }
    }
  }

  return options;
}
```

### 15.3 findCombinationsThatSumTo

```typescript
function findCombinationsThatSumTo(cards: Card[], target: number, rules: RulesConfig): Card[][] {
  const results: Card[][] = [];

  function backtrack(startIndex: number, current: Card[], sum: number) {
    if (sum === target) {
      results.push([...current]);
      return;
    }
    if (sum > target) return;
    for (let i = startIndex; i < cards.length; i++) {
      const value = getNumericValue(cards[i], rules);
      if (value === null) continue;
      current.push(cards[i]);
      backtrack(i + 1, current, sum + value);
      current.pop();
    }
  }

  backtrack(0, [], 0);
  return results.filter(combo => combo.length >= 2);
}
```

**Napomena:** Default pravilo dozvoljava hvatanje samo jedne kombinacije, ne više disjoint kombinacija odjednom.

---

## 16. applyMove logic

```typescript
function applyMove(state: GameState, request: PlayCardRequest): GameState {
  assert(state.phase === "playing");
  assert(state.currentPlayerId === request.playerId);
  assert(state.stateVersion === request.clientKnownStateVersion); // 🆕

  const hand = state.hands[request.playerId];
  const playedCard = hand.find(c => c.id === request.cardId);
  if (!playedCard) throw new Error("CARD_NOT_IN_HAND");

  const captureOptions = getCaptureOptions(playedCard, state.table, state.rulesConfig);
  const selectedCaptureIds = request.selectedCaptureCardIds;

  if (captureOptions.length > 0 && selectedCaptureIds.length === 0 && state.rulesConfig.forceCapture) {
    throw new Error("CAPTURE_REQUIRED");
  }

  const selectedOption = captureOptions.find(opt => sameSet(opt.cardIds, selectedCaptureIds));
  if (selectedCaptureIds.length > 0 && !selectedOption) {
    throw new Error("INVALID_CAPTURE_SELECTION");
  }

  // Remove played card from hand
  state.hands[request.playerId] = hand.filter(c => c.id !== playedCard.id);

  if (selectedOption) {
    const capturedCards = state.table.filter(c => selectedCaptureIds.includes(c.id));
    state.table = state.table.filter(c => !selectedCaptureIds.includes(c.id));
    const capturePileId = getCapturePileId(state, request.playerId); // playerId ili teamId
    state.captured[capturePileId].push(playedCard, ...capturedCards);
    state.lastCapturePlayerId = request.playerId;
  } else {
    state.table.push(playedCard);
  }

  state.moveHistory.push(createMoveHistoryItem(request, playedCard, selectedOption));
  state.stateVersion += 1; // 🆕

  advanceTurnOrPhase(state);
  return state;
}

function getCapturePileId(state: GameState, playerId: string): string {
  if (state.rulesConfig.teamPlay) {
    const player = state.players.find(p => p.id === playerId)!;
    return `team-${player.teamId}`;
  }
  return playerId;
}
```

---

## 17. Phase transition logic

### 17.1 advanceTurnOrPhase

```typescript
function advanceTurnOrPhase(state: GameState): void {
  const allHandsEmpty = state.players.every(p => state.hands[p.id].length === 0);
  if (!allHandsEmpty) {
    state.currentPlayerId = getNextPlayerId(state);
    return;
  }

  if (state.deck.length > 0) {
    dealNextBatch(state);
    state.currentPlayerId = getPlayerLeftOfDealer(state);
    return;
  }

  finishHand(state);
}
```

### 17.2 finishHand

```typescript
function finishHand(state: GameState): void {
  if (state.table.length > 0) {
    let pileId: string;
    if (state.lastCapturePlayerId) {
      pileId = getCapturePileId(state, state.lastCapturePlayerId);
    } else {
      // 🆕 Fallback: niko nije kupio cijelu ruku → dealer dobija
      pileId = getCapturePileId(state, state.dealerPlayerId);
    }
    state.captured[pileId].push(...state.table);
    state.table = [];
  }

  const handScore = calculateHandScore(state);
  state.handScores.push(handScore);

  for (const [pileId, points] of Object.entries(handScore.pointsByPile)) {
    state.matchScore[pileId] = (state.matchScore[pileId] || 0) + points;
  }

  const winner = getMatchWinner(state);
  if (winner) {
    state.phase = "match_finished";
  } else {
    state.phase = "hand_finished";
  }
}
```

---

## 18. Scoring logic

### 18.1 HandScore model

```typescript
type HandScore = {
  handNumber: number;
  pointsByPile: Record<string, number>; // playerId ili teamId
  breakdown: {
    mostCards?: {
      winnerPileId?: string;
      cardCountByPile: Record<string, number>;
      points: 2;
    };
    mostClubs?: {
      winnerPileId?: string;
      clubCountByPile: Record<string, number>;
      points: 1;
    };
    twoOfClubs?: {
      winnerPileId?: string;
      points: 1;
    };
    tenOfDiamonds?: {
      winnerPileId?: string;
      points: 1;
    };
  };
};
```

### 18.2 calculateHandScore

```typescript
function calculateHandScore(state: GameState): HandScore {
  const pointsByPile = initPoints(state);

  const cardCounts = countCapturedCards(state);
  const mostCardsWinner = getSingleWinner(cardCounts);
  if (mostCardsWinner) pointsByPile[mostCardsWinner] += 2;

  const clubCounts = countCapturedClubs(state);
  const mostClubsWinner = getSingleWinner(clubCounts);
  if (mostClubsWinner) pointsByPile[mostClubsWinner] += 1;

  const twoClubsOwner = findOwnerOfCard(state, { rank: "2", suit: "clubs" });
  if (twoClubsOwner) pointsByPile[twoClubsOwner] += 1;

  const tenDiamondsOwner = findOwnerOfCard(state, { rank: "10", suit: "diamonds" });
  if (tenDiamondsOwner) pointsByPile[tenDiamondsOwner] += 1;

  return {
    handNumber: state.handNumber,
    pointsByPile,
    breakdown: createBreakdown(state, cardCounts, clubCounts, twoClubsOwner, tenDiamondsOwner)
  };
}
```

**Tim scoring napomena:** U 4-player modu, `pileId` je `team-0` ili `team-1`. Carde oba člana tima se zbrajaju kao da su jedan pile.

---

## 19. API specification

### 19.1 REST endpoints

#### POST /api/rooms

Creates a new room.

**Request:**
```json
{
  "displayName": "Igor",
  "targetScore": 21,
  "playerCount": 2
}
```

**Response:**
```json
{
  "roomId": "abc123",
  "playerId": "p1",
  "playerSessionToken": "secure-token",
  "inviteUrl": "https://zandar.app/room/abc123"
}
```

#### POST /api/rooms/:roomId/join-request 🆕

Submits join request, doesn't immediately join.

**Request:**
```json
{
  "displayName": "Marko"
}
```

**Response:**
```json
{
  "requestId": "req-456",
  "expiresAt": 1716000120000,
  "status": "pending"
}
```

#### POST /api/rooms/:roomId/approve 🆕

Host approves pending request.

**Request:**
```json
{
  "requestId": "req-456"
}
```

**Response:**
```json
{
  "playerId": "p2",
  "playerSessionToken": "secure-token"
}
```

#### POST /api/rooms/:roomId/reject 🆕

Host rejects pending request.

**Request:**
```json
{
  "requestId": "req-456"
}
```

#### POST /api/rooms/:roomId/kick 🆕

Host kicks player (only in lobby phase).

**Request:**
```json
{
  "playerId": "p2"
}
```

#### GET /api/rooms/:roomId/state

Requires player session token.

**Response:**
```json
{
  "state": "PrivatePlayerState"
}
```

### 19.2 WebSocket events

**Client → Server:**

```typescript
type ClientEvents = {
  "room:subscribe": { roomId: string; playerSessionToken: string };
  "game:start": { roomId: string };
  "game:playCard": PlayCardRequest;
  "game:nextHand": { roomId: string; playerId: string };
  "game:rematch": { roomId: string; playerId: string };
  "game:react": { roomId: string; type: ReactionType };          // 🆕
  "game:abandonVote": { roomId: string; vote: "wait" | "end" };  // 🆕
};
```

**Server → Client:**

```typescript
type ServerEvents = {
  "room:update": PrivatePlayerState;
  "room:joinRequested": { requestId: string; displayName: string };    // 🆕 only to host
  "room:joinApproved": { playerId: string; sessionToken: string };     // 🆕 to joiner
  "room:joinRejected": { reason: string };                              // 🆕 to joiner
  "room:kicked": { reason: string };                                    // 🆕 to kicked player
  "game:error": { code: string; message: string };
  "game:moveApplied": PrivatePlayerState;
  "game:handFinished": PrivatePlayerState;
  "game:matchFinished": PrivatePlayerState;
  "game:paused": { reason: string; remainingSeconds: number };          // 🆕
  "game:resumed": PrivatePlayerState;                                   // 🆕
  "game:abandonVoteStarted": { initiatorPlayerId: string };             // 🆕
  "game:reaction": ReactionEvent;                                       // 🆕
  "player:connected": { playerId: string };
  "player:disconnected": { playerId: string };
};
```

---

## 20. Database schema

### 20.1 rooms

```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL,
  target_score INT NOT NULL DEFAULT 21,
  player_count INT NOT NULL DEFAULT 2,
  team_play BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 20.2 players

```sql
CREATE TABLE players (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id),
  display_name TEXT NOT NULL,
  seat_index INT NOT NULL,
  team_id INT,
  is_host BOOLEAN NOT NULL DEFAULT FALSE,
  session_token_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 20.3 join_requests 🆕

```sql
CREATE TABLE join_requests (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id),
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected | expired
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP
);
```

### 20.4 matches

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id),
  status TEXT NOT NULL,
  current_state JSONB NOT NULL,
  state_version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 20.5 moves

```sql
CREATE TABLE moves (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id),
  hand_number INT NOT NULL,
  player_id UUID NOT NULL REFERENCES players(id),
  played_card JSONB NOT NULL,
  captured_cards JSONB NOT NULL,
  is_auto_play BOOLEAN NOT NULL DEFAULT FALSE,
  state_version INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 20.6 reactions 🆕

```sql
CREATE TABLE reactions (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id),
  player_id UUID NOT NULL REFERENCES players(id),
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### 20.7 MVP simplification

Za MVP se kompletan game state može čuvati kao JSONB u `matches.current_state`. Kasnije, ako proizvod raste, može se normalizovati više podataka.

---

## 21. State versioning and concurrency

Svaki `GameState` ima `stateVersion`.

**Kod poteza:**

1. Client šalje `clientKnownStateVersion` u request-u.
2. Server provjerava da li je verzija aktuelna.
3. Server provjerava da `clientMoveId` nije već procesiran (idempotency).
4. Server primjenjuje potez.
5. Server povećava `stateVersion`.
6. Server emituje novi state.

**Ovo štiti od:**
- Double-click-a
- Duplicate socket eventa
- Starog poteza nakon reconnect-a
- Race condition-a

---

## 22. Security and anti-cheat

### 22.1 Osnovna pravila

- Klijent nikada ne dobija tuđe karte (uključujući partnerove karte u 4-player).
- Klijent ne šalje "novi state", nego samo intent poteza.
- Server validira svaki potez.
- Session token se koristi za identitet igrača.
- Session token se ne čuva plain-text u bazi (samo hash).
- Invite link je dovoljan da pokrene join-request, ali ne i da uđeš direktno.

### 22.2 Potencijalni cheat scenariji

| Scenario | Zaštita |
|----------|---------|
| Igrač pokuša odigrati tuđu kartu | Server provjerava hand |
| Igrač pokuša igrati van reda | Server provjerava currentPlayerId |
| Igrač pokuša nelegalnu kombinaciju | Server računa legalne capture opcije |
| Igrač mijenja network payload | Server ignoriše sve osim validnog intent-a |
| Igrač refreshuje da vidi novi state | Server vraća samo njegov private state |
| Igrač pokušava da vidi partnerove karte (4P) | Private state ne sadrži partner hand |
| Replay attack sa starim moveId | Server ima dedupe |
| Spam reactions | Cooldown 2s per player |

### 22.3 Collusion (samo zabilježeno za buduće)

U 4-player partnerstvu, dva partnera mogu komunicirati van platforme (telefon, WhatsApp) i razmjenjivati informacije o svojim kartama. **Za MVP ne tretiramo ovo kao security issue** — fokus je na prijatelje/porodicu koji se međusobno znaju. Future: ukoliko se ide ka public matchmaking-u, treba razmotriti.

---

## 23. Error handling

```typescript
type GameErrorCode =
  | "ROOM_NOT_FOUND"
  | "ROOM_FULL"
  | "PLAYER_NOT_FOUND"
  | "NOT_HOST"
  | "GAME_ALREADY_STARTED"
  | "NOT_YOUR_TURN"
  | "CARD_NOT_IN_HAND"
  | "CAPTURE_REQUIRED"
  | "INVALID_CAPTURE_SELECTION"
  | "INVALID_GAME_PHASE"
  | "STALE_STATE"
  // 🆕 novi codes
  | "JOIN_REQUEST_PENDING"
  | "JOIN_REQUEST_EXPIRED"
  | "JOIN_REJECTED"
  | "REACTION_COOLDOWN"
  | "GAME_PAUSED"
  | "GAME_ABANDONED"
  | "KICK_NOT_ALLOWED_IN_GAME"
  | "UNKNOWN_ERROR";
```

**UI poruke (primjeri):**
- `NOT_YOUR_TURN` — "Nije tvoj potez."
- `CAPTURE_REQUIRED` — "Moraš pokupiti karte jer imaš validan potez."
- `INVALID_CAPTURE_SELECTION` — "Ta kombinacija nije validna."
- `JOIN_REJECTED` — "Host te je odbio. Možeš pokušati ponovo."
- `REACTION_COOLDOWN` — "Pričekaj sekundu prije sljedeće reakcije."
- `GAME_PAUSED` — "Partija je pauzirana — čeka se [ime]."

---

## 24. Testing strategy

### 24.1 Unit tests za game-core

**Obavezni testovi (postojeći):**
- deck ima 52 unikatne karte
- shuffle ne gubi karte
- deal daje ispravan broj karata
- J kupi sve sa stola
- J na prazan sto ostaje na stolu
- K kupi samo K
- Q kupi samo Q
- A se računa kao 1
- 10 može kupiti 9 + A
- 10 ne može kupiti 9 + A + A
- ako postoji capture, trail nije dozvoljen
- ako ima više rank match karata, bira se samo jedna
- scoring za najviše karata
- scoring za najviše trefova
- scoring za 2 tref
- scoring za 10 karo
- tie za najviše karata ne daje poene
- tie za najviše trefova ne daje poene
- posljednji capture dobija preostale karte na kraju ruke

**Novi testovi 🆕:**
- 4-player tim scoring: karte oba partnera se zbrajaju
- 4-player tim wins ako oba partnera zajedno imaju najviše karata
- 4-player: igrač ne vidi partnerove karte u private state-u
- 3-player turn order (clockwise, bez timova)
- Fallback: niko nije kupio cijelu ruku → dealer dobija stol
- Auto-play: timer expiration izvršava najsigurniji potez
- State versioning: stari move sa starim version-om se odbija
- Idempotency: isti clientMoveId ne primjenjuje potez dvaput

### 24.2 Integration tests

- Kreiranje sobe
- Join request flow (request → approve → enter)
- Join request flow (request → reject)
- Join request expiration nakon 2 min
- Start game
- Kompletna ruka sa fixture deck-om (2P, 3P, 4P)
- Scoring nakon ruke
- Reconnect nakon refresh-a
- Invalid move rejection
- Reaction broadcast
- Disconnect 30s — partija nastavlja
- Disconnect 2min — partija pauzirana
- Abandon vote — produženje
- Abandon vote — završetak

### 24.3 Manual QA scenarios

- Player A refreshuje tokom svog poteza.
- Player B refreshuje tokom tuđeg poteza.
- Host izađe iz lobby-ja (soba se briše).
- Host izađe tokom partije (host role se prebacuje).
- Igrač disconnect-uje tokom partije, vraća se u različitim intervalima.
- Igrač double-click-uje kartu.
- Dva klijenta pošalju isti potez.
- Table ima više mogućih capture opcija.
- 4 igrača, jedan partner disconnect-uje, drugi nastavlja igru posle abandon vote-a (završetak).
- Spam reaction button — cooldown se aktivira.
- Host odobri više join requests nego što ima slobodnih sjedišta — drugi je odbijen.

---

## 25. Analytics events

**Minimalni analytics:**

- `room_created`
- `room_joined`
- `join_requested` 🆕
- `join_approved` 🆕
- `join_rejected` 🆕
- `game_started`
- `move_played`
- `move_auto_played` 🆕
- `capture_made`
- `reaction_sent` 🆕
- `hand_finished`
- `match_finished`
- `match_abandoned` 🆕
- `player_disconnected`
- `player_reconnected`
- `abandon_vote_started` 🆕
- `abandon_vote_completed` 🆕
- `invalid_move_attempted`

**Za svaki event čuvati:**
- roomId
- matchId
- playerCount
- handNumber
- timestamp
- gamePhase

**Reaction-specific:**
- reactionType
- triggeredAtPhase (čije je vrijeme: moj potez, oponentov potez, scoring, itd.)

Ne čuvati privatne informacije koje nisu potrebne.

---

## 26. Non-functional requirements

### Performance

- Move validation < 50ms na serveru.
- End-to-end latency od klika do oponentovog ekrana < 300ms (uz internet konekciju 50ms+).
- Aplikacija mora raditi glatko na desktop i mobile browser-ima.

### Reliability

- Server mora moći rekonstruisati state iz baze.
- Svaki potez (uključujući auto-play) zapisan u DB.
- Game state se persistuje nakon svakog validnog poteza.
- Reaction events persistuju asinhrono (ne blokiraju gameplay).

### Scalability

MVP ne mora podržati veliki broj istovremenih partija, ali arhitektura treba omogućiti scaling kasnije.

**Phase 1:**
- Jedan backend instance
- In-memory active room state
- Persist to PostgreSQL after every move

**Phase 2:**
- Redis za active room state
- Horizontal scaling socket servera
- Sticky sessions ili socket adapter

### Browser support

MVP:
- Chrome desktop
- Safari iOS
- Chrome Android
- Firefox desktop (best-effort)

---

## 27. Development milestones

### Milestone 1: Game-core engine

**Deliverables:**
- card/deck model
- shuffle/deal
- capture logic
- move validation
- scoring
- 2P, 3P, 4P (team) support
- Auto-play helper
- Unit tests (50+)

**Definition of done:** Kompletna ruka se može simulirati kroz test bez UI-a, za sva tri player count-a.

### Milestone 2: Local web prototype

**Deliverables:**
- Single-device prototype
- Prikaz stola
- Prikaz ruke
- Igranje poteza
- Capture selection
- Scoring ekran

**Definition of done:** Jedna osoba može odigrati test partiju lokalno kontrolišući sve igrače.

### Milestone 3: Multiplayer room sa basic invite

**Deliverables:**
- Create room
- Direct join (bez approval-a, temporary za testing)
- WebSocket connection
- Private state per player
- Turn handling
- State versioning

**Definition of done:** 2-4 browsera mogu igrati istu partiju.

### Milestone 4: Reconnect, persistence, abandon flow

**Deliverables:**
- PostgreSQL persistence
- Session token
- Reconnect flow
- Disconnect detection
- Pause i abandon vote
- Auto-play na timer expiration

**Definition of done:** Refresh ne prekida partiju. Disconnect na 2+ min trigger-uje abandon flow.

### Milestone 5: Host approval i reactions 🆕

**Deliverables:**
- Join request flow
- Host approve/reject UI
- Kick funkcionalnost
- 8 reactions sa cooldown-om
- Reaction animacije

**Definition of done:** Kompletan invite flow je sigurniji, igrači aktivno koriste reactions.

### Milestone 6: UX polish za playtest

**Deliverables:**
- Capture highlights
- Turn indicator
- Game log
- Scoring breakdown sa animacijama
- Responsive layout (desktop + mobile browser)
- Rules tooltip

**Definition of done:** 3–5 ljudi mogu testirati bez developer objašnjenja.

---

## 28. MVP backlog

### Must have

- Game-core rules (2P/3P/4P)
- Unit tests (50+)
- Create room
- **Join request sa host approval** 🆕
- Start game
- Deal cards
- Private hand state
- Play card
- Capture validation
- Forced capture
- J behavior
- End hand
- Scoring (uključujući team scoring za 4P)
- End match
- Reconnect
- **Turn timer sa auto-play** 🆕
- **Disconnect & abandon policy** 🆕
- **8 fiksnih reactions** 🆕

### Should have

- Game log
- Capture option highlight
- Responsive mobile browser layout
- Rematch
- Kick player (u lobby-ju)
- Rules tooltip

### Could have

- Sound effects za reactions
- Bolje card animacije
- Share room QR code
- Avatar selection (limited set)
- Dark mode

### Won't have in MVP

- Login / registracija
- Public matchmaking
- AI bots (osim auto-play)
- Native mobilna aplikacija
- Rankings / leaderboard
- Monetizacija
- Friend list
- Spectator mode
- Slobodan chat
- Replay sistem

---

## 29. Biggest technical risks

### Risk 1: Local rule variations

**Problem:** Žandar ima lokalne varijante. Ako pravila nisu zaključana, development može lutati.

**Mitigation:**
- Pravila zaključana u Sekciji 6 i 30 (vidi).
- `RulesConfig` ostaje fleksibilan za buduće varijante.
- Testovi pisani prema MVP varijanti.

### Risk 2: Hidden information leakage

**Problem:** Ako server slučajno pošalje kompletan state, protivnik može vidjeti tuđe karte. Posebno kritično u 4-player gdje igrač NE smije vidjeti partnerove karte.

**Mitigation:**
- Strogo odvojiti internal `GameState` od `PrivatePlayerState`.
- Dodati test koji provjerava da payload ne sadrži tuđe karte (uključujući partnera u 4P).

### Risk 3: Multiplayer edge cases

**Problem:** Refresh, disconnect, double-click i stale events mogu pokvariti partiju.

**Mitigation:**
- State versioning.
- Idempotent `clientMoveId`.
- Persistence nakon svakog poteza.
- Sveobuhvatan abandon flow (Sekcija 32).

### Risk 4: Capture combination complexity

**Problem:** Kombinacije na stolu mogu biti višestruke i UI mora jasno pokazati šta je legalno.

**Mitigation:**
- Prvo napraviti engine testove.
- Zatim napraviti UI koji samo renderuje već izračunate legalne opcije.

### Risk 5: Auto-play kvalitet 🆕

**Problem:** Auto-play algoritam može odigrati glup potez koji previše ošteti AFK igrača (npr. baci J kad treba da hvata 2 trefa).

**Mitigation:**
- Auto-play preferira capture nad trail-om.
- Među capture opcijama bira onu sa najmanje vrijednim kartama (čuva 2 trefa, 10 karo, i J).
- Među trail opcijama bira najnižu numeričku kartu.
- Logira se kao "(auto)" u game log da igrač zna šta se desilo.

---

## 30. Open questions — ZATVORENO

Sva pitanja iz v1 PRD-a su rezolvirana. Lista i odluke:

| # | Pitanje | Odluka | Razlog |
|---|---------|--------|--------|
| 1 | A kao 1 ili 1/11? | **A = 1 fiksno** | Pojednostavljuje UI i "obavezno kupljenje" logiku |
| 2 | Target score 11 ili 21? | **21** | 11 je prekratko (2-3 ruke), 21 daje 4-6 rundi i 25-35 min sesiju |
| 3 | J u početne 4 — cutter ili replace? | **Cutter dobija** | Standardno real-world pravilo |
| 4 | Disjoint multiple captures? | **NE** | Komplikuje UI, rijetka varijanta |
| 5 | Force capture? | **DA** | Suštinski dio igre, ne pravila varijanta |
| 6 | 2-player first ili širi scope? | **2-4 igrača od početka** | Žandar je social game, 2P sam je emotionally false |
| 7 | 4 igrača 2v2? | **DA, 2v2 partnerstvo** | Tradicionalno; individualni 4P je dosadan |
| 8 | Chat / reactions u MVP? | **8 fiksnih reactions u Must-have** | Socijalni sloj je dio Žandara |

**Dodatne edge case odluke:**

- Ako niko ne kupi u toku ruke → preostale karte idu **dealeru**.
- Turn timer expiration → **auto-play** (ne forfeit ni skip).
- Host izlazi iz lobby-ja prije start-a → **soba se briše**.
- Host disconnect-uje tokom igre → **host role se prebacuje na sljedeće sjedište**.

---

## 31. Recommendation

Najbolji prvi korak nije UI, nego **game-core engine** sa unit testovima.

Praktičan redoslijed:

1. Setup monorepo (Milestone 1 prep)
2. Implementirati game-core za 2P sa unit testovima
3. Proširiti game-core na 3P i 4P (team play)
4. Auto-play helper sa testovima
5. Lokalni web prototype (single device)
6. Multiplayer room sa basic invite (bez approval-a, za testing)
7. Reconnect i state versioning
8. Disconnect/abandon policy
9. Host approval + reactions
10. UX polish
11. Internal alpha (Faza 1 playtest)
12. Closed alpha (Faza 2 playtest)
13. Friends & family beta (Faza 3 playtest)

Prvi realni MVP treba imati samo jedan cilj:

> **2–4 igrača mogu otvoriti link, dobiti host approval, odigrati kompletnu partiju Žandara, koristiti reactions, i dobiti tačan score čak i ako neko izgubi konekciju usred partije.**

---

## 32. Disconnect & abandon policy 🆕

### 32.1 Tri stanja igrača

```typescript
type ConnectionStatus = "connected" | "reconnecting" | "abandoned";
```

### 32.2 Phase 1: Grace period (0–30 sekundi)

- Partija **NE pauzira**.
- Igrač u UI-ju oponente vidi indikator pored avatara: "📶 [ime] reconnect...".
- Turn timer nastavlja teći.
- Ako je AFK igrač na potezu i timer istekne, **auto-play se izvršava** (FR-015).
- Ako se igrač vrati prije isteka 30s, indikator nestaje, partija se nastavlja normalno.

### 32.3 Phase 2: Pauza partije (30s – 2 minute)

- Status igrača prelazi u `reconnecting`.
- `GameState.phase` postaje `paused_for_reconnect`.
- Svi igrači dobijaju modal/banner: "⏸ Čeka se [ime]... 1:23".
- Timer (sat) je vidljiv svima.
- Bilo koji igrač može kliknuti **"Sačekaj još"** koji resetuje pause timer na 2 min (npr. ako Marko u WhatsApp grupi javlja "evo me za 5 min").
- Turn timer je stopiran tokom pauze.

### 32.4 Phase 3: Abandon vote (nakon 2 min)

- `GameState.phase` postaje `abandon_vote`.
- Modal se prikazuje ostalim igračima:
  - "[Ime] se nije vratio. Šta želite?"
  - Opcija 1: **"Sačekaj još 5 minuta"**
  - Opcija 2: **"Završi meč"** (default izbor nakon 60s neaktivnosti)
- Rezultat:
  - Bilo koji glas za "Sačekaj" → pause timer se produžava za 5 min (može se ponavljati).
  - Ako svi glasaju "Završi" ili ako 60s prođe → match završava kao `abandoned`.

### 32.5 Phase 4: Abandoned match

- `GameState.phase` postaje `abandoned`.
- Match score se **ne računa** kao validan rezultat.
- Soba prelazi u prikazni mod: "Partija prekinuta — [ime] se nije vratio."
- Soba se briše iz aktivnih nakon 5 min.
- Igrači mogu kliknuti "Pokreni novu sobu" (vraća na home, ne automatski rematch).

### 32.6 AFK detection (igrač konektovan ali ne igra)

- Računa se broj uzastopnih `auto_play` poteza za istog igrača.
- Posle **1 propuštenog poteza**: ostali vide "[ime] — 1/3 propuštenih".
- Posle **2 propuštena**: "[ime] — 2/3 propuštenih".
- Posle **3 uzastopna**: igrač se tretira kao disconnect-ovan → Phase 2 (pauza).
- Bilo koja igračeva akcija (klik na kartu, reaction, čak i klik na ekranu) resetuje brojač.

### 32.7 Host disconnect specifično

- Ako host disconnect-uje, **host role se automatski prebacuje** na sljedeće sjedište po seat order.
- Ovo se dešava transparentno, bez glasanja.
- Novi host vidi notification: "Postao si host."

### 32.8 Soba lifecycle

| Status | Lifetime |
|--------|----------|
| `waiting` (čekaju igrači) | Briše se nakon 30 min neaktivnosti |
| `playing` | Ne ističe dok god je iko konektovan |
| `paused_for_reconnect` | Maks 2 min (vidi 32.3) |
| `abandon_vote` | Maks 60s (vidi 32.4) |
| `hand_finished` / `match_finished` | 5 min za rematch, pa se briše |
| `abandoned` | 5 min za prikaz poruke, pa se briše |

---

## 33. Invite UX flow 🆕

### 33.1 Filozofija

Trenutni "anyone with link can join" model ima dva problema:
1. **Curenje linka:** ako Petar pošalje link na grupu, prvi koji klikne dobija sjedište.
2. **Slučajni ulazak:** Marko slučajno klikne link, sad je on u sobi umjesto Stefana.

Rješenje: **host approval flow** (ne previše heavy za MVP).

### 33.2 Host kreira sobu

1. Host bira broj igrača (2/3/4) i target score.
2. Sistem generiše **open invite link** (`https://zandar.app/room/abc123`).
3. Host vidi lobby ekran sa praznim sjedištima i pending requests sekcijom (prazna).

> **Named slots (link po imenu):** Out of scope za MVP. Dodaće se u Should-have post-MVP. Open link je dovoljan za prijatelje grupe.

### 33.3 Joiner ulazi

1. Klikne invite link → preusmjerava na `/room/abc123`.
2. UI prikazuje: "Soba [Igora] — unesi ime da pošalješ zahtjev za ulazak."
3. Joiner unosi display name → klikne "Pošalji zahtjev".
4. UI prelazi u "Čeka se odobrenje od [Igora]... 1:45" (countdown 2 min).
5. Cancel button (vraća na home).

### 33.4 Host odlučuje

1. Host dobija notifikaciju (vizuelni indikator + opcionalno zvuk):
   - "[Marko] želi da uđe — [Odobri] [Odbij]"
2. Notifikacija ostaje na lobby ekranu dok host ne reaguje.
3. Host može imati više pending requests istovremeno (ako više ljudi klikne link).

**Odobrenje:**
- Joiner ulazi u sobu kao igrač sa dodeljenim sjedištem (sljedeće slobodno).
- Sistem broadcastuje update svim igračima u sobi.

**Odbijanje:**
- Joiner dobija poruku: "Host te je odbio. Možeš pokušati ponovo za 30s."
- Cooldown 30s sprječava spam.

**Timeout (2 min bez akcije):**
- Request auto-cancel-uje se.
- Joiner: "Host nije odgovorio. Možeš pokušati ponovo."

### 33.5 Edge cases

| Scenario | Ponašanje |
|----------|-----------|
| Soba puna, neko šalje request | Server odbija, JOIN_REQUEST_PENDING ako ima slobodnih, JOIN_ROOM_FULL ako nema |
| Host disconnect-uje sa pending requests | Requests ostaju, novi host (sljedeće sjedište) ih nasljeđuje |
| Host izlazi prije start-a | Soba se briše, svi pending requests cancel-ovani |
| Više igrača kliknu link istovremeno | Server queue-uje requests u FIFO, host vidi sve, odobri prve N |
| Joiner reconnect-uje (već primljen) | Bez ponovnog approval-a, koristi se session token |
| Host pokušava odobriti više requests nego ima sjedišta | Server prihvata prve N, ostale auto-cancel sa "Soba je popunjena" |

### 33.6 Lobby UX detalji

**Host vidi:**
- Listu trenutnih igrača sa kick button-om (osim sebe).
- Listu pending requests sa Approve/Reject button-ima.
- Prazna sjedišta sa "Čeka se igrač...".
- "Pokreni igru" button (disabled dok ne bude tačan broj igrača).

**Non-host igrač vidi:**
- Listu trenutnih igrača (bez kick button-a).
- Team assignment (u 4-player modu).
- "Čeka se da host pokrene igru".

### 33.7 Tim assignment u 4-player

Pri ulasku, igrač automatski dobija sljedeće slobodno sjedište po redoslijedu (0, 1, 2, 3).

- Sjedišta 0 i 2 → Tim A.
- Sjedišta 1 i 3 → Tim B.

**Future feature (post-MVP):** Drag-and-drop preuredjenje sjedišta prije start-a. Za MVP, prvi koji uđe ide na sjedište po redu, hostov je posao da uskladi sa željenim parovima.

### 33.8 Future: Named slots

Post-MVP feature za Should-have:
- Host može poslati 3 različita linka, svaki vezan za predefinisano ime i sjedište.
- One-time use tokens.
- Eliminira potrebu za approval-om za poznate ljude.

---

## 34. Reactions system 🆕

### 34.1 Set od 8 fiksnih reactions

| # | Tip | Emoji | Korištenje |
|---|-----|-------|------------|
| 1 | `laugh` | 😂 | Smijeh, nakon dobre fore ili glupog poteza |
| 2 | `wow` | 😮 | Iznenađenje, posebno za J koji kupi puno |
| 3 | `fire` | 🔥 | Pohvala dobrog poteza |
| 4 | `clap` | 👏 | Aplauz |
| 5 | `cry` | 😭 | Tugovanje (nakon što izgubiš 2 trefa) |
| 6 | `angry` | 😠 | Frustracija (nakon što ti ukradu kombinaciju) |
| 7 | `thinking` | 🤔 | "Hmm, šta misliš..." (za vrijeme oponentovog poteza) |
| 8 | `respect` | 🙌 | Priznavanje pobjede ili velikog poteza |

### 34.2 UI

- Panel sa 8 emoji dugmadi vidljiv tokom igre.
- Lokacija: bočna traka na desktop-u, donja traka na mobilnom.
- Klik → emit reaction.

### 34.3 Server logic

```typescript
async function handleReaction(playerId: string, type: ReactionType): Promise<void> {
  const lastReaction = getLastReactionByPlayer(playerId);
  const now = Date.now();
  
  if (lastReaction && now - lastReaction.timestamp < 2000) {
    throw new Error("REACTION_COOLDOWN");
  }
  
  const reactionEvent: ReactionEvent = {
    reactionId: generateId(),
    playerId,
    type,
    timestamp: now
  };
  
  state.reactions.push(reactionEvent);
  // Drži samo posljednjih 20 u stanju (za history u game log-u)
  if (state.reactions.length > 20) state.reactions.shift();
  
  broadcast("game:reaction", reactionEvent);
  persistReactionAsync(reactionEvent); // ne blokira gameplay
}
```

### 34.4 Cooldown

- 2 sekunde između reactions istog igrača.
- Cooldown se prikazuje u UI-ju (disabled dugmad sa countdown-om).
- Cooldown ne sprječava primanje reactions od drugih igrača.

### 34.5 Animacija

- Reaction pop-up sa avatarom i emoji-jem, prikazuje se 2-3 sekunde pored player area-e pošiljaoca.
- Subtle bounce/scale animacija.
- Više reactions u kratkom periodu stacuju se vertikalno.
- Opciono: blagi sound effect (Could-have za MVP).

### 34.6 Reactions u game log-u

- Svaka reaction se pojavljuje u game log-u kao "[ime] reagovao: 😂".
- Ne dominira log; reactions su grupisane sa timestamp-om bliskim play akcijama.

### 34.7 Reactions tokom svake faze

- ✅ Tokom mog poteza
- ✅ Tokom tuđeg poteza
- ✅ Tokom scoring screen-a
- ✅ Tokom kraja meča (winner screen)
- ❌ NE tokom pause/abandon vote-a (ne smije se zafrkavati ako neko ima konekcijski problem)

---

## 35. Playtest validation plan 🆕

Bez jasnih kriterijuma, "MVP je gotov" je subjektivni utisak. Tri faze sa explicitnim go/no-go kriterijumima.

### 35.1 Faza 1: Internal tehnički test

**Trajanje:** 1 nedjelja

**Cohort:** Dev tim + 2–3 prijatelja tolerantna na bagove.

**Šta merimo (kvantitativno):**

| Metric | Target | Blocker |
|--------|--------|---------|
| Partije završene bez crash-a | 100% | Ne idemo dalje dok ne |
| Invalid state bagovi | 0 | Ne idemo dalje |
| Uspješan reconnect | 100% | Ne idemo dalje |
| Tačnost scoring-a (manuelna verifikacija) | 100% | Ne idemo dalje |

**Minimum sesija:** 15+ kompletnih partija (mix 2P, 3P, 4P).

**Šta merimo (kvalitativno):**
- Lista edge case-ova koji su izazvali zabunu (backlog za fix).
- Lista mesta gdje su igrači zastali ne razumevajući UI (backlog za UX).

**Go/no-go u Fazu 2:** Sva 4 kvantitativna kriterijuma. Kvalitativni su backlog, ne blocker.

### 35.2 Faza 2: Closed alpha

**Trajanje:** 2 nedjelje

**Cohort:** 8–12 ljudi koji **stvarno igraju Žandar** (ne developeri). Pozvani lično, ne preko javnog linka.

**Šta merimo (kvantitativno):**

| Metric | Target | Razlog |
|--------|--------|--------|
| Completion rate (% partija koje se završe / pokrenu) | **80%+** | Ispod znači da UX tjera ljude da odustanu |
| Prosječno trajanje partije | 25–40 min | Ispod 15: target score prekratak; iznad 50: UI confusion |
| Reconnect rate (% igrača koji se vrate) | 90%+ | Test stabilnosti reconnect-a |
| Auto-play događaja po partiji | <1.0 prosek | Iznad 2: timer prekratak ili UX confusion |
| Reactions po partiji | 5+ prosek | Signal da je socijalni sloj funkcionalan |

**Šta merimo (kvalitativno) — obavezni post-game survey, 3 pitanja:**

1. "Kako bi ocenio iskustvo 1–10?" (NPS-style). **Target prosjek: 7+.**
2. "Šta te zbunilo?" (otvoreno pitanje, kvalitativna analiza).
3. "Da li bi ovo igrao opet sa prijateljima sljedeće nedjelje?" **Target: 75%+ Da.**

**Go/no-go u Fazu 3:**
- Completion rate 80%+ **i** NPS prosjek 7+ **i** "igrao bih opet" 75%+.
- Ako bilo koje padne — **stop, fix, ponovi Fazu 2**, ne idi dalje.

### 35.3 Faza 3: Friends & family beta

**Trajanje:** 3–4 nedjelje

**Cohort:** 25–40 ljudi, **organski dolazak preko invite linkova alpha igrača**. Ovo je prvi pravi product-market fit test.

**Šta merimo (kvantitativno):**

| Metric | Target | Značenje |
|--------|--------|----------|
| D1 retention | 35%+ | Vraćaju se sutradan |
| D7 retention | 20%+ | Aktivni nedelju dana posle prve partije |
| Average sessions per user per week | 1.5+ | Učestalost korištenja |
| Organic invite rate | 40%+ | % partija sa bar jednim pozvanim koji nije od dev-a |
| Spontaneous returns | 30%+ | Sobe koje se pokreću bez gurkanja u grupi |

**Go/no-go za investiciju u mobile app:**

- **D7 ≥ 20% I organic invite ≥ 40%** → jasno idi u mobile.
- Jedno bez drugog → analiziraj šta nedostaje, vjerovatno još jedna iteracija web verzije.
- **Oboje ispod target-a** → web verzija nije ready, **ne gradi mobile još**. Pivot ili improvement loop.

### 35.4 Šta NE meriti u MVP-u (da ne gubimo vrijeme)

- ARPU / monetizacija — nema je u MVP-u.
- Funnel optimizacija — premali sample size.
- A/B testing — premali sample size.
- Detaljne heat-mape — premali sample size.
- Demografija (osim ako se ručno prikupi kroz survey).

**Glavni princip:** Mali broj jasnih metrika sa explicitnim target-ima, ne dashboard sa 30 brojki.

### 35.5 Toolset za playtest

- **Analytics:** PostHog (open-source, dobar za MVP, ne treba implementacija od nule).
- **Survey:** Tally ili Google Forms link posle završetka partije.
- **Bug tracking:** GitHub Issues ili Linear (zavisi šta već koristiš).
- **Recording session:** Loom invite alpha testerima za usability sessions (opciono, 2–3 ljudi).

### 35.6 Komunikacija sa testerima

- Discord server ili WhatsApp grupa za feedback.
- Sedmični "what's new" update.
- Direktan kontakt sa testerima — Žandar je social game, treba i tester relationship.

---

**KRAJ DOKUMENTA**

> Ovaj dokument je living document. Promjene se rade preko PR-ova sa updated changelog tabelom na vrhu. Verziju update-uj na svaki značajan PR (v2.0 → v2.1 → ...).
