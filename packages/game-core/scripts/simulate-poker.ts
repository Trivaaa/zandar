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
import { DEFAULT_POKER_BOT_CONFIG, type PokerBotConfig } from "../src/poker/bot";
import { simulatePokerMatches } from "../src/poker/simulate";

const HUMAN_MS = 6000;
const HAND_OVERHEAD_MS = 6000;

/**
 * `--novice`: mjesto 0 igra kao početnik — labav i pasivan („da vidim flop"),
 * plaća previše, ne blefira, rijetko podiže. To je pretpostavka o tipičnom
 * novom igraču, ne mjerenje; služi da se uporede botovi prije i poslije
 * podešavanja (cilj: početnik za 4 osvaja ~25–30 % 1. mjesta).
 */
const NOVICE_PROXY: PokerBotConfig = {
  ...DEFAULT_POKER_BOT_CONFIG,
  openChen: { 2: 3, 3: 4, 4: 4 },
  callRaiseChen: 3,
  reraiseChen: 14,
  defendChen: 0,
  monsterRaiseP: 0.15,
  strongCallPotOdds: 0.5,
  mediumCallPotOdds: 0.45,
  defendPotOdds: 0.5,
  looseCallP: 0.45,
  callShoveChen: 6,
  bluffP: 0,
  slowplayP: 0,
  semiBluffP: 0,
  noise: 2,
};

function arg(name: string, fallback: number): number {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? Number(process.argv[i + 1]) : fallback;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}
/**
 * `POKER_BOT='{"bluffP":0.05}'` — probna izmjena bot configa bez diranja koda.
 * Varijabla okruženja, ne argument: pnpm-ov shim na Windowsu kvari JSON sa
 * navodnicima u argumentu (proces visi).
 */
function botOverrides(): Partial<PokerBotConfig> {
  const raw = process.env.POKER_BOT;
  return raw ? (JSON.parse(raw) as Partial<PokerBotConfig>) : {};
}

const matches = arg("matches", 10_000);
const players = arg("players", 4);
const seed = arg("seed", 1);
const hpl = arg("hpl", 5);
const novice = flag("novice");
const botConfig: PokerBotConfig = { ...DEFAULT_POKER_BOT_CONFIG, ...botOverrides() };

const t0 = Date.now();
const r = simulatePokerMatches({
  matches,
  players,
  seed,
  config: { handsPerLevel: hpl },
  botConfig,
  ...(novice ? { seatBotConfigs: [NOVICE_PROXY] } : {}),
});
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

if (novice) {
  const places = r.matches.map((m) => m.placeBySeat[0]!);
  const share = (p: number) => ((100 * places.filter((x) => x === p).length) / places.length).toFixed(1);
  console.log(
    `  početnik (mjesto 0): 1. mjesto ${share(1)}% · zadnje (${players}.) ${share(players)}% · fer udio ${(100 / players).toFixed(1)}%`,
  );
}

if (r.chipErrors > 0 || r.illegalActions > 0) process.exit(1);
