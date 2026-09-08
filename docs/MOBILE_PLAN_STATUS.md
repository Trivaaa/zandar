# Mobile Plan — Status

> Tablić - Žandar · native mobilna aplikacija (Android sad, iOS kasnije)
> Procjena: 2026-06-11 · Gradnja: 2026-09-08 · Stack: Next.js 16 + React 19 + Tailwind 4 + socket.io-client

---

## TL;DR

Odluka je pala na **Capacitor** (ne TWA): daje push i Play Billing šine za kasnije,
po cijenu statičkog exporta. Web sloj je **gotov i verifikovan** — `pnpm build`
(Vercel) i `pnpm build:mobile` (`output: export`) prolaze iz iste konfiguracije,
Android projekat je skelet-iran i sinhronizovan.

Ostaje **toolchain + Play Console**, ne kod.

---

## 1. Šta je urađeno (2026-09-08)

| Dio | Gdje |
|-----|------|
| Query rute kao kanonske (`/room?id=`, `/matching?id=`) | `lib/routes.ts`, `app/room/page.tsx`, `app/matching/page.tsx` |
| `RoomScreen` / `MatchingScreen` izvučeni; duplikat path-stranica obrisan | `components/RoomScreen.tsx`, `components/MatchingScreen.tsx` |
| Path rute ostaju **samo na webu** (invite linkovi) | `app/room/[roomId]/page.web.tsx`, `app/matching/[roomId]/page.web.tsx` |
| Dva build oblika iz jedne konfiguracije | `next.config.ts` (`BUILD_TARGET=mobile`) |
| Mobilni build bez novih zavisnosti (Windows-safe) | `scripts/build-mobile.mjs` → `pnpm build:mobile` |
| Native straže (SW, API base, back dugme, clipboard) | `lib/platform.ts`, `components/NativeShell.tsx`, `components/PwaManager.tsx` |
| Capacitor + Android projekat | `capacitor.config.ts`, `android/` |
| Pravne stranice (Play uslov + objava o botovima) | `app/privatnost/`, `app/uslovi/` |

### Mehanizam koji sve drži

`pageExtensions`. U web buildu lista sadrži `web.tsx`, pa `page.web.tsx` postaje
ruta `/room/:roomId`. U mobilnom je nema, Next fajl ignoriše, `[roomId]` folder
ostaje bez `page` fajla → **nema dinamičkog segmenta** → `output: "export"`
prolazi bez `generateStaticParams` (roomId se ne zna unaprijed).

Duži oblik (`web.tsx`) mora ići **prvi** u listi — Next skida ekstenziju prvom
koja se poklopi, pa bi `tsx` od `page.web.tsx` napravio rutu `page.web`.

### Blokeri iz procjene — svi zatvoreni

1. ~~Sentry demo fajlovi~~ — obrisani u `f6a1a49`.
2. ~~`redirects()` u `next.config.ts`~~ — sad postoji samo u web grani konfiguracije.
3. ~~Dinamičke rute~~ — riješeno `pageExtensions` mehanizmom iznad.
4. **Novo, procjena ga nije predvidjela:** `app/manifest.ts` se kompajlira u
   route handler (`/manifest.webmanifest`), a `output: export` traži da svaki
   handler eksplicitno kaže `export const dynamic = "force-static"`. Bez toga
   export pada na "Failed to collect page data".

---

## 2. Verifikovano

- `pnpm build` (web) — prolazi; `/room/:roomId` i `/matching/:roomId` i dalje postoje, redirect radi.
- `pnpm build:mobile` — prolazi; `out/` ima `room/index.html` i `matching/index.html`, **nema** dinamičkih segmenata.
- `pnpm -r test` — 155/155.
- `tsc --noEmit` — čisto. Lint: 8 preostalih grešaka su `react-hooks/set-state-in-effect` u naslijeđenom kodu (postojale i prije).
- Export serviran preko HTTP-a: `/`, `/room/?id=`, `/matching/?id=`, `/brza/`, `/privatnost/`, `/uslovi/`, `/manifest.webmanifest` → svi 200; `/dev/*` → 404 ljuska; asseti idu na apsolutne `/_next/...` putanje (bitno: relativne bi pukle sa dubine `/room/`).
- `npx cap sync android` — sva 3 plugina nađena uprkos pnpm symlink-ovima; hoisting workaround **nije** bio potreban.

**Verifikovano na uređaju (2026-09-08, Galaxy S10e / SM-G970F, Android 12):**
APK instaliran preko **wireless debugging** (USB nije radio — kabl bez data linija;
`adb pair` prolazi tek kad kod ide na **stdin**, ne kao argument). Quick Play prošao
cijeli put: REST na Railway, socket, `https://localhost` CORS, bot-fill, generisani
identiteti, dijeljenje karata, turn pilula. Bez ijedne greške u `logcat`-u.

