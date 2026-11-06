"use client";

import type { PokerLegalActions } from "@zandar/shared-types";

import { sr } from "@/lib/sr";

export type ActionPanelProps = {
  /** Šta smiješ — od servera; `null` = nisi na potezu. */
  legal: PokerLegalActions | null;
  busy: boolean;
  onFold: () => void;
  onCheckOrCall: () => void;
  /** Otvara raise panel (Bet kad niko nije uložio u ulici, Raise kad jeste). */
  onRaise: () => void;
  /** Ko je na potezu kad nisi ti. */
  waitingName: string | null;
  /** Foldao si / van ruke — druga linija u „Čeka se". */
  outOfHand: boolean;
  /** Ruka je gotova, sljedeća stiže sama. */
  between: boolean;
};

/**
 * Dno stola (tabla A/B/G): tri dugmeta kad si na potezu, „Čeka se: …" na istom
 * mjestu kad nisi. Isto mjesto, ista visina — panel ne skače kad potez dođe.
 */
export function ActionPanel({
  legal,
  busy,
  onFold,
  onCheckOrCall,
  onRaise,
  waitingName,
  outOfHand,
  between,
}: ActionPanelProps) {
  if (!legal) {
    const line = between ? sr.poker.nextHand : waitingName ? sr.poker.waitingFor(waitingName) : null;
    if (!line && !outOfHand) return null;
    return (
      <div className="pk-wait" role="status">
        {line ? <span>{line}</span> : null}
        {outOfHand && !between ? <small>{sr.poker.outOfHand}</small> : null}
      </div>
    );
  }

  const middle = legal.canCheck ? sr.poker.check : legal.canCall ? sr.poker.call(legal.callAmount) : null;
  const right = legal.canBet ? sr.poker.bet : legal.canRaise ? sr.poker.raise : null;

  return (
    <div className="pk-panel">
      {legal.canFold ? (
        <button type="button" className="pk-panel__btn" data-kind="fold" disabled={busy} onClick={onFold}>
          {sr.poker.fold}
        </button>
      ) : null}
      {middle ? (
        <button type="button" className="pk-panel__btn" data-kind="call" disabled={busy} onClick={onCheckOrCall}>
          {middle}
        </button>
      ) : null}
      {right ? (
        <button type="button" className="pk-panel__btn" data-kind="raise" disabled={busy} onClick={onRaise}>
          {right}
        </button>
      ) : null}
    </div>
  );
}
