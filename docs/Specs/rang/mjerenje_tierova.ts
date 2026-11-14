import { createInitialGameState, applyMove, selectBotMove, DEFAULT_BOT_CONFIGS, createRulesConfig, createSeededRandom } from "../../../packages/game-core/src/index";

type T = 1|2|3;
function match(tiers: T[], target: number, seed: number): { win: number; hands: number } {
  const n = tiers.length as 2|4;
  const rng = createSeededRandom(seed);
  const players: any[] = tiers.map((t, i) => ({ id: `p${i}`, displayName: `p${i}`, seatIndex: i, teamId: n === 4 ? i % 2 : undefined, connectionStatus: "connected", isHost: i === 0, consecutiveAutoPlays: 0 }));
  const rules = createRulesConfig(n); rules.targetScore = target;
  let dealer = Math.floor(rng() * n);
  let st = createInitialGameState({ roomId: "r", matchId: "m", players, dealerPlayerId: players[dealer].id, rulesConfig: rules, shuffleSeed: Math.floor(rng() * 1e9) });
  let hands = 1;
  for (let guard = 0; guard < 100000; guard++) {
    if (st.phase === "playing") {
      const pid = st.currentPlayerId; const i = Number(pid.slice(1));
      const mv = selectBotMove(st, pid, DEFAULT_BOT_CONFIGS[tiers[i]!]!, rng);
      applyMove(st, { roomId: "r", playerId: pid, cardId: mv.cardId, selectedCaptureCardIds: mv.selectedCaptureCardIds, clientMoveId: "x" + guard, clientKnownStateVersion: st.stateVersion } as any);
    } else if (st.phase === "hand_finished") {
      dealer = (dealer + 1) % n;
      const ns = createInitialGameState({ roomId: "r", matchId: "m", players, dealerPlayerId: players[dealer].id, rulesConfig: rules, shuffleSeed: Math.floor(rng() * 1e9) });
      ns.matchScore = { ...st.matchScore }; ns.handNumber = st.handNumber + 1; ns.handScores = [...st.handScores]; st = ns; hands++;
    } else if (st.phase === "match_finished") {
      const e = Object.entries(st.matchScore).sort((a, b) => b[1] - a[1]);
      const top = e[0]![0];
      const win = n === 4 ? (top === "team-0" ? 1 : 0) : (top === "p0" ? 1 : 0);
      // tie at top? count half
      if (e[0]![1] === e[1]![1]) return { win: 0.5, hands };
      return { win, hands };
    } else throw new Error("phase " + st.phase);
  }
  throw new Error("stuck");
}
function run(label: string, tiers: T[], target: number, N = 3000) {
  let w = 0, h = 0;
  for (let s = 1; s <= N; s++) { const r = match(tiers, target, s * 7919 + target); w += r.win; h += r.hands; }
  console.log(`${label.padEnd(34)} do ${target}: p0/tim0 pobjeda ${(100 * w / N).toFixed(1)}%  ruku ${(h / N).toFixed(2)}`);
}
for (const target of [11, 21]) {
  run("2P T2 vs T2", [2, 2], target);
  run("2P T1 vs T2", [1, 2], target);
  run("2P T3 vs T2", [3, 2], target);
  run("2P T3 vs T1", [3, 1], target);
  run("2P T1 vs T1", [1, 1], target);
  run("4P T3+T2 vs T2+T2", [3, 2, 2, 2], target);
  run("4P T1+T2 vs T2+T2", [1, 2, 2, 2], target);
  run("4P T3+T3 vs T1+T1", [3, 1, 3, 1], target);
  run("4P T3+T1 vs T2+T2", [3, 2, 1, 2], target);
}
