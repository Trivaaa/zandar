import type { BelaDeclaration, BelaPlayerDeclarations, Card, Rank, Suit } from "@zandar/shared-types";
import { BELA_RANKS, belaNaturalValue } from "./cards";

/**
 * Zvanja (spec: „Zvanja (prijave)", P-5…P-8).
 * - niz iste boje prirodnim redom VII…A: 3 = 20, 4 = 50, 5+ = 100
 * - četiri iste: U 200, IX 150, A/X/K/O 100 (VII i VIII ništa)
 * Karta smije biti i u nizu i u četiri iste (npr. četiri U i terca sa U);
 * spec to ne zabranjuje, pa se računa oboje.
 */

const FOUR_POINTS: Partial<Record<Rank, number>> = { J: 200, "9": 150, A: 100, "10": 100, K: 100, Q: 100 };

export function sequencePoints(length: number): number {
  if (length >= 5) return 100;
  if (length === 4) return 50;
  if (length === 3) return 20;
  return 0;
}

/** Sva zvanja u ruci (bez bele). Redoslijed: najjače prvo. */
export function findBelaDeclarations(hand: readonly Card[]): BelaDeclaration[] {
  const out: BelaDeclaration[] = [];
  const suits = [...new Set(hand.map((c) => c.suit))];
  for (const suit of suits) {
    const cards = hand
      .filter((c) => c.suit === suit)
      .sort((a, b) => belaNaturalValue(a) - belaNaturalValue(b));
    let run: Card[] = [];
    const flush = () => {
      if (run.length >= 3) out.push({ kind: "sequence", points: sequencePoints(run.length), cards: run });
    };
    for (const c of cards) {
      const prev = run.at(-1);
      if (prev && belaNaturalValue(c) === belaNaturalValue(prev) + 1) run.push(c);
      else {
        flush();
        run = [c];
      }
    }
    flush();
  }
  for (const rank of BELA_RANKS) {
    const pts = FOUR_POINTS[rank];
    if (!pts) continue;
    const four = hand.filter((c) => c.rank === rank);
    if (four.length === 4) out.push({ kind: "four", points: pts, cards: four });
  }
  return out.sort((a, b) => compareDeclarations(b, a, null));
}

/**
 * Poređenje dva zvanja (P-7): bodovi, pa broj karata, pa viša karta (prirodni
 * red), pa adutski niz. 0 = jednako (odlučuje redoslijed igrača).
 */
export function compareDeclarations(a: BelaDeclaration, b: BelaDeclaration, trump: Suit | null): number {
  if (a.points !== b.points) return a.points - b.points;
  if (a.cards.length !== b.cards.length) return a.cards.length - b.cards.length;
  const topA = Math.max(...a.cards.map(belaNaturalValue));
  const topB = Math.max(...b.cards.map(belaNaturalValue));
  if (topA !== topB) return topA - topB;
  const trA = a.kind === "sequence" && a.cards[0]!.suit === trump ? 1 : 0;
  const trB = b.kind === "sequence" && b.cards[0]!.suit === trump ? 1 : 0;
  return trA - trB;
}

/**
 * Ko boduje zvanja. `byOrder` su prijave redom igranja (od prvog na potezu),
 * `teamOf` daje tim igrača. Uz `winnerOnly` (P-7) boduje samo tim sa najjačim
 * pojedinačnim zvanjem (jednako → igrač bliži prvom na potezu), ali tada sva
 * svoja; inače svako svoja. Vraća samo igrače sa bodovanim zvanjima.
 */
export function resolveBelaDeclarations(
  byOrder: readonly BelaPlayerDeclarations[],
  teamOf: (playerId: string) => number,
  trump: Suit | null,
  winnerOnly: boolean,
): BelaPlayerDeclarations[] {
  const withAny = byOrder.filter((p) => p.declarations.length > 0);
  if (!winnerOnly || withAny.length === 0) return withAny.map(copy);
  let best: { playerId: string; decl: BelaDeclaration } | null = null;
  for (const p of withAny) {
    for (const d of p.declarations) {
      // Strogo veće: kod jednakih ostaje raniji igrač (bliži prvom na potezu).
      if (!best || compareDeclarations(d, best.decl, trump) > 0) best = { playerId: p.playerId, decl: d };
    }
  }
  const team = teamOf(best!.playerId);
  return withAny.filter((p) => teamOf(p.playerId) === team).map(copy);
}

function copy(p: BelaPlayerDeclarations): BelaPlayerDeclarations {
  return { playerId: p.playerId, declarations: p.declarations.map((d) => ({ ...d, cards: d.cards.map((c) => ({ ...c })) })) };
}

export function declarationTotal(list: readonly BelaDeclaration[]): number {
  return list.reduce((s, d) => s + d.points, 0);
}
