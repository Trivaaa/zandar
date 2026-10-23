"use client";

import { PlayingCard } from "@/components/felt/PlayingCard";
import { LetterCard, gameMeta } from "@/components/home/GameRow";
import { ArrowRightIcon, FriendsIcon, PencilIcon, StarIcon } from "@/components/icons";
import type { GameConfig } from "@/lib/games";
import { sr } from "@/lib/sr";

export type GameCardProps = {
  game: GameConfig;
  pinned: boolean;
  /** Broj igara na početnoj (žive + red „Uskoro") — od njega zavisi visina ilustracije. */
  density: 1 | 2 | 3;
  loading: boolean;
  error?: string | undefined;
  /** Zapamćen izbor stola („4 igrača · do 21 · Klasik"); dodir otvara list (V5). */
  setupSummary: string;
  onPlay: () => void;
  onSetup: () => void;
  onFriends: () => void;
};

/**
 * Kartica glavne igre (SPEC_POCETNA §2.2): ilustracija, naziv, igrači i
 * trajanje, Igraj, red podešavanja, S prijateljima. Samo prikaz.
 *
 * Ilustracija se smanjuje kad ima više igara (`data-density`), da sve stane
 * bez skrolovanja; kartica i dugmad ostaju iste.
 */
export function GameCard({
  game,
  pinned,
  density,
  loading,
  error,
  setupSummary,
  onPlay,
  onSetup,
  onFriends,
}: GameCardProps) {
  const name = sr.games[game.slug].name;
  const cards = game.heroCards ?? [];
  return (
    <section className="game-card" data-density={density} aria-labelledby="game-card-title">
      <div className="game-card__art" aria-hidden="true">
        {cards.length > 0 ? (
          <div className="game-fan" style={{ "--n": cards.length } as React.CSSProperties}>
            {cards.map((face, i) => (
              <div
                key={`${face.rank}${face.suit}`}
                className="game-fan__slot"
                style={{ "--i": i } as React.CSSProperties}
              >
                <PlayingCard card={{ id: `home-${face.rank}-${face.suit}`, ...face }} size="md" />
              </div>
            ))}
          </div>
        ) : (
          <LetterCard game={game} className="letter-card--hero" />
        )}
      </div>

      <div className="game-card__head">
        <h1 id="game-card-title" className="game-card__title">
          {name}
        </h1>
        {pinned ? (
          <span className="game-pinned">
            <StarIcon filled className="game-pinned__icon" />
            {sr.home.pinned}
          </span>
        ) : null}
      </div>
      <p className="game-card__meta">{gameMeta(game)}</p>

      <div className="game-card__actions">
        <button type="button" className="home__cta" onClick={onPlay} disabled={loading} aria-busy={loading}>
          <span>{loading ? sr.home.playLoading : sr.home.play}</span>
          {loading ? null : <ArrowRightIcon className="home__cta-arrow" />}
        </button>

        {/* Isti slot od 44 px nosi red podešavanja ili grešku — greška ne
            pomjera ništa ispod, a ne troši ni red visine dok je nema. */}
        <div className="game-card__slot">
          {error ? null : (
            <button
              type="button"
              className="home__setup"
              onClick={onSetup}
              disabled={loading}
              aria-haspopup="dialog"
              aria-label={sr.quickSetup.summaryLabel(setupSummary)}
            >
              <span>{setupSummary}</span>
              <PencilIcon className="home__setup-icon" />
            </button>
          )}
          <p className="home__error game-card__error" data-empty={!error} role="status">
            {error ?? ""}
          </p>
        </div>

        <button type="button" className="home__friends" onClick={onFriends}>
          <FriendsIcon className="home__friends-icon" />
          <span>{sr.home.friends}</span>
        </button>
      </div>
    </section>
  );
}
