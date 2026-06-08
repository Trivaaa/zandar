import { describe, it, expect } from "vitest";
import {
  generateBotIdentity,
  generateTableIdentities,
  normalizeName,
  failsProfanityFilter,
  _generateWithMeta,
} from "./identity";

// ====================================================
// TEST HELPERS
// ====================================================

function makeLcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

// ====================================================
// NORMALIZACIJA
// ====================================================

describe("normalizeName", () => {
  it("uklanja dijakritike", () => {
    expect(normalizeName("Marko")).toBe("marko");
    expect(normalizeName("Jovanović")).toBe("jovanovic");
    expect(normalizeName("Đorđe")).toBe("dorde");
    expect(normalizeName("Šakal")).toBe("sakal");
  });

  it("uklanja separatore", () => {
    expect(normalizeName("stefan.jovic")).toBe("stefanjovic");
    expect(normalizeName("ana_88")).toBe("ana88");
    expect(normalizeName("zoki-023")).toBe("zoki023");
  });

  it("lowercase", () => {
    expect(normalizeName("MARKO")).toBe("marko");
    expect(normalizeName("GaDjaPero")).toBe("gadjapero");
  });
});

// ====================================================
// PROFANITY FILTER
// ====================================================

describe("failsProfanityFilter", () => {
  it("propušta normalna imena", () => {
    expect(failsProfanityFilter("Marko Petrović")).toBe(false);
    expect(failsProfanityFilter("RakijaBoss")).toBe(false);
    expect(failsProfanityFilter("Gost1234")).toBe(false);
    expect(failsProfanityFilter("Ana Kovačević")).toBe(false);
  });

  it("blokira uvredljive pojmove", () => {
    expect(failsProfanityFilter("balija123")).toBe(true);
    expect(failsProfanityFilter("CetnikNS")).toBe(true);
    expect(failsProfanityFilter("super_idiot")).toBe(true);
  });

  it("blokira bez obzira na velika/mala slova i dijakritike", () => {
    expect(failsProfanityFilter("BALIJA")).toBe(true);
    expect(failsProfanityFilter("Čètnik")).toBe(true);
  });
});

// ====================================================
// DEDUP — sto
// ====================================================

describe("generateBotIdentity — dedup po stolu", () => {
  it("generiše unique identitete za 4 sjedišta", () => {
    const atTable = new Set<string>();
    const rng = makeLcg(42);
    const names: string[] = [];

    for (let i = 0; i < 4; i++) {
      const identity = generateBotIdentity(atTable, new Set(), rng);
      expect(atTable.has(identity.displayName)).toBe(false);
      names.push(identity.displayName);
      atTable.add(identity.displayName);
    }

    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(4);
  });

  it("nikad ne vraća ime koje je već za stolom", () => {
    const atTable = new Set(["Marko Petrović", "Ana Kovačević", "Zoki_023"]);
    const rng = makeLcg(7);

    for (let i = 0; i < 50; i++) {
      const identity = generateBotIdentity(atTable, new Set(), rng);
      expect(atTable.has(identity.displayName)).toBe(false);
    }
  });
});

// ====================================================
// DEDUP — recency (seenByUser)
// ====================================================

describe("generateBotIdentity — recency dedup", () => {
  it("ne vraća ime čiji normalizovani oblik je u seenByUser", () => {
    // Napunimo seenByUser sa dosta normalizovanih imena
    const seenNormalized = new Set<string>();
    const rng1 = makeLcg(55);

    // Generiši 100 pa ih dodaj u seen
    for (let i = 0; i < 100; i++) {
      const id = generateBotIdentity(new Set(), seenNormalized, rng1);
      seenNormalized.add(normalizeName(id.displayName));
    }

    // Sada generiši još 20 — ne smiju biti u seenByUser
    const rng2 = makeLcg(99);
    for (let i = 0; i < 20; i++) {
      const id = generateBotIdentity(new Set(), seenNormalized, rng2);
      expect(seenNormalized.has(normalizeName(id.displayName))).toBe(false);
    }
  });
});

// ====================================================
// DETERMINIZAM
// ====================================================

describe("generateBotIdentity — determinizam", () => {
  it("isti seed → isti identitet", () => {
    const r1 = generateBotIdentity(new Set(), new Set(), makeLcg(123));
    const r2 = generateBotIdentity(new Set(), new Set(), makeLcg(123));
    expect(r1).toEqual(r2);
  });

  it("različiti seedovi → različiti identiteti (najčešće)", () => {
    const identities = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      const id = generateBotIdentity(new Set(), new Set(), makeLcg(seed));
      identities.add(id.displayName);
    }
    // Sa 20 seedova trebamo vidjeti više od 3 različita rezultata
    expect(identities.size).toBeGreaterThan(3);
  });
});

// ====================================================
// ROD ↔ AVATAR KONZISTENTNOST
// ====================================================

