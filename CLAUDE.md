# CLAUDE.md — Žandar (Kartaonica)

> Standing rules for this project. Loaded automatically at the start of every Claude Code session.
> Spec / source of truth: `docs/PRD_Zandar-v3-1.md` (currently v3.2). Status snapshot below.
> Arhiva: prethodne verzije spec-a i design system-a su u `docs/archive/` (PRD v2, PRD v3.1, DESIGN_SYSTEM v3.1, skica matchinga).
> Read the relevant PRD section before implementing; flag any deviation.

---

## Project

Web multiplayer card game (Žandar) for the ex-Yu market. Private invite rooms already work; v3 adds AI bots, a public **Quick Play** mode, a realistic random-name system, and difficulty/DDA balance. Monetization (later) is ads + non-cashable cosmetic coins.

## Architecture (monorepo — PRD §11.2)

```
apps/web              Next.js frontend
apps/server           Node.js + Socket.IO backend (authoritative)
packages/game-core    Pure TS game engine (no UI, no network)
packages/shared-types TS types shared by web + server
```

## Deployment (Railway, GitHub auto-deploy)

- **Hosting: Railway.** Server servis (`apps/server`) je povezan na GitHub repo `Trivaaa/zandar`, grana `main`, s **auto-deploy na push**. Nema CI skripte ni ručne deploy komande — `git push origin main` = build + redeploy.
- **Server build/run:** Nixpacks · build `pnpm install --frozen-lockfile` · start `pnpm --filter=@zandar/server start` (= `tsx src/index.ts`). Region `iad`. Domen servisa: `zandar-test.up.railway.app`.
- **Provjera deploya:** Railway dashboard → server servis → Deployments (svaki red = jedan push). Hash pored imena servisa je Railway **deployment ID**, NE git SHA (git SHA je pod "Deployed via GitHub").
- **Web (`apps/web`):** **LIVE na Vercelu** — domen `kartaonica.com` (Next.js). `NEXT_PUBLIC_API_URL` se postavlja u Vercel env — **nije u repou** (lokalno pada na `http://localhost:3001`). Server ostaje na Railwayu (`zandar-test.up.railway.app`). Push na `main` = auto-deploy oba (Vercel web + Railway server).
- **⚠ Deploy = restart = hydrate.** Svaki deploy restartuje server, koji na startu hidrira perzistirane sobe (file-snapshot na Railway volumenu). Zato promjene oblika perzistiranih podataka MORAJU biti back-compat (vidi Code & workflow conventions).

---

## Current state — last updated 2026-08-25

### ✅ Done

| Slice | Branch | Notes |
|---|---|---|
| Bot engine — `selectBotMove`, 3 tiers, BotConfig (PRD §40) | main | 18 unit tests; seeded, deterministic |
| Identity generator — `generateBotIdentity`, dedup, profanity filter (PRD §39) | main | 20 tests; DoD distribution ±4% |
| Bot server integration — turn driving, bot reactions, per-tier timing (PRD §41, M9/M10) | main | bots drive turns internally; never trip AFK timer. **Sljedeća ruka je host-driven** (igrač klikne "Sljedeća ruka →"; nema auto-advance — vidi changelog 2026-06-11) |
| Quick Play endpoint — instant bot-fill, human-human matching window | main | `POST /api/quickplay`; 4P/21 fixed |
| Home page redizajn — name input, remember-name, dominant CTA (PRD §49.1) | main | `/` — "Igra – nađi sto" |
| Matching screen — **oval "sto se postavlja"** (skica), seats around felt table, DS §7.3 copy ("Pripremamo sto…" / "Igrači sjedaju…"); no counter/search/join-log | main | shared `components/MatchingTable.tsx` used by `/brza` + `/matching/[roomId]`; preview `/dev/matching`. Supersedes old flat-row reveal |
| v3.2 cleanup — single-player removed, Quick Play simplified to 4P/21 | main | `/practice` deleted; `/api/singleplayer` removed |
| QuickMatchScreen `/brza` — name input → oval matching table | main | merged; matching faza koristi `MatchingTable` |
| RulesModal — full pravila Žandara | main | opened via "? Pravila" in GameView |
| PostHog analytics, Sentry, OG metadata, CORS multi-origin | main | |

