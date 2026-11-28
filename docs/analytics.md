# Analitika — Kartaonica

Analitika proizvoda je **PostHog** (EU). KPI-evi se računaju u PostHogu iz
sirovih događaja — u kodu nema metrika, agregacija ni `dau` događaja. Meta App
Events služi samo za mjerenje reklama i ne dijeli ništa sa PostHogom (dno stranice).

Uz njega Android aplikacija ima **Google Analytics for Firebase**, samo sa
automatskim događajima (`first_open`, `session_start`, `app_update`...), bez
JS-a, vlastitih događaja i `guestId`-a; nije izvor nijednog KPI-ja ispod.
Uključen je SAMO u `release` buildu (`firebase_analytics_collection_enabled` kroz
placeholder u `app/build.gradle`), jer `debug` čita produkcijski
`google-services.json`. Ne uzima reklamni ID (`google_analytics_adid_collection_enabled=false`); dozvola
`AD_ID` u paketu postoji samo zbog Mete. Ne čeka saglasnost za Metu.

Web ima **Google Analytics** (stream „Kartaonica Web", `G-76WWHZ49Y0`), samo u
produkcijskom web buildu: staging, dev i APK nemaju tag (`lib/googleAnalytics.ts`).
Nema vlastitih događaja ni `guestId`-a i nije izvor nijednog KPI-ja. Bilježi
`page_view` samo pri punom učitavanju, ne pri prelazu između ekrana; Enhanced
measurement je ugašen, a njegovo slaganje sa skidanjem ID-a sobe nije provjereno.
Saglasnost: oglašavanje odbijeno svuda; u EEA, UK i Švajcarskoj `analytics_storage`
je odbijen, pa nema kolačića, a Google dobija samo pingove bez kolačića. Baner ne
postoji. Da li su ti pingovi dovoljni za HR/SI ide uz isti pravni pregled kao EU
saglasnost za PostHog. ID sobe se skida iz `page_location`.

## Okruženja — šalje SAMO produkcija

Analitika je **fail-closed**. Uključuje je samo tačna vrijednost:

| | Uslov | Ponašanje |
|---|---|---|
| Server | `APP_ENV === "production"` | `track()` šalje; sve drugo (staging, dev, nepostavljeno, `Production`) je no-op |
| Web + APK | `NEXT_PUBLIC_APP_ENV === "production"` (build-time) | PostHog inicijalizovan, autocapture, `first_open`, događaji |
| Staging web, staging APK, lokalni dev | bilo šta drugo | PostHog se NE inicijalizuje: nema mreže, `$pageview`-a, `ph_*` storage-a ni `kartaonica_first_open` oznake |

Jedan PostHog projekat, samo pravi igrači — zaseban staging projekat ne postoji.
`app_env` ostaje na događajima kao sigurnosna provjera; nijedan insight ne zavisi od njega.

### Provjera bez slanja u PostHog (uobičajen put)

1. Testovi gate-a: `pnpm --filter @zandar/server test` (`posthog.test.ts`) i
   `pnpm --filter web test` (`lib/track.test.ts`).
2. Lokalni build bez `NEXT_PUBLIC_APP_ENV` → nula zahtjeva ka PostHog hostu, nema
   `ph_*` ni `kartaonica_first_open`.
3. Lokalni build sa `NEXT_PUBLIC_APP_ENV=production` i
   `NEXT_PUBLIC_POSTHOG_HOST=http://127.0.0.1:9` (mrtav port) → pokušani zahtjevi
   ka tom hostu i `kartaonica_first_open=sent`. Dokazuje da se gate otvara, a
   ništa ne stiže u pravi projekat.

⚠ **Automatizovani browseri:** PostHog-ov web SDK prepoznaje headless/automatizovan
browser i zna tiho odbaciti `capture`. Za provjeru (3) browser ne smije izgledati
automatizovano (`navigator.webdriver`, User-Agent, `navigator.userAgentData`),
ili se radi u običnom browseru. „Nema događaja iz headless Chrome-a" NIJE dokaz
da je analitika ugašena — za (2) važe zahtjevi ka hostu i storage, ne događaji.

Pravi smoke test ingestije je **poslije produkcijskog deploya**: PostHog → Live
events, događaji sa kartaonica.com i produkcijskog APK-a.

**Izuzetak, ne praksa:** lokalni build usmjeren na produkcijski projekat (pravi
ključ + host + `NEXT_PUBLIC_APP_ENV=production`) samo kad se kvar ne može
reprodukovati drugačije — sa `?tester=1` od prvog otvaranja, a build se briše odmah
poslije.

Tipovi događaja: `packages/shared-types/src/index.ts` → `AnalyticsEvents`.
Oba omotača (`apps/web/lib/track.ts`, `apps/server/src/lib/posthog.ts`) su
tipizirana preko te mape — događaj koji nije u njoj ne kompajlira. Kad se
događaj mijenja, mijenja se i ova stranica.

## Identitet

- `distinct_id` = guest UUID iz `localStorage` (`kartaonica_guest_id`,
  `lib/guestId.ts`). Klijent ga daje PostHogu na bootstrap-u, serveru kroz tijelo
  zahtjeva (Quick Play, kreiranje sobe, zahtjev za ulazak) i socket handshake.
- Server ga pamti na igraču (`Player.guestId`, samo server-side — `PublicPlayer`
  je whitelist), pa start i kraj meča pripisuje i čovjeku bez živog socketa.
- **Poznata rupa:** iOS Safari briše `localStorage` poslije ~7 dana neaktivnosti,
  pa se web igrač na iOS-u vraća kao nov. Android APK (Capacitor) nema taj
  problem. Serverski kolačić ne rješava ovo — API je na drugom domenu
  (`*.railway.app`), pa bi bio kolačić treće strane. Rješava se sa iOS app-om.

## Parametri na svakom događaju

| Parametar | Vrijednost |
|---|---|
| `game` | `"zandar"` |
| `platform` | `web` \| `android` (build-time, ne user-agent) |
| `app_env` | uvijek `production` — ostala okruženja ne šalju; ostaje kao sigurnosna provjera |
| `app_version` | kratak git SHA builda (web: Vercel/git; server: `RAILWAY_GIT_COMMIT_SHA`) |

Klijent ih registruje jednom (`posthog.register`), server ih dodaje u `track()`.
Na serverskim događajima `platform` postoji samo kad ga je klijent poslao.

Izvor saobraćaja na webu: `utm_*` se čita sa događaja (`utm_campaign` na
`first_open`), ne iz osobina osobe. `$initial_utm_*` je 31.10.2026. bio prazan na
svim profilima.

Instalacije: web i aplikacija imaju različit guest ID, pa ih povezuje samo
kampanja. Ponuda aplikacije upisuje `utm_*` u Play `referrer` (`lib/stores.ts`): plaćena
kampanja ostaje netaknuta, a bez nje ide `utm_source=web&utm_content=<place>`. Aplikacija
ih pri prvom čitanju referrera šalje kao `app_install_attributed`. Klik se ne može
spojiti sa instalacijom po osobi, nego samo po kampanji. Izdanja koja ne šalju taj
događaj: samo Play Console → Acquisition.

Testeri: `?tester=1` postavlja osobinu osobe `is_tester=true` (`?tester=0` je
skida). U PostHogu: *Filter out internal and test users* → `is_tester ≠ true`
(postavljeno 1.11.2026.). ⚠ **Ne koristiti kohortu `$internal_or_test_user`:** nju
dobija svako sa `$host=localhost`, a to je svaki igrač u Android aplikaciji.

**Izbaciti iz čitanja metrika (po `person_id`)** — aplikacija nema `?tester=1`, pa se
uređaji vlasnika i testera izbacuju ručno u svakom upitu
(`AND person_id NOT IN (...)`). Server događaji nose isti `person_id`.

| person_id | Ko | Uređaj | Od |
|---|---|---|---|
| `c0b97962-99a7-5a93-8dd3-518a7da59ea2` | vlasnik | Galaxy S10e (SM-G970F), produkcijska aplikacija | 16.11.2026 |

Vlasnik može imati i druge `person_id`-eve (web na računaru, staro izdanje aplikacije).
Dopuniti spisak kad se nađu.

## Događaji

| Događaj | Gdje | Kad / idempotentnost | Parametri |
|---|---|---|---|
| `first_open` | klijent | Jednom po guest ID-u. Zatečeni igrači (ID od prije) se tiho označe. Ne na `/privatnost`, `/privacy`, `/uslovi`, `/delete-account`, `/o-nama` — tamo čeka prvo otvaranje igre. | — |
| `landing_engaged` | klijent | Prvi dodir ili 5 s vidljive stranice, jednom po guest ID-u; vrijeme u pozadini se ne računa. Za razliku od `first_open`, koji se šalje pri pokretanju SDK-a, znači da je stranica stvarno viđena. Važi i za zatečene igrače, pa kohortu čitaj preko `first_open`. Ne na istim stranicama kao `first_open`. | `trigger` (`visible_5s`, `tap`), `utm_source?`, `utm_medium?`, `utm_campaign?`, `utm_content?` |
| `app_offer_shown` | klijent | Ponuda aplikacije je prikazana (samo Android pregledač). Jednom po posjeti. | `place` (`home_top`, `home_open`, `match_end`, `home_strip` — stalna traka „Igraj u aplikaciji" na web početnoj od 15.11.2026; tamo „Otvori" i dalje šalje `home_open`) |
| `app_offer_click` | klijent | Dodir na „Preuzmi", „Google Play" ili „Otvori". Vodi van weba, nije instalacija. Link u Profilu NE šalje događaj. Zamijenio je `store_banner_clicked` (živ samo do ovog izdanja). | `place`, `utm_source?`, `utm_medium?`, `utm_campaign?`, `utm_content?` |
| `app_offer_dismiss` | klijent | Dodir na × (7 dana mira). | `place` |
| `app_install_attributed` | klijent | Aplikacija jednom po instalaciji pročita Play referrer. Stiže i za organsku instalaciju (`utm_source=google-play`, `utm_medium=organic`). Ko je već pročitao referrer u ranijem izdanju ne šalje ništa. | `has_room`, `utm_source?`, `utm_medium?`, `utm_campaign?`, `utm_content?` |
| `play_requested` | klijent | Pritisak na Quick Play, kreiranje sobe, slanje zahtjeva za ulazak (`lib/api.ts`). | `mode`, `game?` (Quick Play i nova soba; od 6.11.2026), `start_score?` (Raub brza igra, 11 ili 21, od 24.11.2026), `guest?: true` (web: igrač preskočio ime i ide kao „Gost NN"; od 16.11.2026) |
| `table_load_stuck` | klijent | Ekran koji čeka prvo stanje stola stoji predugo, a `game:state` nije stigao: „Miješamo špil" (uvod brze igre) 12 s, „Učitavanje stola…" 8 s (`lib/tableLoadWatch.ts`, `components/TableLoadWatch.tsx`). Jednom po sobi u posjeti, web i aplikacija (aplikacija tek novim paketom). Isti signal ide u Sentry kao poruka `table_load_stuck` (warning); odbijena pretplata ide odmah kao `room_subscribe_failed`. Od izdanja changeloga 224. Udio: `table_load_stuck` / `match_started`. | `room_id`, `game`, `phase` (`shuffle` \| `loading`), `room_status` (`unknown` ako soba još nije stigla), `is_public`, `socket_connected`, `subscribe_error?` (kod sa `room:subscribe`), `ms_on_screen` |
| `match_started` | server | Jednom po čovjeku po `match_id` (Quick Play, host `/start`, revanš). Botovi nikad. | `mode`, `match_id`, `game` (`zandar`/`poker`/`raub`; poker od 6.11.2026, raub od 7.11.2026, prije toga samo Žandar), `player_count`, `human_count`, `bot_count`, `target_score?` (samo Žandar), `is_rematch`, `platform?` |
| `match_ended` | server | Jednom po čovjeku po `match_id`, uključujući čovjeka koji je pao s veze. Kraj i prekid dijele guard. Sto bez povezanih ljudi na rezultatu ruke dobija prekid poslije 30 s + 10 min, pa `duration_ms` tada nosi i to čekanje; soba koju sweeper zatekne otvorenu dobija prekid pri brisanju (poslije restarta bez `duration_ms`). Mečevi prije izdanja ove popravke (1.11.2026) nemaju pouzdan kraj: meč bez kraja računaj kao nezavršen. | `mode`, `match_id`, `game`, `end_reason`, `hands_played`, `duration_ms?`, `is_winner?`, `placement?` (poker i raub: konačan plasman, 1 = pobjednik; jednaki bodovi u Raubu dijele mjesto), `left?` (poker, raub, bela: igrač je sam napustio meč — tada je ZA NJEGA `end_reason=abandoned` i nema `is_winner`, iako se meč ostalima završio; od objave `fix/poker-leave-analytics`, 21.11.2026 — **ranije je izlazak iz pokera stizao kao `completed` sa zadnjim mjestom**, pa poker prije tog datuma ima lažnih 100 % završenih i preniske pobjede), `afk?` (sve četiri igre, od `fix/afk-match-end`, 27.11.2026: igrač je sam odigrao manje od 50 % svojih poteza, ostale je odigrao server kad mu je istekao sat — tada je ZA NJEGA `end_reason=abandoned` i nema `is_winner`), `manual_moves?` / `auto_moves?` (potezi koje je igrač odigrao sam / server umjesto njega; izostaju za meč započet prije tog izdanja), `stalled?` (čovjek koji igra sam protiv botova nije pritisnuo „Sljedeća ruka" 10 min, ili je sweeper zatekao sto u čekanju — sto sa dva ili više ljudi nema roka, host kontroliše, pa ga zatvara samo sweeper poslije 12 h; `duration_ms` je tada do kraja zadnje ruke), `platform?`. Poker i Raub ne šalju `hand_finished`; Raub `hands_played` broji i ruke poništene refom. |
| `hand_finished` | server | Jednom po čovjeku po ruci (zadnja ruka meča ide kao `match_ended`). | `roomId`, `matchId`, `handNumber`, `playerCount`, `isPublic`, `humansAtTable`, `botsAtTable`, `botSeatShare` |
| `signup_succeeded` | server | Samo nova prijava (ponovljena ne). | `game`, `platform` |
| `feedback_sent` | server | Igrač je poslao utisak („Pošalji utisak"). Tekst i e-adresa NIKAD ne idu u događaj. | `kind` (`bug`/`idea`/`praise`), `platform`, `has_attachments`, `has_email` |
| `teaser_opened` | klijent | Otvorena stranica buduće igre. | `game` |
| `upcoming_games_viewed` | klijent | Sekcija budućih igara ušla u ekran. | — |
| `upcoming_game_tapped` | klijent | Dodir na pločicu najavljene igre na početnoj (`HomeScreen`). Mjeri interes po igri, jer jedna prijava važi za SVE najavljene igre, pa `signup_succeeded` to ne govori. | `game` |
| `fake_door_viewed` | klijent | Lažna vrata (Tablić, Remi, od 22.11.2026): kartica igre je bar 1 s bila pola u ekranu. Jednom po prikazu početne (`useSeenOnce`), web i aplikacija. | `game` (`tablic` \| `remi`) |
| `fake_door_tapped` | klijent | Dodir na „Igraj" (web i aplikacija) ili „Napravi sto" (aplikacija) na lažnim vratima. Otvara list „{Igra} dolazi uskoro". | `game`, `action` (`play` \| `create`) |
| `fake_door_signup` | klijent | Prijava iz lista lažnih vrata je stigla na server. Odvaja je od prijava sa `/igre/[slug]`. Ponovljena adresa takođe šalje ovaj događaj, a `signup_succeeded` ne, pa jedinstvene adrese broji `signup_succeeded`. | `game` |
| `settings_opened` | klijent | Otvoren ekran Postavke (`/postavke`) pilulom na Profilu (SPEC_PROFIL_POSTAVKE §7, od 24.11.2026). | `from` (`profile_pill`) |
| `game_settings_opened` | klijent | Otvoren list igre iz Profila → „Moje igre". | `game`, `from` (`profile`) |
| `stats_viewed` | klijent | Kartica „Statistika" prikazana sa brojkama (SPEC_STATISTIKA C1, od F1). Jednom po otvaranju, za igru koja se prva vidi. `other_profile` (v0.3) = tuđi profil prijatelja ili igrača za istim privatnim stolom. | `game`, `source` (`profile` \| `other_profile`), `matches` (partije u toj igri) |
| `stats_game_switched` | klijent | Promjena igre čipom na kartici statistike. | `from`, `to` |
| `match_end_stats_shown` | klijent | Red statistike na kraju partije prikazan (S3; C2: veza sa „Igraj ponovo"/revanšom). Samo kad je `stats:update` stigao u 3 s — gost bez naloga i stariji server ga nemaju. | `game`, `outcome` (`win` \| `loss`), `streak` |
| `game_setting_changed` | klijent | Dodir u listu igre koji MIJENJA vrijednost (isti izbor ponovo ne šalje). Čuva se odmah. | `game`, `setting` (`players` \| `target` \| `start_score` \| `deck` \| `table`), `value` |
| `account_cta_tapped` | klijent | Dodir na „Napravi nalog" ili „Prijavi se" u kartici „Sačuvaj napredak" na Profilu gosta (D14: da li je novi Profil smanjio registracije). | `action` (`register` \| `login`), `from` (`profile_card`) |
| `account_registered` | klijent | Gost je postao nalog (isti `uid`): e-mail registracija ili povezivanje Googlea (`lib/account.ts`). Prijava na postojeći nalog NE šalje događaj. | `method` (`password` \| `google`) |
| `invite_shared` | klijent | Host poslao link kroz sistemski meni ili ga kopirao (`lib/track.ts`). Zatvoren meni NE šalje događaj. Na Androidu znači da je izabrana aplikacija, ne da je poruka stigla. | `room_id`, `method` (`share` | `copy`) |
| `invite_opened` | klijent | Gost otvorio link sobe u kojoj nema sjedište; jednom po sobi u sesiji pregledača. Ne kad već ima zapamćen zahtjev, ni kad soba ne postoji. | `room_id`, `seats_left` |
| `join_requested` | server | Zahtjev za ulazak primljen. Pun sto (409) NE šalje događaj. Bez guestId-a (stari klijent) nema događaja. | `room_id`, `platform?` |
| `join_approved` | server | Host odobrio ulazak; ide gostu. | `room_id`, `wait_ms`, `platform?` |
| `friend_invite_sent` | server | Host pozvao prijatelje iz liste: nova soba (`POST /api/invites`) ili iz lobija (`POST /api/rooms/:id/invites`). Jedan događaj po slanju, ide pozivaocu. Odbijeno (400/403/409/429) ne šalje ništa. Od 15.11.2026. | `room_id`, `invited_count`, `source` (`new_room` \| `lobby`), `game`, `platform?` |
| `friend_invite_accepted` | server | Pozvani prijatelj ušao u sobu (`/api/invites/:id/accept`, bez odobrenja hosta); ide pozvanom. Istekao poziv (410) ne šalje ništa. | `room_id`, `game`, `wait_ms` (od poziva), `platform?` |

Osobina osobe `registered=true` (`recordAccount` u `lib/track.ts`) postavlja se
uz `account_registered` i na svaku prijavu na postojeći nalog (novi uređaj).
Ne briše se na odjavu ni brisanje naloga — znači „ikad imao nalog na ovom uređaju".
Registracije prije ovog događaja (1.2.0, od 24.10.2026.) postoje samo u Firebase
Auth konzoli; bez backfill-a.

- `mode`: `quick_play` (javni sto) \| `private_room`.
- `end_reason`: `completed` (meč odigran do cilja) \| `abandoned` (prekid —
  PRD §32: grace → pauza → glasanje, ili sto pun botova se raspušta). Napuštanje
  i pad veze se NE razlikuju: izlaz iz partije je klijentski `router.push`.
- `duration_ms` izostaje kad start nije viđen u istom procesu (restart servera).
- `is_winner` samo uz `completed`.
- **Odigran meč** (`completed` za igrača) znači: meč je stigao do cilja, igrač
  nije izašao (`left`) i sam je odigrao bar pola svojih poteza (`afk.ts`,
  `AFK_CONFIG.minManualShare`). Isto pravilo puni i brojač završenih partija na
  profilu, pa se profil i PostHog ne razilaze.
- **Prije 27.11.2026 `completed` uključuje i partije koje je igrač prepustio
  serveru.** Potpuno prepuštenih (tempo ruke kao sat poteza, 30 dana do
  27.11.2026) je malo: Bela 17/1530 (1,1 %), Raub 9/2415 (0,4 %), Žandar 2/370
  (0,5 %); poker se tako ne može procijeniti. Djelimično prepuštene se
  unazad ne vide ni po čemu — `$autocapture` za stolom ne bilježi klikove.
- **Prije 27.11.2026 sto bez pritiska na „Sljedeća ruka"** stizao je kao
  `abandoned` tek kad ga sweeper obriše (do 12 h), sa napuhanim `duration_ms`
  (preko 1 h za 30 dana: Raub 26, Bela 16, Žandar 6). Za trajanje mečeva
  isključi `duration_ms > 1 h` iz tog perioda.

Uklonjeni (ostaju u istoriji PostHoga, bez backfill-a): `game_started`,
`match_finished`, `quickplay_requested`, `quickplay_matched`, `bot_seat_filled`.

## KPI-evi (PostHog, produkcijski projekat, filter testera uključen)

| KPI | Insight |
|---|---|
| DAU / WAU / MAU | Trends → `match_started` → Unique users (rolling 7/30) |
| Retention D1/D7/D30 | Retention → start `first_open`, povratak `match_started`, Day, **recurring** |
| Mečeva po igraču | Trends → `match_started` → Average per user; ukupno mečeva = `uniq(properties.match_id)` |
| Aktivacija | Funnel `first_open` → `match_ended` (`end_reason=completed`) u 24h |
| Stopa završetka | `match_ended{completed}` ÷ `match_started` |
| Stickiness | DAU ÷ MAU |
| Udio igre sa prijateljima | `match_started` gdje `mode=private_room` i `human_count ≥ 2` |
| Win rate novih igrača | `is_winner` u prva 3 meča igrača |
| Lijevak | `first_open` → `play_requested` → `match_started` → `match_ended{completed}` |
| Nove registracije | Trends → `account_registered` → Total count (Line po danu; „Cumulative" za ukupno; breakdown `method` / `platform`) |
| Aktivni registrovani | Trends → `match_started` → Unique users, filter osobe `registered = true` |
| Konverzija u nalog | Funnel `first_open` → `account_registered` |
| Lijevak pozivnice (gost) | Funnel `invite_opened` → `join_requested` → `join_approved` → `match_ended{completed}`, po osobi |
| Pozivnice po hostu | `invite_shared`: unique `room_id`, breakdown `method`. Otvaranja po sobi: spojiti sa `invite_opened` preko `room_id` (host i gost su različite osobe) |
| Pozivači (svi kanali) | Unique persons sa `invite_shared` ILI `friend_invite_sent` ÷ unique `match_started`, isti period. Prije 15.11.2026 poziv iz liste prijatelja nije bilježen |
| Poziv prijatelja → ulazak | `friend_invite_accepted` ÷ zbir `invited_count` iz `friend_invite_sent`, po `room_id` |
| Propali zahtjevi | `join_requested` − `join_approved`: zbir odbijenih i isteklih, ne razlikuju se; `wait_ms` blizu 120000 znači da je host kasnio |

**Pragovi i pravila čitanja su u `docs/PMF_PLAN.md`** (od 21.11.2026: D1 ≥ 35 %,
D7 ≥ 15 %, D30 ≥ 6 %, povratak tačno N-ti dan, presuda tek sa n ≥ 100 po grupi).
Stari orijentiri (zapisani prije podataka: D1 30–35 %, D7 12–15 %, D30 ~5 %) više ne važe.
Za aktivaciju (50–60 %) i završetak (≥ 70 %) orijentiri ostaju.

Timezone projekta: `Europe/Sarajevo`, ne mijenja se.

## Čitanje kampanje `zandar_boost_01`

Jednokratni upit, nije saved insight. Plaćena kohorta je `first_open` sa
`utm_content='52528053747929'`; bez tog parametra su Metin nalet (US/IE/SE) i ostalo.
Kohorta se dijeli na objavu ponude aplikacije (prvi `app_offer_shown`, 1.11.2026. u 08:54),
jer je tada nestala Play oznaka. Prelazak u aplikaciju nije uračunat: novi guest ID se
vidi tek kroz `app_install_attributed` (1.3.1). `landing_engaged` postoji od objave
`049a0df`, pa je `stvarno_vidjeli` za ranije posjete 0. Meč bez `match_ended` prije te
objave računaj kao nezavršen.

```sql
WITH c AS (
  SELECT person_id AS pid, min(timestamp) AS t0
  FROM events
  WHERE event = 'first_open' AND timestamp >= toDateTime('2026-10-31 09:00:00')
    AND properties.utm_content = '52528053747929'
  GROUP BY person_id
),
p AS (
  SELECT person_id AS pid,
    countIf(event = 'landing_engaged') AS seen,
    countIf(event = '$autocapture' AND elements_chain ILIKE '%home__cta--hero%') AS hero,
    countIf(event = 'app_offer_click' OR (event = '$autocapture' AND elements_chain ILIKE '%google-play-badge%')) AS app_click,
    countIf(event = 'match_started') AS started,
    countIf(event = 'hand_finished') AS hand,
    countIf(event = 'match_ended' AND properties.end_reason = 'completed') AS completed
  FROM events
  WHERE timestamp >= toDateTime('2026-10-31 09:00:00') AND person_id IN (SELECT pid FROM c)
  GROUP BY person_id
)
SELECT if(c.t0 < toDateTime('2026-11-01 08:54:00'), '1 prije ponude', '2 poslije ponude') AS kohorta,
  count() AS posjete,
  countIf(p.seen > 0) AS stvarno_vidjeli,
  countIf(p.hero > 0) AS glavno_dugme,
  countIf(p.app_click > 0) AS dodir_aplikacija,
  countIf(p.started > 0) AS pokrenuli_partiju,
  countIf(p.hand > 0) AS zavrsili_ruku,
  countIf(p.completed > 0) AS zavrsili_mec
FROM c LEFT JOIN p ON c.pid = p.pid
GROUP BY kohorta ORDER BY kohorta
```

## Meta App Events (Android, samo uz saglasnost)

Svrha: mjerenje Meta App Install kampanja. Šalje se samo instalacija i otvaranje;
nema `setUserID`, ručnih događaja o igri ni prosljeđivanja iz PostHoga. Kod:
`MetaEventsPlugin.java`, `components/MetaConsent.tsx`, `facebook-core` 19.0.0.
Stari `facebook-android-sdk-current.zip` sa Metinog sajta je 4.42.0 iz 2019: ne koristiti.

- **Saglasnost:** prompt jednom na `/`, nikad preko sobe; Nazad i dodir van lista
  znače „Ne dozvoli". Izbor se mijenja u Profil → Postavke → Mjerenje reklama.
- **Token:** `META_CLIENT_TOKEN` u `android/local.properties` (nije u repou).
  `bundleRelease`/`assembleRelease` bez njega padaju.
- **Okruženja:** SDK se pokreće samo pod paketom `com.kartaonica.zandar`. Staging
  ima isti prompt i čuva izbor, ali ne šalje ništa. Dev petlja (`dev:android`) je
  na produkcijskom paketu: tester koji dozvoli šalje prave događaje.
- **Pokretanje:** `FacebookInitProvider` je izbačen iz manifesta, pa prije
  saglasnosti SDK kod ne radi. Pokreće ga samo `sdkInitialize`, koji je javan, ali
  `@Deprecated`: provjeriti pri svakoj nadogradnji. Instalaciju šalje sam SDK kad
  učita postavke; dodatni `activateApp` bi dao dva zahtjeva za instalaciju.
- **Povlačenje ponovo pokreće aplikaciju, 3 s poslije dodira.** SDK koji radi nema
  javni način gašenja: sa ugašenim logovanjem i `EXPLICIT_ONLY` i dalje je dohvatao
  `mobile_sdk_gk`. Novi proces ga više ne diže, a odbijena saglasnost ne pokreće
  ništa, pa petlje nema. Događaji staju odmah. Odgoda postoji zbog WebView-a: upis u
  localStorage mlađi od ~1 s se pri završetku procesa gubi (0–750 ms izgubljeno, 1000 ms
  sačuvano). Ako igrač za te 3 s izađe iz aplikacije, proces samo završi.
- **Automatsko logovanje u Events Manageru mora ostati uključeno**, inače SDK ne
  šalje ništa bez obzira na kod.

Izmjereno 2026-10-31 (emulator Android 14, SDK logovi + proxy koji bilježi host,
lažan Client Token — Meta je zahtjeve odbila, pa ovo NIJE dokaz prijema):

| Scenario | Rezultat |
|---|---|
| Svjež start bez odgovora, odbijanje, odbijanje + restart | 0 konekcija ka Meti |
| Dozvola | 1 `MOBILE_APP_INSTALL`, 1 `fb_mobile_activate_app` |
| Pozadina 10 s i povratak, hladan start < 60 s | nema novog otvaranja |
| Pozadina 75 s i povratak, hladan start poslije 75 s | po 1 otvaranje |
| Povlačenje, 60 s, pa pozadina 65 s i povratak | novi proces, 0 konekcija ka Meti, 0 SDK logova |
| Upis pa povlačenje bez razmaka, 8 puta | upis sačuvan 8/8, proces stabilan, bez petlje i pada |
| Ponovna dozvola | događaji kreću ponovo |

Lažan token ne upisuje „instalacija poslana", pa se zahtjev ponavlja pri svakom
pokretanju; sa pravim tokenom ide jednom.

**Ograničenja povlačenja:** već poslano ostaje kod Mete. Događaji koji su ranije
ostali neposlani (npr. bez mreže) ostaju na telefonu i šalju se samo ako igrač
ponovo dozvoli; javnog API-ja za njihovo brisanje nema.

**S10e, pravi token (2026-10-31):** bez konekcija prije saglasnosti, poslije odbijanja i
poslije povlačenja; `MOBILE_APP_INSTALL` jednom, odgovor `success:true`. Events Manager
(Overview) je poslije ~1 h pokazao 3 instalacije i 8 otvaranja: po jedna instalacija na
svaku od tri svježe instalacije/brisanja podataka (13:50, 14:23, 14:40 UTC), dakle Meta
ih ne spaja po telefonu i nema duplikata unutar jedne instalacije. Zadnje otvaranje i
instalacija stigli su u 14:41 UTC, zajedno sa ručnim prvim otvaranjem, pa ga Meta prima
(izvedeno iz vremena, ne iz pojedinačnog događaja; ručni događaj nosi `_ui:"unknown"`,
`_inBackground:"1"`). Isti tok radi i na APK-u potpisanom upload ključem.

**Test Events ostaje prazan** na ovom telefonu: prikazuje samo događaje koje Meta može
vezati za nalog u Facebook aplikaciji, a `facebook-core` nema `<queries>` za nju. Dokaz
prijema je Overview, uz kašnjenje do ~1 h. `<queries>` nije dodat namjerno: šalje i
`attribution` iz Facebook aplikacije, što bi tražilo izmjenu saglasnosti.

**Atribucija kampanje nije dokazana:** to vide tek pravi klikovi na reklamu.

## Lažna vrata (Tablić, Remi)

Igre koje ne postoje stoje na početnoj kao prave (`status: "door"` u `apps/web/lib/games.ts`). Lijevak po igri i platformi:

1. **viđeno**: jedinstvene osobe sa `fake_door_viewed`;
2. **tapnuto**: jedinstvene osobe sa `fake_door_tapped`;
3. **ostavio e-mail**: `fake_door_signup` (osobe), a jedinstvene adrese iz `signup_succeeded` sa istim `game`.

Poređenje: udio tapnutih među onima koji su vidjeli karticu, naspram istog udjela za žive igre na istom ekranu (prvi `play_requested` sa te igre). Kartica je ista kao kod pravih igara, pa dodir mjeri želju da se igra, ne radoznalost.
