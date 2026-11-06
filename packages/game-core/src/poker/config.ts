/**
 * Podesivi parametri pokera (HARD RULE 7: konfiguracija, ne hardkod).
 * Spec: docs/poker-spec.md — „Parametri stola" i „Struktura blindova".
 */
export interface PokerConfig {
  startStack: number;
  /** Nivo blindova raste svakih N ruku (na početku ruke, nikad usred). */
  handsPerLevel: number;
  /** [small, big] za startStack 100. Poslije zadnjeg nivoa se duplira. */
  blindLevels: Array<[number, number]>;
  /** Rok poteza za čovjeka (server). */
  turnTimeoutSeconds: number;
  /** Bez veze duže od ovoga = napustio meč (server). */
  disconnectGraceSeconds: number;
}

export const DEFAULT_POKER_BLIND_LEVELS: Array<[number, number]> = [
  [1, 2],
  [2, 4],
  [3, 6],
  [5, 10],
  [8, 16],
  [10, 20],
  [15, 30],
  [20, 40],
  [30, 60],
  [50, 100],
];

export const DEFAULT_POKER_CONFIG: PokerConfig = {
  startStack: 100,
  handsPerLevel: 5,
  blindLevels: DEFAULT_POKER_BLIND_LEVELS,
  turnTimeoutSeconds: 20,
  disconnectGraceSeconds: 60,
};

/** Nivo (1-based) za ruku broj `handNo` (1-based). */
export function pokerLevelForHand(handNo: number, handsPerLevel: number): number {
  return Math.floor((Math.max(1, handNo) - 1) / Math.max(1, handsPerLevel)) + 1;
}

/**
 * Blindovi za nivo. Iznad tabele se zadnji nivo duplira po nivou.
 * Vrijednosti se skaliraju faktorom startStack/100 (spec: „skaliraju istim faktorom").
 */
export function pokerBlindsForLevel(
  level: number,
  blindLevels: ReadonlyArray<readonly [number, number]>,
  startStack: number,
): { smallBlind: number; bigBlind: number } {
  const scale = startStack / 100;
  const n = blindLevels.length;
  let sb: number;
  let bb: number;
  if (level <= n) {
    [sb, bb] = blindLevels[Math.max(0, level - 1)]!;
  } else {
    const [lastSb, lastBb] = blindLevels[n - 1]!;
    const factor = 2 ** (level - n);
    sb = lastSb * factor;
    bb = lastBb * factor;
  }
  return {
    smallBlind: Math.max(1, Math.round(sb * scale)),
    bigBlind: Math.max(1, Math.round(bb * scale)),
  };
}
