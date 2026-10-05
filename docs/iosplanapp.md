# iOS / App Store — plan

> Procjena na osnovu koda: 2026-09-13 · Stanje: **nije započeto** · Android (Capacitor 8) je živ, vidi `docs/MOBILE_PLAN_STATUS.md`
> Mac za build: **MacBook Air M4** ✅ (potvrđeno 2026-09-14)

## Pitanje
Šta treba da Žandar izađe na App Store — koliko prepravki, UX razlike, da li novi codebase, i šta je dealbreaker.

## Kratko
1. **Prepravke: male.** game-core, shared-types i server logika se ne diraju. Web sloj ~95% ostaje; posao je iOS ljuska + desetak ciljanih izmjena.
2. **UX: da, ali ciljano** — nema hardverskog *nazad*, nema vibracije, home indicator/Dynamic Island, share sheet, iOS gestovi.
3. **Novi codebase: NE.** Ista `pageExtensions`/`output: export` grana, samo `npx cap add ios` → `apps/web/ios/` pored `android/`.
4. **Pravi dealbreakeri su van koda:** Apple nalog/EU trader status, guideline 4.2 („samo web stranica"), 1.2 (nadimci = UGC), 3.1.1 (žetoni samo preko IAP-a ako se ikad prodaju).

---

## 1. Izmjene u kodu (konkretno)

| # | Šta | Gdje | Zašto |
|---|---|---|---|
| 1 | `@capacitor/ios` + `npx cap add ios` | `apps/web/package.json`, novi `apps/web/ios/` | ljuska |
| 2 | **`capacitor://localhost` u `CORS_ORIGIN`** (Railway, oba servisa) | env, `apps/server/src/index.ts` (`isAllowedOrigin`) | iOS WebView origin NIJE `https://localhost` (WKWebView ne dozvoljava https shemu za lokalni sadržaj). Bez ovoga padaju REST i socket — **isti bloker koji je Android imao** |
| 3 | `ios` blok u configu (backgroundColor, `contentInset`, StatusBar/Splash) | `apps/web/capacitor.config.ts` (sad samo `android:`) | |
| 4 | Deployment target **iOS ≥ 16.4** | Xcode projekat | Tailwind v4 + `color-mix(in oklab)` (funnel/home/lobby css), container queries (`cqw` u `.table__cards`) traže Safari 16.x. Na starijem iOS-u sto se sruši tiho |
| 5 | Haptika preko `@capacitor/haptics` iza `isNative` | `apps/web/lib/haptics.ts` | `navigator.vibrate` je na iOS-u no-op — danas iOS igrač nema NIKAKVU haptiku |
| 6 | Share sheet (`@capacitor/share`) za invite link | `components/RoomScreen.tsx` (clipboard), `components/legal/GuestIdBlock.tsx` | iOS korisnik očekuje share, ne tihi copy |
| 7 | `guestId` u `@capacitor/preferences` (fallback localStorage) | `apps/web/lib/guestId.ts` | zatvara „iOS localStorage eviction" iz Not-done; WKWebView storage je sigurniji od Safarija, ali nije garantovan |
| 8 | Web Audio: `resume()` na `visibilitychange`/poslije poziva | `apps/web/lib/sound.ts` | iOS suspenduje AudioContext na prekid (poziv, Siri) i ne vraća ga sam; unlock postoji samo na prvi gest |
| 9 | CSS: `-webkit-touch-callout:none` + `user-select:none` na kartama/stolu, `overscroll-behavior:none` na `html` u igri | `app/felt.css`, `app/globals.css` | long-press na kartu otvara lupu/selekciju; gumeni odskok skrola pomjera sto (tap-highlight i `touch-action` već postoje) |
| 10 | `build-ios.mjs` analog `build-apk.mjs` (`BUILD_TARGET=mobile` → `cap sync ios` → `xcodebuild archive`) | `apps/web/scripts/` | isti lanac, isti `TARGETS`, isto brisanje `CAP_LIVE_RELOAD_URL` |
| 11 | Info.plist: portrait lock, `ITSAppUsesNonExemptEncryption=NO`, display name, iPhone-only | `ios/App/App/Info.plist` | export compliance pitanje nestaje; iPad = obavezni iPad screenshotovi |
| 12 | Privacy manifest (`PrivacyInfo.xcprivacy`) + snižen Sentry (`sendDefaultPii: true`, `tracesSampleRate: 1`) | `instrumentation-client.ts`, `sentry.*.config.ts` | `sendDefaultPii` šalje IP → mora u nutrition label |
| 13 | Ekran „nema mreže / server nedostupan" ako ga nema | funnel | reviewer testira i bez mreže; prazan/zaglavljen ekran = odbijanje 2.1 |

**Ne treba dirati:**
- `resolveApiBase` — već nema localhost fallback-a u native buildu.
- `PwaManager` — već ćuti na native (SW ionako ne radi pod `capacitor://`).
- `NativeShell` — hardversko nazad je samo Android; `exitApp` se na iOS-u nikad ne okine — i ne smije, Apple odbija app koji se sam gasi.
- `StoreRow` — već skriven na native, i MORA ostati: pominjanje Google Playa u iOS appu = odbijanje 2.3.10.
- Safe-area — `viewport-fit: cover` + `--safe-*` su već u budžetu pozornice (`felt.css`, `--stage-hand-top`, `--rim-top`).

## 2. UX razlike iOS vs Android

- **Nema *nazad* dugmeta.** Svaki ekran/sheet mora imati vidljiv izlaz (X / strelica). `lib/backHandlers.ts` rješava samo Android. Provjeriti svaki overlay: pravila, meni, rezultat, lobby, matching.
- **Home indicator (34px) + Dynamic Island (~59px).** Budžet visine stola je IZMJEREN na S10e gdje su inseti ≈ 0. Na iPhoneu 15 (393×852) to je ~93px manje — ponaša se kao niži ekran, karta se smanjuje. Ponoviti CDP mjerenje sa `Emulation.setSafeAreaInsetsOverride` (393×852, 430×932, SE 375×667) prije nego što se tvrdi da staje.
- **Pozadina:** iOS suspenduje JS par sekundi nakon odlaska u pozadinu → socket pada → server grace 30s → pauza za ostale. Logika postoji (D2 reconnect + PRD v2 §32 pauza), ali će se na iOS-u okidati češće. Testirati poziv usred ruke.
- **Mute prekidač gasi Web Audio** — očekivano ponašanje, ne bug.
- **Tastatura** (NameStep, create, join): na iOS-u gura WebView; provjeriti da CTA ostaje vidljiv (`@capacitor/keyboard` resize mode ako ne).
- **Swipe-back gest** — po defaultu isključen u WKWebView; ostaviti isključen u igri (slučajni izlaz iz ruke).

## 3. Codebase
Isti monorepo, isti `apps/web`. `ios/` ide u git kao `android/`. Capacitor 8 koristi SPM (bez CocoaPods). Web build (`build:mobile`) može na Windowsu; `cap sync ios` + potpis + archive — **samo na macOS-u**. Najjednostavnije je da se na Macu radi cijeli lanac (web build + iOS build), bez prenošenja fajlova sa Windowsa.

### Postavljanje Maca (MacBook Air M4)
1. **Xcode** iz Mac App Store-a. Otvoriti ga jednom (instalira komponente i iOS platformu/simulator), pa `sudo xcodebuild -license accept`. Računati 30–40 GB prostora.
2. **Node ≥ 20** (root `package.json` `engines`) + `corepack enable` za pnpm. Lockfile je `lockfileVersion: '9.0'` → pnpm 9 ili 10.
3. `git clone` repoa (`Trivaaa/zandar`) → `pnpm install --frozen-lockfile`.
4. **`apps/web/.env.local` i `apps/web/.env.sentry-build-plugin` NISU u gitu** — prenijeti ih ručno (PostHog ključevi, Sentry token). Adrese servera ne treba prepisivati: `scripts/build-mobile.mjs` ih nameće iz mape `TARGETS` i odbija `http://`.
5. `pnpm --filter web build:mobile` — provjera da web build prolazi i na macOS-u prije nego što se dira iOS.
6. Xcode → Settings → Accounts → dodati Apple ID. **Besplatan Apple ID je dovoljan da se app instalira na SVOJ iPhone** (profil ističe za 7 dana; bez TestFlighta i App Storea) — dakle #1–#13 i mjerenje na uređaju mogu prije plaćanja $99.
7. iPhone: Settings → Privacy & Security → **Developer Mode** uključen; prvo povezivanje kablom, poslije može bežično.
8. Windows zamke ovdje ne važe: nema Avast TLS presretanja, JDK verzija ni EBUSY na `out/`.

## 4. Dealbreakeri i važne stvari

### 🔴 Blokira bez izuzetka
- ~~**Mac + Xcode.**~~ **Riješeno** — MacBook Air M4 (Apple Silicon, podržan u dogledno vrijeme). Postavljanje: §3. Ostaje potreban **pravi iPhone** za test — simulator ne pokazuje haptiku ni stvarne performanse.
- **Apple Developer Program** $99/god. **Individual** = lično ime kao prodavac. **Organization** = treba firma + D-U-N-S broj (može trajati sedmicama).
- **EU DSA trader status.** Za distribuciju u HR/SI (EU) mora se izjasniti; ako si trader, **adresa, telefon i email su javni na stranici appa**. Kao fizičko lice to znači kućnu adresu → razlog više za firmu.
- **`capacitor://localhost` u CORS** — bez toga app ne radi uopšte (#2).

### 🟠 Visok rizik odbijanja na reviewu
- **4.2 Minimum functionality** — Apple odbija appove koji su „web stranica u omotaču", a isti sadržaj je javno na kartaonica.com. Protiv: native haptika (#5), share sheet (#6), bez linkova koji otvaraju browser, bez web-izgleda, offline ekran (#13). Kasnije push notifikacije („tvoj red", poziv u sobu) su najjači argument.
- **1.2 User-generated content** — nadimci koje ljudi unose vide drugi igrači. Apple traži: filter + način za prijavu + blokiranje + objavljen kontakt. **Na serveru nema filtera ni limita dužine za ljudska imena** (`apps/server/src/index.ts` — samo `trim()` na `displayName`); blocklist postoji samo u generatoru bot imena. Najjeftinije: provući ljudska imena kroz postojeći profanity filter iz PRD §39 + limit dužine + „Prijavi igrača" u meniju. Uslovi već kažu „uvredljivi nadimci se uklanjaju" — mora postojati mehanizam iza te rečenice. **Koristi i Androidu.**
- **Botovi predstavljeni kao ljudi (HARD RULE 5)** — objava stoji u `/uslovi` („kompjuterski protivnici"). Play to prihvata, ali Apple je striktniji na „obmanjujuće" ponašanje. Preporuka: u App Store opisu napisati „igraj odmah — prazna mjesta popunjavaju kompjuterski protivnici" (opis nije in-game UI, pa ne krši pravilo 5) i isto u Review Notes. Ishod nije garantovan.
- **Reviewer mora moći igrati bez druge osobe** — Quick Play sa botovima to pokriva; u Review Notes napisati da je privatna soba za 2 uređaja.

### 🟡 Mora biti tačno, inače odbijanje ili kasniji problem
- **3.1.1 In-App Purchase:** žetoni se sad ne prodaju — OK. Ako se ikad prodaju (i kozmetika), **na iOS-u isključivo Apple IAP** (30%, ili 15% u Small Business programu). Stripe/web link u appu = odbijanje. Planirati uz monetizaciju, ne poslije.
- **Reklame:** ako ad SDK koristi IDFA → **App Tracking Transparency** prompt + privacy label.
- **App Privacy (nutrition labels):** PostHog (usage, identifikator), Sentry (crash, IP zbog `sendDefaultPii`), nadimak. Mora se slagati sa `/privatnost`.
- **Brisanje naloga (5.1.1(v))** obavezno samo ako postoje nalozi — ovdje ih nema (guest). Stranica za brisanje podataka (`GuestIdBlock`) je dobra osnova; ako ikad dođu nalozi, brisanje mora biti u appu.
- **Age rating** (Apple upitnik 4+/9+/13+/16+/18+): „Simulated Gambling" = NE (Žandar nije kazino igra, žetoni nemaju vrijednost). Uslovi kažu 13+ → uskladiti.
- **Nikad ne pominjati Android/Google Play** u iOS appu i metapodacima.
- **Asseti:** ikona 1024×1024 **bez alpha kanala** (sad postoji samo 512 — ista rupa kao za Play), screenshotovi 6.9" iPhone, support URL + privacy URL (`/privatnost` već javan). `kontakt@kartaonica.com` je još placeholder u pravnim stranicama.
- **Staging na iOS-u:** `com.kartaonica.zandar.staging` = zaseban App ID i zaseban app zapis u App Store Connect; distribucija kroz TestFlight (interno, bez reviewa).

## Predloženi redoslijed
1. Odluka: Individual vs Organization nalog (zbog trader adrese). ← van koda, najduže traje. Paralelno: postaviti Mac (§3) i instalirati na svoj iPhone besplatnim Apple ID-em.
2. Kod koji koristi i Androidu: filter ljudskih imena + „Prijavi igrača" (1.2), haptics plugin, share, preferences, offline ekran, CSS callout/overscroll, Sentry PII.
3. `cap add ios`, CORS env, config, Info.plist, `build-ios.mjs`.
4. Mjerenje stola sa iOS insetima (CDP `setSafeAreaInsetsOverride`), pa pravi iPhone.
5. TestFlight interno → App Store Connect metapodaci/privacy/age rating → review.

## Verifikacija (kad se gradi)
- `curl -i -H "Origin: capacitor://localhost" https://<server>/health` → `access-control-allow-origin` prisutan, na oba servisa.
- CDP mjerači (`measure`/`caption`/`roundend`) ponovljeni na 393×852 i 375×667 sa insetima top 59 / bottom 34 → nula sudara.
- Na iPhoneu: Quick Play cijela ruka, poziv usred ruke (pozadina → povratak), mute prekidač, long-press na kartu, invite share, portrait lock.
- Raspakovan `.ipa`: `capacitor.config.json` bez `server.url` (ista zamka kao APK).
- typecheck, lint baseline, svi testovi zeleni.
