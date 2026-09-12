/**
 * JEDNOKRATNI alat: reže isporučene atlase karata u 53 pojedinačna WebP-a.
 *
 * Izvor su četiri PNG atlasa + `back.png` iz kompleta `kartaonica_cards_v1`,
 * koji NIJE u repou (11 MB). Izlaz (`public/cards/*.webp`, ~490 KB) JESTE
 * commit-ovan, pa build i deploy ne zavise ni od ovog alata ni od izvora.
 * Pokreće se samo kad stigne novi komplet karata:
 *
 *   node apps/web/scripts/build-cards.mjs [putanja/do/kartaonica_cards_v1]
 *
 * Tri stvari koje alat mora da uradi tačno, sve tri izmjerene a ne pogođene:
 *
 *  1. REZANJE PO RECT-U IZ `cards.json`, nikad po redu i koloni. Atlas izgleda
 *     kao mreža, ali nije: lica variraju 240–248 × 342–348 px, a razmaci nisu
 *     jednaki. Mehanički račun bi svakoj karti odsjekao drugačiji rub.
 *
 *  2. MASKA ZAOBLJENOG UGLA U ALPHA. Atlasi su RGB bez alpha kanala i nose
 *     "saht" pozadinu utisnutu u sliku. Sredine ivica su čist karton, ali ugao
 *     nosi sivo (#868585…#c8c8c7) do ~6px po dijagonali. Isprobano uvećanjem
 *     6x: na radijusu 0% i 5.5% sivo se vidi, na 7.5% širine je čisto. Sivo se
 *     zato sječe OVDJE, jednom — da aplikacija nikad ne barata slikom sa
 *     sahtom u uglu i da se ne oslanja na to da CSS radijus slučajno pogodi.
 *
 *  3. MASKA PRIJE SMANJENJA, u dva prolaza. sharp u jednoj cijevi primjenjuje
 *     `resize` PRIJE `composite`-a, pa bi maska od 246px pala na sliku od
 *     240px i cijev bi pukla ("Image to composite must have same dimensions or
 *     smaller").
 *
 * Širina 240px je izvedena: najveća karta koja se u proizvodu stvarno crta je
 * `md` = 4.5rem = 72px (`MoveReveal` kod žandara), što je na DPR 3 = 216
 * fizičkih piksela. `lg` (92px) živi samo u `/dev/felt2`.
 */
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const require = createRequire(import.meta.url);

const DEFAULT_SRC =
  "C:/Users/User/Desktop/Kartaonica/kartaonica_card_assets/kartaonica_cards_v1";
const SRC = resolve(process.argv[2] || DEFAULT_SRC);
const OUT = join(dirname(import.meta.dirname), "public", "cards");

/** Radijus maske kao udio širine — vidi tačku 2 u zaglavlju. */
const CORNER_RADIUS = 0.075;
const TARGET_WIDTH = 240;
const QUALITY = 82;

/**
 * `sharp` je tranzitivna zavisnost (Next ga vuče za optimizaciju slika) i pnpm
 * ga NE hoistuje, pa ga obično `require("sharp")` iz ovog foldera ne nalazi.
 * Zato se traži i u `.pnpm` stablu. Namjerno nije dodat u `package.json`: alat
 * je jednokratan, a produkcijski build ga ne dodiruje.
 */
function loadSharp() {
  try {
    return require("sharp");
  } catch {
    /* pada na pretragu ispod */
  }
  const root = resolve(dirname(import.meta.dirname), "..", "..");
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
      "  Alat je jednokratan i namjerno nije u package.json. Pokreni\n" +
      "  `pnpm install` u korijenu, ili privremeno instaliraj sharp.\n",
  );
  process.exit(1);
}

let meta;
try {
  meta = JSON.parse(readFileSync(join(SRC, "cards.json"), "utf8"));
} catch {
  console.error(
    `\n✗ Nema \`cards.json\` u:\n  ${SRC}\n\n` +
      "  To je folder isporučenog kompleta karata. Nije u repou (11 MB PNG-ova).\n" +
      "  Putanju možeš dati i kao argument:\n" +
      "    node apps/web/scripts/build-cards.mjs D:/negdje/kartaonica_cards_v1\n",
  );
  process.exit(1);
}

/**
 * Pun špil izveden iz PRAVILA igre, ne iz imena fajlova u kompletu. Da se
 * provjera ne bi provjeravala sama sa sobom: ako komplet zaboravi kartu, ovo
 * to vidi.
 */
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUIT_CHAR = { clubs: "C", diamonds: "D", hearts: "H", spades: "S" };
const EXPECTED = [
  ...Object.values(SUIT_CHAR).flatMap((s) => RANKS.map((r) => `${r}${s}`)),
  "BACK",
];

const missing = EXPECTED.filter((id) => !meta.frames[id]);
if (missing.length) {
  console.error(`\n✗ Kompletu nedostaje ${missing.length}: ${missing.join(", ")}\n`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });

console.log(`▲ rezanje karata\n  izvor ${SRC}\n  izlaz ${OUT}`);

let written = 0;
let bytes = 0;

for (const id of EXPECTED) {
  const frame = meta.frames[id];
  const { x, y, w, h } = frame.frame;
  const r = Math.round(w * CORNER_RADIUS);

  const mask = Buffer.from(
    `<svg width="${w}" height="${h}">` +
      `<rect width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#fff"/></svg>`,
  );

  // Prolaz 1 — isjeci i maskiraj u punoj rezoluciji.
  const masked = await sharp(join(SRC, frame.image))
    .extract({ left: x, top: y, width: w, height: h })
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  // Prolaz 2 — tek sad smanji i kodiraj.
  const webp = await sharp(masked)
    .resize({ width: TARGET_WIDTH })
    .webp({ quality: QUALITY, effort: 6 })
    .toBuffer();

  const name = id === "BACK" ? "back.webp" : `${id}.webp`;
  writeFileSync(join(OUT, name), webp);
  written += 1;
  bytes += webp.length;
}

console.log(
  `  upisano ${written} fajlova, ${(bytes / 1024).toFixed(0)} KB ukupno ` +
    `(prosjek ${(bytes / written / 1024).toFixed(1)} KB)`,
);

if (written !== 53) {
  console.error(`\n✗ Očekivano 53 fajla, upisano ${written}.\n`);
  process.exit(1);
}
