"use client";

import type { HandScore, PublicPlayer } from "@zandar/shared-types";
import { ScorePill } from "./ScorePill";
import { sr } from "@/lib/sr";

export type GameMenuSheetProps = {
  players: PublicPlayer[];
  matchScore: Record<string, number>;
  targetScore: number;
  handScores?: HandScore[];
  /** Razrada rezultata — stanje drži ekran, kao i kod ScorePill-a na feltu. */
  scoreExpanded: boolean;
  onToggleScore: () => void;
  onRules: () => void;
  onLeave?: (() => void) | undefined;
  onClose: () => void;
  className?: string | undefined;
};

/**
 * Meni stola — odredište hamburgera iz zaglavlja.
 *
 * Skuplja ono što je ranije živjelo po ćoškovima felta: rezultat (bio je pilula
 * gore-desno, gdje referenca ima zvuk), pravila (dugme gore-lijevo) i izlaz
 * (bio dostupan samo kroz kraj partije ili prekid).
 *
 * Rezultat renderuje POSTOJEĆI `ScorePill` — bez `scorepill--compact`, jer je
 * razlog za kompaktnost bio zauzet vrh ekrana, a ovdje mjesta ima. Nema
 * duplikata te komponente i nema novog propa na njoj.
 *
 * Scrim i pozicioniranje daje ekran; ovdje je samo sadržaj (isti dogovor kao
 * `RoundEndOverlay`).
 */
export function GameMenuSheet({
  players,
  matchScore,
  targetScore,
  handScores = [],
  scoreExpanded,
  onToggleScore,
  onRules,
  onLeave,
  onClose,
  className = "",
}: GameMenuSheetProps) {
  return (
    <div
      className={`gamemenu ${className}`}
      role="dialog"
      aria-modal="true"
      aria-label={sr.menu.title}
    >
      <div className="gamemenu__grip" aria-hidden="true" />

      <div className="gamemenu__scroll">
        <span className="gamemenu__label font-sans text-sm text-muted">{sr.menu.score}</span>
        <ScorePill
          players={players}
          matchScore={matchScore}
          targetScore={targetScore}
          handScores={handScores}
          expanded={scoreExpanded}
          onToggle={onToggleScore}
        />

        <button type="button" className="gamemenu__item font-sans text-base" onClick={onRules}>
          {sr.menu.rules}
        </button>

        {onLeave ? (
          <button
            type="button"
            className="gamemenu__item gamemenu__item--danger font-sans text-base"
            onClick={onLeave}
          >
            {sr.menu.leave}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className="gamemenu__close font-sans text-base font-bold"
        onClick={onClose}
      >
        {sr.menu.close}
      </button>
    </div>
  );
}
