"use client";

import { PlayingCard } from "@/components/felt/PlayingCard";
import { BellIcon, SuitIcon } from "@/components/icons";
import type { CardFace, GameConfig } from "@/lib/games";
import { sr } from "@/lib/sr";

/** Mala karta sa slovom i znakom igre (list igre). Dekoracija. */
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

/** Dvije prave karte gore desno na pločici. Dekoracija. */
function TileCards({ cards, prefix }: { cards: readonly CardFace[]; prefix: string }) {
  return (
    <span className="game-tile__cards" aria-hidden="true">
      {cards.map((face, i) => (
        <span key={`${face.rank}${face.suit}`} className="game-tile__card" style={{ "--i": i } as React.CSSProperties}>
          <PlayingCard card={{ id: `${prefix}-${face.rank}-${face.suit}`, ...face }} size="sm" />
        </span>
      ))}
    </span>
  );
}

/**
 * Pločica igre u „Još igara" (SPEC_POCETNA_V3 §3.6): boja igre, dvije prave
 * karte, ime i meta. Cijela pločica je jedno dugme — dodir NE pokreće partiju,
 * otvara list igre (H4), isto kao raniji red igre.
 */
export function GameTile({ game, isNew, onOpen }: { game: GameConfig; isNew: boolean; onOpen: () => void }) {
  const name = sr.games[game.slug].name;
  return (
    <button
      type="button"
      className="game-tile"
      data-tint={game.tint}
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={sr.home.openGame(name)}
    >
      <TileCards cards={game.tileCards} prefix={`tile-${game.slug}`} />
      {isNew ? <span className="game-tile__new">{sr.home.isNew}</span> : null}
      <span className="game-tile__name">{name}</span>
      <span className="game-tile__meta">{gameMeta(game)}</span>
    </button>
  );
}

/**
 * Najavljena igra: ista pločica, blijeđa, sa zvonom. Cijela pločica je „Javi
 * mi" i otvara ISTU prijavu kao ranije (jedna prijava za sve najavljene).
 */
export function UpcomingTile({ game, onNotify }: { game: GameConfig; onNotify: () => void }) {
  const name = sr.games[game.slug].name;
  return (
    <button
      type="button"
      className="game-tile game-tile--soon"
      data-tint={game.tint}
      onClick={onNotify}
      aria-haspopup="dialog"
      aria-label={sr.home.notifyFor(name)}
    >
      <TileCards cards={game.tileCards} prefix={`soon-${game.slug}`} />
      <span className="game-tile__name">{name}</span>
      <span className="game-tile__bell" aria-hidden="true">
        <BellIcon className="game-tile__bell-icon" />
      </span>
    </button>
  );
}