#### Design System v3.2 frontend build (docs/DESIGN_SYSTEM.md §11)

| Slice | Branch | Notes |
|---|---|---|
| **A1** — design tokens + Tailwind v4 mapping + safe-area + viewport-fit + hover-guard | main | `app/globals.css`; no hex in new code |
| **A2** — positional grid shell `GameTable` (named areas, 2P/3P/4P, card-wrap) | main | `components/GameTable.tsx`; preview `/dev/table` |
| **B1** — `SeatChip` (~56px, bot-agnostičan; turn ring, status, auto-play, 4P team border, identity fade) | main | `components/SeatChip.tsx`; preview `/dev/seat` |
| **B2** — positional seats: `arrangeSeats` + `TableSeats` (SeatChips into partner/oppL/oppR from public state) | main | `lib/seating.ts`, `components/TableSeats.tsx`; preview `/dev/table` (Seats toggle) |
| **B3** — `HandArea` + `Card` fluid tap (your-turn glow / dim; select=lift, ne izvršava) | main | `components/HandArea.tsx`, upgraded `components/Card.tsx`; preview `/dev/hand` |
| **B4** — `TableArea` capture/trail bez confirm-a (single tap-group / multi tappable / trail / force-capture block) | main | `components/TableArea.tsx`; full loop preview `/dev/play` |
| **B5** — `TurnTimer` countdown (success→warn→danger), SSR-safe; samo na aktivnom čipu + hand headeru | main | `components/TurnTimer.tsx`, `HandArea` timer slot; preview `/dev/timer` |
| **B6** — `ScorePill` rezultat overlay (collapsed pill → breakdown; po igraču 2P/3P, po timu 4P) | main | `components/ScorePill.tsx`; preview `/dev/score` |
| **B7** — `ReactionFab` floating reakcije (collapsed FAB → 8 emojija → emit; 2s cooldown; off u pauzi) | main | `components/ReactionFab.tsx`; preview `/dev/reactions` |
| **B8** — `PauseAbandonOverlay` (pause banner / abandon-vote modal / abandoned full-screen — nikad prazno) | main | `components/PauseAbandonOverlay.tsx`; preview `/dev/pause`. Pokriva i abandon-UI backlog |

> **Faza B KOMPLETNA (B1–B8)** — svi token-only, bot-agnostični, `/dev/*` preview-i.

#### In-game integracija + full-felt redizajn (v3.2)

