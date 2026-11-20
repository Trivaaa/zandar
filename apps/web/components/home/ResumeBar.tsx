"use client";

import type { ActiveTable } from "@zandar/shared-types";

import { PlayingCard } from "@/components/felt/PlayingCard";
import { ArrowRightIcon, CloseIcon } from "@/components/icons";
import { GAMES } from "@/lib/games";
import { resumeView } from "@/lib/resumeView";
import { sr } from "@/lib/sr";

export type ResumeBarProps = {
  table: ActiveTable;
  /** Dodir na traku / „Vrati se" / „Rezultat" — vodi na sto. */
  onResume: () => void;
  /** X na završenoj partiji (V6). */
  onDismiss: () => void;
  className?: string | undefined;
};

/**
 * „Vrati se za sto" (tabla `UI_VratiSe`, V1–V6): ista traka za Žandar, Poker i
 * Raub, na webu i u aplikaciji; igra mijenja samo boju, lepezu i stanje desno.
 * Dok partija traje cijela traka je JEDNO dugme; završena (V6) ima „Rezultat"
 * i X. Samo prikaz.
 */
export function ResumeBar({ table, onResume, onDismiss, className = "" }: ResumeBarProps) {
  const game = GAMES.find((g) => g.slug === table.game);
  const name = sr.games[table.game].name;
  const view = resumeView(table);

  const fan = game ? (
    <span className="resume-bar__fan" aria-hidden="true">
      {game.listCards.map((face, i) => (
        <span key={`${face.rank}${face.suit}`} className="resume-bar__slot" style={{ "--i": i } as React.CSSProperties}>
          <PlayingCard card={{ id: `resume-${game.slug}-${face.rank}-${face.suit}`, ...face }} size="sm" deck={game.deck} />
        </span>
      ))}
    </span>
  ) : null;

  const text = (
    <span className="resume-bar__text">
      <span className="resume-bar__top" data-tone={view.tone}>
        <i className="resume-bar__dot" aria-hidden="true" />
        {view.top}
      </span>
      <span className="resume-bar__name">{name}</span>
      {view.detail ? <span className="resume-bar__detail">{view.detail}</span> : null}
    </span>
  );

  if (view.tone === "done") {
    return (
      <div className={`resume-bar resume-bar--done ${className}`} data-tint={game?.tint ?? table.game} role="status">
        {fan}
        {text}
        <button type="button" className="resume-bar__result" onClick={onResume}>
          {sr.homeResume.result}
        </button>
        <button type="button" className="resume-bar__x" onClick={onDismiss} aria-label={sr.homeResume.dismiss}>
          <CloseIcon className="resume-bar__x-icon" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`resume-bar ${className}`}
      data-tint={game?.tint ?? table.game}
      onClick={onResume}
      aria-label={`${sr.homeResume.label(name)}. ${view.top}. ${view.detail}`}
    >
      {fan}
      {text}
      <span className="resume-bar__go" aria-hidden="true">
        {sr.homeResume.go}
        <ArrowRightIcon className="resume-bar__go-icon" />
      </span>
    </button>
  );
}
