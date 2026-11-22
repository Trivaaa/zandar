/**
 * Mobilni build (Capacitor): `next build` sa BUILD_TARGET=mobile → `out/`.
 *
 * Postoji kao skripta umjesto `BUILD_TARGET=mobile next build` u package.json
 * jer taj inline oblik ne radi u PowerShell-u/cmd-u, a dev okruženje je Windows.
 * Bez novih zavisnosti — `cross-env` bi značio još jedan paket iz registry-ja.
 *
 * Skripta EKSPLICITNO postavlja adrese, jer bi ih inače pokupila iz
 * `.env.local` — a tamo stoji LAN IP preko običnog HTTP-a za testiranje sa
 * telefona. Takav APK je mrtav: Android po defaultu blokira cleartext, a i IP
 * se mijenja. Vrijednosti iz shell-a imaju prednost, ali `http://` ovdje pada
 * namjerno, prije builda, a ne tek na telefonu.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";

/**
 * Adrese po okruženju. Ovo je JEDINA razlika između staging i produkcijskog
 * APK-a — oba nose isti kod i iste assete — pa se odabrani cilj ispisuje
 * glasno: jedini način da se pogrešno usmjeren APK primijeti prije telefona.
 *
 * Vidi CLAUDE.md Deployment za mapu okruženja.
 */
export const TARGETS = {
  prod: {
    NEXT_PUBLIC_API_URL: "https://zandar-test.up.railway.app",
    NEXT_PUBLIC_WEB_URL: "https://kartaonica.com",
    NEXT_PUBLIC_APP_ENV: "production",
    // Izdanje 1.4.0 (odluka vlasnika 2026-11-09): Poker i Raub u produkcijskoj
    // aplikaciji. Poker traži ažuriran IARC upitnik (simulirano kockanje) prije
    // slanja na pregled. Web isto pali `NEXT_PUBLIC_POKER/RAUB=1` na Vercelu.
    NEXT_PUBLIC_POKER: "1",
    NEXT_PUBLIC_RAUB: "1",
    // Izdanje 1.5.0 (odluka vlasnika 2026-11-22): Bela kao BETA. Web isto pali
    // `NEXT_PUBLIC_BELA=1` na Vercelu.
    NEXT_PUBLIC_BELA: "1",
  },
  staging: {
    NEXT_PUBLIC_API_URL: "https://zandar-production.up.railway.app",
    NEXT_PUBLIC_WEB_URL: "https://zandar-web.vercel.app",
    NEXT_PUBLIC_APP_ENV: "staging",
  },
};

/**
 * Koji gradle build tip pakuje APK za cilj — a time i čiji `google-services.json`
 * nosi (vidi `android/app/build.gradle`). Prod APK je zasad debug build.
 */
const PUSH_BUILD_TYPE = { prod: "debug", staging: "staging" };

/**
 * `NEXT_PUBLIC_PUSH` za build tip: "1" SAMO kad APK stvarno nosi Firebase
 * konfiguraciju. Bez nje `PushNotifications.register()` ruši aplikaciju u
 * native kodu ("Default FirebaseApp is not initialized"), što JS ne može
 * uhvatiti — pa se push ne smije ni pokušati. Namjerno bez nadjačavanja iz
 * shell-a: "1" bez fajla je APK koji pada.
 */
export function pushFlag(buildType) {
  const app = join(import.meta.dirname, "..", "android", "app");
  const candidates = [
    join(app, "google-services.json"),
    join(app, "src", buildType, "google-services.json"),
  ];
  return candidates.some((file) => existsSync(file)) ? "1" : "0";
}

/**
 * Od Google prijave (`@capacitor-firebase/authentication`) APK BEZ Firebase
 * konfiguracije pada već na startu: plugin pri učitavanju zove
 * `FirebaseAuth.getInstance()`. Ranije je bez fajla samo push bio ugašen —
 * sada build odbija, jer bi APK koji se ne otvara bio gori od nikakvog.
 */
export function requireFirebaseConfig(buildType) {
  if (pushFlag(buildType) === "1") return;
  console.error(
    `\n✗ Nema google-services.json za build tip "${buildType}".\n` +
      `  Očekivano: android/app/src/${buildType}/google-services.json (ili android/app/google-services.json).\n` +
      `  Bez njega aplikacija pada pri pokretanju (Firebase Auth plugin). Fajl se preuzima\n` +
      `  iz Firebase konzole → Project settings → Your apps → Android.\n`,
  );
  process.exit(1);
}

/**
 * Ključevi koje produkcijski build MORA zapeći u bundle, a ne dolaze iz `TARGETS`
 * nego iz `.env.local` (nije u gitu). 1.4.5 je izgrađen iz svježeg worktree-a bez
 * tog fajla: `posthog.init(undefined)` ne baca ništa, pa aplikacija sa Play-a
 * nije poslala nijedan klijentski događaj (changelog 202). Zato build odbija.
 */
export const REQUIRED_PROD_KEYS = ["NEXT_PUBLIC_POSTHOG_KEY", "NEXT_PUBLIC_POSTHOG_HOST"];

/**
 * Šta će `next build` stvarno vidjeti: shell + `.env*` fajlovi, istim
 * učitavačem koji koristi Next (`@next/env`, preko `next`-a jer pnpm ga ne
 * izlaže direktno).
 */
