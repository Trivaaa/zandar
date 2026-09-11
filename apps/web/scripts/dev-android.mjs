/**
 * Live-reload petlja za Android: APK učitava `next dev` sa LAN adrese umjesto
 * `out/`-a sa diska. Snimiš fajl → ekran se osvježi. Bez `build:mobile`, bez
 * `cap sync`, bez `gradlew` po svakoj izmjeni.
 *
 * Postoji kao skripta iz istog razloga kao `build-mobile.mjs`: inline
 * `VAR=x komanda` ne radi u PowerShell-u, a dev okruženje je Windows. Uz to
 * mora da poveže tri stvari koje `cap run` sam ne zna:
 *
 *  1. `NEXT_PUBLIC_PLATFORM=native` — bez toga je `isNative` false (build-time
 *     konstanta, `lib/platform.ts`), pa live reload testira WEB ponašanje:
 *     hardversko *nazad* gasi app, `PwaManager` se javlja, API base pada na
 *     localhost. Tad ne testiraš aplikaciju nego sajt u WebView-u.
 *  2. `NEXT_DEV_ORIGIN` — Next 16 po defaultu blokira cross-origin pristup dev
 *     resursima, pa bi HMR i error overlay tiho otkazali na LAN adresi
 *     (mehanizam već postoji u `next.config.ts`).
 *  3. Tačan LAN IP. Capacitor ume sam da pogodi adresu, ali bira iz SVIH
 *     interfejsa — na ovoj mašini postoji i Tailscale (100.x), koji telefon u
 *     kućnoj mreži ne vidi. Zato ga biramo eksplicitno i preferiramo 192.168.x.
 *
 * Šta ovo NE pokriva: `output: "export"` i `pageExtensions` grane se u dev-u ne
 * izvršavaju, pa path rute (`/room/:id`) ovdje postoje a u APK-u ne. Prije
 * izdanja i dalje ide pravi `pnpm cap:sync` + `gradlew`.
 *
 * Cleartext: `CAP_LIVE_RELOAD_URL` uključi `server.cleartext` u
 * `capacitor.config.ts`, a Capacitor tu zastavicu upiše u GENERISANI
 * `capacitor-cordova-android-plugins` manifest (nije u gitu), ne u
 * `app/src/main/AndroidManifest.xml`. Repo ostaje čist, izdanje ostaje bez
 * cleartext-a čim se odradi običan `pnpm cap:sync`.
 *
 * Zašto koraci ručno a ne `cap run --live-reload`: Capacitor hardkodira
 * `./gradlew` (`@capacitor/cli/dist/android/run.js`), što cmd na Windowsu ne
 * ume da pokrene — traži `gradlew.bat`. Ista tri koraka su ovdje ispisana.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { networkInterfaces } from "node:os";
import { connect } from "node:net";
import { join } from "node:path";

/**
 * Port se BIRA, ne pretpostavlja. Ako na 3000 vec nesto slusa — a tipicno je to
 * tvoj obicni `pnpm dev` — onda bi `waitForPort` dobio odgovor od TUDJEG
 * servera i skripta bi vesela nastavila da gradi APK koji gadja pogresnu
 * instancu (bez `NEXT_PUBLIC_PLATFORM=native`, sa drugim `NEXT_DEV_ORIGIN`).
 * Tiha, a skupa greska: vidis ekran, ali ne onaj koji misilis da vidis.
 */
async function findFreePort(start) {
  const { createServer } = await import("node:net");
  // Obje adrese, ne samo `0.0.0.0`: Windows dozvoljava da se veze na wildcard
  // dok je `127.0.0.1` zauzet, pa bi probe rekao "slobodno" a `next dev` odmah
  // pao. Tipican vlasnik loopback-a je upravo obican `pnpm dev`.
  const bind = (port, addr) =>
    new Promise((resolve) => {
      const probe = createServer();
      probe.once("error", () => resolve(false));
      probe.once("listening", () => probe.close(() => resolve(true)));
      probe.listen(port, addr);
    });
  for (let port = start; port < start + 20; port++) {
    if ((await bind(port, "127.0.0.1")) && (await bind(port, "0.0.0.0"))) {
      return String(port);
    }
  }
  throw new Error(`nema slobodnog porta u opsegu ${start}-${start + 19}`);
}

/** Odgovara li vec nesto na portu. */
function portAnswers(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: "127.0.0.1", port: Number(port) });
    socket.setTimeout(1500);
    socket.once("connect", () => (socket.destroy(), resolve(true)));
    socket.once("timeout", () => (socket.destroy(), resolve(false)));
    socket.once("error", () => (socket.destroy(), resolve(false)));
  });
}

/**
 * Dva nacina rada:
 *
 *  - `PORT` pokazuje na dev server koji VEC radi → skripta ga posudi i ne dize
 *    svoj. Postoji jer Next 16 dozvoljava samo JEDAN dev server po projektu:
 *    drugi se digne, odmah izadje i ostavi te sa APK-om koji nema sta da cita.
 *    Cijena posudjivanja je da taj server nema `NEXT_PUBLIC_PLATFORM=native`,
 *    pa se native grane (`NativeShell`, `PwaManager`) ponasaju kao na webu.
 *  - inace → slobodan port i vlastiti server sa native zastavicama.
 */
const PORT = process.env.PORT || (await findFreePort(3000));
const borrowed = await portAnswers(PORT);

