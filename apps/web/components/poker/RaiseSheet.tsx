"use client";

import { useState } from "react";
import type { PokerLegalActions } from "@zandar/shared-types";

import { raisePresets, stepRaise, type RaisePreset } from "@/lib/pokerView";
import { sr } from "@/lib/sr";

export type RaiseSheetProps = {
  legal: PokerLegalActions;
  currentBet: number;
  potTotal: number;
  bigBlind: number;
  busy: boolean;
  /** `to` = ukupan ulog u ulici („raise to"), isto što server prima. */
  onConfirm: (to: number) => void;
  onClose: () => void;
};

const presetLabel: Record<RaisePreset["key"], string> = {
  min: sr.poker.presetMin,
  half: sr.poker.presetHalf,
  pot: sr.poker.presetPot,
  allin: sr.poker.presetAllIn,
};

/**
 * Raise panel (tabla C): preko donjeg dijela, sto ostaje vidljiv.
 * Min · ½ pota · Pot · All-in, klizač i − / + po big blindu, veliki iznos i
 * potvrda sa tim iznosom. Granice daje server (`minTo`/`maxTo`).
 */
export function RaiseSheet({ legal, currentBet, potTotal, bigBlind, busy, onConfirm, onClose }: RaiseSheetProps) {
  const presets = raisePresets(legal, currentBet, potTotal);
  const [to, setTo] = useState(presets[0]?.to ?? legal.minTo);
  const isBet = legal.canBet;
  const allIn = to >= legal.maxTo;

  return (
    <>
      <div className="pk-raise-scrim" onClick={onClose} aria-hidden="true" />
      <div className="pk-raise" role="dialog" aria-modal="true" aria-label={isBet ? sr.poker.bet : sr.poker.raise}>
        <div className="pk-raise__head">
          <span>
            {sr.poker.raiseTitle}
            <br />
            {sr.poker.raiseTo}
          </span>
          <b aria-live="polite">{to}</b>
        </div>

        <div className="pk-raise__presets">
          {presets.map((p) => (
            <button
              key={p.key}
              type="button"
              className="pk-raise__preset"
              aria-pressed={p.to === to}
              onClick={() => setTo(p.to)}
            >
              {presetLabel[p.key]}
              <small>{p.to}</small>
            </button>
          ))}
        </div>

        <div className="pk-raise__slider">
          <button
            type="button"
            className="pk-raise__step"
            aria-label={sr.poker.less}
            disabled={to <= legal.minTo}
            onClick={() => setTo((v) => stepRaise(v, -bigBlind, legal))}
          >
            −
          </button>
          <input
            className="pk-raise__range"
            type="range"
            min={legal.minTo}
            max={legal.maxTo}
            step={1}
            value={to}
            aria-label={sr.poker.raiseTitle}
            onChange={(e) => setTo(stepRaise(Number(e.target.value), 0, legal))}
          />
          <button
            type="button"
            className="pk-raise__step"
            aria-label={sr.poker.more}
            disabled={to >= legal.maxTo}
            onClick={() => setTo((v) => stepRaise(v, bigBlind, legal))}
          >
            +
          </button>
        </div>

        <div className="pk-raise__actions">
          <button type="button" className="pk-raise__cancel" onClick={onClose}>
            {sr.poker.cancel}
          </button>
          <button type="button" className="pk-raise__confirm" disabled={busy} onClick={() => onConfirm(to)}>
            {allIn ? sr.poker.allIn : isBet ? sr.poker.confirmBet(to) : sr.poker.confirmRaise(to)}
          </button>
        </div>
      </div>
    </>
  );
}
