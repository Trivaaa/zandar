// ====================================================
// FEEDBACK GAME EVENTS (PRD §50.6)
// ====================================================
// Čista, deterministička detekcija "šta se desilo" između dva uzastopna
// snapshota klijentskog state-a. Pokreće feedback sloj (zvuk/haptika/animacije).
// NE mijenja state — samo ga čita. Drži se game-core charter-a (state in, result out).

/** Tipovi feedback događaja. */
export type GameEvent =
  | { type: "deal" }
  | { type: "capture"; byMe: boolean; jackSweep: boolean }
  | { type: "trail"; byMe: boolean }
  | { type: "yourTurn" }
  | { type: "handEnd" }
  | { type: "matchEnd"; iWon: boolean };

/**
 * Minimalni strukturni podskup `PrivateGameStateView`-a dovoljan za detekciju.
 * Namjerno NE uvozimo server-view tip — game-core ostaje decoupled; klijent
 * prosljeđuje svoj view koji strukturno zadovoljava ovaj oblik.
 */
export type EventSnapshot = {
  phase: string;
  currentPlayerId: string;
  table: readonly unknown[];
  handCounts: Record<string, number>;
  capturedCounts: Record<string, number>;
  matchScore: Record<string, number>;
  targetScore: number;
  handNumber: number;
  players: readonly { id: string; teamId?: number }[];
};

function sum(rec: Record<string, number>): number {
  return Object.values(rec).reduce((a, b) => a + (b ?? 0), 0);
}

/** Pile koji pripada lokalnom igraču: tim u 4P, inače sam igrač. */
function myPileId(snap: EventSnapshot, myPlayerId: string): string {
  const me = snap.players.find((p) => p.id === myPlayerId);
  return me?.teamId != null ? `team-${me.teamId}` : myPlayerId;
}

/**
 * Detektuje feedback događaje između `prev` i `next` snapshota (PRD §50.6).
 *
 * - Potezni događaji (deal/capture/trail/yourTurn) važe samo dok je `next` u fazi
 *   "playing". Prelazak IZ "playing" daje samo handEnd/matchEnd (da se dodjela
 *   preostalog stola na kraju ruke ne protumači kao capture igrača).
 * - `byMe` se određuje preko igrača koji je upravo odigrao = `prev.currentPlayerId`.
 * - `jackSweep` je heuristika: capture koji je ostavio prazan sto (nije 100%
 *   pouzdano iz javnog view-a — vidi §50.6; dovoljno za feedback).
 *
 * Deterministička i bez sporednih efekata.
 */
export function deriveGameEvents(
  prev: EventSnapshot,
  next: EventSnapshot,
  myPlayerId: string,
): GameEvent[] {
  const events: GameEvent[] = [];

  // Prelazak iz igre → kraj ruke / meča.
  if (prev.phase === "playing" && next.phase !== "playing") {
    if (next.phase === "match_finished") {
      const myScore = next.matchScore[myPileId(next, myPlayerId)] ?? 0;
      events.push({ type: "matchEnd", iWon: myScore >= next.targetScore });
    } else if (next.phase === "hand_finished") {
      events.push({ type: "handEnd" });
    }
    return events;
  }

  if (next.phase !== "playing") return events; // ništa van aktivne igre

  const byMe = prev.currentPlayerId === myPlayerId;

  // Dijeljenje: ukupan broj karata u rukama poraste (početak ruke / re-deal).
  if (sum(next.handCounts) > sum(prev.handCounts)) {
    events.push({ type: "deal" });
  }

  // Kupljenje vs trailanje.
  const capturedDelta = sum(next.capturedCounts) - sum(prev.capturedCounts);
  if (capturedDelta > 0) {
    const jackSweep = prev.table.length > 0 && next.table.length === 0;
    events.push({ type: "capture", byMe, jackSweep });
  } else if (next.table.length === prev.table.length + 1) {
    // Karta spuštena na sto bez kupljenja.
    events.push({ type: "trail", byMe });
  }

  // Tvoj red (rising edge).
  if (prev.currentPlayerId !== myPlayerId && next.currentPlayerId === myPlayerId) {
    events.push({ type: "yourTurn" });
  }

  return events;
}
