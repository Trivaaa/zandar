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

## 100. Prijatelji za ~50 ms umjesto 1.9 s; tabovi bez sistemskih boja linka (2026-10-24, `feat/home-k1` → `main`)

**Povod (vlasnik, S10e):** Prijatelji se dugo učitavaju; ikonice taba „mijenjaju boje" (ljubičasta, kratko crvena na dodir).

**Kako je mjereno:** staging APK na S10e, WebView devtools preko `adb forward tcp:9444 localabstract:webview_devtools_remote_<pid>` (staging build ima uključeno otklanjanje grešaka u WebView-u). Mreža iz CDP-a, a vrijeme do sadržaja **unutar aplikacije** (`requestAnimationFrame` od klika do prvog okvira sa praznim stanjem/listom) — prozivka spolja preko Wi-Fi-ja (~250 ms po pitanju) je pokazivala lažnih 1.2 s.

**Prije:** prvi ulazak 1.9 s. `/api/me` poslan DVA puta istovremeno (`useMe` na ekranu + drugi pozivalac), `/api/friends` tek kad se `/api/me` vrati, i ispred svakog zahtjeva preflight `OPTIONS` (~130 ms). Server po zahtjevu ~800–900 ms: Railway je u `iad` (SAD), Firestore u `eur3` (Evropa), igrač u BiH — svaki Firestore poziv prelazi Atlantik, a `/api/friends` ih ima dva zaredom.

