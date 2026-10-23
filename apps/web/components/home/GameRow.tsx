"use client";

import { ChevronRightIcon, SuitIcon } from "@/components/icons";
import type { GameConfig } from "@/lib/games";
import { sr } from "@/lib/sr";

/** Mala karta sa slovom i znakom igre (red igre, list igre). Dekoracija. */
export function LetterCard({ game, className = "" }: { game: GameConfig; className?: string }) {
  return (
    <span className={`letter-card ${className}`} data-suit={game.suit} aria-hidden="true">
      <span className="letter-card__letter">{game.letter}</span>
      <SuitIcon suit={game.suit} className="letter-card__suit" />
    </span>
  );
}

/** „2 ili 4 igrača · ~10 min" */
export function gameMeta(game: GameConfig): string {
  return sr.home.meta(sr.games[game.slug].players, game.minutes);
}

/**
 * Red u „Još igara" (SPEC_POCETNA §5.1): cijeli red je jedno dugme (≥76 px).
 * Dodir NE pokreće partiju — otvara list igre (H4).
 */
export function GameRow({ game, isNew, onOpen }: { game: GameConfig; isNew: boolean; onOpen: () => void }) {
  const name = sr.games[game.slug].name;
  return (
    <button type="button" className="game-row" onClick={onOpen} aria-haspopup="dialog" aria-label={sr.home.openGame(name)}>
      <LetterCard game={game} />
      <span className="game-row__text">
        <span className="game-row__name">
          {name}
          {isNew ? <span className="game-new">{sr.home.isNew}</span> : null}
        </span>
        <span className="game-row__meta">{gameMeta(game)}</span>
      </span>
      <ChevronRightIcon className="game-row__chevron" />
    </button>
  );
}