/** LAN adresa ovog PC-a. 192.168.x prvo — 10.x i 172.16-31.x su fallback. */
function lanAddress() {
  const candidates = [];
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family !== "IPv4" || a.internal) continue;
      // Tailscale/CGNAT (100.64.0.0/10) — postoji na ovoj mašini, ali telefon
      // u kućnoj mreži ne rutira do njega.
      const [o1, o2] = a.address.split(".").map(Number);
      if (o1 === 100 && o2 >= 64 && o2 <= 127) continue;
      if (o1 === 169 && o2 === 254) continue;
      candidates.push(a.address);
    }
  }
  const preferred = candidates.find((a) => a.startsWith("192.168."));
  return process.env.LAN_HOST || preferred || candidates[0];
}

const host = lanAddress();
if (!host) {
  console.error("\n✗ Nema LAN adrese. Postavi je ručno: LAN_HOST=192.168.x.y\n");
  process.exit(1);
}

/** Čeka da `next dev` stvarno primi konekciju — `cap run` inače nađe mrtav port. */
function waitForPort(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const socket = connect({ host: "127.0.0.1", port: Number(PORT) });
      socket.once("connect", () => (socket.destroy(), resolve()));
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() > deadline) reject(new Error("dev server se nije podigao"));
        else setTimeout(tick, 500);
      });
    };
    tick();
  });
}

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");
const capBin = require.resolve("@capacitor/cli/bin/capacitor");
const androidDir = join(import.meta.dirname, "..", "android");
const sdk = join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk");
const adb = join(sdk, "platform-tools", "adb.exe");

const url = `http://${host}:${PORT}`;
console.log(`▲ live reload  ${url}`);

let dev = null;
if (borrowed) {
  console.log(
    `  posudjujem dev server koji vec radi na ${PORT}\n` +
      `  (bez NEXT_PUBLIC_PLATFORM=native — native grane rade kao na webu)`,
  );
} else {
  dev = spawn(process.execPath, [nextBin, "dev", "-H", "0.0.0.0", "-p", PORT], {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_PLATFORM: "native",
      NEXT_DEV_ORIGIN: host,
    },
  });
  dev.on("exit", (code) => {
    // Najcesci uzrok ranog izlaza: Next 16 vec vrti dev server za ovaj projekat
    // i drugi ne dozvoljava. Poruka mora da kaze izlaz, jer se inace vidi samo
    // APK koji nema sta da cita.
    console.error(
      `\n✗ dev server je izasao (${code}).\n` +
        `  Ako Next javlja da vec radi drugi za ovaj direktorijum, posudi ga:\n` +
        `    PORT=<njegov port> pnpm dev:android\n`,
    );
    process.exit(code ?? 1);
  });
  process.on("SIGINT", () => dev.kill());
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

/**
 * Odbaci mrtve transporte i potvrdi da je bar jedan uređaj `device`. Bez ovoga
 * gradle padne na `InstallException: device offline`, što zvuči kao problem sa
 * build-om a zapravo znači "telefon se ponovo prijavio na drugom portu".
 */
async function ensureDevice() {
  const { execFile } = await import("node:child_process");
  const list = () =>
    new Promise((resolve) =>
      execFile(adb, ["devices"], (_err, stdout) => resolve(stdout ?? "")),
    );
  await new Promise((resolve) =>
    execFile(adb, ["reconnect", "offline"], () => resolve()),
  );
  const online = (await list())
    .split("\n")
    .slice(1)
    .filter((line) => /\sdevice\s*$/.test(line.trim()));
  if (online.length === 0) {
    throw new Error(
      "nema živog uređaja (adb devices). Na telefonu: Developer options →\n" +
        "  Wireless debugging isključi/uključi, pa `adb connect <ip>:<port>`.",
    );
  }
}

try {
  await waitForPort();

  // 1. Config u native projekat (server.url + cleartext) i plugin lista.
  await run(process.execPath, [capBin, "sync", "android"], {
    env: { ...process.env, CAP_LIVE_RELOAD_URL: url },
  });

  // 2. Uređaj mora biti ŽIV prije gradle-a. Android wireless debugging rotira
  //    port, pa stari transport ostane kao `offline`, a gradle na njega javi
  //    samo `device offline` — bez naznake da treba ponovo spojiti telefon.
  await ensureDevice();

  // 3. Debug APK na uređaj. Prvi put traje; poslije se NE ponavlja — izmjene
  //    koda stižu kroz dev server, ne kroz novi build.
  //    `shell: true` NIJE kozmetika: Node od 20.12 odbija da spawn-uje `.bat`
  //    bez njega (CVE-2024-27980) — padne na golo `spawn EINVAL`.
  await run(`"${join(androidDir, "gradlew.bat")}"`, ["installDebug"], {
    cwd: androidDir,
    shell: true,
    env: { ...process.env, ANDROID_HOME: process.env.ANDROID_HOME || sdk },
  });

  // 4. Pokreni je, da ne moraš dirati telefon.
  await run(adb, [
    "shell",
    "am",
    "start",
    "-n",
    "com.kartaonica.zandar/.MainActivity",
  ]);

  console.log(
    [
      "",
      `✓ aplikacija radi sa ${url}`,
      "  Snimi fajl → ekran se osvježi.",
      dev
        ? "  Ctrl+C gasi dev server."
        : "  Dev server je posuđen — skripta izlazi, on ostaje da radi.",
      "  Za pravi APK poslije: pnpm cap:sync (skida live-reload config).",
      "",
    ].join("\n"),
  );
} catch (error) {
  console.error(`\n✗ ${error.message}\n`);
  dev?.kill();
  process.exit(1);
}
