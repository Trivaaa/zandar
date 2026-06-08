import type { BotIdentity } from "@zandar/shared-types";

// ====================================================
// NAME POOLS  (PRD §39.2 — seed + expanded)
// ====================================================

const NAME_POOLS = {
  firstM: [
    "Marko", "Stefan", "Nikola", "Luka", "Aleksandar", "Miloš", "Nemanja",
    "Đorđe", "Vuk", "Petar", "Ivan", "Filip", "Dragan", "Goran", "Zoran",
    "Saša", "Dejan", "Mirko", "Mladen", "Vedran", "Damir", "Haris", "Emir",
    "Tarik", "Adnan", "Bojan", "Darko", "Igor", "Slavko", "Branko",
    "Nenad", "Vladimir", "Slobodan", "Rade", "Mile", "Siniša", "Dušan",
    "Žarko", "Predrag", "Nedeljko", "Aldin", "Senad", "Alen", "Dino",
  ],
  firstF: [
    "Ana", "Jelena", "Milica", "Marija", "Ivana", "Sara", "Teodora",
    "Katarina", "Jovana", "Tijana", "Dragana", "Sanja", "Nataša", "Maja",
    "Tamara", "Andrea", "Nina", "Snežana", "Mirjana", "Lejla", "Amra",
    "Selma", "Anja", "Bojana", "Gordana", "Vesna", "Lidija", "Renata",
    "Kristina", "Vanja", "Azra", "Ermina", "Dajana", "Emina", "Alma",
  ],
  surname: [
    "Petrović", "Jovanović", "Marković", "Nikolić", "Kovačević", "Ilić",
    "Đorđević", "Stanković", "Pavlović", "Lukić", "Babić", "Hodžić",
    "Begić", "Tadić", "Vuković", "Knežević", "Mitrović", "Savić",
    "Popović", "Tomić", "Jović", "Perić", "Lazić", "Simić", "Kostić",
    "Stojanović", "Milošević", "Đukić", "Radić", "Matić", "Rakić",
    "Bošnjak", "Mehić", "Softić", "Halilović", "Mahmutović", "Nuić",
  ],
  nick: [
    "Bata", "Seka", "Cane", "Đole", "Maca", "Buca", "Pera", "Žika",
    "Mića", "Steva", "Brka", "Keba", "Coa", "Gaga", "Lola", "Buba",
    "Riki", "Dado", "Zoki", "Deki", "Kiza", "Baja", "Paja", "Sale",
    "Nele", "Beki", "Šale", "Tika", "Veca", "Mare", "Mica", "Joca",
  ],
  handleStem: [
    "Vuk", "Zmaj", "Kauboj", "Rakija", "Pivo", "Gazda", "Majstor", "Profa",
    "Baja", "Car", "Legenda", "Fantom", "Ratnik", "Soko", "Lav", "Medo",
    "Bik", "Orao", "Šakal", "Tigar", "Gladijator", "Komandant", "Kapetan",
    "Doktor", "Profesor", "General", "Šef", "Boss", "King", "Aces",
  ],
  cityTag: [
    "NS", "BG", "BL", "ZG", "SA", "NI", "KG", "PG", "TZ", "MO", "OS",
    "SU", "BI", "ZE", "TR", "FO", "GS", "BD", "LJ", "SS",
  ],
  guestStem: ["guest", "Gost", "Igrac", "Player", "Korisnik", "User"],
  ironic: [
    "Pivopija", "ČikaMika", "TetkaRada", "DedaKockar", "BabaMica",
    "KumIzSela", "ŠefSale", "KomšijaPero", "TaksistaJoca", "BataPenzioner",
    "UjakoBranko", "StrinaraJela", "DedaMarko", "BakaRuža",
  ],
  initialPrefix: ["M.", "J.", "A.", "S.", "N.", "D.", "V.", "P.", "I.", "B."],
} as const;

// ====================================================
// AVATARS
// ====================================================

const AVATARS = {
  m: ["m-01", "m-02", "m-03", "m-04", "m-05", "m-06", "m-07", "m-08"],
  f: ["f-01", "f-02", "f-03", "f-04", "f-05", "f-06", "f-07", "f-08"],
  n: ["n-01", "n-02", "n-03", "n-04", "n-05", "n-06"],
} as const;

// ====================================================
// CATEGORY WEIGHTS  (PRD §39.1)
// ====================================================

type NameCategory = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

// Weights sum to 100. Order must match NameCategory 1..11.
const WEIGHTS: number[] = [12, 10, 9, 8, 10, 14, 12, 6, 9, 6, 4];

