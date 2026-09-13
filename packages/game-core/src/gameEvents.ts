// ====================================================
// FEEDBACK GAME EVENTS (PRD §50.6)
// ====================================================
// Čista, deterministička detekcija "šta se desilo" između dva uzastopna
// snapshota klijentskog state-a. Pokreće feedback sloj (zvuk/haptika/animacije).
// NE mijenja state — samo ga čita. Drži se game-core charter-a (state in, result out).

/** Tipovi feedback događaja. */
export type GameEvent =
  /**
   * Dijeljenje. Nosi i ŠTA je podijeljeno, jer animacija inače pogađa: sto se
   * puni SAMO na početku ruke (`advanceTurnOrPhase` re-deal dijeli isključivo
   * igračima), a broj karata po igraču je `rulesConfig.cardsPerDeal` — osim
   * zadnjeg dijeljenja u ruci, kad špil ne stigne da podijeli pune 4.
   */
  | { type: "deal"; perSeat: number; toTable: number }
  | { type: "capture"; byMe: boolean; jackSweep: boolean; playerId: string }
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
 * Da li je kupljenje "počistilo" sto (ŽANDAR).
 *
 * Heuristika, ne dokaz: iz javnog view-a se ne vidi RAZLOG kupljenja, pa i
 * nejack koji pokupi zadnju kartu ovdje prolazi kao sweep. Dovoljno za
 * feedback (§50.6) — ali mora biti JEDNO pravilo, jer ga čita i zvuk, i flash,
 * i natpis uz sjedište. Ranije je klijentski panel koristio `rank === "J"`, pa
 * su zvuk i tekst umjeli da tvrde različite stvari o istom potezu.
 */
export function isJackSweep(prevTableSize: number, nextTableSize: number): boolean {
  return prevTableSize > 0 && nextTableSize === 0;
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

  const mover = prev.currentPlayerId; // igrač koji je upravo odigrao
  const byMe = mover === myPlayerId;

  // Dijeljenje: ukupan broj karata u rukama poraste (početak ruke / re-deal).
  if (sum(next.handCounts) > sum(prev.handCounts)) {
    events.push({
      type: "deal",
      // Najveći porast po igraču, ne prosjek: zadnje dijeljenje u ruci umije da
      // podijeli nejednako (špil se isprazni usred kruga), a animacija treba
      // gornju granicu — koliko karata je najviše otišlo jednom igraču.
      perSeat: Math.max(
        ...next.players.map(
          (p) => (next.handCounts[p.id] ?? 0) - (prev.handCounts[p.id] ?? 0),
        ),
        0,
      ),
      // Sto dobija karte SAMO na početku ruke; re-deal usred ruke ga ne dira.
      // Ne računa se iz porasta stola: zadnji potez runde umije da bude trail,
      // pa bi sto tad "dobio" jednu kartu koju je zapravo spustio igrač.
      // Početak ruke se poznaje po tome što prethodni snapshot nije bio u igri
      // (hand_finished → playing; sljedeću ruku pokreće host).
      toTable: prev.phase === "playing" ? 0 : next.table.length,
    });
  }

  // Kupljenje vs trailanje.
  const capturedDelta = sum(next.capturedCounts) - sum(prev.capturedCounts);
  if (capturedDelta > 0) {
    events.push({
      type: "capture",
      byMe,
      jackSweep: isJackSweep(prev.table.length, next.table.length),
      playerId: mover,
    });
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
