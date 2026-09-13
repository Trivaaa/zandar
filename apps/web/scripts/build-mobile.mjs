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
import { createRequire } from "node:module";

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
  },
  staging: {
    NEXT_PUBLIC_API_URL: "https://zandar-staging.up.railway.app",
    NEXT_PUBLIC_WEB_URL: "https://zandar-staging.vercel.app",
    NEXT_PUBLIC_APP_ENV: "staging",
  },
};

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
  const env = { ...process.env, BUILD_TARGET: "mobile", NEXT_PUBLIC_PLATFORM: "native" };
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
  return env;
}

/** Ispis odabranog cilja — jedina vidljiva razlika između dva APK-a. */
export function logTarget(target, env) {
  console.log(`▲ mobile build · ${target.toUpperCase()}`);
  for (const key of Object.keys(TARGETS[target])) console.log(`  ${key}=${env[key]}`);
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

  child.on("exit", (code) => process.exit(code ?? 1));
}