// Cumulative weights for O(1) weighted pick
const CUM_WEIGHTS: number[] = WEIGHTS.reduce<number[]>((acc, w, i) => {
  acc.push((acc[i - 1] ?? 0) + w);
  return acc;
}, []);

// ====================================================
// PROFANITY / BLOCKLIST  (PRD §39.4 rule 3)
// Non-optional: ex-YU nationalist/ethnic/offensive terms
// ====================================================

const BLOCKED_TERMS = new Set([
  // Etničke uvrede (normalizovane, bez dijakritika)
  "balija", "cetnik", "ustasa", "siptar", "arnaut",
  "vlah", "sifter", "turcin",
  // Generalne uvrede
  "idiot", "debil", "kreten", "pizda", "kurac", "jebem", "jebiga",
  "glupak", "budala", "smrad",
  // Politički ekstremizam
  "ndh", "fasa", "nacist",
]);

// ====================================================
// NORMALIZATION (za dedup)
// ====================================================

/**
 * Normalizuje ime za dedup provjeru:
 * - Strip dijakritika (č→c, š→s, đ→d, ž→z, ć→c)
 * - Lowercase
 * - Ukloni separatore (. _ -)
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/đ/g, "d")        // đ/Đ ne dekompozira se kroz NFD — eksplicitna zamjena
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // ukloni kombinovane dijakritike (š→s, č→c, itd.)
    .replace(/[.\-_\s]/g, "");
}

// ====================================================
// HELPERS
// ====================================================

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function pickCategory(rng: () => number): NameCategory {
  const r = rng() * 100;
  for (let i = 0; i < CUM_WEIGHTS.length; i++) {
    if (r < CUM_WEIGHTS[i]!) return (i + 1) as NameCategory;
  }
  return 11;
}

function inferGender(cat: NameCategory): "m" | "f" | "neutral" {
  if (cat === 1 || cat === 3) return "m";
  if (cat === 2 || cat === 4) return "f";
  return "neutral";
}

function pickAvatar(gender: "m" | "f" | "neutral", rng: () => number): string {
  if (gender === "m") return pick(AVATARS.m, rng);
  if (gender === "f") return pick(AVATARS.f, rng);
  // Neutral: pick from all pools
  const all = [...AVATARS.m, ...AVATARS.f, ...AVATARS.n];
  return pick(all, rng);
}

// ====================================================
// NUMBER ATTACHMENT  (PRD §39.3)
// ====================================================

function randYear(rng: () => number): string {
  return String(1980 + Math.floor(rng() * 27)); // 1980–2006
}

function randYear2(rng: () => number): string {
  const y = 80 + Math.floor(rng() * 27); // 80–06
  return y >= 100 ? `0${y - 100}` : String(y);
}

function rand2to3(rng: () => number): string {
  const n = 10 + Math.floor(rng() * 990);
  return String(n).padStart(3, "0");
}

function rand2to4(rng: () => number): string {
  return String(10 + Math.floor(rng() * 9990));
}

function attachNumber(base: string, rng: () => number): string {
  const pattern = Math.floor(rng() * 5);
  switch (pattern) {
    case 0: return `${base}${randYear(rng)}`;
    case 1: return `${base}${randYear2(rng)}`;
    case 2: return `${base}_${rand2to3(rng)}`;
    case 3: return `${base}.${rand2to3(rng)}`;
    default: return `${base}${rand2to4(rng)}`;
  }
}

// ====================================================
// NAME COMPOSITION  (PRD §39.1 kategorije)
// ====================================================

function composeName(
  cat: NameCategory,
  rng: () => number,
): { displayName: string; gender: "m" | "f" | "neutral" } {
  const gender = inferGender(cat);
  let displayName: string;

  switch (cat) {
    case 1: // Ime + Prezime (M)
      displayName = `${pick(NAME_POOLS.firstM, rng)} ${pick(NAME_POOLS.surname, rng)}`;
      break;
    case 2: // Ime + Prezime (Ž)
      displayName = `${pick(NAME_POOLS.firstF, rng)} ${pick(NAME_POOLS.surname, rng)}`;
      break;
    case 3: // Samo ime (M)
      displayName = pick(NAME_POOLS.firstM, rng);
      break;
    case 4: // Samo ime (Ž)
      displayName = pick(NAME_POOLS.firstF, rng);
      break;
    case 5: // Nadimak / hipokoristik
      displayName = pick(NAME_POOLS.nick, rng);
      break;
    case 6: // Ime/nadimak + broj
      displayName = attachNumber(pick(NAME_POOLS.nick, rng), rng);
      break;
    case 7: // Handle / gamertag
      displayName = `${pick(NAME_POOLS.handleStem, rng)}${pick(NAME_POOLS.handleStem, rng).slice(0, 3)}`;
      break;
    case 8: // Handle + grad tag
      displayName = `${pick(NAME_POOLS.handleStem, rng).toLowerCase()}${pick(NAME_POOLS.cityTag, rng)}`;
      break;
    case 9: // Guest / generic
      displayName = attachNumber(pick(NAME_POOLS.guestStem, rng), rng);
      break;
    case 10: // Ironični / šaljivi
      displayName = pick(NAME_POOLS.ironic, rng);
      break;
    case 11: // Inicijal + prezime
      displayName = `${pick(NAME_POOLS.initialPrefix, rng)} ${pick(NAME_POOLS.surname, rng)}`;
      break;
  }

  return { displayName, gender };
}

// ====================================================
// PROFANITY CHECK
// ====================================================

export function failsProfanityFilter(name: string): boolean {
  const normalized = normalizeName(name);
  for (const term of BLOCKED_TERMS) {
    if (normalized.includes(normalizeName(term))) return true;
  }
  return false;
}

// ====================================================
// FALLBACK GUEST IDENTITY
// ====================================================

function fallbackGuestIdentity(atTable: Set<string>, rng: () => number): BotIdentity {
  for (let i = 0; i < 200; i++) {
    const n = 1000 + Math.floor(rng() * 9000);
    const displayName = `Gost${n}`;
    if (!atTable.has(displayName)) {
      return {
        displayName,
        avatar: pick(AVATARS.n, rng),
        gender: "neutral",
      };
    }
  }
  // Astronomski nevjerovatno, ali garantujemo jedinstvenost
  return { displayName: `Gost${Date.now()}`, avatar: "n-01", gender: "neutral" };
}

// ====================================================
// INTERNAL — testable generator with category metadata
// ====================================================

export type GeneratedWithMeta = {
  identity: BotIdentity;
  category: NameCategory;
};

/**
 * Interna verzija generatora koja vraća i kategoriju.
 * Koristi se u testovima za provjeru distribucije.
 */