**Nađen bug (nije Android-specifičan po svemu sudeći):** dugme `Pravila` gore lijevo
se preklapa sa sound/haptics preklopkama.

---

## 3. Šta ostaje

### Toolchain — postavljen 2026-09-08, debug APK se gradi

| Dio | Verzija / putanja |
|-----|-------------------|
| Android Studio | 2026.1.4.7 |
| **JDK 21** (Temurin) | `C:/Program Files/Eclipse Adoptium/jdk-21.0.12.101-hotspot` |
| Android SDK | `%LOCALAPPDATA%/Android/Sdk` — platform-tools 37.0.1, platforms;android-36, build-tools;36.0.0 |

**Rezultat:** `./gradlew assembleDebug` → `app-debug.apk`, 5.2 MB,
`com.kartaonica.zandar`, label `Žandar`, minSdk 24 / targetSdk 36, dozvole
INTERNET + VIBRATE, `screenOrientation=portrait`, web bundle u `assets/public/`.

#### Dvije zamke koje su koštale vremena

**1. Avast presreće HTTPS — Gradle nije mogao ni sebe da skine.**
`PKIX path building failed`. Avast MITM-uje TLS svojim rootom
(`Avast Web/Mail Shield Root`); Windows i browseri mu vjeruju, ali **Java ima
odvojen truststore**. Isti uzrok je ranije oborio `pg` install.

Rješenje bez diranja AV-a i bez admin prava: kopija JDK `cacerts` + Avastov root
u `~/.gradle/cacerts-avast`, uvezana kroz `~/.gradle/gradle.properties`
(`systemProp.javax.net.ssl.trustStore`) i `GRADLE_OPTS`. Kopija, ne izmjena
JDK-a — preživi update Studia.

> Trajnije, za SVE alate (npm, `pg`, …): isključiti HTTPS scanning u Avastu
> (Settings → Protection → Core Shields → Web Shield → Enable HTTPS scanning).

**2. Android Studio 2026.1 nosi JDK 25, a Gradle 8.14.3 ga ne podržava.**
`Unsupported class file major version 69`. Zato zaseban **Temurin 21**, a
`org.gradle.java.home` u `~/.gradle/gradle.properties` tjera i Studijev daemon
na 21. (Procjena je pretpostavljala da bundlovani JDK bude 21 — nije.)

#### Env varijable (trajno, User scope)

```
JAVA_HOME     C:/Program Files/Eclipse Adoptium/jdk-21.0.12.101-hotspot
ANDROID_HOME  C:/Users/User/AppData/Local/Android/Sdk
GRADLE_OPTS   -Djavax.net.ssl.trustStore=C:/Users/User/.gradle/cacerts-avast -Djavax.net.ssl.trustStorePassword=changeit
```

`apps/web/android/local.properties` (gitignored) nosi `sdk.dir`.

### Konfiguracija okruženja

- **Railway `CORS_ORIGIN` mora dobiti `https://localhost`** — to je origin
  Capacitor WebView-a (`androidScheme: "https"`). Lista je exact-match, bez
  wildcard-a, i dijele je Fastify CORS i Socket.IO handshake, pa bez ovoga
  **i REST i socket padaju**. (`apps/server/src/index.ts:57`)
- Mobilni build treba: `NEXT_PUBLIC_API_URL` (HTTPS — Android blokira cleartext),
  `NEXT_PUBLIC_WEB_URL=https://kartaonica.com` (bez toga je invite link
  `https://localhost/...` = mrtav), i PostHog ključeve.
- Vercel ostaje netaknut — nema `BUILD_TARGET`, pa zadržava server build,
  `redirects()` i path rute.

### Ikone

`@capacitor/assets` traži **1024×1024** master. Postoje samo 512. Treba
izrenderovati 1024 iz istog izvora kao `icon-512.png`.

### Play Console

Nalog ($25) · upload key + Play App Signing · **Data Safety** obrazac (PostHog +
Sentry; Sentry je na `sendDefaultPii: true` i `tracesSampleRate: 1` — razmisli o
snižavanju za mobilni) · content rating · listing (512 ikona, 1024×500 feature
grafika, ≥2 screenshot-a) · URL politike privatnosti · **prvo internal testing**.

### Pravne stranice

`app/privatnost/` i `app/uslovi/` su **nacrti, ne pravni savjet**. Pregledaj ih —
posebno kontakt adresu, koja je zasad `kontakt@kartaonica.com` (placeholder).

Uslovi nose objavu o kompjuterskim protivnicima. To je **jedino** mjesto gdje ta
riječ smije da postoji (HARD RULE 5); u igri ostaje nevidljiva.

---

## 4. iOS

Ista Capacitor grana, uz Mac + Xcode + Apple Developer nalog ($99/god).
React Native se i dalje ne preporučuje — značio bi rewrite cijelog UI sloja.
