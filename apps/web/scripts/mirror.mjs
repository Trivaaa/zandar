/**
 * Telefon na ekranu (scrcpy). Radi preko postojećeg *wireless debugging*-a —
 * isti uređaj koji već prima APK, samo se sad vidi i kontroliše sa PC-a.
 *
 * Zašto skripta a ne gola `scrcpy` komanda: scrcpy nosi SVOJ `adb.exe`
 * (37.0.0), a SDK ima noviji (37.0.1). Kad se dva klijenta razlikuju, adb ubije
 * tuđi server i restartuje svoj — a wireless veza tad otpadne i uređaj nestane
 * usred rada. `ADB` varijabla okruženja pribija scrcpy na SDK-ov binar, pa
 * postoji samo jedan server. (Inline `VAR=x` ne radi u PowerShell-u.)
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const LOCALAPPDATA = process.env.LOCALAPPDATA || "";

/** winget instalira scrcpy kao portable paket — putanja nosi verziju u imenu. */
function findScrcpy() {
  if (process.env.SCRCPY) return process.env.SCRCPY;
  const packages = join(LOCALAPPDATA, "Microsoft", "WinGet", "Packages");
  if (existsSync(packages)) {
    for (const dir of readdirSync(packages)) {
      if (!dir.startsWith("Genymobile.scrcpy")) continue;
      const pkg = join(packages, dir);
      for (const sub of readdirSync(pkg)) {
        const exe = join(pkg, sub, "scrcpy.exe");
        if (existsSync(exe)) return exe;
      }
    }
  }
  return "scrcpy"; // fallback: PATH (winget ga doda, ali tek u novoj ljusci)
}

const adb = join(LOCALAPPDATA, "Android", "Sdk", "platform-tools", "adb.exe");

const child = spawn(
  findScrcpy(),
  [
    "--window-title", "Žandar · S10e",
    "--stay-awake",   // ekran se ne gasi usred testiranja
    "--no-audio",     // audio forward traži Android 11+ i samo smeta ovdje
    ...process.argv.slice(2),
  ],
  {
    stdio: "inherit",
    env: { ...process.env, ...(existsSync(adb) ? { ADB: adb } : {}) },
  },
);

child.on("exit", (code) => process.exit(code ?? 0));
