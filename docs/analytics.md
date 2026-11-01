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

## Događaji

| Događaj | Gdje | Kad / idempotentnost | Parametri |
|---|---|---|---|
| `first_open` | klijent | Jednom po guest ID-u. Zatečeni igrači (ID od prije) se tiho označe. Ne na `/privatnost`, `/privacy`, `/uslovi`, `/delete-account`, `/o-nama` — tamo čeka prvo otvaranje igre. | — |
| `landing_engaged` | klijent | Prvi dodir ili 5 s vidljive stranice, jednom po guest ID-u; vrijeme u pozadini se ne računa. Za razliku od `first_open`, koji se šalje pri pokretanju SDK-a, znači da je stranica stvarno viđena. Važi i za zatečene igrače, pa kohortu čitaj preko `first_open`. Ne na istim stranicama kao `first_open`. | `trigger` (`visible_5s`, `tap`), `utm_source?`, `utm_medium?`, `utm_campaign?`, `utm_content?` |
| `app_offer_shown` | klijent | Ponuda aplikacije je prikazana (samo Android pregledač). Jednom po posjeti. | `place` (`home_top`, `home_open`, `match_end`) |
| `app_offer_click` | klijent | Dodir na „Preuzmi", „Google Play" ili „Otvori". Vodi van weba, nije instalacija. Link u Profilu NE šalje događaj. Zamijenio je `store_banner_clicked` (živ samo do ovog izdanja). | `place`, `utm_source?`, `utm_medium?`, `utm_campaign?`, `utm_content?` |
| `app_offer_dismiss` | klijent | Dodir na × (7 dana mira). | `place` |
| `app_install_attributed` | klijent | Aplikacija jednom po instalaciji pročita Play referrer. Stiže i za organsku instalaciju (`utm_source=google-play`, `utm_medium=organic`). Ko je već pročitao referrer u ranijem izdanju ne šalje ništa. | `has_room`, `utm_source?`, `utm_medium?`, `utm_campaign?`, `utm_content?` |
| `play_requested` | klijent | Pritisak na Quick Play, kreiranje sobe, slanje zahtjeva za ulazak (`lib/api.ts`). | `mode` |
| `match_started` | server | Jednom po čovjeku po `match_id` (Quick Play, host `/start`, revanš). Botovi nikad. | `mode`, `match_id`, `player_count`, `human_count`, `bot_count`, `target_score`, `is_rematch`, `platform?` |
| `match_ended` | server | Jednom po čovjeku po `match_id`, uključujući čovjeka koji je pao s veze. Kraj i prekid dijele guard. Sto bez povezanih ljudi na rezultatu ruke dobija prekid poslije 30 s + 10 min, pa `duration_ms` tada nosi i to čekanje; soba koju sweeper zatekne otvorenu dobija prekid pri brisanju (poslije restarta bez `duration_ms`). Mečevi prije izdanja ove popravke (1.11.2026) nemaju pouzdan kraj: meč bez kraja računaj kao nezavršen. | `mode`, `match_id`, `end_reason`, `hands_played`, `duration_ms?`, `is_winner?`, `platform?` |
| `hand_finished` | server | Jednom po čovjeku po ruci (zadnja ruka meča ide kao `match_ended`). | `roomId`, `matchId`, `handNumber`, `playerCount`, `isPublic`, `humansAtTable`, `botsAtTable`, `botSeatShare` |
| `signup_succeeded` | server | Samo nova prijava (ponovljena ne). | `game`, `platform` |
| `teaser_opened` | klijent | Otvorena stranica buduće igre. | `game` |
| `upcoming_games_viewed` | klijent | Sekcija budućih igara ušla u ekran. | — |
| `upcoming_game_tapped` | klijent | Dodir na pločicu najavljene igre na početnoj (`HomeScreen`). Mjeri interes po igri, jer jedna prijava važi za SVE najavljene igre, pa `signup_succeeded` to ne govori. | `game` |
| `account_registered` | klijent | Gost je postao nalog (isti `uid`): e-mail registracija ili povezivanje Googlea (`lib/account.ts`). Prijava na postojeći nalog NE šalje događaj. | `method` (`password` \| `google`) |
| `invite_shared` | klijent | Host poslao link kroz sistemski meni ili ga kopirao (`lib/track.ts`). Zatvoren meni NE šalje događaj. Na Androidu znači da je izabrana aplikacija, ne da je poruka stigla. | `room_id`, `method` (`share` | `copy`) |
| `invite_opened` | klijent | Gost otvorio link sobe u kojoj nema sjedište; jednom po sobi u sesiji pregledača. Ne kad već ima zapamćen zahtjev, ni kad soba ne postoji. | `room_id`, `seats_left` |
| `join_requested` | server | Zahtjev za ulazak primljen. Pun sto (409) NE šalje događaj. Bez guestId-a (stari klijent) nema događaja. | `room_id`, `platform?` |
| `join_approved` | server | Host odobrio ulazak; ide gostu. | `room_id`, `wait_ms`, `platform?` |

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
| Propali zahtjevi | `join_requested` − `join_approved`: zbir odbijenih i isteklih, ne razlikuju se; `wait_ms` blizu 120000 znači da je host kasnio |

Orijentiri (casual kartaške igre, zapisani PRIJE podataka): D1 30–35%, D7
12–15%, D30 ~5%, aktivacija 50–60%, završetak ≥70%, DAU/MAU 15–20%. Sedmična
kohorta ispod ~100 novih igrača se ne čita kao broj — samo trend.

Timezone projekta: `Europe/Sarajevo`, ne mijenja se.

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
