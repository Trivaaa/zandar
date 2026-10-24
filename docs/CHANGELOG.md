# Changelog — Žandar (Kartaonica)

> Istorija urađenog: šta je promijenjeno, zašto, šta je izmjereno i koje su zamke nađene usput.
> Izdvojeno iz `CLAUDE.md` 2026-10-06 — tekst unosa je prenesen doslovno, samo je lanac `→ ✅` razbijen na naslove.
> Redoslijed je hronološki (najstarije gore). **Novi unos ide na KRAJ**, kao `## N. naslov`.
> Stanje projekta (Done / Partial / Not done) i spisak „Sljedeće" ostaju u `CLAUDE.md`.

## 1. Rani koraci

- ✅ Bot engine
- ✅ name generator
- ✅ bot server integration + Quick Play
- ✅ bot reactions/timing
- ✅ home/matching redesign (v3.2)
- ✅ merge feat/quick-match.

**Design System frontend build (docs/DESIGN_SYSTEM.md §11):** ✅ A1 tokens
- ✅ A2 positional grid
- ✅ B1 SeatChip
- ✅ B2 positions
- ✅ B3 HandArea + Card
- ✅ B4 capture/trail
- ✅ B5 TurnTimer
- ✅ B6 ScorePill
- ✅ B7 ReactionFab
- ✅ B8 pause/abandon (**Faza B kompletna**)

## 2. integracija

**integracija** (`GameScreen` u live room)

## 3. full-felt raspored

**full-felt raspored** (v3.2, redizajn po referencama)

## 4. UX fixes s telefona

**UX fixes s telefona** (tap-to-play, overlap, poleđine, timer)

## 5. polish

**polish** (arc timer, bočni backs horizontalno, mikro-animacije)

## 6. C4 anti-leak

**C4 anti-leak**

## 7. reconnect (D2)

**reconnect (D2)**

## 8. persistence

**persistence** (file-snapshot; gate skinut)

## 9. timer vidljivost

**timer vidljivost**

## 10. Faza D1 PWA

**Faza D1 PWA** (Faza D kompletna)

## 11. desktop UX

**desktop UX** (centriran stage, mobilni netaknut)

## 12. timer pilula iznad avatara

**timer pilula iznad avatara** (3 stanja; server šalje rok i botu → na svakom igraču)

## 13. C3 host bot-fill toggle

**C3 host bot-fill toggle** (`POST /api/rooms/:id/bot-fill`; host puni/skida botove u privatnoj sobi, ljudi imaju prioritet; `botFill` room-level flag, NE per-player isBot)

## 14. `/zandar/room/:id` → 308 redirect

**`/zandar/room/:id` → 308 redirect** (next.config `redirects()`)

## 15. capture-flash

**capture-flash** (`animate-capture-flash` okida se na rast `capturedCounts`)

## 16. PWA banner pozicija

**PWA banner pozicija** (na `/room/*` ide na vrh da ne prekriva ruku)

## 17. fix: bot-stuck na timeout

**fix: bot-stuck na timeout** (back-compat za stari `botProfile.timing` oblik u `scheduleBotMove` + `autoPlay` fallback u `driveBotTurn`; bloker, vidi Code & workflow conventions)

## 18. §50 feedback sloj

**§50 feedback sloj** (vidi DESIGN_SYSTEM §12): Faza 0 postavke+haptika+On/Off preklopke (`FeedbackToggles`, localStorage), Faza 1 event sloj (`deriveGameEvents` u game-core + 12 testova, `useGameEvents`), Faza 3a J-sweep emphasis, Faza 3b capture **collect** (karte iz `MoveReveal`-a odlete u pile kupca, WAAPI), **Faza 2 zvuk** (sintetizovani SFX preko Web Audio, bez asseta — `lib/sound.ts`)

## 19. move reveal

**move reveal** (server šalje `lastMove`; ~1.8s prikaz ko/koju kartu/šta pokupio/ŽANDAR)

## 20. reakcije uz sjedište

**reakcije uz sjedište** (emoji pored pošiljaoca, ne gore-centar)

## 21. match-end UX

**match-end UX** (timovi po imenu + Revanš / Novi sto i igrači / X→home)

## 22. fix: J na početni sto → dealeru

**fix: J na početni sto → dealeru** (`award_to_dealer`; J ne ostaje na stolu, PRD v2 §6)

## 23. fix: bot-stuck na praznoj ruci

**fix: bot-stuck na praznoj ruci** (turn preskače prazne ruke kod neravnomjernog špila — `getNextPlayerWithCards`; bloker)

## 24. vidljiv špil + deal animacija

**vidljiv špil + deal animacija** (`DeckPile` se stanjuje po `deckCount`; `[data-deck]` sidro; `dealFromDeck` — poleđine lete iz špila ka svim igračima na re-deal; deal animacija više NIJE odgođena)

## 25. deal na startu partije + timer poslije dijeljenja

**deal na startu partije + timer poslije dijeljenja** (`useGameEvents` sintetizuje `deal` na prvom "playing" snapshotu kad `capturedCounts`=0 → deal animacija ide i na početku, ne samo na re-deal; `dealFromDeck` sad dijeli **više karata po igraču + 4 na sto** round-robin uz `[data-table-drop]` sidro i vraća trajanje; `GameScreen` sakriva turn-timer dok karte "padaju" pa ga pokaže čim dijeljenje završi → jasan slijed na startu)

## 26. veće/ljepše karte i špil (DS §10 smjer)

**veće/ljepše karte i špil (DS §10 smjer)** (nova `CardBack` komponenta — zlatna rešetka rombova na feltu, token-only, veličine xs/sm/md/lg; dijele je poleđine protivnika, špil i deal-duhovi = jedan vizuelni jezik; poleđine protivnika veće — partner 30×42, bočni 52×36; `DeckPile` deblji štos + `CardBack` gornja karta + chip-badge za broj; lica karata mekši radius `token-md` + suptilan ring)

## 27. animacije +10% sporije

**animacije +10% sporije** (sve CSS keyframes trajanja ×1.1; JS fly collect/deal ×1.1; `MoveReveal` READ_MS 1100→1210)

## 28. vidljiviji "ko je na redu" (industrijski standard)

**vidljiviji "ko je na redu" (industrijski standard)** (`TurnTimer size="ring"` — kružni conic-gradient countdown OKO avatara, boja po pragu zeleno/narandžasto/crveno + glow; `SeatBubble` aktivni avatar dobija zlatni glow + `scale-105`; zamijenio slabo vidljivu pilulu iznad)

## 29. fix: `NOT_SUBSCRIBED` na potez

**fix: `NOT_SUBSCRIBED` na potez** (socket reconnect / restart servera nakon deploya → potez ide na socket bez `socket.data` → server odbija; klijent sad ima `emitAction` self-heal: na `NOT_SUBSCRIBED` transparentno re-subscribe + retry JEDNOM (potez nije primijenjen pa je retry siguran, isti `clientMoveId` = idempotentno); `subscribeSocket` promise-based, dijele ga connect/resume i akcije)

## 30. §43 human-only analitika

**§43 human-only analitika** (P1): `track()` helper (`lib/posthog.ts`); `quickplay_requested`/`quickplay_matched` (matchType, waitMs, **humansAtTable/botsAtTable/botSeatShare**) + `bot_seat_filled` u `/api/quickplay` (klijent šalje `guestId` u body); `game_started`/`hand_finished`/`match_finished` obogaćeni sastavom stola + `isPublic`, a match/hand **premješteni u `broadcastGameState` (`emitEndAnalytics`, guard po matchId, po svakom čovjeku)** da hvataju i partije koje bot završi + `match_finished.won`. Otključava: bot_seat_share, human-only kohorta (filter botsAtTable=0), win_rate_by_session. **Caveat:** `time_to_first_match` server-side ≈ 0 (matchmaking sinhron) — pravi client-perceived TTFM je mali follow-up

## 31. Quick Play → pravo u Sto (bez lobby flash-a)

**Quick Play → pravo u Sto (bez lobby flash-a)** (`/room/:id` kad je `status=playing/finished` drži tih loading dok `game:state` stigne socketom, umjesto da bljesne host-lobby; lobby ostaje samo za `/create`, `status=waiting`)

## 32. turn-indikator vraćen na horizontalni pill

**turn-indikator vraćen na horizontalni pill** (`TurnTimer size="pill"` iznad aktivnog avatara; kratkotrajni conic-ring eksperiment izbačen — pill jasniji na uređaju; zlatni puls pojačan: `ring-4` + `scale-110` + veći/svjetliji glow)

## 33. uklonjeni redundantni count-badge

**uklonjeni redundantni count-badge** (`bg-accent` broj karata sa `SeatBubble`-a — vidi se preko lepeze poleđina / vlastite ruke)

## 34. MOBILE_PLAN_STATUS

**MOBILE_PLAN_STATUS** (procjena native Android/iOS pakovanja postojećeg PWA-a: TWA + Capacitor, bez React Native; `docs/MOBILE_PLAN_STATUS.md`)

## 35. kraj ruke = host-driven

**kraj ruke = host-driven** (uklonjen server-side auto-advance posle 4s u bot partijama; host pokreće sljedeću ruku dugmetom "Sljedeća ruka →" → `game:nextHand`; `autoNextHand` obrisan — igrač kontroliše tempo, ne sto sam)

## 36. overlay sloj iz Lovablea (korak 3)

**overlay sloj iz Lovablea (korak 3)** (`components/overlay/`: `MoveReveal` (+`MoveRevealLive` kao vlasnik sata i `collectToPile` leta), `ScorePill` (prop-driven `expanded`, `data-pile-id`, razrada po 4 kategorije), `EmojiReactions` (`EmojiReactionRow` 4×2 grid u `ReactionFab` ljusci + `ReactionBubble` uz sjedište), `PauseAbandonOverlay` (prop-driven `remainingMs`); `app/overlay.css` u `layer(components)`; `sr.ts` + blokovi reveal/score/reactions/pause; `LastMove` izvezen iz shared-types; preview `/dev/overlays`. Port-fixevi naspram Lovable izvora: collect faza gasi `.reveal::before` i tekst umjesto panela — panel je predak kartama koje `collectToPile` nosi u pile; vote-vrste na `data-vote-seat-id` (ne `data-seat-id`, to je sidro za let); emoji iz `lib/reactions.ts` kao jedini izvor; razrada dobija samo zadnju ruku)

## 37. fix: `crypto.randomUUID` van sigurnog konteksta

