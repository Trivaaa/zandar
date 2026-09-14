/**
 * JEDNOKRATNI alat: iz jednog kvadratnog izvornog PNG-a (zlatne karte na
 * feltu, "Play Store assets/Icon.png") generiše SVE ikone aplikacije —
 * Android launcher (adaptivne + legacy + round), PWA (any + maskable +
 * apple-touch) i favicon.ico. Izlaz JESTE commit-ovan; izvor NIJE u repou.
 *
 *   node apps/web/scripts/build-icons.mjs [putanja/do/Icon.png]
 *
 * Staging i produkcija dijele ISTI `android/app/src/main/res` (staging je
 * Gradle buildType, ne product flavor — nema zasebnog res foldera), pa jedan
 * prolaz ovog alata pokriva oba APK-a (vidi CLAUDE.md → Deployment).
 *
 * Izvor je već kvadratan i pun-do-ivice (felt zelena ide do ruba slike), pa
 * SVE varijante (uključujući `icon-maskable-512`) prave PROSTIM RESIZE-om bez
 * letterbox-a — isti trik kojim "fotografski" Play Store ikone rade adaptive
 * icon: kad maska (krug/squircle) odsječe rub, odsiječe samo felt zelenu, ne
 * motiv (karte+dijamant sjede na ~60-63% poluprečnika, dobro unutar onoga što
 * i najagresivnija maska ostavlja). Probano i sa 80%-safe-zone paddingom
 * (motiv smanjen na flat uzorkovanu pozadinu) — odbačeno: vinjeta na izvoru
 * je bila TAMNIJA/SVJETLIJA po ivicama nego uzorkovana boja, pa je spoj
 * pravio vidljiv šav tačno unutar kruga koji maska ionako ne siječe.
 *
 * Pozadinska boja adaptivne ikone (`ic_launcher_background`) je UZORKOVANA
 * sa slike (donji lijevi/desni ugao — gornji uglovi nose vinjetu/highlight
 * pa nisu reprezentativni), ne pogođena.
 */
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);

const DEFAULT_SRC = "C:/Users/User/Desktop/Kartaonica/Play Store assets/Icon.png";
const SRC = resolve(process.argv[2] || DEFAULT_SRC);
const WEB_ROOT = dirname(import.meta.dirname);

/** Isti pattern kao build-cards.mjs — sharp je tranzitivna zavisnost koju pnpm ne hoistuje. */
function loadSharp() {
  try {
    return require("sharp");
  } catch {
    /* pada na pretragu ispod */
  }
  const root = resolve(WEB_ROOT, "..", "..");
  const pnpm = join(root, "node_modules", ".pnpm");
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
  console.error(
    "\n✗ `sharp` nije pronađen ni kao paket ni u `node_modules/.pnpm`.\n" +
      "  Pokreni `pnpm install` u korijenu, ili privremeno instaliraj sharp.\n",
  );
  process.exit(1);
}

function toHex(n) {
  return Math.round(n).toString(16).padStart(2, "0");
}

async function sampleBackground() {
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  function patchAvg(x0, y0) {
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let y = y0; y < y0 + 24; y++) {
      for (let x = x0; x < x0 + 24; x++) {
        const idx = (y * width + x) * channels;
        r += data[idx];
        g += data[idx + 1];
        b += data[idx + 2];
        n++;
      }
    }
    return [r / n, g / n, b / n];
  }
  // Donji uglovi — gornji nose vinjetu/highlight, nisu reprezentativni felt ton.
  const bl = patchAvg(4, height - 28);
  const br = patchAvg(width - 28, height - 28);
  const avg = [(bl[0] + br[0]) / 2, (bl[1] + br[1]) / 2, (bl[2] + br[2]) / 2];
  return `#${toHex(avg[0])}${toHex(avg[1])}${toHex(avg[2])}`;
}

async function squarePng(size) {
  return sharp(SRC).resize(size, size).png().toBuffer();
}

async function circlePng(size) {
  const square = await squarePng(size);
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`,
  );
  return sharp(square)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

/** Minimalan ICO kontejner sa PNG-kompresovanim frejmovima (podržano od Vista/svi moderni browseri). */
function buildIco(pngBuffers) {
  const count = pngBuffers.length;
  const headerSize = 6 + 16 * count;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type = icon
  header.writeUInt16LE(count, 4);
  const entries = [];
  pngBuffers.forEach(({ size, buf }, i) => {
    const o = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, o); // width
    header.writeUInt8(size >= 256 ? 0 : size, o + 1); // height
    header.writeUInt8(0, o + 2); // color count
    header.writeUInt8(0, o + 3); // reserved
    header.writeUInt16LE(1, o + 4); // planes
    header.writeUInt16LE(32, o + 6); // bit count
    header.writeUInt32LE(buf.length, o + 8); // bytes in resource
    header.writeUInt32LE(offset, o + 12); // image offset
    offset += buf.length;
    entries.push(buf);
  });
  return Buffer.concat([header, ...entries]);
}

const ANDROID_RES = join(WEB_ROOT, "android/app/src/main/res");
const LAUNCHER_SIZES = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const FOREGROUND_SIZES = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

async function main() {
  const bgHex = await sampleBackground();
  console.log(`Uzorkovana felt pozadina: ${bgHex}`);

  for (const [density, size] of Object.entries(LAUNCHER_SIZES)) {
    const dir = join(ANDROID_RES, `mipmap-${density}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "ic_launcher.png"), await squarePng(size));
    writeFileSync(join(dir, "ic_launcher_round.png"), await circlePng(size));
  }
  for (const [density, size] of Object.entries(FOREGROUND_SIZES)) {
    const dir = join(ANDROID_RES, `mipmap-${density}`);
    writeFileSync(join(dir, "ic_launcher_foreground.png"), await squarePng(size));
  }

  const bgXmlPath = join(ANDROID_RES, "values/ic_launcher_background.xml");
  writeFileSync(
    bgXmlPath,
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${bgHex.toUpperCase()}</color>\n</resources>\n`,
  );
  console.log("Android: ic_launcher / _foreground / _round × 5 gustina + boja pozadine");

  const PUBLIC = join(WEB_ROOT, "public");
  writeFileSync(join(PUBLIC, "icon-192.png"), await squarePng(192));
  writeFileSync(join(PUBLIC, "icon-512.png"), await squarePng(512));
  writeFileSync(join(PUBLIC, "icon-maskable-512.png"), await squarePng(512));
  writeFileSync(join(PUBLIC, "apple-icon.png"), await squarePng(180));
  console.log("Web: icon-192 / icon-512 / icon-maskable-512 / apple-icon");

  const icoSizes = [16, 32, 48];
  const icoFrames = [];
  for (const size of icoSizes) {
    // Next/Turbopack svoj ICO dekoder traži RGBA frejmove; sharp bez
    // ensureAlpha() ostavlja RGB (nema kanala) jer izvor nema providnost.
    const buf = await sharp(SRC).resize(size, size).ensureAlpha().png().toBuffer();
    icoFrames.push({ size, buf });
  }
  writeFileSync(join(WEB_ROOT, "app/favicon.ico"), buildIco(icoFrames));
  console.log("Web: app/favicon.ico (16/32/48)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
