# Analitika — Kartaonica

Jedini alat je **PostHog** (EU). KPI-evi se računaju u PostHogu iz sirovih
događaja — u kodu nema metrika, agregacija ni `dau` događaja.

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

Izvor saobraćaja: posthog-js sam postavlja `$initial_utm_*` i
`$initial_referring_domain` kao set-once osobine osobe. Instalacije iz Play
Store-a: Play Console → Acquisition.

Testeri: `?tester=1` postavlja osobinu osobe `is_tester=true` (`?tester=0` je
skida). U PostHogu: *Filter out internal and test users* → `is_tester = true`.

## Događaji

| Događaj | Gdje | Kad / idempotentnost | Parametri |
|---|---|---|---|
| `first_open` | klijent | Jednom po guest ID-u. Zatečeni igrači (ID od prije) se tiho označe. Ne na `/privatnost`, `/privacy`, `/uslovi`, `/delete-account`, `/o-nama` — tamo čeka prvo otvaranje igre. | — |
| `play_requested` | klijent | Pritisak na Quick Play, kreiranje sobe, slanje zahtjeva za ulazak (`lib/api.ts`). | `mode` |
| `match_started` | server | Jednom po čovjeku po `match_id` (Quick Play, host `/start`, revanš). Botovi nikad. | `mode`, `match_id`, `player_count`, `human_count`, `bot_count`, `target_score`, `is_rematch`, `platform?` |
| `match_ended` | server | Jednom po čovjeku po `match_id`, uključujući čovjeka koji je pao s veze. Kraj i prekid dijele guard. | `mode`, `match_id`, `end_reason`, `hands_played`, `duration_ms?`, `is_winner?`, `platform?` |
| `hand_finished` | server | Jednom po čovjeku po ruci (zadnja ruka meča ide kao `match_ended`). | `roomId`, `matchId`, `handNumber`, `playerCount`, `isPublic`, `humansAtTable`, `botsAtTable`, `botSeatShare` |
| `signup_succeeded` | server | Samo nova prijava (ponovljena ne). | `game`, `platform` |
| `teaser_opened` | klijent | Otvorena stranica buduće igre. | `game` |
| `upcoming_games_viewed` | klijent | Sekcija budućih igara ušla u ekran. | — |

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

Orijentiri (casual kartaške igre, zapisani PRIJE podataka): D1 30–35%, D7
12–15%, D30 ~5%, aktivacija 50–60%, završetak ≥70%, DAU/MAU 15–20%. Sedmična
kohorta ispod ~100 novih igrača se ne čita kao broj — samo trend.

Timezone projekta: `Europe/Sarajevo`, ne mijenja se.