| Slice | Branch | Notes |
|---|---|---|
| **Integracija** — `GameScreen` (sve B-komponente) zamijenio flat-list `GameView` u `/room/[roomId]` | main | `components/GameScreen.tsx`; preview `/dev/game`. `GameView` ostaje fallback (1-line revert) |
| **Full-felt raspored** — cijeli ekran felt, igrači po ivicama, centralna play-zona, ruka-lepeza (po referentnim igrama) | main | `SeatBubble` + `HandFan` + `TableArea bare`; skica `/dev/felt`. Zamjenjuje grid. Vidi DS changelog v3.1→v3.2 |
| **UX fixes** (feedback s telefona) | main | tap-to-play (2. tap = potez), play-zona uža (bez preklapanja), poleđine kod protivnika, jasniji timer |
| **Polish** | main | arc timer (zeleno→crveno), bočni backs horizontalno/veći/centrirani, mikro-animacije (card-in) |
| **Timer = pilula iznad avatara** (feedback) | main | `TurnTimer size="pill"` — horizontalna pilula IZNAD ikonice (ne preko badge-a), 3 stanja (zeleno 100→50% / narandžasto 50→20% / crveno <20%), samo na aktivnom. **Server** šalje rok poteza za SVAKI potez (i bota; puni timeout, bot odigra brzo unutar) → pilula iznad svakog igrača kad je na redu. (Zamijenio raniji luk/arc.) |
| **C4 — anti-leak straža** | main | `lib/antiLeak.ts` dev guard; web ne čita isBot, server whitelist-uje PublicPlayer → čisto |
| **Reconnect (Faza D2)** | main | room/[roomId]: visibilitychange/online/pageshow → debounce + re-subscribe (+reconnect ako mrtav) → svjež state. Fixed: connect listener uvijek registrovan. Server već vraća connected + re-emit |
| **Persistence — sobe preživljavaju restart** | main | `persistence.ts` adapter + **file-snapshot** (atomski JSON/soba); `rooms.ts` serialize/hydrate; persist u broadcastGameState+approve; startup hydrate + bot re-arm. **Verifikovano lokalno** (restart → restored). Postgres adapter pending (pg install blokiran cert-om) |
| **Faza D1 — PWA** | main | `app/manifest.ts` (standalone, theme #18181b), brand ikone (192/512/maskable/apple, "Ž" na feltu), `public/sw.js` (kešira SAMO statiku; API/navigacija→mreža), `PwaManager` (register + install/update prompt). Manifest/SW/ikone svi 200. **Faza D kompletna (D1+D2).** Instalabilnost = potvrdi na uređaju |
| **Desktop UX** (feedback) | main | `GameScreen`: centriran felt-stage `max-w-[600px]` + tamni surround; play-zona šira na `md:` (karte u red, ne u kolonu). Sve preko max-w/md: → **mobilni netaknut** (verifikovano 390px = isto kao prije) |

### 🔶 Partial / in progress

| Item | Status |
|---|---|
| **Live verifikacija in-game ekrana** | typecheck/lint/dev-preview ✅; **na uređaju (kartaonica.com) u toku.** Retest iznio i riješio: deal animacija na startu + timer poslije dijeljenja, veće/ljepše karte+špil (`CardBack` zlatna rešetka, §10 smjer), animacije −10%, turn-indikator (**horizontalni pill iznad avatara** — vraćen sa kratkotrajnog conic-ring eksperimenta, puls pojačan), **uklonjeni redundantni count-badge** sa sjedišta, **Quick Play → pravo u Sto** (nema lobby flash-a), **`NOT_SUBSCRIBED` self-heal** (reconnect/deploy race), **fix: felt.css kaskada** — `@import "./felt.css"` je bio *unlayered*, pa je `.seat{position:relative}`/`.deck{position:relative}` nadjačavao Tailwind `absolute` iz `GameScreen`-a (unlayered > `@layer utilities`) → sjedišta i špil su padali u normalan tok i slagali se vertikalno; sad `layer(components)` + bočna sjedišta kompaktan vertikalni čip (5.5rem) + status/score na sjedištu samo kad nose informaciju. Preostaje: dalje fino podešavanje pozicija/tempa na uređaju |
| DDA (dynamic difficulty) | Config types exist (`DDAConfig`); adjustment logic not implemented |
| Onboarding win-curve by session number | Config tables in PRD; not wired to session tracking |

### ❌ Not done

| Item | Why / notes |
|---|---|
| **Postgres adapter za persistence** | File-snapshot radi (gore); Postgres `PersistenceAdapter` drop-in ostaje za kad `pg` može da se instalira (cert/registry blokiran u dev okruženju). Hosting = Railway (vidi Deployment sekciju); file-snapshot na Railway volumenu dovoljan zasad |
| `/zandar/room/:id` route | Prompt references this path; current route is `/room/[roomId]`; needs decision |
| iOS localStorage eviction | Guest session can be lost on Safari low-memory; no server fallback |
| Human-over-bot mid-game replacement (PRD §38.4) | Complex; not started |
| Bot reactions — "regulari" persona pool (PRD §39.5) | Post-MVP polish |

---

## HARD RULES (non-negotiable)

1. **Server is the referee.** The client never decides what is a legal move. All moves go through server-side `applyMove`.
2. **Bots play ONLY legal moves** and always respect force-capture (PRD §36.3). Difficulty comes purely from move-selection quality (noise / blunder probability / J timing / lookahead) — **never** from breaking or bending the rules.
3. **`isBot` / `botProfile` NEVER reach the client.** `PublicPlayer` / public state must strip them. A bot-leak is a hidden-information leak, same severity as leaking another player's hand.
4. **Bots are server-driven actors** that go through the same validation as humans. Bots must **never** trip the AFK / auto-play / turn-timer system.
5. **Bots are human-presenting in-game.** Never show the word "bot" or any AI hint anywhere in the UI. When a human takes over a bot seat, the UI says only `"[nickname] je otišao"` (PRD §38.4). Disclosure lives only in the ToS.
6. **Name generator** (PRD §39): realistic ex-Yu identities; no duplicate name at a table; recency per user; **mandatory** profanity/hate blocklist including nationalist/ethnic slurs; gender↔avatar consistency; identity stable for the whole match.
7. **Difficulty, DDA, and the onboarding win-curve are CONFIG, not hardcoded** (PRD §40.3–40.5). Tunable from a config object.
8. **Coins stay cosmetic and non-cashable.** Never introduce cashable currency or real-money wagering.
9. **Game rules (PRD §6) are LOCKED.** Do not change gameplay rules.

---

## Code & workflow conventions

- **Don't rewrite working code.** Read existing patterns first, then extend incrementally.
- **`game-core` stays pure** — no socket, no DB, no UI. State in, result out. Deterministic given a seed.
- **Tests:** follow the existing game-core test style and fixtures. Never regress an existing test. New logic ships with tests.
- **Plan first** for any non-trivial change: output a short plan + list of files to add/change, and wait for approval before mass-editing.
- **One feature branch per slice** (e.g. `feat/bot-engine`). Keep diffs minimal and reviewable.
- **Scope discipline:** implement only the slice asked for; don't pull in adjacent features unprompted.
- **Language:** match existing code conventions (code/comments). User-facing copy is ijekavica.
- **Single-player is cut** (v3.2) — do not build it.
- **Ručno pisani CSS uvijek ide u `layer(components)`.** `@import "./felt.css" layer(components);` u `globals.css`. Neslojevit CSS pobjeđuje SVAKI `@layer`, pa bi `.seat{position:relative}` tiho nadjačao Tailwind `absolute` koji komponente prosljeđuju kroz `className`. Isto pravilo važi za svaki novi felt/overlay sloj koji stigne iz Lovablea. Posljedica: klasa iz tog fajla više ne može nadjačati utility na istom elementu — boju stanja drži CSS, a JSX ne smije nositi konkurentnu utility klasu (vidi `.seat__status` vs `text-muted`).
- **Back-compat za perzistirane podatke.** Deploy na Railway = restart = hydrate soba (vidi Deployment). Mijenjanje oblika onoga što ide u snapshot (`botProfile`, `gameState`, `LobbyRoom`…) mora tolerisati **stari** oblik na hydrate-u, inače žive partije pucaju nakon deploya. Pouka: bot-stuck regresija 2026-06-10 — promjena `botProfile.timing` oblika je nakon deploya zaglavila botove u hidriranim sobama (`scheduleBotMove` bacio na nedostajuće bendove; bot nema AFK timeout → trajno zaglavljen).

## Status maintenance

When a feature slice is completed or scope changes, update this file: move items between Done / Partial / Not-done, update the "Last updated" date. Keep it concise.

## Implementation order (agreed, v3.2)

✅ Bot engine → ✅ name generator → ✅ bot server integration + Quick Play → ✅ bot reactions/timing → ✅ home/matching redesign (v3.2) → ✅ merge feat/quick-match.

**Design System frontend build (docs/DESIGN_SYSTEM.md §11):** ✅ A1 tokens → ✅ A2 positional grid → ✅ B1 SeatChip → ✅ B2 positions → ✅ B3 HandArea + Card → ✅ B4 capture/trail → ✅ B5 TurnTimer → ✅ B6 ScorePill → ✅ B7 ReactionFab → ✅ B8 pause/abandon (**Faza B kompletna**) → ✅ **integracija** (`GameScreen` u live room) → ✅ **full-felt raspored** (v3.2, redizajn po referencama) → ✅ **UX fixes s telefona** (tap-to-play, overlap, poleđine, timer) → ✅ **polish** (arc timer, bočni backs horizontalno, mikro-animacije) → ✅ **C4 anti-leak** → ✅ **reconnect (D2)** → ✅ **persistence** (file-snapshot; gate skinut) → ✅ **timer vidljivost** → ✅ **Faza D1 PWA** (Faza D kompletna) → ✅ **desktop UX** (centriran stage, mobilni netaknut) → ✅ **timer pilula iznad avatara** (3 stanja; server šalje rok i botu → na svakom igraču) → ✅ **C3 host bot-fill toggle** (`POST /api/rooms/:id/bot-fill`; host puni/skida botove u privatnoj sobi, ljudi imaju prioritet; `botFill` room-level flag, NE per-player isBot) → ✅ **`/zandar/room/:id` → 308 redirect** (next.config `redirects()`) → ✅ **capture-flash** (`animate-capture-flash` okida se na rast `capturedCounts`) → ✅ **PWA banner pozicija** (na `/room/*` ide na vrh da ne prekriva ruku) → ✅ **fix: bot-stuck na timeout** (back-compat za stari `botProfile.timing` oblik u `scheduleBotMove` + `autoPlay` fallback u `driveBotTurn`; bloker, vidi Code & workflow conventions) → ✅ **§50 feedback sloj** (vidi DESIGN_SYSTEM §12): Faza 0 postavke+haptika+On/Off preklopke (`FeedbackToggles`, localStorage), Faza 1 event sloj (`deriveGameEvents` u game-core + 12 testova, `useGameEvents`), Faza 3a J-sweep emphasis, Faza 3b capture **collect** (karte iz `MoveReveal`-a odlete u pile kupca, WAAPI), **Faza 2 zvuk** (sintetizovani SFX preko Web Audio, bez asseta — `lib/sound.ts`) → ✅ **move reveal** (server šalje `lastMove`; ~1.8s prikaz ko/koju kartu/šta pokupio/ŽANDAR) → ✅ **reakcije uz sjedište** (emoji pored pošiljaoca, ne gore-centar) → ✅ **match-end UX** (timovi po imenu + Revanš / Novi sto i igrači / X→home) → ✅ **fix: J na početni sto → dealeru** (`award_to_dealer`; J ne ostaje na stolu, PRD v2 §6) → ✅ **fix: bot-stuck na praznoj ruci** (turn preskače prazne ruke kod neravnomjernog špila — `getNextPlayerWithCards`; bloker) → ✅ **vidljiv špil + deal animacija** (`DeckPile` se stanjuje po `deckCount`; `[data-deck]` sidro; `dealFromDeck` — poleđine lete iz špila ka svim igračima na re-deal; deal animacija više NIJE odgođena) → ✅ **deal na startu partije + timer poslije dijeljenja** (`useGameEvents` sintetizuje `deal` na prvom "playing" snapshotu kad `capturedCounts`=0 → deal animacija ide i na početku, ne samo na re-deal; `dealFromDeck` sad dijeli **više karata po igraču + 4 na sto** round-robin uz `[data-table-drop]` sidro i vraća trajanje; `GameScreen` sakriva turn-timer dok karte "padaju" pa ga pokaže čim dijeljenje završi → jasan slijed na startu) → ✅ **veće/ljepše karte i špil (DS §10 smjer)** (nova `CardBack` komponenta — zlatna rešetka rombova na feltu, token-only, veličine xs/sm/md/lg; dijele je poleđine protivnika, špil i deal-duhovi = jedan vizuelni jezik; poleđine protivnika veće — partner 30×42, bočni 52×36; `DeckPile` deblji štos + `CardBack` gornja karta + chip-badge za broj; lica karata mekši radius `token-md` + suptilan ring) → ✅ **animacije +10% sporije** (sve CSS keyframes trajanja ×1.1; JS fly collect/deal ×1.1; `MoveReveal` READ_MS 1100→1210) → ✅ **vidljiviji "ko je na redu" (industrijski standard)** (`TurnTimer size="ring"` — kružni conic-gradient countdown OKO avatara, boja po pragu zeleno/narandžasto/crveno + glow; `SeatBubble` aktivni avatar dobija zlatni glow + `scale-105`; zamijenio slabo vidljivu pilulu iznad) → ✅ **fix: `NOT_SUBSCRIBED` na potez** (socket reconnect / restart servera nakon deploya → potez ide na socket bez `socket.data` → server odbija; klijent sad ima `emitAction` self-heal: na `NOT_SUBSCRIBED` transparentno re-subscribe + retry JEDNOM (potez nije primijenjen pa je retry siguran, isti `clientMoveId` = idempotentno); `subscribeSocket` promise-based, dijele ga connect/resume i akcije) → ✅ **§43 human-only analitika** (P1): `track()` helper (`lib/posthog.ts`); `quickplay_requested`/`quickplay_matched` (matchType, waitMs, **humansAtTable/botsAtTable/botSeatShare**) + `bot_seat_filled` u `/api/quickplay` (klijent šalje `guestId` u body); `game_started`/`hand_finished`/`match_finished` obogaćeni sastavom stola + `isPublic`, a match/hand **premješteni u `broadcastGameState` (`emitEndAnalytics`, guard po matchId, po svakom čovjeku)** da hvataju i partije koje bot završi + `match_finished.won`. Otključava: bot_seat_share, human-only kohorta (filter botsAtTable=0), win_rate_by_session. **Caveat:** `time_to_first_match` server-side ≈ 0 (matchmaking sinhron) — pravi client-perceived TTFM je mali follow-up → ✅ **Quick Play → pravo u Sto (bez lobby flash-a)** (`/room/:id` kad je `status=playing/finished` drži tih loading dok `game:state` stigne socketom, umjesto da bljesne host-lobby; lobby ostaje samo za `/create`, `status=waiting`) → ✅ **turn-indikator vraćen na horizontalni pill** (`TurnTimer size="pill"` iznad aktivnog avatara; kratkotrajni conic-ring eksperiment izbačen — pill jasniji na uređaju; zlatni puls pojačan: `ring-4` + `scale-110` + veći/svjetliji glow) → ✅ **uklonjeni redundantni count-badge** (`bg-accent` broj karata sa `SeatBubble`-a — vidi se preko lepeze poleđina / vlastite ruke) → ✅ **MOBILE_PLAN_STATUS** (procjena native Android/iOS pakovanja postojećeg PWA-a: TWA + Capacitor, bez React Native; `docs/MOBILE_PLAN_STATUS.md`) → ✅ **kraj ruke = host-driven** (uklonjen server-side auto-advance posle 4s u bot partijama; host pokreće sljedeću ruku dugmetom "Sljedeća ruka →" → `game:nextHand`; `autoNextHand` obrisan — igrač kontroliše tempo, ne sto sam) → ✅ **overlay sloj iz Lovablea (korak 3)** (`components/overlay/`: `MoveReveal` (+`MoveRevealLive` kao vlasnik sata i `collectToPile` leta), `ScorePill` (prop-driven `expanded`, `data-pile-id`, razrada po 4 kategorije), `EmojiReactions` (`EmojiReactionRow` 4×2 grid u `ReactionFab` ljusci + `ReactionBubble` uz sjedište), `PauseAbandonOverlay` (prop-driven `remainingMs`); `app/overlay.css` u `layer(components)`; `sr.ts` + blokovi reveal/score/reactions/pause; `LastMove` izvezen iz shared-types; preview `/dev/overlays`. Port-fixevi naspram Lovable izvora: collect faza gasi `.reveal::before` i tekst umjesto panela — panel je predak kartama koje `collectToPile` nosi u pile; vote-vrste na `data-vote-seat-id` (ne `data-seat-id`, to je sidro za let); emoji iz `lib/reactions.ts` kao jedini izvor; razrada dobija samo zadnju ruku) → ✅ **fix: `crypto.randomUUID` van sigurnog konteksta** (`getGuestId` je pucao na svakom http:// pristupu — LAN/IP test sa telefona — i to PRIJE `fetch`-a, pa je `/brza` javljao "Greška pri traženju stola" a log servera bio prazan; sad UUID v4 preko `getRandomValues` uz `Math.random` fallback) → ✅ **fix: prvi `game:state` bez `turnDeadline`** (svježa soba je "playing" prije nego iko otvori socket, a rok je postavljao samo `broadcastGameState` → pilula je crtala 0; rutiranje izdvojeno u `routeTurnTimers()` i pozvano i iz `room:subscribe`; uz to `PlayerSeat` crta pilulu samo kad ima šta da odbrojava) → ✅ **reveal panel ostaje traka** (`max-width: min(21rem, 92vw)` + `flex-wrap: nowrap` — bez toga se lomio u kolonu i pokrivao sto i partnera na 390px)  → ✅ **korak 4 iz Lovablea — kraj ruke / kraj meča** (`components/overlay/RoundEndOverlay.tsx` + `Toast.tsx`; `lib/piles.ts` — `pilesOf` izvučen iz `ScorePill`-a da ga obje komponente dijele; ~119 linija inline modala izbačeno iz `GameScreen`-a, kao i mrtvi `pileLabel`/`pileMembers`; scrim i okvir daje ekran, komponenta samo sadržaj. Port-fixevi: dugmad se ne renderuju bez handlera, primarno dugme ima busy tekst. **CSS je dopisan, ne prekopiran** — Lovable baza nema naše device-fixeve (`.reveal::before` collect, `nowrap`, `scorepill--compact`), pa bi kopija fajla tiho vratila bug gdje karte izblijede usred leta u pile)  → ✅ **korak 5 iz Lovablea — funnel** (`components/funnel/HomeScreen.tsx` + `MatchingTable.tsx`, `app/funnel.css` u `layer(components)`; `/` i matching ekrani prešli sa sirove Tailwind palete na tokene; status stringovi iz `sr.matching` umjesto hardkodirani po ekranima; preview `/dev/funnel`. Port-fixevi: `places` pada na 4 kad roster još nije stigao (Lovable je vezao broj mjesta za `players.length`, pa je "Pripremamo sto..." faza crtala prazan felt), `MatchingPlayer` strukturni tip da se uklope i `RoomPlayer` i `PublicPlayer`. **Home je izgubio feature-grid, footer i tagline** — brif je tražio jednu glasnu akciju; stari ekran je u gitu ako se vraća)  → ✅ **pauza i prekid partije na serveru (PRD v2 §32)** (`apps/server/src/pause.ts` čiste odluke + automat u `index.ts`: grace 30s bez zaustavljanja partije → `paused_for_reconnect` 2 min sa `game:waitMore` → `abandon_vote` 60s sa `game:abandonVote` → `abandoned`; glas "čekaj" produžava 5 min, povratak igrača u bilo kojoj fazi osim `abandoned` vraća u `playing`. Sto pun botova se raspušta bez glasanja (PRD v3.1 #5). `GameState.pauseEndsAt` je apsolutni rok — opciono polje, stari snapshot-i ga nemaju; `armPauseTimer` se zove i na hydrate, pa pauza preživi deploy umjesto da se zaglavi. Trajanja kroz `GRACE_MS`/`PAUSE_MS`/`VOTE_MS`/`WAIT_EXTENSION_MS` env — bez toga jedan prolaz traje 3.5 min. Verifikovano socket sondom: bot-sto → prekid za 1.6s, dva čovjeka → pun tok uklj. povratak i glasanje, i restart servera usred pauze → soba nastavi tok) → ✅ **fix: malformiran `room:subscribe` rušio server** (`verifyToken` je slao `undefined` u `hashToken`, `ERR_INVALID_ARG_TYPE` u socket handleru = pad procesa; sad je nevalidan ulaz odbijen token)  → **[next]** retest (telefon + desktop; **§50 vizuelne efekte — collect/reveal/reakcije/fly putanje/špil — verifikovati i podesiti pozicije na uređaju**). Preostalo: Postgres adapter (kad pg može da se instalira), iOS localStorage fallback.
