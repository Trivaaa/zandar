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
 * se mijenja. Vrijednosti iz shell-a imaju prednost (za staging), ali `http://`
 * ovdje pada namjerno, prije builda, a ne tek na telefonu.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

/** Produkcija — isti server i domen koje koristi web (vidi CLAUDE.md Deployment). */
const DEFAULTS = {
  NEXT_PUBLIC_API_URL: "https://zandar-test.up.railway.app",
  NEXT_PUBLIC_WEB_URL: "https://kartaonica.com",
};

const env = { ...process.env, BUILD_TARGET: "mobile", NEXT_PUBLIC_PLATFORM: "native" };

for (const [key, fallback] of Object.entries(DEFAULTS)) {
  env[key] = process.env[key] || fallback;
  if (!env[key].startsWith("https://")) {
    console.error(
      `\n✗ ${key}=${env[key]}\n` +
        `  Mobilni build traži HTTPS. Android blokira cleartext saobraćaj, pa bi\n` +
        `  aplikacija instalirala i otvorila se, ali bi svaki potez tiho pao.\n`,
    );
    process.exit(1);
  }
}

console.log(`▲ mobile build`);
for (const key of Object.keys(DEFAULTS)) console.log(`  ${key}=${env[key]}`);

const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "build"], {
  stdio: "inherit",
  env,
});

child.on("exit", (code) => process.exit(code ?? 1));