function envAsNextSeesIt(env) {
  const fromNext = createRequire(createRequire(import.meta.url).resolve("next/package.json"));
  const { loadEnvConfig } = fromNext("@next/env");
  const silent = { info() {}, error() {} };
  const { combinedEnv } = loadEnvConfig(join(import.meta.dirname, ".."), false, silent, true);
  return { ...combinedEnv, ...env };
}

export function requireAnalyticsKeys(env) {
  if (env.NEXT_PUBLIC_APP_ENV !== "production") return;
  const seen = envAsNextSeesIt(env);
  const missing = REQUIRED_PROD_KEYS.filter((key) => !seen[key]);
  if (missing.length === 0) return;
  console.error(
    `\n✗ Nedostaje ${missing.join(", ")} za produkcijski build.\n` +
      `  Dolaze iz apps/web/.env.local (nije u gitu — novi worktree ga nema).\n` +
      `  Bez njih aplikacija radi, ali PostHog tiho ne šalje ništa.\n` +
      `  Kopiraj .env.local (i .env.sentry-build-plugin) iz glavnog foldera.\n`,
  );
  process.exit(1);
}

/**
 * Poslije `next build`: ključ mora STVARNO biti u izvezenom JS-u, ne samo u
 * okruženju. `requireAnalyticsKeys` hvata fajl koji fali; ovo hvata sve ostalo
 * (prazna vrijednost, pogrešno ime varijable, bundler je izbacio granu).
 * Vraća skraćen ključ za ispis, `null` za staging/dev.
 */
export function verifyAnalyticsInBundle(distDir, env) {
  if (env.NEXT_PUBLIC_APP_ENV !== "production") return null;
  const key = envAsNextSeesIt(env).NEXT_PUBLIC_POSTHOG_KEY ?? "";
  const found = key.length > 0 && bundleContains(join(distDir, "_next", "static"), key);
  if (!found) {
    console.error(
      `\n✗ PostHog ključ nije u izvezenom bundle-u (${distDir}).\n` +
        `  Aplikacija bi radila, ali ne bi slala nijedan klijentski događaj (changelog 202).\n`,
    );
    process.exit(1);
  }
  return `${key.slice(0, 8)}…`;
}

function bundleContains(dir, needle) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (bundleContains(path, needle)) return true;
    } else if (entry.name.endsWith(".js") && readFileSync(path, "utf8").includes(needle)) {
      return true;
    }
  }
  return false;
}

/** `--env staging` | `--env=staging`; bez argumenta ostaje produkcija (zatečeno ponašanje). */
export function parseTarget(argv) {
  const flag = argv.indexOf("--env");
  const raw =
    flag !== -1 ? argv[flag + 1] : argv.find((a) => a.startsWith("--env="))?.slice(6);
  const name = raw || "prod";
  if (!TARGETS[name]) {
    console.error(`\n✗ --env ${name}\n  Poznati ciljevi: ${Object.keys(TARGETS).join(", ")}\n`);
    process.exit(1);
  }
  return name;
}

/**
 * Sklopi env za `next build`. Shell nadjačava mapu (npr. jednokratni test
 * protiv druge adrese), ali HTTPS provjera važi i tada.
 */
export function mobileEnv(target) {
  const env = {
    ...process.env,
    BUILD_TARGET: "mobile",
    NEXT_PUBLIC_PLATFORM: "native",
    NEXT_PUBLIC_PUSH: pushFlag(PUSH_BUILD_TYPE[target]),
  };
  requireFirebaseConfig(PUSH_BUILD_TYPE[target]);
  for (const [key, fallback] of Object.entries(TARGETS[target])) {
    env[key] = process.env[key] || fallback;
  }
  for (const key of ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_WEB_URL"]) {
    if (!env[key].startsWith("https://")) {
      console.error(
        `\n✗ ${key}=${env[key]}\n` +
          `  Mobilni build traži HTTPS. Android blokira cleartext saobraćaj, pa bi\n` +
          `  aplikacija instalirala i otvorila se, ali bi svaki potez tiho pao.\n`,
      );
      process.exit(1);
    }
  }
  requireAnalyticsKeys(env);
  return env;
}

/** Ispis odabranog cilja — jedina vidljiva razlika između dva APK-a. */
export function logTarget(target, env) {
  console.log(`▲ mobile build · ${target.toUpperCase()}`);
  for (const key of Object.keys(TARGETS[target])) console.log(`  ${key}=${env[key]}`);
  console.log(
    `  NEXT_PUBLIC_PUSH=${env.NEXT_PUBLIC_PUSH}` +
      (env.NEXT_PUBLIC_PUSH === "1" ? "" : ` (nema google-services.json za ${PUSH_BUILD_TYPE[target]})`),
  );
}

// Kao skripta: odradi build. Kao import (`build-apk.mjs`): samo izvezi gornje.
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("build-mobile.mjs")) {
  const target = parseTarget(process.argv.slice(2));
  const env = mobileEnv(target);
  logTarget(target, env);

  const require = createRequire(import.meta.url);
  const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
    stdio: "inherit",
    env,
  });

  child.on("exit", (code) => {
    if (code === 0) {
      const distDir = join(import.meta.dirname, "..", process.env.MOBILE_DIST_DIR || "out");
      const key = verifyAnalyticsInBundle(distDir, env);
      if (key) console.log(`✓ PostHog ključ u bundle-u: ${key}`);
    }
    process.exit(code ?? 1);
  });
}
