import { POKER_PACE, actionBeatMs, dealMs } from "@zandar/game-core";
import type { PokerGamePayload, PokerLastAction, PokerLogType, PokerSeatView } from "@zandar/shared-types";

/**
 * Poker stol kao PRIČA (plan animacija, 7.11.2026).
 *
 * Server za jedan potez pošalje jedno stanje u kojem je sve već gotovo: ulog u
 * potu, flop na stolu, sat sljedećeg igrača. Ovdje se iz razlike prethodno
 * PRIKAZANOG i novog stanja pravi niz koraka; svaki korak kaže šta sto još
 * „drži" (uloge, natpise, board, pot, stackove, otkrivene karte) i koji let
 * pokreće. `usePokerBeat` ih izvodi jedan za drugim.
 *
 * Trajanja su iz `POKER_PACE` (game-core) — ista po kojima server odgađa sat
 * sljedećeg igrača (`pokerPresentationMs`), pa priča stane prije sata.
 *
 * Čisto: nema DOM-a ni vremena. Koristi samo ono što pogled već nosi (tuđe
 * karte tek kad ih server otkrije na showdownu).
 */

export type BeatView = Pick<
  PokerGamePayload,
  | "handNo"
  | "phase"
  | "street"
  | "board"
  | "seats"
  | "currentPlayerId"
  | "currentBet"
  | "potTotal"
  | "lastHandResult"
  | "buttonSeat"
>;

/** Šta sto prikazuje DRUGAČIJE od stvarnog stanja dok priča traje. */
export type BeatHold = {
  /** Ulozi ulice po igraču (bez ključa = nema uloga). */
  bets?: Record<string, number>;
  /** Ulozi čiji žetoni još lete — element postoji (sidro leta), ali se ne vidi. */
  hiddenBets?: string[];
  /** Natpisi zadnje akcije (bez ključa = bez natpisa). */
  captions?: Record<string, PokerLastAction>;
  /** Koliko karata boarda se vidi. */
  board?: number;
  /** Pot u sredini (`0` = nema pota). */
  pot?: number;
  /** Stack po igraču prije isplate. */
  stacks?: Record<string, number>;
  /** Igrači čije su karte već okrenute na showdownu. */
  revealed?: string[];
  /** Pobjedničke karte istaknute. */
  highlight?: boolean;
  /** Traka rezultata vidljiva. */
  result?: boolean;
  /** `false` = karte nove ruke još putuju (ne crtaj ruke). */
  dealt?: boolean;
  /** Igrači koji su ostali bez žetona, a sjedište im se još ne gasi. */
  stillSeated?: string[];
};

export type BeatFx =
  | { kind: "chipsToBet"; playerId: string }
  | { kind: "fold"; playerId: string }
  | { kind: "check"; playerId: string }
  | { kind: "betsToPot"; playerIds: string[] }
  | { kind: "potToWinners"; winners: string[] }
  | { kind: "deal"; order: string[] };

export type BeatStep = { ms: number; hold: BeatHold; fx?: BeatFx };

const P = POKER_PACE;
/** Jedna karta flopa (flop = tri ovakve). */
const FLOP_CARD_MS = Math.round(P.flopMs / 3);
/** Turn/river: dio koraka koji je sama karta (ostatak je pauza prije nje). */
const STREET_CARD_MS = 500;

const seatOf = (v: BeatView, id: string): PokerSeatView | undefined => v.seats.find((s) => s.playerId === id);

/** Dobitak u ruci po igraču (svi potovi, uključujući vraćen ulog). */
function awardedBy(v: BeatView): Map<string, number> {
  const m = new Map<string, number>();
  if (v.phase === "betting" || !v.lastHandResult) return m;
  for (const a of v.lastHandResult.awards) m.set(a.playerId, (m.get(a.playerId) ?? 0) + a.amount);
  return m;
}

/**
 * Koliko je ko uložio prelazom prev → next (ista ruka). Iz stackova, jer
 * motor na kraju ruke briše uloge: prethodni stack − (novi stack − dobitak).
 */
function putIn(prev: BeatView, next: BeatView, awarded: Map<string, number>): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of prev.seats) {
    const n = seatOf(next, p.playerId);
    if (!n) continue;
    const added = p.stack - (n.stack - (awarded.get(p.playerId) ?? 0));
    if (added > 0) m.set(p.playerId, added);
  }
  return m;
}

/** Šta je upravo odigrao `actor` (natpis), kad ga motor više ne nosi (nova ulica, kraj ruke). */
function actorAction(prev: BeatView, next: BeatView, actor: string, added: number): PokerLastAction {
  const n = seatOf(next, actor);
  const p = seatOf(prev, actor);
  if (n?.lastAction && next.street === prev.street && next.phase === "betting") return n.lastAction;
  const amount = (p?.streetBet ?? 0) + added;
  if (n?.folded && !p?.folded) return { type: "fold", amount: p?.streetBet ?? 0 };
  if (added === 0) return { type: "check", amount: 0 };
  if (n && n.stack === 0 && (n.allIn || next.phase !== "betting")) return { type: "allin", amount };
  return { type: amount > prev.currentBet ? (prev.currentBet === 0 ? "bet" : "raise") : "call", amount };
}

