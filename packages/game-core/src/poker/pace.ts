import type { PokerHandResult, PokerLogType, PokerPhase } from "@zandar/shared-types";

/**
 * Ritam prikaza poker stola — JEDNO mjesto za trajanja koja dijele server i
 * klijent. Server po njima pomjera rok sljedećeg igrača i pauzu između ruku
 * (`pokerPresentationMs`), klijent po njima animira (`usePokerBeat`). Ako se
 * vrijednost promijeni ovdje, mijenja se na oba mjesta — klijent nikad ne mora
 * preskakati animaciju da bi stigao sat.
 *
 * Namjerno sporije nego „brzo": cilj je da igrač vidi šta se desilo (odluka
 * vlasnika 7.11.2026). Sve u milisekundama.
 */
export const POKER_PACE = {
  /** Blindovi klize na mjesto uloga na početku ruke. */
  blindsMs: 500,
  /** Razmak između dvije podijeljene karte. */
  dealStaggerMs: 140,
  /** Let jedne karte od djelioca do sjedišta. */
  dealFlightMs: 320,
  /** Okretanje tvojih karata poslije dijeljenja. */
  myFlipMs: 260,

  /** Bet / call / raise / all-in: natpis + žetoni od sjedišta do mjesta uloga. */
  actionMs: 650,
  /** Fold: poleđine odu ka sredini, sjedište se zatamni. */
  foldMs: 550,
  /** Check: „kuc" na avataru. */
  checkMs: 450,

  /** Mir poslije zadnjeg poteza ulice, prije nego ulozi krenu u pot. */
  streetSettleMs: 350,
  /** Svi ulozi ulice klize u pot. */
  betsToPotMs: 800,
  /** Flop: tri karte jedna po jedna. */
  flopMs: 1500,
  /** Turn ili river: kratka pauza „napetosti", pa jedna karta. */
  turnRiverMs: 950,

  /** All-in do kraja: pauza prije svake ulice koja se dijeli bez licitacije. */
  runoutPauseMs: 1000,
  /** Showdown: okretanje karata jednog igrača. */
  revealPerHandMs: 550,
  /** Showdown: zadržavanje poslije okretanja, pa isticanje pobjedničkih karata. */
  showdownHoldMs: 1100,
  /** Isplata jednog pota pobjedniku (ili dvojici kod podjele). */
  awardPerPotMs: 950,
  /** Sjedište igrača bez žetona se ugasi u konturu sa plasmanom. */
  bustMs: 550,

  /** Čitanje trake rezultata poslije showdowna, prije sljedeće ruke. */
  readMs: 2600,
  /** Čitanje poslije ruke dobijene bez otkrivanja. */
  readShortMs: 1500,
  /** Kraj meča: mir poslije zadnje isplate, prije kartice kraja. */
  matchEndHoldMs: 1500,
} as const;

export type PokerPace = typeof POKER_PACE;

/** Ono što server i klijent znaju o stanju — dovoljno za ritam. */
export interface PaceFrame {
  handNo: number;
  phase: PokerPhase;
  boardCount: number;
}

export interface PaceInput {
  /** Prethodno PRIKAZANO stanje; `null` (start, hidracija) = nema šta da se priča. */
  prev: PaceFrame | null;
  next: PaceFrame;
  /** Tip zadnje stavke dnevnika akcija (`actionLog`) u `next`. */
  lastAction: PokerLogType | null;
  /** Koliko igrača je dobilo karte u novoj ruci. */
  dealtPlayers: number;
  /** Rezultat ruke kad je `next` kraj ruke. */
  result: PokerHandResult | null;
  /** Koliko je igrača u ovoj ruci ostalo bez žetona. */
  busted: number;
}

export function dealMs(players: number, pace: PokerPace = POKER_PACE): number {
  const cards = Math.max(0, players * 2);
  return pace.blindsMs + Math.max(0, cards - 1) * pace.dealStaggerMs + pace.dealFlightMs + pace.myFlipMs;
}

export function actionBeatMs(type: PokerLogType | null, pace: PokerPace = POKER_PACE): number {
  if (type === "fold") return pace.foldMs;
  if (type === "check") return pace.checkMs;
  if (type === null || type === "small_blind" || type === "big_blind") return 0;
  return pace.actionMs;
}

/** Ulica koja se otkriva kad board naraste sa `from` karata (0 → flop, 3 → turn, 4 → river). */
export function boardStageMs(from: number, pace: PokerPace = POKER_PACE): number {
  return from === 0 ? pace.flopMs : pace.turnRiverMs;
}

/** Broj potova koji se stvarno isplaćuju (vraćen nepraćen ulog se ne priča posebno). */
export function awardedPots(result: PokerHandResult): number {
  const idx = new Set(
    result.awards
      .filter((a) => (result.pots[a.potIndex]?.eligiblePlayerIds.length ?? 0) > 1)
      .map((a) => a.potIndex),
  );
  return Math.max(1, idx.size);
}

/**
 * Koliko traje prikaz prelaza `prev` → `next`. Server za toliko odgađa sat
 * sljedećeg igrača (i odluku bota), a kraj ruke drži toliko prije nove.
 * Klijent animira u istim granicama (vidi `apps/web/lib/pokerBeat.ts`).
 */
export function pokerPresentationMs(input: PaceInput, pace: PokerPace = POKER_PACE): number {
  const { prev, next } = input;
  if (!prev) return 0;

  // Nova ruka: blindovi + dijeljenje.
  if (next.handNo !== prev.handNo) return dealMs(input.dealtPlayers, pace);

  let ms = actionBeatMs(input.lastAction, pace);

  if (next.phase === "betting") {
    if (next.boardCount > prev.boardCount) {
      ms += pace.streetSettleMs + pace.betsToPotMs + boardStageMs(prev.boardCount, pace);
    }
    return ms;
  }

  // Kraj ruke (ili meča): ulozi u pot, pa priča rezultata.
  ms += pace.streetSettleMs + pace.betsToPotMs;
  const result = input.result;
  if (!result) return ms;

  const revealed = result.uncontested ? 0 : result.showdown.length;
  ms += revealed * pace.revealPerHandMs;
  // All-in do kraja: karte se otvore pa se preostale ulice dijele jedna po jedna.
  for (let from = prev.boardCount; from < next.boardCount; from = from === 0 ? 3 : from + 1) {
    ms += pace.runoutPauseMs + boardStageMs(from, pace);
  }
  if (!result.uncontested) ms += pace.showdownHoldMs;
  ms += awardedPots(result) * pace.awardPerPotMs;
  if (input.busted > 0) ms += pace.bustMs;
  ms += result.uncontested ? pace.readShortMs : pace.readMs;
  return ms;
}
