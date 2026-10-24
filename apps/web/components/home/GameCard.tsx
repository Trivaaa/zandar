"use client";

import { PlayingCard } from "@/components/felt/PlayingCard";
import { gameMeta } from "@/components/home/GameTile";
import { ArrowRightIcon, FriendsIcon, PencilIcon, StarIcon } from "@/components/icons";
import type { GameConfig } from "@/lib/games";
import { sr } from "@/lib/sr";

export type GameCardProps = {
  game: GameConfig;
  pinned: boolean;
  /** Ima li „Još igara" ispod stola — sto je tada niži (A3). */
  compact: boolean;
  loading: boolean;
  error?: string | undefined;
  /** Kratak izbor stola na dugmetu („2 · 11 · Drvo"). */
  setupShort: string;
  /** Pun izbor za čitač ekrana („2 igrača, do 11, sto Drvo, promijeni"). */
  setupLabel: string;
  onPlay: () => void;
  onSetup: () => void;
  onFriends: () => void;
};

/**
 * Glavna igra kao sto (SPEC_POCETNA_V3 §3.2–3.4): sukno sa lepezom pravih
 * karata, naslov i meta dolje lijevo; ispod jedna glasna radnja (Igraj) i red
 * tihih (S prijateljima, podešavanja). Samo prikaz.
 *
 * Greška pri traženju stola zauzima mjesto mete na stolu: ništa se ne pomjera
 * i nijedno dugme ne nestaje.
 */
export function GameCard({
  game,
  pinned,
  compact,
  loading,
  error,
  setupShort,
  setupLabel,
  onPlay,
  onSetup,
  onFriends,
}: GameCardProps) {
  const name = sr.games[game.slug].name;
  const cards = game.heroCards ?? game.tileCards;
  return (
    <section className="game-card" data-compact={compact} aria-labelledby="game-card-title">
      <div className="game-table">
        <div className="game-fan" aria-hidden="true" style={{ "--n": cards.length } as React.CSSProperties}>
          {cards.map((face, i) => (
            <div key={`${face.rank}${face.suit}`} className="game-fan__slot" style={{ "--i": i } as React.CSSProperties}>
              <PlayingCard card={{ id: `home-${face.rank}-${face.suit}`, ...face }} size="md" />
            </div>
          ))}
        </div>

        <div className="game-table__text">
          <div className="game-table__titles">
            <h1 id="game-card-title" className="game-card__title">
              {name}
            </h1>
            <p className="game-card__meta" data-error={Boolean(error)} role="status">
              {error ?? gameMeta(game)}
            </p>
          </div>
          {pinned ? (
            <span className="game-pinned">
              <StarIcon filled className="game-pinned__icon" />
              {sr.home.pinned}
            </span>
          ) : null}
        </div>
      </div>

      <button type="button" className="home__cta home__cta--hero" onClick={onPlay} disabled={loading} aria-busy={loading}>
        <span>{loading ? sr.home.playLoading : sr.home.play}</span>
        {loading ? null : <ArrowRightIcon className="home__cta-arrow" />}
      </button>

      <div className="home-acts">
        <button type="button" className="home-act home-act--friends" onClick={onFriends}>
          <FriendsIcon className="home-act__icon" />
          <span>{sr.home.friends}</span>
        </button>
        <button
          type="button"
          className="home-act home-act--setup"
          onClick={onSetup}
          disabled={loading}
          aria-haspopup="dialog"
          aria-label={setupLabel}
        >
          <span className="home-act__text">{setupShort}</span>
          <PencilIcon className="home-act__icon home-act__icon--sm" />
        </button>
      </div>
    </section>
  );
}
