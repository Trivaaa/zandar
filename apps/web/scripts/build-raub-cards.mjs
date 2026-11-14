/**
 * JEDNOKRATNI alat: POLEĐINA mađarica za Raub → `public/cards/hu/back.webp`.
 *
 * Lica i četiri ikonice boje više NE dolaze odavde: od 14.11.2026 su skenirane
 * prave karte vlasnika (`scripts/raub-scan/`, changelog 153). Ovaj alat je
 * sveden na poleđinu, da ponovno pokretanje ne vrati AI lica preko skena.
 *
 * Izvor je isporučeni komplet „Kartaonica_RAUB" (`webp/back.webp` 480×680 sa
 * alfom), koji NIJE u repou. Izlaz JESTE commit-ovan:
 *
 *   node apps/web/scripts/build-raub-cards.mjs [putanja/do/Kartaonica_RAUB]
 *
 * Smanjenje na 240×340. Lica su sada odnosa 1.571, a poleđina ostaje 1.417:
 * CSS (`.card[data-deck="hungarian"]`) crta obje u istoj kutiji 1.571 sa
 * `background-size: 100% 100%`, pa se šara poleđine suzi ~10% — namjerno,
 * vlasnik je zadržao staru poleđinu.
 */
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));

function loadSharp() {
  try {
    return require("sharp");
  } catch {}
  const pnpm = resolve(here, "../../../node_modules/.pnpm");
  for (const d of readdirSync(pnpm).filter((x) => x.startsWith("sharp@"))) {
    try {
      return require(join(pnpm, d, "node_modules", "sharp"));
    } catch {}
  }
  return null;
}
const sharp = loadSharp();
if (!sharp) throw new Error("sharp nije nađen (pnpm install u korijenu)");

const SRC = resolve(
  process.argv[2] ??
    "C:/Users/User/Desktop/Kartaonica/RAUB assets/Majdarice Kartaonica_RAUB_32_cards_Illustrated/Kartaonica_RAUB",
);
const OUT = resolve(here, "../public/cards/hu");
mkdirSync(OUT, { recursive: true });

const W = 240;
const H = 340;
let total = 0;
for (const f of ["back.webp"]) {
  const out = join(OUT, f);
  await sharp(join(SRC, "webp", f)).resize(W, H, { fit: "fill" }).webp({ quality: 85, alphaQuality: 90 }).toFile(out);
  total += statSync(out).size;
}
console.log(`poleđina: ${Math.round(total / 1024)} KB`);