**fix: `crypto.randomUUID` van sigurnog konteksta** (`getGuestId` je pucao na svakom http:// pristupu — LAN/IP test sa telefona — i to PRIJE `fetch`-a, pa je `/brza` javljao "Greška pri traženju stola" a log servera bio prazan; sad UUID v4 preko `getRandomValues` uz `Math.random` fallback)

## 38. fix: prvi `game:state` bez `turnDeadline`

**fix: prvi `game:state` bez `turnDeadline`** (svježa soba je "playing" prije nego iko otvori socket, a rok je postavljao samo `broadcastGameState` → pilula je crtala 0; rutiranje izdvojeno u `routeTurnTimers()` i pozvano i iz `room:subscribe`; uz to `PlayerSeat` crta pilulu samo kad ima šta da odbrojava)

## 39. reveal panel ostaje traka

**reveal panel ostaje traka** (`max-width: min(21rem, 92vw)` + `flex-wrap: nowrap` — bez toga se lomio u kolonu i pokrivao sto i partnera na 390px)

## 40. korak 4 iz Lovablea — kraj ruke / kraj meča

**korak 4 iz Lovablea — kraj ruke / kraj meča** (`components/overlay/RoundEndOverlay.tsx` + `Toast.tsx`; `lib/piles.ts` — `pilesOf` izvučen iz `ScorePill`-a da ga obje komponente dijele; ~119 linija inline modala izbačeno iz `GameScreen`-a, kao i mrtvi `pileLabel`/`pileMembers`; scrim i okvir daje ekran, komponenta samo sadržaj. Port-fixevi: dugmad se ne renderuju bez handlera, primarno dugme ima busy tekst. **CSS je dopisan, ne prekopiran** — Lovable baza nema naše device-fixeve (`.reveal::before` collect, `nowrap`, `scorepill--compact`), pa bi kopija fajla tiho vratila bug gdje karte izblijede usred leta u pile)

## 41. korak 5 iz Lovablea — funnel

**korak 5 iz Lovablea — funnel** (`components/funnel/HomeScreen.tsx` + `MatchingTable.tsx`, `app/funnel.css` u `layer(components)`; `/` i matching ekrani prešli sa sirove Tailwind palete na tokene; status stringovi iz `sr.matching` umjesto hardkodirani po ekranima; preview `/dev/funnel`. Port-fixevi: `places` pada na 4 kad roster još nije stigao (Lovable je vezao broj mjesta za `players.length`, pa je "Pripremamo sto..." faza crtala prazan felt), `MatchingPlayer` strukturni tip da se uklope i `RoomPlayer` i `PublicPlayer`. **Home je izgubio feature-grid, footer i tagline** — brif je tražio jednu glasnu akciju; stari ekran je u gitu ako se vraća)

## 42. pauza i prekid partije na serveru (PRD v2 §32)

**pauza i prekid partije na serveru (PRD v2 §32)** (`apps/server/src/pause.ts` čiste odluke + automat u `index.ts`: grace 30s bez zaustavljanja partije → `paused_for_reconnect` 2 min sa `game:waitMore` → `abandon_vote` 60s sa `game:abandonVote` → `abandoned`; glas "čekaj" produžava 5 min, povratak igrača u bilo kojoj fazi osim `abandoned` vraća u `playing`. Sto pun botova se raspušta bez glasanja (PRD v3.1 #5). `GameState.pauseEndsAt` je apsolutni rok — opciono polje, stari snapshot-i ga nemaju; `armPauseTimer` se zove i na hydrate, pa pauza preživi deploy umjesto da se zaglavi. Trajanja kroz `GRACE_MS`/`PAUSE_MS`/`VOTE_MS`/`WAIT_EXTENSION_MS` env — bez toga jedan prolaz traje 3.5 min. Verifikovano socket sondom: bot-sto → prekid za 1.6s, dva čovjeka → pun tok uklj. povratak i glasanje, i restart servera usred pauze → soba nastavi tok)

## 43. fix: malformiran `room:subscribe` rušio server

**fix: malformiran `room:subscribe` rušio server** (`verifyToken` je slao `undefined` u `hashToken`, `ERR_INVALID_ARG_TYPE` u socket handleru = pad procesa; sad je nevalidan ulaz odbijen token)

## 44. korak 6 iz Lovablea — privatni lobi

**korak 6 iz Lovablea — privatni lobi** (`components/lobby/`: `CreateRoomScreen`, `LobbyScreen`, `JoinRequestScreen`; `app/lobby.css` u `layer(components)`; `sr.ts` + `create`/`lobby`/`join`/`back`; preview `/dev/lobby` sa svih sedam faza zahtjeva. **Duplikat lobija uklonjen** — isti markup je živio u `app/room/[roomId]/page.tsx` I `components/RoomScreen.tsx` (kopija sa identičnim stanjem na istim linijama); oba sad renderuju isti `<LobbyScreen>`, blok je bajt-identičan. Konekcijski badge ostaje na roditelju — to je stanje socketa, ne lobija. **`🤖 Popuni mjesta botovima` obrisan iz oba fajla** (HARD RULE 5); copy je sad `Popuni prazna mjesta` / `Ostavi mjesta prazna`. Port-fixevi: greška pri slanju zahtjeva ostaje UZ formu (njihova `error` faza je slijepa ulica sa samo "Nazad", a mrežni promašaj se rješava ponovnim slanjem), i broj sobe vraćen u meta liniju gosta — `Soba a1b2c3 · 1/4 igrača · 21 poena`, kako je živi ekran i pokazivao)

## 45. design tokeni v3.3 iz Lovablea (korak 1)

**design tokeni v3.3 iz Lovablea (korak 1)** (`globals.css`: palette — felt `#1B3A34`, mesing `#C9A227`, `--turn-active` `#E0B93A`; **`--danger-signal`** za signale NA feltu jer `--danger` ima samo 2.0:1 prema feltu, pa bi najhitnije stanje pilule bilo manje vidljivo od mirnog; `--card-face/-ink/-ink-red`; puna `--type-*` rampa mapirana na `--text-*` utility imena — imenovana `--type-*` da se ne miješa sa `--text`/`--text-muted` koje su BOJE; 9 preserved utility klasa prepisano na `@utility` (v4 idiom). **`--turn-ring` → `--turn-active`** — indikator je pilula, ne prsten; mapiranje `--color-turn` ostaje pa su sve `ring-turn` klase netaknute. Reduced-motion kolapsira `--t-*` na 1ms uz **dva izuzetka**: `--d-reveal-hold` zadržava vrijednost (prikaz sadržaja, ne pokret — na 1ms korisnik nikad ne vidi ko je šta odigrao), `--t-turn-pulse` ide na `0s` a ne 1ms (1ms petlja je stroboskop). Otud `--d-` prefiks: `--t-` je pokret i kolapsira, `--d-` je trajanje prikaza i nikad. **Fontovi**: Geist → Archivo Black (numerika) + IBM Plex Sans (UI), `subsets: ["latin", "latin-ext"]` — bez `latin-ext` č ć ž š đ padaju na sistemski font usred riječi; `body` je imao hardkodiran Arial pa Geist nikad nije ni stizao na ekran)

## 46. felt sloj iz Lovablea (korak 2)

**felt sloj iz Lovablea (korak 2)** (`components/felt/`: `PlayingCard`, `CardBack`, `PlayerHand`, `DeckPile`, `TurnPill`, `PlayerSeat`, `TurnBanner`, `TableSurface`; `app/felt.css` u `layer(components)`. Tipovi se poklapaju 1:1 sa `shared-types`, pa je port bio zamjena importa. **`useCountdown`** — sat je izašao iz komponente u roditelja (`TurnPill` prima sekunde, ne rok), uz SSR-safe obrazac `now === null` na prvom renderu, inače server i klijent izračunaju različit broj sekundi = hydration mismatch. Port-fixevi: **trail dopisan** (`onTrail`/`canTrail`) — Lovable ga nije napravio, a bez njega se legalan potez ne može odigrati; **slot za reakciju** na `PlayerSeat` (+ `position: relative` na `.seat`); `data-seat-id` sidro za tebe je na omotaču ruke jer `collectToPile` cilja baš njega. `ScorePill` NE smije nositi `data-seat-id` — to sidro već koristi `flyAnimation`, pa bi karte letjele u overlay umjesto u pile; koristi `data-pile-id`)

## 47. poleđina karte kao predmet, ne rupa

**poleđina karte kao predmet, ne rupa** (zlatna rešetka je na feltu čitala kao providna mreža kroz koju se vidi sto; sad token `--card-back` `#10302a` — vlastiti karton tamniji od felta — + JEDAN zlatni okvir (`.card-back::after`, inset proporcionalan širini karte pa drži isti odnos od xs do lg). `--card-back-art: none` je kuka: kad stigne prava ilustracija, `url()` na jednom mjestu, a okvir se gasi sa `display: none`. `.card-plain` (slojevi štosa) na istom kartonu pa špil i gornja karta čitaju kao jedan predmet. Lepeza na sjedištu dobila tamni rub — dvije susjedne poleđine su davale jednu spojenu liniju; identično na svakoj, jer poleđina koja izgleda drugačije je curenje informacije. Fix: pivot lepeze je bio zakucan na indeks 2 pa je lepeza od 4 karte bila nakrivljena ulijevo → sad preko `--fan-n`. `flyAnimation` deal-duh usklađen — crta se inline i NIJE pokriven `felt.css`-om, pa je karta letjela jednako a slijetala drugačije)

## 48. legacy čistka

**legacy čistka** (obrisani `SeatBubble`, `HandFan`, `DeckPile`, `MoveReveal`, `CardBack` — felt/overlay sloj ih je zamijenio, nula uvoza; `GameView`, `ReactionPanel`, Sentry demo, Next default asseti. Stari Faza-B set je tad ostao živ — obrisan u sljedećem potezu, vidi ispod)

## 49. proza i greške na 16px + `RulesModal` na tokene

**proza i greške na 16px + `RulesModal` na tokene** („body text minimum 16px“ je bio brif, ali veličinu bira komponenta pa token merge to nije mogao riješiti. `RulesModal` je bio dvostruki prekršaj — najduži tekst u proizvodu na 14px, i jedini živi ekran ostao na sirovoj `zinc` paleti (11 mjesta koja zaobilaze tokene): proza na `text-base`, zinc/yellow → `surface-raised`/`accent`/`accent-contrast`/`muted`, `rounded-token-*`, zatvori-dugme 48×48 tap-meta, `hover:` → `active:`. Poruke o greškama (home, kreiranje sobe, zahtjev za ulazak, lobby „treba još igrača“) sa 14 na 16px — greška je tekst koji igrač MORA pročitati. `? Pravila` dugme sa 13px/28px na 14px/48px tap-metu. Namjerno ostalo na `text-sm`: statusne riječi na sjedištu, natpis špila, labele formi, imena u razradi — sekundarne labele, ne proza)

## 50. `capture-flash` i `jack-sweep` animiraju `opacity`, ne `box-shadow`

**`capture-flash` i `jack-sweep` animiraju `opacity`, ne `box-shadow`** (bile su jedine dvije animacije koje su kršile vlastito pravilo „animira se samo transform i opacity“; animirani `box-shadow` tjera browser da preračunava sjenku svaki frejm — glavni izvor zastajkivanja na srednjem Androidu, a to je ciljni uređaj. Sjenka je sad PRE-RENDEROVANA statički na klasi, animira se samo `opacity` (jack-sweep zadržava `scale`, što je transform); element je gol overlay `absolute inset-0` pa mu statična sjenka ne smeta. Trajanja tokenizovana: `--t-capture-flash` 550ms, `--t-jack-sweep` 770ms — ISTE vrijednosti kao ranije `0.55s`/`0.77s`, tempo se ne mijenja pa nema šta da se retestira. Oba ulaze u reduced-motion kolaps. Provjereno: nijedan keyframe u globals/felt/overlay/funnel/lobby više ne dira `box-shadow`, `filter`, `width`, `height`, `top`, `left` ni `background-color`)

## 51. karte na stolu opet animiraju ulazak

**karte na stolu opet animiraju ulazak** (regresija iz porta felt sloja: `TableSurface` prima `landFrom`/`landingCardIds` ali ih `GameScreen` nije prosljedivao, pa je stari `animate-card-in` otišao bez zamjene. `landDirection()` mapira `lastMove.playerId` na smjer RELATIVAN na tebe (ti si uvijek dole), istom logikom kojom `arrangeSeats` slaže sjedišta. `landingCardIds` se puni samo ako je odigrana karta JOŠ na stolu — to je trail; kod kupljenja karta odmah ode pa nema šta da sleti. CSS `table-land` je već postojao i ispravan je)

## 52. Faza-B set i njegovi dev preglednici obrisani

**Faza-B set i njegovi dev preglednici obrisani** (9 komponenti — `Card`, `HandArea`, `TableArea`, `PauseAbandonOverlay`, `ScorePill`, `SeatChip`, `GameTable`, `TableSeats`, `TurnTimer` — i 8 `/dev` stranica koje su ih držale u životu; nijedna produkcijska ruta ih nije uvozila. Glavna korist nije manje koda nego uklanjanje dvojnika: postojale su DVIJE `Card`, DVIJE `ScorePill`, DVIJE `PauseAbandonOverlay` — pri svakoj izmjeni je trebalo prvo utvrditi koja je živa. `/dev` je sad 6 preglednika koji svi pokazuju ono što se stvarno isporučuje: `/dev/felt2`, `/dev/overlays`, `/dev/funnel`, `/dev/lobby`, `/dev/game`, `/dev/reactions`. **NIJE dirano**: `MatchingTable` i `SeatPuck` — uvozi ih neispraćeni `MatchingScreen.tsx` u radnom stablu, pa bi brisanje polomilo rad koji nije commitovan)

## 53. Android (Capacitor) — web sloj gotov

**Android (Capacitor) — web sloj gotov** (odluka: Capacitor, ne TWA — daje push i Play Billing šine za kasnije. **Ključ je `pageExtensions`**: u web buildu lista sadrži `web.tsx` pa `page.web.tsx` postaje `/room/:roomId`; u mobilnom je nema, Next fajl ignoriše, `[roomId]` ostaje bez `page` fajla → nema dinamičkog segmenta → `output: "export"` prolazi bez `generateStaticParams`. Duži oblik mora biti PRVI u listi, inače `tsx` od `page.web.tsx` napravi rutu `page.web`. Dovršen ranije započeti route split: `RoomScreen` je bio fork `page.tsx`-a od PRIJE pause/abandon slice-a (nedostajali `handleWaitMore`/`handleAbandonVote`) — resinhronizovan pa su oba `[roomId]/page.tsx` obrisana; `MatchingScreen` je još pokazivao na legacy `MatchingTable` i hardkodirane stringove. Novi blokeri koje procjena nije predvidjela: `app/manifest.ts` se kompajlira u route handler pa traži `export const dynamic = "force-static"` (bez toga export pada), i ESLint je linto kopirani bundle u `android/` (31 lažna greška). Native straže: `lib/platform.ts` (`isNative`, `resolveApiBase` — bez localhost fallback-a u APK-u), `NativeShell` (hardversko *nazad*; bez njega dugme gasi app usred ruke), `PwaManager` ćuti u shell-u. `scripts/build-mobile.mjs` umjesto `cross-env` — inline `VAR=x` ne radi u PowerShell-u. Verifikovano: oba builda, 155/155 testova, export serviran preko HTTP-a (svi 200, `/dev/*` 404, asseti na apsolutnim putanjama), `cap sync` našao sve plugine bez pnpm hoisting workaround-a. **Verifikovano na uređaju 2026-09-08** — Galaxy S10e / SM-G970F, Android 12; `./gradlew assembleDebug` daje `app-debug.apk` 5.2 MB, instaliran preko *wireless debugging*-a (USB kabl bez data linija). Toolchain: zaseban **Temurin JDK 21**, jer Android Studio 2026.1 nosi JDK 25 koji Gradle 8.14.3 odbija (`Unsupported class file major version 69`) — procjena je pogrešno pretpostavljala da je bundlovani JDK 21. Detalji u `docs/MOBILE_PLAN_STATUS.md`)

## 54. pravne stranice

**pravne stranice** (`/privatnost`, `/uslovi` — Play traži javni URL politike privatnosti, a uslovi nose objavu o kompjuterskim protivnicima, jedino mjesto gdje ta riječ smije da postoji po HARD RULE 5. Server komponente uz `RulesModal` obrazac: tokeni, `text-base`, proza inline. Linkovi na home-u idu kroz `legalSlot`, pa `HomeScreen` ostaje bez rutiranja. **NACRTI — nisu pravni savjet**, kontakt adresa je placeholder)

## 55. merge na `main` + deploy

**merge na `main` + deploy** (26 commita spojeno iz `feat/android-capacitor`; sve od token-mergea naovamo je do tad stajalo van produkcije. Push = auto-deploy Vercel + Railway istovremeno)

## 56. produkcija verifikovana 2026-09-09

**produkcija verifikovana 2026-09-09** (`kartaonica.com`: `/`, `/brza`, `/create`, `/privatnost`, `/uslovi` → 200; svih 7 `/dev/*` → 404, `DevLayout` gasi preglednike u produkciji. Serviran CSS sadrži `--turn-active`, `--card-back`, `--danger-signal`, `--t-capture-flash`, `--type-num-md`, Archivo + Plex — i **nula** tragova starog `--turn-ring` / `#e0a92e`, pa nije keš. Railway `/health` 200, hidracija prošla bez zaglavljivanja uprkos novom opcionom `pauseEndsAt`. Ruka odigrana u browseru)

## 57. Android APK radi na uređaju

**Android APK radi na uređaju** (`CORS_ORIGIN` dobio `https://localhost` na Railwayu — bez toga APK se otvori i odmah stane jer padaju i REST i socket; to je bio jedini bloker. Puna ruka odigrana IZ APK-a, ne iz browsera)

## 58. felt bez okvira oko igrača (feedback s telefona)

**felt bez okvira oko igrača (feedback s telefona)** (tri primjedbe sa uređaja: okviri oko igrača ružni, tvoj timer previsok, „Ti si na potezu“ prevelik. `.seat` je ostao bez `border`, `background-color` i `border-radius` — igrač stoji direktno na feltu; `padding`/`min-width` ostaju jer nisu kutija nego rezervisan prostor da gornje sjedište ne poskakuje. **Stanje sjedišta je sad prsten oko avatara**: `--seat-ring` / `--seat-ring-w` / `--seat-glow` se deklarišu na `.seat`, a troši ih jedan `box-shadow` na `.seat__avatar` — tim u inset slotu, potez u spoljnom, pa se nikad ne gaze. **Default MORA stajati na `.seat`, ne na avataru**: deklaracija na samom elementu pobjeđuje naslijeđenu, pa bi default na avataru tiho gasio boju tima. Boja i dalje nije jedini nosilac tima — `arrangeSeats` drži partnera uvijek gore, pa je pozicija nekolorni kanal koji je ranije bila debljina bordera (komentar uz `--team-*` tokene ispravljen da ne pokazuje na debljinu koje nema). `.pill--you` 2.6rem → 1.9rem i `width: 100%` → `fit-content` — bila je vezana za širinu bannera jer dijele jedan `flex-col` omotač; banner `text-xl` → `text-base`. **Regresija koju je to razotkrilo i koja je popravljena u istom potezu:** broj u piluli stoji u sredini, a zlatni fil opada slijeva — na širokoj piluli je cifra padala desno od granice, na uskoj tačno na nju, pa je druga cifra nestajala na tamnom, i to sve gore kako vrijeme ističe (u zadnjim sekundama, kad je broj najvažniji, bio bi nevidljiv). Broj sad nosi tamnu pločicu i svijetlo mastilo, a traka iza njega zadržava pun kontrast prema filu. Verifikovano headless screenshotom `/dev/game` na 390px, uz baseline snimak sa `git stash`-om za razdvajanje mojih promjena od postojećih — time je potvrđeno da **bočna lepeza poleđina izlazi van desne ivice i u baseline-u**, dakle postojeće, nije dirano)

## 59. turn-indikator: banner i pilula spojeni u jednu traku

**turn-indikator: banner i pilula spojeni u jednu traku** (retest na uređaju: „i dalje široko-visoko, treba suptilnije“. Uzrok nije bila samo veličina nego to što su nad rukom stajala **dva elementa koja govore istu stvar** — rečenica i zasebna pilula ispod nje. Sad je jedan: `TurnBanner` prima `secondsRemaining`/`totalSeconds`, broj stoji UZ rečenicu (pa ga pražnjenje nikad ne prekrije — to je bio prošli bug sa pločicom, sad nepotrebna), a vrijeme curi kao linija od 0.15rem po donjoj ivici; hitnost ide bojom (`--danger-signal` na broju i liniji), ne veličinom. Visina bloka prepolovljena. Bez roka (`showTimer=false`, dok karte padaju) traka je gola rečenica. `banner__clock` ima `tabular-nums` da se traka ne trza dok broj pada 10 → 9, a `.banner` je dobio `overflow: hidden` da linija prati radijus. **Mrtav sloj obrisan u istom potezu:** `TurnPill` je izgubio `isYou`, pa su otišli `.pill--you*`, `.pill__notch`, `pill-pulse` keyframes i `.pill--other` modifikator — pilula je sad samo sjedišna, njena tri pravila su uvučena u `.pill` bazu. `/dev/felt2` pokazuje obje varijante. Verifikovano headless screenshotom `/dev/game`, uključujući crveno stanje kroz `--virtual-time-budget`)

## 60. karte na stolu se čitaju horizontalno

**karte na stolu se čitaju horizontalno** (feedback s telefona: „UX je polupan kad ide horizontalno, preklapa se tekst, ne vide se sve karte kad ih je puno". Uzrok nije bio `.table__cards` nego širina koju mu je felt davao: play-zona je bila `w-[calc(100%-13rem)] max-w-[230px]` jer su bočna sjedišta na `top-[42%]` uzimala 13rem iz iste vertikalne trake — na 360px (S10e) ostajalo je **108.8px, tačno jedna karta po redu**, pa se sto čitao kao kolona. **Sjedišta su otišla u gornji luk** (`top-[20%]`, partner ostaje gore-centar) i sto uzima skoro punu širinu → mreža `repeat(var(--table-cols,4), max-content)`, 4 kolone na telefonu / 5 na `md` (`md:[--table-cols:5]` u JSX-u, jer `var()` u `repeat()` se supstituiše tekstualno). Mreža, ne `flex-wrap`: centrirani flex red se **re-centrira na svako slijetanje**, tj. pomjera karte koje niko nije dirao, a mreža drži slot. Izmjereno 360/390/desktop: 4/8/12 karata → 1/2/3 reda. **Play-zona je sad pojas** (`top-[33%] bottom-[190px]` + flex centriranje), ne kutija centrirana `-translate-y-1/2` koja je rasla u OBA smjera. **`.table` → `.felt-table`** — `table` je i Tailwind utility (`display: table`) iz kasnijeg sloja, pa `display:flex` iz `felt.css`-a NIKAD nije stizao na element, a s njim ni `justify-content`/`align-items`; ista kaskadna zamka kao `.seat{position:relative}`, samo obrnut smjer. Bez tog fixa raspodjela visine (drop `flex: 0 1 auto` + traka izbora) nije radila. **Uputstvo ima jedan kanal** — traku iznad ruke: `blockedTitle`+`blockedBody` (103 znaka u ~109px širokoj kutiji = ~9 prelomljenih redova koji su rasli PREKO trake — to je bio treći snimak) zamijenio je `mustCapture`, a `.table__hint`/`.table__trail`/`.table__blocked` su otišli iz `TableSurface`-a. `TurnBanner` je dobio `text`/`tone`; ton je `must` samo za odbijanje, jer je „Izaberi grupu" ponuda a ne prekršaj. Odbijen trail se sad **osjeti** (`lib/motion.ts` — `shake` na WAAPI + `HAPTIC.error`), pa poruka ne mora da zauzima prostor; `stopPropagation` na slotu jer je karta unutar tap-mete play-zone, inače bi uspjelo kupljenje okinulo i trzaj. Copy skraćen jer traka dijeli pojas sa špilom — izmjereno: sve tri rečenice sad počinju desno od špila (66/100/76 px vs špil do 64). Uz to: **jedna površina umjesto dvije ugniježdene** (omotač u `GameScreen`-u je proziran i pun visine pojasa — daje `.felt-table`-u visinu na koju se procenti razrješavaju, pa traka izbora ima gdje da se zaustavi umjesto da izraste na ruku), traka izbora `nowrap` + bočni skrol i grupe u red (114 → 80px, čime sto od 8 karata zadržava drugi red), `.table__drop--trail` više ne mijenja radijus, `data-table-drop` skinut sa `.table__drop` (stajao je na dva elementa a `flyAnimation` ga hvata `querySelector`-om), i **move-reveal centriran na play-zonu** (`top-[18%]` je otkad su sjedišta na luku padao preko protivnika — panel koji imenuje igrača je zaklanjao upravo njega). Verifikovano headless na 360/390/desktop × 4/8/12 karata × sa/bez izbora: nula sudara sa sjedištima, rukom, trakom i špilom; jedini rez je 12 karata + traka izbora na 360px (force-capture taj ugao praktično onemogućava, a na 390px i on staje). Reduced-motion: shake je no-op. **Mergovano u `main` i deployovano 2026-09-10** (`2b61c81`; serviran CSS na kartaonica.com sadrži `felt-table`, nema `table__blocked` — nije keš). APK rebuild-ovan (Capacitor pakuje web, pa se APK NIKAD ne osvježava sam od deploya). **Ostaje provjera na uređaju** — pomjeranje sjedišta u luk je najveća vizuelna promjena i jedino što se ne može procijeniti headless-om.)

## 61. redizajn stola po UI referencama (v3.4)

**redizajn stola po UI referencama (v3.4)** (feedback: „nisam zadovoljan kako izgleda UX stola niti UI", uz reference. Princip iz referenci: **najviše 3 karte u redu, a veličina karte se IZVODI iz broja karata** tako da mreža uvijek stane u svoju kutiju — 1–2 karte su najveće, 9 ih je manje, ali se sve vide odjednom i bez skrola.

**Fluidna karta.** `TableSurface.tableGrid(n)` računa kolone/redove (max 3; četvrta kolona je ventil za rijedak rep od 10–12 karata) i šalje ih inline kao `--table-cols`/`--table-rows`; `.table__cards` iz njih i iz **container-query jedinica** (`100cqw`/`100cqh`) izvodi `--table-card-w`, a nova veličina `card--fluid` je jedino čita. `.table__drop` je query container: `container-type: size` traži da mu veličina NE zavisi od sadržaja, otud `flex: 1 1 0` (basis 0, ne auto) — posljedica je da traka izbora sad **smanji karte** umjesto da ih izgura iz pojasa (stari poznati rez „12 karata + traka izbora"). Panel je otišao: karte leže direktno na suknu, a `.table__drop` ostaje samo kao tap-meta za trail i meta za `shake`; trail affordance je prešao na ovalni obod (`.felt-ring[data-trail]`, opacity cross-fade unaprijed nacrtane sjenke). `--card-w-min` je 1.9rem jer viši pod nadjača fit i mreža se ODSIJECE umjesto da se smanji.

**Vertikalni budžet je sad deklarisan jednom** (`--stage-*` na `.felt-stage`), pa svako apsolutno dijete čita varijablu umjesto svog px-a — redizajn je dodao dva nova potrošača istog prostora (zaglavlje i tvoje sjedište), a stari magični brojevi (`top-[33%]`, `bottom-[190px]`, `bottom-[150px]`, `bottom-[132px]`, `top-[54%]`, `bottom-24`) su se već jednom razišli. `--stage-header-h` živi u globals `:root` jer ga čita i PWA banner, koji je `fixed` izvan pozornice. **Sve vrijednosti su IZMJERENE, ne procijenjene** — prve procjene su bile 1–2.5rem premale, pa su partnerov čip i tvoj avatar ulazili u sto.

**Ekran po referenci:** `FeltHeader` (meni · Kartaonica / podnaslov / „Runda N" · zvuk), ovalni obod, sjedišta kao avatar-krug sa čipom ime+rezultat ispod (`pileIdOf` u `lib/piles.ts` — isto pravilo koje razrada koristi za redove), **tvoje sjedište** (ranije ga uopšte nije bilo) sa zlatnim prstenom na potezu, `GameMenuSheet` kao odredište hamburgera (skuplja rezultat, pravila i izlaz iz ćoškova felta; renderuje POSTOJEĆI `ScorePill`, bez duplikata). Bočna sjedišta su **vraćena sa gornjeg luka na ivice** — sigurno je samo zato što fluidna veličina sad postoji: širina sjedišta je tačno `--seat-gutter`, a sto je uvučen za isto toliko, pa se čip i karta ne mogu sudariti ni na jednoj širini. **ODIGRAJ dugmeta nema** — tap-to-play ostaje, pa donji bar iz reference nije ni građen.

**Lepeza poleđina je izašla iz toka** (apsolutna, iza avatara): u toku je gornje sjedište bilo 219px i ulazilo 75px u sto, od čega je lepeza 70. Broj karata ostaje vidljiv, ali ga više ne plaća sto.

**Dva bug-a nađena mjerenjem:** (1) `data-seat-id` bi sad stajao na DVA elementa za tebe (sjedište + omotač ruke) — `collectToPile` bira `querySelector`-om po redoslijedu u DOM-u, a `dealFromDeck` bi ti dijelio dvaput; sidro je skinuto sa ruke. (2) **zatečen bug:** `.card-lift` dobija `transform` na izbor karte i time postaje containing block za `.card-glow`/`.card-inner` (`inset: 0`), a bio je blok bez djeteta u toku — dakle visine 0. Izabrana karta u ruci je bila prazan zlatni obris bez lica (izmjereno 58×17 umjesto 58×79). Riješeno sa `position: absolute; inset: 0`.

**Alat za provjeru:** `/dev/frame` (iframe sa pravom uskom širinom — headless Chrome na Windowsu ne otvara prozor uži od ~500px, pa je svaki dosadašnji „360px" snimak zapravo bio isječak šire stranice) i `?measure=1` na `/dev/game` (ispisuje rect-ove). `/dev/game` se sad vozi iz URL-a (`cards`, `players`, `phase`, `chooser`, `name`), jer headless ne može da klikne dugmad. Verifikovano na 360×640, 360×760, 390×844, 600×900 i 1440×900 × 0/1/3/6/9/12 karata × 2P/3P/4P × sa trakom izbora i bez nje × dugo ime × reduced-motion: nula sudara, mreža staje tačno (izmjereno `cards.height == drop.height`). Jedini ugao koji fizički ne staje — 640px visine SA 12 karata I otvorenom trakom izbora — dobio je `overflow-y: auto`, jer je skrol bolji od trajno sakrivenog reda.

**Provjereno na uređaju 2026-09-11** (Galaxy S10e, APK protiv produkcijskog servera) — i uređaj je našao bug koji headless nije mogao: kad je PROTIVNIK na potezu, njegova zlatna pilula sjeda preko čipa „Runda N". Dva uzroka, oba ista vrsta greške — procijenjena vrijednost umjesto izmjerene: `--stage-header-h` je bio `4rem`, a zaglavlje se stvarno crta **82px** (naslov + podnaslov + čip), pa je sve ispod njega kretalo UNUTAR njega; uz to je `.seat__pill` iznad avatara rezervisao još 38px, tačno tamo gdje je zaglavlje. Headless to nije mogao uhvatiti jer je `/dev/game` uvijek imao `currentPlayerId: "me"` — pilula tuđeg sjedišta se nikad nije ni crtala; otud novi `turn=me|partner|left|right` parametar, pa se stanje sad reprodukuje bez uređaja. **Popravka ne plaća veličinom karte:** odbrojavanje tuđeg poteza je sad LINIJA po donjoj ivici čipa (isti jezik koji `banner__track` nad tvojom rukom već koristi) — ne troši visinu, pa je sjedište jednako visoko na potezu i van njega, a sto je ostao identičan (216×233, karta 52×73 na 360×760, prije i poslije). `TurnPill` je time ostao bez ijednog korisnika i obrisan je zajedno sa `.pill*` pravilima, kao što je ranije otišao `.pill--you`.

**Dvije zamke iz te sesije, obje skupe jer izgledaju kao bug u kodu:** (1) Turbopack ume da **prestane da invalidira `globals.css`** — simptom je varijabla koja se u serviranom CSS-u KORISTI ali nigdje nije deklarisana, pa sve što od nje zavisi tiho padne na `auto`, a `contain: size` kutije se sruše na nulu i sadržaj nestane bez ijedne greške u konzoli; `touch` i restart ne pomažu, samo `rm -rf .next` (Next 16 uz to dozvoljava samo JEDAN dev server po direktorijumu, bez obzira na port). (2) `cap sync` upiše `server.url` u APK ako je `CAP_LIVE_RELOAD_URL` postavljen u okruženju — takav APK radi dok dev server živi, a kad se ugasi diže se na crno; provjera je `curl http://localhost:9222/json/list` preko `adb forward`, koji pokaže pravi URL koji WebView drži. Za izdanje ide `env -u CAP_LIVE_RELOAD_URL pnpm cap:sync`.

**Mergovano i deployovano 2026-09-11** (`5626717`; serviran CSS na kartaonica.com sadrži `felt-stage`/`card--fluid`/`felt-header`/`felt-ring`/`seat__track`, a `table__blocked`/`pill--you`/`.pill{` su nula — dakle nije keš). Deploy je prvi put iznio i `ae03396` (server: pad procesa više ne odnosi zadnji potez svake sobe). Smoke test servera: `POST /api/quickplay` → soba `playing`, botovi popunili, `isBot` ne curi u javni payload. Rute 200/404 kao i ranije.

**Preostala gruba ivica** (nije regresija, ali se sad više primjećuje jer je centriran na sredinu stola): panel prikaza poteza pokriva dobar dio stola i partnerov čip.)

## 62. čišćenje felta po feedbacku s telefona (v3.5)

**čišćenje felta po feedbacku s telefona (v3.5)** (pet primjedbi sa slike: izbaci „Kartaonica"/„Javni sto", izbaci sivi ovalni obod, bočnim igračima se ne vide imena, izbaci rezultat sa svih igrača, smanji font trake i tajmera za 2px.

**Zaglavlje je sad jedan red** — naslov i podnaslov su otišli, „Runda N" je postao direktno srednje dijete grida (`.felt-header__titles` obrisan). `--stage-header-h` 5.25rem → **3.5rem**, i **oba media override-a su obrisana**: prirodna visina je IZMJERENA na 56px (dugme 3rem + 2×0.25rem paddinga) i **identična** na 360×760, 360×640 i 800×900, jer je sadržaj svuda isti. `isPublicTable` je time ostao bez korisnika kroz cijeli lanac (`RoomScreen` → `GameScreen` → header), pa je obrisan zajedno sa `sr.header.brand`/`friendly`/`publicTable`.

**Ovalni obod (`.felt-ring`) obrisan potpuno**, svjesno i sa njim trail-affordance koju je nosio — ostaje rečenica u traci iznad ruke i `shake` + haptika na odbijen potez. Komentar uz `.table__drop` je prepravljen da kaže gdje se signal vraća AKO uređaj pokaže da igrač ne pogađa gdje da baci kartu (u sloj koji je i meta dodira, ne kao novi ukras na feltu).

**Rezultat skinut sa svih sjedišta** (`scoreOf`, `score` prop, `.seat__score`); čita se u meniju (hamburger → Rezultat) i sam iskoči na kraju ruke. Provjereno prije brisanja: badge **nije** sidro nijedne animacije — `collectToPile`/`dealFromDeck` ciljaju `[data-seat-id]` na korijenu sjedišta, `data-pile-id` postoji samo na redovima `ScorePill`/`RoundEndOverlay`. `--stage-partner-h` i `--stage-seat-h` spušteni za **tačno 1.5rem** (izmjerenih 24px koliko je red rezultata zauzimao) u sve tri tačke preloma, pa je rezerva oko sjedišta ostala identična kao prije (9.7px / 5.7px) — zatečeno podešavanje se NE dira usput.

**Bočna imena: 16px → 13px + do dva reda** (`-webkit-line-clamp: 2`), čip im ide na minimalni padding, a sjedište je uvučeno 0.25rem od ivice i za isto toliko **uže** — pa desna ivica ostaje tačno na granici `--seat-gutter` i sto ne plaća uvlačenje ni pikselom. Izmjereno: `BataPenzioner` (najduži jednorečni nadimak iz generatora), `KumIzSela` i `Tamburica` sad staju CIJELI; `Aleksandar Mahmutović` (21 znak) i dalje dobija „…" na drugom redu — prihvaćen rep, jer bi puno ime tražilo širi pojas, a to jede kartu.

**Traka poteza −2px** (tekst 16→14, sat 20→18).

**Zamka koja je zamalo prošla, i najvrjednije iz ovog slice-a:** Tailwind v4 `text-*` utility nosi i `line-height`. `text-lg` na satu je donio `line-height: 28px` koji je iz `@layer utilities` nadjačao `.banner__clock { line-height: 1 }` iz `layer(components)`, pa je traka **NARASLA 33.6 → 37.6px umjesto da se smanji** — smanjenje fonta je dalo veći element. Uhvaćeno samo zato što se mjerilo, ne gledalo. Veličina sata je prešla u `felt.css` uz prored (idu zajedno, žive na jednom mjestu); iz istog razloga je `.seat__name` izgubio `text-base` u JSX-u. Ista porodica grešaka kao `.seat{position:relative}` i `.table` vs `.felt-table`, samo preko `line-height`-a. **Pravilo: ako CSS drži bilo koje tipografsko svojstvo elementa, JSX ne smije nositi `text-*` utility na njemu.**

**Izmjereni rezultat** (CDP, prava širina viewporta): sto je dobio **+76px** visine. Karta na 9 karata: 360×760 **51.8 → 67.7px (+31%)**, 360×640 **30.4 → 44.2px (+45%)** — i tamo se mreža RANIJE prelivala iz pojasa (cards.h 142 > drop.h 136.8), a sad staje tačno. Na 4/6/12 karata karta se ne mijenja jer je već bila na granici širine (`fit-w`), ne visine — dobitak je tamo zrak, ne veličina.

**Novi alat:** CDP mjerač (`Emulation.setDeviceMetricsOverride`) umjesto `/dev/frame` iframe-a — headless `--dump-dom` ne vidi sadržaj iframe-a, a `--window-size` na Windowsu ne ide ispod ~500px. Uz to `/dev/game` je dobio ispravnu sondu (`.seat--top .seat__meta`; `.pill` je bila obrisana klasa koja je uvijek javljala MISSING).

Verifikovano: 16 slučajeva × 360×640/360×760/390×844/600×900/1440×900 × 0–12 karata × 2P/3P/4P × `turn=me|partner|left|right` × traka izbora × reduced-motion = **nula sudara**; typecheck, lint (identičan baseline-u) i 155/155 testova. **Turbopack zamka se ponovila usred rada** — `git stash`/`pop` je zaglavio `globals.css` (serviran CSS je imao staru vrijednost dok je `felt.css` bio svjež), riješeno sa `rm -rf .next` + restart.

**Mergovano i deployovano 2026-09-11** (`3bbe2e1`; serviran CSS na kartaonica.com sadrži `--stage-header-h:3.5rem`, `line-clamp:2` i `--stage-partner-h:6rem`, a `felt-ring`, `seat__score`, `felt-header__title`/`__subtitle` i stare vrijednosti `5.25rem`/`4.5rem` su **nula** — dakle nije keš. Rute 200, `/dev/*` 404, Railway `/health` 200.) **Preostaje provjera na uređaju** — i **APK se mora ponovo build-ovati**, Capacitor pakuje web pa ga deploy ne osvježava.)

## 63. karta na stolu = karta u ruci + pozadina sukna (v3.6)

**karta na stolu = karta u ruci + pozadina sukna (v3.6)** (feedback s telefona: „neka karte na stolu budu iste veličine kao ove u ruci, da se odmakne od avatara i malo prodiše" i „dodaj ovaj background".

**Mjerenje je preokrenulo smjer izmjene.** Prvi utisak je bio da su karte na stolu manje; izmjereno je obrnuto — sto **67.7px**, ruka **56px** (`.card--sm`), dakle sto je bio 21% širi i zato je dodirivao bočna sjedišta. Izjednačavanje znači SMANJITI kartu na stolu. Napomena za sljedeći put: `getBoundingClientRect()` na karti u ruci vraća 69.5px jer je karta rotirana u lepezi — to je AABB rotirane kutije, a ne karta; mjeri se `getComputedStyle().width`.

Uveden `--card-w-hand` (`:root` u felt.css) koji čitaju i `.card--sm` i `--card-w-max` na `.table__cards` — invarijanta „karta na stolu nikad veća od karte u ruci" živi na jednom mjestu umjesto u dva literala. Md override (`--card-w-max: 5.75rem`) obrisan: ruka je ista na svim širinama, pa je i granica ista. Fit-račun i dalje SMANJUJE karte kad ih je puno, pa mreža uvijek staje — granica samo sprječava rast. Rezultat na 360px: karta 56px = ruka 56px uz **17.6px zraka sa svake strane**; samo 10–12 karata (49.2px, četiri kolone) i ekran 360×640 (44.2px, visina) padaju ispod ruke, jer fizički moraju.

**Pozadina** (`public/felt-bg.webp`): PNG 1862 KB → WebP **37 KB** preko `sharp` (sukno je mekana tekstura, komprimuje se 50×). Obod u slici je IZMJEREN prije postavljanja (ridge-detekcija na zamućenoj sivoj kopiji, jer tekstura sukna pravi lažne vrhove): 14%–61% visine, 8.9%–90.6% širine. Zato uz `cover` + `center` karte padaju unutar oboda a sjedišta sjede na ivici — provjereno na 360×760, 360×640, 390×844 i desktopu. **Poravnanje je približno i NIJE vezano za `--table-top`/`--table-bottom`** — dva nezavisna sistema; ne tretirati kao da jesu. Slika nosi obod, što je i razlog zašto je `.felt-ring` ranije obrisan umjesto da se crta dvaput. Dva inline `radial-gradient`-a su morala iz `GameScreen`-a: inline stil pobjeđuje svaki `@layer`, pa bi slika bila nevidljiva.

**Zamka u procesu, ne u kodu:** prva prijava „i dalje nisu iste" je stigla sa PRODUKCIJE, a izmjene su bile samo lokalne. Dev server log je to pokazao — jedan jedini `GET /` sa uređaja i nijedna partija, dakle live-reload APK nije bio taj koji se testirao. Provjera koja to rješava za sekundu: `grep -o -- "--card-w-max:[^;]*"` na serviranom CSS-u sa kartaonica.com. **Ne tvrditi da je nešto „na telefonu" dok se ne vidi zahtjev u logu.**

**Mergovano i deployovano 2026-09-12** (`e2651e9`; serviran CSS na kartaonica.com sadrži `--card-w-hand:3.5rem`, `--card-w-max:var(--card-w-hand)` i `felt-bg.webp`, a `card-w-max:4.5rem`/`5.75rem` su **nula** — dakle nije keš. `/felt-bg.webp` → 200, 37408 B, `image/webp`. Rute 200, Railway `/health` 200.) **APK i dalje treba rebuild** — Capacitor pakuje web, deploy ga ne dira.)

## 64. lica i poleđina karata iz isporučenog kompleta (v3.7)

**lica i poleđina karata iz isporučenog kompleta (v3.7)** (karta se do sad crtala iz DOM-a: rang kao tekst plus **jedan veliki znak u sredini** — sedmica srca je pokazivala jedno srce, ne sedam. Sad je lice slika. `docs/DESIGN_SYSTEM.md` §10 je ovo vodio kao odloženu Fazu 2; zatvoreno.

**Asseti su provjereni pikselima prije nego što su uzeti.** Komplet (`kartaonica_cards_v1`, ~11 MB, NIJE u repou) su četiri RGB atlasa **bez alpha kanala** sa „saht" pozadinom utisnutom u sliku. Izmjereno: sredine ivica su čist karton, ali ugao svakog isječka nosi sivo (`#868585`…`#c8c8c7`) do ~6px po dijagonali. Uvećanjem ugla 6× isprobana su četiri radijusa maske — na **0%** i **5.5%** sivo se vidi, na **7.5% širine je čisto**. Sivo se zato **siječe jednom, u alpha**, a ne maskira u CSS-u: aplikacija nikad ne barata slikom sa sahtom, i ne oslanja se na to da CSS radijus slučajno pogodi crtež.

**`apps/web/scripts/build-cards.mjs`** — jednokratni alat (uz `build-mobile.mjs`; izlaz se commit-uje, izvor ne). Tri stvari koje mora tačno: (1) reže **po rect-u iz `cards.json`, nikad po redu i koloni** — atlas izgleda kao mreža ali nije, lica variraju 240–248 × 342–348px; (2) maska zaobljenog ugla u alpha; (3) **maska PRIJE smanjenja, u dva prolaza** — sharp u jednoj cijevi primjenjuje `resize` prije `composite`-a, pa bi maska od 246px pala na sliku od 240px i cijev bi pukla. Pun špil se provjerava iz **pravila igre** (13 rangova × 4 znaka), ne iz imena fajlova u kompletu, da se provjera ne provjerava sama sa sobom. `sharp` se traži i u `.pnpm` stablu jer ga pnpm ne hoistuje.

**11 MB → 488 KB** (53 WebP-a @240px q82, prosjek 9.2 KB). Širina 240 je izvedena: najveća karta koja se u proizvodu stvarno crta je `md` = 72px (`MoveReveal` kod žandara), na DPR 3 = 216 fizičkih piksela; `lg` živi samo u `/dev/felt2`.

**Kod:** `.card-face` je sad prazan element sa `--card-art` po karti (`PlayingCard` sastavlja id — **rang ide prvi i „10" je dva znaka**, pa se iz id-a ne smije čitati kao `id[0]`). Obrisana je sva mrtva tipografija lica (`.card-face__index/__rank/__suit/__pip` i per-size override-i) i mape `suitGlyph`/`suitInk`. **`background-size: 100% 100%`, ne `cover`** — isječci variraju po odnosu (1.391 do 1.425) dok je naša karta 1.417, pa razvlačenje na kutiju tu razliku NORMALIZUJE, a `cover` bi svakoj odsjekao drugačiji rub. `background-color` ostaje kao pod dok se slika ne učita. Sjenke stanjene jer ih crtež nosi svoje. Klasa `.card-face` je zadržana jer je `/dev/game?measure=1` mjeri.

**Poleđina je išla u istom potezu** kroz kuku koja je već postojala (`--card-back-art`), uz gašenje `.card-back::after` tačno kako je komentar uz nju i predvidio. **Tri mjesta koja bi se inače razišla:** `flyAnimation.ts` crta deal-duh **inline u JS-u** i felt.css ga ne pokriva (bez toga karta leti jednom poleđinom a slijeće na drugu), `DeckPile` ručno piše slojeve štosa, a `.seat__fan-slot .card-back` nosi svoju sjenku da se dvije susjedne poleđine ne spoje u liniju.

**Nije dirano:** flip mašinerija (`.card-inner`/`.card-side`) je mrtva jer `faceUp` niko ne postavlja na `false`, ali brisanje je zaseban potez. `sw.js` ne treba mijenjati — `isStatic()` već hvata `.webp`, pa `/cards/*` upadaju u runtime cache-first; u `PRECACHE` **ne** idu jer je to `install`-time `addAll` i 53 fajla bi usporila instalaciju SW-a.

**Poznata gruba ivica (svjesno prihvaćena):** pravi crtež ima sitan rang u uglu, dok je naša stara karta imala veliki broj preko pola karte. Pogođeni su traka izbora (34px) i najgori slučaj stola (30px). Snimljeno i pogledano na 360×640 sa 12 karata I otvorenom trakom — čita se, boja znaka jasno razlikuje. Ostavljeno da se procijeni na uređaju.

Verifikovano: svih 53 fajla na disku, **uglovi prozirni a sredine ivica pune** (provjereno programski na izlazu, ne na izvoru), geometrija netaknuta (sto 56px = ruka 56px kao i prije), mreža staje, **nula sudara** na 360×760 / 360×640 / 390×844 / 1440×900 × 4/9/12 karata × sa trakom izbora, typecheck čist, lint identičan baseline-u, 155/155 testova.

**Mergovano i deployovano 2026-09-12** (`a69bbd2`; serviran CSS na kartaonica.com sadrži `--card-art`, `cards/back.webp` i `background-size:100% 100%`, a `card-face__rank`/`__pip`/`__index`/`__suit` su **nula** — dakle nije keš. Asseti 200 uz `image/webp`: `AS` 4412 B, `10C` 7972 B, `QH` 20802 B, `back` 25162 B. Rute 200, Railway `/health` 200.) **Provjereno na uređaju istog dana** — novi APK (5.8 MB, 53 karte spakovane, config bez `server.url`) instaliran na Galaxy S10e i partija otvorena protiv produkcijskog servera: lica, poleđina na špilu i u lepezama, i felt pozadina — sve iz lokalnih assets-a APK-a.)

## 65. karte +10% (v3.8)

**karte +10% (v3.8)** (pravi crtež je rang pretvorio iz velikog broja preko pola karte u sitnu oznaku u uglu, pa je čitljivost tražila veću kartu: `--card-w-hand` 3.5 → **3.85rem** (56 → 61.6px). Sto prati sam, jer `--card-w-max` čita istu varijablu — zbog toga je i uvedena.

**Dvije stvari zbog kojih ovo nije promjena jednog broja.** (1) `.card--sm` je nosio **zakucanu** visinu `4.95rem` koja nije pratila širinu; otkad se lice crta kao `background-size: 100% 100%`, to bi **razvuklo crtež**. Visina se sad izvodi (`calc(var(--card-w-hand) * 1.417)`, isti odnos koji nose `.card--fluid` i `--card-ratio`), pa su širina i visina zaključane jedna za drugu. (2) Viša karta u ruci podiže lanac `--stage-hand-top` → `--stage-banner-top` → `--stage-seat-top` → `--table-bottom`, pa **sto gubi ~8px**. Na 360×760 nebitno, ali **na 360×640 je sto već visinski zagušen** — tamo bi zahtjev „+10%" dao **−4% na stolu**. Zato je na toj tački preloma istih 0.5rem vraćeno iz `.hand` `padding-bottom`-a (2 → 1.5rem): taj padding rezerviše prelivanje od ROTACIJE lepeze (~6px), dok podizanje izabrane karte ide nagore i pokriva ga `padding-top`.

**Izmjereni ishod:** karta 61.59px i na stolu i u ruci; na 360×640 sto zadržao **44.17px** naspram ranijih 44.22 (razlika 0.05px — kompenzacija radi). `--stage-hand-h` 9.2 → **9.71rem** (izmjereno: traka se crta 155.3px), a na ≤700px 7.95 → **7.96rem**, dakle praktično nepromijenjeno uprkos višoj karti.

**Rizik koji je ispao bezopasan:** komentar uz `--hand-overlap` tvrdi da je zagriz od 24px podešen da 7–8 karata stane tačno u 360px. Izmjereno sa širom kartom: lepeza od 8 karata je 355px, dakle i dalje staje — a `cardsPerDeal` je **4**, pa se 7–8 karata u ruci u pravoj partiji nikad i ne desi (to je dev slučaj sa `/dev/felt2`). Preklapanje nije dirano.

Verifikovano: 11 slučajeva × 360×760 / 360×640 / 390×844 / 600×900 / 1440×900 × 0/4/9/12 karata × 2P/3P/4P × traka izbora = **nula sudara**, mreža svuda staje, `sto == ruka` gdje ne udara u granicu; typecheck čist, lint identičan baseline-u, 155/155 testova.

**Mergovano i deployovano 2026-09-12** (`7c13918`; serviran CSS na kartaonica.com sadrži `--card-w-hand:3.85rem`, `--card-h:calc(var(--card-w-hand) * 1.417)`, `--stage-hand-h:9.71rem` i `7.96rem`, a `3.5rem`/`9.2rem`/`7.95rem` su **nula** — dakle nije keš. Rute i asseti 200, Railway `/health` 200. Isti deploy nosi i `cf33aba` — „bot identiteti nikad ne dobijaju prezime" — commit koji je na `main` stigao izvan ovog slice-a.) **APK nije rebuild-ovan** uz ovaj deploy.)

## 66. lepeza poleđina podignuta iznad avatara (v3.8)

**lepeza poleđina podignuta iznad avatara (v3.8)** (feedback s telefona: „karte igrača su iza avatara, ne vidi se jasno — neka se podignu, preklopi 20% a ostatak bude vidljiv iznad avatara". Izmjereno prije izmjene: karta lepeze (2.2rem) stajala je na `top: 1.2rem`, tj. 75.2-110.4px naspram avatara 59.2-111.2px na 360×760 — **100% pokrivena**. Sa strane je virilo par piksela i to je bilo sve, pa se broj karata u tuđoj ruci nije mogao pročitati; a to je informacija zbog koje su u v3.5 i uklonjeni count-badge-evi.

Sad dno karte sjeda **20% njene visine ispod vrha avatara** (`top: calc(0.2rem - var(--seat-fan-lift))`; 0.2rem je `padding-top` sjedišta, dakle linija na kojoj avatar počinje). Lepeza ostaje IZA avatara, kako je i traženo.

**Gornje sjedište je moralo da se spusti.** Lepeza je apsolutna i ne širi kutiju sjedišta — ali stoji IZNAD njega, a partner je bio prislonjen uz zaglavlje, pa bi karte ušle u traku, pod čip „Runda N" (ista klasa greške koju je uređaj prijavio 2026-09-11). `--stage-partner-lift` je jedna vrijednost koju čitaju i `--table-top` i `top` tog sjedišta u `GameScreen`-u; na 3P je `0rem`, jer tamo tog sjedišta nema. Bočna sjedišta ne plaćaju ništa — rastu u prazan pojas.

**Trošak stolu je izmjeren, pa namiren, a ne procijenjen.** Podizanje uzme stolu 28.2px. Na 360×760 to je −0.8% na karti (61.6 → 61.1px), na 390×844 i šire **nula**. Na 360×640 bi bilo **−15%** (44.2 → 37.6px), što pravilo iz `felt.css` izričito zabranjuje („plaća se zaglavljem, avatarima i lepezom — NE kartama"). Namireno na dva načina: `--stage-partner-h` 7rem → **5.5rem** (izmjereno: sjedište se tamo crta 78.3px, a 7rem je držao 33.7px rezerve umjesto 9.7px koje baza ima — ostatak od reda rezultata skinutog u v3.5; rezerva „za mjehur reakcije" za GORNJE sjedište ionako ne stoji, jer mjehur visi iznad njega, ne ispod) i manja lepeza tamo (`--fan-card-h` 1.9rem). Rezultat na 360×640: **44.2 → 44.1px**, dakle nula. Jedini preostali rez: 360×760 SA otvorenom trakom izbora, 50.5 → 43.8px (−13%) — to je stanje u kojem sto po dizajnu smanjuje karte umjesto da ih izgura iz pojasa, i traje koliko i izbor grupe.

**Zatečeno, popravljeno usput:** lepeza od 8 karata je 86.4px široka, a bočni pojas to ne prima — izmjereno −12px van pozornice na 360×760 i 2.4px u kutiju stola. Dok je stajala iza avatara nije se vidjelo; sad bi se vidjelo. Korak lepeze se zato **sam steže** kad bi izašla iz pojasa (`--fan-step: min(kartaW - 1rem, --fan-w-max / --fan-n)`), a `margin-inline` slota izlazi iz koraka umjesto da bude zakucan na −0.5rem. Isporučeni `rulesConfig.cardsPerDeal` je **4** i na 4 karte se korak NE steže — današnji izgled se ne mijenja ni za piksel, steže se tek od pete karte. Prvi pokušaj je `--fan-w-max` vezao za `--seat-gutter` i to je bilo pogrešno: sjedište je široko koliko mu je čip i uvučeno 0.25rem od ivice, pa mu sredina NIJE sredina pojasa — mjerenje je pokazalo da lepeza i dalje viri 4.9px na 1440×900. Sad je konstanta, izmjerena.

**Alat:** `/dev/game` je dobio `hand=N` (mock je davao 3-4 karte, pa se najgori slučaj lepeze nije mogao ni snimiti — isti razlog zbog kojeg postoji `turn=`) i tri nove sonde (`fanTop`/`fanL`/`fanR`). CDP mjerač je dobio `Network.setCacheDisabled` i stražu svježine: prvo mjerenje je tiho spojilo **stari CSS sa novim JS-om** (isti chunk URL, drugi sadržaj), pa je sjedište palo na y=0 jer `--stage-partner-lift` nije bila deklarisana — mjerenje koje to ne primijeti gore je od nikakvog. Profil Chrome-a se sad briše pri svakom pokretanju.

Verifikovano: **75 slučajeva** × 360×640/360×760/390×844/600×900/1440×900 × 0/4/6/9/12 karata × 2P/3P/4P × `turn=me|partner|left|right` × traka izbora × dugo ime × `hand=8` — **nula sudara** (lepeza ne ulazi ni u zaglavlje ni u sto, nije odsječena pozornicom, preklop mjeri 20-21%); typecheck čist, lint identičan baseline-u (diff prema `git stash`-u prazan), 155/155 testova. **Preostaje provjera na uređaju** — i **APK rebuild**, Capacitor pakuje web pa ga deploy ne osvježava.

**Provjereno nezavisno prije mergea**, mjerenjem a ne po commit poruci: lepeza viri **28.1px** iznad avatara u bazi i **24.3px** na niskom ekranu, na sva tri protivnička sjedišta; ne ulazi pod čip „Runda N“; nije odsječena pozornicom ni na **320×640** ni na 1440×900, ni na `hand=8`. Trošak stolu izmjeren naspram `main`-a: **61.59 → 61.08px** (360×760) i **44.17 → 44.11px** (360×640). Jedina stvarna cijena, takođe potvrđena naspram `main`-a: sa otvorenom trakom izbora na 360×760 karta pada **50.47 → 43.84px** (−13%) — traka je prolazno stanje i sto u njemu po dizajnu smanjuje karte umjesto da ih izgura iz pojasa. Dvije stvari koje commit grane ne pominje, pa su provjerene posebno: **mjehur reakcije** dijeli traku iznad avatara i prekrije dio lepeze dok traje (prolazno, prihvatljivo), a **`/dev/felt2` crta sjedišta VAN pozornice** pa novi tokeni tamo žive na fallback-ovima (`--seat-fan-lift` na `1.76rem` — provjereno). **Merge je imao konflikt u `CLAUDE.md`** (moj zapis o deployu karata +10% naspram ovog unosa) — riješen zadržavanjem oba.

**Mergovano i deployovano 2026-09-12** (`e2fa5d2`; serviran CSS na kartaonica.com sadrži `--stage-partner-lift`, `--fan-card-w`, `--seat-fan-lift` i `--fan-step`, a stari `top:1.2rem` na `.seat__fan` je **nula** — dakle nije keš. Rute 200, Railway `/health` 200.) **Provjereno na uređaju istog dana** — APK rebuild-ovan (6.05 MB, config bez `server.url`) i instaliran na Galaxy S10e; partija protiv produkcijskog servera pokazuje lepezu od 4 poleđine iznad avatara kod sva tri protivnika, čitljivu na prvi pogled. Time je zatvorena regresija iz juna: badge broja karata je tad uklonjen uz obrazloženje „vidi se preko lepeze“, a lepeza je u redizajnu stola otišla IZA avatara — pa se od tada nije vidjelo ni jedno ni drugo.)

## 67. radijus karte prati kartu (v3.10)

**radijus karte prati kartu (v3.10)** (sa uređaja: „pozadina izgleda neprirodno, kao da je otkinut ćošak", uz traženje **većeg** radijusa. Mjerenje je pokazalo **suprotno — radijus je bio prevelik**.

**Uzrok:** `.card-side`, `.card-face`, `.card-back` i `.card-plain` sjekli su ugao na **apsolutnih 8px** (`--radius-md`), dok isječena slika nosi **7.5% širine** (mask iz `build-cards.mjs`). Apsolutan radijus se poklapa sa slikom na TAČNO jednoj veličini karte, a karta se crta na pet. Na lepezi poleđina (24.8px) to je bilo **8px naspram 1.86px** — rez je zalazio duboko u crtež i **presijecao krem okvir**, pa je zeleno polje istrčavalo do ivice. Isto, slabije vidljivo, na špilu (18%) i licima (13%).

**Dijagnoza je napravljena van browsera:** ista `back.webp`, na pravoj gustini piksela, maskirana na 8 / 4 / 2.4 / 1.86px i uvećana 3× — tek tu se vidi da rez siječe okvir. Poređenje je pokazano korisniku prije izmjene, jer je popravka **suprotna od traženog**: ugao je sad manje zaobljen nego prije, ali cio. To je najviše zaobljenja koje isporučeni crtež dozvoljava — više bi tražilo novu sliku sa okvirom nacrtanim po širem luku.

**Izmjena:** `--card-radius: calc(var(--card-w) * 0.075)` seli sa `.card--fluid` na baznu `.card` i važi za sve veličine; četiri sloja prelaze sa `--radius-md` na njega. Fluid override-i su time suvišni i obrisani (`.card--fluid .card-back::after` je ionako bio mrtav otkad je `::after` ugašen dolaskom crteža). **`flyAnimation.ts` deal-duh** je nosio isti bug — `6px` na kutiji od 30px (20%) — pa je i on na 7.5%; crta se inline u JS-u i felt.css ga ne pokriva, na šta fajl već upozorava.

**Nije dirano:** `.deck__slot` (crta se samo kad je špil prazan, umjesto karata), `.table__glow` i `.card-glow` — oreoli ništa ne sijeku, a `.card-glow` po dizajnu nosi `--radius-lg`.

Verifikovano: izračunat radijus je **svuda tačno 7.5%** širine (lepeza 1.86 / špil 3.3 / ruka 4.62 / sto 4.58px); geometrija se nije pomjerila (sto 61.08px na 360×760 i 44.11px na 360×640, isti brojevi kao prije); nula sudara u 5 slučajeva; typecheck čist, lint identičan baseline-u, 155/155 testova. **Zamka u mjerenju:** `getBoundingClientRect()` na karti u ruci ili lepezi vraća naduvan AABB jer su rotirane — procenat se računa iz `getComputedStyle().width`, inače lažno javi promašaj. **Mergovano i deployovano 2026-09-12** (`b989681`; serviran CSS na kartaonica.com sadrži `--card-radius:calc(var(--card-w) * .075)`, sva četiri sloja karte ga koriste, a `.card--fluid .card-side` i `.card-back::after{border-radius` su **nula** — dakle nije keš. Rute 200, Railway `/health` 200.) APK rebuild-ovan i instaliran na Galaxy S10e.)

## 68. potez dobija tijelo — "beat" umjesto panela (v3.9)

**potez dobija tijelo — "beat" umjesto panela (v3.9)** (feedback s telefona: „kada igrač odigra, animacija ubacivanja karte na sto se ne vidi; vrlo brzo se pokaže overlay ko je šta odigrao i osjećaj je dosta mehanički".

**Uzrok nije bio tempo nego tri odvojene stvari, sve tri izmjerene.** (1) **Kupljenje nije imalo NIKAKVU animaciju na stolu**: server odigranu kartu vodi pravo iz ruke u pile (`move.ts`), pa ona nikad nije u `state.table`, a `landingCardIds` se puni SAMO kod traila — pokupljene karte su takođe već nestale kad snapshot stigne. Najdramatičniji trenutak igre se crtao kao: karta nestane iz ruke → panel iskoči. (2) **Trail se animirao, ali ispod panela** — `table-land` traje 260ms, a `MoveRevealLive` se montirao u ISTOM React commit-u, na `top: var(--table-mid)` (tačno sredina kutije stola), `z-30`, sa neprozirnom kulisom: panel je slijetao na kartu koja slijeće. (3) Pa **1210ms statičnog panela** koji ponovo crta iste karte koje je sto trebalo da pokaže. To je obavještenje, ne pokret.

**Sad potez priča sam sto** (`lib/useTableBeat.ts`): klijent kratko ZADRŽAVA sto kakav je bio prije poteza — `land` 260ms (odigrana karta sleti iznad zadržanog stola, iz pravca igrača) → `hold` 280ms (odigrana + pokupljene nose sjaj, vidi se ŠTA se kupi) → `collect` (sve odleti u pile kupca, sto se slegne). **1.05s naspram ranijih 1.77s** — kraće nego prije, a svaki milisekund je pokret. Trail ne zadržava ništa (karta je već u `state.table`), sat mu radi samo zbog natpisa: ~0.5s.

**Odigrana karta NE ulazi u mrežu, pluta iznad nje.** Razlog je mjerljiv: `tableGrid()` mijenja broj kolona na granicama 2→3 i 9→10, pa bi `n → n+1` usred beat-a smanjio SVE karte i vratio ih na kraju. Ovako je mreža identična cijelim beat-om i preslaže se **jednom**, tačno kad karte odlete — dakle reflow je motivisan. Razlika je i semantički tačna: trail = karta ostaje (ulazi u mrežu), kupljenje = spušta se preko onoga što odnosi.

**Blokada koja je odredila izvedbu:** `.table__drop` ima `overflow-x: hidden; overflow-y: auto` (dodato zbog izmjerenog ugla 360×640 + 12 karata + traka izbora) — **to siječe**. Karte animirane WAAPI-jem iz mreže ka sjedištu bi nestale na ivici kutije stola. Stari `collectToPile` je radio samo zato što je panel bio IZVAN te kutije. Zato collect mjeri prave karte pa pušta **duhove licem gore na `document.body`** (`collectCardsToSeat`, isti obrazac koji `dealFromDeck` već koristi); `overflow` se ne dira. Duh čita crtež sa `.card-face` umjesto da sastavlja ime asseta iz `data-card-id` — taj id je id karte u partiji, ne ime fajla, a pravilo već postoji na dva mjesta.

**Panel je zamijenjen natpisom uz sjedište** (`components/felt/SeatCaption.tsx`): atribuciju nosi POKRET (karte lete ka sjedištu kupca), natpis je potvrda. `MoveReveal` + `MoveRevealLive` + cijeli `reveal` blok u `overlay.css` obrisani.

**Zvuk i flash su razdvojeni na dva trenutka** umjesto da svi padnu u isti: `place` kad karta dodirne sto, `capture`/`sweep` + flash + haptika kad karte odlete. Uz to je zatvorena zatečena nesaglasnost — `jackSweep` u `deriveGameEvents` je bio „sto ostao prazan", a `isSweep` u panelu `rank === "J"`, pa je nejack koji pokupi zadnju kartu dobijao sweep zvuk ali običan panel; sad je pravilo izvučeno u `isJackSweep()` u game-core (+4 testa, 155 → **159**) i svi ga čitaju.

**Dvije greške koje je našlo mjerenje, ne čitanje koda:** (1) `prevTable` se osvježavao samo na promjenu `stateVersion`, pa je beat zadržavao sto iz SSR snapshota svuda gdje state ne dolazi sa servera (`/dev/game` dobija URL tek poslije hidracije) — sad se sinhronizuje po **potpisu sadržaja**, ne po referenci, jer `/dev/game` pravi novi objekat pri svakom renderu i referenca bi petljala beskonačno. (2) **Natpis na bočnom sjedištu je pozornica tiho odsijecala** (`overflow: hidden`) jer je bio centriran na sjedište koje stoji NA ivici — „Marko spušt…". Nađeno GLEDANJEM snimka, ne tvrdnjom: tu provjeru nijedna postojeća tvrdnja nije pokrivala, pa je dodata. Tamo se sad poravnava po unutrašnjoj ivici (vlastiti keyframe — centriranje ide kroz `transform`, a `transform` je jedno svojstvo).

**Obrisan `--d-reveal-hold`** — token bez ijednog korisnika: pravi hold mu je sve vrijeme bio `READ_MS` u JS-u i razišao se od njega za 10ms poslije ×1.1 prolaza. Prefiks `--d-*` ostaje rezervisan.

**Alat:** `/dev/game?move=capture|trail|sweep|auto` priprema potez, a pušta ga `window.__devMove()` (ili dugme „potez ▶") — beat se ne može pogledati na statičkom mock-u jer ga pali tek promjena `stateVersion` sa novim `moveId`, pa preview mora odigrati pravi prelaz. Mjerač sam bira trenutak snimka. **Zamka u mjerenju:** prva navigacija plaća Next-ov on-demand compile, pa hidracija stigne poslije provjere spremnosti i prvi slučaj uvijek lažno padne — otud zagrijavanje. I: `getBoundingClientRect()` na plutajućoj karti vraća **67.5px za kartu od 61.6px**, jer je zarotirana `-4deg` (isti AABB problem koji je v3.6 već dokumentovao za lepezu) — mjeri se `getComputedStyle().width`.

**Izmjereno: 57 slučajeva** × 360×640 / 360×760 / 390×844 / 600×900 / 1440×900 × `move=capture|trail|sweep|auto` × `turn=me|partner|left|right` × 0/4/9/12 karata × 2P/3P/4P × traka izbora × dugo ime × reduced-motion = **nula sudara**; karta se ne mijenja usred beat-a (izmjereno `pre == hold` u svakom slučaju — npr. 360×640 na 9 karata 44.11px → 44.11px), zadržani sto ima tačno onoliko karata koliko je imao prije poteza, plutajuća karta je **61.59px = karta u ruci**, natpis ne mijenja visinu sjedišta i ne izlazi iz pozornice, sto se poslije beat-a slegne na tačan broj karata, duhovi lete samo kod kupljenja, a pod reduced-motion beat se preskače (nula duhova, sto odmah). typecheck čist, lint identičan baseline-u (8 grešaka / 2 upozorenja, sve zatečene), **159/159** testova. **Mergovano i deployovano 2026-09-12** (`2ea3ed8`, zajedno sa v3.11 poravnanjem oboda; serviran CSS na kartaonica.com sadrži `table__played`, `seat__caption`, `caption-in-side` i `table__slot--taken`, a `reveal__headline` / `reveal-in` / `reveal__card` / `--d-reveal-hold` su **nula** — dakle nije keš. Rute 200, `/dev/*` 404, Railway `/health` 200, `POST /api/quickplay` pravi sobu bez curenja `isBot`/`botProfile`.) **Provjereno na uređaju istog dana** — nov APK (6.05 MB; provjereno raspakivanjem da nosi i v3.9 i v3.11 markere i da `capacitor.config.json` NEMA `server.url`) instaliran na Galaxy S10e i partija otvorena protiv produkcijskog servera: uhvaćen beat usred collect faze — natpis „Gost81 kupi" uz njegovo sjedište, capture-flash upaljen, odigrana karta duh u letu ka njemu, sto već slegnut. **Ostaje samo ocjena tempa okom** — to je jedino što ni headless ni snimak ne mjere.)

## 69. obod i svijetli dio pozadine prate igrače (v3.11)

**obod i svijetli dio pozadine prate igrače (v3.11)** (feedback s telefona: „background i to svijetli dio koji simulira sto nije centriran… želim da zahvati sve igrače", uz skicu koja spušta donju ivicu do mog sjedišta.

**Mjerenje je pokazalo da slika nije kriva.** Obod je NA SLICI izmjeren na 13.98%–60.94% visine (ridge-detekcija po središnjoj koloni: vrhovi na y=248 i y=1081 od 1774), a svijetli dio je s njim koncentričan (centroid osvjetljenja y=629 naspram sredine oboda 664) — dakle pomjeranjem slike se pomjera i jedno i drugo. Kriv je bio način crtanja: `cover` skalira sliku PROPORCIONALNO, dok sva sjedišta vise o FIKSNIM px od vrha i dna ekrana, pa se to dvoje razilazi kako ekran raste. Izmjereno: obod je završavao **45px iznad tvog avatara na 360×760, 78px na 390×844, 105px na 412×915**. Nova pozadina zato nije bila potrebna (usput: `Background - cnetered.png` na Desktopu je **bajt-identičan** sa `Background 01.png`, centrirane verzije nikad nije ni bilo).

**Slika se sad skalira i pozicionira iz ISTOG budžeta koji postavlja sjedišta**: `--rim-top` (sredina avatara gornjeg sjedišta) i `--rim-bottom` (sredina tvog, mjereno od dna), `--bg-h` = razmak između njih podijeljen udjelom oboda na slici, pa `background-size: auto var(--bg-h)` + `background-position: left 50% bottom calc(…)`. Obod prolazi kroz sredinu avatara na svakoj visini ekrana.

Tri stvari koje su morale tačno: (1) **`100dvh`/`100dvw`, ne `100%`** — ista varijabla ide i u `background-position`, gdje procenat znači (kutija − slika), a NE visinu kutije; (2) **pozicija se piše od DNA** — donja granica je širina (ispod nje slika ne pokriva pozornicu i sa strane se vidi goli `bg-felt`), a kad ta granica proradi (360×640, desktop), obod naraste iznad potrebnog, pa se višak uvijek plaća GORE, u prazan felt iznad partnera, nikad preko tvoje ruke; (3) **`--seat-avatar-me` je prešao na pozornicu** jer ga čita i `--rim-bottom`, a `.seat--bottom` ga preuzima kroz `--seat-avatar` (fallback zbog `/dev/felt2`, gdje se sjedišta crtaju van pozornice) — time su otišla oba `.felt-stage .seat--bottom` override-a. Uz to `--seat-chip-h: 1.95rem`, IZMJERENIH 31.1px, isto na sve tri tačke preloma: 86.3 = 3.2 + 52 + 31.1, 90.3 = 3.2 + 56 + 31.1, 98.3 = 3.2 + 64 + 31.1, 78.3 = 3.2 + 44 + 31.1.

**3P nema gornjeg sjedišta**, pa bi formula za `--rim-top` pala 23px ISPOD `--table-top` i obod bi presjekao gornji red karata — tamo ide odmah ispod zaglavlja.

**Svjesno prihvaćena cijena:** na visokim telefonima bočni lukovi izlaze van ekrana (~22px na 390×844, ~44px na 412×915). Obod ne može istovremeno biti vertikalno tačan i horizontalno unutra a da se slika ne sabije vodoravno (do 12% na 412×915) — izabrano je bez izobličenja. Na S10e (360×760) lukovi padaju tačno na ivice ekrana.

**Nova sonda:** `rim:` red u `/dev/game?measure=1`. Obod je NASLIKAN i nema rect, pa se računa iz used `background-size`/`background-position-y` i istih udjela oboda; ispisuje `dTop`/`dMe` naspram sredina avatara. Bez toga se poravnanje provjerava okom — a tako je promašaj i nastao.

Verifikovano: 32 slučaja (360×640 / 360×760 / 390×844 / 412×915 / 430×932 / 600×900 / 1024×768 / 1440×900 × 4P/3P/2P × traka izbora) — **`dMe` = 0.0px svuda**, `dTop` = 0.0 na svim telefonskim visinama (na 360×640 −24, desktop −29 do −39, 1024×768 −171: to je granica širine, višak ide gore). Provjereno i na **naslikanim pikselima**, ne samo na računu: ridge-detekcija na snimku daje obod na 115/505 naspram računa 113.3/507.4 (360×760), i jednako se poklapa na 360×640, 390×844 i 600×900. **Raspored nije pomjeren ni za piksel** — pun `measure` ispis (48 kombinacija × 23 elementa) je identičan naspram `main`-a. `next build` prolazi, typecheck čist, lint identičan baseline-u, 159/159 testova.

**Mergovano i deployovano 2026-09-12** (`2ea3ed8`, zajedno sa v3.9 beat-om; serviran CSS na kartaonica.com sadrži `--bg-rim-h-inv`, `--bg-rim-top`, `--rim-bottom`, `--seat-avatar-me`, `--seat-chip-h` i `.felt-stage{…background-size:auto var(--bg-h);background-position:left 50% bottom calc(…)}`, a `background-size:cover` i `seat--bottom{--seat-avatar:3rem|4rem}` su **nula** — dakle nije keš. Rute 200, `/dev/*` 404, `/felt-bg.webp` 200/37408 B, Railway `/health` 200, `POST /api/quickplay` → 200 i pravi sobu bez curenja `isBot`/`botProfile`. **APK je rebuild-ovan** — 6.05 MB, spakovani CSS nosi `--bg-rim-h-inv` a nema `background-size:cover`, `capacitor.config.json` u APK-u je bez `server.url`.) **Preostaje samo vizuelna provjera oboda na uređaju.**)

## 70. ko je na potezu: zlatni prsten + halo koji diše (v3.12)

**ko je na potezu: zlatni prsten + halo koji diše (v3.12)** (feedback s telefona: „nije na prvu jasno koji igrač igra, osim kad je moj red — želim veći glow i intenzivnije pulsiranje, ali ne pretjerano".

**Uzrok je bio u tome šta se uopšte mijenjalo.** Kod protivnika na potezu mijenjala se ISKLJUČIVO prozirnost jednog statičnog sjaja (`0 0 0.75rem` na 55% naspram ničega), dok je prsten ostajao u boji tima — dakle isti kao kad igrač NIJE na potezu. Tvoj red se vidio samo zato što je tvoje sjedište jedino imalo zlatni prsten (3px). Sad zlatni prsten na potezu dobija svako, uz halo koji diše. Boja tima time privremeno ustupa mjesto zlatnoj i to je dozvoljeno: boja nije jedini nosilac tima — `arrangeSeats` drži partnera uvijek gore, pa je pozicija nekolorni kanal, a na potezu je uvijek tačno jedno sjedište.

**Halo je zaseban sloj (`.seat__avatar::after`), ne `box-shadow` avatara**, jer se sjenka u ovom projektu ne animira (pravilo uvedeno kad su `capture-flash` i `jack-sweep` prešli na `opacity` — animirana sjenka se preračunava svaki frejm, a ciljni uređaj je srednji Android). Sjenka je pre-renderovana na klasi, animiraju se samo `opacity` i `transform`. `z-index: -1` je bezbjedan jer `.seat__body` (`position: relative; z-index: 1`) pravi stacking context, pa negativan sloj ne odlazi iza felt pozadine — ista zamka koja je već dokumentovana uz `.seat__fan`. Avatar ima neprozirnu podlogu, pa se od haloa vidi samo obruč.

**Dvije stvari koje je otkrilo tek mjerenje, obje bi okom prošle kao „radi":**

(1) **Prva verzija haloa je bila skoro nevidljiva** — 1.1rem blur uz boju na 60% daje samo **+10** jedinica svjetline uz ivicu avatara, jer se ista boja razmaže preko 17.6px. Uži i gušći sjaj (0.85rem, 85%) daje **+35** uz ivicu i **+32** na 5px od nje.

(2) **Puls je išao u pogrešnom smjeru.** `scale` iznad 1 izvlači gusto jezgro sjenke IZA avatara, pa je veći halo i svjetliji — a kad rast ide uz PAD prozirnosti, to dvoje se poništi i od pulsa ostane skoro ništa. Sad rastu i padaju zajedno: mirni kadar je svijetao i veći (`opacity: 1`, `scale(1.05)`), sredina prigušena i manja (`0.45`, `scale(0.96)`). Izmjereno na zamrznutim kadrovima: **106 → 85** uz ivicu i **84 → 60** na 5px, dok je stari statični sjaj bio **71** — dakle i u najtamnijem trenutku je sjedište jače obilježeno nego prije.

**Zamka u samom mjerenju, skuplja od obje gornje:** `animation-delay` na VEĆ POKRENUTOJ animaciji ne resetuje početak, pa `animation-play-state: paused` uz negativan delay zamrzava **nasumičnu fazu**. Prva dva mjerenja su zato tvrdila da je dno pulsa svjetlije od vrha. Kadar se mora zamrznuti preko WAAPI-ja (`el.getAnimations({subtree:true})` → `pause()` + `currentTime`), što i potvrdi da si na 0 odnosno 700ms.

**Tvoje sjedište ne pulsira** (`animation: none`) — puls je za čekanje na tuđi potez, tamo gdje ti informacija fali; tvoj red već nosi prsten i traku sa satom nad rukom, pa bi treperenje bilo šum dok biraš kartu. Halo kod tebe ostaje, statičan.

**Reduced-motion ne traži zasebno pravilo**: trajanje je `--t-turn-pulse`, koji pod `prefers-reduced-motion` ide na `0s` (ne 1ms — 1ms petlja je stroboskop), a na `0s` vrijedi 100% keyframe. Zato taj kadar MORA biti pun sjaj: da je mirni kadar bio prigušen, taj korisnik bi dobio trajno slabiji halo. Isti obrazac koristi `seat-reconnect`.

**Obrisan mrtav `turn-pulse`** (`@keyframes` + `.animate-turn-pulse`, 1.76s) iz `globals.css` — nije ga uvozio niko, a poslije ovoga bi u projektu postojala dva „turn pulse"-a od kojih se pri svakoj izmjeni prvo mora utvrditi koji je živ (trošak zbog kojeg je i Faza-B set obrisan).

**Raspored se ne pomjera ni za piksel** — pun `measure` ispis (48 kombinacija × 26 redova) je identičan sa halo-om uključenim i neutralisanim; halo je apsolutan, prsten je `inset` sjenka. Doseg je izmjeren: 16.8px, u mirnom kadru 17.6px, pa gornjem avataru ostaje 9.9px do zaglavlja na 360×640 i 13.7px na 360×760 — halo ne ulazi pod čip „Runda N". Bočnim sjedištima `overflow: hidden` pozornice odsiječe spoljni rep sjaja (~14px), što se na snimku ne primjećuje jer je to najslabiji dio pada. `next build` prolazi, typecheck čist, lint identičan baseline-u, 159/159 testova. **Preostaje provjera na uređaju** — intenzitet i tempo su jedino što headless ne ocjenjuje; podešavaju se sa tri broja na jednom mjestu (`--seat-halo-blur`, keyframes, `--t-turn-pulse`). I **APK rebuild**, Capacitor pakuje web.)

## 71. natpis poteza: prelom i vijek (v3.9.1)

**natpis poteza: prelom i vijek (v3.9.1)** (feedback s uređaja, strelica na natpis: „ovo jako kratko traje i format je slomljen". Natpis se lomio u kolonu od jednog znaka — `Igo / r / spu / šta`, `ŽA / ND / AR!` — i nestajao prije nego što se pročita.

**Prelom:** `.seat__caption` je apsolutan sa `left: 50%` i `width: auto`, pa mu je širina bila **shrink-to-fit prema `.seat`** — a `.seat` je `flex-direction: column` uz `min-width: 0`, dakle širok koliko avatar i čip; sa `left: 50%` ostajala mu je još i POLA te širine. Uz `overflow-wrap: anywhere` min-content padne na **jedan znak**, pa se kutija legalno skupi na ~25px. `max-width` je gornja granica i nikad je nije mogao proširiti. Riješeno sa **`width: max-content`** + skidanjem `anywhere` (prelom po razmacima).

**Vijek:** natpis je umirao sa beat-om (780ms trail / ~1.1s kupljenje). Sad ima **vlastiti sat, `CAPTION_MS = 1700`**, i nadživi karte. **Tajmer NE smije živjeti u efektu sata beat-a** — taj efekt ima `[beat]` u zavisnostima pa mu cleanup pukne čim beat završi, i natpis ne bi nikad nestao; zato zaseban efekt **keyed na `moveId`, ne na objekat** (keyed na objekat bi postavljanje `leaving` vrtjelo tajmere u krug). Trajanje PRIKAZA, pa ostaje isto i pod reduced-motion — bez CSS tokena, sat je u JS-u (`--d-reveal-hold` je bio upravo token koji se razišao sa JS-om i umro).

**Natpis je izgubio ime i ostao glagol** (`kupi` / `spušta` / `ŽANDAR!`). Nije estetika nego mjerenje: sa `BataPenzioner kupi` (126px) natpis **pokriva karte** na 360px — izmjereno 48×36px na bočnom sjedištu, 61×23 na partnerovom, kroz 4/6/7/8/9/10/12 karata. Ime je jedino što je kutiju činilo širokom, a stoji u čipu tačno iznad natpisa. Poslije izmjene: bočna sjedišta **nula** preklopa, ostaju samo dodiri od 5-7px kod tebe i partnera (ispod praga, pogledano okom).

**Zatečen bug koji je ovo razotkrilo:** partnerov natpis je bio **IZA karata** — riječ presječena gornjim redom. Podizanje `z-index`-a na natpisu NE POMAŽE: `.seat` nosi `-translate-x-1/2`, a **transform pravi stacking context**, pa je natpis zarobljen unutar sjedišta koje se i samo crta ispod kutije stola (`z-10`). Riješeno podizanjem SJEDIŠTA (`z-20` na partnera i bočne, kao što tvoje već ima), ne natpisa.

**Zašto mjerenje v3.9 ovo nije uhvatilo:** jeste ga izmjerilo — pročitano je kao prolaz. Za dugo ime je u izlazu stajalo `caption: w=68 h=67`, što je četiri reda teksta od 13px, ali su tvrdnje gledale samo **sudare i odsijecanje**, nikad **čitljivost**. Zato novi mjerač (`caption.mjs`) broji **linijske kutije** preko `Range.getClientRects().length` i poredi širinu sa prirodnom (max-content) širinom istog teksta — tvrdnja koja bi prošli put pala. Drugi mjerač (`overlap.mjs`) računa preklop sa **stvarnim kartama**, ne sa kutijom mreže: mreža ima prazne ćelije u zadnjem redu, pa preklop sa njenim box-om ne znači da je karta pokrivena (prva prijava od 116px bila je upravo to).

**Zamka u dijagnozi, vrijedna zapisa:** zaključio sam „Turbopack servira ustajao CSS" jer je `grep -c 'z-index:30'` vratio 0 — a servirani CSS u dev-u **nije minifikovan**, pa stoji `z-index: 30` sa razmakom. CSS je cijelo vrijeme bio svjež. Prije nego se posegne za `rm -rf .next`, provjeriti da grep uopšte pogađa oblik koji se servira.

**Izmjereno:** `caption.mjs` 47 slučajeva (5 širina × 4 sjedišta × 4 vrste poteza × imena `Gost81`/`Tamburica`/`KumIzSela`/`BataPenzioner`/`Aleksandar Mahmutović` × reduced-motion) = **0 problema**: svuda jedan red, širina = prirodna, natpis prisutan na ~1.3s kad su karte već slegle, `data-leaving` na ~1.54s, nestao na ~2.06s. `overlap.mjs` 4 širine × 4 sjedišta × 2 poteza × 7 brojeva karata = **0 pokrivenih karata**. `measure.mjs` (v3.9 beat) **57/57** bez regresije — iz njega je obrisana zastarjela tvrdnja „natpis ostao poslije beat-a", jer natpis sad namjerno nadživi beat. typecheck čist, lint identičan baseline-u, 159/159 testova.

**Mergovano i deployovano 2026-09-13** (`4e33cac`, zajedno sa zlatnim prstenom aktivnog sjedišta iz paralelne grane; serviran CSS na kartaonica.com sadrži `width:max-content`, `max-width:6rem`, `z-index:30`, `[data-leaving]` i `seat-turn-pulse`, a `animate-turn-pulse` je **nula** — dakle nije keš. Rute 200, `/dev/*` 404, Railway `/health` 200.) **APK spakovan i instaliran na S10e** (provjereno raspakivanjem da nosi i natpis i prsten; `overflow-wrap:anywhere` ostaje SAMO na `.seat__name`/toast-u/matching-u, ne na natpisu). **Zamka u provjeri:** produkcijski CSS je minifikovan a dev nije, pa `grep 'z-index: 30'` (sa razmakom) promaši u produkciji, a `grep 'z-index:30'` promaši u dev-u — provjeriti oba oblika prije nego što se zaključi da je nešto ustajalo.)

## 72. razrada ruke na kraju ruke + narodski termini (v3.13)

**razrada ruke na kraju ruke + narodski termini (v3.13)** (feedback: „u rezultatima ruke da se vidi tačno ko je šta dobio — ko je dobio više karata i broj za svaki tim, ko više trefova (tref da piše da je **mak**), ko je dobio **veliku** a ko **malu**; te termine dopuniti i u pravilima".

**Podatak je sve vrijeme postojao i sve vrijeme stizao do klijenta.** `calculateHandScore` puni `HandScore.breakdown` sa `cardCountByPile` i `clubCountByPile` (tačni brojevi po pilu), a `gameStateView.ts` prosljeđuje `handScores` **netaknute**. `RoundEndOverlay` — jedini ekran koji svi gledaju na kraju ruke — primao je razradu i **bacao je**; jedina površina koja je išta od toga crtala bila je proširena `ScorePill` u hamburger meniju, sa tehničkim natpisima, a count mape nije crtala nikad. Zato je izmjena **čisto klijentska**: ništa na serveru, u `game-core` ni u perzistiranom obliku, pa hydrate poslije deploya nije u riziku. Bodovanje se ne dira (HARD RULE 9) — mijenja se samo kako se već izračunato imenuje i prikazuje.

**Termini:** `Mak — najviše trefova`, `Velika (10 karo)`, `Mala (2 tref)` — narodski izraz vodi, karta je u zagradi, pa novi igrač zna na šta se odnosi a stari vidi svoj termin. Izlaze iz **jednog** `sr.score` bloka, pa ih dobijaju i kraj ruke i `ScorePill`; objašnjenje je dopisano u `RulesModal` §Bodovi.

**`breakdownRows()` (`lib/handBreakdown.ts`) je jedini izvor redova razrade.** `ScorePill` je isti spisak gradio kroz `if`-lanac od 28 linija; kopija u drugoj površini bi se razišla pri prvoj sljedećoj izmjeni — isti trošak zbog kojeg `pilesOf` živi u `lib/piles.ts`.

**Dva reda po kategoriji, ne jedan** — izmjereno, ne procijenjeno: na 360px je sadržaj overlay-a ~281px, a natpis + ime pobjednika + poeni ne staju u isti red (`BataPenzioner`). Brojevi nose **ime pila** (`Tim A 32 · Tim B 20`), ne golo `32 : 20`, jer u 3P ima tri pila i golo nabrajanje ne kaže čiji je koji broj; pobjednikov čip je istaknut. Velika i mala nemaju brojeve po pilu, pa im ime pobjednika staje uz natpis i red ostaje jednolinijski (ušteda ~43px).

**Neriješeno crta `niko` i `—`, ne `+2`.** `ScorePill` je tu pisao punu nominalu pored praznog pobjednika, što izgleda kao da su poeni nekome otišli; sad se obje površine ponašaju isto.

**Poeni ruke i ukupan rezultat spojeni su u jedan blok sa dvije kolone** (`ruka` / `ukupno`). Ranije dva odvojena spiska — igrač je sam spajao red iz jednog sa redom iz drugog. Uz `--roundend-max-h` 76 → **80dvh** to oslobađa **148px**, tačno koliko razrada traži. **Bez toga panel skroluje na SVAKOJ veličini ekrana** (izmjereno naspram `main`-a: sadržaj **323 → 598px**, a `main` je imao **nula** škrola svuda). Poslije: skrol samo na 360×640 (63–75px), gdje sadržaj fizički ne staje — razrada traži 450px, a kutija tamo ima 387px upotrebljivih; `.roundend__actions` je `flex: 0 0 auto` pa se dugmad ne mogu izgurati. **Cilj „4P bez škrola na 360×640" iz plana je nedostižan i tvrdnja je ispravljena, a ne kod podešen da je zadovolji.** Kraj meča ima tri dugmeta umjesto jednog, pa mu je prikovani dio ~100px viši i ostaje mu 22px škrola (ograničeno tvrdnjom na 40px).

**Fixture-i su morali dobiti prave brojeve, i to nije kozmetika:** obje dev stranice su imale **prazne** count mape (`cardCountByPile: {}`), pa bi novi prikaz na njima crtao nule i **izgledao kao da radi** — ista klasa greške kao `caption: w=68 h=67` pročitan kao prolaz (v3.9.1). Uz to je `handScore4` u `/dev/overlays` imao `pointsByPile` koji se **nije slagao** sa vlastitim kategorijama (3 umjesto 4). `mockHandScore` sad **izvodi** pobjednike i poene iz brojeva, istim pravilom koje `calculateHandScore` koristi — pa tvrdnja „zbir kategorija == zbir poena" testira **prikaz**, a ne fixture podešen njoj u korist. Novo: `/dev/game?tie=1` i preklopke `4P/2P/neriješeno` u `/dev/overlays`.

Izmjereno (`scratchpad/roundend.mjs`, CDP): **23 slučaja** × 360×640/360×760/390×844/1440×900 × 4P/3P/2P × `Gost81`/`BataPenzioner`/`Aleksandar Mahmutović` × neriješeno × kraj meča = **0 problema** — sve četiri kategorije tačnim redoslijedom, svaki pil ima svoj broj, natpis nikad preko **2 linijske kutije** (`Range.getClientRects().length`, tvrdnja koja bi u v3.9.1 pala), nula vodoravnog prelivanja, dugmad uvijek u ekranu. **Pa pogledano okom** — bug iz v3.9.1 je prošao mjerenje i pao tek na slici. typecheck čist, lint identičan baseline-u (8 grešaka / 2 upozorenja), 159/159 testova, `next build` prolazi. **Mergovano i deployovano 2026-09-13** (`4dc97ca`; serviran CSS na kartaonica.com sadrži `roundend__cat-chips`, `roundend__total`, `roundend__head`, `roundend__cat-chip[data-win]` i `80dvh`, a `76dvh` je **nula**; serviran JS nosi `Mak — najviše trefova` / `Velika (10 karo)` / `Mala (2 tref)` / `Kako su podijeljeni`, a `Ukupni rezultat` i `Poeni iz ove ruke` su **nula** — dakle nije keš. Rute 200, `/dev/*` 404, Railway `/health` 200, `POST /api/quickplay` 200.) **Provjereno na uređaju istog dana** — nov APK (5.95 MB; raspakivanjem potvrđeno da nosi nova pravila i nove stringove, da starih nema, 53 karte, `capacitor.config.json` bez `server.url`) instaliran na Galaxy S10e, pa **odigrana cijela ruka protiv produkcije** preko CDP-a na WebView-u: razrada stoji, sve staje **bez škrola** na 360×760 kako je i izmjereno.

**Zamka u čitanju, ne u kodu:** `innerText` razrade se čita kao „Najviše karata +2 | Tim A 21 | Tim B 31" i djeluje kao da je +2 otišlo Timu A, koji ima MANJE karata. Pobjednika nosi `data-win` čip (Tim B), a `+2` je vrijednost kategorije — provjereno kroz DOM (`data-pile-id="team-1"`), ne po utisku iz teksta. Druga zamka, ista porodica kao minifikovano-vs-nemininifikovano: `git diff` kroz ovu ljusku **pojede backtick-ove i `
`**, pa tuđi ispravan `sr.ts` izgleda polomljeno; provjeriti fajl direktno (`node -e readFileSync`) prije nego što se tvrdi da je nečiji rad pokvaren.

**Merge je rađen kroz `git worktree`**, jer je u radnom stablu bio nekomitovan rad paralelne sesije (`feat/play-legal-pages`, stranica za brisanje podataka). `git checkout` bi ga pregazio — a to se u ovom projektu već dešavalo. Iz istog razloga je i APK build-ovan iz worktree-a, da tuđ nedovršen rad ne završi na telefonu.)

## 73. pauza prije dijeljenja + sporije dijeljenje (v3.14)

**pauza prije dijeljenja + sporije dijeljenje (v3.14)** (feedback s telefona: „nakon kraja prve ruke, nakon zadnjeg poteza krene odmah animacija dijeljenja bez imalo pauze; i sama animacija moze da se uspori".

**Uzrok nije bio tempo nego preklapanje.** Server zadnji potez runde i novo dijeljenje salje u **jednom** snapshotu, pa su `useTableBeat` i `dealFromDeck()` kretali u ISTOM React commit-u — poledjine su letjele iz spila dok su karte poteza jos letjele u pile. Izmjereno na baseline-u: kupljenje traje do **~1.15s**, dijeljenje je kretalo na **0ms**. Pauze nije bilo zato sto je u kodu nema; dijeljenje nije cekalo nista.

Sad dijeljenje ceka kraj beat-a pa jos **800ms** (`DEAL_PAUSE_MS`), a dijeljenje koje ne slijedi potez (pocetak ruke) ceka **250ms** (`DEAL_SETTLE_MS`) — pauza je odgovor na potez, ne obred pred svako dijeljenje. Let karte 396 → **515ms**, korak 61 → **79ms** (+30%).

**Zadrzavanje pred-deal stanja je dio popravke, ne dodatak.** Bez njega bi izmjena izgledala GORE od buga: karte se pojave u ruci cim snapshot stigne, pa ih animacija „dijeli" dvije sekunde kasnije. Dok pauza traje, ruka, spil i brojevi karata stoje na pred-deal stanju — isti obrazac kojim beat zadrzava sto, samo je ovdje zadrzano stanje trivijalno i tacno, jer `advanceTurnOrPhase` dijeli tek kad su SVE ruke prazne. Spilu se vraca tacno onoliko karata koliko ih je upravo napustilo.

**`useGameEvents` je zato presao na `useLayoutEffect`.** Iz obicnog efekta zadrzavanje stize POSLIJE prvog paint-a, pa puna ruka bljesne jedan frejm prije nego sto je zadrzavanje sakrije. Uhvaceno **mjerenjem** (ruka puna na 9-29ms umjesto na polijetanju), ne citanjem koda — isti razlog zbog kojeg `useTableBeat` odluku donosi pri renderu.

**Dijeli se ono sto je server stvarno podijelio:** `deal` dogadjaj nosi `perSeat` i `toTable` (ranije konstante — 3 po igracu, i UVIJEK 4 na sto, iako re-deal sto ne dira). `toTable` se NE racuna iz porasta stola: zadnji potez runde umije da bude trail, pa bi sto „dobio" kartu koju je igrac spustio; pocetak ruke se poznaje po tome da prethodna faza nije bila igra. `perSeat` je najveci porast po igracu, pa se sam svede na 1-3 kad spil na kraju ruke ne stigne da podijeli pune 4 — animacija prati stvarnost besplatno. +4 testa (159 → **162**).

**Alat:** `/dev/game?move=redeal` (zadnja karta runde: potez i dijeljenje u istom snapshotu) i `?fresh=1` (pocetak ruke — jedino dijeljenje koje puni i sto). Bez njih se nijedan od ova dva slijeda ne moze ni snimiti; `fresh` mora u `key` GameScreen-a, jer se sintetizovani `deal` javlja samo na PRVOM snapshotu koji komponenta vidi, a to je hidracijski (bez URL-a). Zamka u fixture-u: prva verzija je svima dala po kartu prije poteza, pa je porast bio 3 umjesto 4 i mjerenje je tvrdilo da se dijeli manje nego sto server dijeli.

Izmjereno (CDP, uzorci po frejmu u stranici — round-trip preko CDP-a bi promasio trenutak polijetanja; 360x640 / 360x760 / 390x844 / 1440x900 x 4P/3P/2P x reduced-motion): dijeljenje krece na **1.94-2.01s**, kupljenje zavrsi na **1.11-1.16s** → razmak **~830ms**; ruka i spil se mijenjaju **tacno u milisekundi polijetanja**; **16/12/8** duhova (4 po igracu) i **nijedan** ne gadja sto na re-dealu, a na pocetku ruke ih je **20** i sto jeste meta; dijeljenje traje ~1.68s; reduced-motion nema ni duhova ni zadrzavanja. **Raspored se nije pomjerio ni za piksel** — `?measure=1` ispis (20 kombinacija x 27 redova) je **bajt-identican** naspram stasha. Pa pogledano okom kroz sve cetiri faze. typecheck cist, lint identican baseline-u (8/2), **162/162**, `next build` prolazi.

**Preostaje ocjena tempa na uredjaju** — ukupno od zadnjeg poteza do nove runde je ~3.6s; podesava se sa tri broja (`DEAL_PAUSE_MS`, `DEAL_FLIGHT_MS`, `DEAL_STEP_MS`).)

## 74. brend ikona — zlatne karte na feltu

**brend ikona — zlatne karte na feltu** (izvor `Play Store assets/Icon.png`, van repoa; `apps/web/scripts/build-icons.mjs` — jednokratni alat, isti sharp-iz-`.pnpm` pattern kao `build-cards.mjs` — generiše Android launcher (`ic_launcher`/`_foreground`/`_round` × 5 gustina, adaptivna pozadina `#011B13` uzorkovana sa donjih uglova slike — gornji nose vinjetu i nisu reprezentativni) + PWA (`icon-192`/`512`, `maskable-512`, `apple-icon`) + `favicon.ico`. Staging i produkcija dijele isti `android/res` (staging je Gradle buildType, ne flavor) pa jedan prolaz pokriva oba APK-a. **Maskable varijanta isprobana sa 80%-safe-zone paddingom pa odbačena** — flat uzorkovana boja se nije uklopila sa vinjetom na ivicama izvora i pravila vidljiv šav tačno unutar kruga koji maska ionako ne siječe; sad puni bleed kao i ostale varijante (motiv sjedi na ~60-63% poluprečnika, dovoljno unutar onoga što i najagresivnija maska ostavlja). **Uhvaćeno tek na build-u, ne ranije:** Turbopack-ov ICO dekoder traži RGBA frejmove za `favicon.ico`, a sharp bez `ensureAlpha()` ostavlja RGB jer izvor nema providnost. Verifikovano na S10e (oba APK-a — task-switcher kartica + `/dev/game` recents) i na `kartaonica.com`/staging; mergovano na `main` i `production` kroz privremeni `git worktree` jer je `feat/home-v4-foundation` bio iza `main`-a (push notifikacije su stigle u međuvremenu) — icon commit cherry-pick-ovan direktno na oba, bez povlačenja push-notifikacija

## 75. app naziv → Kartaonica

**app naziv → Kartaonica** (launcher label je do sad bio „Žandar"/„Žandar (staging)", nedosljedno sa home v4 narativom gdje je Kartaonica platforma-brend a Žandar samo jedna igra na njoj — vidi S1-S7 red gore. Promijenjeno na 5 mjesta: Android `strings.xml` main + staging varijanta (`app_name`, `title_activity_main`), `capacitor.config.ts` `appName`, PWA `manifest.ts` `name`/`short_name`, `layout.tsx` `appleWebApp.title` (iOS "add to home screen" naslov). **Namjerno nedirano:** `metadata.title`/OG copy i sva in-app „Žandar" referenca (`RulesModal`, CTA „Igraj Žandar") — to je ime IGRE, ne app-a. Verifikovano na uređaju: app drawer pokazuje „Kartaonica" / „Kartaonica (staging)". Isti worktree-cherry-pick put na `main` i `production` kao ikona)

## 76. push obavještenja v1 — sto i pozivi

**push obavještenja v1 — sto i pozivi** (PRD §51; verifikovano na uređaju i na stagingu i na produkciji, uz dvije usputne popravke — Capacitor plugin proxy bug i FCM registration timeout, vidi Done i Deployment)

## 77. Play release signing + AAB build + store-listing asseti

**Play release signing + AAB build + store-listing asseti** (istraživanje prije koda: debug APK i real release nisu ista stvar — `build-apk.mjs` je i za `apk:prod` zvao `assembleDebug`, `android/app/build.gradle` nije imao `signingConfigs` uopšte, a jedini "hi-res" asset je bio in-app launcher/PWA ikona, ne odvojeni Play listing upload.

**Potpisivanje:** jednokratan upload keystore (`keytool`, RSA 2048, validity 25 god. — lozinka preko `-storepass:env`/`-keypass:env`, NIKAD kao CLI argument, da je auto-mode klasifikator ne uhvati kao curenje kredencijala u istoriji procesa) u `android/app/kartaonica-upload.keystore` + `android/keystore.properties` (oba već pokrivena `.gitignore`-om, ništa novo tamo nije trebalo). `build.gradle` čita properties fajl uslovno — `signingConfigs.release` i `buildTypes.release.signingConfig` postoje SAMO ako fajl postoji, pa svakodnevni `assembleDebug`/`assembleStaging` ne zavisi od toga. `gradle.taskGraph.whenReady` baca eksplicitnu grešku ako neko pozove `assembleRelease`/`bundleRelease` BEZ keystore-a — bez ove provjere bi AGP tiho napravio nepotpisan artefakt umjesto da padne. `versionName` "1.0" → **"1.0.0"** (prva namjerna vrijednost, do sad scaffold default).

**AAB:** `build-apk.mjs` je do sad znao samo za `assembleX` (APK) — Play traži `.aab` za nove aplikacije. Novo: `pnpm aab:prod` (`--release` fleg, odbija se ako `--env` nije `prod` — staging namjerno ostaje debug-potpisan) zove `bundleRelease` i ostavlja `app-release.aab` pod `outputs/bundle/release/`. **Verifikovano end-to-end, ne samo "gradle nije pukao":** `jarsigner -verify` javlja `jar verified.` sa sertifikatom koji ističe 2051-09-08 — potpis je stvaran, ne prazan buildType.

**Store-listing asseti** (`apps/web/scripts/build-icons.mjs`, prošireno): `store-assets/` (NIJE `public/` — to je Play Console upload, ne nešto što app servira) dobija `icon-512`/`icon-1024` (odvojen upload od launcher ikone — Play listing traži svoj) i `feature-graphic-1024x500` iz `Baner.png` (koji je, ispostavilo se, već postojao pored `Icon.png` na disku — nije trebalo praviti ga). Izvor 1774×887 NIJE tačan 2.048:1 omjer pa prost resize razvlači sliku; umjesto toga centriran crop na tačan omjer (1774×866, −21px visine, centrirano) pa tek onda resize. `Baner.png` je best-effort — nedostaje li, ta linija se preskoči uz upozorenje, ostatak alata i dalje radi. Verifikovano: sve tri nove datoteke tačnih dimenzija, bez alfa kanala; ponovno pokretanje alata je proizvelo BAJT-IDENTIČAN izlaz za sve postojeće ikone (launcher, PWA, favicon) — prošireno, ništa pomjereno.

**Namjerno van ovog poteza** (korisnikova odluka): kontakt email/adresa u `lib/contact.ts` ostaje lična Gmail adresa i kućna adresa — bez rebrendiranja prije objave; filter/limit dužine za nadimke ljudskih igrača (samo `.trim()` danas) ostaje odvojen zadatak, iako `docs/iosplanapp.md` navodi da je relevantan i za Android (Play Guideline-ekvivalent moderacije sadržaja), ne samo iOS. Puna pravna revizija `NACRT` teksta (`/privatnost`, `/uslovi`, `/delete-account`, saglasnost za prijave) ostaje otvorena.

typecheck čist, lint bez novih grešaka (postojeće u `JoinFlow`/`MatchingScreen`/`RoomScreen` nisu ovim dirane), **162/162** testova (`game-core` nedirano — cijela izmjena je build config + skripte).)

## 78. fix: odobren gost više ne ostaje pred vratima (nađeno testom staging APK-a na uređaju, 2026-10-05)

**fix: odobren gost više ne ostaje pred vratima (nađeno testom staging APK-a na uređaju, 2026-10-05)** (tri greške u toku pridruživanja/push-a, sve tri reprodukovane na S10e preko CDP-a prije popravke. (1) `JoinFlow` je istek zahtjeva proglašavao LOKALNIM satom: gost odobren dok je aplikacija u pozadini se vraćao na „Zahtjev je istekao", iako ga je server već posjeo u partiju koja teče — soba je tad puna, pa nema povratka. Važi i za web (odeš u Viber na dvije minute). Sad sat samo PRIKAZUJE; ishod daje isključivo server (poll + odmah na `visibilitychange`), zapamćen zahtjev na mount-u uvijek ide u `pending`, a 404 sa status rute se čita kao istek. (2) Na odobrenje se zvao `window.location.reload()` — u APK-u Capacitor za svaku putanju bez ekstenzije servira KORIJENSKI `index.html`, pa reload `/room/?id=…` crta početni ekran. Sad `onApproved` predaje sesiju `RoomScreen`-u bez reload-a. **Pravilo: u kodu koji ide u APK nema `location.reload()` ni tvrde navigacije na rutu — samo `router`.** (3) Push registracija se na povratku u prvi plan ponavljala samo kad `pushId` NE postoji; kad start-registracija otkaže ili server zaboravi uređaj, stari `pushId` ostaje i obavještenja ćutke ne stižu. Sad se ponavlja dok server u tom pokretanju nije potvrdio uređaj (`pushRegistrationPending`). (1) i (2) potvrđeni na uređaju poslije popravke: odobren + pokrenut u pozadini, rok prošao, tap na „Partija počinje" → pravo u partiju. (3) NIJE reprodukovan na uređaju poslije popravke — gašenje mreže bi prekinulo i adb. **Otvoreno, produktna odluka:** APK nema deep link ni unos koda sobe, pa gost u aplikaciju ne može ući na tuđi sto — pozivnica uvijek otvara browser, i od tri push poruke do korisnika aplikacije realno stiže samo „Neko kuca" (hostu). Sitno: razrada ruke na S10e (360×712) preliva 5px. Živi Play build 1.0.0 (kod 1) je BEZ push-a; prvo izdanje sa push-om je 1.1.0 (kod 2).)

## 79. odbrojavanje tuđeg poteza = prsten koji se prazni + broj u avataru (prijava igrača iz žive igre, 2026-10-05)

**odbrojavanje tuđeg poteza = prsten koji se prazni + broj u avataru (prijava igrača iz žive igre, 2026-10-05)** („protivniku se ne vidi vrijeme" — radilo je, ali kao linija od 0.15rem po dnu čipa, bez broja. Sad se zlatni prsten aktivnog sjedišta prazni kao sat (`.seat__ring`, conic-gradient + maska, 4px, inset — nula rasporeda: visine sjedišta izmjerene 82.1/86.3/90.3px, iste kao prije), u zadnjih 10s broj zamjenjuje slovo u avataru (`Math.ceil` — `useCountdown` vraća razlomljene sekunde na 250ms), a u zadnjih 5s prsten, broj i halo idu u `--danger-signal`. Bez tranzicije na gradijentu (animiraju se samo transform/opacity). `.seat__track`/`.seat__fill` obrisani. Tvoje sjedište se ne mijenja — sat mu je u traci nad rukom. Pogledano headless na 360×760 u tri trenutka; **ocjena na uređaju ostaje**. Usput: pozivnice → aplikacija (App Links) su 2026-10-05 mergovane, deployovane na produkciju i potvrđene na staging APK-u — hladan start i topao start otvaraju ekran za pridruživanje, `/privatnost` ostaje u Chrome-u; `assetlinks.json` na kartaonica.com nosi i Play app-signing otisak.)

## 80. „Igraj Žandar" — izbor stola (2/4) i cilja (11/21) (2026-10-05, odluka vlasnika; odstupanje od PRD §37.1)

**„Igraj Žandar" — izbor stola (2/4) i cilja (11/21) (2026-10-05, odluka vlasnika; odstupanje od PRD §37.1)** (dodir na „Igraj Žandar" više ne vodi pravo za sto nego na **`/igraj`**: ime, sto za 2 ili 4, partija do 11 ili 21, „Nađi sto". Podrazumijevano 4 / 21 (kako je brza igra radila), zadnji izbor se pamti (`lib/quickPlayPrefs.ts`, ključ `zandar:quickplay`). **Ekran nije nov** — to je `CreateRoomScreen` sa dva opciona propa (`counts`, `copy`), pa „Nova soba" i brza igra dijele jedan markup i jedan CSS. **Server je to već znao:** `/api/quickplay` je primao `playerCount`/`targetScore`, klijent ih je samo zakucavao; nova je jedino provjera (`apps/server/src/quickplay.ts`, čista + testovi) — `targetScore` se ranije nije provjeravao uopšte, a sad je korisnički unos (samo 11/21; izostavljen → 21, pa stari klijenti i živa Play 1.0.0 prolaze). Posljedice u istom potezu: `/ime?next=quickplay` više ne postoji (ime je na `/igraj`; `/ime` ostaje za izmjenu iz postavki), home je izgubio `loading`/`error` stanje brze igre, `MatchingTable` je dobio `expectedPlaces` (sto za dvoje ne smije bljesnuti sa četiri mjesta dok roster ne stigne), a „Novi sto i igrači" traži sto iste veličine i cilja kao upravo odigrani. Sto za 3 se u brzoj igri ne nudi. Pravila igre nedirana (HARD RULE 9); oblik perzistiranih soba isti. Provjereno: typecheck web+server, web 24 / server 66 testova, lokalni server curl matricom (2/11 → soba 2 igrača do 11, bez `isBot`; 4/21; bez cilja → 21; cilj 7 → 400), headless snimak `/igraj` na 360×760.)

## 81. zadnji potez ruke se vidi prije rezultata (prijava igrača, 2026-10-05)

**zadnji potez ruke se vidi prije rezultata (prijava igrača, 2026-10-05)** („na zadnjem bacanju se ne vidi koja je karta, odmah ode rezultat" — tačno: server potez, dodjelu preostalog stola i `hand_finished`/`match_finished` šalje u JEDNOM snapshotu, a `useTableBeat` je beat gasio čim faza nije `playing`, pa je `RoundEndOverlay` pokrio sto u istom renderu. Sad zadnji potez ima svoj, duži beat: `land` → `hold` (`FINAL_HOLD_MS` 650) → `collect` (SVE sa stola leti onome kome je server dodijelio) → `rest` (`FINAL_REST_MS` 500), a `GameScreen` rezultat crta tek kad je `beat.phase === "idle"`. **Zadnji trail** je poseban: bačena karta nikad nije u `state.table` (sto je već počišćen) pa je beat sam dodaje zadržanom stolu, a karte NE lete baceru nego zadnjem kupcu — `lastCapturePlayerId` ne stiže u view, pa se primalac čita iz jedinog pile-a koji je porastao (`recipientSeat`). `jackSweep` se na kraju ruke čita iz poteza, ne iz `next.table` (koji je tad uvijek prazan). `hold` važi i pod reduced-motion (trajanje prikaza, ne pokreta). Win/lose zvuk čeka rezultat. Ulazak u već završenu ruku (reload) nema beat → rezultat odmah. Samo klijent; server, pravila i snapshot nedirani. Alat: `/dev/game?move=endcapture|endtrail`. Izmjereno CDP-om, 20 slučajeva (360×640/360×760/390×844 × 4 sjedišta × 2P/3P/4P × 0/4/8 karata × reduced-motion + kontrola običnog kupljenja i traila): karta vidljiva ~0.95s, let do ~1.6s, rezultat na **~2.1s** (ranije 0ms); pod reduced-motion ~1.4s. web 31 test (+7 `decideBeat`), game-core 163, typecheck čist, lint bez novih. **Ocjena tempa na uređaju ostaje** — tri broja: `FINAL_HOLD_MS`, `FINAL_REST_MS`, `COLLECT_STAGGER`.)

## 82. bezbjednosne nadogradnje paketa (2026-10-05)

**bezbjednosne nadogradnje paketa (2026-10-05)** (`pnpm audit --prod` je javljao **56 ranjivosti: 3 kritične, 32 visoke** u produkcijskim zavisnostima; sad **0**. Server: `fastify` 5.8.5 → 5.12.5, `socket.io`/`socket.io-client` → 4.8.4 (uz njih `engine.io`, `socket.io-parser`, `ws`, `find-my-way`, `fast-uri`). Web: `next` + `eslint-config-next` 16.2.6 → **16.3.8** (minor skok nužan — dio savjeta zakrpljen tek u 16.3.6), `@sentry/nextjs` → 10.76 (namjerno ostao na 10.x), `posthog-js` → 1.436. Tranzitivne nisu rješavane `overrides`-ima nego `pnpm -r update --depth Infinity <paket>` — lockfile inače drži staru rezoluciju i kad roditelj dozvoljava novu. **Zamka koja bi tiho prošla:** Fastify od 5.12 brojčani `trustProxy` (`1`) pretvara u „ne vjeruj nikome" — `request.ip` bi postao adresa Railway proxyja, pa bi SVI igrači dijelili jedan rate-limit na prijavama i prvih 30 u satu bi ga potrošilo za sve. Uhvaćeno samo zato što je i TypeScript tip izgubio `number`; cast bi to sakrio. Sad je funkcija `trustFirstHop` (`apps/server/src/trustProxy.ts`, isto ponašanje kao ranije) sa testom nad pravim Fastify-jem (`inject` + `remoteAddress`): proxy dopisana adresa pobjeđuje, klijentov lažni `X-Forwarded-For` ne. Provjera samo po skoku je bezbjedna jer se do servisa ne može doći mimo Railwayevog edge-a — **ako se hosting promijeni, zamijeniti listom adresa proxyja**. Provjereno: typecheck sva 4 paketa, game-core 163 / server 70 / web 24, lint identičan osnovici (5 grešaka, 2 upozorenja — osnovica se mjeri sa `eslint --ignore-pattern "out-*/**" .`, jer `eslint.config.mjs` ne ignoriše `out-*` pa goli `eslint` visi minutama na ostacima builda), web build (dinamičke `/room/[roomId]`, `/matching/[roomId]` i dalje postoje) i mobilni export (i dalje ih NEMA, 24 stranice, 53 karte), lokalni server curl matricom + prava partija preko socketa (websocket, `room:subscribe`, 4 poteza). Jednom, na prvom mobilnom buildu odmah poslije web builda, ispisano „Can't resolve './felt.css'" uz uspješan build i potpun CSS; u tri naredna pokretanja se nije ponovilo.)

## 83. puni ekran na Androidu (2026-10-05, `3c698e0`)

**puni ekran na Androidu (2026-10-05, `3c698e0`)** (na Androidu 15+ / targetSdk 36 sistem nameće edge-to-edge, pa je sadržaj išao ispod statusne trake i trake sa dugmadima. `capacitor.config.ts`: `SystemBars` hidden + style DARK; `MainActivity.enterImmersive()` na startu i na svaki povratak fokusa; `styles.xml`: shortEdges za rupu kamere. **Gledano samo na S10e (Android 12)** — na uređaju sa Androidom 15+, gdje problem stvarno postoji, niko ga nije vidio. Na S10e ostaje jednobojna tamna traka na vrhu u visini kamere; nije utvrđeno da li je namjera.)

## 84. kraj ruke: ostaje verzija sa `main`-a (`7ef645d`), odluka vlasnika 2026-10-06

**kraj ruke: ostaje verzija sa `main`-a (`7ef645d`), odluka vlasnika 2026-10-06** (dvije sesije su isti problem — zadnji potez i odlazak ostatka stola se ne vide prije rezultata — riješile nezavisno. Na `main`-u je klijentska verzija sa 7 testova (primalac se izvodi iz pile-a koji je porastao; u 4P bira onoga ko je odigrao ako je u tom timu, pa tebe, pa prvog po sjedenju). Druga varijanta (faze `rest`/`restCollect`, natpis „nosi ostatak", serversko `lastCapturePlayerId`) je sačuvana na grani `feat/hand-end-rest-alt` (`d95f505`, i na GitHubu), NIJE spojena i sukobljava se u `useTableBeat.ts`, `GameScreen.tsx` i `dev/game/page.tsx`. Vlasnik je pogledao staging i rekao da radi kako treba — granu ne spajati; brisanje čeka njegovu riječ.)

## 85. Play: 1.1.0 (kod 2) poslata na Production 2026-10-06

**Play: 1.1.0 (kod 2) poslata na Production 2026-10-06** (1.0.0 je živa na Play-u od 2026-10-02 — bez push-a i bez pozivnica. 1.1.0 je izgrađena iz `main` `6ea829f` u čistom worktree-u `C:\Users\User\projects\zandar-apk` (`pnpm --filter web aab:prod`), potpis provjeren `jarsigner`-om (upload ključ SHA-1 `B2:2D:77:F2…5D:ED:0F`, isti koji Play Console vodi kao upload key), u paketu samo produkcijski API. Poslata direktno na Production sa 100% — **bez Open testing kanala i bez ijednog pokretanja potpisanog paketa na uređaju** (odluka vlasnika: aktivnih instalacija 0, testira par ljudi). Dva upozorenja u konzoli su bezopasna (nema deobfuscation fajla jer se kod ne zamućuje; nema debug simbola za Firebase-ov nativni kod). Donosi: push, pozivnice → aplikacija, `/igraj` (2/4, 11/21), sat protivnika, zadnji potez prije rezultata, puni ekran, popravke ulaska u sobu. **Sljedeće izdanje mora nositi `versionCode` 3.** Čišćenje repoa istog dana: lokalno ostaju samo `main`, `production`, `feat/hand-end-rest-alt`; worktree-i samo glavni folder i `zandar-apk`; `.gitignore` pokriva `.claude/worktrees/` i `apps/web/store-assets/`.)


## 86. pozivnica iz ugrađenog browsera: oznaka je `intent:` link (2026-10-06)

**Pozivnica iz ugrađenog browsera → aplikacija na dodir** (prijava: igrač ima aplikaciju, a link iz Messengera ostane na webu. Uzrok NIJE App Link — `assetlinks.json` je živ i ispravan — nego to što Messenger, Instagram i slični link učitaju u vlastitom WebView-u i ne šalju intent, pa Android verifikaciju domena niko ne pita. Automatski se odatle ne može izaći; može na dodir. Na pozivnici oznaka u `StoreBanner`-u sad vodi na `intent://<host>/room/<id>#Intent;scheme=https;package=…;S.browser_fallback_url=<Play listing sa referrerom>;end` — aplikacija ako je ima, Play ako ne. Van sobe ostaje običan Play link, jer intent-filter prima samo putanje soba. Host je `window.location.host`, paket se čita iz Play listinga, na staging webu sa sufiksom `.staging`, pa se proba na staging APK-u. `intent:` link ide bez `target="_blank"`. Čiste funkcije `appIntentUrl`/`appPackage` u `lib/stores.ts`, +3 testa (web 34). **Nije provjereno na uređaju** da Messengerov browser razriješi `intent:`. Ograničenja: ko je u ugrađenom browseru već sjeo za sto, u aplikaciji je drugi gost; „Ne sada" sakriva traku 7 dana, pa i ovaj put.)

## 87. izgled stola: bira ga onaj ko pravi sto (2026-10-12)

**Izbor podloge stola pred igru** (zahtjev vlasnika: tri podloge, prva podrazumijevana, bira onaj ko pokreće igru, pamti se zadnji izbor. Treće slike još nema, pa spisak ima dvije: `classic` i `wood`. Podloga je polje na SOBI (`LobbyRoom.tableTheme?`), ne lična postavka — zato je vide svi za stolom, a u brzoj igri ko se upari u postojeći sto vidi izbor onoga ko ga je napravio; uparivanje po podlozi namjerno NE filtrira. Polje je opciono i čita se kroz `parseTableTheme` (shared-types), pa stari snapshoti, stari klijenti i smeće u zahtjevu svi daju klasik, nikad 400. Stare instalacije sa Play-a za drvenim stolom vide klasik.

Slika je iz ChatGPT-a (1024×1536) i obod joj je bio previsoko (14,9 % umjesto traženih 20 %): iznad oboda je bilo 0,33 njegove visine, a S10e sa izrezom kamere traži 0,46 — ostala bi gola traka pri vrhu. Riješeno produžavanjem ogledanjem, 130 px gore i 100 px dole (dole zbog 320×568), na 1024×1766; ivice su skoro crno drvo pa se šav ne vidi. Obod izmjeren na konačnom fajlu: y=359/1064, x=239/784, odnos 0,773.

`felt.css`: množilac `2 *` u donjoj granici `--bg-h` je bio skriveni odnos stranica klasične slike — sad je `--bg-aspect`. Boja poda je prešla iz `bg-felt` u JSX-u u `.felt-stage`, jer utility pobjeđuje `layer(components)` pa je druga podloga ne bi mogla promijeniti (drvo ima tamnosmeđi pod, da učitavanje ne bljesne zeleno).

Mjerenje (CDP, 360×640, 360×760, 390×844, 412×915, 320×568, 800×900, 2P i 3P): obod drvene podloge pada na cilj uz odstupanje ≤0,1 px gore i dole, slika svuda pokriva pozornicu. **Bočno ne sjeda svuda:** obod prolazi kroz bočne avatare na 360×760 i 390×844, na 412×915 je 6 px van ekrana, a na 360×640, 320×568 i desktopu (600 px pozornica) pada 10–33 px UNUTAR linije avatara, pa bočni igrači stoje tik uz sto spolja. Pretpostavka pri zadavanju odnosa (0,78) je bila da je centar bočnog avatara na pola pojasa; izmjereno je na 30 px od ivice. Za sljedeću podlogu ciljati odnos oboda ~0,85, a desktop riješiti sužavanjem pozornice prema visini.

Birač: na 360×640 je red sa sličicama gurao „Nazad" ispod ivice — sličica je tamo niža (5:2 umjesto 16:9). Usput: `next dev` (Next 16) sam upisuje `apps/web/AGENTS.md` i `apps/web/CLAUDE.md` — obrisani, ne komitovati. **Nije provjereno na uređaju.**)


## 88. treća podloga „Kafana" i sličice sa cijelim stolom (2026-10-13)

**Karirani stolnjak kao treća podloga** (`cloth`, naziv „Kafana"; slika iz ChatGPT-a, 1024×1536, produžena ogledanjem 80 px gore). Razlikuje se od prve dvije u dvije stvari koje određuju kako sjeda: NEMA nacrtan obod i nije čisto odozgo — sto je trapez, a stolnjak pada preko prednje ivice. „Obod" je zato silueta stolnjaka po središnjoj koloni (gore y=298; dole y=880, sredina pada, da avatar pokrije prevoj) — izabrano, ne izmjereno ridge-detekcijom kao kod drveta. Sto je širi nego viši (oko 690×582, odnos 1,19), a slika se skalira po visini, pa na telefonu bočne ivice izlaze van ekrana i stolnjak ide od ivice do ivice; stolice i pod sa strane vide se tek na desktopu (600 px pozornica). Gornja i donja ivica padaju na avatare kao i kod ostalih.

Čitljivost: karte se na kockama čitaju, ali „Sto je prazan" (prigušen tekst) na stolnjaku se jedva vidi — nije dirano, čeka ocjenu na uređaju.

**Sličice u biraču** su sad kvadrat sa CIJELIM stolom (240 px, isječak oko stola), umjesto srednjeg pojasa 16:9 na kojem se oblik stola nije vidio — zahtjev vlasnika. Na niskom ekranu (≤700 px) sličica je `contain` u okviru 3:2: smanjuje se umjesto da se siječe, a izabranu tu obilježava pozadina dugmeta, ne okvir sličice. Tri podloge u redu od 20rem daju sličicu od ~85 px. **Nije provjereno na uređaju.**)


## 89. nalog i profil — izdanje R2 u kodu, iza prekidača (2026-10-22)

**Identitet igrača po `docs/Specs/SPEC_IDENTITET.md`, koraci 1–7** (spec napravljen iz Claude Design platna „Kartaonica · identitet", oznake ekrana iste; zatvorena pitanja Q1–Q10 i preduslovi T1–T11 su u specu). Sve na `main`-u, a NIŠTA od UI-ja u produkciji: `lib/features.ts` → `identityUi = NEXT_PUBLIC_APP_ENV !== "production"`. Staging i dev vide nalog, produkcijski build daje 404 na `/profil`, `/prijatelji`, `/nalog/*`, home bez trake, a `/privatnost` i `/delete-account` i dalje „Igra nema naloge" (provjereno `next build`-om sa `NEXT_PUBLIC_APP_ENV=production`). Razlog: `main` mora ostati spreman za produkciju i dok je izdanje polovično; pravni tekst ne smije opisati nalog koji u toj verziji ne postoji.

**Server (bez ijednog novog paketa — isti stil kao FCM):** `google/serviceAuth.ts` (token servisnog naloga izvučen iz `push/fcm.ts`, scope kao parametar), `google/firestore.ts` (Firestore REST: `get`/`getDoc`, atomski `commit` sa `exists`/`updateTime` preduslovima i inkrementom, `findPaths` preko `runQuery`), `google/identityToolkit.ts` (Firebase Auth admin: `deleteUser`). `profile/store.ts` — `ProfileStore` u dvije izvedbe (Firestore kad postoji `FCM_SERVICE_ACCOUNT_JSON`, inače memorija + red u logu „👤 Profili: …"), isti ugovor testiran nad obje (lažni Firestore poštuje preduslove). Kolekcije: `profiles/{uid}`, `nicknames/{ključ malim slovima}` (postojanje dokumenta JE jedinstvenost), `results/{matchId__uid}` (postojanje brani dvostruko brojanje — rezultat i brojač u istom commitu). Rute u `profile/routes.ts`: `GET /api/me`, `GET /api/nicknames/check` (K1–K7, tri slobodna prijedloga, 60/min po igraču), `PUT /api/me/nickname|avatar` (samo nalog, gost 403 `account_required`), `POST /api/me/abandon` (T6: gost napušten prijavom na postojeći nalog), `DELETE /api/me` (tok c — samo sa `auth_time` iz zadnjih 5 min, inače 401 `recent_login_required`). Brojač završenih partija: `emitMatchEnded` → `recordCompletedMatch` samo za `completed`, ljudi sa `uid`-om, bez čekanja i bez bacanja. Nadimak: prvi izbor ne pokreće bravu od 30 dana, promjena samo velikih/malih slova je slobodna, napušten i obrisan nadimak rezervisan 30 dana (Q2). Push uređaj pamti `uid` naloga (opciono polje, upisuje ga SAMO server iz provjerenog tokena), `POST /api/push/devices/unbind` na odjavi, `unbindUid` na brisanju.

**Web:** donja traka (`components/nav/TabBar.tsx`, 64 px, na desktopu dno kolone 600 px; Android nazad sa taba → Igraj), `/profil` (A2 gost sa G1/G2; Moj profil P1–P8), `/prijatelji` (F1), `/nalog/registracija|prijava|lozinka|nadimak|avatar|promijeni-nadimak|brisanje`, listovi kroz novi `components/sheet/Sheet.tsx` (površina `.gamemenu`, scrim, Escape, nazad, povratak fokusa). `lib/account.ts` = radnje koje bacaju `AccountError` sa kodom ekrana (prevod Firebase kodova je čista funkcija u `accountErrors.ts`); `lib/auth.ts` ostaje tihi sloj gosta. Gost se registruje POVEZIVANJEM (`linkWithCredential`) — isti `uid`, partije prelaze na nalog. Prijava na postojeći nalog uzme token gosta PRIJE prijave i šalje `abandon` tek poslije uspjeha (pogrešna lozinka nikad ne briše gosta). Odstupanje od speca: gost sa partijama i kod prijave e-mailom (R1) vidi upozorenje o gubitku (spec ga crta samo za Google, B4). Avatari A1–A10 su privremeni krugovi do faze 2. Red „Pravljenjem naloga prihvataš politiku privatnosti." na A3/A4.

**Odluka vlasnika usput (Q10):** nedovršen nalog (bez nadimka) se NE briše — igra i skuplja partije kao svaki drugi, pa bi dnevno brisanje poslije 30 dana uzelo igraču ono što koristi. Sweep je napisan, pa uklonjen prije nego što je ijednom pokrenut. Ako se ikad čisti, važi za sve naloge (npr. 24 mj. neaktivnosti).

**Zamke plaćene ovdje:** (1) **CORS je podrazumijevano `GET,HEAD,POST`** — `PUT /api/me/nickname` je padao već na preflight-u pregledača; `fastify.inject` u testovima preflight ne radi, pa je uhvaćeno tek E2E-om. Sad `methods` uključuje `PUT` i `DELETE`. (2) Lint (`react-hooks`) odbija `setState` sinhrono u `useEffect`: URL parametar ide kroz `useSyncExternalStore` (`lib/useQuery.ts` — i bez `<Suspense>`, koji bi `useSearchParams` tražio u statičkom exportu), prefil polja je „upisano ?? prijedlog", predizabran avatar je izveden iz `uid`-a (deterministički, isti na serveru i u pregledaču). (3) `next dev` (Next 16) sam upisuje `apps/web/AGENTS.md` i `CLAUDE.md` — brisati poslije svakog pokretanja. (4) E2E skripte koje kucaju prije hidracije dobijaju prazna polja — čekati ~2 s poslije prvog teksta.

**Provjereno:** server 125 testova (bilo 79 prije identiteta), web 45, typecheck sva 4 paketa, lint na osnovici (5/2). E2E u headless Chromeu (CDP, 360×740) protiv PRAVOG staging Firebasea i lokalnog servera: cijeli tok a do A8, R4, R2/R3, prijava gosta na postojeći nalog (`abandon` 204), P6, P5 → P2, O1, tok c sa pogrešnom pa ispravnom lozinkom; svi test nalozi obrisani. Mjereno na 360×740 / 390×844 / 1280×800: bez horizontalnog skrola, nove mete ≥44 px. **Nije provjereno:** ništa na stagingu sa servera (Railway platform outage — deployi pauzirani, staging server još na kodu od prije koraka 2), ništa na uređaju, Firestore i Identity Toolkit pozivi protiv pravih servisa (lokalno nema servisnog ključa).


## 90. identitet — lica za stolom, prijatelji, pozivi i push (koraci 8–11, 2026-10-23)

**Ostatak `docs/Specs/SPEC_IDENTITET.md`** — sve na `main`-u, sve iza `identityUi` (produkcija ne vidi ništa).

**Korak 8 — lica za stolom.** Igrač s nalogom sjeda pod NADIMKOM sa avatarom — server ga uzima iz profila (rok 1,5 s, inače sjedi kao gost), na sve četiri tačke sjedanja i kao rezerva na `room:subscribe` (samo u lobiju). `PublicPlayer` dobija `avatar` i `profileId` (javni ID = ključ nadimka — nadimak je ionako javan, pa nema nove kolekcije); jedan `toPublicPlayer` (`apps/server/src/publicPlayer.ts`) zamijenio dvije ručne kopije whitelista; gost i bot su `null/null` i test to drži (HARD RULE 3). **T5 popravljen:** `fillSeatsWithBots` je slao sirova imena, a generator poredi normalizovana — bot je mogao dobiti ime čovjeka za istim stolom. Avatar u sjedištu je UNUTAR prstena (prsten nosi tim i potez), lobi 36 → 40 px. Dodir na igrača: providan `<button>` preko avatara/reda (raspored stola netaknut) → tuđi profil (`GET /api/profiles/:id`, nikad e-mail/uid) ili oblačić gosta (T3; prvo je bježao van ekrana pored širokog reda — `placeNear` sa testom). Blokiraj/Prijavi (§6.9): **odluka mimo speca — blokira samo nalog, prijaviti može i gost**; prijava = upis + `🚩` upozorenje u logu servera (e-mail vlasniku čeka servis).

**Korak 9 — prijatelji.** Pravila u `profile/friends.ts`: obostrani zahtjev = prijateljstvo odmah; odbij/ukloni tiho; blokada briše vezu. **Odluka:** blokirani ne saznaje — njegov zahtjev dobija isti odgovor „outgoing" ali se ne upisuje, i ne vidi blokatora u pretrazi. Rute (`profile/friendRoutes.ts`) samo za nalog SA nadimkom; pretraga po prefiksu (Firestore opseg + `orderBy` — nadimak dobija polje `key`); tihi limit 100/dan. **Korisnički kanal (T2):** socket `user:subscribe` sa ID tokenom → soba `user:<uid>` → `user:friends {incoming}` (broj na tabu) i `user:invite`; na klijentu JEDNA pretplata za cijelu aplikaciju (`lib/userChannel.ts`), obnavlja se na svakom glavnom ekranu; pretplata gosta izbacuje socket iz kanala prethodnog naloga (inače bi odjavljen telefon i dalje primao tuđe događaje).

**Korak 10 — pozivi.** Poziv živi na sobi (`LobbyRoom.invites`, opciono), pravila u `profile/invites.ts`: važi dok soba čeka i ima mjesta za čovjeka (bot-sjedište se računa slobodnim), najduže 30 min (Q1). `POST /api/invites` (nova soba), `POST /api/rooms/:id/invites` (Pozovi iz prijatelja, samo host), `POST /api/invites/:roomId/accept` — BEZ odobrenja hosta, istekao 410. `createPrivateRoom` i `admitPlayer` izvučeni iz `/api/rooms` i `/approve` (ponašanje isto, stari testovi zeleni). Web: E2 list (2/4, 11/21, pamti izbor), E3 red „Poziv poslat", E4 list na glavnim ekranima (Ne sada se ne vraća), F7.

**Korak 11 — push (§8).** Zahtjev → kanal „prijatelji" (novi, zaseban), tap → `/prijatelji`; poziv → kanal stola, TTL = ostatak roka, tap → pravo u sobu (istekao → F7). Push za zahtjev SAMO kad je upisan; poziv samo kad je nov (ne pri ponovnoj pretplati); isti zahtjev u istoj minuti se ignoriše. `notifyUser(uid)` → svi uređaji naloga.

**Zamke:** (1) `tsx` ne učitava izmjene — lokalni API server pokrenut prije nove rute vraća 404, a klijent to pokaže kao grešku ekrana; restart prije E2E. (2) Lokalni server drži nadimke u memoriji preko pokretanja testova — E2E mora praviti jedinstven nadimak. (3) Prekinut E2E ostavlja `e2e-*` naloge u staging Firebaseu: `firebase auth:export` + prijava lozinkom + `accounts:delete` (Firebase CLI je prijavljen na ovoj mašini). (4) `messages.ts` ima doslovne kontrolne znakove u regexu — mijenja se kroz Node, ne alatom za uređivanje.

**Provjereno:** server 153 testa (bilo 125 posle koraka 7), web 46, typecheck, lint osnovica; E2E sa DVA pregledača (dva naloga) za tuđi profil, blokadu i prijavu, cijeli tok prijatelja (D1→D5, F2→F6) i poziva (E2→E5); push okidači po jedan događaj (log). **Nije provjereno:** ništa na stagingu (Railway deployi pauzirani), ništa na uređaju, isporuka push-a, F7 E2E-om.


## 91. avatari — crteži umjesto privremenih krugova (2026-10-23)

**10 crteža životinja** (vlasnik, `avatar-01-lisica.svg … avatar-10-ovan.svg`) zamijenilo je krugove „A1–A10" iz koraka 6–8. Id je sad ime: `lisica, sova, jez, medvjed, zec, macka, jelen, pijetao, zaba, ovan` (`PROFILE_AVATARS` u `shared-types`, redoslijed = mreža izbora). **Bez aliasa** `a1→lisica`: stari id-jevi nisu nigdje upisani (staging server je na kodu prije koraka 2, lokalno je memorija), pa `parseProfileAvatar("a1")` sad vraća `null` kao i svaka nepoznata vrijednost. Polje ostaje `avatar` (ne `avatarId`), oblik `PublicPlayer` netaknut.

**Fajlovi u `apps/web/public/avatars/<id>.svg`, crtaju se kroz `<img>`, ne inline.** Svaki crtež nosi `clipPath id="c"` — dva ista avatara inline u DOM-u (sto, lista prijatelja) dijelila bi id. Uz to: keš pregledača/`sw.js`, nula u JS bundlu, Capacitor export ih servira kao `/tables/*` (provjereno u `out/avatars`). Crtež se sam reže u krug i nosi svoju pozadinu, pa je okvir `.avatar` skinut; podloga iz tokena ostaje samo dok se fajl ne učita.

**`<Avatar id size? label? />`** — `size` 40/64/120 (spec) kao `.avatar--40/64/120` (zamijenile `--sm`(32 → 40)/`--lg`/`--xl`); bez `size` popunjava roditelja (sjedište: prečnik − 0,5rem = 4 px od prstena; red sobe: 40 px). Pristupačni nazivi su `sr.account.avatarNames` (`satisfies Record<ProfileAvatar, string>` — novi id bez naziva ne prolazi typecheck). Gost i bot ostaju slovo u krugu (G3) — nalog bira avatar tek pri registraciji; privremeni lokalni izbor u Postavkama nije pravljen (nalog je već dostupan van produkcije). `/dev/game` i `/dev/lobby` sad miješaju nalog i gosta.

**Provjereno:** CDP mjerenje na 360×760, 360×640, 1280×900 i lobiju 390×844 — prsten 52/56 (nizak 44/48, desktop 60/64), crtež svuda tačno 4 px unutra, svi fajlovi učitani, gost slovo, red sobe 52 px; snimci okom (prsten tima i zlatni prsten + sjaj poteza oko crteža). game-core 167, server 153, web 48 (novi `lib/avatars.test.ts`: svaki id ima fajl i obrnuto, `viewBox`, bez skripti i vanjskih referenci), typecheck, lint osnovica, `next build`, `build:mobile`. **Nije provjereno na uređaju.** Usput primijećeno, nije dirano: na niskom ekranu je TVOJ krug 48 px, a spec kaže 44 (`--seat-avatar-me` se ne smanjuje uz `--seat-avatar`) — zatečeno, jer pomjera budžet visine pozornice.


## 92. „Igraj Žandar" jednim dodirom (2026-10-23, `feat/one-tap-play`)

**Problem:** između „Igraj Žandar" i stola stajao je ekran `/igraj` sa formom (ime, broj igrača, cilj, izgled stola), a „Nađi sto" je bio zaključan dok ime nije upisano. Izbor i ime su se već pamtili (`startQuickPlay`), pa je forma od drugog puta bila popunjena — ali se pojavljivala SVAKI put: najmanje dva dodira i jedan ekran više.

**Sad:** dodir na „Igraj Žandar" na početnoj zove `startQuickPlay` sa zapamćenim imenom i izborom → `router.replace` na traženje igrača. Bez sačuvanog imena: igrač s nalogom (van produkcije, `identityUi`) ide pod nadimkom (`fetchMe`; server ga ionako stavlja za sto, a nadimak se upiše i kao lokalno ime, pa se profil sljedeći put ne pita), inače list „Kako da te zovemo?" sa jednim poljem i „Nađi sto" — samo taj put (odluka vlasnika: pitati, ne dodijeliti „Gost 1234"). Ispod dugmeta red „4 igrača · do 21 · Klasik ›" (dugme 44 px) otvara list „Podešavanja igre"; čuva se tek na „Sačuvaj", Odustani/nazad ostavljaju stari izbor. Greška: „Nismo uspjeli naći sto. Pokušaj ponovo." u rezervisanom redu ispod dugmeta (ranije `/igraj` pokazivao sirovu poruku servera ili „Failed to fetch"). Mrtvi propovi `loading`/`error` na `HomeScreen`/`HomeHero` (pregled 2026-10-05) time su oživjeli.

**Kod:** birači (broj, cilj, podloga) izdvojeni u `components/lobby/TableSetupFields.tsx` — dijele ih `/create` i list, izgled `/create` isti. `components/home/QuickPlaySheets.tsx` (dva lista nad postojećim `Sheet`). `Sheet` dobio `initialFocusRef` (list za ime fokusira polje, ne „Odustani"). `quickPlayPrefs.ts` i `tableTheme.ts` dobili pretplatu i `useQuickPlayPrefs`/`useTableTheme` (isti obrazac kao `playerName.ts`), da se red osvježi čim se list sačuva; ključevi u localStorage isti, pa igrači ne gube izbor. `/igraj` je samo preusmjerenje na `/` (stara oznaka/istorija; stari APK ima svoj bundle). Server netaknut.

**Provjereno:** E2E u headless Chromeu (CDP) protiv lokalnog servera, svjež profil: red i CTA iznad pregiba na 360×760 i 360×640 (red 44 px), Odustani ne čuva, Sačuvaj osvježi red i localStorage, prvi dodir bez imena → list sa fokusom u polju i zaključanim „Nađi sto" → upis → `/matching` i ime sačuvano, drugi dodir → `/matching` bez ijednog lista, server pravi 2P sto po izboru iz lista, `/igraj` → `/`, ugašen API → poruka ispod dugmeta i dugme opet aktivno. Web 48 testova, typecheck, lint osnovica, `next build`, `build:mobile`. **Nije provjereno:** Android „nazad" na listovima (ide kroz isti `useBackHandler` kao Postavke), tok naloga s nadimkom (lokalno je samo gost), ništa na uređaju. `Can't resolve './felt.css'` u izlazu builda je zatečeno (postoji i na `main`-u), build prolazi.

## 93. socket straža — loš paket više ne obara server (2026-10-23, `fix/socket-payload-guard`)

**Problem (audit C1):** svaki socket handler je vjerovao payload-u. Greška u handleru postaje `uncaughtException`/`unhandledRejection`, a straža na kraju `index.ts` tada radi `shutdown(1)` — padaju SVI stolovi. Za to nije trebala prijava: `socket.emit("room:subscribe", null)` → `Cannot destructure property 'roomId' of 'payload' as it is null` → „Gašenje: unhandledRejection" (reprodukovano na `main`-u, server mrtav poslije jednog paketa). Drugi vektor koji tip ne vidi: `ack` je funkcija SAMO kad klijent traži potvrdu — inače je zadnji argument obična vrijednost, pa `emit("game:nextHand", {}, 5)` daje `ack is not a function` u bilo kom handleru. `game:react` sa `null` je bacao čak sinhrono.

**Popravka:** novi čist modul `apps/server/src/socketGuard.ts`:
- `guarded(event, log, handler)` — omotač za svih 8 `socket.on` handlera: hvata sinhroni throw i odbijen promise, loguje sa imenom događaja, klijentu `INTERNAL`. Globalna straža ostaje, za prave bugove van handlera.
- `splitArgs` — ack je zadnji argument samo ako je funkcija, inače no-op; poziva se najviše jednom.
- Parseri `parseSubscribePayload`, `parsePlayCardPayload`, `parseReactionType` → loš oblik dobija `INVALID_PAYLOAD` (react i dalje `INVALID_REACTION`). Granice su labave (id ≤256, karta ≤64, `clientMoveId` ≤128, ≤52 karte u kupljenju) da sadašnji klijent i stari APK-ovi prođu; svih 4 polja poteza su obavezna, kao što je `applyMove` ionako zahtijevao. Inline tipovi `SubscribePayload`/`PlayCardPayload`/`ReactionPayload` prešli u modul.

**Provjereno:** server 170 testova (novi `socketGuard.test.ts`: 17 — smeće kao payload, ack ne-funkcija, sinhroni i async pad bez `unhandledRejection`, ack jednom, validni payload-i sadašnjeg klijenta), typecheck. Napad na lokalni server: 20 paketa (`room:subscribe` sa `null`/`42`/`[]`/`"x"`/`{roomId:{}}`, bez payload-a, ack=5; `game:react`/`playCard`/`abandonVote` sa `null`; `nextHand`/`rematch`/`waitMore` sa ack-om koji nije funkcija) — `/health` 200 poslije svakog. Regresija: Quick Play 2P cijela ruka preko socketa (24 poteza istim oblikom kao `RoomScreen`), reakcija, sljedeća ruka. Oblik snapshota nije diran (nema back-compat rizika). **Nije provjereno:** browser/uređaj, staging.

**Ostalo iz audita (nije u ovom PR-u):** H1 krađa sjedišta preko `join-request/:requestId`, H2 ime bez ograničenja dužine, H3 nevalidiran `targetScore` na `/api/rooms`, S3 završene partije 12h u memoriji.

## 94. početna v5 — igre iz konfiguracije, Postavke u Profilu (2026-10-23, `feat/home-v5`)

**Po `docs/Specs/SPEC_POCETNA.md`** (slike H1–H6, V5 u `docs/Specs/pocetna/`), iznad #92 (jedan dodir). Početna je sad: zaglavlje (znak + „Kartaonica", bez zupčanika i domena) → kartica glavne igre (ilustracija, naziv, „2 ili 4 igrača · ~10 min", **Igraj**, red podešavanja, **S prijateljima**) → „Još igara" (redovi) → „Uskoro" (jedan red + **Javi mi**) → na webu tihi red Privatnost · Uslovi · O nama. Raspored H1/H2/H3 zavisi SAMO od `GAMES` u `lib/games.ts` (`zandar` live; `poker`, `raub` upcoming) — dodavanje igre je red u konfiguraciji + blok u `sr.games` (straža tipova traži `name` i `players`).

**Logika (čista, testirana — `lib/games.test.ts`, `lib/homePrefs.test.ts`):** `homeLayout` — glavna je zakačena → zadnja igrana → Žandar; „Još igara" po zadnjoj igri pa neigrane; „Uskoro" sve najavljene. `isNewGame` — NOVO 7 dana od `releasedAt` ili do prve partije. `lib/homePrefs.ts` pamti zakačenu (samo jedna; novo kačenje zamjenjuje staro) i kad je koja igra pokrenuta (`kartaonica:home`, upis tek kad `startQuickPlay` uspije). Podešavanja važe **po igri**: `quickPlayPrefsKey`/`tableThemeKey` — Žandar zadržava zatečene `zandar:quickplay` i `zandar:table` (niko ne gubi izbor, `/create` dijeli podlogu), druge igre `kartaonica:quickplay:<slug>`.

**List podešavanja = V5:** „Brza igra · {igra}", birači, **Igraj** (sačuva i kreće) i **Sačuvaj i zatvori** kao jedino donje dugme; i scrim/Android nazad čuvaju (nema puta koji tiho baca izbor — zato nema ni „Odustani"). **List igre = H4** (`GameSheet`): Igraj, S prijateljima, Pravila (samo igra sa `hasRules`), Zakači na vrh / Otkači. Danas se ne otvara na `/` (živ je samo Žandar) — provjeren kroz `/dev/home?live=2`. **Javi mi** (`SignupSheet`): postojeći `SignupForm` proširen sa `game` na `games[]` — jedna adresa i saglasnost, po jedan `POST /api/signups` za svaku igru; server netaknut (upis je idempotentan po igra+adresa). `/igre/[slug]` (sve četiri, i remi i bela) radi kao prije, samo više nije linkovan sa početne.

**Postavke u Profilu (H6):** zupčanik je uklonjen **svuda, i u produkciji** (odluka vlasnika). Profil gosta dobio red **Postavke** (nalog ga je već imao). `SettingsSheet`: **Preuzmi aplikaciju** (samo web, link iz `STORE_LINKS`), „Pravila igara", pravni red sad uvijek (i web i Android). `StoreRow`, `UpcomingGames`, `TeaserCard` i `HomeHero` obrisani. **⚠ Posljedica:** produkcija ima `identityUi = false` → nema donje trake ni Profila → do puštanja naloga produkcija **nema ulaz u Postavke** (zvuk, vibracija, ime, pravila), a APK ni pravne linkove (web ih ima na dnu početne).

**Ime prvi put:** ostaje list sa početne (#92), ne `/ime` kako je spec prvobitno pisao — odstupanje upisano u spec §4, odluka vlasnika.

**Budžet visine (CDP, `/dev/home?live=1|2|3[&pin=poker][&web=0]`):** 360×701 (740 − traka kamere 39) i 390×805, sa donjom trakom. Sav sadržaj iznad trake u svih 12 slučajeva; bez horizontalnog skrola; Igraj 56, red podešavanja 44, S prijateljima 56, redovi igara 76 px. Na webu pri 360×701 sa 2–3 igre ostaje 4–13 px skrola — samo donji padding ekrana ispod pravnog reda; APK (bez pravnog reda) ima 50+ px rezerve. Plaća ilustracija (`--art-h` po gustini 1/2/3), nikad dugmad; greška dijeli slot reda podešavanja (ranije je prazan rezervisani red trošio 22 px). Lepeza karata je nova (`.game-fan`, N karata — poker ih ima 5); stara `.card-fan` ostaje za teaser i zahtjev za ulazak.

**Paralelna sesija:** u toku rada druga sesija je u istom stablu uvela tokene pravca A+ (`--text-soft`, `--text-faint`, `--accent-line`, pozadina `.screen.home/.profile` u `funnel.css`, `docs/Specs/SPEC_IZGLED_APLUS.md`); početna ih koristi za obrube i sekundarni tekst. Zaustavljena je dok se ova grana ne commituje.

**Provjereno:** typecheck sva 4 paketa, game-core 167, server 153, web 64 testa; lint osnovica (5/2); `next build` i `build:mobile`. E2E na pravoj `/` protiv lokalnog servera (20 provjera): nema zupčanika/pločica/prodavnica, „Uskoro: Poker i Raub", V5 čuva i preko Escape-a, Javi mi upiše prijavu za `poker` i `raub` (dva fajla u `_signups`), V5 → Igraj bez imena → list za ime → `/matching` (sto 4P po izboru), drugi put jedan dodir, Profil gosta → Postavke (Preuzmi aplikaciju, Pravila igara, pravni red), `/igraj` → `/`. H4/H5 na harnessu: dugmad, mete ≥44 px, kačenje mijenja glavnu, novo kačenje zamjenjuje staro. **Nije provjereno:** ništa na uređaju (Android nazad na listovima, rupa kamere — emulirana visinom), APK bez pravnog reda (grana `isNative` se ne izvršava van Capacitora), da `upcoming_games_viewed` stvarno ode (PostHog šalje samo produkcija — provjeren samo isti `useSeenOnce` put), tok sa nalogom, prijava na staging serveru. Tekst saglasnosti kaže „u ovu igru" i kad se prijava odnosi na dvije — verzionisan je u `shared-types` (novi id) i čeka pravni pregled, pa nije diran.

## 95. izgled pravac A+ — koraci 1–3 (2026-10-23, `feat/home-v5`)

**Po `docs/Specs/SPEC_IZGLED_APLUS.md`** (tabla „Pravac A+ · Kafanski sto, čitljivo" na platnu „Kartaonica · identitet"). Paleta i fontovi su ostali isti — svaka boja sa table je već bila token; A+ mijenja veličine, kontrast sekundarnog teksta i donju traku. Samo CSS, nijedan TSX.

**Korak 1 (ušao u #94):** `--text-soft` / `--text-faint` (krem 85 % / 75 % umjesto zelenkaste muted), `--accent-line`, utility `text-soft` / `text-faint`; pozadina `.screen.home, .screen.profile` u `funnel.css`.

**Korak 2 — dugmad:** `.home__cta` 56 → 66 px, 23 px slova, „debljina" (inset donja ivica) i sjena; `.home__friends` 56 → 64 px, obrub 2 px mesing, 20 px slova. Jedno pravilo — isto dugme na početnoj, u listovima, nalogu, prijateljima i zahtjevu za ulazak. Brend 21 px.

**Korak 3 — traka i profil:** `--tabbar-h` 64 → 72 px; traka na `--card-back` sa mesing linijom; neaktivno krem 80 % (8.4:1), 15 px; **aktivno = puna mesing pločica** (56 px, margina unutar trake, bedž mijenja boje, fokus prsten krem). Redovi `.settings__row` / `.profile__item` 64 px, odvojene pločice (`--surface-raised` 85 %), labela `--text-faint`, vrijednost 18 px, „Promijeni" `--turn-active` 17 px (podvlačenje zadržano — u JSX-u nema strelice). Kartica gosta na `--card-back` 70 % sa mesing prstenom, ime i naslov u Archivo Black `--card-face`. „Obriši nalog" je sad `--danger-signal` (bio muted) — 5.5:1 na dnu ekrana, gdje je podloga `--surface`. Moj profil sa nalogom zadržava centrirani raspored sa `UI_MojProfil`.

**Budžet visine (CDP, `/dev/home?live=1|2|3[&web=0]`, 360×701 i 390×805):** prvo mjerenje samo sa dugmadima je na webu 360×701 sa 2–3 igre gurnulo pravni red 6–15 px POD traku. Plaća **gustina 3** (obje te postavke su gustina 3, jer „Uskoro" broji kao red): ilustracija `clamp(2.25rem, 5dvh, 5rem)` (36 px na 701), tješnji padding/razmaci u kartici. Poslije i dugmadi i trake od 72 px: sav sadržaj iznad trake u 12/12 slučajeva (razmak ≥6 px), skrol 1–10 px samo donji padding — kao prije A+ (4–13). Dugmad 66/64, red podešavanja 44, bez horizontalnog skrola. Na pravim rutama (`/`, `/prijatelji`, `/profil`): aktivna pločica 56 px, ostale 72.

**Posljedica:** na 360×701 profil gosta skroluje 61 px, a Moj profil 19 px („Obriši nalog" je ispod pregiba) — profil nema pravilo bez skrolovanja; manji hero avatar bi tražio izmjenu `size={120}` u `AccountProfile`.

**Provjereno:** typecheck, lint = osnovica (5/2), web 64 testa, snimci okom (početna H1/H3, profil gosta, Moj profil kroz privremenu dev stranicu — obrisana). **Nije provjereno:** `next build`/`build:mobile`, ništa na uređaju. **Korak 4 (sto) se ne radi** — odluka vlasnika: sto ostaje kakav jeste, pilula tajmera iznad avatara ostaje (spec §3.10).


## 96. Igraj opet pokazuje izbor 2/4 i 11/21 (2026-10-23, `feat/home-v5`)

**Povod:** vlasnik je na telefonu dodirnuo „Igraj" i krenuo za sto sa jednim protivnikom bez ikakvog izbora — zapamćen izbor 2 · do 11 bio je ostao od stare forme `/igraj`, a red podešavanja ispod dugmeta nije primijetio. Odluka: izbor mora biti vidljiv prije partije.

**Sad:** „Igraj" na kartici glavne igre otvara list „Brza igra · Žandar" (V5) sa zadnjim izborom označenim; „Igraj" u listu sačuva izbor i kreće (bez imena → list za ime, pa za sto). Red podešavanja ispod dugmeta ostaje (pokazuje šta je izabrano i otvara isti list). „Igraj" iz lista druge igre (H4) i dalje kreće odmah. Spec §4 dopunjen. Jedina izmjena koda je `onPlay` u `app/page.tsx`.

**Provjereno:** E2E protiv lokalnog servera (dev server druge sesije na 3107 posuđen — Next 16 dozvoljava jedan po projektu): Igraj otvara izbor i ne kreće, zadnji izbor (2, 11) označen, promjena na 4/21 → `/matching` i izbor sačuvan, bez imena izbor → list za ime → `/matching`; server pravi 4P pa 2P sto po izboru. Web testovi i lint na osnovici. **Nije provjereno na uređaju.**

## 97. početna v3 „Kafanski sto" — izgled početne i donje trake (2026-10-24, `feat/home-v3-look`)

**Po `docs/Specs/SPEC_POCETNA_V3.md`** (slike i referentni CSS u `docs/Specs/pocetna-v3/`). Mijenja se SAMO izgled početne i donje navigacije; Igraj → list izbora, list igre, Zakači, Javi mi (jedna prijava za sve najavljene), `upcoming_games_viewed` i `homeLayout` su netaknuti.

**Šta:** pozadina drvo (vidi niže) sa tamnjenjem `--wood-ink` 55 → 85 %; glavna igra je sto (`felt-bg.webp`, okvir `--wood-rim` + mesing 55 %, toplo svjetlo i tamno dno) sa lepezom pravih karata (84 px, ±16°, „diše" ±1° — `--t-fan-breathe`, 0 pod reduced-motion), naslov 38 px i meta dolje lijevo, „Zakačeno" dolje desno. Igraj 56 px sa mesinganim gradijentom (modifikator `.home__cta--hero`; zajednički `.home__cta` od 66 px u listovima i profilu netaknut). Ispod jedan red tihih dugmadi od 44 px: „S prijateljima" i kratka podešavanja „2 · 11 · Drvo ✎" (`aria-label` pun tekst). Ostale igre su pločice dvije u redu u boji igre (`tint` u `lib/games.ts` → `--game-<tint>-1/2`), sa dvije prave karte (`tileCards`); najavljene su iste pločice, blijeđe (`saturate(.55)`, karte 55 %), sa zvonom — cijela pločica je jedna meta i otvara istu prijavu kao ranije. `GameRow`/`UpcomingRow` obrisani, `LetterCard`/`gameMeta` su u `GameTile.tsx`. Traka: 64 px, `--wood-ink`, linija mesing 22 %, neaktivno krem 62 % 13 px, **aktivno samo mesingan tekst i ikona + crtica gore** (pilula pravca A+ uklonjena) — važi na Igraj, Prijatelji i Profil.

**Odluke van teksta speca:** boja trake je `--wood-ink` umjesto `#100b08` iz makete (nije u §4, razlika se ne vidi). Greška traženja stola stoji na mjestu mete na stolu (ranije je dijelila slot sa redom podešavanja) — ništa se ne pomjera i „S prijateljima" ne nestaje. Igra bez `heroCards` kao glavna (npr. zakačen Raub) crta `tileCards` na stolu.

**Budžet visine:** plaća samo sto — `--table-h: clamp(pod, 100dvh − --home-rest − safe-top, plafon)`, plafon 268 px (jedna igra) / 196 px (ima „Još igara"); `--home-rest` je izmjereno ostalo (29.5 / 34 / 36.25rem kad su obje sekcije). Karta lepeze prati sto (`min(plafon, (sto − 5.5rem) / 1.6)`), pa lepeza ne ulazi u naslov. Prvo mjerenje: 2 igre (Poker živ + Raub uskoro) na 360×740 skrolovale su 36 px — dvije sekcije; sad sto pada na 160 px. CDP (`/dev/home`, novi parametri `last=` i `err=1`), 360×740 i 390×844, web i `web=0`: 0 px skrola i ništa van ekrana u svim slučajevima (1, 2, 3 igre, zakačen Raub, greška), sve mete ≥44 px; prava `/` isto. `/profil` gosta na 360×740 skroluje 14 px (ranije 22 — traka je 8 px niža).

**Pozadina nije cijeli `tables/wood.webp`:** ta slika je cijeli sto — zeleno sukno sa bakarnim obodom u sredini — pa su sa `cover` ivice tog stola virile iza Igraj i reda dugmadi (vlasnik: „ne sviđa mi se što se vidi pozadina stola"). Početna koristi `public/home-wood.webp`, isječak donjeg dijela iste slike (y 1100–1766, samo daske; sharp `extract`, 17 KB); na telefonu `cover` pokazuje samo sredinu, ćilim sa strane ostaje van kadra.

**Kontrast** (stvarni pikseli `home-wood.webp`): marka 12.1:1 (najsvjetliji piksel 9.9), naslov sekcije 7.5 (7.0), pravni red 10.5 (9.9), traka neaktivno 7.0, aktivno 10.3.

**Zamke:** dev server druge sesije (3107) je posuđen; na 3000 je drugi projekat. Snimci sakrivaju Next dev oznaku i PWA traku „Instaliraj Žandar" (van ove izmjene, inače pokriva traku).

**Provjereno:** typecheck, web 66 testova (+2: boja i karte pločice za svaku igru), lint osnovica (5/2), `next build` i `build:mobile`, nove heks vrijednosti samo §4 tokeni. **Nije provjereno na uređaju.**

## 98. početna v3 · K1 „Tamno toplo" — čista pozadina, Igraj bez lista, izbor u Postavkama (2026-10-24, `feat/home-k1`)

**Izvor:** tabla „UI · Početna v3 — čista pozadina" (`UI_PocetnaV3b`, varijanta K1) na Claude Design platnu „Kartaonica · identitet" — pročitana direktno sa platna (Artifact tool), bez izvoza u folder. `SPEC_POCETNA_V3.md` prepisan na K1 i upućuje na tablu kao izvor istine.

**Izgled:** pozadina bez slike — gradijent `--bg-top` → `--bg-mid` → `--bg-bottom`; sto bez `felt-bg.webp` i bez drvenog oboda — radijalni gradijent `--sukno-1/2/3`, obrub mesing 55 % 1.5 px i sjena, samo tamnije dno (toplo svjetlo uklonjeno). Sto 258 / 186 px, karte 84 / 64 px (kao na tabli). Ispod stola dva dugmeta jedno ispod drugog: **Igraj · protiv drugih igrača** (60 px, mesing) i **Napravi sto · i pozovi prijatelje** (56 px, tamno sa mesinganim obrubom, ikona prijatelja → `/create`). Red „S prijateljima" + „2 · 11 · Drvo ✎" i pilula podešavanja su uklonjeni. Donja traka `--nav-bg`, linija krem 8 %. `--wood-ink`, `--wood-rim` i `public/home-wood.webp` obrisani; preload tekstura sa početne uklonjen.

**Ponašanje — svjesna promjena (vlasnik):** Igraj kreće ODMAH sa zapamćenim izborom (prvi put 4 · 21 · Klasik — `DEFAULT_QUICK_PLAY_PREFS` i prva tema u `TABLE_THEMES`); list izbora prije partije iz #96 je uklonjen, kao i `QuickPlaySettingsSheet`. Izbor je u **Postavke → „Brza igra"** (`SettingsSheet`, `TableSetupFields`, čuva se odmah, bez dugmeta). Produkcija bez Profila (`identityUi` ugašen) tako nema gdje mijenjati izbor brze igre — prihvaćeno, nestaje sa puštanjem naloga; „Napravi sto" i dalje nudi sve.

**Zamke:**
- **`Can't resolve './felt.css'` u `next build`** — poruka (build prolazi) se pojavila poslije ove izmjene, a nestala kad su tokeni preimenovani `--felt-*` → `--sukno-*`. **Ispravka (#99): uzrok nije dokazan** — poruka se kasnije pojavila i sa `--sukno-*` na prvom buildu poslije izmjene CSS-a, a tri builda zaredom bez izmjena su čista. Izgleda kao povremena pojava pri prvom buildu poslije izmjene CSS-a, ne kao posljedica imena tokena. `--sukno-*` ostaje (ne miješa se sa `--felt`).
- **Dva brza dodira u „Brza igra" gazila su jedan drugog:** handler je spajao novu vrijednost sa `prefs` iz zadnjeg rendera, pa je „11" odmah poslije „2" vratio 4 igrača. Uhvaćeno CDP klikovima; sad se spaja sa svježim `readQuickPlayPrefs()`.

**Mjereno (CDP, `/dev/home` + prava `/`, 360×740 i 390×844, web i APK):** 0 skrola, ništa van ekrana, sve mete ≥44 px; sto tačno 258 / 186 px na 740, sa obje sekcije (Poker živ + Raub uskoro) 144 px. Kontrast: marka 11.8, naslov sekcije 7.5, pravni red 10.8, meta na stolu 10.1, greška 5.0, traka 7.1 / 10.4. Postavke: izbor 4·21·Klasik → 2·11·Drvo upisan u `zandar:quickplay` / `zandar:table`, ostaje poslije ponovnog otvaranja; Igraj na `/` šalje `/api/quickplay` sa `playerCount 2, targetScore 11, tableTheme wood`, bez dijaloga.

**Provjereno:** typecheck, web 66 testova, lint osnovica (5/2), `next build` i `build:mobile` bez grešaka. **Nije provjereno na uređaju.**

## 99. Igraj opet otvara izbor stola; dug list ostaje u ekranu (2026-10-24, `feat/home-k1`)

**Povod (vlasnik, na S10e):** (1) Postavke su bile „polupane" — vrh lista (naslov, „Brza igra") je bio iznad ivice ekrana; (2) „kad se igra sa igračima, korisnik bira 11 ili 21 i 2 ili 4 igrača" — izbor mora biti pri ruci, ne samo u Postavkama.

**List preko ekrana:** `.gamemenu` ima `max-height: min(80dvh, 100%)`, ali omotač `.sheet-scrim__inner` nema zadatu visinu, pa se `100%` ne razrješava i granica otpada. Dok su Postavke bile kratke, nije se vidjelo; sa sekcijom „Brza igra" list je narastao na ~885 px, a scrim ga poravnava dolje, pa je vrh otišao iznad ekrana i unutrašnji skrol se nikad nije uključio. Popravka u `home.css`: `.sheet-scrim .gamemenu { max-height: min(var(--gamemenu-max-h), calc(100dvh - var(--safe-top))) }` — važi za svaki list preko scrima. Izmjereno na produkcijskom buildu: 360×740 list 148→740, naslov na 168, Zatvori na 726, sredina skroluje; 360×640 isto. **Moj propust u #98:** isti prekinuti vrh se vidio i na snimku iz Chromea, a pročitan je kao „skrolovano dolje".

**Igraj otvara izbor:** vraćen list iz #96 (`QuickPlaySettingsSheet`, „Brza igra · Žandar": 2/4, 11/21, sto, zadnji izbor označen, „Igraj" kreće, „Sačuvaj i zatvori" čuva) — preuzet iz istorije (`e710166`), ne pisan ponovo. Izgled K1 ostaje (dva dugmeta ispod stola, bez reda podešavanja); sekcija u Postavkama ostaje i mijenja isti izbor.

**Zamka — posuđeni dev server:** `next dev` druge sesije (3107) je prestao da prima izmjene (servirani CSS zamrznut i poslije `touch`), pa je provjera rađena na `next build` + `next start` (3008). Za CSS izmjene ne vjerovati tom serveru bez provjere da serviran CSS sadrži novo pravilo.
