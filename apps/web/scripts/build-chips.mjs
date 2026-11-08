#!/usr/bin/env node
/**
 * Žetoni poker stola iz asseta vlasnika (8.11.2026).
 *
 *   node scripts/build-chips.mjs [izvor.png]
 *
 * Izvor (`assets/chips-source.png`, RGBA): lijevo jedan žeton odozgo, desno
 * stog od tri. Izlaz: `public/chips/chip.webp` i `public/chips/stack.webp`,
 * providna pozadina, obrezano do crteža. Isti obrazac kao `build-cards.mjs`
 * (sharp iz pnpm stabla, nije u `package.json`).
 *
 * Ako izvor ikad stigne BEZ providnosti (bijela pozadina), skoro bijeli
 * pikseli koji se dodiruju sa ivicom postaju providni — krem umeci na samom
 * žetonu (#f3e2b0) su dovoljno tamniji da ostanu.
 */

import { createRequire } from "node:module";
import { mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);
const WEB = dirname(import.meta.dirname);
const SRC = resolve(process.argv[2] || join(WEB, "assets", "chips-source.png"));
const OUT = join(WEB, "public", "chips");
/** Duža stranica izlaza: 3× najveći prikaz (~1.6rem) na dpr 3 telefonu. */
const SIZE = 144;
const QUALITY = 86;

function loadSharp() {
  try {
    return require("sharp");
  } catch {
    /* pada na pretragu ispod */
  }
  const pnpm = join(WEB, "..", "..", "node_modules", ".pnpm");
  let dirs = [];
  try {
    dirs = readdirSync(pnpm).filter((d) => d.startsWith("sharp@"));
  } catch {
    dirs = [];
  }
  for (const d of dirs) {
    try {
      return require(join(pnpm, d, "node_modules", "sharp"));
    } catch {
      /* probaj sljedeći */
    }
  }
  return null;
}

const sharp = loadSharp();
if (!sharp) {
  console.error("✗ sharp nije nađen (pnpm install u korijenu repoa).");
  process.exit(1);
}

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const alphaAt = (x, y) => data[(y * W + x) * 4 + 3];
const corners = [alphaAt(0, 0), alphaAt(W - 1, 0), alphaAt(0, H - 1), alphaAt(W - 1, H - 1)];
const transparent = corners.every((a) => a === 0);

/** Bez providnosti: bijela pozadina → providna (samo skoro bijeli pikseli). */
let pixels = data;
if (!transparent) {
  pixels = Buffer.from(data);
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] > 245 && pixels[i + 1] > 245 && pixels[i + 2] > 245) pixels[i + 3] = 0;
  }
}
const base = () => sharp(pixels, { raw: { width: W, height: H, channels: 4 } });

mkdirSync(OUT, { recursive: true });
const half = Math.floor(W / 2);
for (const [name, left, w] of [
  ["chip", 0, half],
  ["stack", half, W - half],
]) {
  const cut = await base().extract({ left, top: 0, width: w, height: H }).png().toBuffer();
  const trimmed = await sharp(cut).trim({ threshold: 1 }).toBuffer({ resolveWithObject: true });
  await sharp(trimmed.data)
    .resize({ width: SIZE, height: SIZE, fit: "inside" })
    .webp({ quality: QUALITY, alphaQuality: 100 })
    .toFile(join(OUT, `${name}.webp`));
  const meta = await sharp(join(OUT, `${name}.webp`)).metadata();
  console.log(`✓ ${name}.webp ${meta.width}×${meta.height} (izrez ${trimmed.info.width}×${trimmed.info.height})`);
}
console.log(transparent ? "  izvor je providan" : "  izvor NIJE bio providan — bijela pozadina uklonjena");
