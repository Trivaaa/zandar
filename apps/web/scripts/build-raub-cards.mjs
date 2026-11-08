/**
 * JEDNOKRATNI alat: komplet mađarica za Raub → `public/cards/hu/`.
 *
 * Izvor je isporučeni komplet „Kartaonica_RAUB" (ilustrovano izdanje, 32 lica
 * + poleđina, `webp/` 480×680 sa alfom), koji NIJE u repou. Izlaz JESTE
 * commit-ovan, pa build i deploy ne zavise ni od ovog alata ni od izvora:
 *
 *   node apps/web/scripts/build-raub-cards.mjs [putanja/do/Kartaonica_RAUB]
 *
 *  1. Lica i poleđina: smanjenje na 240×340 — ista širina kao francuski
 *     komplet (obrazloženje u `build-cards.mjs`: `md` 72px × DPR 3). Odnos
 *     12:17 je isti kao naš 1.417, pa se ništa ne siječe. Uglovi su već
 *     providni u izvoru.
 *  2. Četiri ikonice boje za tekst (oznaka adut, uputstva): veliki znak sa
 *     vrha asa iz `png/` (720×1020). Okvir je izmjeren na slici (znak stoji
 *     u x 270–445, y 65–235; niže počinje pejzaž), sa rezervom; krem papir postaje providan po
 *     udaljenosti boje od papira (boja se čita iz ugla okvira), pa trim.
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
for (const f of readdirSync(join(SRC, "webp")).filter((x) => x.endsWith(".webp"))) {
  const out = join(OUT, f);
  await sharp(join(SRC, "webp", f)).resize(W, H, { fit: "fill" }).webp({ quality: 85, alphaQuality: 90 }).toFile(out);
  total += statSync(out).size;
}
console.log(`lica + poleđina: ${Math.round(total / 1024)} KB`);

const BOX = { left: 255, top: 55, width: 210, height: 180 };
const ICON = 96;
for (const suit of ["hearts", "leaves", "acorns", "bells"]) {
  const { data, info } = await sharp(join(SRC, "png", `${suit}_ace.png`))
    .extract(BOX)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const [pr, pg, pb] = [data[0], data[1], data[2]]; // papir: gornji lijevi ugao okvira
  for (let i = 0; i < data.length; i += 4) {
    const d = Math.hypot(data[i] - pr, data[i + 1] - pg, data[i + 2] - pb);
    const a = d < 22 ? 0 : d > 60 ? 255 : Math.round(((d - 22) / 38) * 255);
    data[i + 3] = Math.min(data[i + 3], a);
  }
  const out = join(OUT, `suit-${suit}.webp`);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 1 })
    .resize(ICON, ICON, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 90, alphaQuality: 100 })
    .toFile(out);
  console.log(`${suit}: ${statSync(out).size} B`);
}
