/**
 * Pun APK lanac za jedno okruženje: `next build` → `cap sync` → `gradlew`.
 *
 *   pnpm apk:staging   → com.kartaonica.zandar.staging, gađa staging server (debug potpis)
 *   pnpm apk:prod      → com.kartaonica.zandar,         gađa produkciju (debug potpis, za uređaj)
 *   pnpm aab:prod      → com.kartaonica.zandar,         gađa produkciju (RELEASE potpis, za Play)
 *
 * `--release` traži `android/keystore.properties` (vidi build.gradle) i pravi
 * potpisan `.aab` umjesto debug `.apk` — samo uz `--env prod`, jer staging
 * namjerno ostaje debug-potpisan da se instalira pored produkcijske app.
 *
 * Postoji da se tri koraka ne rade ručno, jer su dva od njih već koštala:
 *
 *  1. `CAP_LIVE_RELOAD_URL` se BRIŠE iz okruženja prije `cap sync`-a. Ako je
 *     postavljen (a ostane postavljen poslije `pnpm dev:android` u istoj
 *     ljusci), Capacitor upiše `server.url` u `capacitor.config.json` unutar
 *     APK-a. Takav APK radi dok dev server živi, a kad se ugasi diže se na
 *     crno. `env -u VAR` ne postoji u PowerShell-u — otud skripta.
 *  2. Web asseti i `capacitor.config.json` su ZAJEDNIČKI za sve buildType-ove
 *     (`android/app/src/main/assets/`), pa adresu servera ne nosi gradle nego
 *     ono što je `build:mobile` posljednje ostavilo u `out/`. Zato ova tri
 *     koraka moraju ići jedan za drugim, u ovom redoslijedu, uvijek.
 *
 * Vidi CLAUDE.md Deployment za mapu okruženja.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { readdir, rm } from "node:fs/promises";

import { parseTarget, mobileEnv, logTarget } from "./build-mobile.mjs";

/** Koji gradle task i gdje ostavi artefakt, po cilju. `out` je relativan na
 *  `app/build/outputs/`, jer se APK i AAB granaju ispod različitih podfoldera. */
const GRADLE = {
  staging: { task: "assembleStaging", out: join("apk", "staging", "app-staging.apk"), kind: "apk" },
  // Produkcija zasad ide kao debug build — release je NEPOTPISAN dok ne stigne
  // upload keystore (Play staza, zaseban korak).
  prod: { task: "assembleDebug", out: join("apk", "debug", "app-debug.apk"), kind: "apk" },
};

const RELEASE = { task: "bundleRelease", out: join("bundle", "release", "app-release.aab"), kind: "aab" };

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const capBin = require.resolve("@capacitor/cli/bin/capacitor");
const webDir = join(import.meta.dirname, "..");
const androidDir = join(webDir, "android");
const sdk = join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");

/** Best-effort brisanje starih `out-*` foldera — ignoriši ono što je i dalje zaključano. */
async function sweepOldDistDirs(keep) {
  let entries;
  try {
    entries = await readdir(webDir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === keep) continue;
    if (entry.name !== "out" && !entry.name.startsWith("out-")) continue;
    await rm(join(webDir, entry.name), { recursive: true, force: true }).catch(() => {});
  }
}

/** Pokrene komandu i odbije obećanje na ne-nula izlaz. */
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...opts });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} → izlaz ${code}`)),
    );
  });
}

const target = parseTarget(process.argv.slice(2));
const wantsRelease = process.argv.includes("--release");

if (wantsRelease && target !== "prod") {
  console.error("\n✗ --release samo uz --env prod (staging ostaje namjerno debug-potpisan)\n");
  process.exit(1);
}

// Jedinstven izlazni folder po pozivu (vidi next.config.ts) — zaobilazi
// Windows EBUSY kad antivirus/indexer drži handle na starom `out/` i pošto
// je proces koji ga je koristio davno ugašen. `mobileEnv()` širi cijeli
// `process.env`, pa MORA biti postavljeno PRIJE tog poziva.
process.env.MOBILE_DIST_DIR = `out-${target}-${Date.now()}`;

const env = mobileEnv(target);
const { task, out, kind } = wantsRelease ? RELEASE : GRADLE[target];

logTarget(target, env);

// Živi APK ne smije da nosi live-reload adresu — vidi komentar na vrhu.
const cleanEnv = { ...process.env };
delete cleanEnv.CAP_LIVE_RELOAD_URL;

try {
  // 1. Web u jedinstven folder, sa adresama ovog okruženja zapečenim u bundle.
  await run(process.execPath, [nextBin, "build"], { env });

  // 2. Izlaz + config u native projekat, bez `server.url`.
  await run(process.execPath, [capBin, "sync", "android"], { env: cleanEnv });

  // Sadržaj je već u android/app/src/main/assets/ — folder više ne treba.
  // Best-effort: pokupi i ranije zaostale foldere koje prošli lock nije dao obrisati.
  await sweepOldDistDirs(process.env.MOBILE_DIST_DIR);

  // 3. APK. `shell: true` NIJE kozmetika: Node od 20.12 odbija da spawn-uje
  //    `.bat` bez njega (CVE-2024-27980) — padne na golo `spawn EINVAL`.
  await run(`"${join(androidDir, "gradlew.bat")}"`, [task], {
    cwd: androidDir,
    shell: true,
    env: { ...cleanEnv, ANDROID_HOME: process.env.ANDROID_HOME || sdk },
  });

  const outPath = join(androidDir, "app", "build", "outputs", out);
  console.log(
    kind === "aab"
      ? ["", `✓ ${target.toUpperCase()} AAB (release-potpisan)`, `  ${outPath}`, `  Upload u Play Console.`, ""].join("\n")
      : ["", `✓ ${target.toUpperCase()} APK`, `  ${outPath}`, `  adb install -r "${outPath}"`, ""].join("\n"),
  );
} catch (err) {
  console.error(`\n✗ ${err.message}\n`);
  process.exit(1);
}