function logType(a: PokerLastAction): PokerLogType {
  return a.type;
}

/** Redoslijed dijeljenja: od prvog lijevo od djelioca, u smjeru igre. */
function dealOrder(v: BeatView): string[] {
  const inHand = v.seats.filter((s) => s.inHand).sort((a, b) => a.seatNo - b.seatNo);
  const after = inHand.filter((s) => s.seatNo > v.buttonSeat);
  const before = inHand.filter((s) => s.seatNo <= v.buttonSeat);
  return [...after, ...before].map((s) => s.playerId);
}

function boardSteps(from: number, to: number, base: BeatHold, runout: boolean): BeatStep[] {
  const steps: BeatStep[] = [];
  let shown = from;
  while (shown < to) {
    if (runout) steps.push({ ms: P.runoutPauseMs, hold: { ...base, board: shown } });
    if (shown === 0) {
      for (let i = 1; i <= Math.min(3, to); i++) steps.push({ ms: FLOP_CARD_MS, hold: { ...base, board: i } });
      shown = Math.min(3, to);
    } else {
      steps.push({ ms: P.turnRiverMs - STREET_CARD_MS, hold: { ...base, board: shown } });
      shown += 1;
      steps.push({ ms: STREET_CARD_MS, hold: { ...base, board: shown } });
    }
  }
  return steps;
}

/**
 * Koraci priče od `prev` (zadnje prikazano) do `next`. Prazno = nema šta da se
 * priča (isto stanje poslano ponovo, prvi prikaz, ili prelaz koji ne treba
 * pokret) — tada se `next` prikaže odmah.
 */