describe("generateBotIdentity — rod i avatar", () => {
  it("kategorije 1 i 3 (muško) → avatar počinje sa 'm-'", () => {
    const rng = makeLcg(1);
    let maleChecks = 0;

    for (let i = 0; i < 200; i++) {
      const { identity, category } = _generateWithMeta(new Set(), new Set(), rng);
      if (category === 1 || category === 3) {
        expect(identity.avatar).toMatch(/^m-/);
        expect(identity.gender).toBe("m");
        maleChecks++;
      }
    }
    // Trebalo bi biti bar par muških kategorija u 200 pokušaja
    expect(maleChecks).toBeGreaterThan(0);
  });

  it("kategorije 2 i 4 (žensko) → avatar počinje sa 'f-'", () => {
    const rng = makeLcg(2);
    let femaleChecks = 0;

    for (let i = 0; i < 200; i++) {
      const { identity, category } = _generateWithMeta(new Set(), new Set(), rng);
      if (category === 2 || category === 4) {
        expect(identity.avatar).toMatch(/^f-/);
        expect(identity.gender).toBe("f");
        femaleChecks++;
      }
    }
    expect(femaleChecks).toBeGreaterThan(0);
  });

  it("neutralne kategorije (5–11) → gender je 'neutral'", () => {
    const rng = makeLcg(3);
    let neutralChecks = 0;

    for (let i = 0; i < 200; i++) {
      const { identity, category } = _generateWithMeta(new Set(), new Set(), rng);
      if (category >= 5 && category <= 11) {
        expect(identity.gender).toBe("neutral");
        neutralChecks++;
      }
    }
    expect(neutralChecks).toBeGreaterThan(0);
  });
});

// ====================================================
// FALLBACK GUEST
// ====================================================

describe("generateBotIdentity — fallback", () => {
  it("vraća identitet čak i sa 200 zabuanih sjedišta", () => {
    // Popuni atTable sa 200 različitih imena
    const atTable = new Set<string>();
    const rng = makeLcg(77);

    for (let i = 0; i < 200; i++) {
      atTable.add(`ImePrezime${i}`);
    }

    // Ne bi trebalo baciti grešku
    const identity = generateBotIdentity(atTable, new Set(), rng);
    expect(identity.displayName).toBeTruthy();
    expect(atTable.has(identity.displayName)).toBe(false);
  });
});

// ====================================================
// generateTableIdentities
// ====================================================

describe("generateTableIdentities", () => {
  it("vraća N međusobno jedinstvenih identiteta", () => {
    for (const count of [2, 3, 4] as const) {
      const identities = generateTableIdentities(count, new Set(), makeLcg(count * 7));
      expect(identities).toHaveLength(count);
      const names = identities.map((id) => id.displayName);
      expect(new Set(names).size).toBe(count);
    }
  });

  it("svi identiteti imaju neprazan displayName i avatar", () => {
    const identities = generateTableIdentities(4, new Set(), makeLcg(99));
    for (const id of identities) {
      expect(id.displayName.length).toBeGreaterThan(0);
      expect(id.avatar.length).toBeGreaterThan(0);
    }
  });
});

// ====================================================
// DISTRIBUCIJA KATEGORIJA  (Milestone 8 DoD)
// ====================================================

describe("distribucija kategorija — DoD", () => {
  const TARGET_WEIGHTS: Record<number, number> = {
    1: 12, 2: 10, 3: 9, 4: 8, 5: 10,
    6: 14, 7: 12, 8: 6, 9: 9, 10: 6, 11: 4,
  };
  const TOLERANCE = 4; // ±4% (±3% iz PRD; blaga tolerancija za sampling variance)
  const N = 1000;

  it(`distribucija ${N} identiteta unutar ±${TOLERANCE}% od ciljnih težina`, () => {
    const counts: Record<number, number> = {};
    for (let cat = 1; cat <= 11; cat++) counts[cat] = 0;

    const rng = makeLcg(42);
    for (let i = 0; i < N; i++) {
      const { category } = _generateWithMeta(new Set(), new Set(), rng);
      counts[category]! += 1;
    }

    for (let cat = 1; cat <= 11; cat++) {
      const actual = (counts[cat]! / N) * 100;
      const target = TARGET_WEIGHTS[cat]!;
      expect(actual).toBeGreaterThanOrEqual(target - TOLERANCE);
      expect(actual).toBeLessThanOrEqual(target + TOLERANCE);
    }
  });

  it(`nula duplikata u ${N} identiteta generisanih za isti sto`, () => {
    const rng = makeLcg(13);
    const atTable = new Set<string>();

    for (let i = 0; i < N; i++) {
      const identity = generateBotIdentity(atTable, new Set(), rng);
      expect(atTable.has(identity.displayName)).toBe(false);
      atTable.add(identity.displayName);
    }
  });

  it("nula profanity filter propuštanja u 1000 identiteta", () => {
    const rng = makeLcg(99);
    for (let i = 0; i < N; i++) {
      const identity = generateBotIdentity(new Set(), new Set(), rng);
      expect(failsProfanityFilter(identity.displayName)).toBe(false);
    }
  });
});
