/**
 * Simulacija Bela mečeva samo s botovima (spec: „Tehnička arhitektura").
 *
 *   pnpm --filter @zandar/game-core simulate:bela [-- --matches 10000 --seed 1 --target 501]
 *
 * Bez `--target` vrti oba cilja (501 i 1001). Provjerava 32 karte na tačno
 * jednom mjestu, 8 štihova po ruci, 162 boda karata (+ štiglja) i legalnost
 * akcija, i procjenjuje trajanje. Model trajanja je isti kao za Raub
 * (pretpostavke, ne mjerenje):
 *  - u Quick Playu je 1 čovjek i 3 bota; čovjek odlučuje prosječno HUMAN_MS
 *  - bot odlučuje koliko mu kaže `belaBotThinkMs`
 *  - svaka ruka ima HAND_OVERHEAD_MS (dijeljenje, let karata, pregled ruke, dugme hosta)
 */
import { simulateBelaMatches } from "../src/bela/simulate";

const HUMAN_MS = 4000;
const HAND_OVERHEAD_MS = 8000;
const PLAYERS = 4;

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}

const matches = arg("matches", 10_000);
const seed = arg("seed", 1);
const onlyTarget = arg("target", 0);
const targets = onlyTarget > 0 ? [onlyTarget] : [501, 1001];

const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
const pct = (xs: number[], p: number) => sorted(xs)[Math.min(xs.length - 1, Math.floor(xs.length * p))]!;
const share = (n: number, d: number) => `${((n / Math.max(1, d)) * 100).toFixed(1)}%`;

for (const targetScore of targets) {
  const t0 = Date.now();
  const r = simulateBelaMatches({ matches, seed, rules: { targetScore } });
  const elapsed = Date.now() - t0;
  const ms = r.matches;
  const total = (k: keyof (typeof ms)[number]) => ms.reduce((a, m) => a + m[k], 0);
  const played = total("hands") - total("redeals");
  const hands = ms.map((m) => m.hands);
  const minutes = ms.map((m) => {
    const humanMs = (m.actions / PLAYERS) * HUMAN_MS;
    const botMs = (m.thinkMs * (PLAYERS - 1)) / PLAYERS;
    return (humanMs + botMs + m.hands * HAND_OVERHEAD_MS) / 60_000;
  });

  console.log(`\nBela do ${targetScore}: ${matches} mečeva, seed ${seed} (${elapsed} ms)`);
  console.log(
    `greške karata ${r.cardErrors} · greške štihova ${r.trickErrors} · greške bodova ${r.pointErrors} · odbijene akcije ${r.illegalActions} · zaglavljeni ${r.stuck}`,
  );
  console.log(`ruke po meču: medijan ${pct(hands, 0.5)}, p10 ${pct(hands, 0.1)}, p90 ${pct(hands, 0.9)}`);
  console.log(
    `odigrane ruke ${played}: prolaz ${share(total("passes"), played)} · pad ${share(total("fails"), played)} · visi ${share(total("hangs"), played)} · štiglja ${share(total("stigljas"), played)} · mus ${share(total("forced"), played)}`,
  );
  console.log(
    `procjena trajanja (min): medijan ${pct(minutes, 0.5).toFixed(1)}, p10 ${pct(minutes, 0.1).toFixed(1)}, p90 ${pct(minutes, 0.9).toFixed(1)}`,
  );
}
