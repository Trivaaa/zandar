import type { PokerPot } from "@zandar/shared-types";

export interface PotContribution {
  playerId: string;
  /** Ukupno uloženo u ruci. */
  amount: number;
  /** Foldao ili napustio — doprinosi potu, nema pravo na njega. */
  folded: boolean;
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  return b.every((x) => s.has(x));
}

/**
 * Glavni i side potovi iz ukupnih uloga (spec: „Side potovi").
 *
 * Za svaku visinu uloga pravi se sloj: svako doprinosi do te visine, pravo imaju
 * oni koji nisu foldali i uložili su bar toliko. Susjedni slojevi sa istim
 * pravom se spajaju. Višak iznad najvećeg uloga koji niko nije pratio ostaje
 * pot sa jednim ovlaštenim — to je vraćanje nepraćenog uloga.
 * Redoslijed: od glavnog prema posljednjem side potu.
 */
export function buildPots(contributions: readonly PotContribution[]): PokerPot[] {
  const levels = [...new Set(contributions.filter((c) => c.amount > 0).map((c) => c.amount))].sort(
    (a, b) => a - b,
  );
  const pots: PokerPot[] = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    for (const c of contributions) amount += Math.max(0, Math.min(c.amount, level) - prev);
    const eligible = contributions
      .filter((c) => !c.folded && c.amount >= level)
      .map((c) => c.playerId);
    prev = level;
    if (amount === 0) continue;
    const last = pots[pots.length - 1];
    if (eligible.length === 0) {
      // Uloženo iznad svih koji su ostali u ruci (samo foldani) — pripada zadnjem potu.
      if (last) last.amount += amount;
      else pots.push({ amount, eligiblePlayerIds: [] });
      continue;
    }
    if (last && sameSet(last.eligiblePlayerIds, eligible)) last.amount += amount;
    else pots.push({ amount, eligiblePlayerIds: eligible });
  }
  return pots;
}

/**
 * Dijeli pot na pobjednike. `winnersInOrder` mora biti poredan od prvog lijevo
 * od buttona — neparni žetoni idu redom od prvog (spec: „Neparan žeton").
 */
export function splitPot(amount: number, winnersInOrder: readonly string[]): Map<string, number> {
  const out = new Map<string, number>();
  const n = winnersInOrder.length;
  if (n === 0) return out;
  const base = Math.floor(amount / n);
  let rem = amount - base * n;
  for (const id of winnersInOrder) {
    const extra = rem > 0 ? 1 : 0;
    rem -= extra;
    out.set(id, (out.get(id) ?? 0) + base + extra);
  }
  return out;
}
