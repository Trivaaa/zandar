"use client";

import { PlayingCard } from "@/components/felt/PlayingCard";
import { ArrowRightIcon, FriendsIcon } from "@/components/icons";
import type { GameBadge, GameConfig } from "@/lib/games";
import { sr } from "@/lib/sr";

export type GameListItem = { game: GameConfig; badge: GameBadge };

const badgeText: Record<Exclude<GameBadge, null>, string> = {
  pinned: sr.home.pinned,
  last: sr.home.lastPlayed,
  new: sr.home.isNew,
};

/**
 * Početna sa više živih igara — tabla „UI · Početna — opcija 1 Lista" (K1):
 * svaka igra svoja kartica u boji igre, obje radnje uvijek vidljive. Redoslijed
 * daje host (zakačena → zadnje igrana → ostale). Samo prikaz.
 */
export function GameList({
  items,
  loadingSlug,
  error,
  onPlay,
  onCreate,
}: {
  items: readonly GameListItem[];
  /** Igra za koju se upravo traži sto (dugme pokazuje „Tražim sto..."). */
  loadingSlug: string | null;
  /** Greška zadnjeg traženja — stoji na kartici igre koja je tražena. */
  error?: string | undefined;
  onPlay: (game: GameConfig) => void;
  onCreate: (game: GameConfig) => void;
}) {
  const busy = loadingSlug !== null && !error;
  return (
    <ul className="home-list">
      {items.map(({ game, badge }) => {
        const name = sr.games[game.slug].name;
        const mine = loadingSlug === game.slug;
        return (
          <li key={game.slug} className="home-list__card" data-tint={game.tint}>
            <div className="home-list__art">
              {/* Greška traženja ima prednost nad oznakom: tekst raste nagore. */}
              {badge && !(mine && error) ? (
                <span className="home-list__tag" data-badge={badge}>
                  {badgeText[badge]}
                </span>
              ) : null}
              <span className="home-list__cards" aria-hidden="true">
                {game.listCards.map((face, i) => (
                  <span
                    key={`${face.rank}${face.suit}`}
                    className="home-list__card-slot"
                    style={{ "--i": i } as React.CSSProperties}
                  >
                    <PlayingCard card={{ id: `list-${game.slug}-${face.rank}-${face.suit}`, ...face }} size="sm" deck={game.deck} />
                  </span>
                ))}
              </span>
              <div className="home-list__text">
                <h2 className="home-list__name">{name}</h2>
                <p className="home-list__sub" data-error={mine && Boolean(error)} role="status">
                  {mine && error ? error : sr.home.listSub[game.slug]}
                </p>
              </div>
            </div>
            <div className="home-list__actions">
              <button
                type="button"
                className="home-list__play"
                onClick={() => onPlay(game)}
                disabled={busy}
                aria-busy={mine && busy}
                aria-label={sr.home.playGame(name)}
              >
                {mine && busy ? sr.home.playLoading : sr.home.play}
                {mine && busy ? null : <ArrowRightIcon className="home-list__icon" />}
              </button>
              <button
                type="button"
                className="home-list__create"
                onClick={() => onCreate(game)}
                aria-label={sr.home.createGame(name)}
              >
                <FriendsIcon className="home-list__icon" />
                {sr.home.create}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
