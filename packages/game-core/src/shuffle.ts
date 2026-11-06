import type { Card } from "@zandar/shared-types";

/**
 * Jednostavan seeded random generator (LCG algoritam).
 * Isti seed uvijek daje istu sekvencu brojeva. Ključno za testove.
 * Brojevi koji se vraćaju su između 0 (uključeno) i 1 (isključeno),
 * kao Math.random().
 */
function createSeededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    // Linear Congruential Generator (LCG) formula
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

/**
 * Pomiješa špil koristeći Fisher-Yates algoritam.
 * Vraća NOVI niz; originalni špil ostaje netaknut.
 *
 * @param deck - Niz karata za miješanje.
 * @param seed - Opcionalan seed za deterministicko miješanje (korisno za testove).
 *               Ako nije naveden, koristi se pravi Math.random().
 * @returns Novi niz sa istim kartama u nasumičnom redoslijedu.
 */
export function shuffle(deck: Card[], seed?: number): Card[] {
  const random = seed !== undefined ? createSeededRandom(seed) : Math.random;
  return shuffleWith(deck, random);
}

/**
 * Fisher-Yates sa ubrizganim generatorom `random()` u [0, 1).
 * Vraća NOVI niz. Poker ga zove sa kriptografskim generatorom (server),
 * testovi sa seeded — game-core ne zna odakle dolazi slučajnost.
 */
export function shuffleWith<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items]; // kopija, ne dirati original

  // Fisher-Yates: idemo od kraja ka početku
  // Za svaki indeks i, biramo nasumični j između 0 i i, pa swap-ujemo
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const itemI = result[i]!;
    const itemJ = result[j]!;
    result[i] = itemJ;
    result[j] = itemI;
  }

  return result;
}

/** Seeded generator za testove i simulaciju (isti seed = ista sekvenca). */
export { createSeededRandom };