export function _generateWithMeta(
  atTable: Set<string>,
  seenByUser: Set<string>,
  rng: () => number,
): GeneratedWithMeta {
  for (let attempt = 0; attempt < 25; attempt++) {
    const category = pickCategory(rng);
    const { displayName, gender } = composeName(category, rng);

    if (atTable.has(displayName)) continue;
    if (seenByUser.has(normalizeName(displayName))) continue;
    if (failsProfanityFilter(displayName)) continue;

    const avatar = pickAvatar(gender, rng);
    return {
      identity: { displayName, avatar, gender },
      category,
    };
  }

  return {
    identity: fallbackGuestIdentity(atTable, rng),
    category: 9,
  };
}

// ====================================================
// PUBLIC API
// ====================================================

/**
 * Generiše jedan bot identitet (PRD §39.6 pseudokod).
 *
 * Garantuje:
 * - displayName nije u `atTable` (dedup po stolu)
 * - normalizovano ime nije u `seenByUser` (recency dedup)
 * - prolazi profanity filter
 * - avatar je konzistentan s rodom (kategorije 1–4)
 * - deterministički ako je proslijeđen seeded rng
 *
 * @param atTable    Skup displayName-ova već za stolom
 * @param seenByUser Skup normalizovanih imena koja je korisnik nedavno vidio
 * @param rng        Opcionalni seeded RNG; default Math.random
 */
export function generateBotIdentity(
  atTable: Set<string> = new Set(),
  seenByUser: Set<string> = new Set(),
  rng: () => number = Math.random,
): BotIdentity {
  return _generateWithMeta(atTable, seenByUser, rng).identity;
}

/**
 * Generiše N identiteta za jedan sto, svi međusobno jedinstveni.
 *
 * @param count      Broj identiteta (tipično playerCount - 1)
 * @param seenByUser Recency dedup po korisniku (opcionalno)
 * @param rng        Opcionalni seeded RNG
 */
export function generateTableIdentities(
  count: number,
  seenByUser: Set<string> = new Set(),
  rng: () => number = Math.random,
): BotIdentity[] {
  const identities: BotIdentity[] = [];
  const atTable = new Set<string>();

  for (let i = 0; i < count; i++) {
    const identity = generateBotIdentity(atTable, seenByUser, rng);
    identities.push(identity);
    atTable.add(identity.displayName);
  }

  return identities;
}