**Izmjene (sve „sigurne", bez promjene oblika podataka):**
- `fetchMe` dijeli zahtjev u letu; `forgetMe` povećava brojač sesije, pa odgovor stare sesije ne puni keš poslije odjave/prijave.
- Lista prijatelja keširana u memoriji po `uid`-u (`peekFriends`); `FriendsList` kreće od nje, svjež odgovor je zamijeni.
- `TabBar` 1.2 s poslije prikaza tiho učita profil i listu (`prefetchFriends`) — jednom po sesiji, SAMO za postojeći nalog sa nadimkom: čeka `authStateReady`, gost i bez sesije ne šalje ništa (`authed` bi inače napravio anonimni nalog svakom posjetiocu).
- Server: `@fastify/cors` `maxAge: 600` — preflight se pamti 10 min.
- Tabovi: neaktivna boja je puni token `--nav-ink` (#9f9b94 = krem 62 % na `--nav-bg`, bez `color-mix`) i ista je za `:link`/`:visited`/`:hover`/`:active`/`:focus`; aktivan tab isto za sva stanja.

**Poslije (isti telefon, staging):** nema `OPTIONS`, jedan `/api/me`, `/api/friends` paralelno; ulazak u Prijatelji **64 / 47 / 48 ms**, skelet se nijednom ne pojavi. Bez tihog učitavanja (dodir u prvih 1.2 s) ostaje ~1 s — jedan krug do servera.

**Tab boje — nije reprodukovano:** na trenutnom staging APK-u, i stvarnim dodirima i snimkom u trenutku dodira, neaktivni tabovi ostaju sivi. Ljubičasta/crvena su sistemske boje posjećenog/dodirnutog linka; popravka ih isključuje za svako stanje bez obzira na uzrok. **Provjeriti okom** kad se ponovi.

**Ostaje (nije kod):** prebaciti Railway servise u evropski region — najveći dobitak za svaki zahtjev, ali je migracija volumena (podaci produkcije), pa ide zasebno i sa odlukom vlasnika.

**Provjereno:** web 66 testova, server 170, typecheck oba, lint osnovica (5/2), lokalni server vraća `access-control-max-age: 600`, staging server isto poslije deploya (~105 s).

## 101. Prelazak iz sobe u sobu više ne miješa stanje (QA 2026-10-24 / B10) (2026-10-24, `764f5c7` → `main`)

**Povod (QA na S10e, staging APK):** poslije brze igre (soba A) igrač otvori pozivnicu za sobu B i tapne push „Ulazak je odobren" → URL je B, a ekran pokazuje kraj partije iz A sa aktivnim „Revanš / Izađi". Usred partije B Android nazad → URL je A, a prikazana je partija B sa igračem kao protivnikom gore, bez njegove ruke; auto-play igra za njega. Konzola: `Subscribe failed: INVALID_TOKEN`.

**Uzrok — dva sloja:**
- Klijent: `/room?id=A` → `?id=B` je ista ruta, pa React zadrži istu instancu `RoomScreen` sa `room`, `gameState`, `session` stare sobe. Prvi `room:subscribe` za B ode sa `roomId` B i tokenom A (`INVALID_TOKEN`), a ekran crta staro stanje dok B ne pošalje svoje.
- Server: `room:subscribe` je radio samo `join(B)` — singleton socket je ostajao i u socket.io sobi A, a `socket.data.playerId` je prepisan na igrača iz B. `broadcastGameState(A)` je zato slao stanje A tom socketu, izgrađeno za pogrešnog gledaoca (igrač nije nađen → nacrtan kao protivnik, bez ruke).

**Izmjene:**
- `key={roomId}` na `RoomScreen` (`app/room/page.tsx`, `app/room/[roomId]/page.web.tsx`) i `MatchingScreen` (isti obrazac, `stage`/`revealed` bi prešli u sljedeću sobu) — druga soba je svjež ekran.
- `RoomScreen.handleGameState` odbacuje stanje čiji `roomId` nije soba sa ekrana (odbrana i dok stari server ne napusti sobu).
- Server: `seatToLeave` (`apps/server/src/roomSwitch.ts`, čista funkcija + 5 testova) — pretplata na drugu sobu/sjedište napušta staru socket.io sobu i zove `handlePlayerDisconnect` za staro sjedište. Ponovna pretplata na isto sjedište (reconnect, prvi plan, push dozvola) ne radi ništa novo.

**Posljedica koju treba znati:** igrač koji iz partije u toku pređe u drugu sobu (ili se Android nazad vrati na prethodnu sobu) sada je za stari sto **odsutan** — „Ponovno povezivanje" → pauza/glasanje, umjesto da server misli da je tu i čeka ga 30 s po potezu. To djelimično pokriva B1/B11 za taj put; izlazak na početnu (`router.push("/")`) i dalje ne javlja ništa (B1 ostaje otvoren).

**Provjereno:** server 175 testova, web 66, typecheck oba, lint osnovica (5/2). E2E u headless Chromeu protiv lokalnog servera i produkcijskog web builda: A u brzoj igri X → navigacija unutar aplikacije na sobu Y (`router.push`, bez reload-a) → kucanje, odobrenje → A vidi **lobi Y** („Igor (ti)", „Čeka se da host pokrene igru"); host pokrene → `history.back()` → ruta X prikazuje **partiju X sa A dolje i 4 karte u ruci**; host Y vidi „Igor — Ponovno povezivanje"; osvježavanje u X vraća isto stanje; u logu servera 0 × `INVALID_TOKEN`. **Nije provjereno na uređaju** (treba novi staging APK: push → soba, Android nazad).

## 102. Namjeran izlazak iz partije: potvrda, Android nazad i sto odmah zna (QA 2026-10-24 / B1, B11) (2026-10-24, `e0424ac` → `main`)

**Povod (QA, web + S10e):** „Izađi na početnu" je radio samo `router.push("/")` — socket je ostajao u sobi, server je igrača vodio kao prisutnog, a ostali su na svaki njegov potez čekali puni sat (30 s) do auto-playa, bez ikakve poruke (B1). Na Androidu je nazad usred partije tiho izvodio iz nje (`NativeShell` → `router.back()`), a otvoren ☰ meni (i Pravila) nazad nije zatvarao nego izbacivao na početnu, jer `GameScreen` nije prijavljivao slojeve u `lib/backHandlers.ts` (B11).

**Odluke vlasnika:** namjeran izlazak = **odmah pauza + glasanje** (bez 30 s grace perioda pukle veze); ostali vide „{ime} više nije za stolom". Potvrda „Napusti partiju?" **samo dok partija traje** (igra, rezultat ruke, pauza, glasanje) — na kraju meča izlaz ide odmah.

**Server:**
- Novi socket događaj `room:leave`: napušta socket.io sobu, briše `socket.data` (pa `disconnect` i B10 prelazak nemaju šta dalje), gasi grace tajmer, označi igrača `reconnecting` + `left: true` i radi po čistoj odluci `afterLeave` (`pause.ts`, 6 testova): `playing` → pauza; `hand_finished` → **nova ruka pa pauza** (sljedeću ruku pokreće samo host — kad on ode, sto bi zaglavio na rezultatu, a `resumeFromPause` vraća u `playing`); pauza/glasanje → samo javi; nema više ljudi → raspusti; lobi/kraj meča → ništa.
- `startNextHand(room)` izdvojen iz `game:nextHand` bez promjene ponašanja.
- `Player.left?` / `PublicPlayer.left?` (opciono — stari snapshoti i klijenti rade); `toPublicPlayer` ga šalje samo kad je `true`. Povratak preko linka (`room:subscribe`) ga briše.

**Klijent:**
- `RoomScreen.handleLeave`: `room:leave` (čeka ack najviše 1,5 s — izlaz ne zaglavi bez mreže), pa početna.
- `GameScreen`: `requestLeave` — svi ulazi u izlaz (meni, pauza, rezultat) idu kroz njega; dok partija traje otvara `LeaveTableSheet` (po uzoru na `LogoutSheet`, „Napusti" / „Ostani").
- Android nazad: sto prijavljuje bazni handler na mount (najdublji u steku → pita za izlazak), meni i pravila prijavljuju svoj kad su otvoreni (zatvaraju se prvi), potvrda (`Sheet`) zatvara samu sebe.
- `PauseAbandonOverlay` (`waitingLeft`) i `PlayerSeat` razlikuju izlazak od pukle veze: „{ime} više nije za stolom" / „Nije za stolom". Tekstovi rodno neutralni.

**Provjereno:** server 182 testa, web 66, typecheck oba, lint osnovica (5/2). E2E u headless Chromeu (lokalni server + produkcijski web build, dva igrača): potvrda se pojavi, „Ostani" je zatvara; „Napusti" → igrač na `/`, host **odmah** vidi pauzu „Igor više nije za stolom" i sjedište „Nije za stolom" (log `left … (pause)`); povratak preko linka → `reconnected` + `resumed`, oznaka nestaje; host izađe na rezultatu ruke → `Next hand started` + pauza, gost nije zaglavio („Vesna više nije za stolom", Runda 2); brza igra sa botovima → izlazak → `Match abandoned`. **Nije provjereno:** Android nazad na uređaju (stek se na webu ne čita — treba novi staging APK), izlaz bez potvrde na kraju meča (provjereno kodom, `matchLive`).

**Back u pregledaču (web):** `useBrowserBackGuard` (`lib/backHandlers.ts`) dok partija traje stavi iznad sobe „čuvar" unos istorije sa istim URL-om (bez `__NA` — Next-ov patch `pushState` kopira svoje stanje, pa `popstate` ostaje na istoj stranici). Back skine čuvara, hook ga vrati i otvori istu potvrdu; „Napusti" ide kroz `room:leave`, a `router.replace("/")` zamijeni čuvara. U aplikaciji isključen (`isNative`) — tamo nazad ide kroz stek. Kad partija završi, čuvar ostaje: prvi Back poslije kraja meča ostaje na stolu (svjesno — skidanje bi bio asinhron `history.back()` usred Next navigacije). Back sa početne poslije izlaska vraća za sto i partija nastavlja (isto kao povratak preko linka). **Provjereno E2E:** Back → potvrda (URL i sto ostaju), „Ostani", ponovo Back → potvrda, „Napusti" → `/`, server `left … (pause)`, protivnik „Igor više nije za stolom".

## 103. Ljubičast tab — pravi uzrok i popravka (QA 2026-10-24 / B13) (2026-10-24, `efa2ba6` → `main`)

**Povod:** vlasnik je na S10e vidio ljubičast/crven tab (changelog 100 — „nije reprodukovano"). QA je na staging APK-u izmjerio aktivan tab `color: rgb(0,0,238)` iako pravilo `.tabbar__tab[aria-current=page]` važi (debljina 700 jeste primijenjena).

**Uzrok (CDP `CSS.getMatchedStylesForNode`):** u `globals.css` neslojevit „hover guard" — `@media (hover: none) { a:hover, button:hover { color: revert; background-color: revert; opacity: revert } }`. WebView ostavi `:hover` na posljednjem dodirnutom elementu; neslojevit CSS pobjeđuje svaki `@layer`, a `revert` vraća na pregledačev stil — boju linka (`-webkit-link`, plava/ljubičasta) i pozadinu dugmeta. Zato se javljalo povremeno (samo dok `:hover` „zapne") i zato ga popravka iz changeloga 100 (eksplicitne boje za `:link/:visited/:hover/:active` u slojevima) nije mogla nadjačati.

**Izmjene:** blok obrisan (komentar na njegovom mjestu objašnjava zašto se ne vraća) — Tailwind v4 `hover:` je ionako u `@media (hover: hover)`. Jedina ručno pisana `:hover` pravila van tog media query-ja koja mijenjaju izgled (`.create__back`, `.lobby__back`, `.pushprompt__dismiss` — prozirnost 0,75) prebačena u `@media (hover: hover)`; `:focus-visible` ostaje svuda. Tabovi na `:hover` daju istu boju kao bez njega, pa ne trebaju izmjenu.

**Provjereno (CDP, `Emulation.setEmulatedMedia` hover:none/pointer:coarse + `CSS.forcePseudoState` hover):** prije — aktivan i neaktivan tab pod hoverom `rgb(0,0,238)`; poslije — `rgb(224,185,58)` / `rgb(159,155,148)`, isto kao bez hovera. Sva dugmad i linkovi na `/` i `/create` (12 + 12): 0 mijenja boju, pozadinu ili prozirnost pod hoverom. **Nije provjereno na uređaju** (treba novi staging APK).

## 104. Izdanje 1.2.0 — nalog i prijatelji u produkciji (2026-10-24, `573a8a7`…`befe383` → `main` → `production`)

**Povod:** vlasnik sprema 1.2.0 za Play — prva verzija sa nalogom, profilom i prijateljima (SPEC_IDENTITET). Sve je bilo na `main`-u, ali iza prekidača i bez produkcijskog Firebasea.

**Izmjene u kodu (grana `release/1.2.0`, worktree `zandar-release`):**
- `identityUi = FIREBASE_CONFIG !== null` umjesto provjere imena okruženja. Prekidač „na tvrdo" bi produkciji dao ekrane prijave bez Firebase projekta iza njih (`auth.ts` vraća `null` → mrtva dugmad); ovako je upis produkcijske konfiguracije jedini prekidač izdanja, a `main` je do tog commita i dalje bio spreman za produkciju bez naloga.
- `firebaseConfig.PRODUCTION` = nova web aplikacija „Kartaonica Web" (`1:652209876577:web:ca56…`), napravljena Firebase CLI-jem. Test sada traži tačno produkcijski projekat.
- `src/release/` i `src/debug/google-services.json` ponovo preuzeti — sad nose Android OAuth klijent za tri ključa i web klijent (`client_type 3`); ranije `oauth_client: []`, pa bi Google prijava u produkcijskoj aplikaciji pala.
- Politika privatnosti: Authentication (SAD) i Firestore (EU, `eur3`) razdvojeni; Firestore red sada nabraja i blokiranja i prijave igrača, koje server čuva (`blocks/`, `reports/`), a politika ih nije pominjala. Datum 24. oktobar 2026.
- `versionCode 3`, `versionName "1.2.0"`.

**Firebase `kartaonica---production` (konzola, vlasnik + CLI):** Authentication sa Anonymous, Email/Password i Google; ovlašćen domen `kartaonica.com` (`www` preusmjerava, ne treba); Firestore `(default)`, Standard, `eur3`, production mode; e-mail šabloni (potvrda adrese, reset lozinke — jedina dva koja aplikacija šalje) na ijekavici u oba projekta, bez `%DISPLAY_NAME%` (nadimak nije u Firebase-u, bio bi prazan); Public-facing name „Kartaonica" (vidi se na Google ekranu za prijavu). SHA-1/SHA-256 dodati `apps:android:sha:create`: upload ključ (`b22d77…`), Play app-signing (`b04894…` — SHA-1 nije bio nigdje zapisan, pročitan `apksigner verify --print-certs` sa `base.apk` instalacije 1.1.0 sa Play-a, `adb pull`) i lokalni debug (`ccb437…`, jer je `apk:prod` debug build).

**Provjereno:** tsc web + server, web 66/66, server 182/182, game-core 167/167, lint = osnovica; `next build` za production i staging sa probom ruta (`/profil`, `/prijatelji`, `/nalog/*`: 404 bez konfiguracije, 200 sa njom). Na produkciji poslije objave API tok 13/13: gost → `accounts:signUp` sa `idToken` (isti `uid`) → nadimak (zauzet za drugog igrača i malim slovima) → avatar → **dokument `profiles/<uid>` pročitan direktno iz Firestorea** (vlasnički token firebase-tools prijave — dokaz da server ne radi iz memorije, bez gledanja Railway loga) → `DELETE /api/me` 204 → nema ga u Auth-u ni u Firestoreu. Rezervacija nadimka (`nicknames/<key>` sa `releasedAt`) ostaje 30 dana, po dizajnu i po politici. AAB iz čistog `zandar-apk` na `befe383`: potpisan upload ključem, manifest `1.2.0`, resursi i web bundle gađaju samo produkcijski Firebase i `zandar-test.up.railway.app`, `capacitor.config.json` bez `server.url`, `FirebaseAuthentication` prisutan.

**Zamke:**
- Novi Firebase projekti imaju zaštitu od nabrajanja e-mailova: REST `accounts:update` sa e-mailom na anonimnom nalogu → `OPERATION_NOT_ALLOWED: Please verify the new email…`. Prvi API test je zbog toga pao (greška testa, ne aplikacije); JS SDK `linkWithCredential` ide kroz `accounts:signUp` + `idToken`.
- Windows PowerShell 5.1 nema `&&` — komande za vlasnikov terminal pisati sa `; if ($?) { … }`.
- Dva „izmijenjena" gradle fajla u `zandar-apk` poslije `cap sync` bili su samo LF/CRLF (`git diff` prazan) — bezbjedno odbaciti.
- `firebase` CLI nije globalno instaliran; radi `npx -y firebase-tools@14` (prijava je u `~/.config/configstore/firebase-tools.json`).

**Nije provjereno:** Google prijava u produkcijskoj aplikaciji (tek sa instalacije sa Play-a — app-signing ključ ne postoji lokalno); javni profil na produkciji (na stagingu jeste).

## 105. Broj registrovanih korisnika u PostHogu (2026-10-25, `feat/analytics-registration`)

**Povod:** vlasnik je tražio broj registrovanih korisnika u PostHogu. Nije postojao nijedan signal: nema događaja registracije ni `identify`, a `signup_succeeded` je prijava e-mailom za buduće igre, ne nalog.

**Izmjene:** novi klijentski događaj `account_registered { method: "password" | "google" }` (shared-types `AnalyticsEvents` + `ClientAnalyticsEvent`) i `recordAccount()` u `lib/track.ts`, koji uz to postavlja osobinu osobe `registered=true`. Pozivi u `lib/account.ts`: `registerWithEmail` i obje `linked` grane `continueWithGoogle` (web popup i native) šalju događaj; `signInWithEmail` i `signInWithGoogleCredential` (postojeći nalog, novi uređaj) samo osobinu — inače bi ista registracija bila brojana dvaput. Šalje klijent, jer povezivanje gosta sa nalogom radi Firebase JS SDK i server taj trenutak ne vidi; `distinct_id` ostaje guest ID, pa registracija ulazi u isti lijevak kao `first_open`. KPI recepti u `docs/analytics.md`.

**Provjereno:** web testovi 70/70 (+4 za `recordAccount`, uključujući fail-closed na stagingu), tsc web + server, lint = osnovica. **Nije provjereno uživo** — lokalno i staging ne šalju u PostHog; prvi pravi događaj tek sa kartaonica.com (APK tek sa sljedećim izdanjem, `versionCode 4`). Registracije prije ovoga (1.2.0, od 24.10.) postoje samo u Firebase Auth konzoli; bez backfill-a.

## 106. Dodir na kartu dok sto animira prethodni potez (QA 2026-10-24 / P6) (2026-10-25, `fix/p6-tap-during-beat`)

**Povod:** QA na S10e — u ~30 % poteza (40 od 133) prvi dodir odmah na početku poteza nije zabilježen, a sat već teče.

**Uzrok:** kad protivnik odigra, snapshot odmah kaže da sam ja na potezu (`myTurn`), a `useTableBeat` još 0,78 s (bacanje: 260 + 280 + 240 ms) do ~1 s (kupljenje) animira njegov potez. `handleSelect` je u tom prozoru radio `if (… tableBusy) return`, a ruka je izgledala aktivno (`disabledCardIds` gleda samo `myTurn && !busy`) — dodir je tiho nestajao.

**Izmjena (odluka vlasnika: „zapamti i odigraj"):** izbor karte ne zavisi od stola, pa se prihvata uvijek — prvi dodir odmah podiže kartu. Drugi dodir iste karte dok sto radi ide u red (`queuedPlayId`) i izvršava se kad beat završi, nad PRAVIM `state.table`: 0 opcija → bacanje, 1 → kupljenje, više → karta ostaje podignuta i igrač bira grupu (force-capture tako nikad ne postaje bacanje). Odluka je čista funkcija `lib/handTap.ts` (`decideHandTap`, `resolveQueuedPlay`, 11 testova). Opcije stola (`tableCard` → `tableOptions`/`canTrail`/`forceCaptureBlocked`/traka) i dalje čekaju smiren sto — sto se ne nudi nad zadržanim rasporedom. Red se poništava pri renderu kad potez prestane biti moj ili karte nema u ruci; druga karta prebacuje izbor i briše red. Server, pravila i sat poteza netaknuti.

**Provjereno:** web 77/77, tsc, lint = osnovica. E2E u headless Chromeu (390×844) preko CDP-a, lokalni server + `next dev`, 2P protiv bota, dodir u prvih 80 ms MOG poteza: dupli dodir → potez poslat za 777–788 ms (tačno kraj beat-a bacanja) i 1045 ms (kupljenje), 5/5; jedan dodir → karta podignuta 5/5, ništa poslato. **Kontrola na starom `GameScreen.tsx`, isti test:** 0/3 podignuto, 0/6 poslato — test hvata bug. Slučaj „više kupljenja iz reda" pokriven samo jediničnim testom.

**Zamke:** `react-hooks/set-state-in-effect` odbija i `setState` iz `useEffectEvent` pozvanog sinhrono u tijelu efekta — izvršenje reda ide kroz `setTimeout(…, 0)` u efektu (isti obrazac kao dijeljenje). Vrijeme se mjeri unutar stranice (`performance.now()` uz omotan `WebSocket.prototype.send`), ne prozivkom spolja. **Nije provjereno na uređaju.**

## 107. „Pošalji pozivnicu" i „Pozovi iz prijatelja" bez prijatelja (QA 2026-10-24 / P1) (2026-10-31, `feat/p1-share-invite`)

**Povod:** pozivnica se mogla samo kopirati; na ex-Yu tržištu poziv ide preko Vibera i WhatsAppa, a kopiraj → otvori → traži → nalijepi je 4 koraka. Izvor dizajna: platno „Kartaonica · identitet", table **P1 · Pošalji pozivnicu** (P1-0…P1-4, tok odluke, F1–F6) i **Pozivnica — tekstovi** (`share.msg.a`). K1 lobi i OG po stolu su svjesno van ovog koraka (napomene na tabli).

**Izmjene:** `lib/share.ts` — `pickShareChannel` (aplikacija → `@capacitor/share`, jer Android WebView nema `navigator.share`; web → `navigator.share`; inače clipboard) i `shareInvite` → `shared | copied | cancelled` (odustajanje ne radi ništa, puklo dijeljenje kopira, pa dugme nikad nije mrtvo). Poruka `sr.share.msg` = `share.msg.a`: „Zvonko te zove na partiju Žandara 🃏 Igramo dva na dva, fale još tri. Ništa ne instaliraš, samo otvori: <link>". Lobi: veliko `.lobby__share` ispod reda sa linkom (isti oblik kao „Pokreni igru"; nestaje kad je sto pun, pa je na ekranu uvijek jedno istaknuto dugme), „Kopiraj" ostaje. „Pozovi iz prijatelja" sada vidi svaki host: `RoomInviteSheet` (`components/friends/InviteGuestSheet.tsx`) tek na dodir pita `useMe()` — gost → F5 (Registruj se / Pošalji pozivnicu linkom), nalog → `InviteSheet`, čije je prazno stanje F6 (Dodaj prijatelja / link). Iz taba Prijatelji F6 ostaje bez linka (nema sobe).

**Odluka:** link ide U tekst, bez zasebnog `url` — neke aplikacije ga inače dupliraju, a druge izgube `text` (napomena 3 na tabli). Viber/WhatsApp pregled grade iz linka u poruci; OG je zasad opšti iz `app/layout.tsx` („Žandar online"), provjeren `curl`-om na produkciji.

**Provjereno:** web 92/92 (+11, `lib/share.test.ts`), tsc, lint = osnovica. E2E u headless Chromeu (CDP, 390×844, lokalni server + `next dev`, podmetnuti `navigator.share`/clipboard, `/api/me` i `/api/friends` presretnuti za F6) 15/15: tačan tekst poruke, odustajanje ne kopira, bez dijeljenja „✓ Kopirano", F5 i F6 sa obje radnje. Snimci uporedivi sa tablom. Staging APK se gradi, `capacitor.plugins.json` sadrži `SharePlugin`.

**Nije provjereno:** sistemski meni na telefonu i kartica u Viberu/WhatsAppu (P1-4) — `adb` nije bio povezan; sto pun (dugme nestaje) nije gađan E2E, uslov je `playersNeeded > 0`; „Registruj se" iz F5 samo otvara postojeći meni. **Zamka:** novi nativni plugin stiže u aplikaciju tek sa AAB-om (1.2.1, `versionCode 4`); APK nosi svoj web, pa stara 1.2.0 ostaje dosljedna. Baner „Instaliraj Žandar" na mobilnom webu prekriva naslov lobija i red sa linkom — zatečeno, srodno B4.

## 108. Objava P1 i P6, paket 1.2.1 (2026-10-31, `9c25591` → `main` → `production`)

**Šta:** `production` pomjeren fast-forwardom na `9c25591` (P6, P1, verzija). Samo web: serverski kod nije mijenjan. AAB 1.2.1 (`versionCode 4`) izgrađen iz čistog `zandar-apk` worktree-a.

**Provjereno:** u paketu `versionName` 1.2.1, `versionCode` 4, `@capacitor/share`, bez `server.url`, produkcijski API i Firebase, bez staging adresa, potpis upload ključem (`EA:71:38…`, isti u `assetlinks.json`). Na kartaonica.com `/room/<id>` servira kod sa `lobby__share`; `/health` = `production`.

**Nije provjereno:** paket nije pokretan na uređaju (`adb` prazan); sistemski meni i kartica u Viberu/WhatsAppu (P1-4) i dalje nisu viđeni na telefonu.

## 109. Rezultat uživo na stolu, koncept B (2026-10-31, `feat/live-score`)

**Šta:** traka rezultata u `FeltHeader`-u umjesto čipa „Runda N" (`ScoreBar`): Mi : Oni, +N do kraja dijeljenja, „fali N" blizu kraja. Kad neko odnese 2♣ ili 10♦, traka 1,5 s postane vijest u boji tima, pa se vrati rezultat sa +1; vibracija i tih zvuk samo za naš tim. Na kraju ruke traka kaže „Kraj dijeljenja · Mi +3 · Oni +1", pa tek onda ide `RoundEndOverlay`. Dodir na traku otvara `ScoreDetails` ispod nje, igra ne staje. Zvuk i vibracija su dolje desno iznad reakcija. Spec: `docs/Specs/SPEC_REZULTAT_UZIVO.md`.

**Podaci:** klijent nije imao trefove ni vlasnike male i velike do kraja ruke. Dodato je jedno opciono polje, `PrivateGameStateView.liveHand` = `calculateHandScore(state)`: isto pravilo kao na kraju ruke, pa klijent ne odlučuje o bodovima, a `breakdownRows` radi nad njim bez izmjene. `GameState` nije diran, pa snapshot i hidracija nisu pogođeni. `capture.scoring` je razlika vlasnika između dva snapshota.

**Odluke gdje se spec i kod razilaze:**
- `scoring` je niz, ne jedna vrijednost: 10♦ kojom se kupe 2♣ + 8 nosi obje odjednom, pa idu dvije vijesti jedna za drugom.
- J sweep koji nosi malu ili veliku DOBIJA vijest (odluka vlasnika): poen je stvarno osvojen, a `isJackSweep` ne razlikuje žandara od obične karte koja isprazni sto. Sweep bez njih nema vijest.
- Zadnji potez ruke nema zasebnu vijest o maloj i velikoj; pokriva ih „Kraj dijeljenja".
- Prsten oko avatara je sad iz ugla igrača (`teamTone`): ranije je `teamId 0` uvijek bio plav, pa bi igrač iz tima 1 svoj tim vidio u boji koju traka daje protivnicima. Lobi ostaje apsolutan.
- Panel je ispod trake i bez scrima (slika b-b5 pokazuje drugačije, važi spec): zatvara ga `pointerdown` bez `stopPropagation`, pa isti dodir i bira kartu.
- Red mala/velika u panelu ostaje iz `breakdownRows` (velika prva), isti kao na kraju ruke.

**Zamke:**
- Vijest ne smije krenuti kad stigne snapshot: to je ~540 ms prije nego karte odlete. Red čeka fazu beat-a. Red je stanje, a ne `onCollect`, jer novi potez poništava tajmere beat-a i vijest vezana za njih bi se izgubila.
- Server `matchScore` novog stanja šalje u istom snapshotu kao zadnji potez, pa traka do kraja vijesti crta `matchScore − pointsByPile` i +N iz `liveHand`-a prije poteza.
- `/dev/game` nije povećavao `capturedCounts` pri kupljenju, pa `deriveGameEvents` nije vidio potez; mock je popravljen, a dodati su potezi `mala|velika|obje|sweepmala` i parametri `held`, `score`, `team`.
- Okvir trake je `outline`, ne `border`: border je dugme spuštao na 42 px, ispod mete od 44.

**Posljedice:** u meniju više nema razrade prethodne ruke tokom igre; `ScorePill` ostaje samo u `/dev/overlays`; `RoundEndOverlay` i dalje piše „Tim A / Tim B".

**Provjereno:** game-core 178 (+11), server 186 (+4), web 115 (+23), typecheck, lint = osnovica, `next build` i `build:mobile`. Prava ruka protiv botova na lokalnom serveru (headless Chrome, 360×740): vijest 1,92 s, protivnička bez vibracije, ukupni broj se mijenja tek na kraju (1 : 4, isto kao overlay), overlay poslije vijesti, dodir na kartu zatvara panel i bira kartu. Rubni slučajevi kroz `/dev/game` 26/26: obje karte, J sweep, 2P, igrač iz tima 1, reduced-motion (1526 ms, bez animacije i linije). Izmjereno na 360×740 i 390×844: zaglavlje 56 px kao i prije, traka 44 px, lepeza partnera 9 px ispod trake, bez sudara dugmadi sa rukom i sa najdužom rečenicom u `TurnBanner`-u.

**Na uređaju (S10e, staging APK + staging server, 4P, pravi dodiri kroz `adb`):** vijest naš tim daje jednu laku vibraciju (poziv `navigator.vibrate(15)`), njihov tim ne; +1 ostaje poslije vijesti; kraj 3 : 2 isto kao overlay; preklopke zvuka i vibracije rade na novom mjestu; Android nazad zatvara panel i igrač ostaje za stolom; dodir na kartu zatvara panel i bira kartu. Mjere na 360×760 sa rupom kamere: traka y 45–89, lepeza partnera od y 98. Direktna proba staging servera: `liveHand` u 49/49 stanja, cijela ruka odigrana.

**Staging gubi sobe na deployu:** partija započeta prije ovog deploya je stala, jer je soba poslije restarta na stagingu nestala (`GET /api/rooms/:id` = 404, živa soba = 200). Klijent to ne prikazuje: sto stoji bez poruke, a na potezu ostaje bot. Lokalno hidracija radi (restart usred bot poteza 4/4, bot nastavlja), a oblik snapshota nije mijenjan.

**Uzrok (2026-10-31): Railway projekat nije imao nijedan volumen.** `railway volume list` = `No volumes found`; produkcija nije imala ni `DATA_DIR`, a staging ga je imao bez volumena ispod. Svaki deploy je zato brisao žive sobe, prijave za buduće igre (`_signups`) i push uređaje. Popravka: `zandar-staging-volume` i `server-volume`, oba na `/data`, oba `DATA_DIR=/data/rooms`. Staging test sa povezanim igračem kroz pravi redeploy: prekid ~22 s, `♻ Restored 2 room(s) from persistence`, ista ruka nastavljena, potezi prolaze. Produkcija podešena (17:03), ali restart na njoj još nije prošao; prvi dokaz je `Restored` u logu sljedećeg deploya. Prijave sa starog diska su izvezene prije restarta (`Documentsprijave-produkcija-2026-10-31-pred-volumen.json` kod vlasnika, jedina kopija) i nisu vraćene na server. Sa volumenom Railway nema preklapanja deployeva, pa svaki deploy znači ~20–30 s prekida. Pouka: tvrdnje „preživljava restart“ iz ranijih unosa bile su provjerene samo lokalno.

**Nije provjereno:** zvuk i vibracija nisu slušani ni osjećeni (viđen je samo poziv vibracije; zvuk je upaljen preklopkom, ali njegovo puštanje nije potvrđeno). Čitač ekrana nije pokretan; `aria-live` je provjeren samo po sadržaju. 3P traka je gledana samo na mocku; na 360 px sa +1 kod oba dugo ime u 2P ostaje na prvom slovu („B…").

## 110. Meta App Events za Android, uz saglasnost (2026-10-31, `feat/meta-app-events`)

**Šta:** `facebook-core` 19.0.0 za prvu Meta App Install kampanju: samo instalacija i otvaranje. Prompt jednom na početnoj (nikad preko sobe), povlačenje u Postavkama, politika privatnosti i `/delete-account` dopunjeni. Verzija 1.3.0 (`versionCode 5`).

**Odluke:** `FacebookInitProvider` izbačen, jer bi SDK dizao prije saglasnosti. `AutoInitEnabled=false` ga ne zaustavlja: `GraphResponse.fromHttpConnection` blokira tek odgovor, a sdkInitialize se ipak izvrši. Četiri `ACCESS_ADSERVICES_*` dozvole uklonjene (daljinski prekidač bi kroz njih mogao uključiti custom audience). Metapodaci ekrana isključeni (`AutoLogMetaDataEnabled`, `AutoLogProductImprovementEnabled`). Gate po paketu umjesto `BuildConfig`: staging ima pravi prompt, a ne šalje ništa.

**Zamke:** `setAutoLogAppEventsEnabled(false)` ne zaustavlja tracker koji već radi. `EXPLICIT_ONLY` zaustavlja slanje događaja, ali ne i dohvatanje postavki. Tracker pokrenut poslije resume-a ne vidi to otvaranje, otud jedan ručni `logEvent` pri prvoj dozvoli. Emulator na ovoj mašini: Avast MITM daje `net_error -202` u WebView-u pa „Failed to fetch"; za test `webview-command-line` sa `--ignore-certificate-errors` + `am set-debug-app`. Meta zahtjevi i sa lažnim tokenom dobijaju pravi odgovor.

**Provjereno (emulator, lažan token):** tabela u `docs/analytics.md`; staging: pozivnica na hladan start bez prompta preko sobe, partija do prvog poteza, Nazad = odbijanje. Merged manifest bez providera i ADSERVICES, `AD_ID` prisutan.

**Nije provjereno:** prijem u Events Manageru (Client Token nije stigao), S10e (wireless debugging ugašen), Google prijava i push u ovoj verziji, instalacija sa Play-a.

## 111. Meta: jedan zahtjev za instalaciju, povlačenje ponovo pokreće aplikaciju (2026-10-31, `feat/meta-app-events`)

**Dva zahtjeva za instalaciju:** SDK sam zove `activateApp` čim učita postavke (`FetchedAppSettingsManager` → `AutomaticAnalyticsLogger.logActivateAppEvent`), a oznaku „poslano" upisuje tek poslije uspješnog odgovora, pa je naš dodatni poziv mogao poslati drugi zahtjev. Uklonjen; pokretanje je sad samo `sdkInitialize`.

**Povlačenje:** `EXPLICIT_ONLY` zaustavlja događaje, ali SDK i dalje dohvata `mobile_sdk_gk`, a javnog gašenja nema. Povlačenje sad pokreće aplikaciju ponovo (launch intent + `exit`, izbor upisan `commit`-om). Red je samo u Postavkama, nikad za stolom. Time su otpali `setAdvertiserIDCollectionEnabled` i grana za ponovnu dozvolu u istom procesu.

**Zamka:** završetak procesa odmah poslije dodira gubi localStorage upis mlađi od ~1 s (izmjereno 0–750 ms izgubljeno, 1000 ms sačuvano), pa bi npr. izbor iz istog lista Postavki nestao. Zato `EXPLICIT_ONLY` odmah, Toast i restart tek poslije 3 s: 8/8 upisa sačuvano.

**Token:** `META_CLIENT_TOKEN` u `android/local.properties`, kroz `resValue`; release bez njega pada, jer bi inače tiho izašao paket bez događaja.

**Zamka:** `facebook-android-sdk-current.zip` sa Metinog sajta je 4.42.0 iz 2019 (bez `AD_ID`, Support Library), ne koristiti.

**Provjereno (S10e, pravi token):** Overview u Events Manageru pokazuje jednu instalaciju po svježoj instalaciji; Test Events ostaje prazan (vidi `docs/analytics.md`). Meč do kraja, push „neko kuca" sa tapom, pozivnice (hladno, toplo, `verified`) i Google prijava prošli. **Nije provjereno:** instalacija sa Play-a, atribucija stvarnog klika.

**Nije provjereno:** ništa na uređaju (vibracija je presretnuta u pregledaču, Android nazad nije gađan, zvuk nije slušan). Čitač ekrana nije pokretan; `aria-live` je provjeren samo po sadržaju. 3P traka je gledana samo na mocku; na 360 px sa +1 kod oba dugo ime u 2P ostaje na prvom slovu („B…").

## 112. Lijevak pozivnice u analitici (2026-10-31, `feat/invite-analytics`)

**Povod:** „Pošalji pozivnicu" (changelog 107) je objavljena bez mjerenja: `play_requested` nosi samo `mode`, pa se nije vidjelo šalje li iko link ni gdje gost odustaje.

**Šta:** `invite_shared` i `invite_opened` na klijentu (`lib/track.ts`, jer samo on zna za meni i otvaranje), `join_requested` i `join_approved` na serveru (`analytics.ts`, jer samo server zna da je zahtjev prošao). `room_id` spaja hosta i gosta, koji su različite osobe. `wait_ms` pokazuje stiže li host na vrijeme u roku od 2 minuta.

**Zamka:** praćenje `invite_opened` je namjerno u zasebnom efektu; sa `seatsLeft` u efektu koji čita zapamćen zahtjev, promjena broja mjesta bi vratila gosta na formu.

## 113. Dodir na najavljenu igru i pregled prijava (2026-10-31, `feat/signups-admin`)

Vlasnik nije vidio ni interes za Poker i Raub ni adrese koje ljudi ostave.

**Događaj `upcoming_game_tapped` (`game`):** dodir na pločicu najavljene igre na početnoj. Postojeći `teaser_opened` je sa stranice `/igre/<igra>`, a pločica na nju ne vodi, pa se dodir nije mjerio. Jedna prijava važi za SVE najavljene igre (SPEC_POCETNA §7), pa ni `signup_succeeded` ni pregled prijava ne govore koja igra zanima igrača; to govori samo ovaj događaj.

**Pregled `/admin/prijave`:** vlasnik zalijepi `ADMIN_TOKEN` i vidi jedan red po adresi, igre i datum, uz CSV preko postojećeg izvoza. Server: `GET /api/signups`, isti 404 bez ispravnog tokena; `isAdmin` je prešao u `signups.ts` da bi ruta mogla kroz `fastify.inject`. `page.web.tsx` drži stranicu van APK-a; `noindex`; token živi samo u stanju stranice; `ph-no-capture` na cijeloj stranici; `/admin` je u `NON_APP_PATHS`, da vlasnik ne postane `first_open`. Brisanje iz pregleda nije rađeno.

**Provjera:** server 191, web 119, typecheck, lint = osnovica, `next build`, `build:mobile` (bez `out/admin`). E2E u Chromeu sa pravim serverom, produkcijskim buildom i presretnutim PostHogom: dva dodira daju dva događaja, pogrešan token ne daje adrese, jedna adresa sa dvije igre je jedan red, CSV radi, adresa i token nisu ni u URL-u, storage-u ni u dekodiranim zahtjevima analitike. Jedan prazan `/e/` zahtjev nije dekodiran. **Snimak sesije nije testiran** (presretnuti config ga ne pali), a u pravom PostHogu događaj nije gledan.

**Zamka za testove analitike:** PostHog u `HeadlessChrome` ne šalje NIŠTA (filter botova), pa „adresa nije u analitici" tada prolazi uprazno. Provjera mora prvo vidjeti da događaji stižu; test ide sa običnim user-agentom.

## 114. Google Analytics u Android aplikaciji (2026-10-31, `feat/ga-android`)

**Povod:** vlasnik je napravio GA4 Android stream na Firebase projektu `kartaonica---production`. App ID streama je isti kao u `src/release/google-services.json`, pa fajl nije mijenjan.

**Izmjene:** `firebase-analytics:23.2.0` u `app/build.gradle` (verzija iz BoM-a 34.12, firebase-auth i firebase-messaging ostaju 24.0.1 / 25.0.1). Samo automatski događaji, bez JS-a. Prekidač `firebase_analytics_collection_enabled` ide kroz manifest placeholder `googleAnalyticsEnabled`: podrazumijevano `false`, `true` samo u `release`. Reklamni signali su isključeni i GA ne uzima reklamni ID. Dozvola `AD_ID` namjerno ostaje, jer je Meta atribuciji treba: prva verzija ove izmjene, rađena iz `main`-a, uklanjala ju je i tiho bi ugasila atribuciju poslije spajanja, pa je grana prebačena na `release/1.3.0`. PostHog ostaje izvor KPI-eva. Web namjerno nema GA dok se ne riješi saglasnost za EU. Politika privatnosti i `docs/analytics.md` dopunjeni.

**Zamka:** `debug` čita PRODUKCIJSKI `google-services.json`, pa bi bez prekidača razvojna petlja slala podatke u produkcijski GA.

**Provjereno:** spojeni manifesti debug/staging = `false`, release = `true`, `AD_ID` prisutan u sva tri; web testovi 124/124, tsc; staging APK na S10e pokrenut bez pada, log `FA: App measurement disabled via the manifest`. **Nije provjereno uživo:** `release` paket i stvarni događaji u GA vide se tek sa instalacije sa Play-a.

## 115. Google Analytics na webu (2026-10-31, `feat/ga-web`)

**Povod:** vlasnik je napravio GA4 web stream „Kartaonica Web" (`G-76WWHZ49Y0`) i tražio tag na webu. Time je promijenjena odluka iz unosa 114 („web nema GA dok se ne riješi saglasnost za EU").

**Izmjene:** `lib/googleAnalytics.ts` (prekidač, isječak) i `components/GoogleAnalytics.tsx` u `layout.tsx`. Razlike u odnosu na Google-ov isječak: samo produkcijski web build (APK dijeli `NEXT_PUBLIC_APP_ENV`, a već ima Firebase Analytics, pa ga isključuje `NEXT_PUBLIC_PLATFORM`); Consent Mode: oglašavanje odbijeno svuda, `analytics_storage` odbijen u EEA, UK i Švajcarskoj, jer banera nema; ID sobe se skida iz `page_location`, jer je pozivnica za sto. Politika privatnosti i `docs/analytics.md` dopunjeni.

**Zamka:** aplikacija ne radi pune navigacije, pa GA broji `page_view` samo pri učitavanju. Enhanced measurement je ugašen, a nije provjereno kako bi njegovi `page_view`-ovi pri prelazu ekrana stajali uz `page_location` iz `config`-a.

**Provjereno:** web testovi 129/129, typecheck, lint = osnovica, tri builda. Chrome sa presretnutim GA-om: produkcijski build šalje jedan `page_view` po učitavanju, `gcs=G101` (oglašavanje odbijeno, mjerenje dozvoljeno), `/room/abc123` odlazi kao `/room/`. Staging build: nula zahtjeva i kolačića. Mobilni produkcijski export: nula pogodaka za ID i `googletagmanager`. **Nije provjereno:** grana bez kolačića (Google je bira po IP adresi, a provjera nije rađena iz EEA) i stvarni događaji u GA.

## 116. Pripisivanje instalacija kampanji (2026-11-01, `feat/install-attribution`)

**Povod:** kampanja `zandar_boost_01` vodi na web, a traka je već prvog dana odvela 7 od 32 Android posjetioca na Play. Aplikacija dobija novi guest ID, pa su ti ljudi izgledali kao izgubljeni na webu, a instalacija se nije mogla vezati za oglas. Hipoteza A se bez toga ne može mjeriti.

**Šta:** `lib/campaign.ts` čita `utm_source/medium/campaign/content` i pamti ih za sesiju pregledača, jer navigacija skida parametre sa adrese. Traka ih upisuje u Play `referrer` uz sobu i šalje `store_banner_clicked`. Aplikacija pri prvom čitanju referrera šalje `app_install_attributed`; `utm_*` otpada ako nije `[\w.-]{1,100}`, jer je ulaz tuđ, a id sobe ne ide u analitiku.

**Zamke:** `URLSearchParams.size` ne postoji na starijim Android pregledačima. Lokalna provjera sa `NEXT_PUBLIC_APP_ENV=production` bi pokrenula i GA i Sentry, pa je Chrome pušten sa `--host-resolver-rules` koji blokira sve van localhost-a. Sintetički `element.click()` uz ručni `pagehide` nije dao događaj, a pravi dodir kroz CDP jeste. Uzrok nije dalje istraživan.

**Provjereno:** web testovi 143/143, typecheck (web i server), lint = osnovica. Chrome sa Android UA i lažnim PostHog hostom: link sa oglasa nosi kampanju, ona preživi otvaranje bez parametara u istoj sesiji, dodir šalje događaj sa kampanjom, a bez kampanje link ostaje bez `referrer`-a. **Nije provjereno:** `app_install_attributed` na uređaju (referrer se ne može lažirati lokalno, a staging ne šalje analitiku), traka na sobi sa `intent:` linkom u pregledaču (samo jedinični testovi).

## 117. Ponuda aplikacije: traka na vrhu, red na kraju partije, „Otvori" (2026-11-01, `feat/app-offer`)

**Povod:** plutajuća traka sa Play oznakom izgledala je polomljeno i pokrivala sadržaj, a prikazivala se i tokom partije. Stisnuta je bila zbog `fixed left-1/2` (širina po sadržaju je najviše 50vw), a oznaka ima neprovidnu bijelu pozadinu.

**Šta:** vlasnik je sa table „Ponuda aplikacije" izabrao W1 (traka u toku stranice na početnoj), W4 (red na kraju partije) i W6 (ista traka sa „Otvori" kad je aplikacija na telefonu), bez W5, sa 7 dana mira umjesto 14. Pravila su u `decideAppOffer` (`lib/stores.ts`), prikaz u `components/AppOffer.tsx`, a `StoreBanner.tsx` je obrisan.
- Samo Android pregledač. Traka ne ide prije prve završene partije, jedna ponuda po posjeti (`sessionStorage`), × daje 7 dana mira svim mjestima.
- Tri odbijanja gase samo „Preuzmi"; „Otvori" i red na kraju partije ostaju, i ne broje se kao odbijanje.
- Na `/room` (sto, lobi, pozivnica) i `/matching` nema nikakve ponude, ni PWA na desktopu (rješava QA B4). Na Androidu više nema PWA ponude.
- Događaji `app_offer_shown/click/dismiss` sa `place`; `store_banner_clicked` je uklonjen. Play link nosi `utm_source=web&utm_content=<place>`, a plaćena kampanja ostaje netaknuta.
- W6: `related_applications` u manifestu + `asset_statements` u APK-u (`getInstalledRelatedApps`), i putanja `/otvori` u App Link filteru, jer launcher filter nije `BROWSABLE` i pregledač ga ne smije pokrenuti.

**Odstupanje od table:** opis trake se lomi u dva reda umjesto da se reže trotačkom (na 360 px bi ostalo pola rečenice). Sto plaća traku: `--home-rest` raste za nju preko `.home:has(> .app-bar)`.

**Svjesna cijena:** pozivnica više nema dodir koji iz Messengera/Instagrama otvara sto u aplikaciji (unos 86) ni instalaciju koja čuva poziv. W6 ne radi u ugrađenim pregledačima (API postoji samo u Chrome-u) i traži novi APK; stari APK-ovi se ne otkrivaju, pa njihovi vlasnici vide „Preuzmi". PostHog upit preko `elements_chain ILIKE '%google-play-badge%'` više ne važi.

**Zamke:** `next build` (Turbopack) na ovoj mašini pada na Google fontovima (`Can't resolve '@vercel/turbopack-next/internal/font/google/font'`), uz Avast i sa `NODE_EXTRA_CA_CERTS`; prolazi `next build --webpack` sa `NODE_EXTRA_CA_CERTS=<Avast root>`. `/dev/*` ne postoji na `next start`. `cap sync` mijenja `capacitor.build.gradle` i `capacitor.settings.gradle` u svježem worktree-u; ne komitovati. `/matching` bez prave sobe preusmjerava na početnu, pa tamo test može vidjeti traku početne.

**Provjereno:** web 155/155, server 196/196, typecheck, lint = osnovica, web i mobilni build (webpack), Gradle `processStagingResources` (string i spojeni manifest). Chrome sa Android UA na 320×640, 360×740, 390×844, 395×707: W1 od ivice do ivice gura sadržaj (65 px, na 320 px 86), pločice iznad donje trake; × i 7 dana, tri odbijanja, jedna ponuda po posjeti, W6 sa podmetnutim API-jem. W4 (60 px) na `/dev/overlays`. Pravi tok sa lokalnim serverom: početna → `/matching` → `/room` bez ponude.

**Nije provjereno:** W4 na stvarnom kraju partije (samo preview), slanje događaja (PostHog radi samo u produkciji), i na uređaju: `getInstalledRelatedApps` sa pravim APK-om, `intent:` „Otvori" i rezerva na Play. Telefon nije bio na `adb`-u.

## 118. `match_ended` bez gubitka i `landing_engaged` (2026-11-01, `fix/match-ended-loss`)

**Povod:** GTM revizija kampanje `zandar_boost_01`. `match_ended` je nedostajao na 11 od 35 mečeva od 12.10, a `first_open` se šalje pri pokretanju SDK-a, pa nije govorio koliko je ljudi stvarno vidjelo stranicu (od 65 snimljenih plaćenih sesija, 34 su imale ispod 1 s aktivnosti).

**Uzrok gubitka:** grace timer je izlazio za svaku fazu osim `playing`. Čovjek koji ode sa stola dok je na rezultatu ruke nije dobijao prekid, a sobu je poslije 12 h brisao sweeper bez događaja. Podaci se slažu: svih 12 mečeva bez kraja stalo je poslije bar jedne završene ruke.

**Šta:** `afterGrace` u `pause.ts`. Na rezultatu ruke bez povezanih ljudi prvi istek čeka još `HAND_END_GRACE_MS` (10 min), a drugi raspušta. Sweeper otvorenom meču daje `abandoned` prije brisanja. `landing_engaged` (`lib/landingEngaged.ts`): prvi dodir ili 5 s vidljivosti, jednom po guest ID-u.

**Svjesna cijena:** rezultat ruke je predah, pa namjerno nije 30 s kao u partiji, ali igrač koji se vrati poslije više od 10 min sada zatiče raspušten sto (ranije do 12 h). Prvi deploy jednom pošalje `abandoned` za stare zaglavljene sobe, sa vremenom deploya i bez `duration_ms`.
**Provjereno:** server i web testovi, typecheck, lint na izmijenjenim fajlovima, web build. Lokalni server sa lažnim PostHog prijemnikom i pravom hidracijom: rezultat ruke + odlazak daje prekid tek poslije produženog roka i `match_ended`; povratak tokom čekanja čuva sto; stara soba dobija `match_ended` tačno jednom i briše se; završen meč ne dobija novi ishod; odlazak usred partije radi kao ranije. **Nije provjereno:** `landing_engaged` u stvarnom Facebook pregledaču, što se vidi tek iz produkcijskih događaja; dio za aplikaciju stiže s prvim sljedećim APK-om.

## 119. Poker — tipovi i čist motor (2026-11-06, `feat/poker-core`)

**Povod:** `docs/poker-spec.md` v1.1 (Texas Hold'em NL kao druga igra). Kod nije imao okvir igara: `game-core` je ravna lista Žandar funkcija, a `LobbyRoom` nema polje za igru. Zato poker ide pored Žandara, koji se ne dira.

**Šta:**
- `shared-types/src/poker.ts`: `GameId` i `parseGameId` (sve osim `"poker"` je Žandar, zbog starih klijenata i snapshota), stanje (`PokerGameState`, samo server) i pogled (`PokerPlayerView`).
- `game-core/src/poker/`: `evaluate` (vlastiti, najbolja 5 od 7, kickeri, točak A-2-3-4-5, royal), `pots` (slojevi, foldani doprinose bez prava, nepraćen višak se vraća, neparan žeton prvom lijevo od buttona), `config` (tabela blindova, skaliranje faktorom startStack/100, duplira poslije 10. nivoa), `betting` (legalne akcije), `match` (tok ruke i meča, plasman, izlazak), `view` (pogled + auto check/fold).
- `shuffleWith(items, rng)`: Fisher-Yates sa ubrizganim generatorom. `shuffle(deck, seed?)` ga zove, a Žandar ponašanje je isto (ista sekvenca poziva).

**Odluke vlasnika (2026-11-06), koje odstupaju od speca ili ga dopunjuju:**
- tajmer 20 s, prsten oko avatara (samo poker)
- igrač koji ode: mjesto ostaje prazno, NE preuzima ga bot; najlošiji preostali plasman, žetoni izlaze iz igre (`chipsRemoved`), ulog u ruci ostaje u potu
- Quick Play jedan dodir; prozor 3 s za prave igrače ulazi u V1
- automatski start privatne sobe samo za poker
- evaluator vlastiti

**Zamke:**
- **Kratki all-in:** pravilo se drži brojačem `fullRaiseCount` u ulici i `actedAtRaiseCount` po igraču. Igrač smije raise ako nije odigrao ili je poslije njegove akcije bio puni raise.
- **Zatvaranje ulice kad je samo jedan igrač bez all-ina:** nije dovoljno „niko ne mora igrati", jer bi BB koji ima opciju čekao sam. `isBettingRoundComplete` ga pušta ako je već izjednačio najveći ulog. Isto važi kad blind ode all-in, pa nema licitacije.
- **Kratak BB:** za poziv se i dalje traži puni big blind (`currentBet = bigBlind`), a razliku rješavaju side potovi.
- **Akcije ne mutiraju ulaz** (`structuredClone`), za razliku od Žandarovog `applyMove`.

**Provjereno:** game-core 293 testa (bilo 178): 13 kategorija, kickeri, 32 scenarija side potova sa zbirom, heads-up, min-raise, kratki all-in, BB opcija, plasman kod dvostrukog bankrota, izlazak, vidljivost (JSON pogleda nema špil ni tuđe karte), i 500 nasumičnih mečeva (2–4 igrača, nasumični izlasci) sa konstantnim zbirom žetona poslije svake akcije. Typecheck game-core, server i web. Lint za game-core se ne može pokrenuti (eslint nije instaliran u paketu, zatečeno).

## 120. Poker — bot i simulacija (2026-11-06, `feat/poker-core`)

**Šta:** `game-core/src/poker/bot.ts` i `simulate.ts`, plus skripta `scripts/simulate-poker.ts` (`pnpm --filter @zandar/game-core simulate:poker [-- --matches N --players N --seed N --hpl N]`).

**Bot V1** radi po pravilima, bez učenja, i ima jedan nivo jačine:
- **Ulaz je samo `PokerPlayerView`.** Test potvrđuje da drugačije tuđe karte i drugačiji špil daju istu odluku.
- **Preflop:** Chen formula sa pragom po broju igrača. Otvaranje je 2,5 BB, plus po 1 BB za svakog ko je samo platio. Re-raise ide na oko 3× tuđeg uloga; odbrana se ravna po pot oddsima, uz malu šansu „da vidim flop".
- **Kratak stack (< 12 BB): push/fold.** Prag se spušta sa stackom.
- **Postflop:** ruka spada u monster, jaku, srednju, draw ili ništa. Kombinacija koju daje sam board se ne računa kao igračeva. Odluka ide po pot oddsima i šansi drawa, uz blef, slowplay i semi-blef kao vjerovatnoće.
- **Konfiguracija:** sve težine su u `DEFAULT_POKER_BOT_CONFIG` (HARD RULE 7).
- **Vrijeme odluke:** `pokerBotThinkMs` daje 1–5 s, duže kad odluka košta veći dio stacka.

**Kalibracija** (800 mečeva po varijanti, 4 igrača):

| Pokušaj | Šta se mjerilo | Zašto nije valjalo / šta je promijenjeno |
|---|---|---|
| prvi pragovi | 89% ruku bez showdowna, 3,1 akcija po ruci | botovi su skoro sve foldali preflop, pa čovjek krade blindove |
| labaviji pragovi | flop i dalje samo 23% | otvaranje na 0,75 pota davalo je BB pot odds 0,31, tik iznad praga odbrane; prelazak na fiksnih 2,5 BB i prag odbrane 0,35 → flop 31% |
| — | prvi bankrot medijan u 4. ruci, p10 meča 10 ruku | preflop ratovi re-raiseova |
| re-raise od Chen 12, mirniji postflop | prvi bankrot u 7. ruci, p10 18 ruku, 67% mečeva u 12–20 min | zadržano kao podrazumijevano |

`handsPerLevel` 6 bi produžio 4P meč (medijan 15,1 min, p90 19,7), ali spec kaže 5 i to je ostalo.

**Model trajanja** je pretpostavka iz skripte, ne mjerenje: 1 čovjek u 4 sjedišta odlučuje prosječno 6 s, botovi koliko kaže `pokerBotThinkMs`, a svaka ruka ima 6 s za dijeljenje, let žetona i prikaz rezultata. Pravi broj daće tek analitika (`duration_ms`).

**10.000 mečeva × 4 (seed 1, 112 s):**
- 0 odstupanja u zbiru žetona, 0 odbijenih akcija bota
- ruke po meču: p10 17 · medijan 43 · p90 51
- 3,9 akcija po ruci; flop vidi 32% ruku; all-in runout 9%
- procjena trajanja: p10 7,5 · medijan 13,6 · p90 17,4 min; 66% mečeva u cilju

**Zapaženo:**
- Gornju granicu meča drže blindovi: na nivou 10–11 (50/100 → 100/200 uz 400 žetona za stolom) meč se završi oko 51. ruke.
- Kratki mečevi (p10) su posljedica ranih all-in sukoba, ne strukture.
- 2P i 3P mečevi su kraći (2P: medijan oko 8 min). Cilj 12–20 važi samo za Quick Play sa 4 igrača.

**Provjereno:** game-core 316 testova (bilo 293): Chen, procjena postflopa, push/fold, AA se ne folda, monster se ne folda, nezavisnost od skrivenih podataka, vrijeme odluke, i simulacija od 150 mečeva za 2/3/4 igrača bez grešaka. Typecheck.

## 121. Poker — server (2026-11-06, `feat/poker-core`)

**Šta:** poker sobe na postojećim sobama, linkovima, nalozima, pozivima i botovima. Žandar putanje nisu prepisane.

**Ključna odluka:** poker soba drži stanje u `LobbyRoom.poker`, a `gameState` joj je uvijek `null`. Sav Žandar kod (tajmeri, pauza, glasanje, `broadcastGameState`, bot potezi, analitika ruke, sweeper) uslovljen je sa `room.gameState`, pa poker sobe preskače sam od sebe. U `index.ts` su zato samo grananja na ulazima: rute, `room:subscribe`, `room:leave`, `disconnect`, `game:rematch`, hidracija i sweeper. Ostalo je u `apps/server/src/poker/table.ts` (`PokerTables`).

**Pravila stola** (spec + odluke vlasnika):
- Rok poteza je 20 s; istek daje check ako može, inače fold.
- Bot odlučuje za 1–5 s iz `getPokerView`. Rok za prikaz je isti kao za čovjeka, pa sat izgleda jednako.
- Bez veze: `sitting_out` (server za igrača igra check/fold, blindovi se plaćaju). Poslije 60 s mjesto ostaje prazno (`leavePokerMatch`, `player.left`); bot ga ne preuzima.
- Ruke idu jedna za drugom bez hosta: 2,5 s poslije ruke bez showdowna, 5 s poslije showdowna.
- Bez živog čovjeka za stolom meč se završava odmah (`finishPokerMatchEarly`, plasman po žetonima).
- Kreator privatne sobe koji izađe prije starta zatvara sobu (ostali dobijaju `room:kicked`).
- Revanš: samo host, svi ponovo od 100.
- Tajmer poteza se NE resetuje kad stigne `broadcast` za isti potez: ključ je ruka + broj akcija + igrač + status. Žandar ima obrnutu grešku (QA B2).

**Ulazak:**
- **Quick Play** (`game: "poker"`): uvijek 4 mjesta. Sto čeka druge prave igrače do `matchWindowMs`, pa ostatak dobijaju botovi. Podrazumijevano je 2 s, ne 3 s: sa 3 s je mjereno 3.044 ms od klika do prve ruke, a spec traži manje od 3 s. 1,5 s je dalo 1.549 ms.
- **Privatna soba** (`/api/rooms`, `/api/invites` sa `game`): kreće sama kad se popune sva mjesta. To uključuje i uključen bot-fill („popuni botovima i odmah počni"). `/start` i dalje radi.

**Stari klijent:** APK 1.0–1.3 ne zna za poker i crtao bi Žandar sto sa poker stanjem.
- Klijent mora javiti `games: ["zandar","poker"]`: u tijelu `join-request` i `invites/:id/accept`, i u `auth` na socketu.
- Bez toga REST vraća 426 `{ code: "update_required" }`, a `room:subscribe` vraća `UPDATE_REQUIRED`.
- `GET /api/rooms/:id` sada vraća `game` za svaku sobu. Pozivnica (`user:invite`) nosi `game: "poker"` samo za poker.

**Miješanje:** `cryptoRng` = `crypto.randomInt(0, 2^48−1) / (2^48−1)`. **Zamka:** `randomInt` traži raspon strogo manji od 2^48. Sa `2 ** 48` svaki start meča baca `RangeError`.

**Analitika:**
- `game` je i na Žandar `match_started`/`match_ended` (`"zandar"`).
- Za poker: `pokerMatchStartedEvents`/`pokerMatchEndedEvents` (bez `target_score`, sa `placement`; `is_winner` = 1. mjesto).
- Brojač partija na profilu je zajednički za obje igre (pitanje 9 je otvoreno).
- `docs/analytics.md` je dopunjen.

**Back-compat:** sva nova polja (`game`, `poker`, `matchingUntil`) su opciona. Soba bez `game` je Žandar, a Žandar sobe se upisuju bez novih polja.

**Provjereno:**
- **Server testovi:** 217 (bilo 202). 15 novih u `poker/table.test.ts`:
  - pogled bez `isBot`, špila i tuđih karata
  - meč do kraja bez interakcije
  - sat se ne resetuje
  - greške akcija
  - sitting out → prazno mjesto
  - povratak prije roka
  - izlazak zadnjeg protivnika
  - zatvaranje sobe
  - Quick Play prozor
  - automatski start (Žandar netaknut)
  - hidracija iz JSON-a
  - revanš
  - `clientSupportsGame`
  - analitika
- **e2e na lokalnom serveru:**
  - Quick Play
  - stari klijent: 426 i `UPDATE_REQUIRED`
  - 17 akcija kroz `poker:action`
  - nijedan `game:state` bez `turnDeadline`, sa `isBot` ili špilom
  - Žandar Quick Play bez `game` radi kao ranije
  - privatna 2P + bot-fill kreće sama
  - restart procesa usred ruke vraća sto i sjedište
  - nijedna greška u logu servera
- game-core 317, typecheck za server i web.

## 122. Poker — web (2026-11-06, `feat/poker-core`)

**Šta:** poker sto po tabli „UI · Poker NL" (Claude Design, platno „Kartaonica · identitet", ekrani A–M). Pravilo table: novo je samo ono što poker ima, a Žandar nema.

**Preuzeto bez izmjene:** `.felt-stage` i budžet visine, podloge (classic/wood/cloth), `PlayingCard`, `CardBack`, `FeltHeader`, `GameMenuSheet`, `LeaveTableSheet`, `ReactionFab`, `Toast`, `Avatar`, `arrangeSeats`.

**Prošireno (Žandar se ne mijenja):**
- `PlayerSeat`: `statusText` („Čeka se veza"), `adornment` (D/SB/BB), `faceCards` + `cardTone` (karte na showdownu) i `data-warn` na pola roka.
- `SeatCaption`: tonovi `bet` / `allin` / `fold`.
- `ReactionFab`: `side` i `style`. Poker ga drži lijevo, jer su desno tvoje karte.
- `RulesModal`: `game`.
- `LobbyScreen`: `game`. Poker nema cilj, timove ni Start.
- `TableSetupFields`: `showTarget`.
- `CreateRoomScreen`: izbor igre.

**Novo:**
- `components/poker/`: `PokerScreen`, `ActionPanel`, `RaiseSheet`, `PokerParts`, `PokerRules`.
- `app/poker.css`: sve pod `[data-game="poker"]`, bez novih tokena.
- `lib/pokerView.ts`: čist, testiran.

**Budžet pozornice:** isti `--stage-*`, samo poker vrijednosti.
- Dno je panel (5rem) umjesto lepeze i trake.
- Poleđine stoje uz avatar, ne iznad njega, pa gornje sjedište plaća samo natpis akcije.
- Bočna sjedišta su u gornjem dijelu stola (`--pk-side-top`), board i pot ispod njih (tabla A).

**Odluke koje kod nosi:**
- Pot = sve na stolu, uključujući uloge ulice.
- Bet kad niko nije uložio u ulici, inače Raise.
- Akcije i kombinacije na engleskom.
- „Šta imaš" uz tvoje karte ostaje.
- Bez žetona: Nova partija · Gledaj do kraja · Izađi.
- „Soba" → „Sto" i „Napustio igru" → „Nije za stolom", u obje igre (odluka 9 sa table).
- Tekstovi kraja su rodno neutralni („Tvoj plasman: 4.", „Prvo mjesto: Marko").

**Prekidač izdanja:** `lib/pokerRelease.ts`.
- `pokerLive` je uključen kad `NEXT_PUBLIC_APP_ENV !== "production"`, ili uz `NEXT_PUBLIC_POKER=1`. `0` ga gasi svuda.
- Razlog: IARC. Igra sa simuliranim kockanjem mijenja rejting cijele aplikacije, pa produkcija ne smije dobiti poker samim merge-om na `production`.
- Bez prekidača poker ostaje „Uskoro" sa prijavom.

**Matching:** poker Quick Play pita `GET /api/rooms/:id` dok se sto ne popuni ili ne krene (server čeka do 2 s). Ritual otkrivanja je kratak. Javni sto u stanju `waiting` više nikad ne prikazuje lobi.

**Zamke:**
- **Side pot iz `buildPots` slojeva je pogrešan za prikaz.** Nepraćen all-in preko blindova davao je „Glavni pot 3 · Pot 2 100" (uhvaćeno u e2e). Sad se pot reže samo na iznosu kraćeg all-ina (manje od najvećeg uloga među živima). Višak bez bar dva ovlaštena ide u prethodni pot.
- **Quick Play za 4 daje `teamId`** (zajednička logika sobe), pa su sjedišta nosila Žandarove boje Mi/Oni. `withoutTeam` u `PokerScreen`.
- **Headless Chrome ne ide ispod ~500 px širine.** `--window-size=360,…` daje razvučen snimak, pa mjerenje ide kroz CDP `Emulation.setDeviceMetricsOverride`.
- **Lint (`react-hooks`):** zaključavanje panela i raise list su izvedeni iz `stateVersion` (`busyAt === stateVersion`), ne iz efekta. Prva ruka novog nivoa se računa iz pogleda: N = (ostalo + ruka − 1) / nivo.
- **Jedini čovjek bez žetona:** server odmah završava meč (pravilo „bez živog čovjeka"), pa karta „Bez žetona" postoji samo kad za stolom ostane još neki pravi igrač.

**Provjereno:**
- Web testovi: 178 (+15). Typecheck. Lint = osnovica (5/2).
- CDP snimci `/dev/poker`: 360×740 (A–K), 360×640 (2P/3P/4P) i 390×844. Bez horizontalnog skrola.
- e2e u headless Chromeu protiv lokalnog servera:
  - Quick Play → vidljiv board za 2,69–2,72 s (`next dev`, zagrijano)
  - 25 poteza kroz panel (Check/Call)
  - all-in kroz raise panel do „Kraj partije", plasman 1–4 i „Igraj ponovo"
  - 0 grešaka u konzoli

**Nije provjereno:** uređaj, `next build` + `build:mobile`, privatna soba sa dva prava igrača u pregledaču, poziv prijatelja za poker (tekst poziva u `InviteInbox` i pushu još kaže samo „partija").


## 123. Početna — lista igara (2026-11-07, `feat/poker-core`)

**Šta:** kad je živo više igara, početna je lista kartica po tabli „UI · Početna — opcija 1 Lista" (platno „Kartaonica · identitet", K1). Raub je izostavljen (dolazi kasnije): u listi se ne crta ni red „Uskoro". Dok je živ samo Žandar (produkcija bez `NEXT_PUBLIC_POKER=1`), ostaje sto K1 kao do sada.

**Kartica igre** (`components/home/GameList.tsx`, stilovi `.home-list*` u `home.css`):
- Slika u boji igre (`--game-*-1/2`), ime, podnaslov (`sr.home.listSub`) i tri prave karte (`GameConfig.listCards`).
- Ispod Igraj i Napravi sto. Obje radnje su uvijek vidljive.
- Oznaka: ZAKAČENO → NOVO → ZADNJE IGRANO (`gameBadge`, testiran).
- Redoslijed daje postojeći `homeLayout`: zakačena → zadnje igrana → ostale.
- Visina slike: 92 px na 360×740 i 116 px na 390×844, linearno po `dvh`, najmanje 80 px.

**Radnje:**
- Poker Igraj ide pravo za sto (odluka 3).
- Žandar Igraj otvara izbor 2/4 · 11/21 · sto (odluka #96). Tabla kaže „jednim dodirom", ali je ta odluka vlasnika novija, pa je zadržana.
- Izbor stola sad pripada igri čiji je list otvoren, a ne „glavnoj".
- Napravi sto → `/create?game=…`.

**Zamke:**
- Na 360×640 oznaka je dirala kvačicu na „Ž".
- Dug opis (greška traženja) se odsijecao u drugom redu.
- Popravka: tekst je blok usidren za dno slike i raste nagore, a dok stoji greška oznaka se ne crta.

**Nije urađeno:**
- Stanje „Nedovršena partija" sa table (2): početna danas ne zna za partiju u toku.
- Kačenje igre iz liste: list igre (H4) se iz liste ne otvara. Zakačena igra ostaje zakačena.

**Provjereno:**
- CDP snimci `/dev/home?live=2` na 360×740, 390×844 i 360×640, bez skrola.
- Zakačen poker, greška traženja, i `live=1` = stara K1.
- Web testovi 180, typecheck, lint = osnovica. **Nije provjereno na uređaju.**

## 124. Raub — spec u dokumentima (2026-11-07, `feat/raub-spec`)

**Povod:** vlasnik je dao `raub-spec.md` (v1, 6.11.2026) i tablu „UI · Raub — kompletan UI" na platnu „Kartaonica · identitet", uz uslov da se spec uklopi u postojeća pravila i strukturu, a da produkcija ima prednost nad tablom.

**Izmjene:**
- `docs/raub-spec.md` (v1.1) pored `docs/poker-spec.md` — moduli igara žive u korijenu `docs/`, ne u `docs/Specs/`. Struktura je ista kao poker-spec; izmjene v1 su upisane na svoja mjesta i označene „(odluka N)", a nova sekcija „Odluke i usklađivanje" daje razlog za svaku.
- Odluke vlasnika: zamjena sve 4 = 5 karata pa odbacivanje jedne (ne otvorene); kraj ruke = dugme hosta kao Žandar (ne auto 5 s sa table); izlazak i prekid veze = postojeća pauza i glasanje (bez preuzimanja mjesta botom); tabela „Gdje se izvori razilaze" potvrđena.
- Usklađeno s pravilima projekta: bez riječi „bot" u UI-ju, „Zamjena 3" umjesto „Zamijenio 3", pragovi bota kao konfiguracija, okvir modula kao Poker (`LobbyRoom.raub`, `raub:action`, `games` za stare klijente, prekidač izdanja).
- Riješena proturječnost v1: zamjena ne smije tražiti više karata nego što ih ima u špilu, pa igrač uvijek ulazi u štihove sa 4.
- `CLAUDE.md`: red u zaglavlju.

## 125. Raub — tipovi i čist motor, „Idem / Ne idem" (2026-11-07, `feat/raub-core`)

**Povod:** S1 plana za Raub (`docs/raub-spec.md`): motor bez servera i UI-ja, po obrascu Pokera (`game-core/src/raub/`, imena sa prefiksom `raub`/`Raub`, `export * from "./raub"`).

**Izmjene:**
- `shared-types/src/raub.ts`: `RaubRules` (izbori iz tabele „Gdje se izvori razilaze" kao parametri: `maxTalonFlips`, `firstBidder`, `direction`, `mustOvertrump`, `allowDrop`), `RaubGameState` (samo server), `RaubPlayerView` (klijent i bot), `RaubGamePayload`, `RaubInterruption` (pauza i glasanje, apsolutni rokovi).
- `game-core/src/raub/`: 32 karte iz postojećeg `createDeck()`, dijeljenje 2 + talon + 2 (djelilac sebi zadnji), sva tri scenarija aduta, zamjena sedmice, okretanje 2. i 3. karte, refa i red refa (svaka refa duplira jednu sljedeću odigranu ruku), višak sa zaključanom talon kartom, zamjena ograničena špilom, prva zamjena sve 4 = 5 karata sa otvorenom trećom pa odbacivanje (odluka 1), štihovi (boja → adut → bilo šta), bodovanje (`raubScoreDelta`), plasman sa dijeljenim mjestom, `getRaubView` (djelilac ne vidi karte prije odluke; nikad špil, tuđe ruke ni odbačene), `getRaubAutoAction` za istek roka, bot iz pogleda (`DEFAULT_RAUB_BOT_CONFIG`, 1–3 s), simulacija (`pnpm --filter @zandar/game-core simulate:raub`).
- Stanje se kopira `structuredClone`-om osim istorije ruku, koja se dijeli (upisani redovi se ne mijenjaju) — inače je simulacija bila O(n²).

**Odluka 9 — „Idem / Ne idem" (vlasnik, 7.11.2026):** prva simulacija sa „svi igraju" (spec v1, potvrđeno ujutro): 2 igrača ~11 ruku, 3 ~23, a sa 4 igrača **nijedan od 60 mečeva ni za 150 ruku** — bodovi rastu +0,15 po igraču po ruci (4 štiha u ruci, ~45 % igrača bez štiha dobija +2, nosilac pada u 48 %). Uveden mehanizam iz pagat-a: poslije određivanja aduta (i viška) svako osim nosioca bira Idem / Ne idem; ko ne ide, odlaže karte i ne boduje se; niko ne ide → nosilac −4. Istek roka = Ne idem. Bot ide sa 2+ aduta ili asom (`goMinTrumps: 2`; sa 1 je 4P medijan bio 42 ruke). Spec dopunjen (odluka 9), a link igrajkarte.com iz izvora sada preusmjerava na nepovezan domen — označen.

**Provjereno:**
- game-core 362 testa (46 novih Raub: scenariji, licitacija, refa ×3, idem/ne idem, zamjena i prazan špil, štihovi i obaveze, svaki red bodova, primjer iz speca, kraj meča, anti-leak pogleda, istek roka, bot samo dozvoljeno, skraćena simulacija).
- `simulate:raub`, 10.000 mečeva po veličini stola (seed 1): **0 grešaka karata, 0 grešaka štihova, 0 odbijenih akcija, 0 zaglavljenih**. Ruke po meču (medijan / p90): 2P 10 / 12, 3P 15 / 20, 4P 22 / 32. Refa: 13,6 % / 5,2 % / 2,2 %. Procjena trajanja (model, ne mjerenje: čovjek 4 s po potezu, 8 s po ruci): 2P 5,7 min, 3P 11,3, 4P 20,2 (p90 29,5).

**Zamke:**
- Ne-interaktivno: `pnpm exec eslint` u game-core ne postoji (zatečeno), kapija je `tsc --noEmit`.
- Simulacija 4P traje ~4 min za 10.000 mečeva; u vitest ide skraćena (150–300 mečeva).

## 126. Raub — server (2026-11-07, `feat/raub-server`)

**Povod:** S2 plana za Raub. Server vodi Raub sto po obrascu Pokera: `GameId` = `zandar | poker | raub`, `LobbyRoom.game`/`raub`, a Raub soba nikad nema `gameState`, pa je sav Žandar kod preskače.

**Izmjene:**
- `apps/server/src/raub/table.ts` (`RaubTables`): start (prvi djelilac nasumično, mjesta po `seatIndex`), Quick Play prozor za prave igrače (2 s, `RAUB_MATCH_WINDOW_MS`) pa botovi, privatna soba kreće sama kad se popuni (i na „Popuni prazna mjesta"), pogled po socketu (`RaubGamePayload`, bez `teamId` — Raub nema timove), rok poteza 15 s (`RAUB_TURN_MS`) i za bota, bot iz `getRaubView` 1–3 s, istek roka = `getRaubAutoAction` + `game:autoPlay`, socket `raub:action`.
- Sljedeća ruka: `game:nextHand`, samo host (odluka 2).
- Prekid (odluka 3): ista pauza i glasanje kao Žandar, iste čiste odluke iz `pause.ts` (`afterGrace`, `afterLeave`, `resolveVote`…) i isti rokovi (`GRACE_MS`, `PAUSE_MS`, `VOTE_MS`, `WAIT_EXTENSION_MS`, `HAND_END_GRACE_MS`). Prekid živi u stanju (`RaubGameState.interruption`, apsolutni rokovi), pa preživi restart; `game:waitMore` i `game:abandonVote` rade i za Raub. Dok traje prekid, akcije vraćaju `GAME_PAUSED`.
- `index.ts`: račvanja na svim mjestima gdje ih ima Poker (sobe, poziv, Quick Play — `pokerQuickPlay` je postao `seatGameQuickPlay(game, …)`, start, bot-fill, odobrenje, prekid veze, subscribe, izlazak, revanš, hidracija, sweeper). Stari klijent bez `games` dobija 426 / `UPDATE_REQUIRED` i za Raub (isti `needsUpdate`).
- Analitika: `pokerMatchStartedEvents`/`pokerMatchEndedEvents` primaju `game`; Raub šalje `game: "raub"`, `placement`, `hands_played` = broj ruku (sa refama). `docs/analytics.md` dopunjen. Završen meč broji se na profilu (`recordCompletedMatch`).

**Provjereno:**
- Server 234 testa (17 novih: parser akcija, stari klijent, Quick Play do 4, anti-leak pogleda, bot + istek roka, host za sljedeću ruku, odbijanje van reda, jedini čovjek otpadne → raspušteno, pauza → povratak, glasanje „Završi"/„Čekaj", namjeran izlazak, zatvaranje lobija, hidracija sa isteklim rokom, revanš, analitika).
- E2E na lokalnom serveru (socket klijent): Quick Play Raub → prvo stanje za 2,0 s; stari klijent 426 i `UPDATE_REQUIRED`; 3 ruke kroz `raub:action` + `game:nextHand`; ilegalna karta → `ILLEGAL_CARD`; ni u jednom stanju `isBot`, `botProfile`, `guestId`, špil, odbačene karte ni `teamId`; **restart servera usred meča** → soba hidrirana i odigrane još dvije ruke; Žandar Quick Play bez `game` i dalje `game: "zandar"`.

**Zamke:**
- Na Windowsu `TaskStop` ugasi `pnpm`, ali ne i `node` dijete — server ostane na portu. Gasi se po portu (`Get-NetTCPConnection … | Stop-Process`).

## 127. Raub — sto (2026-11-07, `feat/raub-table`)

**Povod:** S3 plana za Raub: ekran stola po tabli „UI · Raub — kompletan UI", na istom felt-u, podlogama, sjedištima, lepezi ruke, meniju, reakcijama i pauzi kao Žandar i Poker.

**Izmjene:**
- `components/raub/RaubScreen.tsx` + `RaubParts.tsx`: zaglavlje (faza „Licitacija" / „Idem?" / „Zamjena" / „Štih 2 od 4", adut „NUDI SE ♠" / „ADUT ♥" i ×2, „Refa ×N", dugme Tabela), talon sa špilom i „Karta N od 3" (ranije okrenute prigušene ispod), prostor štiha (karta ispred onog ko ju je bacio, zadnja sa svijetlim rubom; pun štih 1 s pa klizi ka pobjedniku), panel nad rukom (djelilac: Otvori karte / Raub naslijepo; licitacija: Dalje / Raub; sedmica za talon; višak; Idem / Ne idem; zamjena: Zadrži sve / Zamijeni N; štih: „Ti si na potezu" + zašto su karte zatamnjene; „Čeka se: …"), pregled ruke (kazne crvene sa „kazna", ×2 refa, „ne ide"), refa, tabela kao list odozdo, kraj meča sa bodovima (Igraj ponovo / Revanš / Tabela / Izađi), pauza i glasanje kroz postojeći `PauseAbandonOverlay`.
- Sjedišta: bodovi ispod imena, natpis odgovora iznad avatara („Dalje", „Raub", „Idem", „Zamjena 3", „Bez zamjene"), D, nosilac „Raub · mora 2" + 1/2 u mesingu (gore i dolje uz avatar; na bočnim mjestima u redu ispod bodova — pločica uz avatar je ulazila u sto), „Ne ide" prigušeno, prsten 15 s.
- `PlayerHand` (proširenje, Žandar netaknut): `selectedCardIds` (zamjena) i `lockedCardIds` (karta s talona, katanac). Djelilac prije odluke vidi poleđine.
- `lib/raubView.ts` (čista logika prikaza, testirana), `sr.raub`, pravila (`RulesModal game="raub"`), `app/raub.css` (layer components, `[data-game="raub"]` / `rb-`, bez novih tokena), `CLIENT_GAMES` + `raub`, lobi i matching tretiraju Raub kao Poker (bez cilja/timova, prozor za prave igrače), `RoomScreen` → `RaubScreen` + `raub:action`, „Igraj ponovo" pravi novi Raub sto.
- `/dev/raub?s=…&n=2|3|4`: stanja NISU ručno pisana — pravi motor i bot vode meč iz sjemena dok ne stignu do koraka (open, bid, bid2, discard, going, exchange, exchangeOpen, trick, declarer, handEnd, refa, table, end, pause, vote).

**Mjereno (CDP, mobilna emulacija 360×740 i 360×640, 2P/3P/4P):** sve vidljivo bez skrola. Nađeno i popravljeno snimkom: dugme reakcija lijevo je pokrivalo „Dalje" (vraćeno na Žandar mjesto); uputa iznad panela je pokrivala tvoje bodove (traka nad rukom 4,6rem, uputa u njoj); oznaka aduta u uglu stola je na 360×640 pokrivala talon i štih (preseljena u zaglavlje); stub zvuk/vibracija/reakcije je na 640 ulazio u desno dugme panela (panel ostavlja 3,6rem desno; `px-3` uklonjen jer bi utility nadjačao CSS); tabela se otvarala ispod kartice kraja ruke (z-index 70); natpis bočnog igrača se sjekao na ivici; otvorena karta je bila velika kutija preko špila (sada čip „10♥ Goga · otvorena", samo za tuđu).

**Provjereno:** web 189 testova (9 novih), typecheck, lint = osnovica (5/2).

**Nije urađeno:** let karte iz ruke na sto (`flyAnimation`) — karta se pojavi na svom mjestu (opacity); zvuk i haptika za Raub događaje; ocjena na uređaju.

## 128. Raub — ulaz u igru i prekidač izdanja (2026-11-07, `feat/raub-entry`)

**Povod:** S4 plana za Raub: igra se pokreće sa početne, iz `/create` i iz „Pozovi na partiju", kao Poker.

**Izmjene:**
- `lib/raubRelease.ts` (`raubLive`, odluka 8): staging i razvoj uključeno, produkcija tek uz `NEXT_PUBLIC_RAUB=1`, `0` gasi svuda. Testiran kao `pokerRelease`.
- `lib/liveGames.ts`: jedan spisak igara za izbor stola (`TABLE_GAMES`: Žandar + Poker/Raub iza svojih prekidača), `pickTableGame` (URL / memorija → dozvoljena igra), `isSeatGame` (bez cilja i timova). Koriste ga `/create`, `CreateRoomScreen` i `InviteSheet` — ranije je svaki imao svoj `["zandar", "poker"]`.
- `GAMES`: Raub `live` iza prekidača, `releasedAt` 7.11.2026 (NOVO 7 dana), `hasRules`, 20 min (simulacija). `sr.games.raub.about`. Početna: Raub Igraj na jedan dodir (Quick Play je uvijek 4, bez izbora cilja), Napravi sto → `/create?game=raub`, pravila Rauba iz liste igre. Lista igara ga uzima sama (živa igra).
- `startQuickPlay` šalje `game` i za Raub.
- `RaubScreen`: sinhrona brava poteza (`useRef`) — dvostruki dodir je slao isti potez dvaput i prikazivao sirov kod „INVALID_GAME_PHASE" (nađeno E2E-om u pregledaču); kodovi koji znače „stanje je već otišlo dalje" se ne prikazuju, ostalo je ljudska poruka (`sr.raub.errors`). Poker ima isti obrazac (`busyAt` kao stanje) — nije diran.
- `games.test.ts`: test „najavljena igra nije NOVO" više ne koristi pravi Raub (koji je sad živ u razvoju), nego eksplicitno najavljenu igru.

**Provjereno:** web 191 test, typecheck, lint = osnovica (5/2). **E2E u pregledaču** (headless Chrome, 360×740, `next dev` + lokalni server): početna nudi Žandar, Poker i Raub; Raub Igraj → traženje stola → sto za 2,9 s; 3 ruke odigrane klikovima kroz panel i ruku (31 klik: otvaranje, licitacija, idem, zamjena, štihovi tap-tap, sljedeća ruka); 0 grešaka u konzoli.

**Prije produkcije:** `NEXT_PUBLIC_RAUB=1` na Vercelu (produkcija) i u produkcijskom APK buildu; server na produkciji mora biti sa ovim kodom (inače `game: "raub"` pada na Žandar). Stari APK (1.x) ne može u Raub sto (426 / „Za ovu igru ažuriraj aplikaciju.").

## 129. Raub — stilovi u felt.css, spajanje u main (2026-11-07, `feat/raub-entry` → `main`)

**Povod:** pri spajanju je `main` već imao `4bee728`: Vercel staging build je izbacio cijeli zasebno uvezen `app/poker.css` (drugi put, poslije `profile.css` 25.10), pa je poker prebačen na kraj `felt.css`. `app/raub.css` je bio isti obrazac i na stagingu bi Raub sto ostao bez stilova.

**Izmjene:** sadržaj `raub.css` bez izmjene na kraju `felt.css` (isti sloj, poslije pokera), `raub.css` i njegov `@import` obrisani; konflikt u `globals.css` riješen tako da ostaje samo `felt.css`. **Pravilo za sljedeću igru:** novi CSS ide na kraj `felt.css`, ne u novi fajl sa `@import`.

**Provjereno:** `next build` — izlazni CSS sadrži `rb-` pravila; web testovi i typecheck.

## 130. Poker — sto kao priča: animacije i zajednički ritam (2026-11-07, `feat/poker-core`)

**Zašto:** QA krug 2026-11-07 (PK-P1). Server za jedan potez šalje jedno stanje u kojem je sve već gotovo: ulog u potu, flop na stolu, sat sljedećeg igrača. Sto je zato „skakao" sa stanja na stanje. Odluka vlasnika: jasnoća ispred brzine, i po cijenu sporijeg stola.

**Ritam (`packages/game-core/src/poker/pace.ts`):**
- `POKER_PACE` je jedno mjesto za sva trajanja: potez 650, fold 550, check 450, mir 350, ulozi u pot 800, flop 1500, turn i river 950, otkrivanje 550 po igraču, isticanje 1100, isplata 950 po potu, bankrot 550, čitanje 2600 / 1500, dijeljenje 500 + 140 po karti + 320 + 260 ms.
- `pokerPresentationMs(prev, next, …)` računa koliko traje prikaz jednog prelaza. Testirano (8 testova).

**Server (`poker/table.ts`):**
- Sat sljedećeg igrača i odluka bota kreću tek poslije prikaza.
- Payload nosi `turnStartsAt` (opciono; stari klijent ga ignoriše).
- Pauza između ruku = priča kraja ruke, umjesto fiksnih 2,5 / 5 s.
- Prikaz se računa JEDNOM po stvarnoj promjeni: ponovno slanje istog stanja ne pomjera rok.
- `POKER_PACE_PERCENT` (100 = normalno) podešava ritam bez deploya koda.
- Prva ruka meča dobija i vrijeme za dijeljenje: `start()` postavlja „prazan sto" kao prethodno stanje.
- Testovi rade sa `paceScale: 0` (stara pravila), a ritam pokrivaju dva nova testa.

**Klijent:**
- `lib/pokerBeat.ts` (čisto) pravi korake iz razlike prikazanog i novog stanja. Svaki korak kaže šta sto drži (uloge, natpise, board, pot, stackove, otkrivene, isticanje, rezultat, dijeljenje, sjedište bankrota) i koji let pokreće. Test provjerava da je **zbir koraka tačno jednak serverovom vremenu**, za 6 scenarija.
- Motor na prelazu ulice briše uloge i natpise, a na kraju ruke i `totalBet`. „Ko je koliko upravo uložio" se zato računa iz stackova: prethodni − (novi − dobitak).
- `lib/usePokerBeat.ts` izvodi korake. Obrazac je Žandarov `useTableBeat`, sa izvedenim stanjem u renderu, bez `setState` u efektu.
  - Novo stanje usred priče čeka svoj red.
  - Više stanja na čekanju = priča se samo prelaz do najnovijeg.
  - Kad priča kasni za `turnStartsAt`, koraci se sabiju (najviše na 25%). U pozadini se preskaču.
  - Let sljedećeg koraka kreće PRIJE promjene stola, da se sidra izmjere dok su na ekranu.
- `lib/pokerFly.ts`: duhovi na `body`-ju (isti mehanizam kao Žandar). Pokriva žetone od sjedišta do uloga, uloge u pot, pot pobjedniku (podijeljen pot ide u dva toka), fold, „kuc" za check i dijeljenje u dva kruga. Sidra su `data-bet-anchor`, `data-pot-anchor` i `data-deal-from`.
- CSS:
  - board karta po karta, sa padom i okretanjem (`--t-pk-board`);
  - okretanje tuđih karata na showdownu (`--t-pk-flip`);
  - pobjedničke karte podignute svojstvom `translate`, ne `transform`, jer bi `transform` pregazio rotaciju lepeze;
  - novi tokeni kolapsiraju pod prigušenim pokretom.

**Usput riješeno iz QA:**
- PK-B6: kraj meča više ne prekriva isplatu.
- „Bez žetona" i „Sljedeća ruka počinje…" stižu tek uz traku rezultata.
- Igrač koji je upravo ostao bez žetona vidi svoje karte do kraja priče.

**Zamke:**
- `makeGhost` piše pozadinu inline, pa je klasa ne može nadjačati. Žeton-duh se zato stilizuje inline.
- React StrictMode u `next dev` pokreće efekat koraka 0 dvaput, pa ima duplo duhova (16 za 8 karata). U produkciji je jednom.

**Cijena:** ruka je ~4–6 s duža. Prije stvarnog mjerenja na stagingu procjena je ~17 min za meč (bilo 13,6).

**Provjereno:**
- game-core 325, server 219, web 186 testova; typecheck; lint = osnovica.
- Filmska traka na lokalnom serveru sa pravim ritmom (snimak svakih ~300 ms kroz cijelu ruku). Redoslijed je potez → ulog → mir → ulozi u pot → flop 1-2-3 → panel, a na kraju otkrivanje → isticanje → isplata → bankrot → rezultat → kraj meča.
- Prigušen pokret: isti redoslijed, nula duhova.
- Nijedna greška u konzoli.

**Nije provjereno na uređaju:** tempo okom, glatkoća na S10e i StrictMode-neutralan broj duhova u produkcijskom buildu.

## 131. Poker — ploča showdowna: ko je šta imao, pa žetoni najjačem (2026-11-07, `feat/poker-core`)

**Zašto:** vlasnik je poslije animacija (130) odigrao i rekao „dosta je bolje", ali na kraju ruke nije vidio koje je karte imao koji igrač. Otkrivene karte su bile mala lepeza uz avatar (preklapala je D/SB), a traka rezultata je pokazivala samo pobjednika.

**Šta:**
- Traka rezultata (tabla F) za showdown postaje **ploča**: ćelija po igraču koji je došao do kraja, sa imenom (ili „Ti"), **njegove dvije karte** (2.25rem) i kombinacijom.
  - Ćelije stižu jedna po jedna, redom kojim server otkriva.
  - Zatim se najjači istakne zlatno („Pobjednik" / „Podijeljen pot"), a ostali se priguše. Karta koja ne učestvuje u kombinaciji potamni.
  - Tek tada pot leti pobjedniku, a u njegovoj ćeliji se pojavi „+iznos".
- Kad svi ostali foldaju, ostaje stara traka „X uzima pot", bez karata.
- Podaci ploče dolaze iz čiste funkcije `showdownRows` (`lib/pokerView.ts`, 3 testa). Komponenta je `ShowdownPanel` (`PokerParts.tsx`).
- **Raspored:** sa 2 igrača ploča stoji iznad tvog sjedišta (kao traka). Sa 3–4 igrača spušta se do panela akcija, da board sa pobjedničkih 5 ostane vidljiv. Tvoj red je ionako u ploči. Pozadina je neprozirna. Dvije kolone, pa 4 igrača stanu u dva reda.
- **Ritam** (`POKER_PACE`, isti za server i klijent, pa server sam produži pauzu):
  - otkrivanje 550 → **900** ms po igraču;
  - isticanje 1100 → **1500** ms;
  - čitanje 2600 → **3500** ms.
  - Showdown sa 2 igrača je ~2,4 s duži.
- Stilovi su na kraju `felt.css` (ne novi fajl, zbog Vercel keša, vidi 130).
- `/dev/poker?s=F3w|F4`: 3 i 4 igrača na showdownu.

**Provjereno:**
- game-core 371, server 236, web 201; typecheck; lint = osnovica.
- CDP snimci 2P i 4P na 360×640 i 393×852: ploča staje, board ostaje vidljiv.
- Filmska traka na lokalnom serveru: redovi stižu na ~0,9 s, pa isticanje; 0 grešaka.
- **Nije provjereno na uređaju.**

## 132. Poker na našem jeziku (2026-11-07, `feat/poker-core`)

**Šta:** vlasnik je tražio poker „na srpski". Akcije i kombinacije su bile na engleskom (odluka od 6.11.2026), a sad su na našem, uz izraze kakvi se govore za stolom. Tekst ostaje na ijekavici, kao ostatak aplikacije.

- **Dugmad:** Odustani · Dalje · Prati N · Uloži / Podigni · Va-bank; potvrda „Uloži N" / „Podigni na N".
- **Natpis iznad avatara:** Odustaje · Dalje · Prati N · Ulaže N · Diže na N · Va-bank. Bez roda, pa „Odustao/la" ne treba.
- **Kombinacije:** Visoka karta · Par · Dva para · Triling · Kenta · Boja · Ful · Poker (četiri iste) · Kenta u boji · Rojal fleš.
- **Pravila:** naši nazivi, a uz akcije u zagradi engleski (fold, check…), jer ih igrači sreću drugdje. „Side pot" je postao „Sporedni pot (side pot)".
- **Zatvaranje raise lista** se zove „Nazad", ne „Odustani", jer je „Odustani" sada fold.
- **Jedno mjesto za tekst:** natpisi (`sr.poker.did`) i kombinacije (`sr.poker.hands`) žive u `sr.ts`. `POKER_CATEGORY_LABEL` i `actionLabel` (`lib/pokerView.ts`) ih samo čitaju.
- **Ostaje:** Pot, Blindovi, D/SB/BB.

**Provjereno:** web 201 testova (natpisi i „Ful" u `pokerView.test.ts`), typecheck, lint = osnovica, snimak 360×740: „Odustani · Prati 10 · Podigni" i „Podigni na 22" staju bez prelamanja. **Nije provjereno na uređaju.**

## 133. Poker — žetoni iz asseta vlasnika (2026-11-08, `feat/poker-core`)

**Zašto:** vlasnik: žetoni na stolu „baš ne izgledaju lijepo". Bili su CSS crteži (krug sa dva prstena, ulog kao tri žute elipse). Poslao je asset u stilu aplikacije: jedan žeton odozgo i stog od tri.

**Šta:**
- **`scripts/build-chips.mjs`** pravi slike iz izvora `apps/web/assets/chips-source.png` (2172×724 RGBA, u repou), po obrascu `build-cards.mjs` (sharp iz pnpm stabla).
  - Sječe lijevu i desnu polovinu, uz `trim`, i daje `public/chips/chip.webp` (142×144, 7 KB) i `stack.webp` (144×136, 8 KB).
  - Ako izvor stigne bez providnosti, bijelu pozadinu sam pretvara u providnu.
- **Gdje se koristi:**
  - `chip.webp` za broj žetona igrača (`.seat__numbers::before`), pot i rezultat (`.pk-chip`), i za žeton koji leti (`chipGhost`, sjena je `drop-shadow`, pa prati oblik);
  - `stack.webp` za ulog ulice (`.pk-stack`; tri `<i>` iz `StreetBet` obrisana).
  - Ikone su malo veće (1.1–1.45rem) i popunjavaju visinu pilule.
- **Usput:** natpisi bočnih igrača se poravnavaju prema stolu, ne po sredini avatara. „Odustaje" je izlazio van ekrana na desnom sjedištu, jer su naše riječi duže od engleskih (132).
- Sve je u `felt.css` (ne novi importovani fajl, vidi 130).

**Provjereno:** snimci 393×852 na suknu, drvu i stolnjaku „Kafana", bez bijelog ruba; uvećan isječak pilula; žeton u letu na lokalnom serveru; web 201 testova, typecheck, lint = osnovica. **Nije provjereno na uređaju.**

## 134. Poker — manji broj žetona uz igrača (2026-11-08, `feat/poker-core`)

Vlasnik: broj žetona uz igrača je za 10–20% prevelik. Sada je 20 → **17 px** (−15%), samo u pokeru (`.felt-stage[data-game="poker"] .seat__coins`).

**Zamka:** `PlayerSeat` je veličinu nosio kroz utility klasu `text-num-sm`, a utility uvijek pobjeđuje `layer(components)`. Zato je klasa skinuta iz JSX-a, a veličinu drži `felt.css`: osnova `var(--type-num-sm)`, isto kao ranije, a poker 1.0625rem. Žandar žetone ne prikazuje, pa ga ovo ne dira.
## 135. Pošalji utisak — greška, prijedlog, pohvala → e-mail vlasniku (2026-11-08, `feat/feedback`)

**Šta:** igrač šalje utisak sa početne ili iz Postavki. Svaki utisak stiže vlasniku e-poštom, sa slikama u prilogu. Izvor su table **D1** (tihi red ispod igara) i **A2** (forma).

**Ulazi u formu:**
- Početna: red „Greška ili ideja? **Piši nam**" ispod igara, i u listi i na stolu K1. `HomeScreen` prop `onFeedback`.
- Profil → Postavke: „Pošalji utisak".

**Forma `/utisak`** (`components/feedback/FeedbackForm.tsx`):
- Ruta, a ne sheet, iz istog razloga kao `/ime`: Android nazad na `/` gasi aplikaciju.
- Polja: vrsta (jedan dodir), tekst (najviše 2000 znakova) i do 3 slike. Slike se smanjuju u pregledaču (`lib/imageCompress.ts`: ≤1600 px, JPEG 0,8), pa fotografija od 5 MB postane ~200 KB.
- E-mail za odgovor nije obavezan; prijavljenom igraču se popuni adresom naloga.
- Verzija (`NEXT_PUBLIC_APP_VERSION`), platforma i user agent idu sami. U Android WebViewu UA nosi model telefona.
- Token naloga ide ako postoji.

**Server:**
- `POST /api/feedback` (`src/feedback.ts`):
  - Tijelo do 7 MB, samo na toj ruti.
  - Tip slike se provjerava po prvim bajtovima, a ne po MIME-u koji piše klijent.
  - Limit 10/h po IP-u i 5/h po guestId-u. Limit se broji tek poslije provjere tijela.
  - `uid` i nadimak dolaze SAMO iz provjerenog ID tokena; pokvaren token = gost.
- Zapis ide na disk `DATA_DIR/_feedback` (`<id>.json` + `<id>-<n>.jpg`; podfolder, kao `_signups`), pa e-pošta preko Resenda (`src/mail/resend.ts`, REST bez SDK-a, kao FCM).
- Neuspjeh pošte ne obara zahtjev, jer je zapis već sačuvan.
- `GET /api/feedback/export` (CSV) i `DELETE /api/feedback` (`{id}` ili `{email}`) su iza `ADMIN_TOKEN`-a, sa istim 404.
- Istek je 12 mjeseci, dnevno.
- Analitika `feedback_sent {kind, platform, has_attachments, has_email}`. Tekst i adresa nikad ne idu u log ni u analitiku.

**Env (Railway, oba servisa):**
- `RESEND_API_KEY` i `FEEDBACK_TO`. Bez njih utisci idu samo na disk, a log kaže „💬 Utisci: samo disk".
- `FEEDBACK_FROM` je opcion. Podrazumijevano je `onboarding@resend.dev`: bez verifikovanog domena Resend šalje samo vlasniku naloga, a to je ovdje i potrebno.
- `FEEDBACK_DIR` nadjačava folder.

**Privatnost:** politika (8. 11. 2026.) i `/delete-account` sada opisuju:
- utisak kao podatak;
- Resend kao primaoca;
- rok od 12 mjeseci i brisanje na zahtjev;
- sliku iz sistemskog birača (bez dozvole za fotografije).

Play Data safety za sljedeće izdanje: „Poruke u aplikaciji / fotografije, opciono".

**Zamka:** headless Chrome sa ISTIM `--user-data-dir` između pokretanja servira staru statiku iz PWA service workera (`public/sw.js`). Snimak se nije mijenjao ni poslije čistog `.next`; zato za svako mjerenje treba svjež profil.

**Provjereno:**
- Server testovi 235 (`feedback.test.ts` 18) i web testovi 183.
- Typecheck; lint = osnovica.
- Curl matrica protiv lokalnog servera: 200 / 400×3 / pokvaren token = gost / 413 / export 404 → CSV.
- Headless Chrome 390×844, tok početna → Piši nam → 2 slike → loš e-mail (poruka, pa nestaje) → Pošalji → Hvala; zapis i 2 priloga na disku.
- Slanje pravog mejla NIJE provjereno (nema ključa). **Nije provjereno na uređaju.**
## 136. Raub — uzeta sedmica ostaje na stolu (2026-11-07, `fix/raub-taken-talon`)

**Povod:** vlasnik na S10e (staging): faza „Idem?", adut ♠, „Tijana mora 1", a na stolu samo špil — nije se vidjelo koja je karta okrenuta. Scenarij 1: okrenuta sedmica ide djeliocu u ruku **u istom koraku kao dijeljenje** (`startRaubHand` → `takeTalon`), pa nijedan klijent nikad nije dobio stanje u kojem je sedmica na stolu. Isto važi i za raub naslijepo, samo se tamo karta bar vidjela dok je djelilac odlučivao.

**Izmjena:** `RaubPlayerView.takenTalonCard` — karta uzeta s talona (sedmica, naslijepo, zamjena sedmice) dok je još u ruci onoga ko ju je uzeo, do početka štihova. Javna je (bila je licem nagore). Izvodi se iz `talonTakenBy` + `lockedCardId`, pa se oblik snapshota ne mijenja. `TalonPile` je crta na vrhu talona sa oznakom „Uzima: Ime" / „Uzimaš ti"; pri zamjeni sedmice data sedmica leži prigušena ispod. `/dev/raub?s=seven`.

**Provjereno:** game-core 372 (novi test: svi gledaoci vide sedmicu, u štihovima `null`), web 201, typecheck web/server; snimak 360×740 `/dev/raub?s=seven`.

## 137. Raub — katanac ne blokira potez u štihu (2026-11-07, `fix/raub-taken-talon`)

**Povod:** vlasnik na S10e: u 4. štihu („Ti si na potezu — bilo koja karta") jedina karta, 7♣ uzeta s talona, stoji sa katancem i ne može se odigrati; slično i sa kraljem (talon karta iz zamjene sedmice / naslijepo). Partiju je spasio tek tajmer.

**Uzrok:** `RaubScreen` je `lockedCardId` slao u `PlayerHand.lockedCardIds` i u štihovima, a `PlayerHand` zaključanu kartu tretira kao onemogućenu. Motor je ispravan — `CARD_LOCKED` važi samo za višak i zamjenu, a u štihu je talon karta obična karta (i jeste bila u `legalCardIds`).

**Izmjena:** čista `lockedHandIds(view, panelKind)` u `lib/raubView.ts`: katanac samo prije štihova (talon karta; pri višku i moja otvorena karta), u koraku `tricks` nikad. Testirana (web 203).

## 138. Raub — rok poteza 25 s (2026-11-07, `fix/raub-taken-talon`)

**Povod:** vlasnik na S10e: 15 s ističe prije nego se stigne razmisliti; traženo bar 50 % duže. **Odluka 10** u `docs/raub-spec.md`.

**Izmjena:** `DEFAULT_RAUB_RULES.turnTimeoutSeconds` 15 → 25 (server ga čita kao `RAUB_TURN_MS`, i dalje se može nadjačati env-om). Prsten na avataru čita `state.rules.turnTimeoutSeconds`, pa je usklađen sam. Mečevi koji već traju zadržavaju 15 u snimljenim pravilima (prsten), a server poslije deploya čeka 25 — prsten kod njih ističe ranije od stvarnog roka, samo do kraja tog meča.

**Provjereno:** game-core 372, server 236, web 203.

## 139. Raub — botovi razmišljaju 2,5–7 s (2026-11-07, `fix/raub-taken-talon`)

**Povod:** vlasnik: botovi igraju prebrzo i ujednačeno, treba da izgleda realnije. **Odluka 11** u `docs/raub-spec.md`.

**Izmjena:** `DEFAULT_RAUB_BOT_CONFIG.thinkMinMs/thinkMaxMs` 1000/3000 → 2500/7000 (ravnomjerno nasumično po odluci, `raubBotThinkMs`). Rok poteza 25 s ostaje daleko iznad, pa bot nikad ne dira AFK (HARD RULE 4). `GAMES` Raub `minutes` 20 → 35.

**Mjerenje:** `simulate:raub` (10.000 × 4 igrača): medijan 34,4 min, p10 22, p90 50,4 (ranije ~20). Iznad ciljanih 15–25 min iz speca — ako bude predugo, spustiti gornju granicu ili ubrzati očigledne poteze (jedina dozvoljena karta, „Dalje" bez aduta).

**Provjereno:** game-core 372, web 203.

## 140. Zvuk i vibracija u meniju stola (2026-11-08, `feat/feedback-in-menu`)

**Povod:** vlasnik: ikonice 🔊/📳 iznad dugmeta za reakcije zauzimaju sto (na Pokeru lijevo, preko sjedišta i ruke). Prebaciti ih u meni, na svim ekranima igre; podrazumijevano uključeno za sve.

**Izmjena:** `GameMenuSheet` sam nosi dva reda sa prekidačem (`role="switch"`, cijeli red 48 px) — Zvuk i Vibracija — iznad „Pravila igre", pa ih dobijaju Žandar, Poker i Raub bez izmjene poziva. Izgled prekidača je isti kao „Popuni prazna mjesta" u lobiju (`.gamemenu__track` u `overlay.css`). Uređaj bez vibracije: red onemogućen uz napomenu „Ovaj uređaj ne podržava vibraciju". `aboveFab={<FeedbackToggles stacked />}` uklonjen iz `GameScreen`, `PokerScreen` i `RaubScreen`; `FeedbackToggles` ostaje u Profilu (Postavke, uz 🔔). Podrazumijevano uključeno je već bilo (`lib/settings.ts`: samo upisana „0" gasi) — izbor koji je igrač već napravio se poštuje.

**Provjereno:** typecheck, lint izmijenjenih fajlova; headless Chrome `/dev/raub` (360×640), `/dev/poker`, `/dev/game`: na stolu 0 preklopki, u meniju „Zvuk=uključeno", „Vibracija=uključeno".

## 141. Pravni red sa početne u Profil (odluka vlasnika 2026-10-25, poslano na staging 2026-11-08)

**Šta:**
- Privatnost / Uslovi / O nama više nisu na dnu početne, ni na webu ni u aplikaciji.
- Stoje kao tihi red na dnu Profila, i na webu i u aplikaciji.
- Iz Postavki (`SettingsSheet`) je red skinut, jer ga Profil već ima.

**Porijeklo:**
- Izmjena je od 25. 10. stajala nekomitovana u glavnom folderu.
- Prenesena je kao zakrpa na vrh `main`-a.
- Traka ponude aplikacije (`topSlot`) i red „Piši nam" na početnoj ostaju.

**⚠ Rizik:** Google OAuth provjera (prijava Googleom) može tražiti link na politiku privatnosti SA POČETNE. Ako Google to zatraži, red vratiti na početnu (`legalSlot` u `app/page.tsx`; `HomeScreen` prop je ostao).

## 142. Raub — mađarice (2026-11-08, `feat/raub-hungarian`)

**Povod:** vlasnik je isporučio komplet mađarica („Kartaonica_RAUB", ilustrovano izdanje, 32 lica + poleđina) i tražio zamjenu u Raubu — za stolom i na početnoj. **Odluka 12** u `docs/raub-spec.md` (znak boje u tekstu = ikonica sa karte, figure U/O/K/A, četvrta boja „Tikva").

**Izmjene:**
- `scripts/build-raub-cards.mjs` (jednokratno, izvor nije u repou): lica i poleđina 480×680 → 240×340 webp (ista širina kao francuski komplet; odnos 12:17 = naš 1,417) u `public/cards/hu/` — 529 KB za 33 slike. Četiri ikonice boje isječene sa vrha asa (`png/`, okvir izmjeren: x 255–465, y 55–235 — niže počinje pejzaž, koji je u prvom pokušaju ušao u list/žir/tikvu), krem papir → providno po udaljenosti boje, trim, 96 px.
- `lib/hungarianDeck.ts` (čisto, testirano): `huAsset` (pik → list, herc → srce, karo → tikva/`bells`, tref → žir/`acorns`; J → `unter`, Q → `ober`), `huRankLabel`, `HU_SUIT_NAME`, `huSuitIcon`, tip `CardDeck`.
- `components/felt/cardDeck.ts`: `CardDeckContext` (podrazumijevano francuski). `PlayingCard` (prop `deck` ili kontekst) bira sliku i `aria-label` („U žir"); `CardBack` nosi `data-deck`, a `[data-deck="hungarian"] .card-back` mijenja `--card-back-art`.
- `RaubScreen` je umotan u `CardDeckContext.Provider value="hungarian"` + `data-deck` na `.felt-stage` → ruka, talon, štih, lepeze, špil i sažetak bez prosljeđivanja propova. Žandar i Poker netaknuti.
- Tekst: `cardLabel` piše U/O; `withSuits` u `RaubParts` zamjenjuje ♠♥♦♣ ikonicom (`.rb-suit-icon`, 1,15 em) u oznaci adut, uputstvima panela, „Odgovori na boju", zamjeni sedmice i otvorenoj karti. `sr` stringovi nepromijenjeni. Crvena boja teksta (`isRedSuit`/`data-red`) više ne treba.
- Početna: `GameConfig.deck`, Raub `"hungarian"`; `GameList`, `GameTile`, `GameCard` ga prosljeđuju. Iste vrijednosti kartica → VII žir, A list, K tikva.
- `RaubRules`: „32 mađarske karte… A, K, O (iber), U (dečko), 10…".
- Usput: `.rb-panel__hint` sa `left:50%` dobijao je samo pola širine panela i sjekao uputstvo — `width: max-content`.

**Provjereno:** web 205 (novi `hungarianDeck.test.ts`), typecheck, lint; headless Chrome 360×740 `/dev/raub?s=bid|seven|exchangeOpen|trick` (lica, poleđine, ikonica u oznaci adut i uputstvima, zatamnjene karte) i početna 390 px.

## 143. Raub — ruka nije prigušena dok samo gledaš (2026-11-09)

**Povod:** vlasnik na S10e (mađarice): u licitaciji su karte u ruci „kao providne", ne vidi se šta ima. `RaubScreen` je svaku kartu koja se trenutno ne bira slao u `disabledCardIds`, a `.card[data-disabled]` je `opacity: 0.4` — dakle cijela ruka na 40 % u licitaciji, Idem/Ne idem, zamjeni sedmice i tuđem potezu. Uz krem mađarice na zelenom suknu to je skoro nevidljivo.

**Izmjena:** `PlayerHand` prop `idle` (`data-idle` na `.hand`) — karte ostaju neklikabilne, ali bez prigušenja. Raub ga pali kad se karta iz ruke ne bira (`picking` = moj potez i panel `play` / `exchange` / `discard`). U štihu i dalje su zatamnjene samo karte koje pravila zabranjuju; zaključana karta pri zamjeni ostaje prigušena uz katanac. Žandar i Poker ne koriste `idle`.

**Provjereno:** typecheck, lint; snimak `/dev/raub?s=bid2` (pune boje) i `?s=trick` (zatamnjene samo nedozvoljene).

## 144. Raub — veće karte (2026-11-09)

**Povod:** vlasnik na S10e: mađarice su sitne (ruka i talon 61,6 px na 360 px širine) — oznaka u uglu i figure se ne razaznaju.

**Izmjena (samo `felt.css`, Raub blok):** `.felt-stage[data-game="raub"]` diže `--card-w-hand` na 5rem (80 px, +30 %) i `--stage-hand-h` za istu razliku visine (9,71 → 11,34rem; visina karte se izvodi iz `--card-w-hand`). `.rb-table` (talon, štih) 4,5rem = 72 px (+17 %): štih je krst od 4 karte unutar stola. Raub drži najviše 5 karata, pa ruka staje u širinu. Nizak ekran (`max-height: 700px`): ruka 4,5rem (traka 8,88rem), sto ostaje 3,85rem — sa većim, krst štiha je ulazio u gornje sjedište. Žandar i Poker netaknuti.

**Izmjereno (headless, `/dev/raub` štih / zamjena sa otvorenom kartom / višak 5 karata):** 360×760 — bez preklapanja. 360×640 — gornja karta štiha i dalje dodiruje bodove gornjeg igrača, a napomena „otvorena" pada preko natpisa ispod talona; to je bilo i prije (karte stola tu nisu mijenjane), traka ruke je sad 0,92rem viša pa sto 15 px niži. Ostaje za nizak ekran.

## 145. QA 2026-11-09 — B1, B2, B3: tekst po igri i glasanje odmah poslije izlaska (2026-11-09, `fix/qa-2026-11-09`)

**B1 — lobi Raub stola je pisao „Poker · 100 žetona".** `LobbyScreen` je zastavicu `poker` (bez cilja, timova i dugmeta Start) koristio i za red ispod naslova. Sad taj red ide kroz `sr.lobby.metaFor(game, …)`: Žandar „N / M igrača · 21 poena", Poker „· Poker · 100 žetona", Raub „· Raub · od 21 do 0". `metaPoker` je obrisan; zastavica `poker` i dalje vodi ponašanje lobija.

**B2 — pozivnica je za svaku igru govorila „partiju Žandara".** `JoinRequestScreen` dobija `game` (iz `GET /api/rooms/:id`, server ga već vraća; bez polja = Žandar), pa `sr.join.inviteTail(game)` / `inviteNoHost(game)` i isti `metaFor`. Poruka za dijeljenje `sr.share.msg(game, …)` i naslov `sr.share.title(game)`: ime igre u genitivu, a „dva na dva" samo za Žandar u četvoro — inače „u troje" / „u četvoro" (ranije je i Žandar za 3 igrača bio „dva na dva"). **Nije urađeno:** OG pregled linka u Viberu/WhatsAppu (`app/layout.tsx`) je i dalje „Žandar online" za svaki sto — `/room/[roomId]` je klijentska ruta bez `generateMetadata`, pa bi pregled po igri tražio serverski dohvat sobe; zasebna odluka.

**B3 — poslije „Napusti partiju" ostali su 2 min gledali pauzu bez izlaza.** Tekst pauze je obećavao glasanje, a glasanje se otvaralo tek kad istekne `PAUSE_MS`. Komentar u `pause.ts` je već tvrdio „ostali odmah dobiju pauzu i glasanje". Sad `afterLeave` vraća `vote` / `next_hand_then_vote` (bilo `pause` / `next_hand_then_pause`), a Žandar (`enterVote`) i Raub (`this.vote`) odmah otvaraju glasanje. Pukla veza je netaknuta (grace → pauza → glasanje). Tekst pauze više ne obećava dugme: „…Ako se ne vrati do isteka vremena, glasate o prekidu."; glasanje poslije izlaska kaže „X više nije za stolom. Odluči hoćeš li čekati ili prekinuti partiju." (`voteBodyLeft`). Poker se ne mijenja — izlazak tamo samo oslobađa mjesto.

**Zamka (otkrivena usput, nije dirana):** u Raubu se igrač koji je *namjerno* izašao ne može vratiti (`RaubTables.onSubscribe` preskače `left`), a list „Napusti partiju?" svima kaže „Vratiti se možeš preko linka stola". Za Raub je i „Čekaj" u glasanju slijepa ulica (produži pauzu pa ponovo glasanje). Zato tekst glasanja ne obećava povratak.

**Provjera:** server 254/254 (izmijenjeni `afterLeave` testovi + Raub „izlazak → glasanje → prekini = abandoned"), web 209/209 (nove provjere poruka i `metaFor`), typecheck, lint = osnovica. E2E lokalno (server + `next dev` iz worktree-a, headless Chrome, dva igrača): Raub lobi i pozivnica „partiju Rauba · od 21 do 0"; poslije izlaska gosta host vidi glasanje za 0,3 s i u Raubu i u Žandaru, „Prekini" → „Partija je prekinuta". Nije provjereno na uređaju ni na stagingu.

## 146. Izdanje 1.4.0 — Poker, Raub i „Pošalji utisak" (2026-11-09, `c1d1b22` → `main` → `production`)

**Web i server:** `production` fast-forward na `c1d1b22` (36 commita od `ff9cd91`: Poker, Raub, nova početna-lista, „Pošalji utisak", QA 2026-11-09 B1–B3). Staging prije toga provjeren u pregledaču (Raub lobi i pozivnica „partiju Rauba · od 21 do 0", izlazak → glasanje za 0,3 s u Raubu i Žandaru). Produkcija: `/health` → `production`, kartaonica.com 200, nova početna sa „Piši nam". **Poker i Raub na webu još stoje kao „Uskoro":** prekidači `NEXT_PUBLIC_POKER` / `NEXT_PUBLIC_RAUB` se upisuju na Vercel projekat `zandar` (produkcija), pa Redeploy — `NEXT_PUBLIC_*` se peče u build. Bez `RESEND_API_KEY`/`FEEDBACK_TO` na produkcijskom Railwayu utisci idu samo na disk.

**Aplikacija:** 1.4.0 (`versionCode 7`), odluka vlasnika: Poker i Raub u paketu. Prekidači su upisani u `TARGETS.prod` (`build-mobile.mjs`) umjesto u shell, pa build ispisuje `NEXT_PUBLIC_POKER=1` / `NEXT_PUBLIC_RAUB=1` i paket je ponovljiv. AAB iz `zandar-apk` @ `c1d1b22`: potpisan upload ključem (`EA:71:38:…:13:0F`), `appEnv:"production"` i `flag:"1"` za obje igre potvrđeni u JS-u iz paketa, push uključen. 1.3.1 (`versionCode 6`) nikad nije poslata — 1.4.0 je nosi.

**Prije slanja na pregled (Play Console):** IARC upitnik — simulirano kockanje (poker, žetoni bez vrijednosti); ciljna publika bez djece; Data safety dopuniti za „Pošalji utisak" (poruke, slike koje korisnik priloži, opciona e-adresa, model uređaja i verzija; opciono, ne dijeli se, brisanje na zahtjev, istek 12 mj.). **Nije provjereno na uređaju** — preporuka: interno testiranje pa produkcija.
## 147. Početna — hero + redovi umjesto tri iste kartice (2026-11-09, `feat/home-list-k2`)

**Zašto:** lista iz unosa 123 je imala tri iste kartice sa po dva dugmeta. Nije bilo hijerarhije, na ekranu je stajalo šest dugmadi, „Napravi sto" se lomio u dva reda, oznaka NOVO je dirala naslov, a vrh ekrana je bio prazan. Vlasnik je tražio atraktivniji izgled, bez Claude Design table.

**Šta:**
- **Hero kartica** (prva igra, redoslijed i dalje daje `homeLayout`: zakačena → zadnje igrana → Žandar):
  - Slika u boji igre sa toplom „lampom" (mesingani radial odozgo).
  - Lepeza od tri karte gore desno, srednja izlazi preko gornje ivice slike.
  - Oznaka je pilula IZNAD imena, ime je 34 px.
  - Igraj (mesingani prelaz i jednokratan odsjaj pri ulazu) + „Napravi sto" sa ikonom, u jednom redu.
- **Ostale igre su redovi od 76 px:** mala slika sa kartama, ime + oznaka pored, opis, okrugla dugmad Napravi sto (ikona) i Igraj (strelica), 48 px. Imena radnji nose `aria-label` (isti tekst kao ranije).
- **Pozdrav iznad liste:** „Zdravo, {ime}" / „Za koji sto sjedaš?". Ime dolazi iz `usePlayerName` (server snapshot `null`, pa nema hydration mismatcha). Bez imena stoji samo pitanje. Pozdrav po dobu dana je namjerno izostavljen: sat servera i klijenta se razlikuje, a to bi dalo mismatch.
- **Ulaz:** stavke stižu redom (opacity + translateY), a lepeza se raširi. Sve je na `--t-*` tokenima (kolapsira pod reduced-motion), a odsjaj je pod reduced-motion ugašen.
- `sr.home.listSub`: ispred „·" stoji neprelomni razmak, pa pri lomljenju tačka ostaje na kraju prvog reda. Opisi imaju `text-wrap: balance`.
- Harness: `/dev/home?live=3&name=Igor`.

**Zamke:**
- Headless Chrome sa `--window-size=360,…` ne daje viewport od 360 px (prozor ima najmanju širinu), pa snimak izgleda kao da sadržaj prelijeva. Mjeri se samo kroz CDP `Emulation.setDeviceMetricsOverride`.
- Lepeza dolje desno je sjekla opis: rotirana karta J izlazi lijevo van svoje kutije. Mjerenje kutija je bilo čisto, a greška se vidjela tek okom na snimku. Rješenje je lepeza gore desno, a tekst dolje lijevo.
- `sed` sa ` ` u Git Bashu je pojeo backslash (`00a0` u stringu). Takve izmjene idu kroz Edit.

**Provjereno:**
- CDP snimci 360×740 (3 igre, ime), 390×844 (3 igre, bez pravnog reda), 360×740 (2 igre, zadnje igran poker) i 360×640 (zakačen poker + greška traženja). Nigdje nema horizontalnog ni vertikalnog skrola, sve je iznad trake, dugmad su ≥ 48 px, a NOVO ne dira naslov.
- Web testovi 180, typecheck, lint = osnovica (5/2).

**Nije provjereno na uređaju.**

## 148. Poker — negativno trajanje leta rušilo aplikaciju (2026-11-14, `9111038` → `production` + `main`)

**Šta:** produkcijska aplikacija 1.4.0 je dva puta pala na „Application error: a client-side exception has occurred" (bijel ekran, samo jedna poleđina karte). Sentry (`zandar-web`, production, 2026-11-13 20:58 UTC, `/room?id=…`):
`TypeError: Failed to execute 'animate' on 'Element': duration must be non-negative or auto` u `runGhost` ← `pokerFly.ts` (fold) ← `usePokerBeat`.

**Uzrok:** let karata kod odustajanja traje `stepMs - 140` (pot pobjedniku `stepMs - 150`). `usePokerBeat` sabija korake kad priča kasni za satom servera (`MIN_SCALE` 0,25) ili kad je tab u pozadini (0,01), pa korak padne ispod 140 ms i trajanje postane negativno. `animate()` baca iz React efekta i `global-error` obori cijelu aplikaciju. Duh je već bio na `body`-ju, otud usamljena poleđina na snimku.

**Popravka:**
- `runGhost` svodi trajanje i kašnjenje na ≥ 0 (`nonNegativeMs`), a ako `animate` ipak baci, duh se ukloni. Štiti i Žandar.
- `runPokerFx` guta grešku: efekat je ukras.
- `flyAnimation.test.ts` ponavlja slučaj iz Sentryja lažnim duhom koji baca kao pregledač.

**Objava:** commit je napravljen direktno iznad `production` (`c1d1b22`) i spojen u `main`. Tako na produkciju nije otišao neobjavljeni redizajn početne (`29fe5f6`), a `production` ostaje tačka u istoriji `main`-a (`--ff-only`). **Aplikacija nije popravljena** dok ne izađe 1.4.1 (`versionCode 8`).

**Zamke:**
- Produkcijski APK ne piše konzolu u logcat. Na uređaju se vidi samo kada je aplikacija ubijena (`dumpsys activity exit-info`), a poruka greške postoji samo u Sentryju. Token iz `.env.sentry-build-plugin` nema pravo čitanja issue-a.
- Usput primijećeno: staging na hladnom startu početne baca React #418 (hidracija) i oporavi se. Nema `error.tsx` po rutama, pa svaka greška u renderu ruši cijelu aplikaciju bez puta nazad.

**Provjereno:** web testovi 213/213, typecheck. Nije provjereno na uređaju.

## 149. Nova slika za dijeljenje linka — „Ko je za jednu?" (2026-11-14)

**Šta:** preview linka (WhatsApp, Viber, Facebook) za `kartaonica.com` i pozivnice `/room/…` pokazivao je staru zelenu sliku „Žandar — Igraj sa prijateljima online" i naslov „Žandar online", iako pozivnica već zove i na Raub. Sad je slika Play grafika „Ko je za jednu? Žandar • Raub • Poker", naslov „Kartaonica — Žandar, Raub, Poker".

**Kako:** jedini izvor OG tagova je `metadata.openGraph` u `app/layout.tsx` (sobe nemaju svoj `generateMetadata`). Original (1774×887 PNG, 2,7 MB) stoji lokalno u `apps/web/store-assets/` (ignorisano u gitu); u `public/og-share.jpg` je verzija 1200×630 (cover crop, ~30 px po bočnoj ivici), JPEG ~127 KB. `og-image.png` obrisan. `<title>` stranice nije diran.

**Zamke:**
- **Novo ime fajla je namjerno:** WhatsApp/Facebook keširaju preview po URL-u slike — sa istim imenom stari bi ostao danima. Linkovi već poslati u nekom chatu zadržavaju stari preview; testira se novim linkom.
- WhatsApp ne prikazuje sliku ako je prevelika (orijentaciono > 300 KB), zato JPEG, ne original PNG.

**Objava:** commit direktno iznad `production` (kao 148), pa spojen u `main` — da na produkciju ne ode neobjavljeni redizajn početne. Aplikaciji ne treba ništa: preview pravi web (pozivnice su `kartaonica.com/room/…` linkovi), a `og-share.jpg` ulazi u sljedeći paket sam od sebe.

## 150. Poker — button ide u smjeru kazaljke (2026-11-14, `fix/poker-seat-order`)

**Prijava igrača:** rotacija dealera ne ide kao kazaljka na satu.

**Uzrok (dva):**
- Motor na startu meča nasumično miješa mjesta (`seatNo`), a button, blindovi i potezi idu `seatNo + 1`. Ekran je crtao igrače po `seatIndex`-u iz lobija (`arrangeSeats(state.players)`), pa za 3–4 igrača button skače preko stola. `/dev/poker` to nije pokazivao jer tamo je `seatIndex === seatNo`.
- I kad se redovi poklope, `arrangeSeats` stavlja sljedećeg igrača DESNO (dole → desno → gore → lijevo), a to je smjer suprotan kazaljci. Poker-spec traži „lijevo od buttona".

**Popravka:** `arrangePokerSeats` u `lib/pokerView.ts` raspoređuje po `seatNo` iz pogleda meča i zamjenjuje lijevu i desnu stranu, pa je sljedeći igrač lijevo. Motor i server su netaknuti, a snapshot se nije mijenjao. Žandar (`GameScreen`) i dalje koristi `arrangeSeats` bez izmjene.

**Provjereno:** 5 novih testova (raspored po mjestima iz meča, put buttona dole → lijevo → gore → desno, 3P, 2P, igrač bez mjesta u meču), web testovi 218, typecheck, lint na izmijenjenim fajlovima. **Nije provjereno na uređaju.**

## 151. Raub — pravila po feedbacku igrača: Raub samo na A/K/O/U, „Moja”, Štih nije obavezan (2026-11-14, `feat/raub-rules-v2`)

**Šta (odluka 13 u `docs/raub-spec.md`, svjesna promjena pravila po odluci vlasnika):**
- „Raub” je dozvoljen samo kad je okrenuta karta A, K, Q (O) ili J (U). I dalje nije obavezan i nosilac mora 2 štiha.
- Nova izjava „Moja”: igrač sa sedmicom boje okrenute karte je daje za tu kartu, nosi adut i mora 2 štiha. Kazne su iste kao kod Rauba.
  - Raub, Moja i Dalje idu u istom krugu, a adut nosi prvi koji se javi.
  - Na 10, 9 i 8 adut se može uzeti samo „Mojom”.
- Sedmica na talonu više nije automatska. Djelilac bira „Štih” (mora 1) ili „Dalje”, pa se odmah okreće nova karta, koja se broji u 3 okretanja prije refe.
- Raub naslijepo je uklonjen. Djelilac vidi karte odmah.

**Kako:**
- Pravila su parametri u `RaubRules`: `raubRanks`, `stihOptional`, `mojaRequiredTricks`. Opcioni su, pa stari snapshot dobija podrazumijevane vrijednosti (`rulesV2` u `match.ts`).
- Novi korak `seven_choice`, akcija `stih {take}` i bid `moja`. Izvučeni su `swapSeven` i `flipNext`.
- Pogled igrača na potezu nosi `bidOptions`, pa UI crta samo dugmad koja server prima (HARD RULE 1).
- `upgradeRaubState` (poziva ga `RaubTables.rearm`) prevodi ruku zatečenu u `await_open` u licitaciju.
- Bot: Štih po snazi uz šum. Kod licitacije kaže Raub ili Moja, šta je dozvoljeno, po istoj procjeni snage.
- **Stari klijenti:** `clientSupportsGame` za Raub traži i `"raub:2"` (`GAME_PROTOCOL`). APK 1.4.0 zna Raub, ali ne i nove korake, pa dobija „Za ovu igru ažuriraj aplikaciju.”, a ne sto na kojem ne može odigrati sedmicu ni Moju. Web se deploya zajedno sa serverom.
- UI: panel sedmice (Štih / Dalje), licitacija sa „Moja · daješ 7…”, natpisi „Moja”, oznake „Štih · mora 1” i „Moja · mora 2”, pravila u `RaubRules`, dev stanja `sevenChoice`, `bidLow`, `bidNone` i `moja`.

**Mjerenja (simulacija botova, staro → novo):**

| Igrača | Refa | Trajanje (medijan) |
|---|---|---|
| 2 | 13,6 % → 30,2 % | 7,6 → 7,0 min |
| 3 | 5,5 % → 18,6 % | 17,6 → 15,9 min |
| 4 | 2,2 % → 11,7 % | 34,1 → 31,1 min |

- Uzorci: staro 2.000 mečeva, novo 10.000.
- Bez greške u kartama i štihovima, bez odbijenih akcija.
- Refa raste jer na 10, 9 i 8 adut uzima samo igrač sa sedmicom te boje. Kod 2 igrača je iznad praga od 20 % iz speca. Odluka o tome je na vlasniku, pragovi bota nisu dirani.

**Zamke:**
- Serverski anti-leak test je povremeno padao. Botovi igraju dok test čita stanje, pa karta koja je u snimku bila javna (talon, „Moja”) završi u ruci bota. Javne karte su isključene iz provjere.
- Upute iznad dugmadi su jedan red (`max-content`). Duže rečenice se sijeku na 360 px, pa su skraćene.

**Provjereno:**
- game-core Raub 56 testova, server 255, web 215. Typecheck je čist.
- CDP snimci 360×740 i 360×640: `sevenChoice`, `bid`, `bidLow`, `bidNone`, `moja`.
- **Nije provjereno na uređaju.**

## 152. Početna — redizajn iz 147 vraćen, ostaje dosadašnja (2026-11-14)

**Šta:** vlasnik zasad ne želi novu početnu (hero + redovi, changelog 147). Na `main`-u je vraćena verzija koja je na produkciji: tri kartice igara, svaka sa „Igraj” i „Napravi sto”. Vraćeni su `29fe5f6` i popravka opisa ispod lepeze `513007d`, koja je važila samo za novi izgled. Fajlovi početne (`home.css`, `GameList.tsx`, `HomeScreen.tsx`, `app/page.tsx`, `/dev/home`) su bajt-za-bajt kao na `production`. `sr.ts` se razlikuje samo po Raub tekstovima (changelog 151).

**Zašto ovako:** redizajn nije bio na produkciji, a prije objave je trebalo sve sa `main`-a da ide dalje. Kod je ostao u istoriji (`29fe5f6`, grana `feat/home-list-k2`) za kad se vlasnik predomisli.

## 153. Raub — prave mađarice umjesto AI lica (2026-11-14, `feat/raub-real-cards`)

**Povod:** vlasnik nije bio zadovoljan AI mađaricama (changelog 137) i nabavio je pravi špil (šema „Vilijam Tel", natpisi „Dečko Herc", „Dama Pik", asovi su godišnja doba). Mijenja se samo lice; poleđina ostaje stara.

**Izvor:** 8 skenova A4 na 600 dpi, JPG, crna podloga, 4 karte po skenu (`Desktop/Kartaonica/Madjarice karte`, NIJE u repou). Obrađeni masteri 960×1508 sa alfom su u `…/Madjarice karte/obradjeno/`.

**Alat** (`apps/web/scripts/raub-scan/`, Python + OpenCV, jednokratno; venv sa `opencv-python-headless numpy pillow`):
- `detect.py` — prag na crnoj podlozi → kontura → `minAreaRect` → perspektivno ispravljanje, uspravno. Na svih 8 skenova našao tačno 32 karte, nijedna ne dodiruje ivicu; mjere 1497–1506 × 2341–2351 px.
- `process.py` — 12 px odsječeno sa svake ivice (sjenka skenera uz rub), boja papira se čita iz bočnih margina (medijana svjetlijih 60%, bez prašine i okvirne linije; izmjereno 235–239) i skalira po kanalu na 250, maska ugla 7.5% širine (prava karta: dijagonala do papira 36 px ≈ r 123 px ≈ 8.2%, poslije odsijecanja ~7.6%). Izlaz 240×377 webp (q85) — 32 lica ≈ 790 KB (AI lica su bila ~530 KB). Ikonice boje (96 px) su znak iz gornjeg lijevog ugla DAME (jedini znak bez figure), najveća komponenta „mastila" po udaljenosti od papira.
- Preslikavanje: Dečko → `unter` (J/U), Dama → `ober` (Q/O), godišnje doba → `ace`; bunda/tikva → `bells`. Mapa po fajlu skena je u `process.py`.

**Odnos karte:** prava karta je 1.571, a sve karte u aplikaciji 1.417. Izabrano: ista VISINA, karta ~10% uža — `.card[data-deck="hungarian"] { width: calc(var(--card-h) / 1.571) }` + radijus po stvarnoj širini. Visina se ne dira jer je budžet visine Rauba izmjeren na njoj. Odbačeno: razvlačenje (lica 10% šira), sječenje gore/dole (pada tačno na okvirnu liniju). Pravilo važi i za `CardBack` (isti `data-deck`), pa se stara poleđina 1.417 crta suženo — šara to podnosi.

**`build-raub-cards.mjs`** sveden na poleđinu, da ponovno pokretanje ne vrati AI lica.

**Provjereno:** headless Chrome 390×844 `/dev/raub?s=bid|trick|exchangeOpen|seven` i x3 snimak ruke i talona. **Nije provjereno na uređaju.**

**Dopuna (isti dan):** na S10e staging APK je i poslije instalacije crtao STARA lica. Uzrok: `public/sw.js` drži `.webp` cache-first zauvijek pod `zandar-static-v1`, a nova lica imaju ista imena. Isto bi pogodilo svaki pregledač koji je već otvorio Raub. Verzija keša podignuta na `v2` (`activate` briše stari). Pravilo za ubuduće: promjena sadržaja statike pod istim imenom = podići `CACHE` u `sw.js`.

## 154. Raub — „Raub” uzima kartu s talona, sedmica nije potrebna (2026-11-14, `feat/raub-take-talon`)

**Šta (odluka 14 u `docs/raub-spec.md`, svjesna promjena pravila po odluci vlasnika):** ko kaže „Raub” na A, K, Q (O) ili J (U), uzima tu kartu u ruku i odbacuje jednu (ne uzetu). Do sada je kartu dobijao samo ako je imao sedmicu te boje i pristao na zamjenu. Inače je karta ostajala na talonu, pa je za stolom izgledalo kao da je igrač raubovao, a karte kasnije nije bilo.

**Prvo provjereno da nije kvar u motoru:** simulacija od 4.500 mečeva (2–4 igrača, botovi i istek roka) je pratila svaku kartu uzetu s talona (sedmica, raub naslijepo, zamjena sedmice). Uzeta karta je uvijek ostajala u ruci uzimaoca i on ju je odigrao, 0 grešaka. Uzrok je bilo pravilo iz speca v1.1, scenarij 3.

**Kako:**
- `match.ts`, grana `bid: "raub"`: `takeTalon` + `toDiscardExtra`, isti put kao Štih. Poslije odbacivanja `afterTrump` (Idem / Ne idem).
- Korak `swap_seven` se više ne pravi, ali akcija ostaje za ruke hidrirane iz starog snapshota (deploy = restart). Nema promjene oblika stanja ni protokola, jer `raub:2` još nije objavljen, nego ide zajedno sa odlukom 13.
- Bot i istek roka već znaju odbacivanje viška (najslabija karta koja nije adut ni karta s talona).
- `RaubRules.tsx`: tekst za Raub i za višak.

**Mjerenja:** simulacija 10.000 mečeva × 4 igrača, prije → poslije: refa 11,7 → 11,8 %, medijan 31,1 → 30,2 min (nosilac ima jaču ruku). Bez greške u kartama i štihovima, bez odbijenih akcija. Provjera talon karte na novom kodu: nijedna raubovana karta ne ostaje na talonu, a svaku uzetu kartu odigra uzimalac.

**Provjereno:** game-core 384 testa (Raub 58, dva nova), server 255, web, typecheck. **Nije provjereno na uređaju.**

## 155. Raub — štih staje u sto, bodovi 16 px, tvoje sjedište niže u štihovima (2026-11-14, `fix/raub-trick-fit`)

**Prijava (vlasnik, S10e):** moj avatar prekriva moju kartu u štihu, a gornji igrač svoju. Uz to: broj bodova može biti sitniji, a ja i gornji igrač se možemo odmaknuti.

**Uzrok:** `33ae967` je štihu dao fiksnih 4.5rem (72 px, visina ~102 px), pa je krst visok ~208 px. Sto na S10e (360×760, kamera 39 px) je imao 166 px. Uz to Raub je nasljeđivao Žandarove `--stage-partner-h`/`--stage-seat-h` (6rem), iako ima red bodova više. Sjedišta su bila 105–113 px, pa je sto već „posuđivao" 10–17 px ispod njih. Sjedišta su `z-20` iznad stola, zato avatar pokriva kartu. Isto (i gore) je važilo na 360×640.

**Izmjena (samo Raub, `felt.css` + `data-tricks` na `.felt-stage`):**
- `.rb-table` je `container-type: size`, a `.rb-trick` računa kartu kao `min(4.5rem, 100cqh / 2.9)`. Krst je 2.04 × visina = 2.9 × širina. Gornja granica je ista kao ranije: 4.5rem, odnosno 3.85rem ispod 700 px visine.
- Bodovi na sjedištu su 16 px umjesto 20, pa je pilula 19.2 umjesto 23.2 px.
- Visine sjedišta su izmjerene i upisane posebno za Raub: 6.25/6.85rem (360×760), 5.75/6.35rem (≤700 px), 6.8/7.35rem (≥48rem).
- U štihovima traka nad rukom je 2.75rem umjesto 4.6rem, jer nosi samo „Ti si na potezu". Tvoje sjedište se spušta ~30 px, a sto raste. `--rim-bottom` ostaje na visini iz licitacije, da se podloga ne preskalira na početku štihova. Posljedica: u štihovima tvoj avatar stoji ispod oboda, ne na njemu.

**Mjereno (CDP, `/dev/raub?s=trick|bid|declarer`):**

| | sto u štihu | karta štiha | preklop sa sjedištem |
|---|---|---|---|
| S10e prije | 166 px | 72 px (krst 208) | gornja ulazi ~20 px pod bodove |
| S10e poslije | 178 px | 61 px nominalno (mađarica 55 × 87) | 0 (6 px gore, 12 px dole) |
| 360×640 poslije | 156 px | 54 nominalno | 0 |
| 390×844 / 412×915 / 800×900 | 301 / 372 / 332 | 72 (neizmijenjeno) | 0 |

Talon u licitaciji staje u novu (tačnu) kutiju na svim veličinama.

**Provjereno:** typecheck, web 220/220, lint = osnovica. **Nije provjereno na uređaju.**

## 156. Raub — „Raub” smije samo djelilac, „Moja” i bez sedmice (2026-11-14, `feat/raub-dealer-only`)

**Šta (odluka 15 u `docs/raub-spec.md`, svjesna promjena pravila po odluci vlasnika):** vlasnik je u testiranju dobio ponudu „Raub · moraš 2 štiha” iako nije djelilac. Pravilo: „Raub” (A, K, O, U) smije reći samo djelilac. Ostali u licitaciji kažu „Moja” ili „Dalje”, na svaku kartu, a djelilac smije i „Moja”. „Moja” više ne traži sedmicu. Sa sedmicom te boje igrač je daje i uzima kartu s talona, kao do sada. Bez nje boja postaje adut, a karta ostaje na talonu. Nosilac mora 2 u oba slučaja.

**Kako:**
- `RaubRules.raubDealerOnly` / `mojaNeedsSeven` (opciono; stari snapshot bez njih dobija novo pravilo kroz `rulesV2`). `raubCanRaub(state, playerId)` sada zna igrača, a `raubHasSeven` je izdvojen. Grana „moja” radi `swapSeven` samo uz sedmicu.
- Bot: snaga se računa po opciji (`strengthFor(..., "add" | "swap" | "none")`). Kod Rauba se karta s talona dodaje, kod Moje sa sedmicom mijenja sedmicu, a kod Moje bez sedmice se ne računa.
- Web: dugme „Moja” kad god server dozvoli. Napomena je „daješ 7♥” ili „karta ostaje · moraš 2”. Tabela rezultata za ruku sa „Moja” više ne piše „Raub”. `RaubRules.tsx` je ažuriran.

**Mjerenja:** simulacija 10.000 mečeva (`simulate:raub`, seed 1). Refa je 2 igrača 5,6 % (bilo 30,2 %), 3 igrača 2,6 % (18,6 %), 4 igrača 1,2 % (11,8 %). Trajanje 4 igrača: medijan 32,8 min (30,2), p90 48,4. Nema greške u kartama ni štihovima, odbijenih akcija ni zaglavljenih mečeva. Refa je pala jer „Moja” sada može reći svako.

**Dopuna — „Raub” samo na prvoj okrenutoj karti:** vlasnik je na „Karta 2 od 3” (Dama) kao djelilac dobio ponudu „Raub · moraš 2 štiha”. Pravilo: Raub postoji samo na prvoj okrenutoj karti; na drugoj i trećoj ni djelilac nema Raub, nego „Moja” (sa sedmicom uzima kartu, bez nje karta ostaje na talonu) ili „Dalje”. Ako je prva karta sedmica i djelilac kaže „Dalje”, sljedeća je već druga. `RaubRules.raubFirstFlipOnly` (opciono, bez polja = da), provjera u `raubCanRaub` (`talonFlips > 1`), pa je i server i `bidOptions` i bot dobijaju bez druge izmjene. Četiri nova testa (druga karta, sedmica pa Dalje, parametar isključen, stari snapshot), postojeći test treće karte prelazi na „Moja”. Simulacija 10.000 mečeva (seed 1) sa dopunom: refa 2 igrača 10,8 %, 3 igrača 4,9 %, 4 igrača 2,2 %; trajanje 4 igrača medijan 32,4 min, p90 48,0; bez grešaka, odbijenih akcija i zaglavljenih mečeva. Provjereno: game-core 391, server 255, web 220, typecheck. **Nije provjereno na uređaju.**

**Provjereno:** game-core 387 (tri nova testa za odluku 15; testovi zamjene, štihova i bodovanja sada rauba djelilac), server 255, web 215, typecheck. **Nije provjereno na uređaju ni u pregledaču.**

## 157. Raub — karta leti od igrača, sporije kupljenje, izvlačenje s talona (2026-11-14, `feat/raub-card-motion`)

**Zašto:** feedback sa stola — kad drugi bacaju karte, karta se samo pojavi u štihu (`rb-play` je bio goli fade). Kupljenje se vidi, ali je prebrzo. Prva karta koju djelilac okrene s talona je „već tu" čim se uđe za sto (200 ms scaleX na mjestu), pa igrači ne primijete da se nešto desilo.

**Kako (samo klijent):**
- **Bacanje:** svaka karta polazi sa ivice stola na kojoj sjedi igrač (`--fly-x/-y` u `cqw/cqh` od `.rb-table`, kontejnera iz 155: lijevo/desno ±60cqw, gore −60cqh, ja +70cqh iz ruke). `rb-play` animira individualna svojstva `translate`/`scale` + `opacity`, pa se slaže sa `transform`-om koji drži položaj i nagib po smjeru — jedan keyframe za sva četiri smjera. Trajanje `--t-card-play × 1,4` (≈365 ms).
- **Kupljenje 20 % sporije:** `--t-card-collect × 1,2` (320 → 384 ms) samo za Raub; `TRICK_COLLECT_MS` 350 → 420 da štih ne nestane prije kraja pokreta. Žandarov token netaknut.
- **Talon:** `TalonPile` izmjeri razliku centara špila i nove karte (`--draw-x/-y`), karta krene sa špila licem nadolje (sloj `CardBack` nestaje tačno na pola okreta), klizne na mjesto i okrene se. Prva karta ruke: 400 ms zadrške + 1 s pokret; kasnije okrenute karte 600 ms bez zadrške; uzeta karta (`data-static`) se ne animira. Novi tokeni `--t-rb-draw*` kolapsiraju pod reduced-motion.

**Zamka:** mjerenje u `useLayoutEffect` se pod StrictMode-om izvrši dvaput, a drugi put vidi kartu već pomjerenu na špil (animacija čita `--draw-x`) → upisao bi 0. Zato se varijable skinu prije mjerenja. Uz to: ako je sto u prvom kadru neraspoređen (rect 0), mjeri se ponovo u sljedećem kadru.

**Provjereno:** CDP na `/dev/raub?s=bid` i `?s=trick` (360×640): talon karta kreće sa špila (−72 px), klizi do ~800 ms, okret ~1,0–1,3 s, poleđina nestaje na pola; karte štiha kreću od svog igrača (desno +130 px, gore −86 px) i stignu za ~350 ms; pod reduced-motion sve odmah na mjestu. Web 220 testova, typecheck, lint = osnovica (5/2). **Nije provjereno na uređaju** — tempo ocijeniti okom.

## 158. Raub — panel nad rukom centriran (2026-11-14, `fix/raub-panel-center`)

**Šta:** vlasnik je na telefonu primijetio da su dugmad „Ne idem / Idem” pomjerena ulijevo. `.rb-panel-slot` je imao 0,75rem lijevo i 3,6rem desno (rezerva za dugme reakcija), pa je centrirana bila samo traka „Ti si na potezu” / „Čeka se”, koja je već imala izuzetak. Sada je rezerva od 3,6rem sa obje strane za sve panele (licitacija, sedmica, višak, Idem, zamjena), a izuzetak je uklonjen.

**Mjereno (CDP, `/dev/raub?n=4`):** na 360×740, 360×640 i 412×915 panel je 58 px od lijeve i 58 px od desne ivice. Dugme reakcija (x ≥ 312 na 360) ostaje van panela. Cijena: na 360 px dugmad licitacije su 76 px (Dalje / Moja / Raub), a „moraš 2 štiha” ispod „Raub” ide u dva reda. Dva dugmeta (Idem) su 118 px.

**Provjereno:** samo CSS; snimci okom na 360×640 i 360×740. **Nije provjereno na uređaju.**

## 159. Raub — dugme „Moja” bez napomene kad igrač nema sedmicu (2026-11-14, `fix/raub-moja-note`)

**Šta:** vlasnik ne želi tekst „karta ostaje · moraš 2” ispod „Moja”. Bez sedmice dugme sada nosi samo „Moja”. Sa sedmicom napomena „daješ 7♥” ostaje. `sr.raub.bidNote.mojaNoSeven` je obrisan, a spec je usklađen.

**Provjereno:** typecheck, web testovi. **Nije provjereno na uređaju.**

## 160. Raub — djelilac na kartu za Raub bira samo Raub ili Dalje (2026-11-14, `fix/raub-dealer-no-moja`)

**Šta (odluka 16 u `docs/raub-spec.md`, po odluci vlasnika):** na stagingu je djeliocu na prvu kartu A, K, O ili U bila ponuđena i „Moja”, uz „Raub” i „Dalje”. Pravilo je da djelilac tada bira samo „Raub” ili „Dalje”, i to i kad ima sedmicu te boje. Ostali igrači u tom krugu i dalje smiju „Moja” ili „Dalje”.

**Kako:** `raubCanMoja` vraća `false` kad isti igrač smije „Raub”, a uslov stoji iza parametra `RaubRules.dealerRaubOrPass` (opciono, podrazumijevano da, pa stari snapshot dobija novo pravilo). Bot i klijent već prate `bidOptions`, pa ih nije trebalo mijenjati. Ažurirani su tekst u pravilima igre i spec.

**Provjereno:** game-core 392 (test za odluku 16 i test parametra), server, web, typecheck. **Nije provjereno na uređaju.**

## 161. Raub — bot-djelilac na asu uvijek raubuje, odluka za 1–8 s (2026-11-14, `feat/raub-bot-ace`)

**Šta (odluka 17 u `docs/raub-spec.md`, po odluci vlasnika):** bot-djelilac je na prvoj karti as ponekad govorio „Dalje”. Uzrok: licitacija je i za Raub tražila 2 aduta (as s talona se računa) ili jak adut + as sa strane, uz šum `noiseP`; djelilac sa asom na talonu i bez drugog aduta ili asa sa strane je propuštao. Sad djelilac na asu uvijek kaže „Raub” (`RaubBotConfig.alwaysRaubRanks`, podrazumijevano `["A"]`; K, O, U i dalje kroz procjenu ruke).

**Vrijeme:** odluka djelioca na prvoj karti na koju smije „Raub” — i Raub i Dalje, da brzina ne oda kartu — sad je 1–8 s od okretanja karte, uniformno nasumično (`raubThinkMinMs`/`raubThinkMaxMs`). `raubBotThinkMs` dobija opcioni `view`; server (`raub/table.ts` → `route`) ga prosljeđuje. Ostale bot odluke ostaju 2,5–7 s. Sat poteza (25 s) i AFK netaknuti.

**Simulacija (10.000 mečeva × 4, seed 1), prije → poslije:** raub 81.841 → 88.460, moja 111.655 → 107.994, refa 2,2 % → 2,1 %, medijan trajanja 32,4 → 33,0 min; 0 grešaka u kartama i štihovima, 0 odbijenih akcija.

**Provjereno:** game-core 393 (novi test: svaki djelilac na asu raubuje, vremena u [1000, 8000] i raspon se koristi; ostalo 2,5–7 s), server 255, typecheck game-core i server. **Nije provjereno na stagingu.**

## 162. Raub — karta s talona leti nosiocu (2026-11-14, `fix/raub-take-fly`)

**Zašto:** vlasnik kaže da se za stolom ne vidi dovoljno jasno kad neko raubuje. Uzeta karta je ostajala na talonu sa sitnim natpisom „Uzima: Ivana”. Od ponuđenih ideja (pečat „RAUB!”, let karte, zvuk, isticanje nosioca) izabran je samo let karte.

**Šta:**
- Kad neko uzme kartu s talona (Raub, Štih, Moja sa sedmicom), karta odleti nosiocu. Traje 750 ms, na 40 % puta naraste 1,35 puta, pa se smanji na mjesto.
- Kod drugog igrača karta sleti u njegovu lepezu iznad avatara i tamo ostaje otvorena do štihova: zadnja karta lepeze, 1,35 puta veća, ispred poleđina, sa mesing rubom.
- Kod mene sleti na zaključanu kartu u ruci.
- Kod „Moja” sa sedmicom istovremeno sedmica odleti od nosioca na talon.
- Talon se poslije uzimanja prazni, pa ostaje samo špil. Natpis „Uzima: …” / „Uzimaš ti” je uklonjen.

**Kako:**
- `lib/raubFly.ts`: `snapshotTalonTop`, `flyCard`. Koristi `makeGhost`, a `faceArtOf` je sad izvezen iz `flyAnimation.ts`. Duh je na `document.body`. Cilj je sakriven dok duh ne sleti.
- `RaubScreen` mjeri vrh talona na svakom crtanju (`useLayoutEffect` bez zavisnosti), jer React kartu ukloni u istom commitu u kojem stigne uzimanje. Let se pokreće samo na prelaz `talonTakenBy` niko → igrač u sesiji: prvo crtanje i reconnect ne lete. Karta mora biti ista kao izmjerena (`data-card-id`).
- `PlayerSeat.shownCard` (opciono, Žandar i Poker netaknuti) crta zadnju kartu lepeze licem gore, sa sidrom `data-taken-card`.
- `TalonPile.taken` je sada `"gone" | "seven"`.
- `/dev/raub?then=raub|moja` pušta pravi korak poslije 1,5 s. Novi scenariji: `raubOther`, `mojaSevenOther`.

**Mjereno (CDP, headless Chrome, rAF unutar stranice):**
- Raub drugog igrača, 360×640: duh od talona (216, 230) do lepeze (330, 169), širina 45 → 61 (vrh) → 29 px, kraj na ~700 ms.
- Moj Raub, 360×740: duh sleti na zaključanu kartu u ruci.
- Moja sa sedmicom: dva leta istovremeno.
- Reduced-motion: bez leta, stanje odmah tačno.

**Zamke:**
- Profil headless Chrome-a je keširao stari CSS, pa je mjerenje pokazivalo 22 px umjesto 29. Svjež profil je pokazao ispravno.
- `taskkill /IM chrome.exe` bi ubio i vlasnikov Chrome (klasifikator ga je odbio). Gasi se samo vlastiti proces.

**Provjereno:** web testovi, typecheck, lint na izmijenjenim fajlovima. **Nije provjereno na uređaju** — tempo leta ocijeniti na telefonu.

## 163. Raub — karte u štihu ~20 % veće (2026-11-14, `fix/raub-trick-bigger`)

**Šta:** vlasnik (snimak sa S10e): karte u štihu su sitne. Veličinu je držala visina stola — krst bez preklapanja je visok 2,04 visine karte (`100cqh / 2.9`), a gornji i donji avatar ga ne puštaju dalje (popravka iz istog dana).

**Kako (`felt.css`, samo štih):** gornja i donja karta se sad preklapaju za trećinu visine (`-83%` / `-17%` umjesto `-102%` / `2%`), kao na pravom stolu — kasnija karta leži preko, a mađarice nose oznaku u oba ugla. Krst je 1,66 visine, pa je granica `100cqh / 2.4` (2,9 / 2,4 = 1,21×). Bočne karte su bliže (`-130%` / `30%`), uz novu granicu po širini `100cqw / 2.8`. Gornje granice +20 %: `--rb-trick-max` 4.5 → 5.4rem, nizak ekran 3.85 → 4.6rem. Talon i let karte u štih nisu dirani (let čita `cqh`/`cqw`, kupljenje je relativno).

**Izmjereno (CDP, `/dev/raub?s=trick`, četvrta karta dodata kloniranjem; širina lica karte):** 360×760 sa kamerom 39 px (S10e) 55 → 67 px (+21 %), 360×640 49 → 59 (+21 %), 390×844 65 → 75 (+16 %), 800×900 65 → 78 (+20 %). Razmak gornje karte do gornjeg sjedišta ≥ 2 px, donje do tvog avatara ≥ 13 px, bočne ≥ 28 px od bočnih igrača — nigdje ne ulaze pod avatare (prije je gornji razmak na S10e bio 0). **Zamka:** headless Chrome sa trajnim `--user-data-dir` je servirao stari CSS iz keša — mjerenje je izgledalo kao da izmjena ne djeluje; brisati profil ili `--disable-cache`.

**Nije provjereno na uređaju.**

## 164. Žandar — sve opcije nošenja vidljive odjednom (2026-11-15, `fix/chooser-wrap`)

**Šta:** QA 2026-11-15 B1 (Visoka). Kad karta nosi na više načina, traka izbora (`.table__chooser`) je bila `nowrap` + bočni skrol sa skrivenom trakom. Na 390×844 u 4P traka je široka 234 px, a tri grupe 407 px: druga odsječena („Z…"), treća nevidljiva, nikakav znak da se skrola — a igrač bira pod satom i prisilnim nošenjem.

**Kako (`felt.css`, samo traka izbora):** traka se prelama (`flex-wrap: wrap`, centrirano), skrol i skrivanje trake skrola uklonjeni, `:has(> :only-child)` više ne treba. Samo prelom nije bio dovoljan: sa riječju razloga („Isti rank"/„Zbir") svaka grupa je na uskoj traci uzimala cijeli red, pa su tri opcije bile traka od 199 px i sto od 12 karata se skrolovao 76 px. Zato je traka container (`chooser / inline-size`) i ispod 25rem sakriva riječ razloga (ostaje u `aria-label`-u grupe; grupu pokazuju karte), steže padding i spušta karte trake na 1.9rem. Desktop 4P (408 px) i šire trake zadržavaju riječ.

**Izmjereno (CDP, `/dev/game?chooser=1`, 360×640 / 360×760 / 390×844 / 600×900 / 1440×900 × 2P/4P × 4/9/12 karata, 2 i 3 opcije):** u svih 30 slučajeva sve grupe u JEDNOM redu, cijele i na ekranu, `scrollWidth == clientWidth`, bez sudara sa rukom, špilom i sjedištima. Visina trake 59 px na telefonu (bila 64), 64 px šire — sto ne gubi ništa. Najuži slučaj 360 px 4P (216 px): grupe 44/79/79 px. Pregledano i okom na snimcima 390×844 i 360×640 sa 12 karata.

**Nije provjereno na uređaju.**

## 165. Raub — brži botovi kad nijedan čovjek ne igra ruku (2026-11-15, `feat/raub-idle-pace`)

**Šta:** QA 2026-11-15 P5. Igrač koji kaže „Ne idem" gledao je 45–60 s kako botovi odigraju ruku, svaki potez 2,5–7 s (odluka 11). Vlasnik je izabrao da se ubrza SAMO taj slučaj (odluka 18 u `docs/raub-spec.md`): kad je svaki čovjek za stolom u ruci rekao „Ne idem", bot odlučuje za 0,8–2 s, i dalje nasumično po potezu (ne svi u istoj sekundi). Dok čovjek igra, tempo je isti (2,5–7 s; djelilac na Raub karti 1–8 s).

**Kako:** `RaubBotConfig.idleThinkMinMs/idleThinkMaxMs` (800/2000, config — HARD RULE 7); `raubBotThinkMs(config, rng, view, idle = false)`; čista `raubNoHumanInHand(state, humanIds)` u game-core (`going === false` za sve ljude; `null` u licitaciji = nije; sto bez ljudi = nije). Server (`raub/table.ts` `route()`) računa `idle` iz `room.players` (`!isBot`) i prosljeđuje ga. Ništa od toga ne ide klijentu (HARD RULE 3); oblik snapshota netaknut. Simulacija se ne mijenja — tamo su svi botovi.

**Provjereno:** game-core 398 testova (+5: idle raspon i `raubNoHumanInHand`), server 255, typecheck. **Nije provjereno na uređaju** ni u živoj partiji — tempo okom tek tamo.

## 166. Raub — zamjena: iz špila igraču leti onoliko karata koliko je tražio (2026-11-14, `feat/raub-exchange-fly`)

**Šta:**
- Kad igrač potvrdi zamjenu, iz špila poleti tačno onoliko karata koliko je tražio (poleđine, mađarica), jedna za drugom (razmak 120 ms, let 600 ms).
- Kod drugog igrača karte lete do sjedišta i tamo se smanje i nestanu (vidljive cijelim putem, blijede tek u zadnjih 20 %).
- Kod mene sleću u nove karte u ruci; nove karte su skrivene dok duh ne sleti.
- Ko je tražio 0 karata ili je rekao „Ne idem" ne dobija ništa.
- Prva zamjena sve 4 (server izvuče 5, jedna otvorena): leti 4 — onoliko koliko je traženo.

**Kako:**
- `lib/raubView.ts` `exchangeFlights(prev, next)` — čista odluka: samo prelaz `exchanged: null → N > 0` u istoj ruci. Odustali nisu u `exchangeOrder`, pa im `exchanged` ostaje `null`. Prvo crtanje, reconnect i nova ruka ne lete. +5 testova.
- `lib/raubFly.ts` `snapshotDeck` (`.rb-talon__deck`, ne `[data-deck]` koji nose i `.felt-stage` i `CardBack`; poleđina se čita sa prave `.card-back`) i `flyFromDeck` (`fill: both`, pa duhovi koji čekaju red stoje na špilu).
- `RaubScreen`: `useLayoutEffect` bez zavisnosti, izvor je PRETHODNI snimak špila — kad zadnji zamijeni, isti commit prelazi u štihove i špil nestaje.
- Server, game-core i snapshot netaknuti.
- `/dev/raub?s=exchange&then=exchange&ex=N` — zamjena teče sama, svakih 1,5 s jedan potez.

**Mjereno (CDP, headless Chrome 390×844, brojanje duhova u stranici):** ja 3 → 3 duha, Milica 2 → 2, Goga 1 (zadnja, prelaz u štihove) → 1, Marko „Ne ide" → 0.

**Zamka:** portovi 3217 i 3291 su držali `next dev` drugih sesija (`zandar-raub-trick*`) — prvo mjerenje je tiho gađalo tuđi server. Prije mjerenja provjeri `netstat` za port.

**Provjereno:** web testovi 225/225, typecheck, lint na izmijenjenim fajlovima. **Nije provjereno na uređaju.**

## 167. Server — otpornost i validacija ulaza (2026-11-15, `chore/p0-server-hardening-2`)

Prvi korak plana održavanja (pregled koda 2026-11-15, stavke P0 1, 2, 5, 6).

**Neuhvaćena odbijanja:**
- Ovi async tajmeri su se pokretali bez `.catch`:
  - Žandar: rok pauze (`onPauseDeadline`) i istek čekanja na povratak (tijelo izdvojeno u `onGraceExpired`);
  - Raub: rok prekida i istek čekanja;
  - Poker: istek čekanja (`leave`).
- Greška u broadcastu tu je postajala `unhandledRejection` → `shutdown(1)`, pa je padao server sa SVIM stolovima. Sad se greška loguje i ostaje na jednom stolu.
- Ostali `void` pozivi (`driveBotTurn`, `handleTurnTimeout`, `pushFriendCount`, `recordCompletedMatch`) već hvataju greške iznutra.

**Validacija (`src/input.ts`, testiran):**
- `parseDisplayName`: ne-string ili prazno → 400. Ranije je `displayName.trim()` na broju ili objektu bacao 500.
- Ime duže od 24 znaka se skraća (po code pointu), ne odbija. Polje imena u klijentu nema ograničenje, pa bi 400 slomio stare klijente.
- `parseRoomTargetScore`: `/api/rooms` prima samo 11 ili 21, kao `/api/invites` i brza igra; izostavljen cilj = 21, Poker i Raub = 21. Ranije je bilo koja vrijednost išla u `rulesConfig.targetScore`.
- Važi za `/api/rooms`, join-request i `/api/quickplay` (sve tri igre). Tipovi tijela su `unknown`.

**Perzistencija:**
- `persistRoom` je dodat poslije kick-a, reject-a i ulaska u javnu sobu koja još čeka. Ranije je restart vraćao izbačenog igrača za sto i odbijeni zahtjev u „pending".

**Uklonjeno:**
- Polje `inviteUrl` (hardkodiran `http://localhost:3000`) iz `/api/rooms` i `/api/invites`. Klijent ga nikad nije čitao (`inviteLink()`), pa stari APK-ovi nisu pogođeni.

**Usput:**
- Web `test` skripta je imala `lib/raubRelease` bez `.test.ts`. Sad je `lib/raubRelease.test.ts`.

**Provjereno:**
- game-core 21 fajl, server 262, web 222 testa; typecheck svih paketa.
- Curl na lokalnom serveru: ime 123/{} → 400, cilj 99 → 400, Raub sa ciljem 99 → 200, stari klijent 4/21 i bez cilja → 200, Raub i Poker brza igra → 200, ime od 40 znakova → 24.
- Ranija verzija na starom `main`-u: approve → reject → kick pa restart; izbačeni se ne vraća, zahtjev ostaje `rejected`.

## 168. Izdanje 1.4.1 — web, server i AAB (2026-11-15, `17f8b7e` → `main` → `production`)

**Ušlo** (26 commitova sa `main`-a + tri grane):
- Raub pravila v2 i prave mađarice (151–163), let pri zamjeni (166), brži botovi kad čovjek ne igra ruku (165).
- Poker button u smjeru kazaljke (150); vraćena dosadašnja početna (152).
- QA 15.11. B1, izbor nošenja (164); server P0 (167).

**Produkcija:**
- `git merge --ff-only` (provjereno `merge-base --is-ancestor`), push `6b0dfc7..17f8b7e`.
- Server novi kod nakon ~105 s; `/health` → `production`.
- Curl: cilj 99 → 400; stari klijent 4/21 i bez cilja → 200; Raub i Poker brza igra → 200; kartaonica.com 200.

**Staging:** isti commit, provjeren istom matricom prije produkcije.

**AAB 1.4.1 (`versionCode 8`):**
- Izgrađen iz čistog `zandar-apk` @ `17f8b7e` (`aab:prod`).
- U manifestu `1.4.1` / `com.kartaonica.zandar`, potpis `KARTAONI` (upload ključ).
- Nosi popravku pada pokera (148), koju aplikacija 1.4.0 nema.
- Native sloj od 1.4.0 je nepromijenjen (samo verzija), pa se Data safety i IARC ne diraju.
- **Živa na Play-u:** Submission 7 (Production, „Start full rollout") poslat 15.11.2026 u 8:35, objavljen (Published) 15.11.2026 u 8:48 — puno puštanje, ne postepeno.

**Zamka:**
- `apk:prod` izlazi kao `app-debug.apk` sa debug potpisom, pa se ne može instalirati preko 1.4.0 sa Play-a.
- Proba ažuriranja ide preko Play internog testa ili postepenog puštanja.

**Nije provjereno na uređaju** (S10e nije bio povezan): staging APK je izgrađen, a provjera je ostala vlasniku.

**Preostaje u dashboardima:**
- Vercel staging: `NEXT_PUBLIC_WEB_URL` (QA B12).
- Vercel, oba projekta: `NEXT_PUBLIC_POKER/RAUB=1` eksplicitno.
- Railway, oba servisa: `ADMIN_TOKEN`, `RESEND_API_KEY`, `FEEDBACK_*`.
- Railway produkcija: postavke iz `railway.json` u dashboard prije 1.12.2026.

## 169. Raub — zadnji upitani mora „Idem” (2026-11-15, `fix/raub-must-go`)

**Povod:** prijava igrača — u ruci su svi osim nosioca rekli „Ne idem”. Motor je to dozvoljavao namjerno (odluka 9: nosilac tada upisuje sva 4 štiha, −4). Vlasnik: barem jedan mora ići; pita se redom, pa ako su svi prije zadnjeg odustali, zadnji mora ići (odluka 19 u `docs/raub-spec.md`). U 2P protivnik nosioca je uvijek zadnji, pa uvijek ide.

**Šta:**
- `game-core/raub/match.ts`: `raubMustGo(state, playerId)`; `go: false` od igrača koji mora → `INVALID_ACTION`. Grana „niko ne ide → nosilac 4 štiha” ostaje samo kao zaštita (do nje se više ne stiže).
- `view.ts`: `RaubPlayerView.mustGo` (opciono u `shared-types`); auto-akcija na istek sata daje „Idem” kad mora.
- `bot.ts`: kad `view.mustGo`, bot uvijek ide.
- Web: panel `going` nosi `mustGo` (`lib/raubView.ts`) — tada samo dugme „Idem” i uz uputu „ostali ne idu, ti moraš” (`RaubParts.tsx`, `sr.raub.go.must`). Pravila (`RaubRules.tsx`) prepravljena.

**Mjerenje:** game-core 401, server 262, web 227 testova, typecheck. `simulate:raub` 10.000 × 4P: medijan 22 → 23 ruke (p90 32 → 33), procjena 33 → 35 min, 0 grešaka i odbijenih akcija.

**Stari klijent (APK ≤ 1.4.1):** ne zna za `mustGo`, pa prikazuje i „Ne idem”; server ga odbija, igrač pritisne „Idem” ili mu istekne sat (auto „Idem”). Ne zaglavljuje se. Vlasnik pravi novi APK.

**Nije provjereno na uređaju.**

## 170. Raub — karta s talona čeka na stolu do zamjene nosioca (2026-11-15, `fix/raub-talon-after-exchange`)

**Povod:** vlasnik sa stola (snimak): kod „Raub” karta je odmah otišla nosiocu u ruku i on je odbacivao prije Idem/zamjene. Pravilo (odluka 20 u `docs/raub-spec.md`): karta ostaje na stolu, nosilac kao i ostali prvo mijenja, pa tek onda uzima kartu sa stola i odbacuje jednu bilo koju iz ruke. Isto za Štih (sedmica). „Moja” bez promjene. Odluke vlasnika: odbacuje bilo koju kartu; za sve 4 nosilac dobija tačno 4 (bez pete i otvorene).

**Šta:**
- `game-core/raub/match.ts`: `claimTalon` (karta zaključana, a ostaje na talonu), `raubTalonPending` (izvedeno: `lockedCardId` je na vrhu talona — bez novog polja u snapshotu), `takePendingTalon` poslije nosiočeve zamjene → `discard_extra`. Raub i Štih idu odmah u Idem/Ne idem. Zaštita: prazan špil na redu nosioca → uzme i odbaci.
- Pogled: `RaubPlayerView.claimedTalon` (opciono). `takenTalonCard` i dalje znači „karta u ruci nosioca”, pa let karte (changelog 162) kreće tek kad je stvarno uzme.
- Web: `TalonPile` opet nosi natpis „Uzima: Ime” / „Uzimaš ti” (iz `fd39dae^`, CSS `.rb-talon__taken`), panel zamjene nosioca kaže da poslije uzima kartu i odbacuje. Pravila prepravljena.
- Stari snapshot (karta već u ruci, `discard_extra` bez reda zamjene) ide starim putem — test.

**Mjerenje:** game-core 403, server 262, web 227, typecheck, lint. `simulate:raub` 10.000 × 4P: 0 grešaka, medijan 23 ruke (35 min). Snimak `/dev/raub?s=seven` 360×740: sedmica na stolu sa „Uzima: Marko” tokom Idem.

**Stari APK (≤ 1.4.1):** dobija `discard_extra` poslije zamjene i radi; samo nema natpisa ispod karte.

**Nije provjereno na uređaju.**

## 171. Raub — obavezno nadjačavanje štiha (2026-11-15, `fix/raub-must-overtrump`)

**Povod:** vlasnik sa stola (snimak): otvoren X žira (žir adut), u ruci IX žira i jača figura žira; aplikacija je pustila IX. Nije greška u kodu: pravilo je od početka parametar `mustOvertrump`, isključen odlukom 5. Vlasnik ga uključuje (odluka 21 u `docs/raub-spec.md`), po pagat.com varijanti.

**Šta:**
- `game-core/raub/config.ts`: `mustOvertrump: true`. Logika (`raubLegalCards`) je već postojala i bila testirana. Bot bira samo iz `legalCardIds`, pa se ne mijenja.
- Back-compat: pravila žive u stanju sobe, pa hidrirane partije igraju do kraja sa `false`. Klijent ne odlučuje o dozvoljenim kartama, pa i APK 1.4.1 dobija pravilo bez novog paketa (samo bez nove upute).
- Web: uputa „Odgovori na boju ♣ i nadjačaj” / „Nemaš boju — nadjačaj adutom” kad server suzi izbor (`playHint`), pravila u aplikaciji dopunjena.
- Testovi: slučaj sa snimka (samo figura), jači adut bez boje, parametar isključen.

**Mjerenje:** game-core 406, server 262, web 228, typecheck. `simulate:raub` 10.000 × 4P: 0 grešaka, medijan 23 ruke (35 min), refa 2,1 % — trajanje isto kao prije.

**Nije provjereno na uređaju.**

## 172. Raub — karta s talona prelazi u ruku tek poslije odbacivanja (2026-11-15, `fix/raub-must-overtrump`)

**Povod:** vlasnik: kod Rauba karta treba da stoji na stolu do kraja. Djelilac kaže koliko mijenja, dobije toliko, bira koju kartu baca, i tek onda karta sa stola prelazi kod njega. Do sada (changelog 170) je karta prelazila u ruku odmah poslije zamjene, pa je nosilac birao od 5.

**Šta:**
- `game-core/raub/match.ts`: poslije zamjene nosioca (i kad je špil prazan na njegovom redu) korak `discard_extra` počinje dok je karta još na talonu (`raubTalonPending` i dalje `true`); `discard` je poslije odbacivanja premješta u ruku (`takeTalon`). `takePendingTalon` uklonjen. Bez novog polja u snapshotu; stari snapshot sa kartom već u ruci nije „pending" i ide starim putem.
- Web: uputa „Odbaci jednu kartu — zatim uzimaš kartu sa stola.” (`discard.hintClaim`, panel `discard` nosi `claim`), uputa zamjene i pravila prepravljeni. Natpis „Uzimaš ti” ostaje ispod karte i za vrijeme odbacivanja; let karte u ruku (`takenTalonCard`) kreće tek poslije odbacivanja.
- Testovi: tri testa odluke 20 prepravljena na novi redoslijed, novi test za prazan špil na redu nosioca.

**Mjerenje:** game-core 407, server 262, web 228, typecheck, lint. `simulate:raub` 10.000 × 4P: 0 grešaka, medijan 23 ruke (35 min), isto kao prije.

**Stari APK (≤ 1.4.1):** dobija `discard_extra` sa 4 karte i kartom na stolu; panel kaže „Imaš 5 karata. Odbaci jednu.” (netačan broj), ali odbacivanje radi.

**Nije provjereno na uređaju.**

## 173. Analitika — poziv prijatelju iz liste (2026-11-15, `feat/analytics-friend-invites`)

**Povod:** u PostHogu se vidio samo `invite_shared` (link kroz meni ili kopiranje). Poziv iz liste prijatelja (SPEC_IDENTITET tok e) nije slao ništa, pa je omjer „igrači koji pozivaju” (3 od 26 aktivnih od 7.11., ~12 %) bio potcijenjen.

**Šta:**
- Dva serverska događaja (`shared-types` `AnalyticsEvents`, čiste funkcije u `apps/server/src/analytics.ts`): `friend_invite_sent` (pozivalac; `room_id`, `invited_count`, `source` `new_room`/`lobby`, `game`, `platform?`) i `friend_invite_accepted` (pozvani; `room_id`, `game`, `wait_ms` od poziva, `platform?`).
- Šalju ih `POST /api/invites`, `POST /api/rooms/:id/invites` i `POST /api/invites/:id/accept`, i to samo na uspjeh. guestId pozivaoca se čita sa host igrača u sobi, jer lobi ruta ne nosi guestId u tijelu.
- Na serveru je, pa radi i za APK 1.4.1 bez novog paketa; dovoljan je deploy servera.
- `docs/analytics.md`: dva reda događaja, KPI „Pozivači (svi kanali)” i „Poziv prijatelja → ulazak”.

**Mjerenje:** server 267 testova (5 novih), typecheck.

**Nije provjereno uživo:** događaj se vidi tek kad neko na produkciji pozove prijatelja.

## 174. Play In-App Updates — aplikacija sama nudi novu verziju (2026-11-15, `feat/in-app-update`)

**Zašto:** aplikacija nosi web dio u sebi, pa korisnik ostaje na staroj verziji dok ga Play ne ažurira (1–2 dana; nikad ako je automatsko ažuriranje isključeno). Pad pokera u 1.4.0 je zato živio i poslije popravke.

**Šta:**
- **Native** `AppUpdatePlugin.java` (`com.google.android.play:app-update:2.1.0`, bez nove dozvole):
  - `check` (vraća i instaliranu verziju iz `PackageInfo`), `startFlexible`, `startImmediate`, `completeUpdate`, događaj `downloaded`.
  - Svaki neuspjeh → `available: false`, nikad odbijanje (obrazac InstallReferrer-a).
- **Server** `GET /api/app-config` → `{ android: { minVersionCode } }` iz `ANDROID_MIN_VERSION_CODE`. Fail-open: bez env-a ili neispravno → 0. Prvi modul u `src/routes/` (`registerAppConfigRoute`).
- **Web** `lib/appUpdate.ts`: čista `decideUpdate` → `none | offer | force | restart`, testirana. Uz nju `AppUpdatePrompt` (oblik `.pushprompt`, iznad donje trake).
- Analitika: `app_update` (`offered | accepted | declined | restarted | forced`).

**Pravila:**
- Traka živi SAMO na početnoj i skrivena je dok traje traženje stola ili je otvoren list. Instalacija restartuje aplikaciju, pa nikad za stolom.
- Provjera ide najviše jednom u 6 h (pokretanje + povratak u prvi plan).
- „Ne sada" = 3 dana.
- Preuzeto se uvijek nudi kao „Restartuj".
- **Prisila** samo kad je instalirana verzija < minimum I Play dozvoljava immediate. Ne upisuje se kao provjerena, pa otkazan Play ekran dolazi opet na sljedeći povratak.
- Aplikacija se nikad ne zaključava sama: nema update-a ili nema dozvole → igra radi.

**Odstupanje od plana:** trenutna verzija ne ide u web build preko `next.config.ts`, nego je plugin čita iz `PackageInfo`. Uvijek je tačna i nema još jedne env varijable.

**Ograničenja:**
- Radi samo za instalaciju sa Play-a. Staging, debug i sideload ne vide ništa.
- Pravi test je Play interni test (instalirati verziju N sa Play-a, objaviti N+1).
- Važi tek od izdanja koje ga nosi: 1.4.0 i 1.4.1 nikad neće pitati.

**Provjereno:** web 239 testova (+12), server 266 (+4), typecheck, lint = osnovica, staging APK (Java kompajliran). **Nije provjereno na uređaju ni kroz Play interni test.**

## 175. Početna za web — novi igrači (2026-11-15, `feat/web-home`)

**Šta:** web dobija svoju početnu po tabli „UI · Početna za web — novi igrači" (W1, W1b, W2, W4) na platnu „Kartaonica · identitet". **Aplikacija je ne dobija:** `app/page.tsx` grana na `isNative` — APK crta stari `HomeScreen`, web novi `components/home/web/WebHome`. Od sada je to pravilo: UI rad ide samo na web, aplikacija se ne dira (odluka vlasnika 15.11.2026).

**Web početna:**
- Bez naziva „Kartaonica" na vrhu. Redom: traka „Igraj u aplikaciji", kartice igara, red „Igraj s prijateljima", „Piši nam". Na webu se ne prikazuje red „Uskoro".
- Kartica je JEDNO dugme: dodir na sliku isto je što i „Igraj". Oznaka (Zadnje igrano / Zakačeno / Novo) stoji uz naziv. Podnaslov: „N igrača · odmah, bez registracije".
- „Igraj" ide pravo za sto, bez lista. Žandar uvijek 4 igrača do 11; za sve tri igre izgled stola je nasumičan (`lib/webHome.ts`). `startQuickPlay(..., { remember: false })` ne upisuje taj izbor kao „zadnji", pa ga `/create` i Postavke → Brza igra ne vide. Ime se i dalje traži listom samo prvi put (odluka vlasnika).
- W1b: kad je ekran niži od 780 px, slika je 64 px, a dugme 48 px.
- W2 (≥ 960 px): kolona 1040, naslov „Izaberi igru i sjedi za sto", tri kartice u redu. Donja traka prelazi u zaglavlje `WebTopNav` (`TabBar` dobija `tabbar--web-home`, CSS je sakriva). Traka aplikacije se ne prikazuje.
- W4: „Igraj s prijateljima" otvara list sa izborom igre i vodi na `/create?game=<igra>`, i za Žandar. Na webu `/create` sa igrom u adresi ne nudi izbor igre. Žandar nudi samo 2 ili 4 igrača (odluka vlasnika; ranije je bilo i 3). Broj koji igra ne nudi pada na 2.
- Traka aplikacije (odluka vlasnika): prikazuje se UVIJEK, samo na Android pregledaču, bez ×. Desno je zvanična oznaka `google-play-badge.png`; ako je aplikacija instalirana, „Otvori". Ne ide kroz `decideAppOffer` — ta pravila ostaju za red na kraju partije. Analitika `app_offer_shown`/`app_offer_click` dobija novo mjesto `home_strip` (+ postojeći `home_open`); prikaz se broji jednom po posjeti, pod zasebnim ključem, pa ne guši red na kraju partije.

**Zamke:**
- Stilovi su na kraju `home.css`, ne u novom importovanom fajlu: Vercel je novi CSS import već izbacivao (changelog 129, `poker.css`).
- Headless Chrome ne pravi prozor uži od ~500 px. Telefon se snima CDP emulacijom (`Emulation.setDeviceMetricsOverride`), inače snimak izgleda odsječeno.
- Oznaka Google Play je PNG sa NEPROZIRNIM bijelim praznim prostorom. Na tamnoj traci se vidi bijeli okvir. Nije mijenjana; treba prozirna varijanta od vlasnika.
- Traka aplikacije se pojavi tek poslije hidracije (user agent se zna tek na klijentu), pa na Androidu gura kartice nadolje za ~70 px.
- `/create` na webu: `?game=` se čita tek na klijentu, pa izbor igre trepne pri prvom crtanju.

**Usput primijećeno (nije dirano):** `/create` čita i pamti podlogu uvijek pod `zandar:table`, i za Poker i Raub.

**Provjereno:**
- web 245 testova (+5, `lib/webHome.test.ts`), typecheck, lint = osnovica.
- CDP snimci 390×844 i 360×740 bez skrola, 1280×800, W4 list, traka „Otvori".
- E2E u headless Chromeu protiv lokalnog servera:
  - Žandar → soba 4/11 sa nasumičnom podlogom; Poker i Raub → sto za 4.
  - Zapamćeni izbor ostaje prazan.
  - W4 → `/create?game=raub` bez izbora igre; Žandar nudi 2/4.
  - 0 grešaka u konzoli.
- `build:mobile` prolazi; izvezen `index.html` je stara početna.

**Nije provjereno na uređaju.**

## 176. Raub — djelilac smije odmah reći „Refa” na prvoj karti (2026-11-16, `fix/raub-dealer-refa`)

Prijava igrača: dogovoreno uživo da djelilac smije zvati refu odmah na prvoj okrenutoj karti, a to nije bilo ugrađeno. Na drugoj i trećoj karti ne smije. Odluka 23 u `docs/raub-spec.md`.

**Motor (`game-core/src/raub`):**
- `raubCanRefa(state, id)`: pravilo `dealerRefaFirstFlip` je uključeno, igrač je djelilac i na potezu je, korak je `seven_choice` ili `bidding`, `talonFlips === 1` i još nije odgovorio.
- Akcija `{ type: "refa" }` → `voidHand(state, dealerId)`: `pendingRefas + 1`, ruka `void`, `lastHand.refaBy = djelilac`. Dalje sve ide kao obična refa (djeljenje prelazi dalje, sljedeća ruka ×2).
- Sedmica na prvoj karti je uključena: djelilac bira Refa / Dalje / Štih. Poslije „Dalje” na sedmicu je karta druga, pa refe nema.
- Istek roka ostaje „Dalje”. Bot refu ne zove (strategija nepromijenjena, simulacija ista).

**Back-compat:** `dealerRefaFirstFlip`, `canRefa` i `refaBy` su opciona polja. Stari snapshot bez pravila dobija novo pravilo. Stari klijent (APK) ne šalje `canRefa`, pa dugme ne vidi. Može igrati dalje, a ruka koju je neko drugi poništio dolazi kao obična refa. Protokol (`raub:2`) se ne podiže.

**Server:** `parseRaubAction` prima `refa`.

**Web:**
- Dugme „Refa” (`pass` stil) prvo u panelu licitacije i sedmice. Najviše tri dugmeta, mjereno CDP-om na 360 px: 3 × 76 px.
- Pregled ruke kaže „Refa djelioca (Ime) na prvoj karti…”.
- Pravila (`RaubRules`) dopunjena.
- Dugme je u dijeljenoj `RaubScreen`, bez `isNative` grane: pravilo igre stiže u aplikaciju sa sljedećim paketom.

**Provjereno:**
- game-core 414 testova (+7), server 271, web 246 (+1).
- Typecheck i lint izmijenjenih fajlova su čisti.
- CDP snimak `/dev/raub?s=bid` i `s=sevenChoice` na 360×740.

**Zamka:** posuđeni `next dev` (3117) nije osvježio klijentski paket poslije skidanja napomene ispod „Refa” (hidracija se nije slagala). Raspored sa napomenom je izmjeren, a bez nje je dugme samo uže.

**Nije provjereno na uređaju.**

## 177. Raub — ko mora ići, ne pita se „Idem?” (2026-11-16, `fix/raub-auto-go`)

**Šta:** odluka 24 u `docs/raub-spec.md`. `continueGoing` (`packages/game-core/src/raub/match.ts`) igraču koji mora ići (svi ostali osim nosioca rekli „Ne idem” — u 2P uvijek) sam upiše „Idem” i ide dalje, pa igra kreće pravo u zamjenu. Ko još može birati, i dalje se pita.

**Zašto:** feedback igrača sa partije 1-na-1 — ekran je pitao „Idem?” sa jedinim dugmetom „Idem” (odluka 19), suvišan korak prije izbora broja karata.

**Back-compat:** oblik stanja i akcije isti, klijent ne treba novu verziju. `raubMustGo`, provjera u `case "go"`, `view.mustGo`, bot i panel ostaju za ruku hidriranu iz snapshota zatečenu u `going` sa obaveznim „Idem” (testirano ručno sastavljenim stanjem u `match.test.ts` i `raubView.test.ts`).

**Mjereno:** game-core 408, server 271, web 245 testova; typecheck čist; `simulate:raub` 10.000 × 4P: 0 grešaka karata/štihova, 0 odbijenih akcija, 0 zaglavljenih, medijan 23 ruke (isto kao prije).

**Zamka:** grana je napravljena prije nego što je `fix/raub-dealer-refa` (odluka 23, changelog 176) stigla na `main`; rebase je imao konflikte samo u tabeli odluka, changelogu i `CLAUDE.md` (kod se ne preklapa).

## 178. Raub — zamjena sve 4 daje tačno 4 (2026-11-16, `fix/raub-full-exchange-four`)

**Šta:** odluka 25 u `docs/raub-spec.md`, zamjenjuje odluku 1. Ko zamijeni sve 4 karte, dobija tačno 4 nove, skrivene — bez pete karte, otvorene karte i odbacivanja. Novi parametar `RaubRules.fullExchangeBonus` (`DEFAULT_RAUB_RULES`: `false`); stari put u `case "exchange"` (`packages/game-core/src/raub/match.ts`) radi samo uz `fullExchangeBonus === true`.

**Zašto:** igrač (2P, protivnik rekao „Moja”) je zamijenio sve 4, dobio 5 karata i „Imaš 5 karata. Odbaci jednu.” i prijavio to kao grešku. Izvori se razilaze: igresakartama.com daje prvom koji mijenja sve 4 pet karata (treća otvorena), pagat.com daje koliko je igrač dao. Vlasnik bira pagat.

**Back-compat:** polje je opciono; stari snapshot bez njega igra po novom pravilu od sljedeće zamjene. Ruka zatečena u `discard_extra` sa otvorenom kartom završava starim putem (odbacivanje se ne dira). Oblik stanja i protokol isti, klijent ne treba novu verziju. UI za otvorenu kartu (`OpenCardNote`, katanac) ostaje, samo se više ne aktivira. Pravila u `RaubRules.tsx` prepisana; aplikacija novi tekst dobija tek sljedećim paketom, a motor (server) važi odmah i za nju. Scenario `/dev/raub?s=exchangeOpen` uklonjen (više se ne može desiti).

**Mjereno:** game-core 417 (+2 nova testa; stari testovi odluke 1 idu uz `fullExchangeBonus: true`), server 272, web 246; typecheck čist. `simulate:raub` 10.000 × 4P: 0 grešaka karata/štihova, 0 odbijenih akcija, 0 zaglavljenih, medijan 23 ruke (34,7 min), refa 2,1 % — isto kao prije.

**Nije provjereno na uređaju.**

## 179. Raub — djelilac odlučuje naslijepo (2026-11-16, `fix/raub-dealer-blind`)

**Šta:** odluka 26 u `docs/raub-spec.md`. Kad na prvoj okrenutoj karti djelilac smije „Štih” (7) ili „Raub” (A, K, O, U), ne vidi svoje karte dok ne odgovori (Štih/Raub, Dalje, Refa ili istek roka). Ostali vide svoje odmah. Na prvoj karti 10/9/8 i na drugoj i trećoj karti sve kao prije.

**Kako:** nova čista funkcija `raubDealerBlind(state)` (`packages/game-core/src/raub/match.ts`). `startHand` postavlja `dealerOpened = !raubDealerBlind`, a `applyRaubAction` poslije svake akcije otvara karte čim djelilac više ne čeka odluku naslijepo (pokriva i `firstBidder: "right_of_dealer"`, gdje neko prije djelioca kaže „Moja”). `getRaubView` već je imao `myCardsHidden` iz vremena rauba naslijepo (prije odluke 13), a `RaubScreen` već crta poleđine — zato nema novog polja u stanju ni pogledu i nema novog protokola; APK 1.4.x prikazuje poleđine bez izmjene. Parametar `RaubRules.dealerBlindFirstFlip` (podrazumijevano `true`; stari snapshot bez polja igra po novom od sljedeće ruke, a ruka zatečena usred licitacije ostaje otvorena jer joj je `dealerOpened` već `true`).

**Bot:** odlučuje iz pogleda, pa naslijepo nema karte. Novo u `DEFAULT_RAUB_BOT_CONFIG`: `blindRaubP` (A 1, K 0,8, O 0,5, U 0,35) i `blindStihP` 0,7; as i dalje uvijek „Raub” (odluka 17). Štih naslijepo ide kroz isti raspon 1–8 s kao Raub.

**Web:** u panelu licitacije djeliocu naslijepo stoji samo „Odluči prije nego vidiš svoje karte.” (obaveza piše na dugmetu; oblačić je jedan red — spojen sa starom uputom bio je 329–386 px u 245 px i sjekao se elipsom). Pravila (`RaubRules.tsx`) dopunjena.

**Mjereno:** game-core 428 (+11), server 272, web 247 (+1); typecheck čist; lint = osnovica (5/2). `simulate:raub` 10.000 × 4P: 0 grešaka karata/štihova, 0 odbijenih akcija, 0 zaglavljenih; refa 2,1 → 2,8 %, medijan 23 ruke, 34,7 → 35,5 min; raub 90.801 → 78.319, štih 27.323 → 20.675, moja 110.187 → 130.862. CDP 360×740 `/dev/raub?s=bid` i `s=sevenChoice`: poleđine u ruci, dugmad stanu, nova uputa 228 px u 245 px.

**Zamka:** posuđeni `next dev` (3117) poslije prve izmjene panela više nije primao izmjene; konačna uputa je izmjerena upisom teksta u živi oblačić preko CDP-a.

**Nije provjereno na uređaju.**

## 180. Web — „Ime za stolom" po tabli `UI_ImeWeb` (2026-11-16, `feat/web-name-sheet`)

**Šta:** igrač iz oglasa tapne „Igraj" na web početnoj i, bez sačuvanog imena, dobije novi list `components/home/web/WebNameSheet.tsx` (I1–I5 sa table „UI · Ime za stolom — web"). Gore piše kuda ide (lepeza igre, „Žandar · 4 igrača · igra se do 11"), X umjesto donjeg „Odustani", naslov „Kako da te zovemo?", placeholder „Ime ili nadimak", polje 60 px / 20 px, glavno dugme „Sjedi za sto →" odmah ispod polja, `enterKeyHint="go"`. Dugme **nikad nije sivo**: prazan pokušaj daje crveni red „Upiši ime, pa sjedaš za sto." (sa ikonicom, `aria-invalid`, fokus nazad u polje); greška servera ide u isti rezervisan red. Dok se traži sto: spinner + „Tražim sto…", polje i dugmad zaključani.

**I5 (odluka vlasnika 16.11.2026):** „Preskoči i igraj kao Gost NN" (`guestName()` u `lib/webHome.ts`, 10–99, izvučen jednom pri otvaranju lista). Ime gosta ide serveru kao obično ime i **ne pamti se** — `startQuickPlay(..., { saveName: false })` preskače `savePlayerName`, pa sljedeći „Igraj" opet pita. „Novi sto" (`RoomScreen.handleFindNewTable`) čita ime sa sjedišta, pa gost tamo ostaje „Gost NN". Analitika: `play_requested` dobija `guest: true` (drugi argument `quickPlay`, ne ide serveru).

**Samo web:** `app/page.tsx` grana na `isNative`; aplikacija zadržava `QuickPlayNameSheet`. Kod lista je u APK chunku početne (isto kao `WebHome`), ali ga grana sa build-time `isNative` nikad ne crta — provjereno `build:mobile`-om.

**Tastatura:** Chrome na Androidu podrazumijevano ne smanjuje layout viewport, pa bi list prikovan za dno ostao ispod tastature. `useKeyboardInset` (u istom fajlu) čita `visualViewport` i postavlja `--kb-inset` → `padding-bottom` scrima. Globalni `viewport` (`interactive-widget`) namjerno nije diran — djelovao bi i na sto.

**Odstupanje od table:** ikonica greške je postojeći `WarningIcon` (trougao), ne krug sa uzvičnikom.

**Harness:** `/dev/home?web=1&live=3&name=1|busy|err`; „Igraj" na kartici u harnessu otvara list za tu igru.

**Mjereno:** web 247 testova (+1 `guestName`), typecheck čist, lint = osnovica. CDP 390×844 i 360×740 (bez skrola, greška ne pomjera dugme). E2E u headless Chromeu protiv lokalnog servera: prazan submit → poruka i fokus u polju; „Jaca" + Sjedi → `/room`, `zandar_name = Jaca`; gost → `/room`, za stolom „Gost 29", `zandar_name` prazan, povratak na početnu i Igraj → list opet; 0 grešaka u konzoli. Zanimljivo: generator imena botova i sam daje „Gost8801"-oblik, pa gost ne štrči.

**Nije provjereno na uređaju** — posebno dugme iznad tastature u Android Chromeu (headless to ne može pokazati).

## 180. Raub — karte djelioca se okrenu poslije odluke naslijepo (2026-11-16, `fix/raub-reveal-flip`)

**Šta:** kad djelilac odluči naslijepo (odluka 26, changelog 179), njegove četiri karte se okrenu lijevo → desno umjesto da se samo pojave. Vlasnik tražio „lijepo suptilno okretanje”.

**Kako:** 3D okret je već postojao (`.card[data-face-up="false"] .card-inner` → `rotateY(180deg)` sa prelazom u `felt.css`), ali skrivene karte imaju id `hidden-i`, a `PlayerHand` je ključao po `card.id`, pa je React pri otkrivanju pravio nove elemente licem gore. Sad `PlayerHand` prima opcioni `slotKey` (podrazumijevano `card.id` — Žandar i Poker isti), a čista `revealSlotKeys` (`lib/raubView.ts`) u istoj ruci daje pravim kartama ključ `hidden-i`; isti element mijenja samo `data-face-up`. Nova ruka i stanje viđeno već otkriveno (reconnect) nemaju okret; karte iz zamjene imaju svoj id pa let iz špila radi kao i prije. Stanje u `RaubScreen` se osvježava u renderu (obrazac „prilagodi stanje kad se prop promijeni”), bez efekta. `.hand--reveal` produžava prelaz samo za Raub: `--t-rb-reveal` 420 ms, kaskada `--t-rb-reveal-stagger` 70 ms po karti (oba 1 ms pod reduced-motion); animira se samo `transform`.

**Mjereno:** web 251 test (+3), typecheck čist, lint = osnovica. CDP 360×740, `/dev/raub?s=bid&then=raub`, `requestAnimationFrame` u stranici: isti elementi prije i poslije (bez remounta), okret svake karte ~420 ms, start ~70–80 ms jedna za drugom; snimak usred okreta (2 lica, 1 na ivici, 1 poleđina) i na kraju — lica stižu na vrijeme, predučitavanje nije trebalo.

**Nije provjereno na uređaju.**

## 181. Raub — refa se prenosi preko Štiha (2026-11-18, odluka 27)

**Šta:** feedback igrača: „ako je refa i bude štih, da se refa prenosi a ne računa duplo". Do sada je `startHand` postavljao `multiplier = 2` čim refa čeka, pa je i ruka sa Štihom išla ×2 i trošila refu (po specu). Vlasnik usvojio: ruka sa Štihom se boduje ×1, a refe čekaju sljedeću ruku s Raubom ili Mojom.

**Kako:** novi parametar `stihSkipsRefa` (podrazumijevano da; stari snapshot bez polja = da, preko `rulesV2`). `takeStih` postavlja `multiplier = 1`, a `scoreHand` već troši refu samo kad je `m === 2`, pa se refa prenese sama. Pokriva i automatski Štih (`stihOptional: false`). Bez novog polja u stanju i pogledu, bez novog protokola. Na sedmici sto do djeliočeve odluke pokazuje ×2, a poslije „Štih" brojač refa. Bot ne koristi multiplier, pa ga ova promjena ne dira. Ažurirani spec (Refa, rubni slučajevi, odluka 27, acceptance) i `RaubRules.tsx`.

**Mjereno:** game-core 434 testa (+6: Štih ×1 i refa ostaje; dvije refe → [1, 2, 2]; Dalje pa Moja i dalje ×2; automatski Štih; `stihSkipsRefa: false`; stari snapshot), typecheck čist. Simulacija 10.000 × 4P: 0 grešaka, refa 2,8 %, medijan 23 ruke (35,4 min; bilo 35,5).

**Nije provjereno na uređaju.**

## 182. Raub — pad na Štih je +2 (2026-11-18, odluka 28, `fix/raub-stih-penalty`)

**Šta:** feedback igrača: djelilac koji kaže „Štih" (sedmica, mora 1) i ne uzme nijedan štih ide 2 gore, ne 3. Raub i Moja ostaju: jedan štih +3, nijedan +4.

**Kako:** `raubScoreDelta` za `requiredTricks === 1` vraća 2. Bodovanje se računa tek na kraju ruke, pa nema promjene snapshota ni protokola; ruka zatečena u toku pri deployu boduje se po novom. Bot ne koristi ovu vrijednost. Ažurirani spec (tabela bodova, odluka 28) i `RaubRules.tsx`.

**Nije provjereno na uređaju.**

## 183. Raub — sedmica aduta uzima kartu s talona (2026-11-18, odluka 29, `fix/raub-moja-talon-seven`)

**Šta:** prijava igrača: treća okrenuta karta K, igrač ima samo sedmicu te boje i kaže „Dalje”, protivnik kaže „Moja” bez sedmice. Karta ostaje na talonu (odluka 15), a igraču u zamjeni nije ponuđeno da je uzme sedmicom. To nije bio bug nego pravilo koje motor nije imao. Vlasnik odlučio: ponuda ide POSLIJE igračeve zamjene (važi i sedmica dobijena u zamjeni), i za samog nosioca; prvi u redu zamjene ima prednost.

**Kako:** u `match.ts` `endExchangeTurn` zamjenjuje `exchangeIndex += 1; continueExchange` na kraju zamjene (i kod `discard` sa starim bonusom); `canTakeTalonWithSeven` traži `scenario === "moja"`, `talonTakenBy === null`, kartu aduta na talonu (ne 7), igrača koji ide i sedmicu aduta u ruci. Igrač preskočen zbog praznog špila dobija ponudu u `continueExchange`. Koristi se zatečeni korak `swap_seven` (iz ruku prije odluke 14): pogled `swapOffer`, panel „swap”, bot (uvijek prihvata), auto-akcija „Ne”. Akcija `swap_seven` u fazi zamjene (`exchangeOrder !== null`) ide na sljedećeg u redu, inače stari put `afterTrump`. `swapSeven` zaključava uzetu kartu i stavlja sedmicu na talon, pa ostali ponudu više ne dobijaju. Parametar `mojaTalonSeven` (stari snapshot bez polja = da). Bez novog polja u stanju, bez novog protokola (`raub:2`) — APK 1.4.4 već crta panel. Web: natpis sjedišta i brojač okretanja tretiraju `swap_seven` usred zamjene kao zamjenu; let karte radi sam (prelaz `talonTakenBy` niko → igrač). Ažurirani spec (pravila, višak karata, mašina stanja, tajmer, odluka 29) i `RaubRules.tsx`.

**Mjereno:** game-core 443 testa (+9: ponuda poslije zamjene i „Da”/„Ne”, istek roka, sedmica dobijena u zamjeni kod nosioca, „Ne idem”, Raub i Moja sa sedmicom bez ponude, prazan špil, `mojaTalonSeven: false`, bot), web 252 (+1), server 272, typecheck čist. Simulacija 10.000 × 4P: 0 grešaka karata/štihova/akcija, refa 2,8 %, medijan 23 ruke (35,9 min).

**Nije provjereno na uređaju.** Server mora na deploy (pravilo je u motoru); web izmjene su samo natpisi.

## 185. Raub — „Moja” sa sedmicom: karta čeka na stolu do zamjene (2026-11-18, odluka 30, `fix/raub-moja-seven-after-exchange`)

**Povod:** igrač, uz snimak 2P zamjene, napisao je: „Isto ko prije, ja zaustavio i odma mi zamijenilo kartu”. Rekao je „Moja” sa sedmicom aduta. Karta s talona mu je odmah prešla u ruku sa katancem, a sedmica je otišla na talon. Sve se to desilo prije njegove zamjene.

**Uzrok:** ovo nije kvar. Spec (odluka 15) je pisao „kod Moja sa sedmicom zamjena je dio izjave”, i motor je radio tačno to: bid `moja` je odmah zvao `swapSeven`. Kod Rauba i Štiha ista primjedba je već riješena odlukama 20 i 22, i karta tamo čeka na stolu dok nosilac ne zamijeni. Igraču je zato izgledalo kao da se ista greška vratila.

**Izmjena (odluka 30):** „Moja” sa sedmicom radi kao Raub.
- Izjava zove `claimTalon`: karta ostaje na stolu sa natpisom „Uzimaš ti” / „Uzima: Ime”.
- Nosiočeva sedmica aduta je zaključana do kraja njegove zamjene. Izvedena je funkcijom `raubPendingSevenId`, bez novog polja. `raubMaxExchange` je ne broji (najviše 3), a `exchange` za nju vraća `CARD_LOCKED`.
- Poslije zamjene `settlePendingTalon` zove `swapSeven`: sedmica ide na talon, a karta u ruku. Nema odbacivanja, pa ide `endExchangeTurn`. Raub i Štih kroz istu funkciju idu na `discard_extra` kao i ranije. Isto važi za prazan špil u `continueExchange`.
- Pogled: dok karta čeka, `lockedCardId` nosioca je id sedmice. Zato bot ne mijenja sedmicu, a katanac se crta bez novog polja, i to i u APK-u 1.4.4.
- Parametar `mojaSevenAfterExchange` (stari snapshot bez polja = da). Ruka zatečena pri deployu ima kartu već u ruci, nije „pending” i igra se starim putem.
- Web: panel zamjene kod „Moja” piše „Dodirni karte koje mijenjaš — zatim daješ sedmicu za kartu sa stola.” (`exchange.hintClaimSeven`, `claimSeven` u panelu). `/dev/raub?s=mojaSeven` je novo stanje.
- Ažurirani su spec (tabela scenarija, licitacija, višak karata, let karte, odluka 30) i `RaubRules.tsx`.

**Mjereno:**
- game-core 452 testa (+9): obećana karta, sedmica zaključana, zamjena pa predaja sedmice, zamjena 0, istek roka, bot, prazan špil, stari snapshot, bez ponude iz odluke 29. Dva postojeća testa su prilagođena, a staro ponašanje ima svoj test sa `mojaSevenAfterExchange: false`.
- Server 272, web 252, typecheck čist.
- `simulate:raub`, sve bez grešaka karata i štihova, bez odbijenih akcija i bez zaglavljenih:
  - 10.000 × 4P: refa 2,8 %, medijan 23 ruke, 35,7 min;
  - 3.000 × 2P i 3.000 × 3P.
- Headless Chrome 360×740 `/dev/raub?s=mojaSeven&n=2|4`: karta je na stolu sa „Uzimaš ti”, sedmica u ruci sa katancem, uputa nova. Sa `then=exchange&ex=1` karta je poslije zamjene u ruci, a sedmice nema.

**Stari APK (1.4.4):** pravilo je na serveru. Katanac na sedmici stiže kroz `lockedCardId`, pa je stara aplikacija ne može označiti za zamjenu. Uputa u staroj aplikaciji kaže „zatim odbacuješ jednu i uzimaš kartu sa stola”, jer ne razlikuje Moju od Rauba. Odbacivanja nema, karta jednostavno dođe.

**Nije provjereno na uređaju.** Server mora na deploy (pravilo je u motoru). Web donosi samo uputu.

## 186. Raub — niža karta odbijene boje je mrtva (2026-11-18, odluka 31, `fix/raub-lower-passed-suit`)

**Povod:** feedback igrača: „Prva karta je dole žandar srce. Ako svi kažu dalje, dolazi druga karta. I ako je manje srce, npr. desetka, to ne može niko ništa.” Motor je do sada gledao samo kartu na vrhu talona, pa je na 10♥ poslije odbijenog J♥ nudio „Moja”.

**Odluke vlasnika:** mrtva je karta niža od BILO KOJE ranije okrenute (odbijene) karte iste boje u toj ruci (J♥ → 8♠ → 10♥: 10♥ je mrtva). Viša karta iste boje se licitira normalno. Tok je isti kao za sedmicu kao drugu/treću kartu: krug sa samo „Dalje”, broji se u `maxTalonFlips`, poslije treće refa.

**Izmjena:** jedan predikat, postojeća mašinerija.
- `raubTalonDead(state)` u `match.ts`: vrh talona je niži od neke ranije karte iste boje u talonu. Tokom licitacije talon nosi samo okrenute karte (sedmica iz „Moja” stiže tek poslije izjave), pa je to tačno „odbijene karte ove ruke”.
- `raubCanMoja` i `raubCanRaub` vraćaju `false` za mrtvu kartu. `bidOptions` je zato `{raub:false, moja:false}`, kao kod sedmice kao druge karte; bot, istek roka i server to već nose.
- Parametar `lowerOfPassedSuitDead` (stari snapshot bez polja = da). Bez novog polja u stanju, pogledu i protokolu.
- Web: panel dobija `dead` (isti predikat iz `@zandar/game-core` nad pogledom) i uputu „Jači ♥ je već odbijen — na ovu kartu niko ne može ništa.” (`sr.raub.deadHint`). Pravila u igri (`RaubRules.tsx`) i spec (pravilo 4, rubni slučajevi, odluka 31) dopunjeni.

**Mjereno:**
- game-core 458 testova (+6: J♥→10♥ mrtva, K♥ živa, poređenje sa svim ranijim, mrtva treća → refa, bot kaže Dalje, parametar i stari snapshot). Web 253 (+1). Typecheck čist.
- `simulate:raub` 10.000 × 4P: 0 grešaka karata i štihova, 0 odbijenih akcija, 0 zaglavljenih; refa 3,1 % (bilo 2,8 %), medijan 23 ruke, 35,9 min.

**Stari APK (1.4.4):** pravilo je na serveru; stara aplikacija na mrtvoj karti vidi samo dugme „Dalje”, bez upute.

**Nije provjereno na uređaju.** Server mora na deploy (pravilo je u motoru).

## 187. Žandar — karta kreće na dodir, bez čekanja servera (2026-11-18, `feat/tap-odziv`)

**Povod:** igrači kažu da poslije dodira na kartu „kao da duže traje". Server nije usko grlo (~1–5 ms), već klijent: poslije drugog dodira ništa se nije micalo dok se odgovor ne vrati iz `iad` (~130 ms + render + 260 ms slijetanja), a jedini znak dodira je bilo sivljenje cijele ruke na 0.4 — djelovalo je kao zamrznut ekran. Drugi dodir dok protivnikov potez još animira (QA P6, changelog 106) se nije ni SLAO dok animacija ne završi: +780 ms (bacanje) / +1045 ms (kupljenje).

**Šta:**
- **Karta poleti iz ruke odmah** (`flyCardFromHand` u `flyAnimation.ts`): duh na `body`-ju, ruka kartu sakrije i ponovo se raširi. Na mirnom stolu duh ide na sredinu, pa prava karta tamo samo slegne (`landFrom = "self"`, nova CSS varijanta za `.table__slot--landing` i `.table__played`). Dok sto još animira tuđi potez, duh staje na donju ivicu stola da ne pokrije kupljenje koje igrač gleda. Server je i dalje jedini sudija: odbijen potez vraća kartu u ruku letom unazad, a odgovor koji ne stigne za 5 s (pad veze) takođe (`PLAY_STALL_MS`).
- **Ruka se više ne sivi dok se čeka server** — samo kad nije tvoj red.
- **Zvuk i vibracija na dodir:** podizanje = tihi klik (`lift`) + 8 ms, potez = `place` + 14 ms. `place` pri slijetanju MOG poteza se preskače (bio bi eho); auto-potez ga zadržava.
- **Drugi dodir dok sto animira šalje potez ODMAH**, računat nad pravim `state.table` (force-capture se ne gubi). U red ide samo dodir kojem treba izbor grupe — to traži miran sto.
- **`useTableBeat` ima red snapshota:** potez koji stigne usred beat-a više ne prekida tuđi let (ranije je sto skakao), nego čeka svoj red; sto za to vrijeme crta PRIKAZANO stanje. Pauza/prekid ne čeka. Najviše 4 u redu (botovi igraju najranije za 1,5 s, pa se red u praksi ne puni). `seen` je tačno zadnja primljena verzija, ne maksimum — nova partija kreće od manje verzije, a maksimum bi pri renderu petljao.
- **Podizanje karte** 260 ms sa odskokom → 150 ms bez odskoka (`--t-card-lift`, važi i za Poker/Raub).
- **Socket ide pravo na WebSocket** (`transports: ["websocket", "polling"]` + `tryAllTransports`), bez long-polling koraka pri (re)konektu.

**Mjereno** (CDP, headless Chrome 390×844, lokalni server, partija 1v1 protiv bota): duh i nestanak karte iz ruke **4–7 ms** poslije dodira, u svim slučajevima. Dodir tokom protivnikovog beat-a: server potvrdi za 5–16 ms (ranije poslato tek poslije ~0,8–1 s), karta sleti kad protivnikov let završi (640–1090 ms), bez prekidanja. Pad veze usred poteza: karta se vrati u ruku za 5,2 s, a kad se veza vrati potez prođe. Snimci potvrđuju da duh na ivici ne pokriva tuđe kupljenje. Chrome-ova emulacija latencije ne usporava WebSocket okvire, pa je dobitak protiv `iad` procjena: ~400–480 ms do prvog pokreta → ~5 ms. web 259 testova (+9: red snapshota, slanje odmah, force-capture), typecheck, lint = osnovica, `next build`.

**Nije dirano:** dva dodira po potezu ostaju (odluka vlasnika). Odbrojavanje i dalje renderuje sto 4×/s (izdvajanje bi diralo `PlayerSeat`/`TurnBanner` koje dijele Poker i Raub; dodir nije tu usko grlo). Selidba servera u EU region (`iad` → EU, RTT ~130 → ~35 ms) je zasebna stavka.

**Nije provjereno na uređaju.** Na S10e provjeriti: vibracija na dodir (`VIBRATE` je u manifestu, `navigator.vibrate` u WebView-u), osjećaj leta od ruke do stola, i da se nijedan dodir ne gubi (mjerenje iz QA P6).

## 188. Prevlačenje karata uz tap — Žandar i Raub, web i aplikacija (2026-11-18, `feat/card-drag`)

**Šta:** igrači traže da kartu mogu i da prevuku na sto, kao u drugim igrama. Tap ostaje kakav jeste: prevlačenje je druga opcija, uvijek uključena, bez podešavanja. Žandar: ruka → sto ili ruka → konkretna grupa kupljenja. Raub: samo štih (faza igranja). Odbacivanje i zamjena su izbor sa potvrdom, pa tamo ostaje tap. Poker nema poteza kartama. **Svjesno odstupanje od pravila „UI samo za web“ (odluka vlasnika 18.11.2026):** ista izmjena ide i u aplikaciju, a tamo stiže tek novim paketom.

**Kako:**
- `lib/useCardDrag.ts` koristi Pointer Events i delegaciju na kontejneru ruke, bez biblioteke.
  - `pointerdown` ništa ne pomjera. Prevlačenje počinje tek poslije 8 px (`DRAG_SLOP`). Ispod toga pregledač opali običan `click`, pa tap ide istim putem kao ranije. `click` poslije prevlačenja se proguta.
  - Duh je `makeGhost` iz `flyAnimation`, a pomjera se samo njegov `transform`, u rAF-u. Mete se mjere na početku i još tri frejma (dok sto ne nacrta grupe za podignutu kartu). Pogodak ide nad zapamćenim pravougaonicima. React se ne renderuje dok karta putuje.
  - Mete: `[data-drag-option]` (grupa kupljenja, ima prednost) i `[data-drag-target]` (sto). Pogođena meta dobija `data-drag-hover`.
- Odluku donosi čista funkcija `decideHandDrop` u `lib/handTap.ts`, sa istim pravilima kao drugi tap:
  - grupa → ta grupa;
  - sto → trail, jedino kupljenje ili izbor grupe (prisilno nošenje nikad ne postaje trail);
  - sto u animaciji → red (`resolveQueuedPlay`);
  - nije moj potez → ništa.
- Na početku prevlačenja karta se podigne, pa sto odmah pokaže grupe. Ako je puštena van mete, izbor se vraća na prethodni.
- CSS: `touch-action: none` ide SAMO na karte koje se smiju vući (`.hand[data-draggable]`), inače WebView opali `pointercancel`. Haptika `pick`/`drop`.
- `/dev/game` sad bilježi poteze u `window.__devPlays`, za headless provjeru.

**Mjereno:**
- Web testovi 259/259 (+7 za `decideHandDrop`). Typecheck čist, lint na osnovici.
- Headless Chrome 390×844, CDP miš, 9/9:
  - tap-tap igra;
  - prevlačenje na sto šalje isti potez kao tap-tap;
  - van stola nema poteza i karta se vraća;
  - pomak ispod praga je tap;
  - spuštanje na grupu uzima baš tu grupu;
  - konzola bez grešaka.
- Raub (`/dev/raub`): u štihu prevlačenje šalje `play` te karte, a u zamjeni nema prevlačenja.
- Performanse, 60 pomjeranja na 4× sporijem CPU-u (`next dev`), prevlačenje naspram mirovanja: layout 4 naspram 3, fps 56 naspram 57, skripta oko 2 ms više po pomjeranju.
- **Zamka:** CDP `Input.dispatchTouchEvent` u headless Chromeu ne radi pouzdano (pada i običan tap), pa se provjerava mišem. Isto tako, PWA baner „Dodaj na ekran“ u headlessu pada preko ruke.

**Popravka poslije prvog APK-a (S10e):** karta se „uhvati, ali ne ide nigdje“. Zapis događaja sa telefona: prevlačenje krene, ali ~17 ms kasnije WebView preusmjeri dodir (`lostpointercapture`), a hook je to brojao kao prekid. Poslije toga `pointermove` više nije stizao do ruke. Sada se pomjeranje i puštanje prate na `window`, bez `setPointerCapture`, a prekid je samo `pointercancel`. Headless test mišem ovo ne može da uhvati.

**Nije provjereno na uređaju:** dodir u WebView-u (bez skrola i zuma pri vuči), haptika, Raub štih prevlačenjem.

**Spajanje sa tap-odzivom (187), 18.11.2026:** oba rada diraju isti put dodira; git ih je spojio sam (konflikt samo u changelogu). Jedna stvarna nespojivost je ispravljena ručno. Tap-odziv u `play()` odmah pušta let karte iz RUKE (`flyCardFromHand`), a drag je duha brisao prije poteza, pa bi karta spuštena na sto skočila nazad u ruku i tek onda poletjela. Sada `useCardDrag` zove `onDrop` dok je duh još na mjestu spuštanja, a `flyCardFromHand` kreće iz `.card-drag-ghost` ako postoji. Duh se briše u `finally`. Web 268 testova, typecheck čist.

## 189. Izdanje 18.11.2026 — produkcija i AAB 1.4.5 (`versionCode 11`)

**Šta:** `production` 9c8e6dc → `7871983` (fast-forward). Raub odluke 29, 30 i 31 (183, 185, 186), Žandar karta kreće na dodir (187), prevlačenje karata uz tap za Žandar i Raub (188).

**Redoslijed:** tap-odziv rebase na `main` (konflikt samo u changelogu, prenumerisan 184 → 187), pa prevlačenje komitovano iz glavnog foldera i rebase preko njega (184 → 188, jedna ručna popravka leta poslije spuštanja). Staging APK iz čistog worktree-a `zandar-apk` (napravljen ponovo, nije postojao), vlasnik provjerio na S10e: prevlačenje, tap, Raub 29–31, poker — „sve je ok”.

**Mjereno:** web 268 testova, game-core 458, typecheck čist, lint dodirnutih fajlova čist. Deploy `7871983`: Railway staging i produkcija „Success”, oba Vercel projekta gotova, `zandar-test…/health` → `env: production`, kartaonica.com 200. AAB `jar verified`, `com.kartaonica.zandar`, `versionCode 11`, `versionName 1.4.5`.

**Preostaje:** upload AAB-a na Play (vlasnik); provjera ažuriranja 1.4.4 → 1.4.5 sa Play-a; `♻ Restored N room(s)` u produkcijskom Railway logu nije gledan (nema pristupa logu odavde).

## 190. Pozivnica za poker i Raub — slika igre (2026-11-20, `fix/poker-invite-motif`)

**Šta:** QA 2026-11-07 PK-B1 — gost na pozivnici poker stola vidi Žandar. Tekst („te poziva na partiju Pokera") i red ispod („N / M igrača · Poker · 100 žetona") su već bili popravljeni uz Raub (`eb2615d`, QA 2026-11-09 B2), ali je lepeza iznad poziva i dalje bila tri poleđine Žandara. Sad `JoinRequestScreen` za poker i Raub crta tri prave karte igre iz `GAMES` (`listCards` + `deck`, isto kao `GameFan` na web početnoj): poker tri asa, Raub mađarice. Žandar je netaknut.

**Platforma:** web i aplikacija, bez `isNative` — ispravka greške, odluka vlasnika 20.11.2026. Aplikacija je dobija tek novim paketom.

**Pregled:** `/dev/lobby?game=poker|raub` (i prekidači zandar/poker/raub). Zamka: posuđeni `next dev` gađan preko `127.0.0.1` ne hidrira stranicu (Next blokira `/_next/hmr` sa drugog origina) — snimci moraju ići na `localhost`.

**Mjereno:** web 268 testova, typecheck čist, lint dodirnutog fajla čist; snimci 420 px širine za sve tri igre. **Nije provjereno na uređaju.**

## 191. Poziv prijatelja po igri stola — push i list (2026-11-20, `fix/poker-invite-motif`)

**Šta:** QA 2026-11-07 PK-B2 — poziv na poker ili Raub sto je u pushu i u listu poziva (`InviteInbox`) pisao „Žandar · 3 igrača · do 21". Server je igru već slao (`noticeOf` → `InviteNotice.game`, samo za poker/Raub), ali je ni `buildInvitePush` ni klijent nisu čitali.

**Kako:** jedan izvor teksta, `inviteSummary(game, igrača, cilj)` u `shared-types` (pored `parseGameId`): „Žandar · 4 igrača · do 21", „Poker · 3 igrača · 100 žetona", „Raub · 4 igrača · od 21 do 0" — isti rječnik kao red ispod naslova lobija. `buildInvitePush` prima opciono `game` (poziv u `index.ts` ga već prosljeđuje kroz `...notice`); web `InviteNotice` dobija `game?`, `sr.invite.incomingBody(game, …)`.

**Back-compat:** polje je opciono na oba kraja; bez njega ostaje Žandar tekst. Push tekst je serverski, pa ga i aplikacija 1.4.x dobija ispravnog čim server ode na deploy; list u aplikaciji tek novim paketom.

**Mjereno:** server 273 testa (novi slučaj po igri), web 269, typecheck shared-types/server/web, lint dodirnutih fajlova čist. **Nije provjereno na uređaju** (traži dva naloga).

## 192. Sto javlja da nema veze — Poker, Žandar, Raub (2026-11-20, `fix/poker-invite-motif`)

**Šta:** QA 2026-11-07 PK-B3 — bez mreže sto je izgledao živ (panel aktivan, sat teče), dodir nije stizao do servera i potez je istekao; poslije povratka mreže prvo pravo stanje je stizalo ~20 s kasnije. Nijedan sto nije pokazivao prekid VLASTITE veze, samo tuđe. Odluka vlasnika: sva tri stola, web i aplikacija.

**Kako:**
- `lib/connection.ts` `isConnectionLost` (čisto, testirano): prekid = pregledač offline ILI socket `disconnected`/`error`. Pregledač javi `offline` odmah; socket.io tek na ping timeout.
- `RoomScreen`: `navigator.onLine` kroz `useSyncExternalStore`; na `offline` pamti da je mreža padala, pa na `online` (`resume`) socket koji „misli da je povezan" dobija svjež transport (`disconnect` + `connect`) umjesto emita u mrtav — to je bilo ~20 s.
- `components/felt/ConnectionBanner.tsx` „Veza je prekinuta — vraćamo te…" (CSS na kraju `felt.css`, neprovidna, `width: max-content` — sa `left: 50%` se lomila u dva reda).
- Prop `offline` na `PokerScreen` (`busy`), `GameScreen` (`myTurn`) i `RaubScreen` (`myTurn` i `busy`). Sat ostaje — to je stvarni rok servera.

**Mjereno (headless Chrome, CDP `emulateNetworkConditions`, lokalni server):** traka se pojavi za ≤ 3 ms od prekida u sva tri stola; poker panel `disabled` na sva tri dugmeta; traka nestaje 3,8 s (poker), 0,5–3,6 s (Raub), 3,2 s (Žandar) poslije povratka mreže. Web 272 testa, typecheck čist, lint: samo 3 zatečene greške u `RoomScreen`. **Nije provjereno na telefonu** (pravi prekid Wi-Fi-ja / mobilnih podataka).

## 193. „Igraj" odmah reaguje dok se provjerava nalog (2026-11-20, `fix/poker-invite-motif`)

**Šta:** QA 2026-11-07 PK-B5 — bez sačuvanog imena prvi dodir na „Igraj" ~1 s nije radio ništa vidljivo, pa je igrač tapkao ponovo. U `start()` (`app/page.tsx`) se za vrijeme `fetchMe()` palio `playing`, ali ne i `playingSlug`, pa kartica nije znala da čeka; `busy` nije bio zaključan.

**Kako:** prije `fetchMe()` se postave `busy`, `playing` i `playingSlug`, poslije se otpuste (`play()` ponovo zaključa, ili se otvara list sa imenom). Važi i za web i za aplikaciju.

**Mjereno (headless Chrome, `/api/me` usporen na 1,5 s preko CDP `Fetch`):** stari kod — u 60 ms i 660 ms dugme i dalje „Igraj", nije zaključano; novi — „Tražim sto…", `disabled` već u 60 ms, drugi dodir ne šalje ništa. Lokalno `/api/me` odgovori za par ms, pa se kvar vidi samo uz usporenje (na stagingu je put preko Atlantika). Web 272 testa, typecheck čist, lint `page.tsx` čist.

## 194. Povratak igrača se javlja stolu, a odlazak više ne resetuje sat (2026-11-20, `fix/poker-invite-motif`)

**Šta:** QA 2026-10-24 B3 — Žandar: igrač se vrati poslije osvježavanja, a ostali i dalje vide „Ponovno povezivanje" dok neko ne odigra (`room:subscribe` je stanje slao samo tom socketu). B2 (po odluci vlasnika zajedno) — osvježavanje je kupovalo vrijeme: `handlePlayerDisconnect` → `broadcastGameState` → `routeTurnTimers` → pun rok igraču na potezu. Poker i Raub već javljaju povratak cijelom stolu (`onSubscribe` → `broadcast`), nisu dirani.

**Kako:** `broadcastGameState` = `routeTurnTimers` + novi `emitGameState` (slanje svima, analitika, `persistRoom`, BEZ rutiranja sata). Odlazak (`reconnecting`) i povratak (`connected`) koriste `emitGameState`; povratak koji skida pauzu i dalje ide kroz `resumeFromPause` (namjerno pun rok, kao ranije). Snapshot netaknut.

**Mjereno (socket.io E2E, lokalni server, 2P Žandar, B na potezu):** stari kod — rok pomjeren poslije B-ovog odlaska, A ne dobija stanje poslije povratka; novi — rok isti prije, za vrijeme i poslije odlaska/povratka, A vidi B `connected` za 7 ms. Server 273 testa, typecheck čist. Zamka: `TaskStop` ugasi `pnpm`, ali `tsx` dijete ostane na 3001 — sljedeći test tiho gađa stari kod; server za test pokretati direktno preko `tsx` (jedan proces).

## 195. „Vrati se za sto" na početnoj — QA 10-24 P2 (2026-11-20, `feat/resume-table`)

**Šta:** dok igrač sjedi za stolom, početna to kaže prva i vodi nazad jednim dodirom (tabla `UI_VratiSe`, V1–V6). Ista traka za Žandar, Poker i Raub. Igra mijenja samo boju, lepezu i stanje desno: Žandar „Vi 7 : 5 Oni" (2P „Ti 7 : 5 Marko"), Poker žetoni, Raub „do 0 ti fali N", lobi „3 od 4 igrača". Gornji red je „NA POTEZU SI" (zlatna tačka treperi), „IGRA SE BEZ TEBE" ili „STO TE ČEKA". Završena partija dok igrača nije bilo (V6) dobija „PARTIJA ZAVRŠENA" sa „Rezultat" i X. „Igraj" ili „Napravi sto" dok partija traje otvara list „Već igraš X" (V5): „Vrati se za sto" je glavno dugme, a „Napusti partiju i igraj …" radi isto što i izlazak za stolom.

**Odluke vlasnika (20.11.2026):**
- **Web i aplikacija.** Izuzetak od pravila „samo web", kao prevlačenje karata. Aplikacija dobija traku tek novim paketom: 1.4.5 je već `versionCode 12`, pa je sljedeći 13.
- **Sjedište prelazi na drugi uređaj** sa istim nalogom.

**Kako (server):** sobu pitamo server po igraču, ne localStorage. `apps/server/src/activeTable.ts`:
- `describeSeat(room, playerId)` je čista funkcija sa tri igre, lobijem, krajem i sjedištem koje više ne postoji.
- `pickTable` bira jednu traku: partija u toku, pa lobi, pa završena; među istima novija.
- Rute:
  - `POST /api/me/table` prima ključeve sjedišta sa uređaja (`zandar:session:*`) i opcioni Bearer. Uz provjeren uid pretražuje `getAllRooms()`, a odgovor nosi `claim: true` kad ključa na ovom uređaju nema. Sobe kojih nema vraća kao `gone`, pa ih klijent briše (djelimično QA P14).
  - `POST /api/me/table/claim` traži obavezan nalog. Izda novi ključ i u `sessionTokens` upiše novi hash (oblik snapshota isti). Stari socket tog sjedišta dobija `room:seat_moved` i izlazi iz sobe.
  - `POST /api/rooms/:id/leave` radi isto što i `room:leave`. Tijelo socket handlera je izvučeno u `leaveSeat()`, pa oba puta dijele kod.
- `guestId` se nikad ne koristi za izdavanje ključa, jer nije tajna.

**Kako (klijent):**
- `lib/activeTable.ts` pita na ulazu, na povratak u prvi plan i svakih 15 s dok je početna vidljiva.
- `lib/resumeView.ts` je čisti tekst i ton trake.
- Komponente: `components/home/ResumeBar.tsx` i `ResumeSheet.tsx`.
- Na webu traka stoji na mjestu trake aplikacije (dok ima partiju, ne nudimo preuzimanje). Na desktopu ide preko cijele kolone, sa naslovom „Ili izaberi novu igru".
- U aplikaciji je ispod marke. Kartice igara su tada niže (58 px) i bez „ZADNJE IGRANO" (`GameList compact`).
- `RoomScreen`: kraj partije viđen za stolom se pamti (`zandar:resume:dismissed`), pa početna ne nudi V6 za nju. Na `room:seat_moved` briše ključ i ide na početnu.
- Analitika: `table_resume_click` (`game`, `phase`, `my_turn`, `place`, `other_device`).

**Zamke:**
- Žandar soba na kraju partije ostaje `status: "playing"`; kraj je `gameState.phase === "match_finished"` (revanš je ponovo pokreće u istoj sobi). Zato zatvaranje V6 ide po `roomId:matchId`, a ne po sobi.
- Igrač se iz `room.players` skoro nikad ne briše. „Sjedi" se izvodi iz `left`, poker `seat.status` i `abandoned`.
- Klijent do sad nije slušao `room:kicked`. Zato je uveden poseban `room:seat_moved`, inače bi stari uređaj ostao na mrtvom stolu.

**Odstupanja od table:**
- Žandar u pauzi zbog mog odsustva (`paused_for_reconnect` / `abandon_vote`) daje „STO TE ČEKA" (zlatno), ne „IGRA SE BEZ TEBE". Žandar, za razliku od Pokera i Rauba, staje kad igrača nema.
- List V5 ima „Zatvori" na dnu (zajednički `Sheet`: Escape, Android nazad, fokus), umjesto X gore.
- V5 se otvara i za istu igru i za „Napravi sto" / „Igraj s prijateljima". Svaki novi sto napušta postojeći.

**Mjereno:**
- Testovi: server 292 (+20), web 276 (+8), game-core 458. Typecheck čist, lint na osnovici (5/2).
- Headless Chrome protiv lokalnog servera:
  - Quick Play Žandar → početna → „IGRA SE BEZ TEBE · Vi 0 : 0 Oni";
  - dodir vodi za isti sto;
  - desktop 1280: traka 1040 px i naslov „Ili izaberi novu igru";
  - „Igraj" Poker → list V5 → „Napusti…" → Žandar soba `finished`, novi sto Pokera, traka „98 žetona";
  - konzola bez grešaka.
- Harness na 360×740 i 390×844 (V1 app, V3, V6, lobi, pauza, 2P): bez vertikalnog i horizontalnog skrola, art u aplikaciji 58 px.
- Restart servera: `Restored 3 room(s)`, traka ostaje. REST izlazak sa Rauba gasi traku.
- `build:mobile` prolazi i izvoz nosi traku.

**Nije provjereno:**
- Prelazak sjedišta na drugi uređaj sa pravim Firebase nalogom: lokalni server nema Firebase, pa je pokriveno samo testovima ruta.
- Uređaj (S10e, staging APK), uključujući ponovno pokretanje aplikacije.

## 196. Poker dobija zvuk i vibraciju (2026-11-20, `fix/poker-sound`)

**Šta:** QA 2026-11-07 PK-B8 — prekidači zvuka i vibracije su stajali na poker stolu, ali poker nije zvao ni `playSfx` ni `vibrate`, pa nisu radili ništa.

**Kako:** `lib/pokerSound.ts` (čisto, testirano) kaže šta ide uz koji korak priče stola: dijeljenje → `deal`; ulog i ulozi u pot → novi `chips` (moj ulog i vibracija `play`); check → tih `lift`; fold → ništa; pot meni → `win` + vibracija `capture`, tuđi → `chips`. `usePokerBeat` ga pušta tačno uz let (`runPokerFx`), ne u pozadini (priča se tada sabija u trenutak). `PokerScreen` na prelaz: moj potez → `turn` + vibracija (kao Žandar), sat mog poteza na ≤ 5 s → novi `warn` (dva tiha tona) + vibracija, kraj meča → `win`/`lose` po mom mjestu. Otvaranje stola usred poteza ili poslije kraja ne zvoni. Novi zvukovi su samo dodati u `lib/sound.ts`; Žandar netaknut.

**Mjereno (headless Chrome, lokalni server, špijun na `createOscillator`/`createBufferSource` i `navigator.vibrate`):** prekidači upaljeni — 16 zvučnih događaja do mog poteza (dijeljenje, blindovi, ulozi), vibracija 25 ms na moj potez, na 5 s dva tona + vibracija, 26 ukupno poslije mog poteza; prekidači ugašeni — 0. Web 275 testova, typecheck, lint dodirnutih fajlova čist. **Ušima i rukom na telefonu nije provjereno.**

## 197. Poker i Raub lobi: „Počni odmah" umjesto prekidača (2026-11-20, `fix/poker-sound`)

**Šta:** QA 2026-11-07 PK-P2 — host u poker lobiju je vidio prekidač „Ostavi mjesta prazna / Popuni prazna mjesta". Poker i Raub lobi nemaju „Pokreni igru": server na popunjavanje odmah pokreće meč (`bot-fill` → `startIfFull`, po speci). Prekidač se čitao kao podešavanje, pa je host koji ga samo isproba pokretao partiju bez pozvanih prijatelja.

**Kako (samo klijent):** u `LobbyScreen` host poker/Raub stola dobija dugme „Počni odmah" (isti stil kao Žandarovo „Pokreni igru", „Pokrećem…" dok traje) i red „Prazna mjesta popunjavaju protivnici. Ili sačekaj prijatelje — partija počinje čim se mjesta popune." Dugme zove isti `setBotFill(true)`. Bez riječi „bot" (HARD RULE 5). Žandar lobi netaknut; server netaknut. `/dev/lobby?game=poker|raub` sad prikazuje i lobi te igre.

**Mjereno (lokalni server + headless Chrome, privatni poker sto za 4):** prekidača nema, dugme „Počni odmah"; 3 s bez dodira soba ostaje `waiting`; poslije dodira sto za 130 ms. Web 275 testova, typecheck, lint dodirnutih fajlova čist. **Nije provjereno na uređaju.**

## 198. Ekran prije partije „Miješamo špil" — traje koliko i stvarno učitavanje (2026-11-20, `feat/shuffle-screen`)

**Šta:** dizajn je tabla „UI · Ekran prije partije — K1 miješanje špila" (`UI_MijesanjeSpila`) na platnu „Kartaonica · identitet". Tabla ima tri stanja:
- S1: špil se miješa na stolu dok igrači sjedaju;
- S2: „Svi su tu. Počinjemo!" — karte uskoče u gomilu, špil kucne o sto, zlatni krug i sjaj oboda, ukupno 0,65 s;
- S3: smanjeno kretanje.

Vlasnik je tražio da ekran traje tačno koliko i stvarno učitavanje.

**Zašto:** prije stola su se vidjela dva ekrana, i nijedan nije pratio učitavanje.
- `/matching` je za Žandar imao ~3,85 s izmišljenog sjedanja: `PACE.zandar` = 400 + 3×650 + 600 + 900 ms. Server je partiju već pokrenuo u odgovoru na `/api/quickplay`, a botovi sjedaju svi odjednom.
- Zatim je slijedio još jedan ekran, „Učitavanje stola...", dok socket ne javi `game:state`.

**Kako:**
- „Igraj" (`startQuickPlay`) i „Novi sto" idu pravo na `/room?id=` i postavljaju oznaku `zandar:intro` (sessionStorage, po sobi). `RoomScreen` uz tu oznaku crta `components/funnel/ShuffleScreen`.
- **Ulaz u S2 je dolazak prvog stanja partije.** Sat od 650 ms počinje tada (`SHUFFLE_EXIT_MS`). Prvi krug se ne čeka, a karte uskaču iz tačke u kojoj jesu.
- Na sporoj mreži socket zna stići prije REST-a sobe. Tada „Počinjemo!" ostaje dok i soba ne stigne. Ranije je tu bljesnulo „Učitavanje...".
- Povratak u partiju koja traje (reload, „Vrati se za sto", link) nema oznaku, pa ide pravo na sto. Privatni lobi je netaknut.
- `/matching` i `/matching/:id` sad samo prosljeđuju. `MatchingScreen`, `funnel/MatchingTable` i `sr.matching` su obrisani.
- Igrači: inicijal u krugu sa bojom iz imena (`initialTone`, uvijek ista za isto ime) ili avatar naloga. Prazno mjesto je „slobodno".
  - Mjesta prate `lib/seating.ts`: +1 desno, +2 gore, +3 lijevo. Igrač ne preskoči stranu kad sto stigne.
  - Igrač iskoči kad ga server javi, ne po satu. Poker i Raub botovi sjedaju tek s početkom meča, pa S2 uzima igrače iz samog stanja.
- Špil je 10 poleđina. Keyframe-ovi su sa table 1:1: krug od 3 s, pet faza, samo `transform`/`opacity`.
  - Izlaz čita `getComputedStyle().transform` svake karte i špila u layout effectu, gasi CSS petlju i vodi ih WAAPI-jem u gomilu (250 ms). Zatim CSS kucanje (400 ms).
- Zvuk: jedan „tup" (`place`) na kucanju, uz prekidač zvuka.
  - **Odstupanje od table:** nema šuškanja u petlji, jer bi se ponavljalo svake 3 s dok se čeka.
- Tokeni: `--t-shuffle-*` (kolapsiraju pod reduced-motion), `--ease-shuffle`, `--wood-1/2`, `--seat-tone-0..4`.
- **Web i aplikacija** (odluka vlasnika, izuzetak od „samo web"). U aplikaciju stiže tek novim paketom.
- **Mjerenje u aplikaciji:** `performance.mark` `shuffle:state` i `shuffle:table` ostaju i u produkciji, za WebView devtools.

**Zamka:** Tailwind preflight `img{max-width:100%}` je stiskao karte na širinu špila (0 px), pa se špil nije vidio. Rješenje je `max-width:none` na `.shuffle__card`.

**Mjereno** (headless Chrome, pravi put od početne, lokalni server, `performance.mark`, od klika):

| | Ekran miješanja | Stanje stiglo | Sto | Izlaz S2 |
|---|---|---|---|---|
| Žandar | 117 ms | 118 ms | 809 ms (ranije ~4,5 s) | 657 ms |
| Poker | 113 ms | 2021 ms (prozor 2 s) | 2714 ms | 662 ms |
| Raub | 113 ms | 2025 ms | 2719 ms | 657 ms |
| Žandar, 400 ms latencije i 50 kB/s | 999 ms | 1002 ms | 1869 ms | 660 ms |

- U svim mjerenjima: bez „Učitavanje..." i bez `/matching`.
- Reload partije u toku: odmah sto, bez miješanja.
- Snimci 360×740, 360×640, 390×844 (2P/3P/4P), S2 usred riffle-a (bez skoka) i reduced-motion. Pregled: `/dev/shuffle?n=&game=&arrive=&ready=`.
- Web 295 testova (+12 `shuffleView`), typecheck čist, lint 4 greške + 2 upozorenja (ispod osnovice 5/2, sve zatečene), `build:mobile` prolazi i izvoz nosi ekran.

**Nije provjereno na uređaju** (staging APK, S10e): tempo okom, zvuk kucanja, Android WebView `getComputedStyle` za izlaz.

## 199. „Miješamo špil": ostali igrači sjedaju jedan po jedan (2026-11-20, `feat/shuffle-seats`)

**Šta:** vlasnik je ekran iz unosa 198 pogledao na S10e. Kod Žandara su svi igrači stajali za stolom odjednom, jer server sto popuni u istom trenutku. Odluka vlasnika:
- igrač je tu odmah, a ostala tri sjedaju jedan po jedan, nasumičnim tempom;
- duži tempo, oko 3 s.

Ovo je svjesno odstupanje od „ekran traje koliko i učitavanje" iz unosa 198.

**Kako:**
- `arrivalSlots` (`lib/shuffleView.ts`) daje kumulativne nasumične razmake od 800 do 1200 ms, od trenutka kad se ekran pojavi.
- `revealAt` = max(termin, trenutak kad server javi igrača, prethodni + 300 ms). Igrač nikad ne sjedne prije nego ga server javi, a poker i Raub botovi, koji stižu zajedno, ipak sjedaju redom.
- `lib/useSeatArrivals.ts` drži tajmere i zove `onAllSeated` iz tajmera kad sjedne zadnji.
- `RoomScreen` pokreće S2 tek kad je stiglo stanje partije **i** sjeo zadnji igrač (`maybeExitIntro`, mark `shuffle:seated` / `shuffle:exit`).
- Povratak u partiju koja traje i dalje ide pravo na sto.

**Mjereno** (headless Chrome, lokalni server, od klika):

| | Sjedanja | Sto |
|---|---|---|
| Žandar | 1,01 / 1,89 / 2,86 s | 3,53 s (u 198: 0,81 s) |
| Poker | 2,07 / 2,35 / 3,29 s (botovi javljeni na 2,02 s) | 3,96 s |
| Raub | 2,04 / 2,37 / 3,02 s | 3,66 s |

- Reload: odmah sto.
- Web 298 testova (+3), typecheck čist, lint na osnovici.

**Zamka:** glavni folder je u međuvremenu prešao na granu druge sesije (`feat/table-menu`) sa njenim nekomitovanim izmjenama. Ovaj rad je zato prenesen i komitovan iz worktree-a `zandar-seats`.

**Nije provjereno na uređaju.**

## 200. „Svi su tu. Počinjemo!" se drži pola sekunde duže (2026-11-20, `feat/shuffle-seats`)

**Šta:** vlasnik je na S10e javio da S2 „previše brzo nestane i nije efektivno". Pokreti ostaju kao na tabli: karte u gomilu za 250 ms i kucanje za 400 ms. Poslije njih se završna slika (podignut špil, zlatni krug i obod, „Partija počinje") drži još `SHUFFLE_HOLD_MS` = 500 ms. Sto zato stiže 1,15 s poslije zadnjeg igrača, a ne 0,65 s. Žandar je na ~4,0 s od klika. Web 298 testova, typecheck čist. **Nije provjereno na uređaju.**

## 201. Meni za stolom: dugme gore lijevo, zvuk na stolu, „nazad" otvara meni, karte za Raub (2026-11-20, `feat/table-menu`)

Izvor: tabla „UI · Gdje je dugme za meni" (`UI_MeniPozicija`, M1 + M6 + M7) i novi izgled menija „M" sa table „UI · Meni za stolom". Važi za Žandar, Poker i Raub, **na webu i u aplikaciji** (odluka vlasnika, izuzetak od „samo web").

- **M1 — dugme menija:** `.felt-header__menu` je krug od 48 px sa tamnom podlogom i obrubom. Ranije je bila gola ikonica koja je na feltu djelovala kao šara.
  - Poker traka je kraća („Blindovi 1/2 · još 5 ruku"), jer je „sljedeći nivo za 5 ruku" na 360 px ulazio pod dugme. Puni podatak je u meniju.
- **Zvuk na stolu (`TableSoundButton`):** okruglo dugme iznad dugmeta za reakcije, na njegovoj strani. Koristi isti ključ `zandar:sound` kao pločica u meniju.
  - **Odstupanje od table:** tabla crta zvuk desno i na pokeru. Izmjereno je da tamo preklapa tvoje karte (12×10 px) i natpis jačine ruke, pa je i na pokeru iznad reakcija, lijevo.
  - Vibracija ostaje samo u meniju.
- **Meni „M" (`GameMenuSheet`):**
  - Zaglavlje nosi ime igre, red stanja (`lib/tableMenu.ts`) i X. Red stanja:
    - Žandar: „4 igrača · do 21" (prijedlog, nije na tabli)
    - Poker: „Blindovi 1/2 · sljedeći nivo 2/4 za 5 ruku"
    - Raub: „4 igrača · od 21 do 0"
  - Zvuk i vibracija su pločice. „Pravila igre" je red sa strelicom. „Napusti partiju" je odvojen i crven.
  - Nema dugmeta „Zatvori": meni zatvaraju X, dodir pored menija ili „nazad".
- **M6 — „nazad" dok partija traje otvara meni.** Izlazak ide u dva koraka: meni → „Napusti partiju" → postojeća potvrda.
  - Back u pregledaču (`useBrowserBackGuard`) sad zove `runBackHandler()`, pa se web ponaša kao Android: otvoren sloj se zatvara prvi, inače se otvara meni.
  - Kad partija ne traje (kraj meča, poker bez žetona), „nazad" izlazi odmah, kao ranije.
- **M7 — karte u Raubu:** u meniju je izbor Mađarice | Klasik (`RaubDeckPicker`).
  - Izbor se pamti na uređaju (`zandar:raub:deck`, `useRaubDeck`). Podrazumijevane su mađarice; nepoznata vrijednost znači mađarice.
  - Izbor mijenja samo prikaz: `CardDeckContext` i `data-deck` na stolu, ikonicu boje u tekstu (Klasik: ♠♥♦♣ u boji karte) i `cardLabel` (J/Q umjesto U/O).
  - Server, pravila i početna pločica nisu dirani.
  - Francuska karta je pri istoj visini ~10 % šira od mađarice, pa je na 360×740 peta karta ulazila 18 px pod dugme za zvuk. Zato u Raubu ruka sa klasičnim kartama zadržava širinu mađarice (karta je ~10 % niža), pa se raspored ne mijenja.

**Zamka:** klase `.gamemenu*` dijele i Postavke, `Sheet` (potvrda izlaska), `WebNameSheet` i Meta saglasnost. `.gamemenu__item` i `.gamemenu__close` su zato ostale kakve su bile, a novi meni ima vlastite klase (`__row`, `__tile`, `__exit`…). Prvi pokušaj ih je mijenjao.

**Mjereno** (headless Chrome, `/dev/*`, 360×740, 360×640 i 390×844):
- Meni staje bez skrola i u najdužem slučaju (Raub sa izborom karata, 360×640).
- Dugme za zvuk ne preklapa nijednu kartu (Žandar, Poker 2P/3P/4P, Raub u svim stanjima, oba kompleta). Izuzetak su zatečena 2 px mađarice na 360×740.
- Ruka sa klasičnim kartama ostaje unutar ekrana, bez horizontalnog skrola.
- „Nazad" u pregledaču u sve tri igre: otvori meni → zatvori → otvori → „Napusti partiju" → potvrda → „nazad" = „Ostani".
- Web 298 testova (+3 `tableMenu`), typecheck čist, lint 4 greške + 2 upozorenja (sve zatečene), `build:mobile` prolazi i izvoz nosi meni.

**Nije provjereno na uređaju:** Android „nazad" na S10e. Aplikacija dobija izmjenu tek novim paketom.

## 202. 1.4.5 nije slala klijentske događaje u PostHog; 1.4.6 i straža u buildu (2026-11-20, `fix/apk-1.4.6`)

**Simptom:** od 19.11. iz aplikacije sa Play-a nije stigao nijedan klijentski događaj (`$host = localhost`, `app_version = 771a526`). 1.4.4 (`397fb95`) i starije verzije su slale normalno i opadale kako su igrači prelazili na 1.4.5 (18.11.: 38 osoba, 19.11.: 12, 20.11.: 2). Serverski događaji (`match_started`/`match_ended`) za Android su stizali, pa rupa pogađa samo klijentske (`first_open`, `play_requested`, `$pageview`, pozivnice, ponude).

**Uzrok:** `NEXT_PUBLIC_POSTHOG_KEY`/`_HOST` dolaze samo iz `apps/web/.env.local`, koji nije u gitu. Worktree `zandar-apk` je napravljen iznova 18.11. u 22:47, prije builda 1.4.5, i nije imao taj fajl. U izvozu nije bilo nijednog `phc_` ključa, a `posthog.init(undefined)` ne baca grešku. Isto je falio `.env.sentry-build-plugin`, pa 1.4.5 nema source mapa u Sentryju (greške stižu, DSN je u kodu).

**Popravka:**
- `build-mobile.mjs` → `requireAnalyticsKeys`: produkcijski mobilni build (`NEXT_PUBLIC_APP_ENV=production`) odbija bez ta dva ključa. Provjera čita `.env*` istim učitavačem kao Next (`@next/env`), jer ih `next build` učita tek sam.
- 1.4.6 = `versionCode 13`, sa svim sa `main`-a (staging) od 1.4.5.

**Zamka:** novi worktree za izdanje ne nosi fajlove van gita. Pored `.env.local` i `.env.sentry-build-plugin` tu su i `android/local.properties` (Meta token), `android/keystore.properties` i `google-services.json`. Za posljednja dva build već odbija.

**Čitanje kohorti:** Android klijentski podaci od 19.11. do izlaska 1.4.6 su rupa i ne mogu se vratiti.

**Dopuna (isti dan):** build 1.4.6 je dvaput pao u `next build` na Turbopack grešci `next/font/google queries have exactly one entry` (i iz Git Bash-a i iz PowerShell-a; Google fontovi su dostupni, Avast ih trenutno ne presreće). Zato `build-apk.mjs` sada prima `--webpack` i prosljeđuje ga `next build`-u: `pnpm aab:prod -- --webpack`.

**Dopuna 2 (isti dan):** dvije zaštite više.
- `verifyAnalyticsInBundle` (`build-mobile.mjs`) poslije `next build` traži stvarnu vrijednost ključa u izvezenom JS-u. `build-apk.mjs` je zove prije `cap sync`, a `build:mobile` na kraju. Ispis nosi `✓ PostHog ključ u bundle-u: phc_xxxx…`. Ovo hvata i slučajeve koje provjera okruženja ne vidi (prazna vrijednost, bundler izbacio granu).
- PostHog upozorenje „Android igrači bez klijentskih događaja": broji igrače sa serverskim `match_started` (`platform = android`) koji istog dana nisu poslali nijedan klijentski događaj (`$host = localhost`). Istorija od 31.10.: 0 svaki dan (jednom 2), a 19.11. 9 i 20.11. 13. Obični prag na broju događaja ne radi, jer saobraćaj iz aplikacije skače od 0 do 16.000 dnevno, a stare verzije šalju dok traje prelazak. MCP veza prema PostHog-u je samo za čitanje, pa upozorenje pravi vlasnik u PostHog-u.

## 203. Bela: spec, tabla i motor (2026-11-21, `feat/bela-core`)

**Šta.** Nova igra Bela, za sada samo kao spec, wireframe i čist motor. Spec `docs/bela-spec.md` (v0.3): 4 igrača 2 na 2, mađarice, web i aplikacija (odluke 1–5). Vlasnik ne zna pouzdano varijantu, pa su pravila napisana kao nacrt P-1…P-17 sa prijedlogom i alternativom; prihvaćena su kako su predložena (odluka 7), a ispravke iz feedbacka igrača mijenjaju samo parametar u `BelaRulesConfig`, kao kod Rauba. Tabla `UI_Bela` (B1–B12) na platnu „Kartaonica · identitet". Motor: `shared-types/src/bela.ts`, `game-core/src/bela/` (`cards`, `config`, `declarations`, `match`, `view`, `bot`, `simulate`), skripta `simulate:bela`.

**Zašto ovako.**
- *Ruka u dva reda (odluka 8).* Prvi nacrt je bio jedan red, karta 64 px i korak 38 px, što daje 330 px. Vlasnik ga je ocijenio sitnim. Dva reda po 4 sa kartom 84×132 px izabrana su poređenjem na tabli `UI_Bela2Reda`. Cijena: ruka je visoka 196 px, sto gubi ~85 px, tvoje sjedište se ne crta (potez pokazuje traka iznad ruke), a na 360×640 dno donjeg reda je 7 px od ivice.
- *Zvanje uz prvu kartu (odluka 9).* Spec je imao posebne korake „uzmi talon" i „prijavi zvanja". Motor ih je spojio: talon ide u ruku čim je adut zvan, a `play` nosi `declare` (bez polja = prijavi). Tako se igra i za pravim stolom, a štedi četiri poteza sa tajmerom po ruci. Faze su samo `calling` i `tricks`.
- *`"bela"` van `GameId` (odluka 10).* `parseGameId` bi je odmah prihvatio, pa bi server pravio Bela sobe bez stola. Dodaje se u fazi 3.

**Mjerenja.** game-core 458 → 515 testova. `simulate:bela`, 10.000 mečeva (seed 1), za 501 i 1001: 0 grešaka karata, štihova i bodova, 0 odbijenih akcija, 0 zaglavljenih mečeva. Do 501: medijan 5 ruku, 13,4 min (p10 10,3, p90 16,2). Do 1001: medijan 9 ruku, 25,1 min. Prolaz 77,6 %, pad 21,7 % (kontrolni raspon iz speca 15–30 %), visi 0,8 %, štiglja 2,2 %, mus 15,6 %. Trajanje je isti model kao za Raub, ne mjerenje.

**Zamke.** Ugrađena izolacija worktree-a za agenta pada na ovoj mašini zbog razlike `c:` / `C:` u putanji („core.worktree redirect"); worktree se pravi ručno (`git worktree add -b … ../zandar-bela main`), kao `zandar-raub`.

## 204. Bela: server (2026-11-21, `feat/bela-server`)

**Šta.** Faza 3 iz `docs/bela-spec.md`. `"bela"` je u `GameId`, `parseGameId` i `GAME_PROTOCOL` (`"bela:1"`). Sto je `apps/server/src/bela/table.ts` (`BelaTables`), prepis Raub stola: rok poteza 25 s (`BELA_TURN_MS`), bot iz `getBelaView` 2,5–7 s, auto-potez kad istekne rok, sljedeća ruka i revanš samo host, pauza i glasanje iz `pause.ts`, `rearm` poslije hidracije. `index.ts`: privatni sto (samo 4 igrača, cilj 501/701/1001, bez polja 1001), poziv prijatelja, Quick Play (prozor `BELA_MATCH_WINDOW_MS` 2 s, pa botovi, do 501), socket `bela:action`, `game:nextHand`/`rematch`/`waitMore`/`abandonVote`, izlazak, prekid veze, sweeper. Analitika: `belaMatchLike` (timski plasman iz `placements`) za `match_started`/`match_ended` sa `game: "bela"`. „Vrati se za sto": stanje `score` (naš tim : njihov), kao 4P Žandar. Web: samo nazivi „Bela" / „Bele" u `sr.ts` i `shuffleView.ts` (provjera tipova ih traži).

**Zašto ovako.** Timovi po redu ulaska, mjesta 0 i 2 protiv 1 i 3 (odluka 15): isto kao 4P Žandar (`seatIndex % 2`) i isto kao motor, pa `teamId` u javnom igraču smije ostati (Raub ga briše jer nema timove). Revanš traži sva 4 igrača: bez partnera Bela se ne igra. Klijent ne javlja `"bela:1"` dok ne dobije ekran (faza 4), pa nijedan pravi igrač ne može za Bela sto — server je bezbjedan za deploy i prije weba.

**Mjerenja.** Server 293 → 316 testova (23 nova u `bela/table.test.ts`; spisak testova u `package.json` je izričit — novi fajl se mora upisati, inače se ne pokreće). Web 301, game-core 515, typecheck sva četiri paketa, lint = zatečena osnovica. E2E protiv lokalnog servera (socket.io klijent): stari klijent → `UPDATE_REQUIRED` i 426 na `join-request`; privatni sto sa 3 igrača i cilj 21 → 400; Quick Play → sto `do 501`; 5 ruku kroz `bela:action` (svaki put i pokušaj nedozvoljene karte — odbijen), bez `isBot`/`guestId`/špila/talona u stanju; server ugašen usred 6. ruke (7. štih), `♻ Restored 2 room(s)`, klijent se vratio za sto sa 2 karte u ruci i meč završio 435:597. 0 grešaka u logu servera.

**Zamke.** Ugrađeni `--test` spisak u `apps/server/package.json` (vidi gore).

## 205. Bela: ekran za web i aplikaciju (2026-11-21, `feat/bela-table`)

**Šta.** Faza 4 iz `docs/bela-spec.md`, po tabli `UI_Bela`. `components/bela/BelaScreen.tsx` (okvir kao Raub: felt, podloge, `PlayerSeat` sa `teamTone`, meni, reakcije, pauza, izlazak), `BelaParts.tsx` (rezultat „MI : VI" u zaglavlju, panel aduta i „Moraš zvati", traka zvanja uz prvu kartu, traka poteza, ruka u dva reda, pokazana zvanja, pregled ruke, tabela, kraj meča), `BelaRules.tsx`. Čist prikaz u `lib/belaView.ts` (+14 testova): sortiranje ruke (adut prvi), redovi, razlog zatamnjenja iz `legalCardIds`, zvanja riječima, ishod iz ugla gledaoca. Prekidač `lib/belaRelease.ts` (`belaLive`), `CLIENT_GAMES` javlja `"bela"`/`"bela:1"` samo uz prekidač. Bela na početnoj (boja šljive `--game-bela-1/2`, „Igraj" pravo u Quick Play), `/create` i „Pozovi na partiju" (uvijek 4, cilj 501/701/1001), lobi kreće sam ali pokazuje timove, `RoomScreen` prima `game: "bela"` i šalje `bela:action`. Pregled `/dev/bela?s=deal|call|must|talon|decl|trick|show|bela|handEnd|table|end|pause|vote` iz pravog motora.

**Zašto ovako.** Ruka su dva `PlayerHand`-a (isti dodir, prevlačenje i zatamnjenje kao druge igre), donji red leži preko gornjeg (gornji viri 4rem). Tvoje sjedište se ne crta (odluka 8), pa potez i razlog zatamnjenja nosi traka iznad ruke. Dugmad zvuka i reakcija su desno iznad ruke (pored ruke od 288 px nema 48 px), a sklanjaju se dok je otvoren panel aduta ili traka zvanja, da ne pokriju „Dalje" / „Ne zovem". MI/VI su `--team-a`/`--team-b`, iste boje kao prstenovi sjedišta.

**Mjerenja.** Web 301 → 315 testova; typecheck; lint bez novih grešaka; `next build --webpack` i `build:mobile` prolaze (Bela tekst i CSS u izvozu). CDP 360×740 svih stanja `/dev/bela`. Prava partija u headless Chromeu protiv lokalnog servera (`BELA_TURN_MS=3000`): Quick Play → sto za 2,1 s, zvanje aduta, traka „Kvarta u listu · 50", dvije ruke do pregleda i „Sljedeća ruka", rezultat uživo štih po štih, 0 grešaka u konzoli, riječ „bot" nigdje.

**Zamke.**
- Mađarica je uža od francuske karte iste visine (1.571 naspram 1.417): `--card-w-hand: 5.25rem` je dao kartu od 76 px. Za 84 px: `calc(5.25rem * 1.571 / 1.417)`.
- Zatamnjenje: providna karta donjeg reda pokazuje gornji red kroz sebe, pa mjesto karte dobija punu tamnu podlogu (`.hand__slot:has(> .card[data-dimmed])`). Tamni `::after`, `filter` i providnost lica headless Chrome (`--disable-gpu`) NIJE crtao iako su izračunate vrijednosti tačne (neprovidna crvena jeste) — zatamnjenje se provjerava na uređaju, ne CDP snimkom.
- Turbopack je servirao ustajao `felt.css` (pravila iz zadnjih izmjena nisu bila u CSS-u) — `rm -rf apps/web/.next` i restart (zamka iz CLAUDE.md, ponovo plaćena). Provjera: `curl` na serviran CSS i `grep` po selektoru.
- `next dev` ponovo upisao `apps/web/AGENTS.md` i `CLAUDE.md` — obrisani.
- Testovi početne su pretpostavljali tačno tri igre (`games.test.ts`, `homePrefs.test.ts` sa `bela` kao „igrom koje nema") — ispravljeni.

## 206. Bela beta: oznaka, prozor prvi put, prijava greške sa stola; 4 igre na web početnoj (2026-11-21, `feat/bela-beta`)

**Šta.** Zahtjevi vlasnika poslije prve probe na stagingu (`docs/bela-spec.md` odluke 16–18).
- **BETA:** `GameConfig.beta` (Bela), oznaka `BetaTag` uz ime u `WebGameCard`, `GameList`, `GameTile`, `GameCard`; u meniju stola „Beta · 4 igrača…". Zasebno od `gameBadge` (Novo / Zakačeno ostaju).
- **Prozor na prvoj partiji:** `BelaBetaSheet` — šta je beta i KAKO se prijavljuje (isto okruglo dugme kao na stolu, pulsira dok je prozor otvoren). Jednom po uređaju: `lib/belaBeta.ts`, ključ `kartaonica:bela:beta-seen`, čita se kroz `useSyncExternalStore`, skladište u `try/catch` (bez njega „viđeno" važi do kraja sesije).
- **Prijava greške sa stola:** `BugButton` na mjestu `TableSoundButton` (`ReactionFab aboveFab`) i red „Prijavi grešku" u meniju → `BelaReportSheet` = postojeći `FeedbackForm` sa `table={{ context }}` (X umjesto strelice, „Prijavi grešku", napomena da partija teče, „Nazad za sto"). `context` iz `belaReportContext` (sto, ruka, faza, verzija stanja, adut — bez karata). `FeedbackRequest.context?` u shared-types; server (`feedback.ts`) ga čisti kroz `cleanLine` (≤ 200), upisuje, šalje u mejlu („Partija: …") i izvozi u CSV. Opciono polje — stari klijenti i zapisi rade.
- **Bez zvuka na Bela stolu** (samo Bela; zvuk ostaje pločica u meniju).
- **Web početna sa 4 igre:** desktop red je bio za 3 kartice; `data-count="4"` → 4 jednake u redu. Produkcija i dalje bez Bele dok vlasnik ne upali `NEXT_PUBLIC_BELA=1`.

**Mjerenja.** Web 315 → 318 testova (`belaBeta`, `belaReportContext`), server 316 → 317 (`context` u parse/mejl/CSV); typecheck; lint po fajlu bez grešaka; `next build --webpack` i `build:mobile` (beta tekst u izvozu). CDP: beta prozor 360×740, sto sa bubom i bez zvuka, forma preko stola, početna 1280×800 (4 u redu) i 390×844. E2E: prijava poslata iz forme na Bela stolu u `/dev/bela` → lokalni server → zapis u `_feedback` sa `context` „Bela · sto dev · ruka 3 · Štih 2 od 8 · v83 · adut žir".

**Zamke.**
- `/dev/home` je imao `order = ["zandar","poker","raub"]`, pa je Bela (`indexOf` = −1 < live) uvijek bila „živa" u pregledu — dodata na spisak.
- `markBelaBetaSeen` direktno kao `onClick` bi dobio događaj klika umjesto skladišta — omotano u `() => markBelaBetaSeen()`.
- Python u bash heredoc-u je `\n` u TS stringu pretvorio u pravi prelom reda (test nije prolazio parsiranje) — ispravljeno ručno.

## 207. Bela beta prozor: samo pokazuje dugme, bez „Prijavi grešku sada" (2026-11-21, `feat/bela-beta-copy`)

**Šta.** `BelaBetaSheet` više nema dugme „Prijavi grešku sada" (ni prop `onReport`); ostaje jedno „Razumijem". Pokazna buba je veća (3.5rem, ikonica 1.75rem), a tekst kaže kad i gdje: „Kad nešto ne radi kako treba, dodirni ovo dugme — stoji desno iznad tvojih karata. Isto je i u meniju: Prijavi grešku." Uklonjen `sr.bela.beta.reportNow`.

**Zašto.** Vlasnik sa telefona: prijava na prvom ekranu nema logike — igrač još nije igrao, pa nema šta da prijavi. Prozor treba samo da nauči gdje je dugme i kako izgleda.

**Provjera.** Typecheck, lint (`BelaParts`, `BelaScreen`), web 318 testova; CDP `/dev/bela?s=trick&beta=1` 360×740 — jedno dugme.

## 208. Bela beta prozor prije ulaska za sto, ne na stolu (2026-11-21, `feat/bela-beta-gate`)

**Šta.** Beta prozor (odluka 16) više nije na Bela stolu. Iskače prije ulaska: `components/bela/BelaBetaGate.tsx` (`useBelaBetaGate`) — `gate(game, go)` za Belu, ako prozor nije viđen, pokaže ga u fiksnom sloju (`.bl-beta-gate`, z 90) i `go` zove tek na „Razumijem"; „nazad" zatvara bez ulaska. Ulazi: početna `start()` (svi „Igraj", web i aplikacija), `/create` („Napravi sto"), `InviteInbox` (prihvati poziv), `JoinFlow` (zahtjev preko linka). Sa stola uklonjeni prozor i pulsiranje bube.

**Zašto.** Vlasnik sa telefona: partija je tekla iza prozora. Server pokreće Bela meč čim igrač sjedne (Quick Play odmah, botovi), pa jedini način da igra ne krene prije „Razumijem" je da zahtjev za sto ode tek poslije njega.

**Provjera.** Typecheck, lint (bez novih grešaka; `JoinFlow` ima zatečenu), web 318 testova, `next build --webpack` i `build:mobile`. E2E na `/` (390×844, presretnut `fetch`): klik na Bela „Igraj" → prozor, 0 poziva `/api/quickplay`; „Razumijem" → prozor nestaje, 1 poziv, „viđeno" upisano; drugi klik → bez prozora, odmah 1 poziv. `elementFromPoint` po cijelom ekranu pogađa sloj prozora (svjetliji donji dio na CDP snimku je ista headless greška sa providnošću iz unosa 205).