export function pokerBeats(prev: BeatView | null, next: BeatView): BeatStep[] {
  if (!prev) return [];

  // ── Nova ruka: karte putuju od djelioca, dva kruga.
  if (next.handNo !== prev.handNo) {
    if (next.phase !== "betting") return [];
    const order = dealOrder(next);
    if (order.length === 0) return [];
    return [{ ms: dealMs(order.length), hold: { dealt: false }, fx: { kind: "deal", order } }];
  }

  const awarded = awardedBy(next);
  const added = putIn(prev, next, awarded);
  const actor = prev.phase === "betting" ? prev.currentPlayerId : null;
  const boardGrew = next.board.length > prev.board.length;
  const handEnded = prev.phase === "betting" && next.phase !== "betting";

  // Ništa novo (ponovno slanje, promjena statusa veze, isti potez).
  if (!handEnded && !boardGrew && next.currentPlayerId === prev.currentPlayerId && added.size === 0) {
    const sameActions = next.seats.every((s) => {
      const p = seatOf(prev, s.playerId);
      return p && p.folded === s.folded && JSON.stringify(p.lastAction) === JSON.stringify(s.lastAction);
    });
    if (sameActions) return [];
  }

  const action = actor ? actorAction(prev, next, actor, added.get(actor) ?? 0) : null;
  const actionMs = action ? actionBeatMs(logType(action)) : 0;
  const actionFx: BeatFx | undefined =
    !actor || !action
      ? undefined
      : action.type === "fold"
        ? { kind: "fold", playerId: actor }
        : action.type === "check"
          ? { kind: "check", playerId: actor }
          : { kind: "chipsToBet", playerId: actor };

  // ── Potez u istoj ulici: natpis, žetoni od sjedišta do mjesta uloga.
  if (!handEnded && !boardGrew) {
    if (!actor || actionMs === 0) return [];
    const hidden = (added.get(actor) ?? 0) > 0 ? [actor] : [];
    return [{ ms: actionMs, hold: hidden.length ? { hiddenBets: hidden } : {}, ...(actionFx ? { fx: actionFx } : {}) }];
  }

  // ── Ulica se zatvorila (nova ulica ili kraj ruke): zadrži uloge i natpise
  // kakvi su bili poslije zadnjeg poteza, pa ih pošalji u pot.
  const heldBets: Record<string, number> = {};
  const heldCaptions: Record<string, PokerLastAction> = {};
  for (const p of prev.seats) {
    const bet = p.streetBet + (added.get(p.playerId) ?? 0);
    if (bet > 0) heldBets[p.playerId] = bet;
    const cap = p.playerId === actor && action ? action : p.lastAction;
    if (cap) heldCaptions[p.playerId] = cap;
  }
  const betIds = Object.keys(heldBets);

  const result = handEnded ? next.lastHandResult : null;
  const potAll = result ? result.pots.reduce((a, p) => a + p.amount, 0) : next.potTotal;
  const stacksBefore: Record<string, number> = {};
  for (const s of next.seats) stacksBefore[s.playerId] = s.stack - (awarded.get(s.playerId) ?? 0);
  const newlyBust = next.seats
    .filter((s) => s.status === "bankrupt" && seatOf(prev, s.playerId)?.status !== "bankrupt")
    .map((s) => s.playerId);

  const base: BeatHold = {
    board: prev.board.length,
    pot: potAll,
    ...(handEnded ? { stacks: stacksBefore, revealed: [], result: false, highlight: false } : {}),
    ...(newlyBust.length ? { stillSeated: newlyBust } : {}),
  };

  const steps: BeatStep[] = [];
  if (actor && actionMs > 0) {
    steps.push({
      ms: actionMs,
      hold: { ...base, bets: heldBets, captions: heldCaptions, ...((added.get(actor) ?? 0) > 0 ? { hiddenBets: [actor] } : {}) },
      ...(actionFx ? { fx: actionFx } : {}),
    });
  }
  steps.push({ ms: P.streetSettleMs, hold: { ...base, bets: heldBets, captions: heldCaptions } });
  steps.push({
    ms: P.betsToPotMs,
    hold: { ...base },
    ...(betIds.length ? { fx: { kind: "betsToPot", playerIds: betIds } as BeatFx } : {}),
  });

  if (!handEnded) {
    // Nova ulica: karte jedna po jedna, pa je sljedeći na potezu.
    steps.push(...boardSteps(prev.board.length, next.board.length, { ...base }, false));
    return steps;
  }

  // ── Kraj ruke.
  if (!result) return steps;
  let hold: BeatHold = { ...base };
  if (!result.uncontested) {
    // Showdown: karte se okreću jedna po jedna (redom kako ih je server poredao).
    const revealed: string[] = [];
    for (const h of result.showdown) {
      revealed.push(h.playerId);
      hold = { ...hold, revealed: [...revealed] };
      steps.push({ ms: P.revealPerHandMs, hold });
    }
    // All-in do kraja: preostale ulice se dijele poslije otvorenih karata.
    if (boardGrew) {
      const runout = boardSteps(prev.board.length, next.board.length, hold, true);
      steps.push(...runout);
      hold = { ...hold, board: next.board.length };
    }
    hold = { ...hold, board: next.board.length, highlight: true };
    steps.push({ ms: P.showdownHoldMs, hold });
  } else if (boardGrew) {
    hold = { ...hold, board: next.board.length };
  }

  // Isplata pot po pot; vraćen nepraćen ulog ide uz prvu isplatu, bez posebnog leta.
  const realPots = result.pots
    .map((pot, i) => ({ pot, i, winners: result.awards.filter((a) => a.potIndex === i) }))
    .filter((x) => x.pot.eligiblePlayerIds.length > 1 && x.winners.length > 0);
  const refunds = result.awards.filter((a) => (result.pots[a.potIndex]?.eligiblePlayerIds.length ?? 0) <= 1);
  let pot = potAll - refunds.reduce((a, r) => a + r.amount, 0);
  const stacks = { ...stacksBefore };
  for (const r of refunds) stacks[r.playerId] = (stacks[r.playerId] ?? 0) + r.amount;
  if (realPots.length === 0 && refunds.length > 0) {
    // Svi foldali: „pot" je vraćen ulog + ono što su drugi uložili — jedan let pobjedniku.
    const winners = [...new Set(refunds.map((r) => r.playerId))];
    steps.push({ ms: P.awardPerPotMs, hold: { ...hold, pot: potAll, stacks: stacksBefore }, fx: { kind: "potToWinners", winners } });
  }
  for (const x of realPots) {
    const winners = [...new Set(x.winners.map((w) => w.playerId))];
    steps.push({ ms: P.awardPerPotMs, hold: { ...hold, pot, stacks: { ...stacks } }, fx: { kind: "potToWinners", winners } });
    pot -= x.pot.amount;
    for (const w of x.winners) stacks[w.playerId] = (stacks[w.playerId] ?? 0) + w.amount;
  }
  hold = { ...hold, pot: 0, stacks: { ...stacks } };
  if (newlyBust.length) {
    steps.push({ ms: P.bustMs, hold });
    hold = { ...hold, stillSeated: [] };
  }
  steps.push({ ms: result.uncontested ? P.readShortMs : P.readMs, hold: { ...hold, result: true } });
  if (next.phase === "match_finished" || next.phase === "abandoned") {
    steps.push({ ms: P.matchEndHoldMs, hold: { ...hold, result: true } });
  }
  return steps;
}

export const totalMs = (steps: readonly BeatStep[]): number => steps.reduce((a, s) => a + s.ms, 0);
