import type { PokerGameState, PokerLegalActions, PokerSeat } from "@zandar/shared-types";

/** U meču (nije napustio ni bankrotirao). */
export function isAlive(seat: PokerSeat): boolean {
  return seat.status !== "left" && seat.status !== "bankrupt";
}

/** I dalje se bori za pot u ovoj ruci. */
export function isContender(seat: PokerSeat): boolean {
  return seat.inHand && !seat.folded;
}

/** Može još da ulaže u ovoj ruci. */
export function canActSeat(seat: PokerSeat): boolean {
  return isContender(seat) && !seat.allIn;
}

/** Mora odigrati prije nego se ulica zatvori. */
export function needsToAct(state: PokerGameState, seat: PokerSeat): boolean {
  return canActSeat(seat) && (!seat.hasActed || seat.streetBet < state.currentBet);
}

/**
 * Da li je runda uloga zatvorena.
 * Poseban slučaj: kad još samo jedan igrač može ulagati, a ostali su all-in,
 * on ne mora „odigrati" ako je već izjednačio najveći ulog — nema s kim licitirati.
 */
export function isBettingRoundComplete(state: PokerGameState): boolean {
  const pending = state.seats.filter((s) => needsToAct(state, s));
  if (pending.length === 0) return true;
  const actors = state.seats.filter(canActSeat);
  if (actors.length === 1) {
    const lone = actors[0]!;
    const maxOther = Math.max(
      0,
      ...state.seats.filter((s) => s !== lone && isContender(s)).map((s) => s.streetBet),
    );
    return lone.streetBet >= maxOther;
  }
  return false;
}

/**
 * Šta igrač na potezu smije. null ako nije na potezu.
 *
 * - Minimalni bet = big blind; minimalni raise = zadnje puno povećanje u ulici.
 * - All-in je uvijek dozvoljen kao bet/raise čak i ispod minimuma (`minTo` se
 *   spušta na `maxTo`), ALI samo kad je betovanje za igrača otvoreno.
 * - Kratki all-in ne otvara ponovo betovanje onima koji su već odigrali:
 *   oni smiju samo call/fold dok neko ne napravi puni raise.
 * - Raise nema smisla kad niko drugi ne može da odgovori (svi ostali all-in).
 */
export function getPokerLegalActions(
  state: PokerGameState,
  playerId: string,
): PokerLegalActions | null {
  if (state.phase !== "betting" || state.currentPlayerId !== playerId) return null;
  const seat = state.seats.find((s) => s.playerId === playerId);
  if (!seat || !canActSeat(seat)) return null;

  const toCall = Math.max(0, state.currentBet - seat.streetBet);
  const callAmount = Math.min(toCall, seat.stack);
  const maxTo = seat.streetBet + seat.stack;
  const othersCanAct = state.seats.some((s) => s !== seat && canActSeat(s));
  const reopened = !seat.hasActed || seat.actedAtRaiseCount < state.fullRaiseCount;
  const canAggress = othersCanAct && reopened && maxTo > state.currentBet;
  const fullMin =
    state.currentBet === 0 ? state.bigBlind : state.currentBet + state.minRaise;

  return {
    canFold: true,
    canCheck: toCall === 0,
    canCall: toCall > 0,
    callAmount,
    canBet: canAggress && state.currentBet === 0,
    canRaise: canAggress && state.currentBet > 0,
    minTo: Math.min(fullMin, maxTo),
    maxTo,
  };
}
