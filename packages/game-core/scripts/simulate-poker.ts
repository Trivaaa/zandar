/**
 * Simulacija poker mečeva samo s botovima (spec: „Testovi", „Struktura blindova").
 *
 *   pnpm --filter @zandar/game-core simulate:poker [-- --matches 10000 --players 4 --seed 1 --hpl 5]
 *
 * Provjerava zbir žetona i legalnost akcija, i procjenjuje trajanje meča.
 * Model trajanja (pretpostavke, ne mjerenje):
 *  - u Quick Playu je 1 čovjek i 3 bota; čovjek odlučuje prosječno HUMAN_MS
 *  - bot odlučuje koliko mu kaže `pokerBotThinkMs`
 *  - svaka ruka ima HAND_OVERHEAD_MS (dijeljenje, let žetona, prikaz rezultata)
 */
import { simulatePokerMatches } from "../src/poker/simulate";

const HUMAN_MS = 6000;
const HAND_OVERHEAD_MS = 6000;

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const matches = arg("matches", 10_000);
const players = arg("players", 4);
const seed = arg("seed", 1);
const hpl = arg("hpl", 5);

const t0 = Date.now();
const r = simulatePokerMatches({ matches, players, seed, config: { handsPerLevel: hpl } });
const elapsed = Date.now() - t0;

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]!;
};
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

const hands = r.matches.map((m) => m.hands);
const minutes = r.matches.map((m) => {
  const humanShare = 1 / players;
  const botMs = m.thinkMs * (1 - humanShare);
  const humanMs = m.actions * humanShare * HUMAN_MS;
  return (botMs + humanMs + m.hands * HAND_OVERHEAD_MS) / 60_000;
});
const totalHands = hands.reduce((a, b) => a + b, 0);

console.log(`Poker simulacija: ${matches} mečeva × ${players} igrača, seed ${seed}, nivo svakih ${hpl} ruku`);
console.log(`  trajalo ${elapsed} ms`);
console.log(`  odstupanja u zbiru žetona: ${r.chipErrors}`);
console.log(`  odbijene akcije bota:      ${r.illegalActions}`);
console.log(
  `  ruke po meču: p10 ${pct(hands, 10)} · medijan ${pct(hands, 50)} · p90 ${pct(hands, 90)} · prosjek ${mean(hands).toFixed(1)}`,
);
console.log(
  `  prvi bankrot u ruci: medijan ${pct(r.matches.map((m) => m.firstBustHand), 50)}`,
);
console.log(
  `  akcije po ruci: ${(mean(r.matches.map((m) => m.actions)) / mean(hands)).toFixed(2)}`,
);
console.log(
  `  all-in runout: ${((100 * r.matches.reduce((a, m) => a + m.allInHands, 0)) / totalHands).toFixed(1)}% ruku · bez showdowna: ${((100 * r.matches.reduce((a, m) => a + m.uncontestedHands, 0)) / totalHands).toFixed(1)}%`,
);
console.log(
  `  vidjele flop: ${((100 * r.matches.reduce((a, m) => a + m.flopHands, 0)) / totalHands).toFixed(1)}% ruku`,
);
console.log(
  `  procjena trajanja (min): p10 ${pct(minutes, 10).toFixed(1)} · medijan ${pct(minutes, 50).toFixed(1)} · p90 ${pct(minutes, 90).toFixed(1)}  (cilj 12–20)`,
);
console.log(
  `  u cilju 12–20 min: ${((100 * minutes.filter((x) => x >= 12 && x <= 20).length) / minutes.length).toFixed(1)}%`,
);

if (r.chipErrors > 0 || r.illegalActions > 0) process.exit(1);
