import type { BotSkillTier, GameId, MatchEndReason, MatchMode, MatchOutcome } from "@zandar/shared-types";

import { ownEndReason, type MoveCount } from "../afk";

/**
 * Ishod partije po igraču za statistiku (SPEC_STATISTIKA §5.1, F0).
 *
 * Pravilo je isto kao u analitici (`ownEndReason`): ko je meč odigrao do kraja
 * dobija pobjedu ili poraz, ko je izašao, kome je istekao rok za povratak ili
 * je većinu poteza prepustio satu (AFK) dobija napuštanje, a igrač koji je
 * ostao za prekinutim stolom ne dobija ništa. Pobjeda je samo 1. mjesto (ili
 * pobjeda tima). Bot i čovjek bez `uid`-a nemaju upis.
 *
 * Zapis nosi i ono što Liga i rang trebaju kasnije (§7.1) — `opponents` sa
 * oznakom bota je SAMO server (HARD RULE 3), nikad ne ide klijentu.
 */

export type OutcomePlayer = {
  id: string;
  uid?: string | undefined;
  isBot?: boolean | undefined;
  left?: boolean | undefined;
  connectionStatus?: string | undefined;
  teamId?: number | undefined;
  botProfile?: { tier: BotSkillTier } | undefined;
};

/** Zapis jedne partije za jednog igrača (`results/{matchId__uid}`). */
export type MatchResult = {
  outcome: MatchOutcome;
  /** 1 = pobjednik (ili pobjednički tim); `null` kad mjesto ne postoji (napuštanje usred meča). */
  place: number | null;
  players: number;
  target?: number;
  raub?: { finalScore: number; othersRemaining: number[] };
  mode: MatchMode;
  /** Protivnici: `uid`, `bot:<tier>` ili `human` (čovjek bez naloga). SAMO server. */
  opponents: string[];
  /** Partner u timskoj igri (Bela, Žandar 4P), isti oblik kao `opponents`. */
  partner?: string;
  afk?: true;
  left?: true;
  durationMs?: number;
  hands: number;
};

export type OutcomeInput = {
  game: GameId;
  /** Igrači za stolom (sjedišta), uključujući botove. */
  players: readonly OutcomePlayer[];
  reason: MatchEndReason;
  counts?: Record<string, MoveCount> | undefined;
  mode: MatchMode;
  startedAt?: number | undefined;
  now: number;
  hands: number;
  target?: number | undefined;
  /** Mjesto igrača na kraju (1 = pobjeda); `null` = nema mjesta. */
  placeOf: (playerId: string) => number | null;
  /** Raub: bodovi na kraju po igraču. */
  raubScores?: Record<string, number> | undefined;
};

function tag(p: OutcomePlayer): string {
  if (p.isBot) return `bot:${p.botProfile?.tier ?? 0}`;
  return p.uid ? p.uid : "human";
}

/** Napustio je sam: dugme „Napusti", istek roka za povratak. */
function leftOnHisOwn(p: OutcomePlayer): boolean {
  return p.left === true || p.connectionStatus === "abandoned";
}

export function matchOutcomes(input: OutcomeInput): { uid: string; result: MatchResult }[] {
  const out: { uid: string; result: MatchResult }[] = [];
  const seen = new Set<string>();
  for (const p of input.players) {
    if (p.isBot || !p.uid || seen.has(p.uid)) continue;
    const count = input.counts?.[p.id];
    const own = ownEndReason(input.reason, p, count);
    let outcome: MatchOutcome;
    let place: number | null = null;
    if (own.reason === "completed") {
      place = input.placeOf(p.id);
      outcome = place === 1 ? "win" : "loss";
    } else if (own.afk || own.left || leftOnHisOwn(p)) {
      outcome = "abandon";
    } else {
      continue; // prekid za onoga ko je ostao — ništa se ne upisuje
    }
    seen.add(p.uid);

    const team = p.teamId;
    const others = input.players.filter((o) => o.id !== p.id);
    const partner = team !== undefined ? others.find((o) => o.teamId === team) : undefined;
    const opponents = others.filter((o) => team === undefined || o.teamId !== team).map(tag);

    const result: MatchResult = {
      outcome,
      place,
      players: input.players.length,
      mode: input.mode,
      opponents,
      hands: input.hands,
    };
    if (partner) result.partner = tag(partner);
    if (input.target !== undefined) result.target = input.target;
    if (input.raubScores && input.raubScores[p.id] !== undefined) {
      result.raub = {
        finalScore: input.raubScores[p.id]!,
        othersRemaining: others.map((o) => input.raubScores![o.id]).filter((n): n is number => n !== undefined),
      };
    }
    if (own.afk) result.afk = true;
    if (own.left || leftOnHisOwn(p)) result.left = true;
    if (input.startedAt !== undefined) result.durationMs = Math.max(0, input.now - input.startedAt);
    out.push({ uid: p.uid, result });
  }
  return out;
}
