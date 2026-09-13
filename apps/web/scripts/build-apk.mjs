/**
 * Pun APK lanac za jedno okruženje: `next build` → `cap sync` → `gradlew`.
 *
 *   pnpm apk:staging   → com.kartaonica.zandar.staging, gađa staging server
 *   pnpm apk:prod      → com.kartaonica.zandar,         gađa produkciju
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

import { parseTarget, mobileEnv, logTarget } from "./build-mobile.mjs";

/** Koji gradle task i gdje ostavi APK, po cilju. */
const GRADLE = {
  staging: { task: "assembleStaging", apk: join("staging", "app-staging.apk") },
  // Produkcija zasad ide kao debug build — release je NEPOTPISAN dok ne stigne
  // upload keystore (Play staza, zaseban korak).
  prod: { task: "assembleDebug", apk: join("debug", "app-debug.apk") },
};

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const capBin = require.resolve("@capacitor/cli/bin/capacitor");
const androidDir = join(import.meta.dirname, "..", "android");
const sdk = join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");

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
const env = mobileEnv(target);
const { task, apk } = GRADLE[target];

logTarget(target, env);

// Živi APK ne smije da nosi live-reload adresu — vidi komentar na vrhu.
const cleanEnv = { ...process.env };
delete cleanEnv.CAP_LIVE_RELOAD_URL;

try {
  // 1. Web u `out/`, sa adresama ovog okruženja zapečenim u bundle.
  await run(process.execPath, [nextBin, "build"], { env });

  // 2. `out/` + config u native projekat, bez `server.url`.
  await run(process.execPath, [capBin, "sync", "android"], { env: cleanEnv });

  // 3. APK. `shell: true` NIJE kozmetika: Node od 20.12 odbija da spawn-uje
  //    `.bat` bez njega (CVE-2024-27980) — padne na golo `spawn EINVAL`.
  await run(`"${join(androidDir, "gradlew.bat")}"`, [task], {
    cwd: androidDir,
    shell: true,
    env: { ...cleanEnv, ANDROID_HOME: process.env.ANDROID_HOME || sdk },
  });

  const out = join(androidDir, "app", "build", "outputs", "apk", apk);
  console.log(
    [
      "",
      `✓ ${target.toUpperCase()} APK`,
      `  ${out}`,
      `  adb install -r "${out}"`,
      "",
    ].join("\n"),
  );
} catch (err) {
  console.error(`\n✗ ${err.message}\n`);
  process.exit(1);
}
