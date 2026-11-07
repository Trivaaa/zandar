/**
 * Simulacija Raub mečeva samo s botovima (spec: „Testovi").
 *
 *   pnpm --filter @zandar/game-core simulate:raub [-- --matches 10000 --players 4 --seed 1]
 *
 * Provjerava 32 karte na tačno jednom mjestu, 4 štiha po odigranoj ruci i
 * legalnost akcija, i procjenjuje trajanje meča. Model trajanja (pretpostavke,
 * ne mjerenje):
 *  - u Quick Playu je 1 čovjek i 3 bota; čovjek odlučuje prosječno HUMAN_MS
 *  - bot odlučuje koliko mu kaže `raubBotThinkMs`
 *  - svaka ruka ima HAND_OVERHEAD_MS (dijeljenje, let karata, pregled ruke, dugme hosta)
 */
import { simulateRaubMatches } from "../src/raub/simulate";

const HUMAN_MS = 4000;
const HAND_OVERHEAD_MS = 8000;

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const matches = arg("matches", 10_000);
const players = arg("players", 4) as 2 | 3 | 4;
const seed = arg("seed", 1);

const t0 = Date.now();
const r = simulateRaubMatches({ matches, players, seed });
const elapsed = Date.now() - t0;

const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
const pct = (xs: number[], p: number) => sorted(xs)[Math.min(xs.length - 1, Math.floor(xs.length * p))]!;
const hands = r.matches.map((m) => m.hands);
const totalHands = hands.reduce((a, b) => a + b, 0);
const voids = r.matches.reduce((a, m) => a + m.voidHands, 0);
const sum = (k: "seven" | "blind" | "bid") => r.matches.reduce((a, m) => a + m[k], 0);
const minutes = r.matches.map((m) => {
  const actionsPerSeat = m.actions / players;
  const humanMs = actionsPerSeat * HUMAN_MS;
  const botMs = (m.thinkMs * (players - 1)) / players;
  return (humanMs + botMs + m.hands * HAND_OVERHEAD_MS) / 60_000;
});

console.log(`Raub: ${matches} mečeva × ${players} igrača, seed ${seed} (${elapsed} ms)`);
console.log(`greške karata ${r.cardErrors} · greške štihova ${r.trickErrors} · odbijene akcije ${r.illegalActions} · zaglavljeni ${r.stuck}`);
console.log(`ruke po meču: medijan ${pct(hands, 0.5)}, p10 ${pct(hands, 0.1)}, p90 ${pct(hands, 0.9)}`);
console.log(`refa: ${((voids / totalHands) * 100).toFixed(1)}% ruku · sedmica ${sum("seven")} · naslijepo ${sum("blind")} · licitacija ${sum("bid")}`);
console.log(`procjena trajanja (min): medijan ${pct(minutes, 0.5).toFixed(1)}, p10 ${pct(minutes, 0.1).toFixed(1)}, p90 ${pct(minutes, 0.9).toFixed(1)}`);
